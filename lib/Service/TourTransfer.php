<?php

declare(strict_types=1);

namespace OCA\IntroVox\Service;

use OCA\IntroVox\Media\MediaException;
use OCP\App\IAppManager;
use OCP\Files\NotFoundException;
use OCP\IConfig;
use OCP\IGroupManager;
use OCP\ITempManager;
use OCP\IUser;
use Psr\Log\LoggerInterface;

/**
 * Moving a whole tour between Nextclouds as one .zip (TourPackage): its
 * settings, its steps in every language, and the media they use.
 *
 * An import becomes a new tour, switched off, with fresh copies of its media
 * that go through the same checks as an upload. What this Nextcloud cannot
 * take is left out and reported, not refused: groups it does not have, media
 * over its limits. A package of the welcome tour replaces the welcome tour's
 * own steps for the languages it holds, once the admin confirmed that.
 */
class TourTransfer {
    // Default; occ config:app:set introvox tour_package_limit --value=<bytes>
    private const PACKAGE_LIMIT = 100 * 1024 * 1024;

    public function __construct(
        private TourRepository $tours,
        private TourValidator $tourValidator,
        private StepValidator $stepValidator,
        private MediaService $media,
        private IConfig $config,
        private IGroupManager $groupManager,
        private IAppManager $appManager,
        private ITempManager $tempManager,
        private LoggerInterface $logger,
    ) {
    }

    public function packageLimit(): int {
        $value = (int)$this->config->getAppValue('introvox', 'tour_package_limit', (string)self::PACKAGE_LIMIT);
        return $value > 0 ? $value : self::PACKAGE_LIMIT;
    }

    /**
     * @return string A temporary .zip, removed at the end of the request
     * @throws TourPackageException
     */
    public function export(array $tour): string {
        $welcome = $tour['id'] === TourValidator::WELCOME;
        // For the welcome tour only the admin's own steps: the translated
        // defaults are on every Nextcloud already. A built-in tour goes out
        // as a tour of the importer's own, so with its steps in English when
        // the admin wrote none.
        $languages = [];
        foreach ($this->tours->languages($tour['id']) as $language) {
            $steps = $this->tours->steps($tour['id'], $language);
            if ($steps !== null) {
                $languages[$language] = $steps;
            }
        }
        if ($languages === [] && BuiltinTours::isBuiltin($tour['id'])) {
            $languages['en'] = $this->tours->defaultSteps($tour['id'], 'en');
        }
        if ($languages === []) {
            throw new TourPackageException('nothing_to_export');
        }

        $files = [];
        foreach ($languages as $steps) {
            foreach ($steps as $step) {
                foreach (['file', 'captions'] as $key) {
                    $file = is_array($step) ? ($step['media'][$key] ?? null) : null;
                    if (!is_string($file) || isset($files[$file])) {
                        continue;
                    }
                    try {
                        $files[$file] = $this->media->content($file)->getContent();
                    } catch (NotFoundException $e) {
                        // Gone here; the import will say it is missing
                    }
                }
            }
        }

        $manifest = [
            'format' => TourPackage::FORMAT,
            'version' => TourPackage::VERSION,
            'exportedAt' => gmdate('c'),
            'introvox' => $this->appManager->getAppVersion('introvox'),
            'tour' => $welcome
                ? ['kind' => 'welcome']
                : ['kind' => 'app'] + array_diff_key(array_intersect_key($tour, array_flip(TourValidator::FIELDS)), ['enabled' => true]),
            'languages' => $languages,
        ];
        $path = $this->tempManager->getTemporaryFile('.zip');
        if ($path === false) {
            throw new TourPackageException('write_failed');
        }
        TourPackage::write($path, $manifest, $files);
        return $path;
    }

    /**
     * A package from the admin's own Files, copied to a temporary file
     *
     * @throws TourPackageException
     * @throws MediaException When it is not there, or may only be viewed
     */
    public function fromFiles(IUser $admin, string $path): string {
        $node = $this->media->fileFromFiles($admin, $path);
        $target = $this->tempManager->getTemporaryFile('.zip');
        $in = $node->fopen('rb');
        $out = $target === false ? false : fopen($target, 'wb');
        if ($in === false || $out === false) {
            throw new TourPackageException('not_a_package');
        }
        try {
            // Files may report the wrong size; copy one byte more than allowed
            $copied = stream_copy_to_stream($in, $out, $this->packageLimit() + 1);
        } finally {
            fclose($in);
            fclose($out);
        }
        if ($copied === false || $copied > $this->packageLimit()) {
            throw new TourPackageException('too_large', (string)$this->packageLimit());
        }
        return $target;
    }

