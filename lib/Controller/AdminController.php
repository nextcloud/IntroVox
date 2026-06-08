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
use OCA\IntroVox\Service\DefaultStepsService;
use OCA\IntroVox\Service\TelemetryService;

class AdminController extends Controller {
    protected $config;
    protected $appName;
    protected $l10n;
    protected $l10nFactory;
    protected $userManager;
    protected $groupManager;
    protected $userSession;
    protected $defaultSteps;
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
        DefaultStepsService $defaultSteps,
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
        $this->defaultSteps = $defaultSteps;
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
     * Trim wizard-step fields. Title/text are intentionally NOT HTML-escaped:
     * admins author wizard copy as HTML (e.g. `<p>`, `<strong>`, `<ul>`) and
     * Shepherd.js renders it as HTML in the tour bubble. Escaping would surface
     * literal `<p>` tags to end users.
     *
     * Trust model: this endpoint requires admin, and admins already control the
     * Nextcloud instance — no XSS surface is introduced that they don't already
     * have through e.g. login-screen theming or other admin-authored HTML.
     */
    private function sanitizeStep(array $step): array {
        if (isset($step['text']) && is_string($step['text'])) {
            $step['text'] = trim($step['text']);
        }
        if (isset($step['title']) && is_string($step['title'])) {
            $step['title'] = trim($step['title']);
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
     * Return every language Nextcloud knows about — used by the "Add language
     * override" picker so admins aren't limited to the small set of languages
     * IntroVox happens to ship a translation file for. Deduplicated by base
     * code (e.g. en_GB merged with en) and sorted by display name.
     * @NoCSRFRequired
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
     * @NoCSRFRequired
     */
    public function listOverrides(): JSONResponse {
        if ($forbidden = $this->requireAdmin()) return $forbidden;

        $keys = $this->config->getAppKeys($this->appName);
        $codes = ['en'];
        foreach ($keys as $key) {
            if (preg_match('/^wizard_steps_([a-z]{2}(?:_[A-Z]{2})?)$/', $key, $m)) {
                if (!in_array($m[1], $codes, true)) {
                    $codes[] = $m[1];
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
     * @NoCSRFRequired
     * @param string $lang Language code
     */
    public function getSteps(string $lang = 'en'): JSONResponse {
        if ($forbidden = $this->requireAdmin()) return $forbidden;
        if (!preg_match('/^[a-z]{2}(_[A-Z]{2})?$/', $lang)) {
            $lang = 'en';
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
    public function saveSteps(array $steps, string $lang = 'en'): JSONResponse {
        if ($forbidden = $this->requireAdmin()) return $forbidden;
        try {
            if (!preg_match('/^[a-z]{2}(_[A-Z]{2})?$/', $lang)) {
                return new JSONResponse([
                    'success' => false,
                    'error' => 'Invalid language code: ' . $lang
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
                'message' => 'Steps saved',
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
            if (!preg_match('/^[a-z]{2}(_[A-Z]{2})?$/', $lang)) {
                return new JSONResponse([
                    'success' => false,
                    'error' => 'Invalid language code: ' . $lang
                ], 400);
            }

            // Delete the override row; next GET serves Transifex-translated defaults
            $this->config->deleteAppValue($this->appName, 'wizard_steps_' . $lang);

            return new JSONResponse([
                'success' => true,
                'message' => 'Override discarded for language: ' . $lang,
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
            $enabled = $this->config->getAppValue($this->appName, 'wizard_enabled', 'true');

            return new JSONResponse([
                'success' => true,
                'enabled' => $enabled === 'true'
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
                'message' => 'Settings saved',
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
            if (!preg_match('/^[a-z]{2}(_[A-Z]{2})?$/', $lang)) {
                return new JSONResponse([
                    'success' => false,
                    'error' => 'Invalid language code: ' . $lang
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

            if (!preg_match('/^[a-z]{2}(_[A-Z]{2})?$/', $lang)) {
                return new JSONResponse([
                    'success' => false,
                    'error' => 'Invalid language code: ' . $lang
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
