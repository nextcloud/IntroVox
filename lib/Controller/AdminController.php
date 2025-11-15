<?php
namespace OCA\IntroVox\Controller;

use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\JSONResponse;
use OCP\IConfig;
use OCP\IRequest;
use OCP\IL10N;
use OCP\IUserManager;

class AdminController extends Controller {
    protected $config;
    protected $appName;
    protected $l10n;
    protected $userManager;

    public function __construct(
        $appName,
        IRequest $request,
        IConfig $config,
        IL10N $l10n,
        IUserManager $userManager
    ) {
        parent::__construct($appName, $request);
        $this->config = $config;
        $this->appName = $appName;
        $this->l10n = $l10n;
        $this->userManager = $userManager;
    }

    /**
     * Get available languages by detecting l10n translation files
     * Returns array of language codes that have translation files
     */
    private function getAvailableLanguages(): array {
        $l10nPath = __DIR__ . '/../../l10n';
        $availableLanguages = [];

        if (is_dir($l10nPath)) {
            $files = scandir($l10nPath);
            foreach ($files as $file) {
                // Check for .json files (e.g., en.json, nl.json)
                if (preg_match('/^([a-z]{2}(_[A-Z]{2})?)\.json$/', $file, $matches)) {
                    $langCode = $matches[1];
                    // Extract base language code (e.g., en_US -> en)
                    $baseLang = substr($langCode, 0, 2);
                    if (!in_array($baseLang, $availableLanguages)) {
                        $availableLanguages[] = $baseLang;
                    }
                }
            }
        }

        // Ensure English is always available as fallback
        if (!in_array('en', $availableLanguages)) {
            $availableLanguages[] = 'en';
        }

        sort($availableLanguages);
        return $availableLanguages;
    }

    /**
     * Get available languages with metadata
     * @NoCSRFRequired
     */
    public function getAvailableLanguagesWithMetadata(): JSONResponse {
        $languages = $this->getAvailableLanguages();

        // Language metadata (names and flags)
        $languageMetadata = [
            'en' => ['name' => 'English', 'flag' => '🇬🇧'],
            'nl' => ['name' => 'Nederlands', 'flag' => '🇳🇱'],
            'de' => ['name' => 'Deutsch', 'flag' => '🇩🇪'],
            'fr' => ['name' => 'Français', 'flag' => '🇫🇷'],
            'da' => ['name' => 'Dansk', 'flag' => '🇩🇰'],
            'sv' => ['name' => 'Svenska', 'flag' => '🇸🇪'],
            'es' => ['name' => 'Español', 'flag' => '🇪🇸'],
            'it' => ['name' => 'Italiano', 'flag' => '🇮🇹'],
            'pt' => ['name' => 'Português', 'flag' => '🇵🇹'],
            'pl' => ['name' => 'Polski', 'flag' => '🇵🇱'],
            'ru' => ['name' => 'Русский', 'flag' => '🇷🇺'],
            'ja' => ['name' => '日本語', 'flag' => '🇯🇵'],
            'zh' => ['name' => '中文', 'flag' => '🇨🇳'],
            'ko' => ['name' => '한국어', 'flag' => '🇰🇷'],
        ];

        $result = [];
        foreach ($languages as $lang) {
            $result[] = [
                'code' => $lang,
                'name' => $languageMetadata[$lang]['name'] ?? ucfirst($lang),
                'flag' => $languageMetadata[$lang]['flag'] ?? '🌐'
            ];
        }

        return new JSONResponse([
            'success' => true,
            'languages' => $result
        ]);
    }

    private function getDefaultSteps(): array {
        return [
            ['id' => 'welcome', 'title' => $this->l10n->t('step_welcome_title'), 'text' => $this->l10n->t('step_welcome_text'), 'attachTo' => '', 'position' => 'right', 'enabled' => true],
            ['id' => 'files', 'title' => $this->l10n->t('step_files_title'), 'text' => $this->l10n->t('step_files_text'), 'attachTo' => '[data-id="files"], #appmenu li[data-id="files"], a[href*="/apps/files"]', 'position' => 'right', 'enabled' => true],
            ['id' => 'calendar', 'title' => $this->l10n->t('step_calendar_title'), 'text' => $this->l10n->t('step_calendar_text'), 'attachTo' => '[data-id="calendar"], #appmenu li[data-id="calendar"], a[href*="/apps/calendar"]', 'position' => 'right', 'enabled' => true],
            ['id' => 'search', 'title' => $this->l10n->t('step_search_title'), 'text' => $this->l10n->t('step_search_text'), 'attachTo' => '.unified-search__trigger, .header-menu__trigger', 'position' => 'bottom', 'enabled' => true],
            ['id' => 'intro', 'title' => $this->l10n->t('step_intro_title'), 'text' => $this->l10n->t('step_intro_text'), 'attachTo' => '', 'position' => 'right', 'enabled' => true],
            ['id' => 'features', 'title' => $this->l10n->t('step_features_title'), 'text' => $this->l10n->t('step_features_text'), 'attachTo' => '', 'position' => 'right', 'enabled' => true],
            ['id' => 'tips', 'title' => $this->l10n->t('step_tips_title'), 'text' => $this->l10n->t('step_tips_text'), 'attachTo' => '', 'position' => 'right', 'enabled' => true],
            ['id' => 'complete', 'title' => $this->l10n->t('step_complete_title'), 'text' => $this->l10n->t('step_complete_text'), 'attachTo' => '', 'position' => 'right', 'enabled' => true]
        ];
    }

