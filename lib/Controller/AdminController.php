<?php
namespace OCA\IntroVox\Controller;

use OCP\AppFramework\Controller;
use OCP\AppFramework\Http;
use OCP\AppFramework\Http\JSONResponse;
use OCP\IConfig;
use OCP\IRequest;
use OCP\IL10N;
use OCP\L10N\IFactory as IL10NFactory;
use OCP\IUserSession;
use OCP\IGroupManager;
use OCA\IntroVox\Media\MediaException;
use OCA\IntroVox\Service\ChecklistService;
use OCA\IntroVox\Service\DefaultStepsService;
use OCA\IntroVox\Service\MediaService;
use OCA\IntroVox\Service\TourRepository;
use OCA\IntroVox\Service\TourValidator;
use OCA\IntroVox\Service\StepValidator;
use OCA\IntroVox\Service\TelemetryService;

class AdminController extends Controller {
    protected $config;
    protected $appName;
    protected $l10n;
    protected $l10nFactory;
    protected $groupManager;
    protected $userSession;
    protected $defaultSteps;
    protected $telemetryService;
    protected $stepValidator;
    protected $mediaService;
    protected $tours;
    protected $checklist;

    // Language codes such as en or pt_BR. /D: without it, $ also matches
    // before a trailing newline, and "en\n" became an appconfig key of its own.

    public function __construct(
        $appName,
        IRequest $request,
        IConfig $config,
        IL10N $l10n,
        IL10NFactory $l10nFactory,
        IGroupManager $groupManager,
        IUserSession $userSession,
        DefaultStepsService $defaultSteps,
        TelemetryService $telemetryService,
        StepValidator $stepValidator,
        MediaService $mediaService,
        TourRepository $tours,
        ChecklistService $checklist
    ) {
        parent::__construct($appName, $request);
        $this->config = $config;
        $this->appName = $appName;
        $this->l10n = $l10n;
        $this->l10nFactory = $l10nFactory;
        $this->groupManager = $groupManager;
        $this->userSession = $userSession;
        $this->defaultSteps = $defaultSteps;
        $this->telemetryService = $telemetryService;
        $this->stepValidator = $stepValidator;
        $this->mediaService = $mediaService;
        $this->tours = $tours;
        $this->checklist = $checklist;
    }

    /**
     * An app tour by id, or null for the welcome tour (whose steps live in
     * wizard_steps_<lang>). False for a tour that does not exist.
     */
    private function appTour(string $tour): array|null|false {
        if ($tour === TourValidator::WELCOME) {
            return null;
        }
        return $this->tours->get($tour) ?? false;
    }

    private function unknownTour(): JSONResponse {
        // TRANSLATORS: Error message: no tour with that ID exists
        return new JSONResponse(['success' => false, 'error' => $this->l10n->t('Unknown tour')], 404);
    }

    /**
     * Defensive admin check — the framework already enforces admin for
     * methods without the NoAdminRequired attribute, but we double-check so a
     * missing or broken attribute cannot leak admin endpoints.
     */
    private function requireAdmin(): ?JSONResponse {
        $user = $this->userSession->getUser();
        if ($user === null || !$this->groupManager->isAdmin($user->getUID())) {
            return new JSONResponse(
                // TRANSLATORS: Error message: only administrators may do this
                ['success' => false, 'error' => $this->l10n->t('Administrator privileges required')],
                Http::STATUS_FORBIDDEN
            );
        }
        return null;
    }

    /**
     * Trim step fields. Title and text stay HTML: admins write steps with
     * `<p>`, `<strong>` and lists, and escaping would show the tags. The
     * browser cleans it before showing it (src/utils/stepHtml.js), so only
     * the tags and attributes a step may have get through.
     */
    private function sanitizeStep(array $step): array {
        if (isset($step['text']) && is_string($step['text'])) {
            $step['text'] = $this->fixMojibake(trim($step['text']));
        }
        if (isset($step['title']) && is_string($step['title'])) {
            $step['title'] = $this->fixMojibake(trim($step['title']));
        }
        return $step;
    }

