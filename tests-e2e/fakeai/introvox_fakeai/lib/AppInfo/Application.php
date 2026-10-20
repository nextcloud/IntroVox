<?php
declare(strict_types=1);
namespace OCA\IntroVoxFakeAi\AppInfo;

use OCA\IntroVoxFakeAi\FakeProvider;
use OCP\AppFramework\App;
use OCP\AppFramework\Bootstrap\IBootContext;
use OCP\AppFramework\Bootstrap\IBootstrap;
use OCP\AppFramework\Bootstrap\IRegistrationContext;

class Application extends App implements IBootstrap {
    public function __construct() {
        parent::__construct('introvox_fakeai');
    }
    public function register(IRegistrationContext $context): void {
        $context->registerTaskProcessingProvider(FakeProvider::class);
    }
    public function boot(IBootContext $context): void {
    }
}