    /**
     * Get default steps for a specific language by loading translations for that language
     * @param string $lang Language code
     */
    private function getDefaultStepsForLanguage(string $lang): array {
        // Create a new L10N instance for the specified language
        $l10nFactory = \OC::$server->getL10NFactory();
        $langL10n = $l10nFactory->get($this->appName, $lang);

        return [
            ['id' => 'welcome', 'title' => $langL10n->t('step_welcome_title'), 'text' => $langL10n->t('step_welcome_text'), 'attachTo' => '', 'position' => 'right', 'enabled' => true],
            ['id' => 'files', 'title' => $langL10n->t('step_files_title'), 'text' => $langL10n->t('step_files_text'), 'attachTo' => '[data-id="files"], #appmenu li[data-id="files"], a[href*="/apps/files"]', 'position' => 'right', 'enabled' => true],
            ['id' => 'calendar', 'title' => $langL10n->t('step_calendar_title'), 'text' => $langL10n->t('step_calendar_text'), 'attachTo' => '[data-id="calendar"], #appmenu li[data-id="calendar"], a[href*="/apps/calendar"]', 'position' => 'right', 'enabled' => true],
            ['id' => 'search', 'title' => $langL10n->t('step_search_title'), 'text' => $langL10n->t('step_search_text'), 'attachTo' => '.unified-search__trigger, .header-menu__trigger', 'position' => 'bottom', 'enabled' => true],
            ['id' => 'intro', 'title' => $langL10n->t('step_intro_title'), 'text' => $langL10n->t('step_intro_text'), 'attachTo' => '', 'position' => 'right', 'enabled' => true],
            ['id' => 'features', 'title' => $langL10n->t('step_features_title'), 'text' => $langL10n->t('step_features_text'), 'attachTo' => '', 'position' => 'right', 'enabled' => true],
            ['id' => 'tips', 'title' => $langL10n->t('step_tips_title'), 'text' => $langL10n->t('step_tips_text'), 'attachTo' => '', 'position' => 'right', 'enabled' => true],
            ['id' => 'complete', 'title' => $langL10n->t('step_complete_title'), 'text' => $langL10n->t('step_complete_text'), 'attachTo' => '', 'position' => 'right', 'enabled' => true]
        ];
    }

