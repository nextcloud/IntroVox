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

        // If no steps are configured, return empty and let frontend use defaults
        // The admin panel will save steps when they are first loaded/modified
        if (empty($stepsJson)) {
            return new JSONResponse([
                'success' => true,
                'steps' => [],
                'useDefault' => true,
                'enabled' => $enabled === 'true'
            ]);
        }

        $steps = json_decode($stepsJson, true);

        // Return the saved steps (which could be reordered defaults or custom steps)
        return new JSONResponse([
            'success' => true,
            'steps' => $steps,
            'useDefault' => false,
            'enabled' => $enabled === 'true'
        ]);
    }
}
