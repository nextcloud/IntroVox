<?php
namespace OCA\IntroVox\Settings;

use OCP\AppFramework\Http\TemplateResponse;
use OCP\Settings\ISettings;

class AdminSettings implements ISettings {
    /**
     * @return TemplateResponse
     */
    public function getForm() {
        return new TemplateResponse('introvox', 'admin', [], '');
    }

    /**
     * @return string
     */
    public function getSection() {
        return 'introvox';
    }

    /**
     * @return int
     */
    public function getPriority() {
        return 50;
    }
}
