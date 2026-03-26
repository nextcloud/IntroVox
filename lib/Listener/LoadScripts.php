<?php
namespace OCA\IntroVox\Listener;

use OCP\App\IAppManager;
use OCP\AppFramework\Http\Events\BeforeTemplateRenderedEvent;
use OCP\EventDispatcher\Event;
use OCP\EventDispatcher\IEventListener;
use OCP\IUserSession;
use OCP\Util;

class LoadScripts implements IEventListener {
    private IAppManager $appManager;
    private IUserSession $userSession;

    public function __construct(IAppManager $appManager, IUserSession $userSession) {
        $this->appManager = $appManager;
        $this->userSession = $userSession;
    }

    public function handle(Event $event): void {
        if (!$event instanceof BeforeTemplateRenderedEvent) {
            return;
        }

        if (!$event->isLoggedIn()) {
            return;
        }

        // Only load scripts if the app is enabled for the current user
        // This respects the "Limit to groups" setting in Nextcloud admin
        $user = $this->userSession->getUser();
        if ($user === null || !$this->appManager->isEnabledForUser('introvox', $user)) {
            return;
        }

        Util::addScript('introvox', 'main');
        Util::addStyle('introvox', 'wizard');
    }
}
