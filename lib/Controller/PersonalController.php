<?php
namespace OCA\IntroVox\Controller;

use OCA\IntroVox\Service\TourRepository;
use OCA\IntroVox\Service\TourStateService;
use OCA\IntroVox\Service\TourValidator;
use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\JSONResponse;
use OCP\IConfig;
use OCP\INavigationManager;
use OCP\IRequest;
use OCP\IUserSession;
use OCP\AppFramework\Http\Attribute\NoAdminRequired;

class PersonalController extends Controller {
    protected $config;
    protected $appName;
    protected $userSession;

    public function __construct(
        $appName,
        IRequest $request,
        IConfig $config,
        IUserSession $userSession,
        private TourRepository $tours,
        private TourStateService $tourState,
        private INavigationManager $navigationManager,
    ) {
        parent::__construct($appName, $request);
        $this->config = $config;
        $this->appName = $appName;
        $this->userSession = $userSession;
    }

    /**
     * Get personal wizard settings: the welcome tour, the switch for tours
     * that start by themselves, and the app tours this user may get, to start
     * by hand. The personal page reads it, and so does <introvox-tour-list>
     * in other apps (lib/Embed/TourListEmbed.php): toursEnabled and tours are
     * what that element shows.
     */
    #[NoAdminRequired]
    public function getSettings(): JSONResponse {
        $user = $this->userSession->getUser();
        if (!$user) {
            return new JSONResponse(['error' => 'User not logged in'], 401);
        }

        $userId = $user->getUID();

        // Get user preference: if true, user permanently disabled wizard
        $wizardDisabledByUser = $this->config->getUserValue($userId, $this->appName, 'wizard_disabled', 'false') === 'true';

        // Names and icons from this user's own apps menu, never stored data
        $apps = [];
        foreach ($this->navigationManager->getAll(INavigationManager::TYPE_APPS) as $entry) {
            $id = $entry['app'] ?? $entry['id'] ?? null;
            if (is_string($id)) {
                $apps[$id] = ['name' => (string)($entry['name'] ?? $id), 'icon' => (string)($entry['icon'] ?? '')];
            }
        }
        $tours = [];
        foreach ($this->tours->all() as $tour) {
            if ($tour['id'] === TourValidator::WELCOME || !$this->tours->availableTo($tour, $user)) {
                continue;
            }
            $trigger = $tour['trigger'];
            $tours[] = [
                'id' => $tour['id'],
                'name' => $tour['name'],
                // '' for a tour that starts anywhere
                'page' => TourValidator::triggerPage($trigger),
                'app' => $trigger['type'] === 'app' ? ($apps[$trigger['app']] ?? null) : null,
                'seen' => $this->tourState->seen($userId, $tour['id']) > 0,
            ];
        }

        return new JSONResponse([
            'success' => true,
            // Tours for everyone, as the admin set it: without, nothing starts
            'toursEnabled' => $this->tours->toursEnabled(),
            'wizardDisabledByUser' => $wizardDisabledByUser,
            'toursDisabled' => $this->tourState->toursDisabled($userId),
            'tours' => $tours,
        ]);
    }

    /**
     * Save personal wizard settings
     */
    #[NoAdminRequired]
    public function saveSettings(): JSONResponse {
        $user = $this->userSession->getUser();
        if (!$user) {
            return new JSONResponse(['error' => 'User not logged in'], 401);
        }

        $userId = $user->getUID();
        $data = $this->request->getParams();

        try {
            // Save user preference
            if (isset($data['wizardDisabled'])) {
                $wizardDisabled = $data['wizardDisabled'] === true || $data['wizardDisabled'] === 'true';
                $this->config->setUserValue($userId, $this->appName, 'wizard_disabled', $wizardDisabled ? 'true' : 'false');
            }
            // "Start tours by themselves", the other way round
            if (isset($data['toursDisabled'])) {
                $this->tourState->setToursDisabled($userId, $data['toursDisabled'] === true || $data['toursDisabled'] === 'true');
            }

            return new JSONResponse([
                'success' => true,
                'message' => 'Settings saved'
            ]);
        } catch (\Exception $e) {
            return new JSONResponse([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
