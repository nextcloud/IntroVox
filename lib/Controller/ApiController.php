<?php
namespace OCA\IntroVox\Controller;

use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\JSONResponse;
use OCP\IConfig;
use OCP\IRequest;
use OCP\IL10N;

class ApiController extends Controller {
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

        // Map language codes to supported languages
        $supportedLanguages = ['en', 'nl', 'de', 'fr', 'da', 'sv'];

        // Extract base language (e.g., 'en_US' -> 'en')
        $baseLang = substr($userLang, 0, 2);

        // Use base language if supported, otherwise fallback to English
        if (!in_array($baseLang, $supportedLanguages)) {
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

        // If no steps are configured, return empty and let frontend use defaults
        // The admin panel will save steps when they are first loaded/modified
        if (empty($stepsJson)) {
            return new JSONResponse([
                'success' => true,
                'steps' => [],
                'useDefault' => true,
                'enabled' => $enabled === 'true',
                'language' => $baseLang
            ]);
        }

        $steps = json_decode($stepsJson, true);

        // Return the saved steps (which could be reordered defaults or custom steps)
        return new JSONResponse([
            'success' => true,
            'steps' => $steps,
            'useDefault' => false,
            'enabled' => $enabled === 'true',
            'language' => $baseLang
        ]);
    }
}
