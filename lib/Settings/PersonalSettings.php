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

        return new TemplateResponse('introvox', 'personal', [
            'wizardEnabled' => $wizardGloballyEnabled,
            'wizardGloballyEnabled' => $wizardGloballyEnabled,
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
