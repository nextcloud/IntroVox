<?php

declare(strict_types=1);

namespace OCA\IntroVox\Service;

use OCP\App\IAppManager;
use OCP\Config\IUserConfig;
use OCP\Files\AppData\IAppDataFactory;
use OCP\Files\IAppData;
use OCP\Files\NotFoundException;
use OCP\Files\SimpleFS\ISimpleFolder;
use OCP\IAppConfig;
use OCP\IConfig;
use OCP\IGroupManager;
use OCP\IUser;

/**
 * The tours: the welcome tour, and tours that start in an app or on a page.
 *
 * The index (appconfig "tours", at most 50 entries) holds what each tour is;
 * the welcome tour is always in it, even when the key is missing — on a
 * fresh install, where no repair step runs, or on an instance updated from a
 * version without tours. Its steps stay where they always were
 * (wizard_steps_<lang>, with the Transifex defaults); the steps of the
 * other tours are lazy values, tour_steps_<id>_<lang>, read only when a tour
 * runs or is edited, never on the path every page takes.
 */
class TourRepository {
    private const INDEX = 'tours';
    private const WELCOME_STEPS = 'wizard_steps_';
    private const LANG_PATTERN = '/^[a-z]{2}(_[A-Z]{2})?$/D';
    private const MAX_BACKUPS = 10;

    private IAppData $appData;

    // New keys (tours, tour_steps_*) through the typed IAppConfig; the
    // welcome tour's keys were always written through IConfig and stay so,
    // as typed writes to them could conflict with their stored type
    public function __construct(
        private IAppConfig $appConfig,
        private IConfig $config,
        private IUserConfig $userConfig,
        private IGroupManager $groupManager,
        private IAppManager $appManager,
        private BuiltinTours $builtins,
        private DefaultStepsService $defaultSteps,
        IAppDataFactory $appDataFactory,
    ) {
        $this->appData = $appDataFactory->get('introvox');
    }

    /**
     * Every tour: the welcome tour, the admin's own, then the built-in tours
     * whose app is installed
     *
     * @return array[]
     */
    public function all(): array {
        $stored = json_decode($this->appConfig->getValueString('introvox', self::INDEX, '[]'), true);
        $tours = [];
        $welcome = null;
        $builtinState = [];
        foreach (is_array($stored) ? $stored : [] as $tour) {
            if (!is_array($tour) || !is_string($tour['id'] ?? null)) {
                continue;
            }
            if ($tour['id'] === TourValidator::WELCOME) {
                $welcome = $tour;
            } elseif (BuiltinTours::isBuiltin($tour['id'])) {
                $builtinState[$tour['id']] = $tour;
            } elseif (preg_match(TourValidator::ID_PATTERN, $tour['id'])) {
                // Tours stored before a field existed get its default
                $tours[] = $tour + TourValidator::DEFAULTS;
            }
        }
        foreach (BuiltinTours::APPS as $id => $app) {
            if ($this->appManager->isInstalled($app)) {
                $tours[] = $this->builtin($id, $app, $builtinState[$id] ?? []);
            }
        }
        return [$this->welcome($welcome), ...$tours];
    }

    public function get(string $id): ?array {
        foreach ($this->all() as $tour) {
            if ($tour['id'] === $id) {
                return $tour;
            }
        }
        return null;
    }

    /**
     * Tours for everyone: the main switch, the one the welcome tour always had
     */
    public function toursEnabled(): bool {
        return $this->config->getAppValue('introvox', 'wizard_enabled', 'true') === 'true';
    }

    /**
     * @param array $fields From TourValidator::validate()
     * @return array The new tour
     */
    public function create(array $fields): array {
        $tours = $this->all();
        if (count($tours) >= TourValidator::MAX_TOURS) {
            throw new \RuntimeException('too_many_tours');
        }
        $tour = ['id' => TourValidator::slug($fields['name'], array_column($tours, 'id'))]
            + array_intersect_key($fields, array_flip(TourValidator::FIELDS))
            + TourValidator::DEFAULTS
            + ['enabledAt' => 0, 'version' => 1, 'builtin' => false];
        // A new tour starts switched off
        $tour['enabled'] = false;
        $tours[] = $tour;
        $this->writeIndex($tours);
        return $tour;
    }

    /**
     * @param array $fields From TourValidator::validate(); for the welcome
     *   tour only 'enabled' counts
     */
    public function update(string $id, array $fields): ?array {
        $tours = $this->all();
        foreach ($tours as $index => $tour) {
            if ($tour['id'] !== $id) {
                continue;
            }
            if ($id === TourValidator::WELCOME) {
                $tour['enabled'] = (bool)($fields['enabled'] ?? $tour['enabled']);
            } else {
                // A built-in tour keeps its name, app and language
                foreach (BuiltinTours::isBuiltin($id) ? BuiltinTours::EDITABLE : TourValidator::FIELDS as $key) {
                    if (array_key_exists($key, $fields)) {
                        $tour[$key] = $fields[$key];
                    }
                }
            }
            // "New users" counts from when the tour first went on
            if ($tour['enabled'] && (int)($tour['enabledAt'] ?? 0) === 0) {
                $tour['enabledAt'] = time();
            }
            $tours[$index] = $tour;
            $this->writeIndex($tours);
            return $tour;
        }
        return null;
    }

