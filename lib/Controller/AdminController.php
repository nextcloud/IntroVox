<?php
namespace OCA\IntroVox\Controller;

use OCP\AppFramework\Controller;
use OCP\AppFramework\Http;
use OCP\AppFramework\Http\JSONResponse;
use OCP\IConfig;
use OCP\IRequest;
use OCP\IL10N;
use OCP\L10N\IFactory as IL10NFactory;
use OCP\IUserManager;
use OCP\IUserSession;
use OCP\IGroupManager;
use OCA\IntroVox\Service\TelemetryService;

class AdminController extends Controller {
    protected $config;
    protected $appName;
    protected $l10n;
    protected $l10nFactory;
    protected $userManager;
    protected $groupManager;
    protected $userSession;
    protected $telemetryService;

    public function __construct(
        $appName,
        IRequest $request,
        IConfig $config,
        IL10N $l10n,
        IL10NFactory $l10nFactory,
        IUserManager $userManager,
        IGroupManager $groupManager,
        IUserSession $userSession,
        TelemetryService $telemetryService
    ) {
        parent::__construct($appName, $request);
        $this->config = $config;
        $this->appName = $appName;
        $this->l10n = $l10n;
        $this->l10nFactory = $l10nFactory;
        $this->userManager = $userManager;
        $this->groupManager = $groupManager;
        $this->userSession = $userSession;
        $this->telemetryService = $telemetryService;
    }

    /**
     * Defensive admin check — the framework already enforces admin for
     * non-@NoAdminRequired methods, but we double-check so a missing/broken
     * annotation cannot leak admin endpoints.
     */
    private function requireAdmin(): ?JSONResponse {
        $user = $this->userSession->getUser();
        if ($user === null || !$this->groupManager->isAdmin($user->getUID())) {
            return new JSONResponse(
                ['success' => false, 'error' => 'Admin privileges required'],
                Http::STATUS_FORBIDDEN
            );
        }
        return null;
    }

    /**
     * Sanitize wizard-step text. Steps are admin-authored and rendered by
     * Shepherd.js as HTML, so we strip script/event handlers but allow
     * basic formatting tags admins use in tour copy.
     */
    private function sanitizeStep(array $step): array {
        if (isset($step['text']) && is_string($step['text'])) {
            $step['text'] = \OCP\Util::sanitizeHTML($step['text']);
        }
        if (isset($step['title']) && is_string($step['title'])) {
            $step['title'] = \OCP\Util::sanitizeHTML($step['title']);
        }
        return $step;
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
        if ($forbidden = $this->requireAdmin()) return $forbidden;

        $available = $this->getAvailableLanguages();

        // Pull display names from Nextcloud's IFactory — auto-localized to the
        // admin's UI locale and includes every language NC knows about.
        $ncLanguages = $this->l10nFactory->getLanguages();
        $nameByCode = [];
        foreach (array_merge($ncLanguages['commonLanguages'], $ncLanguages['otherLanguages']) as $entry) {
            $nameByCode[$entry['code']] = $entry['name'];
        }

        $result = [];
        foreach ($available as $lang) {
            $result[] = [
                'code' => $lang,
                'name' => $nameByCode[$lang] ?? ucfirst($lang),
            ];
        }

        return new JSONResponse([
            'success' => true,
            'languages' => $result
        ]);
    }

    private function getDefaultSteps(): array {
        return $this->buildDefaultSteps($this->l10n);
    }

    /**
     * Get default steps for a specific language by loading translations for that language
     * @param string $lang Language code
     */
    private function getDefaultStepsForLanguage(string $lang): array {
        return $this->buildDefaultSteps($this->l10nFactory->get($this->appName, $lang));
    }

    private function buildDefaultSteps(IL10N $l): array {
        return [
            [
                'id' => 'welcome',
                'title' => $l->t('👋 Welcome to Nextcloud'),
                'text' => $l->t('<p>Nice to have you here! This short tour will help you get started quickly.</p><p>You can close this wizard at any time and open it again later.</p>'),
                'attachTo' => '',
                'position' => 'right',
                'enabled' => true,
            ],
            [
                'id' => 'files',
                'title' => $l->t('📁 Files'),
                'text' => $l->t('<p>This is your main menu. Click here to view and manage all your files.</p><p>You can upload files, create folders and share with others.</p>'),
                'attachTo' => '[data-id="files"], #appmenu li[data-id="files"], a[href*="/apps/files"]',
                'position' => 'right',
                'enabled' => true,
            ],
            [
                'id' => 'calendar',
                'title' => $l->t('📅 Calendar'),
                'text' => $l->t('<p>Here you\'ll find your personal calendar.</p><p>Schedule appointments, set reminders and share your calendar with others.</p>'),
                'attachTo' => '[data-id="calendar"], #appmenu li[data-id="calendar"], a[href*="/apps/calendar"]',
                'position' => 'right',
                'enabled' => true,
            ],
            [
                'id' => 'search',
                'title' => $l->t('🔍 Search'),
                'text' => $l->t('<p>With the search bar you can quickly find files, contacts and more.</p><p>Just type what you\'re looking for and press Enter.</p>'),
                'attachTo' => '.unified-search__trigger, .header-menu__trigger',
                'position' => 'bottom',
                'enabled' => true,
            ],
            [
                'id' => 'intro',
                'title' => $l->t('🎯 Getting started'),
                'text' => $l->t('<p><strong>Nextcloud is your personal cloud storage!</strong></p><p>Here you can:</p><ul><li>📁 Upload, share and collaborate on files</li><li>📅 Manage your calendar</li><li>✉️ Send and receive email</li><li>👥 Keep track of contacts</li></ul>'),
                'attachTo' => '',
                'position' => 'right',
                'enabled' => true,
            ],
            [
                'id' => 'features',
                'title' => $l->t('✨ Important features'),
                'text' => $l->t('<p><strong>Navigation:</strong></p><ul><li>Use the <strong>main menu</strong> (left) to switch between apps</li><li>Click on your <strong>username</strong> (top right) for settings</li><li>Use the <strong>search bar</strong> to quickly find files</li></ul>'),
                'attachTo' => '',
                'position' => 'right',
                'enabled' => true,
            ],
            [
                'id' => 'tips',
                'title' => $l->t('💡 Useful tips'),
                'text' => $l->t('<p><strong>Did you know:</strong></p><ul><li>You can upload files by dragging them to your browser</li><li>You can directly share files with a link</li><li>You can also use Nextcloud as an app on your phone</li><li>All your data is stored privately and securely</li></ul>'),
                'attachTo' => '',
                'position' => 'right',
                'enabled' => true,
            ],
            [
                'id' => 'complete',
                'title' => $l->t('🎉 Done!'),
                'text' => $l->t('<p>You\'re all set to get started!</p><p>If you want to see this tour again, you can find it in your personal settings.</p><p>Have fun with Nextcloud!</p>'),
                'attachTo' => '',
                'position' => 'right',
                'enabled' => true,
            ],
        ];
    }

