<?php

declare(strict_types=1);

namespace OCA\IntroVox\Listener;

use OCA\IntroVox\Service\TourRepository;
use OCP\App\IAppManager;
use OCP\EventDispatcher\Event;
use OCP\EventDispatcher\IEventListener;
use OCP\IConfig;
use OCP\IL10N;
use OCP\INavigationManager;
use OCP\IURLGenerator;
use OCP\IUserSession;
use OCP\Navigation\Events\LoadAdditionalEntriesEvent;

/**
 * "Tours" in the user menu, right above "Help", leading to the tours in the
 * personal settings, where every tour can be started again. Shown while
 * Tours for everyone is on, unless an admin switched it off (user_menu),
 * and only for someone IntroVox is enabled for ("Limit to groups").
 *
 * @template-implements IEventListener<LoadAdditionalEntriesEvent>
 */
class UserMenuEntry implements IEventListener {
    public function __construct(
        private INavigationManager $navigationManager,
        private IURLGenerator $urlGenerator,
        private IL10N $l10n,
        private IConfig $config,
        private TourRepository $tours,
        private IUserSession $userSession,
        private IAppManager $appManager,
    ) {
    }

    public function handle(Event $event): void {
        if (!$event instanceof LoadAdditionalEntriesEvent) {
            return;
        }
        if (!$this->tours->toursEnabled() || $this->config->getAppValue('introvox', 'user_menu', 'true') !== 'true') {
            return;
        }
        $user = $this->userSession->getUser();
        if ($user === null || !$this->appManager->isEnabledForUser('introvox', $user)) {
            return;
        }
        $this->navigationManager->add([
            'type' => INavigationManager::TYPE_SETTINGS,
            'id' => 'introvox_tours',
            'order' => 99997,
            'href' => $this->urlGenerator->linkToRoute('settings.PersonalSettings.index', ['section' => 'introvox-help']),
            'name' => $this->l10n->t('Tours'),
            // Dark, like the menu's own icons; Nextcloud inverts it in a dark theme
            'icon' => $this->urlGenerator->imagePath('introvox', 'app-dark.svg'),
        ]);
    }
}
