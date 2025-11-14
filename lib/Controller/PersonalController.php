<?php
namespace OCA\IntroVox\Controller;

use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\JSONResponse;
use OCP\IConfig;
use OCP\IRequest;
use OCP\IUserSession;

class PersonalController extends Controller {
    protected $config;
    protected $appName;
    protected $userSession;

    public function __construct(
        $appName,
        IRequest $request,
        IConfig $config,
        IUserSession $userSession
    ) {
        parent::__construct($appName, $request);
        $this->config = $config;
        $this->appName = $appName;
        $this->userSession = $userSession;
    }

    /**
     * Get personal wizard settings
     * @NoAdminRequired
     * @NoCSRFRequired
     */
    public function getSettings(): JSONResponse {
        $user = $this->userSession->getUser();
        if (!$user) {
            return new JSONResponse(['error' => 'User not logged in'], 401);
        }

        $userId = $user->getUID();

        // Get user preference: if true, user permanently disabled wizard
        $wizardDisabledByUser = $this->config->getUserValue($userId, $this->appName, 'wizard_disabled', 'false') === 'true';

        return new JSONResponse([
            'success' => true,
            'wizardDisabledByUser' => $wizardDisabledByUser
        ]);
    }

    /**
     * Save personal wizard settings
     * @NoAdminRequired
     */
    public function saveSettings(): JSONResponse {
        $user = $this->userSession->getUser();
        if (!$user) {
            return new JSONResponse(['error' => 'User not logged in'], 401);
        }

        $userId = $user->getUID();
        $data = $this->request->getParams();

        try {
            // Save user preference
            if (isset($data['wizardDisabled'])) {
                $wizardDisabled = $data['wizardDisabled'] === true || $data['wizardDisabled'] === 'true';
                $this->config->setUserValue($userId, $this->appName, 'wizard_disabled', $wizardDisabled ? 'true' : 'false');
            }

            return new JSONResponse([
                'success' => true,
                'message' => 'Settings saved successfully'
            ]);
        } catch (\Exception $e) {
            return new JSONResponse([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
