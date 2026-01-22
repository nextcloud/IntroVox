<?php
namespace OCA\IntroVox\Controller;

use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\JSONResponse;
use OCP\IConfig;
use OCP\IRequest;
use OCP\IL10N;
use OCP\IGroupManager;
use OCP\IUserSession;
use OCA\IntroVox\Service\TelemetryService;

class ApiController extends Controller {
    protected $config;
    protected $appName;
    protected $l10n;
    protected $groupManager;
    protected $userSession;
    protected $telemetryService;

    public function __construct(
        $appName,
        IRequest $request,
        IConfig $config,
        IL10N $l10n,
        IGroupManager $groupManager,
        IUserSession $userSession,
        TelemetryService $telemetryService
    ) {
        parent::__construct($appName, $request);
        $this->config = $config;
        $this->appName = $appName;
        $this->l10n = $l10n;
        $this->groupManager = $groupManager;
        $this->userSession = $userSession;
        $this->telemetryService = $telemetryService;
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
     * Get wizard steps for frontend based on user's language
     * @NoAdminRequired
     * @NoCSRFRequired
     * @PublicPage
     */
    public function getWizardSteps(): JSONResponse {
        $enabled = $this->config->getAppValue($this->appName, 'wizard_enabled', 'true');

        // Check if wizard is globally disabled
        if ($enabled !== 'true') {
            return new JSONResponse([
                'success' => true,
                'steps' => [],
                'useDefault' => false,
                'enabled' => false,
                'language' => 'en'
            ]);
        }

        // Get user's language from l10n
        $userLang = $this->l10n->getLanguageCode();

        // Get available languages from translation files
        $availableLanguages = $this->getAvailableLanguages();

        // Extract base language (e.g., 'en_US' -> 'en')
        $baseLang = substr($userLang, 0, 2);

        // Use base language if available, otherwise fallback to English
        if (!in_array($baseLang, $availableLanguages)) {
            $baseLang = 'en';
        }

        // Check if the user's language is enabled
        $enabledLanguagesJson = $this->config->getAppValue($this->appName, 'enabled_languages', '');
        if (empty($enabledLanguagesJson)) {
            // Default to only English enabled on first install
            $enabledLanguages = ['en'];
        } else {
            $enabledLanguages = json_decode($enabledLanguagesJson, true);
        }

        // If user's language is not enabled, disable the wizard for them
        if (!in_array($baseLang, $enabledLanguages)) {
            return new JSONResponse([
                'success' => true,
                'steps' => [],
                'useDefault' => false,
                'enabled' => false,
                'language' => $baseLang,
                'languageDisabled' => true
            ]);
        }

        $configKey = 'wizard_steps_' . $baseLang;
        $stepsJson = $this->config->getAppValue($this->appName, $configKey, '');

        // Get wizard version for forcing re-show
        $wizardVersion = $this->config->getAppValue($this->appName, 'wizard_version', '1');

        // If no steps are configured, return empty and let frontend use defaults
        // The admin panel will save steps when they are first loaded/modified
        if (empty($stepsJson)) {
            return new JSONResponse([
                'success' => true,
                'steps' => [],
                'useDefault' => true,
                'enabled' => $enabled === 'true',
                'language' => $baseLang,
                'version' => $wizardVersion
            ]);
        }

        $steps = json_decode($stepsJson, true);

        // Filter steps by group visibility
        $user = $this->userSession->getUser();
        if ($user) {
            $userGroups = $this->groupManager->getUserGroupIds($user);
            $steps = array_filter($steps, function($step) use ($userGroups) {
                // If no groups specified or empty array, visible to all
                if (!isset($step['visibleToGroups']) || empty($step['visibleToGroups'])) {
                    return true;
                }
                // Check if user is in any of the allowed groups
                return !empty(array_intersect($step['visibleToGroups'], $userGroups));
            });
            $steps = array_values($steps); // Re-index array
        }

        // Return the saved steps (which could be reordered defaults or custom steps)
        return new JSONResponse([
            'success' => true,
            'steps' => $steps,
            'useDefault' => false,
            'enabled' => $enabled === 'true',
            'language' => $baseLang,
            'version' => $wizardVersion
        ]);
    }

    /**
     * Track wizard start event
     * @NoAdminRequired
     * @NoCSRFRequired
     */
    public function trackWizardStart(): JSONResponse {
        $user = $this->userSession->getUser();
        if (!$user) {
            return new JSONResponse([
                'success' => false,
                'error' => 'User not logged in'
            ], 401);
        }

        $this->telemetryService->markUserStarted($user->getUID());

        return new JSONResponse([
            'success' => true
        ]);
    }

    /**
     * Track wizard complete event
     * @NoAdminRequired
     * @NoCSRFRequired
     */
    public function trackWizardComplete(): JSONResponse {
        $user = $this->userSession->getUser();
        if (!$user) {
            return new JSONResponse([
                'success' => false,
                'error' => 'User not logged in'
            ], 401);
        }

        $this->telemetryService->markUserCompleted($user->getUID());

        return new JSONResponse([
            'success' => true
        ]);
    }

    /**
     * Track wizard skip event
     * @NoAdminRequired
     * @NoCSRFRequired
     */
    public function trackWizardSkip(): JSONResponse {
        $user = $this->userSession->getUser();
        if (!$user) {
            return new JSONResponse([
                'success' => false,
                'error' => 'User not logged in'
            ], 401);
        }

        $this->telemetryService->markUserSkipped($user->getUID());

        return new JSONResponse([
            'success' => true
        ]);
    }
}
