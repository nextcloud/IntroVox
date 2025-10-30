<?php
namespace OCA\IntroVox\Controller;

use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\JSONResponse;
use OCP\IConfig;
use OCP\IRequest;

class ApiController extends Controller {
    protected $config;
    protected $appName;

    public function __construct(
        $appName,
        IRequest $request,
        IConfig $config
    ) {
        parent::__construct($appName, $request);
        $this->config = $config;
        $this->appName = $appName;
    }

    /**
     * Get wizard steps for frontend
     * @NoAdminRequired
     * @NoCSRFRequired
     * @PublicPage
     */
    public function getWizardSteps(): JSONResponse {
        $stepsJson = $this->config->getAppValue($this->appName, 'wizard_steps', '');
        $enabled = $this->config->getAppValue($this->appName, 'wizard_enabled', 'true');

        if (empty($stepsJson)) {
            // Return empty, frontend will use default steps
            return new JSONResponse([
                'success' => true,
                'steps' => [],
                'useDefault' => true,
                'enabled' => $enabled === 'true'
            ]);
        }

        $steps = json_decode($stepsJson, true);

        return new JSONResponse([
            'success' => true,
            'steps' => $steps,
            'useDefault' => false,
            'enabled' => $enabled === 'true'
        ]);
    }
}