    /**
     * Repair "mojibake" — UTF-8 text that was decoded as CP1252/Latin-1 and
     * re-encoded as UTF-8, so "één" arrives as "Ã©Ã©n". This happens when an
     * import file was saved in a non-UTF-8 encoding: the browser's `file.text()`
     * always decodes as UTF-8, so the bad bytes reach us as (valid but wrong)
     * UTF-8 and would otherwise be stored and shown verbatim.
     *
     * Conservative by design — it only rewrites a string when BOTH:
     *   (a) it carries a mojibake signature (a `Ã`/`Â` lead byte followed by a
     *       continuation byte, or the `â€`-style smart-quote/dash sequences), and
     *   (b) reinterpreting its code points as the CP1252 bytes they were mis-read
     *       from yields a *different* string that is itself still valid UTF-8.
     * Correctly-accented copy ("café", "naïef", "Übung", "—", "→") fails guard
     * (b) — reinterpreting it produces invalid UTF-8 — so it is left untouched.
     * The loop undoes up to a few stacked layers (double-encoding), capped.
     */
    private function fixMojibake(string $s): string {
        if ($s === '' || !preg_match('//u', $s)) {
            return $s;
        }
        $marker = "/[\xC3\xC2][\x80-\xBF]|\xE2\x80[\x93\x94\x99\x9c\x9d\xA6]/";
        $guard = 0;
        while ($guard++ < 5 && preg_match($marker, $s)) {
            $bytes = @mb_convert_encoding($s, 'Windows-1252', 'UTF-8');
            if ($bytes === false || $bytes === '' || $bytes === $s || !preg_match('//u', $bytes)) {
                break;
            }
            $s = $bytes;
        }
        return $s;
    }

    /**
     * Return every language Nextcloud knows about — used by the "Add language
     * override" picker so admins aren't limited to the small set of languages
     * IntroVox happens to ship a translation file for. Deduplicated by base
     * code (e.g. en_GB merged with en) and sorted by display name.
     */
    public function getAvailableLanguagesWithMetadata(): JSONResponse {
        if ($forbidden = $this->requireAdmin()) return $forbidden;

        $ncLanguages = $this->l10nFactory->getLanguages();
        $seen = [];
        $result = [];
        foreach (array_merge($ncLanguages['commonLanguages'], $ncLanguages['otherLanguages']) as $entry) {
            $code = substr($entry['code'], 0, 2);
            if (!preg_match('/^[a-z]{2}$/', $code) || isset($seen[$code])) {
                continue;
            }
            $seen[$code] = true;
            $result[] = [
                'code' => $code,
                'name' => $entry['name'],
            ];
        }
        usort($result, fn($a, $b) => strcmp($a['name'], $b['name']));

        return new JSONResponse([
            'success' => true,
            'languages' => $result
        ]);
    }

    /**
     * List languages that currently have an admin-authored override row.
     * English is always included so the Steps editor has at least one entry.
     */
    public function listOverrides(string $tour = TourValidator::WELCOME): JSONResponse {
        if ($forbidden = $this->requireAdmin()) return $forbidden;
        $appTour = $this->appTour($tour);
        if ($appTour === false) {
            return $this->unknownTour();
        }

        if ($appTour !== null) {
            // An app tour has the languages it has steps in, and its own
            $codes = array_values(array_unique([$appTour['mainLanguage'], ...$this->tours->languages($tour)]));
        } else {
            $keys = $this->config->getAppKeys($this->appName);
            $codes = ['en'];
            foreach ($keys as $key) {
                if (preg_match('/^wizard_steps_([a-z]{2}(?:_[A-Z]{2})?)$/', $key, $m)) {
                    if (!in_array($m[1], $codes, true)) {
                        $codes[] = $m[1];
                    }
                }
            }
        }
        sort($codes);

        $ncLanguages = $this->l10nFactory->getLanguages();
        $nameByCode = [];
        foreach (array_merge($ncLanguages['commonLanguages'], $ncLanguages['otherLanguages']) as $entry) {
            $nameByCode[$entry['code']] = $entry['name'];
        }

        $result = [];
        foreach ($codes as $code) {
            $result[] = [
                'code' => $code,
                'name' => $nameByCode[$code] ?? ucfirst($code),
            ];
        }

        return new JSONResponse([
            'success' => true,
            'overrides' => $result,
        ]);
    }