    /**
     * Get all wizard steps for a specific language
     * @NoCSRFRequired
     * @param string $lang Language code
     */
    public function getSteps(string $lang = 'en'): JSONResponse {
        if ($forbidden = $this->requireAdmin()) return $forbidden;
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
    public function saveSteps(array $steps, string $lang = 'en'): JSONResponse {
        if ($forbidden = $this->requireAdmin()) return $forbidden;
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

            // Validate + sanitize steps
            $sanitized = [];
            foreach ($steps as $step) {
                if (!isset($step['id']) || !isset($step['title'])) {
                    return new JSONResponse([
                        'success' => false,
                        'error' => 'Invalid step data: id and title are required'
                    ], 400);
                }
                $sanitized[] = $this->sanitizeStep($step);
            }

            $configKey = 'wizard_steps_' . $lang;
            $stepsJson = json_encode($sanitized);
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
        if ($forbidden = $this->requireAdmin()) return $forbidden;
        try {
            if (!isset($step['title'])) {
                return new JSONResponse([
                    'success' => false,
                    'error' => 'Invalid step data: title is required'
                ], 400);
            }
            $stepsJson = $this->config->getAppValue($this->appName, 'wizard_steps', '[]');
            $steps = json_decode($stepsJson, true);

            // Force-generate ID server-side (client cannot inject)
            $step['id'] = 'custom_' . uniqid();
            $step = $this->sanitizeStep($step);

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
        if ($forbidden = $this->requireAdmin()) return $forbidden;
        try {
            $stepsJson = $this->config->getAppValue($this->appName, 'wizard_steps', '[]');
            $steps = json_decode($stepsJson, true);

            $found = false;
            foreach ($steps as $key => $existingStep) {
                if ($existingStep['id'] === $id) {
                    // Keep the original ID and sanitize
                    $step['id'] = $id;
                    $steps[$key] = $this->sanitizeStep($step);
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
        if ($forbidden = $this->requireAdmin()) return $forbidden;
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
     */
    public function resetToDefault(string $lang = 'en'): JSONResponse {
        if ($forbidden = $this->requireAdmin()) return $forbidden;
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
        if ($forbidden = $this->requireAdmin()) return $forbidden;
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
     */
    public function saveSettings(): JSONResponse {
        if ($forbidden = $this->requireAdmin()) return $forbidden;
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
     * @param string $lang Language code
     */
    public function exportSteps(string $lang = 'en'): JSONResponse {
        if ($forbidden = $this->requireAdmin()) return $forbidden;
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
     * @param string $fileContent The JSON content of the import file
     */
    public function importSteps(string $fileContent): JSONResponse {
        if ($forbidden = $this->requireAdmin()) return $forbidden;
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

            // Sanitize each step before persisting
            $sanitized = [];
            foreach ($steps as $step) {
                $sanitized[] = $this->sanitizeStep($step);
            }

            // Save imported steps (preserving order from import file)
            $configKey = 'wizard_steps_' . $lang;
            $this->config->setAppValue($this->appName, $configKey, json_encode($sanitized));

            return new JSONResponse([
                'success' => true,
                'message' => 'Steps imported successfully',
                'language' => $lang,
                'stepsCount' => count($sanitized)
            ]);
        } catch (\Exception $e) {
            return new JSONResponse([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all available groups for group visibility selection
     * @NoCSRFRequired
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
        } catch (\Exception $e) {
            return new JSONResponse([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get statistics for admin panel
     * @NoCSRFRequired
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
        } catch (\Exception $e) {
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
        } catch (\Exception $e) {
            return new JSONResponse([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
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
                    'error' => 'Failed to send telemetry report'
                ], 500);
            }
        } catch (\Exception $e) {
            return new JSONResponse([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