    /**
     * Gone with all its languages and every user's state of it. An export of
     * the steps is kept in app data first; the last ten stay.
     */
    public function delete(string $id): bool {
        if ($id === TourValidator::WELCOME || BuiltinTours::isBuiltin($id) || $this->get($id) === null) {
            return false;
        }
        $backup = ['tour' => $this->get($id), 'languages' => []];
        foreach ($this->languages($id) as $language) {
            $backup['languages'][$language] = $this->steps($id, $language);
        }
        $this->writeBackup($id, $backup);

        foreach ($this->languages($id) as $language) {
            $this->appConfig->deleteKey('introvox', TourValidator::stepsKey($id, $language));
        }
        foreach (['seen', 'completed', 'skipped', 'reached'] as $state) {
            $this->userConfig->deleteKey('introvox', TourValidator::stateKey($id, $state));
        }
        $this->writeIndex(array_values(array_filter($this->all(), fn (array $tour): bool => $tour['id'] !== $id)));
        return true;
    }

    /**
     * Show a tour again to everyone who saw it. For the welcome tour that is
     * what the old "Show wizard to all users" did: forget who finished it, and
     * raise the version. Who switched tours off keeps that (tours_disabled).
     */
    public function showAgain(string $id): ?array {
        if ($id === TourValidator::WELCOME) {
            $this->userConfig->deleteKey('introvox', 'wizard_disabled');
            $version = (int)$this->config->getAppValue('introvox', 'wizard_version', '1') + 1;
            $this->config->setAppValue('introvox', 'wizard_version', (string)$version);
            return $this->get($id);
        }
        $tours = $this->all();
        foreach ($tours as $index => $tour) {
            if ($tour['id'] === $id) {
                $tours[$index]['version'] = (int)$tour['version'] + 1;
                $this->writeIndex($tours);
                return $tours[$index];
            }
        }
        return null;
    }

    /**
     * A tour as far as this user gets it: the welcome tour while it and tours
     * are on, any other while availableTo() says so. Null for an unknown id,
     * a tour that is off and someone outside it alike, so a caller answers
     * them all the same way and says nothing about which tours exist.
     */
    public function forUser(string $id, ?IUser $user): ?array {
        $tour = $user !== null && preg_match(TourValidator::ID_PATTERN, $id) ? $this->get($id) : null;
        if ($tour === null) {
            return null;
        }
        $gets = $id === TourValidator::WELCOME
            ? $this->toursEnabled() && ($tour['enabled'] ?? false) === true
            : $this->availableTo($tour, $user);
        return $gets ? $tour : null;
    }

    /**
     * Whether this user may get the tour at all: it and tours are on, they
     * are in its groups, and they can open its app. Not whether it starts by
     * itself (seen, audience, their own switch): that is the runtime's.
     */
    public function availableTo(array $tour, IUser $user): bool {
        if (!$this->toursEnabled() || ($tour['enabled'] ?? false) !== true) {
            return false;
        }
        $groups = $tour['visibleToGroups'] ?? [];
        if ($groups !== [] && !$this->inAnyGroup($user, $groups)) {
            return false;
        }
        $trigger = $tour['trigger'] ?? [];
        if (($trigger['type'] ?? '') === 'app') {
            return $this->appManager->isEnabledForUser($trigger['app'], $user);
        }
        return true;
    }

    /**
     * @param string[] $groups
     */
    public function inAnyGroup(IUser $user, array $groups): bool {
        foreach ($groups as $group) {
            if (is_string($group) && $this->groupManager->isInGroup($user->getUID(), $group)) {
                return true;
            }
        }
        return false;
    }

    /**
     * The steps users get in one language: the admin's own, or else the
     * translated defaults of the welcome tour or a built-in tour (in that
     * language, or English); null for a tour of the admin's own without
     * steps in that language
     */
    public function stepsOrDefaults(string $id, string $language): ?array {
        return $this->steps($id, $language) ?? $this->defaultSteps($id, $language);
    }

    /**
     * The translated defaults: the welcome tour's and the built-in tours',
     * null for any other tour
     */
    public function defaultSteps(string $id, string $language): ?array {
        if ($id === TourValidator::WELCOME) {
            return $this->defaultSteps->getForLanguage($language);
        }
        return $this->builtins->steps($id, $language);
    }

