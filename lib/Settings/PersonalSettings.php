<?php
namespace OCA\IntroVox\Settings;

use OCP\AppFramework\Http\TemplateResponse;
use OCP\IConfig;
use OCP\Settings\ISettings;

class PersonalSettings implements ISettings {
    private $config;

    public function __construct(IConfig $config) {
        $this->config = $config;
    }

    /**
     * @return TemplateResponse
     */
    public function getForm() {
        $wizardEnabled = $this->config->getAppValue('introvox', 'wizard_enabled', 'true') === 'true';

        return new TemplateResponse('introvox', 'personal', [
            'wizardEnabled' => $wizardEnabled
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