    private function getDefaultStepsForLanguage(string $lang): array {
        return $this->defaultSteps->getForLanguage($lang);
    }

    /**
     * Get all wizard steps for a specific language
     * @param string $lang Language code
     */
    public function getSteps(string $lang = 'en', string $tour = TourValidator::WELCOME): JSONResponse {
        if ($forbidden = $this->requireAdmin()) return $forbidden;
        if (!preg_match(TourValidator::LANG_PATTERN, $lang)) {
            $lang = 'en';
        }
        $appTour = $this->appTour($tour);
        if ($appTour === false) {
            return $this->unknownTour();
        }
        if ($appTour !== null) {
            // A built-in tour without steps of the admin's own: its defaults
            return new JSONResponse([
                'success' => true,
                'steps' => $this->tours->stepsOrDefaults($tour, $lang) ?? [],
                'language' => $lang,
                'tour' => $tour,
            ]);
        }

        $configKey = 'wizard_steps_' . $lang;
        $stepsJson = $this->config->getAppValue($this->appName, $configKey, '');

        if (empty($stepsJson)) {
            $steps = $this->getDefaultStepsForLanguage($lang);
        } else {
            $steps = json_decode($stepsJson, true);

            // Migration: Add 'enabled' and 'visibleToGroups' fields to existing steps if not present
            $needsUpdate = false;
            foreach ($steps as $key => $step) {
                if (!isset($step['enabled'])) {
                    $steps[$key]['enabled'] = true;
                    $needsUpdate = true;
                }
                if (!array_key_exists('visibleToGroups', $step)) {
                    $steps[$key]['visibleToGroups'] = [];
                    $needsUpdate = true;
                }
            }

            if ($needsUpdate) {
                $this->config->setAppValue($this->appName, $configKey, json_encode($steps));
            }
        }

        return new JSONResponse([
            'success' => true,
            'steps' => $steps,
            'language' => $lang
        ]);
    }