    /**
     * Get all wizard steps for a specific language
     * @NoCSRFRequired
     * @param string $lang Language code
     */
    public function getSteps(string $lang = 'en'): JSONResponse {
        // Get available languages
        $availableLanguages = $this->getAvailableLanguages();

        // Validate language code, fallback to English if not available
        if (!in_array($lang, $availableLanguages)) {
            $lang = 'en';
        }

        $configKey = 'wizard_steps_' . $lang;
        $stepsJson = $this->config->getAppValue($this->appName, $configKey, '');

        if (empty($stepsJson)) {
            // Try to get default steps in the requested language
            // If translation doesn't exist, getDefaultStepsForLanguage will use English fallback
            $steps = $this->getDefaultStepsForLanguage($lang);
            // Save default steps to database so they can be reordered
            $this->config->setAppValue($this->appName, $configKey, json_encode($steps));
        } else {
            $steps = json_decode($stepsJson, true);

            // Migration: Add 'enabled' field to existing steps if not present
            $needsUpdate = false;
            foreach ($steps as $key => $step) {
                if (!isset($step['enabled'])) {
                    $steps[$key]['enabled'] = true;
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
     * @NoCSRFRequired
     */
    public function saveSteps(array $steps, string $lang = 'en'): JSONResponse {
        try {
            // Get available languages
            $availableLanguages = $this->getAvailableLanguages();

            // Validate language code
            if (!in_array($lang, $availableLanguages)) {
                return new JSONResponse([
                    'success' => false,
                    'error' => 'Invalid language code: ' . $lang . '. Available: ' . implode(', ', $availableLanguages)
                ], 400);
            }

            // Validate steps
            foreach ($steps as $step) {
                if (!isset($step['id']) || !isset($step['title'])) {
                    return new JSONResponse([
                        'success' => false,
                        'error' => 'Invalid step data: id and title are required'
                    ], 400);
                }
            }

            $configKey = 'wizard_steps_' . $lang;
            $stepsJson = json_encode($steps);
            $this->config->setAppValue($this->appName, $configKey, $stepsJson);

            return new JSONResponse([
                'success' => true,
                'message' => 'Steps saved successfully',
                'language' => $lang
            ]);
        } catch (\Exception $e) {
            return new JSONResponse([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Add a new step
     * @param array $step
     */
    public function addStep(array $step): JSONResponse {
        try {
            $stepsJson = $this->config->getAppValue($this->appName, 'wizard_steps', '[]');
            $steps = json_decode($stepsJson, true);

            // Generate unique ID
            $step['id'] = 'custom_' . uniqid();

            $steps[] = $step;

            $stepsJson = json_encode($steps);
            $this->config->setAppValue($this->appName, 'wizard_steps', $stepsJson);

            return new JSONResponse([
                'success' => true,
                'step' => $step
            ]);
        } catch (\Exception $e) {
            return new JSONResponse([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update an existing step
     * @param string $id
     * @param array $step
     */
    public function updateStep(string $id, array $step): JSONResponse {
        try {
            $stepsJson = $this->config->getAppValue($this->appName, 'wizard_steps', '[]');
            $steps = json_decode($stepsJson, true);

            $found = false;
            foreach ($steps as $key => $existingStep) {
                if ($existingStep['id'] === $id) {
                    // Keep the original ID
                    $step['id'] = $id;
                    $steps[$key] = $step;
                    $found = true;
                    break;
                }
            }

            if (!$found) {
                return new JSONResponse([
                    'success' => false,
                    'error' => 'Step not found'
                ], 404);
            }

            $stepsJson = json_encode($steps);
            $this->config->setAppValue($this->appName, 'wizard_steps', $stepsJson);

            return new JSONResponse([
                'success' => true,
                'step' => $step
            ]);
        } catch (\Exception $e) {
            return new JSONResponse([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete a step
     * @param string $id
     */
    public function deleteStep(string $id): JSONResponse {
        try {
            $stepsJson = $this->config->getAppValue($this->appName, 'wizard_steps', '[]');
            $steps = json_decode($stepsJson, true);

            $steps = array_filter($steps, function($step) use ($id) {
                return $step['id'] !== $id;
            });

            // Re-index array
            $steps = array_values($steps);

            $stepsJson = json_encode($steps);
            $this->config->setAppValue($this->appName, 'wizard_steps', $stepsJson);

            return new JSONResponse([
                'success' => true,
                'message' => 'Step deleted successfully'
            ]);
        } catch (\Exception $e) {
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
     * @NoCSRFRequired
     */
    public function resetToDefault(string $lang = 'en'): JSONResponse {
        try {
            // Get available languages
            $availableLanguages = $this->getAvailableLanguages();

            // Validate language code
            if (!in_array($lang, $availableLanguages)) {
                return new JSONResponse([
                    'success' => false,
                    'error' => 'Invalid language code: ' . $lang . '. Available: ' . implode(', ', $availableLanguages)
                ], 400);
            }

            $configKey = 'wizard_steps_' . $lang;

            // Delete custom steps
            $this->config->deleteAppValue($this->appName, $configKey);

            // Load and save default steps (will use English fallback if translation not available)
            $steps = $this->getDefaultStepsForLanguage($lang);
            $this->config->setAppValue($this->appName, $configKey, json_encode($steps));

            return new JSONResponse([
                'success' => true,
                'message' => 'Steps reset to default for language: ' . $lang,
                'language' => $lang
            ]);
        } catch (\Exception $e) {
            return new JSONResponse([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get global settings
     * @NoCSRFRequired
     */
    public function getSettings(): JSONResponse {
        try {
            // Default to enabled on first install with only English enabled
            $enabled = $this->config->getAppValue($this->appName, 'wizard_enabled', 'true');
            $enabledLanguagesJson = $this->config->getAppValue($this->appName, 'enabled_languages', '');

            // Default to only English enabled on first install
            if (empty($enabledLanguagesJson)) {
                $enabledLanguages = ['en'];
                // Save the default on first load
                $this->config->setAppValue($this->appName, 'enabled_languages', json_encode($enabledLanguages));
                $this->config->setAppValue($this->appName, 'wizard_enabled', 'true');
            } else {
                $enabledLanguages = json_decode($enabledLanguagesJson, true);
            }

            return new JSONResponse([
                'success' => true,
                'enabled' => $enabled === 'true',
                'enabledLanguages' => $enabledLanguages
            ]);
        } catch (\Exception $e) {
            return new JSONResponse([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Save global settings
     * @NoCSRFRequired
     */
    public function saveSettings(): JSONResponse {
        try {
            // Get enabled from request body
            $data = $this->request->getParams();
            $enabled = isset($data['enabled']) ? $data['enabled'] : true;

            // Convert to boolean if it's a string
            if (is_string($enabled)) {
                $enabled = $enabled === 'true' || $enabled === '1';
            }

            $this->config->setAppValue($this->appName, 'wizard_enabled', $enabled ? 'true' : 'false');

            // Save enabled languages if provided
            if (isset($data['enabledLanguages']) && is_array($data['enabledLanguages'])) {
                // Get available languages from translation files
                $availableLanguages = $this->getAvailableLanguages();
                $enabledLanguages = array_values(array_intersect($data['enabledLanguages'], $availableLanguages));

                // Ensure at least one language is enabled
                if (empty($enabledLanguages)) {
                    $enabledLanguages = ['en'];
                }

                $this->config->setAppValue($this->appName, 'enabled_languages', json_encode($enabledLanguages));
            }

            // Handle show to all users (reset all user preferences)
            if (isset($data['showToAll']) && $data['showToAll'] === true) {
                // Reset wizard_disabled preference for ALL users
                $this->userManager->callForAllUsers(function($user) {
                    $userId = $user->getUID();
                    // Delete the user preference so wizard will be shown again
                    $this->config->deleteUserValue($userId, $this->appName, 'wizard_disabled');
                });

                // Also increment version to ensure localStorage is cleared
                $currentVersion = (int)$this->config->getAppValue($this->appName, 'wizard_version', '1');
                $newVersion = $currentVersion + 1;
                $this->config->setAppValue($this->appName, 'wizard_version', (string)$newVersion);
            }

            return new JSONResponse([
                'success' => true,
                'message' => 'Settings saved successfully',
                'enabled' => $enabled
            ]);
        } catch (\Exception $e) {
            return new JSONResponse([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export wizard steps for a specific language
     * @NoCSRFRequired
     * @param string $lang Language code
     */
    public function exportSteps(string $lang = 'en'): JSONResponse {
        try {
            // Get available languages
            $availableLanguages = $this->getAvailableLanguages();

            // Validate language code
            if (!in_array($lang, $availableLanguages)) {
                return new JSONResponse([
                    'success' => false,
                    'error' => 'Invalid language code: ' . $lang . '. Available: ' . implode(', ', $availableLanguages)
                ], 400);
            }

            $configKey = 'wizard_steps_' . $lang;
            $stepsJson = $this->config->getAppValue($this->appName, $configKey, '');

            if (empty($stepsJson)) {
                // Get default steps if none exist yet
                $steps = $this->getDefaultStepsForLanguage($lang);
            } else {
                $steps = json_decode($stepsJson, true);
            }

            // Create filename with language abbreviation
            $filename = 'introvox_steps_' . $lang . '.json';

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
        } catch (\Exception $e) {
            return new JSONResponse([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Import wizard steps for a specific language
     * @NoCSRFRequired
     * @param string $fileContent The JSON content of the import file
     */
    public function importSteps(string $fileContent): JSONResponse {
        try {
            // Parse JSON content
            $importData = json_decode($fileContent, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                return new JSONResponse([
                    'success' => false,
                    'error' => 'Invalid JSON format: ' . json_last_error_msg()
                ], 400);
            }

            // Validate import data structure
            if (!isset($importData['language']) || !isset($importData['steps']) || !is_array($importData['steps'])) {
                return new JSONResponse([
                    'success' => false,
                    'error' => 'Invalid import format: missing language or steps'
                ], 400);
            }

            $lang = $importData['language'];

            // Get available languages
            $availableLanguages = $this->getAvailableLanguages();

            // Validate language code
            if (!in_array($lang, $availableLanguages)) {
                return new JSONResponse([
                    'success' => false,
                    'error' => 'Invalid language code: ' . $lang . '. Available: ' . implode(', ', $availableLanguages)
                ], 400);
            }

            $steps = $importData['steps'];

            // Validate each step
            foreach ($steps as $step) {
                if (!isset($step['id']) || !isset($step['title'])) {
                    return new JSONResponse([
                        'success' => false,
                        'error' => 'Invalid step data: id and title are required'
                    ], 400);
                }
            }

            // Save imported steps (preserving order from import file)
            $configKey = 'wizard_steps_' . $lang;
            $this->config->setAppValue($this->appName, $configKey, json_encode($steps));

            return new JSONResponse([
                'success' => true,
                'message' => 'Steps imported successfully',
                'language' => $lang,
                'stepsCount' => count($steps)
            ]);
        } catch (\Exception $e) {
            return new JSONResponse([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
