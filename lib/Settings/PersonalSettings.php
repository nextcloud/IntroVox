<?php
namespace OCA\IntroVox\Settings;

use OCP\AppFramework\Http\TemplateResponse;
use OCP\Settings\ISettings;

class PersonalSettings implements ISettings {
    /**
     * @return TemplateResponse
     */
    public function getForm() {
        return new TemplateResponse('introvox', 'personal', [], '');
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