    /**
     * @return array{confirm: bool, kind: string, languages: string[], tour?: array,
     *   droppedGroups?: string[], mediaLeftOut?: int, appMissing?: ?string}
     *   With confirm, nothing happened yet: the welcome tour's steps would be
     *   replaced for these languages
     * @throws TourPackageException
     */
    public function import(string $path, IUser $admin, bool $replaceWelcome): array {
        $package = TourPackage::read($path, $this->packageLimit());
        $contents = TourPackage::contents($package['manifest'], $this->tourValidator, $this->stepValidator);
        $welcome = $contents['kind'] === 'welcome';
        if ($welcome && !$replaceWelcome) {
            return ['confirm' => true, 'kind' => 'welcome', 'languages' => array_keys($contents['languages'])];
        }
        if (!$welcome && count($this->tours->all()) >= TourValidator::MAX_TOURS) {
            throw new TourPackageException('too_many_tours', (string)TourValidator::MAX_TOURS);
        }

        // Groups this Nextcloud does not have go, and are named
        $dropped = [];
        $keepGroups = function (array $groups) use (&$dropped): array {
            $kept = [];
            foreach ($groups as $group) {
                if ($this->groupManager->groupExists($group)) {
                    $kept[] = $group;
                } else {
                    $dropped[$group] = true;
                }
            }
            return $kept;
        };

        // Fresh copies of the media, checked like an upload
        $copies = [];
        $leftOut = 0;
        foreach ($contents['media'] as $file) {
            $bytes = $package['files'][$file] ?? null;
            if ($bytes === null) {
                $leftOut++;
                continue;
            }
            try {
                $copies[$file] = $this->media->store($bytes, $file, $admin->getUID(), str_ends_with($file, '.vtt') ? 'captions' : 'media')['file'];
            } catch (MediaException $e) {
                $leftOut++;
                $this->logger->info('IntroVox: a media file of an imported tour was left out: ' . $e->getReason(), ['app' => 'introvox']);
            }
        }

        $languages = [];
        foreach ($contents['languages'] as $language => $steps) {
            foreach ($steps as $index => $step) {
                $steps[$index]['visibleToGroups'] = $keepGroups($step['visibleToGroups'] ?? []);
                if (!isset($step['media'])) {
                    continue;
                }
                if (!isset($copies[$step['media']['file']])) {
                    unset($steps[$index]['media']);
                    continue;
                }
                $steps[$index]['media']['file'] = $copies[$step['media']['file']];
                $captions = $step['media']['captions'] ?? null;
                if ($captions !== null) {
                    if (isset($copies[$captions])) {
                        $steps[$index]['media']['captions'] = $copies[$captions];
                    } else {
                        unset($steps[$index]['media']['captions']);
                    }
                }
            }
            [$languages[$language]] = $this->media->resolveStepMedia($steps, false);
        }

        $created = null;
        $appMissing = null;
        $id = TourValidator::WELCOME;
        if (!$welcome) {
            $fields = $contents['tour'];
            $fields['visibleToGroups'] = $keepGroups($fields['visibleToGroups']);
            $created = $this->tours->create($fields);
            $id = $created['id'];
            if ($fields['trigger']['type'] === 'app' && !$this->appManager->isInstalled($fields['trigger']['app'])) {
                $appMissing = $fields['trigger']['app'];
            }
        }
        foreach ($languages as $language => $steps) {
            $this->tours->saveSteps($id, $language, $steps);
        }
        $this->media->refreshAccess();

        return [
            'confirm' => false,
            'kind' => $contents['kind'],
            'languages' => array_keys($languages),
            'tour' => $created,
            'droppedGroups' => array_keys($dropped),
            'mediaLeftOut' => $leftOut,
            'appMissing' => $appMissing,
        ];
    }
}
