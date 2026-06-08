<?php
namespace OCA\IntroVox\Controller;

use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\JSONResponse;
use OCP\IConfig;
use OCP\IRequest;
use OCP\IL10N;
use OCP\L10N\IFactory;
use OCP\IGroupManager;
use OCP\IUserSession;
use OCA\IntroVox\Service\DefaultStepsService;
use OCA\IntroVox\Service\TelemetryService;

class ApiController extends Controller {
    protected $config;
    protected $appName;
    protected $l10n;
    protected $l10nFactory;
    protected $defaultSteps;
    protected $groupManager;
    protected $userSession;
    protected $telemetryService;

    public function __construct(
        $appName,
        IRequest $request,
        IConfig $config,
        IL10N $l10n,
        IFactory $l10nFactory,
        DefaultStepsService $defaultSteps,
        IGroupManager $groupManager,
        IUserSession $userSession,
        TelemetryService $telemetryService
    ) {
        parent::__construct($appName, $request);
        $this->config = $config;
        $this->appName = $appName;
        $this->l10n = $l10n;
        $this->l10nFactory = $l10nFactory;
        $this->defaultSteps = $defaultSteps;
        $this->groupManager = $groupManager;
        $this->userSession = $userSession;
        $this->telemetryService = $telemetryService;
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

        // Resolve the user's actual chosen language. We pass null (not 'introvox') to
        // findLanguage() so NC returns the unvalidated user preference based on its full
        // signal stack (user config → session → Accept-Language → system default).
        // Passing 'introvox' would re-route to a language that ships a translation file,
        // silently sending e.g. an Italian user to the system fallback (Dutch).
        // The defaults service handles the English fallback when no Italian translation exists.
        $userLang = $this->l10nFactory->findLanguage(null);

        // Extract base language (e.g., 'en_US' -> 'en')
        $baseLang = substr($userLang, 0, 2);
        if (!preg_match('/^[a-z]{2}$/', $baseLang)) {
            $baseLang = 'en';
        }

        $configKey = 'wizard_steps_' . $baseLang;
        $stepsJson = $this->config->getAppValue($this->appName, $configKey, '');

        // Get wizard version for forcing re-show
        $wizardVersion = $this->config->getAppValue($this->appName, 'wizard_version', '1');

        // No admin override for this language → serve Transifex-translated defaults
        if (empty($stepsJson)) {
            return new JSONResponse([
                'success' => true,
                'steps' => $this->defaultSteps->getForLanguage($baseLang),
                'useDefault' => true,
                'enabled' => true,
                'language' => $baseLang,
                'version' => $wizardVersion,
            ]);
        }

        $steps = json_decode($stepsJson, true);

        // Corrupt/legacy non-array override → fall back to defaults
        if (!is_array($steps)) {
            return new JSONResponse([
                'success' => true,
                'steps' => $this->defaultSteps->getForLanguage($baseLang),
                'useDefault' => true,
                'enabled' => true,
                'language' => $baseLang,
                'version' => $wizardVersion,
            ]);
        }

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
