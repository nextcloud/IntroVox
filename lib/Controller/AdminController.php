<?php
namespace OCA\IntroVox\Controller;

use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\JSONResponse;
use OCP\IConfig;
use OCP\IRequest;
use OCP\IL10N;

class AdminController extends Controller {
    protected $config;
    protected $appName;
    protected $l10n;

    public function __construct(
        $appName,
        IRequest $request,
        IConfig $config,
        IL10N $l10n
    ) {
        parent::__construct($appName, $request);
        $this->config = $config;
        $this->appName = $appName;
        $this->l10n = $l10n;
    }

    private function getDefaultSteps(): array {
        return [
            ['id' => 'welcome', 'title' => $this->l10n->t('step_welcome_title'), 'text' => $this->l10n->t('step_welcome_text'), 'attachTo' => '', 'position' => 'right', 'enabled' => true],
            ['id' => 'files', 'title' => $this->l10n->t('step_files_title'), 'text' => $this->l10n->t('step_files_text'), 'attachTo' => 'a[href*="/apps/files/"]', 'position' => 'right', 'enabled' => true],
            ['id' => 'calendar', 'title' => $this->l10n->t('step_calendar_title'), 'text' => $this->l10n->t('step_calendar_text'), 'attachTo' => 'a[href*="/apps/calendar/"]', 'position' => 'right', 'enabled' => true],
            ['id' => 'search', 'title' => $this->l10n->t('step_search_title'), 'text' => $this->l10n->t('step_search_text'), 'attachTo' => 'button[aria-label="Unified search"]', 'position' => 'bottom', 'enabled' => true],
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
            ['id' => 'files', 'title' => $langL10n->t('step_files_title'), 'text' => $langL10n->t('step_files_text'), 'attachTo' => 'a[href*="/apps/files/"]', 'position' => 'right', 'enabled' => true],
            ['id' => 'calendar', 'title' => $langL10n->t('step_calendar_title'), 'text' => $langL10n->t('step_calendar_text'), 'attachTo' => 'a[href*="/apps/calendar/"]', 'position' => 'right', 'enabled' => true],
            ['id' => 'search', 'title' => $langL10n->t('step_search_title'), 'text' => $langL10n->t('step_search_text'), 'attachTo' => 'button[aria-label="Unified search"]', 'position' => 'bottom', 'enabled' => true],
            ['id' => 'intro', 'title' => $langL10n->t('step_intro_title'), 'text' => $langL10n->t('step_intro_text'), 'attachTo' => '', 'position' => 'right', 'enabled' => true],
            ['id' => 'features', 'title' => $langL10n->t('step_features_title'), 'text' => $langL10n->t('step_features_text'), 'attachTo' => '', 'position' => 'right', 'enabled' => true],
            ['id' => 'tips', 'title' => $langL10n->t('step_tips_title'), 'text' => $langL10n->t('step_tips_text'), 'attachTo' => '', 'position' => 'right', 'enabled' => true],
            ['id' => 'complete', 'title' => $langL10n->t('step_complete_title'), 'text' => $langL10n->t('step_complete_text'), 'attachTo' => '', 'position' => 'right', 'enabled' => true]
        ];
    }

    /**
     * Get all wizard steps for a specific language
     * @NoCSRFRequired
     * @param string $lang Language code (en, nl, de, fr, da, sv)
     */
    public function getSteps(string $lang = 'en'): JSONResponse {
        // Validate language code
        $supportedLanguages = ['en', 'nl', 'de', 'fr', 'da', 'sv'];
        if (!in_array($lang, $supportedLanguages)) {
            $lang = 'en'; // Fallback to English
        }

        $configKey = 'wizard_steps_' . $lang;
        $stepsJson = $this->config->getAppValue($this->appName, $configKey, '');

        if (empty($stepsJson)) {
            // Get default steps in the requested language
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
            // Validate language code
            $supportedLanguages = ['en', 'nl', 'de', 'fr', 'da', 'sv'];
            if (!in_array($lang, $supportedLanguages)) {
                return new JSONResponse([
                    'success' => false,
                    'error' => 'Invalid language code'
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
     * @param string $lang Language code
     * @NoCSRFRequired
     */
    public function resetToDefault(string $lang = 'en'): JSONResponse {
        try {
            // Validate language code
            $supportedLanguages = ['en', 'nl', 'de', 'fr', 'da', 'sv'];
            if (!in_array($lang, $supportedLanguages)) {
                return new JSONResponse([
                    'success' => false,
                    'error' => 'Invalid language code'
                ], 400);
            }

            $configKey = 'wizard_steps_' . $lang;
            $this->config->deleteAppValue($this->appName, $configKey);

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
            $enabled = $this->config->getAppValue($this->appName, 'wizard_enabled', 'true');
            $enabledLanguagesJson = $this->config->getAppValue($this->appName, 'enabled_languages', '');

            // Default to only English enabled on first install
            if (empty($enabledLanguagesJson)) {
                $enabledLanguages = ['en'];
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
                $supportedLanguages = ['en', 'nl', 'de', 'fr', 'da', 'sv'];
                $enabledLanguages = array_values(array_intersect($data['enabledLanguages'], $supportedLanguages));

                // Ensure at least one language is enabled
                if (empty($enabledLanguages)) {
                    $enabledLanguages = ['en'];
                }

                $this->config->setAppValue($this->appName, 'enabled_languages', json_encode($enabledLanguages));
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
}