    /**
     * The stored steps of a tour in one language, or null when it has none.
     * For the welcome tour these are the admin's own (wizard_steps_<lang>),
     * never the translated defaults users get without them.
     */
    public function steps(string $id, string $language): ?array {
        $json = $id === TourValidator::WELCOME
            ? $this->config->getAppValue('introvox', self::WELCOME_STEPS . $language, '')
            : $this->appConfig->getValueString('introvox', TourValidator::stepsKey($id, $language), '', true);
        $steps = $json === '' ? null : json_decode($json, true);
        return is_array($steps) ? $steps : null;
    }

    public function saveSteps(string $id, string $language, array $steps): void {
        if ($id === TourValidator::WELCOME) {
            $this->config->setAppValue('introvox', self::WELCOME_STEPS . $language, json_encode($steps));
            return;
        }
        $this->appConfig->setValueString('introvox', TourValidator::stepsKey($id, $language), json_encode($steps), true);
    }

    public function deleteSteps(string $id, string $language): void {
        $this->appConfig->deleteKey('introvox', TourValidator::stepsKey($id, $language));
    }

    /**
     * The languages a tour has stored steps in; for the welcome tour, the
     * languages with steps of the admin's own
     *
     * @return string[]
     */
    public function languages(string $id): array {
        $prefix = $id === TourValidator::WELCOME ? self::WELCOME_STEPS : TourValidator::stepsKey($id, '');
        $languages = [];
        foreach ($this->appConfig->getKeys('introvox') as $key) {
            $language = substr($key, strlen($prefix));
            if (str_starts_with($key, $prefix) && preg_match(self::LANG_PATTERN, $language)) {
                $languages[] = $language;
            }
        }
        sort($languages);
        return $languages;
    }

    /**
     * Every stored step of every tour, for the media access lists: the
     * tour, and its steps in each language
     *
     * @return array<int, array{tour: array, steps: array}>
     */
    public function allSteps(): array {
        $all = [];
        foreach ($this->all() as $tour) {
            foreach ($this->languages($tour['id']) as $language) {
                $all[] = ['tour' => $tour, 'steps' => $this->steps($tour['id'], $language) ?? []];
            }
        }
        return $all;
    }

    private function welcome(?array $stored): array {
        return [
            'id' => TourValidator::WELCOME,
            'name' => '',
            'trigger' => ['type' => 'login'],
            'enabled' => ($stored['enabled'] ?? true) === true,
            'enabledAt' => (int)($stored['enabledAt'] ?? 0),
            'audience' => 'everyone',
            'visibleToGroups' => [],
            'mainLanguage' => 'en',
            'version' => (int)$this->config->getAppValue('introvox', 'wizard_version', '1'),
            'builtin' => true,
        ];
    }

    /**
     * A built-in tour as the list has it: what BuiltinTours fixes, and what
     * an admin changed (stored in the index like any tour's state)
     */
    private function builtin(string $id, string $app, array $state): array {
        return [
            'id' => $id,
            'name' => $this->builtins->name($id),
            'trigger' => ['type' => 'app', 'app' => $app],
            'mainLanguage' => 'en',
            'builtin' => true,
            'enabledAt' => (int)($state['enabledAt'] ?? 0),
            'version' => (int)($state['version'] ?? 1),
        ] + array_intersect_key($state, array_flip(BuiltinTours::EDITABLE)) + TourValidator::DEFAULTS;
    }

    private function writeIndex(array $tours): void {
        // The welcome tour's version lives in wizard_version; a built-in
        // tour's name, app and steps come from BuiltinTours
        $stored = array_map(static function (array $tour): array {
            if ($tour['id'] === TourValidator::WELCOME) {
                return ['id' => TourValidator::WELCOME, 'enabled' => $tour['enabled'], 'enabledAt' => $tour['enabledAt']];
            }
            if (BuiltinTours::isBuiltin($tour['id'])) {
                return array_intersect_key($tour, array_flip(['id', 'enabledAt', 'version', ...BuiltinTours::EDITABLE]));
            }
            return $tour;
        }, $tours);
        $this->appConfig->setValueString('introvox', self::INDEX, json_encode(array_values($stored)));
    }

    private function writeBackup(string $id, array $backup): void {
        $folder = $this->folder('backups');
        $folder->newFile($id . '-' . time() . '.json', json_encode($backup));
        $files = $folder->getDirectoryListing();
        usort($files, static fn ($a, $b): int => $a->getMTime() <=> $b->getMTime());
        foreach (array_slice($files, 0, max(0, count($files) - self::MAX_BACKUPS)) as $old) {
            $old->delete();
        }
    }

    private function folder(string $name): ISimpleFolder {
        try {
            return $this->appData->getFolder($name);
        } catch (NotFoundException $e) {
            return $this->appData->newFolder($name);
        }
    }
}
