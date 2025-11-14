<?php
namespace OCA\IntroVox\Listener;

use OCP\AppFramework\Http\Events\BeforeTemplateRenderedEvent;
use OCP\EventDispatcher\Event;
use OCP\EventDispatcher\IEventListener;
use OCP\Util;

class LoadScripts implements IEventListener {
    public function handle(Event $event): void {
        if (!$event instanceof BeforeTemplateRenderedEvent) {
            return;
        }

        // Only load on user pages (not public/guest pages)
        if ($event->isLoggedIn()) {
            Util::addScript('introvox', 'main');
            Util::addStyle('introvox', 'wizard');
        }
    }
}
