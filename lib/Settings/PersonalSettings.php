<?php
namespace OCA\IntroVox\Settings;

use OCA\IntroVox\Service\TourRepository;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\Settings\ISettings;

class PersonalSettings implements ISettings {
    public function __construct(
        private TourRepository $tours,
    ) {
    }

    /**
     * @return TemplateResponse
     */
    public function getForm() {
        return new TemplateResponse('introvox', 'personal', [
            'wizardEnabled' => $this->tours->toursEnabled(),
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
