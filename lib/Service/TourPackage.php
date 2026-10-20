<?php

declare(strict_types=1);

namespace OCA\IntroVox\Service;

/**
 * A whole tour in one .zip, to move it to another Nextcloud: tour.json with
 * the tour and its steps in every language, and media/<file> for each image,
 * video and captions file a step uses.
 *
 * A package can come from anywhere, so reading one trusts nothing: only
 * tour.json and media/<id>.<ext> may be in it, each once; the sizes in the
 * zip are checked before anything is read and again while reading (a zip
 * can lie about them); nothing is ever written to disk under a name from the
 * zip. What the files contain is checked where they are used (contents(),
 * and MediaService for the media).
 *
 * Plain PHP with the zip extension Nextcloud requires, so it can be tested
 * directly.
 */
class TourPackage {
    public const FORMAT = 'introvox-tour';
    public const VERSION = 1;
    public const MANIFEST = 'tour.json';
    // At most this many files: the manifest, and media up to MediaService's
    // default number of files
    public const MAX_ENTRIES = 501;
    // All languages of a tour; one language may have up to 1 MiB of steps
    public const MAX_MANIFEST_BYTES = 8 * 1024 * 1024;
    private const MAX_LANGUAGES = 100;
    private const MEDIA_ENTRY = '#^media/([a-f0-9]{32}\.(?:png|jpg|gif|mp4|webm|vtt))$#D';
    private const LANG_PATTERN = '/^[a-z]{2}(_[A-Z]{2})?$/D';

    /**
     * @param array $manifest What goes into tour.json
     * @param array<string, string> $files Media file name => bytes
     * @throws TourPackageException
     */
    public static function write(string $path, array $manifest, array $files): void {
        $zip = new \ZipArchive();
        if ($zip->open($path, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== true) {
            throw new TourPackageException('write_failed');
        }
        $zip->addFromString(self::MANIFEST, json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
        foreach ($files as $name => $bytes) {
            $entry = 'media/' . $name;
            if (!preg_match(self::MEDIA_ENTRY, $entry)) {
                throw new TourPackageException('write_failed', $name);
            }
            $zip->addFromString($entry, $bytes);
            // Images and videos are compressed already
            $zip->setCompressionName($entry, str_ends_with($name, '.vtt') ? \ZipArchive::CM_DEFLATE : \ZipArchive::CM_STORE);
        }
        if (!$zip->close()) {
            throw new TourPackageException('write_failed');
        }
    }

    /**
     * @param int $maxBytes At most this many bytes in all files together,
     *   unpacked
     * @return array{manifest: array, files: array<string, string>} The parsed
     *   tour.json, and media file name => bytes
     * @throws TourPackageException
     */
    public static function read(string $path, int $maxBytes): array {
        $zip = new \ZipArchive();
        if (!is_file($path) || $zip->open($path, \ZipArchive::RDONLY) !== true) {
            throw new TourPackageException('not_a_package');
        }
        try {
            if ($zip->numFiles > self::MAX_ENTRIES) {
                throw new TourPackageException('too_many_files', (string)self::MAX_ENTRIES);
            }

            // First the directory: names and sizes, before reading a byte
            $entries = [];
            $total = 0;
            for ($index = 0; $index < $zip->numFiles; $index++) {
                $stat = $zip->statIndex($index);
                if ($stat === false) {
                    throw new TourPackageException('not_a_package');
                }
                $name = $stat['name'];
                if ($name === 'media/') {
                    continue;
                }
                if ($name !== self::MANIFEST && !preg_match(self::MEDIA_ENTRY, $name)) {
                    throw new TourPackageException('unexpected_file', mb_substr($name, 0, 100));
                }
                if (isset($entries[$name])) {
                    throw new TourPackageException('unexpected_file', $name);
                }
                $size = (int)$stat['size'];
                $total += $size;
                if ($total > $maxBytes || ($name === self::MANIFEST && $size > self::MAX_MANIFEST_BYTES)) {
                    throw new TourPackageException('too_large', (string)$maxBytes);
                }
                $entries[$name] = ['index' => $index, 'size' => $size];
            }
            if (!isset($entries[self::MANIFEST])) {
                throw new TourPackageException('no_manifest');
            }

            // Then the contents, each no longer than the zip said
            $read = static function (array $entry) use ($zip): string {
                $bytes = $entry['size'] === 0 ? '' : $zip->getFromIndex($entry['index'], $entry['size'] + 1);
                if (!is_string($bytes) || strlen($bytes) !== $entry['size']) {
                    throw new TourPackageException('not_a_package');
                }
                return $bytes;
            };
            $manifest = json_decode($read($entries[self::MANIFEST]), true);
            if (!is_array($manifest) || ($manifest['format'] ?? null) !== self::FORMAT) {
                throw new TourPackageException('no_manifest');
            }
            $version = $manifest['version'] ?? null;
            if (!is_int($version) || $version < 1) {
                throw new TourPackageException('no_manifest');
            }
            if ($version > self::VERSION) {
                throw new TourPackageException('newer_version', (string)$version);
            }

            $files = [];
            foreach ($entries as $name => $entry) {
                if ($name !== self::MANIFEST) {
                    $files[substr($name, strlen('media/'))] = $read($entry);
                }
            }
            return ['manifest' => $manifest, 'files' => $files];
        } finally {
            $zip->close();
        }
    }

    /**
     * What a package holds, checked the way the editor checks a tour: the
     * kind of tour, its fields (an app tour; the welcome tour has none of its
     * own), its steps per language, and the media files the steps use.
     *
     * @return array{kind: string, tour: ?array, languages: array<string, array>, media: string[]}
     * @throws TourPackageException
     */
    public static function contents(array $manifest, TourValidator $tours, StepValidator $steps): array {
        $tour = $manifest['tour'] ?? null;
        $kind = is_array($tour) ? ($tour['kind'] ?? null) : null;
        if ($kind !== 'welcome' && $kind !== 'app') {
            throw new TourPackageException('bad_tour', 'tour.kind must be welcome or app');
        }
        $fields = null;
        if ($kind === 'app') {
            unset($tour['kind']);
            [$fields, $error] = $tours->validate(['enabled' => false] + array_diff_key(array_intersect_key($tour, array_flip(TourValidator::FIELDS)), ['enabled' => true]));
            if ($error !== null) {
                throw new TourPackageException('bad_tour', $error);
            }
        }

        $languages = $manifest['languages'] ?? null;
        if (!is_array($languages) || $languages === [] || array_is_list($languages) || count($languages) > self::MAX_LANGUAGES) {
            throw new TourPackageException('bad_tour', 'languages must hold the steps of at least one language');
        }
        $clean = [];
        $media = [];
        foreach ($languages as $language => $list) {
            if (!is_string($language) || !preg_match(self::LANG_PATTERN, $language)) {
                throw new TourPackageException('bad_tour', 'not a language code: ' . mb_substr((string)$language, 0, 20));
            }
            [$valid, $error] = $steps->validateAll($list);
            if ($error !== null) {
                throw new TourPackageException('bad_tour', $language . ': ' . $error);
            }
            foreach ($valid as $step) {
                foreach (['file', 'captions'] as $key) {
                    if (is_string($step['media'][$key] ?? null)) {
                        $media[$step['media'][$key]] = true;
                    }
                }
            }
            $clean[$language] = $valid;
        }
        ksort($clean);
        return ['kind' => $kind, 'tour' => $fields, 'languages' => $clean, 'media' => array_keys($media)];
    }
}
