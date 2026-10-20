<?php
namespace OCA\IntroVox\Listener;

use OCA\IntroVox\Service\TourRepository;
use OCA\IntroVox\Service\TourStateService;
use OCA\IntroVox\Service\TourValidator;
use OCP\App\IAppManager;
use OCP\AppFramework\Http\Events\BeforeTemplateRenderedEvent;
use OCP\AppFramework\Services\IInitialState;
use OCP\EventDispatcher\Event;
use OCP\EventDispatcher\IEventListener;
use OCP\IConfig;
use OCP\IRequest;
use OCP\IUser;
use OCP\IUserSession;
use OCP\Util;
use Psr\Log\LoggerInterface;

class LoadScripts implements IEventListener {
    private IAppManager $appManager;
    private IUserSession $userSession;
    private IInitialState $initialState;
    private IConfig $config;
    private LoggerInterface $logger;

    public function __construct(
        IAppManager $appManager,
        IUserSession $userSession,
        IInitialState $initialState,
        IConfig $config,
        LoggerInterface $logger,
        private TourRepository $tours,
        private TourStateService $tourState,
        private IRequest $request,
    ) {
        $this->appManager = $appManager;
        $this->userSession = $userSession;
        $this->initialState = $initialState;
        $this->config = $config;
        $this->logger = $logger;
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

        // A small bootstrap; the tour code and its styles come in a chunk of
        // their own, only on a page where a tour runs (src/main.js)
        Util::addScript('introvox', 'main');

        // What the bootstrap needs to decide that without a request. Lazy:
        // only worked out when the page is rendered. It must never break a
        // page, so any error leaves it out and the bootstrap asks the server
        // as it did before.
        $this->initialState->provideLazyInitialState('runtime', function () use ($user) {
            try {
                return $this->runtimeState($user);
            } catch (\Throwable $e) {
                $this->logger->warning('IntroVox: runtime state left out: ' . $e->getMessage(), ['app' => 'introvox']);
                return null;
            }
        });
    }

    /**
     * Read by src/runtime/chooseTour.mjs. Only what deciding needs: of the
     * app tours, just those that would start by themselves for this user
     * (TourStateService::due), with where and at which version; no steps,
     * names or groups.
     */
    private function runtimeState(IUser $user): array {
        $welcome = $this->tours->get(TourValidator::WELCOME);
        $due = [];
        foreach ($this->tours->all() as $tour) {
            if ($this->tourState->due($user, $tour)) {
                $entry = [
                    'id' => $tour['id'],
                    'page' => TourValidator::triggerPage($tour['trigger']),
                    'version' => (int)$tour['version'],
                ];
                // Starts on whichever page comes next
                if ($tour['trigger']['type'] === 'any') {
                    $entry['anywhere'] = true;
                }
                $due[] = $entry;
            }
        }
        return [
            'enabled' => $this->tours->toursEnabled(),
            'toursDisabled' => $this->tourState->toursDisabled($user->getUID()),
            'welcome' => [
                'enabled' => ($welcome['enabled'] ?? true) === true,
                'version' => $this->config->getAppValue('introvox', 'wizard_version', '1'),
                'disabledByUser' => $this->config->getUserValue($user->getUID(), 'introvox', 'wizard_disabled', 'false') === 'true',
            ],
            'tours' => $due,
            'link' => $this->link(),
        ];
    }

    /**
     * A share link's tour (?introvox-tour=<id>), as the page was asked for.
     * The bootstrap reads it from the address too, but an app that sends its
     * start page on to another route at once (Deck goes to Upcoming cards)
     * has dropped it from there by then.
     */
    private function link(): ?string {
        $id = $this->request->getParam('introvox-tour');
        return is_string($id) && preg_match(TourValidator::ID_PATTERN, $id) ? $id : null;
    }
}
