<?php
namespace OCA\IntroVox\Settings;

use OCA\IntroVox\Service\TelemetryService;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\IConfig;
use OCP\IUserSession;
use OCP\Settings\ISettings;
use OCP\Util;

class AdminSettings implements ISettings {
    public function __construct(
        private IConfig $config,
        private IUserSession $userSession,
        private TelemetryService $telemetryService,
    ) {
    }

    /**
     * @return TemplateResponse
     */
    public function getForm() {
        // For the admin intro (src/admin/adminIntro.js): shown once to every
        // admin, and the telemetry question once per instance.
        $user = $this->userSession->getUser();
        $introDone = $user !== null
            && $this->config->getUserValue($user->getUID(), 'introvox', 'admin_intro_done', '') !== '';

        return new TemplateResponse('introvox', 'admin', [
            'introDone' => $introDone,
            'telemetryAsked' => $this->telemetryService->isAsked(),
            // PHP's own upload limit, often below IntroVox's media limits
            // (src/admin/StepMediaBlock.vue)
            'uploadLimit' => Util::uploadLimit(),
        ], '');
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
