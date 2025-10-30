<?php
namespace OCA\IntroVox\AppInfo;

use OCP\AppFramework\App;
use OCP\AppFramework\Bootstrap\IBootContext;
use OCP\AppFramework\Bootstrap\IBootstrap;
use OCP\AppFramework\Bootstrap\IRegistrationContext;
use OCP\EventDispatcher\IEventDispatcher;
use OCP\AppFramework\Http\Events\BeforeTemplateRenderedEvent;
use OCP\Util;

class Application extends App implements IBootstrap {
    public const APP_ID = 'introvox';

    public function __construct() {
        parent::__construct(self::APP_ID);
    }

    public function register(IRegistrationContext $context): void {
        // Register event listener for template rendering
        $context->registerEventListener(
            BeforeTemplateRenderedEvent::class,
            \OCA\IntroVox\Listener\LoadScripts::class
        );

        // Register admin settings
        $context->registerService('AdminSettings', function() {
            return new \OCA\IntroVox\Settings\AdminSettings();
        });
    }

    public function boot(IBootContext $context): void {
        // Boot logic if needed
    }
}
