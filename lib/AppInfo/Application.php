<?php
namespace OCA\IntroVox\AppInfo;

use OCP\AppFramework\App;
use OCP\AppFramework\Bootstrap\IBootContext;
use OCP\AppFramework\Bootstrap\IBootstrap;
use OCP\AppFramework\Bootstrap\IRegistrationContext;
use OCP\AppFramework\Http\Events\BeforeTemplateRenderedEvent;
use OCP\Navigation\Events\LoadAdditionalEntriesEvent;

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

        // "Tours" in the user menu
        $context->registerEventListener(
            LoadAdditionalEntriesEvent::class,
            \OCA\IntroVox\Listener\UserMenuEntry::class
        );

        // "Getting started" on the Dashboard, while an admin has it on
        $context->registerDashboardWidget(\OCA\IntroVox\Dashboard\ChecklistWidget::class);
    }

    public function boot(IBootContext $context): void {
        // Boot logic if needed
    }
}