    /**
     * Save wizard steps for a specific language
     * @param array $steps
     * @param string $lang Language code
     */
    public function saveSteps(array $steps, string $lang = 'en', string $tour = TourValidator::WELCOME): JSONResponse {
        if ($forbidden = $this->requireAdmin()) return $forbidden;
        $appTour = $this->appTour($tour);
        if ($appTour === false) {
            return $this->unknownTour();
        }
        try {
            if (!preg_match(TourValidator::LANG_PATTERN, $lang)) {
                return new JSONResponse([
                    'success' => false,
                    // TRANSLATORS: Error message; %s is the language code that was refused, such as "en-US!"
                    'error' => $this->l10n->t('Invalid language code: %s', [$lang])
                ], 400);
            }

            [$validated, $error] = $this->stepValidator->validateAll($steps);
            if ($error !== null) {
                return new JSONResponse([
                    'success' => false,
                    // TRANSLATORS: %s is a technical description of the problem, in English, such as "Step 2: title must be text"
                    'error' => $this->l10n->t('Invalid step data: %s', [$error])
                ], 400);
            }
            $sanitized = array_map(fn ($step) => $this->sanitizeStep($step), $validated);
            try {
                [$sanitized] = $this->mediaService->resolveStepMedia($sanitized, true);
            } catch (MediaException $e) {
                return new JSONResponse([
                    'success' => false,
                    'error' => 'Invalid step data: media file not found: ' . $e->getDetail()
                ], 400);
            }

            $stepsJson = json_encode($sanitized);
            if (strlen($stepsJson) > StepValidator::MAX_IMPORT_BYTES) {
                return new JSONResponse([
                    'success' => false,
                    'error' => 'Invalid step data: the steps are larger than 1 MB'
                ], 400);
            }
            if ($appTour !== null) {
                $this->tours->saveSteps($tour, $lang, $sanitized);
            } else {
                $this->config->setAppValue($this->appName, 'wizard_steps_' . $lang, $stepsJson);
            }
            $this->mediaService->refreshAccess();

            return new JSONResponse([
                'success' => true,
                'message' => 'Steps saved',
                'language' => $lang
            ]);
        } catch (\Throwable $e) {
            return new JSONResponse([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reset to default steps for a specific language
     * If no translation exists for the language, fallback to English
     * @param string $lang Language code
     */
    public function resetToDefault(string $lang = 'en', string $tour = TourValidator::WELCOME): JSONResponse {
        if ($forbidden = $this->requireAdmin()) return $forbidden;
        $appTour = $this->appTour($tour);
        if ($appTour === false) {
            return $this->unknownTour();
        }
        try {
            if (!preg_match(TourValidator::LANG_PATTERN, $lang)) {
                return new JSONResponse([
                    'success' => false,
                    'error' => $this->l10n->t('Invalid language code: %s', [$lang])
                ], 400);
            }

            // Delete the override row; next GET serves Transifex-translated
            // defaults. An app tour has no defaults: its language is emptied.
            if ($appTour !== null) {
                $this->tours->deleteSteps($tour, $lang);
            } else {
                $this->config->deleteAppValue($this->appName, 'wizard_steps_' . $lang);
            }
            $this->mediaService->refreshAccess();

            return new JSONResponse([
                'success' => true,
                'message' => 'Override discarded for language: ' . $lang,
                'language' => $lang
            ]);
        } catch (\Throwable $e) {
            return new JSONResponse([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get global settings
     */
    public function getSettings(): JSONResponse {
        if ($forbidden = $this->requireAdmin()) return $forbidden;
        try {
            return new JSONResponse([
                'success' => true,
                'enabled' => $this->tours->toursEnabled(),
                // "Tours" in the user menu (UserMenuEntry)
                'userMenu' => $this->config->getAppValue($this->appName, 'user_menu', 'true') === 'true',
                // "Getting started" on the Dashboard (ChecklistWidget)
                'checklist' => $this->checklist->settings(),
            ]);
        } catch (\Throwable $e) {
            return new JSONResponse([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Save global settings
     */
    public function saveSettings(): JSONResponse {
        if ($forbidden = $this->requireAdmin()) return $forbidden;
        try {
            // Only what the request carries changes
            $data = $this->request->getParams();
            $flag = static fn ($value): bool => $value === true || $value === 'true' || $value === '1';
            if (array_key_exists('enabled', $data)) {
                $this->config->setAppValue($this->appName, 'wizard_enabled', $flag($data['enabled']) ? 'true' : 'false');
                // Media in steps is for users only while the tour is on
                $this->mediaService->refreshAccess();
            }
            if (array_key_exists('userMenu', $data)) {
                $this->config->setAppValue($this->appName, 'user_menu', $flag($data['userMenu']) ? 'true' : 'false');
            }
            if (is_array($data['checklist'] ?? null)) {
                $refused = $this->checklist->save($data['checklist']);
                if ($refused !== null) {
                    return new JSONResponse(['success' => false, 'error' => $refused], Http::STATUS_BAD_REQUEST);
                }
            }

            return new JSONResponse([
                'success' => true,
                'message' => 'Settings saved',
                'enabled' => $this->tours->toursEnabled(),
                'userMenu' => $this->config->getAppValue($this->appName, 'user_menu', 'true') === 'true',
                'checklist' => $this->checklist->settings(),
            ]);
        } catch (\Throwable $e) {
            return new JSONResponse([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export wizard steps for a specific language
     * @param string $lang Language code
     */
    public function exportSteps(string $lang = 'en', string $tour = TourValidator::WELCOME): JSONResponse {
        if ($forbidden = $this->requireAdmin()) return $forbidden;
        $appTour = $this->appTour($tour);
        if ($appTour === false) {
            return $this->unknownTour();
        }
        try {
            if (!preg_match(TourValidator::LANG_PATTERN, $lang)) {
                return new JSONResponse([
                    'success' => false,
                    'error' => $this->l10n->t('Invalid language code: %s', [$lang])
                ], 400);
            }

            if ($appTour !== null) {
                $steps = $this->tours->stepsOrDefaults($tour, $lang) ?? [];
            } else {
                $stepsJson = $this->config->getAppValue($this->appName, 'wizard_steps_' . $lang, '');
                // Default steps if none exist yet
                $steps = empty($stepsJson) ? $this->getDefaultStepsForLanguage($lang) : json_decode($stepsJson, true);
            }

            // Create filename with language abbreviation
            $filename = $appTour !== null
                ? 'introvox_' . $tour . '_steps_' . $lang . '.json'
                : 'introvox_steps_' . $lang . '.json';

            // Create export data with metadata
            $exportData = [
                'version' => '1.0',
                'language' => $lang,
                'exportDate' => date('Y-m-d H:i:s'),
                'steps' => $steps
            ];

            return new JSONResponse([
                'success' => true,
                'filename' => $filename,
                'data' => json_encode($exportData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE),
                'language' => $lang
            ]);
        } catch (\Throwable $e) {
            return new JSONResponse([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Import wizard steps for a specific language
     * @param string $fileContent The JSON content of the import file
     */
    public function importSteps(string $fileContent, string $tour = TourValidator::WELCOME): JSONResponse {
        if ($forbidden = $this->requireAdmin()) return $forbidden;
        $appTour = $this->appTour($tour);
        if ($appTour === false) {
            return $this->unknownTour();
        }
        try {
            if (strlen($fileContent) > StepValidator::MAX_IMPORT_BYTES) {
                return new JSONResponse([
                    'success' => false,
                    'error' => $this->l10n->t('Import file is too large (at most 1 MB)')
                ], 400);
            }

            // Parse JSON content
            $importData = json_decode($fileContent, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                return new JSONResponse([
                    'success' => false,
                    // TRANSLATORS: %s is PHP's own description of the JSON error, in English, such as "Syntax error"
                    'error' => $this->l10n->t('Invalid JSON format: %s', [json_last_error_msg()])
                ], 400);
            }

            // Validate import data structure
            if (!is_array($importData) || !is_string($importData['language'] ?? null) || !isset($importData['steps'])) {
                return new JSONResponse([
                    'success' => false,
                    'error' => $this->l10n->t('Invalid import format: missing language or steps')
                ], 400);
            }

            $lang = $importData['language'];

            if (!preg_match(TourValidator::LANG_PATTERN, $lang)) {
                return new JSONResponse([
                    'success' => false,
                    'error' => $this->l10n->t('Invalid language code: %s', [$lang])
                ], 400);
            }

            // An import goes live for every user at once, and the file may come
            // from anyone: only known fields, of the right type and size.
            [$validated, $error] = $this->stepValidator->validateAll($importData['steps']);
            if ($error !== null) {
                return new JSONResponse([
                    'success' => false,
                    // TRANSLATORS: %s is a technical description of the problem, in English, such as "Step 2: title must be text"
                    'error' => $this->l10n->t('Invalid step data: %s', [$error])
                ], 400);
            }
            $sanitized = array_map(fn ($step) => $this->sanitizeStep($step), $validated);
            // Media this instance does not have (an export from another
            // server) is left out, and said so
            [$sanitized, $missingMedia] = $this->mediaService->resolveStepMedia($sanitized, false);

            // Save imported steps (preserving order from import file), into
            // the tour open in the editor
            if ($appTour !== null) {
                $this->tours->saveSteps($tour, $lang, $sanitized);
            } else {
                $this->config->setAppValue($this->appName, 'wizard_steps_' . $lang, json_encode($sanitized));
            }
            $this->mediaService->refreshAccess();

            return new JSONResponse([
                'success' => true,
                'message' => 'Steps imported successfully',
                'language' => $lang,
                'stepsCount' => count($sanitized),
                'missingMedia' => $missingMedia
            ]);
        } catch (\Throwable $e) {
            return new JSONResponse([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all available groups for group visibility selection
     */
    public function getGroups(): JSONResponse {
        if ($forbidden = $this->requireAdmin()) return $forbidden;
        try {
            $groups = $this->groupManager->search('');
            $result = [];
            foreach ($groups as $group) {
                $result[] = [
                    'id' => $group->getGID(),
                    'displayName' => $group->getDisplayName()
                ];
            }
            return new JSONResponse([
                'success' => true,
                'groups' => $result
            ]);
        } catch (\Throwable $e) {
            return new JSONResponse([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get statistics for admin panel
     */
    public function getStatistics(): JSONResponse {
        if ($forbidden = $this->requireAdmin()) return $forbidden;
        try {
            $statistics = $this->telemetryService->getStatistics();
            $telemetryStatus = $this->telemetryService->getStatus();

            return new JSONResponse([
                'success' => true,
                'statistics' => $statistics,
                'telemetry' => $telemetryStatus
            ]);
        } catch (\Throwable $e) {
            return new JSONResponse([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Toggle telemetry enabled/disabled
     */
    public function toggleTelemetry(): JSONResponse {
        if ($forbidden = $this->requireAdmin()) return $forbidden;
        try {
            $data = $this->request->getParams();
            $enabled = isset($data['enabled']) ? $data['enabled'] : false;

            // Convert to boolean if it's a string
            if (is_string($enabled)) {
                $enabled = $enabled === 'true' || $enabled === '1';
            }

            $this->telemetryService->setEnabled($enabled);

            return new JSONResponse([
                'success' => true,
                'enabled' => $enabled,
                'message' => $enabled ? 'Telemetry enabled' : 'Telemetry disabled'
            ]);
        } catch (\Throwable $e) {
            return new JSONResponse([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * The admin intro showed the telemetry question. From now on telemetry is
     * on unless an admin turns it off (TelemetryService::isEnabled).
     */
    public function markTelemetryAsked(): JSONResponse {
        if ($forbidden = $this->requireAdmin()) return $forbidden;
        $this->telemetryService->markAsked();
        return new JSONResponse([
            'success' => true,
            'enabled' => $this->telemetryService->isEnabled()
        ]);
    }

    /**
     * This admin has seen the admin intro; it is shown once to every admin.
     */
    public function markIntroDone(): JSONResponse {
        if ($forbidden = $this->requireAdmin()) return $forbidden;
        $this->config->setUserValue($this->userSession->getUser()->getUID(), $this->appName, 'admin_intro_done', '1');
        return new JSONResponse(['success' => true]);
    }

    /**
     * Manually trigger telemetry send
     */
    public function sendTelemetryNow(): JSONResponse {
        if ($forbidden = $this->requireAdmin()) return $forbidden;
        try {
            // Temporarily enable telemetry for this request if it's disabled
            $wasEnabled = $this->telemetryService->isEnabled();
            if (!$wasEnabled) {
                $this->telemetryService->setEnabled(true);
            }

            $success = $this->telemetryService->sendReport();

            // Restore original state
            if (!$wasEnabled) {
                $this->telemetryService->setEnabled(false);
            }

            if ($success) {
                return new JSONResponse([
                    'success' => true,
                    'message' => 'Telemetry report sent successfully'
                ]);
            } else {
                return new JSONResponse([
                    'success' => false,
                    'error' => $this->l10n->t('Failed to send telemetry report')
                ], 500);
            }
        } catch (\Throwable $e) {
            return new JSONResponse([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
