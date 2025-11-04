<?php
namespace OCA\IntroVox\Settings;

use OCP\AppFramework\Http\TemplateResponse;
use OCP\IConfig;
use OCP\IL10N;
use OCP\Settings\ISettings;

class PersonalSettings implements ISettings {
    private $config;
    private $l10n;

    public function __construct(IConfig $config, IL10N $l10n) {
        $this->config = $config;
        $this->l10n = $l10n;
    }

    /**
     * @return TemplateResponse
     */
    public function getForm() {
        $wizardGloballyEnabled = $this->config->getAppValue('introvox', 'wizard_enabled', 'true') === 'true';

        // Get user's language
        $userLang = $this->l10n->getLanguageCode();
        $baseLang = substr($userLang, 0, 2);

        // Check if user's language is enabled
        $enabledLanguagesJson = $this->config->getAppValue('introvox', 'enabled_languages', '');
        if (empty($enabledLanguagesJson)) {
            // Default to only English enabled on first install
            $enabledLanguages = ['en'];
        } else {
            $enabledLanguages = json_decode($enabledLanguagesJson, true);
        }

        $userLanguageEnabled = in_array($baseLang, $enabledLanguages);

        // Wizard is only enabled if both globally enabled AND user's language is enabled
        $wizardEnabled = $wizardGloballyEnabled && $userLanguageEnabled;

        return new TemplateResponse('introvox', 'personal', [
            'wizardEnabled' => $wizardEnabled,
            'wizardGloballyEnabled' => $wizardGloballyEnabled,
            'userLanguageEnabled' => $userLanguageEnabled
        ], '');
    }

    /**
     * @return string the section ID (e.g. 'sharing')
     */
    public function getSection() {
        return 'introvox-help';
    }

    /**
     * @return int priority (lower is higher in the list)
     */
    public function getPriority() {
        return 50;
    }
}
