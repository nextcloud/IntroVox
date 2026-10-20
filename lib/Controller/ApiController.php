<?php
namespace OCA\IntroVox\Controller;

use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\JSONResponse;
use OCP\IConfig;
use OCP\IRequest;
use OCP\IL10N;
use OCP\L10N\IFactory;
use OCP\IGroupManager;
use OCP\IUserSession;
use OCA\IntroVox\Service\BuiltinTours;
use OCA\IntroVox\Service\ChecklistService;
use OCA\IntroVox\Service\DefaultStepsService;
use OCA\IntroVox\Service\StepValidator;
use OCA\IntroVox\Service\TelemetryService;
use OCA\IntroVox\Service\TourRepository;
use OCA\IntroVox\Service\TourStateService;
use OCA\IntroVox\Service\TourStats;
use OCA\IntroVox\Service\TourValidator;
use OCP\AppFramework\Http;
use OCP\AppFramework\Http\Attribute\NoAdminRequired;
use OCP\AppFramework\Http\Attribute\UserRateLimit;

class ApiController extends Controller {
    protected $config;
    protected $appName;
    protected $l10n;
    protected $l10nFactory;
    protected $defaultSteps;
    protected $groupManager;
    protected $userSession;
    protected $telemetryService;
    protected $tours;
    protected $tourState;
    protected $checklist;

    public function __construct(
        $appName,
        IRequest $request,
        IConfig $config,
        IL10N $l10n,
        IFactory $l10nFactory,
        DefaultStepsService $defaultSteps,
        IGroupManager $groupManager,
        IUserSession $userSession,
        TelemetryService $telemetryService,
        TourRepository $tours,
        TourStateService $tourState,
        ChecklistService $checklist
    ) {
        parent::__construct($appName, $request);
        $this->config = $config;
        $this->appName = $appName;
        $this->l10n = $l10n;
        $this->l10nFactory = $l10nFactory;
        $this->defaultSteps = $defaultSteps;
        $this->groupManager = $groupManager;
        $this->userSession = $userSession;
        $this->telemetryService = $telemetryService;
        $this->tours = $tours;
        $this->tourState = $tourState;
        $this->checklist = $checklist;
    }

    /**
     * Get wizard steps for frontend based on user's language
     */
    #[NoAdminRequired]
    public function getWizardSteps(string $tour = TourValidator::WELCOME): JSONResponse {
        if ($tour !== TourValidator::WELCOME) {
            return $this->appTourSteps($tour);
        }
        // Tours for everyone, and the welcome tour itself
        $welcome = $this->tours->get(TourValidator::WELCOME);
        $enabled = $this->tours->toursEnabled() && ($welcome['enabled'] ?? true) === true ? 'true' : 'false';

        // Check if wizard is globally disabled
        if ($enabled !== 'true') {
            return new JSONResponse([
                'success' => true,
                'steps' => [],
                'useDefault' => false,
                'enabled' => false,
                'language' => 'en'
            ]);
        }

        // Resolve the user's actual chosen language. We pass null (not 'introvox') to
        // findLanguage() so NC returns the unvalidated user preference based on its full
        // signal stack (user config → session → Accept-Language → system default).
        // Passing 'introvox' would re-route to a language that ships a translation file,
        // silently sending e.g. an Italian user to the system fallback (Dutch).
        // The defaults service handles the English fallback when no Italian translation exists.
        $userLang = (string)$this->l10nFactory->findLanguage(null);
        $wizardVersion = $this->config->getAppValue($this->appName, 'wizard_version', '1');

        // The user's language, then its base language (de for de_DE)
        $languages = array_values(array_filter(array_unique([$userLang, substr($userLang, 0, 2)]),
            static fn (string $language): bool => preg_match(TourValidator::LANG_PATTERN, $language) === 1));

        // The admin's own steps in the first of those that has them: only
        // what this user may see, no steps switched off as drafts, and
        // group-restricted steps only for their groups
        foreach ($languages as $language) {
            $steps = $this->tours->steps(TourValidator::WELCOME, $language);
            if ($steps !== null) {
                $user = $this->userSession->getUser();
                return new JSONResponse([
                    'success' => true,
                    'steps' => StepValidator::visibleTo($steps, $user ? $this->groupManager->getUserGroupIds($user) : []),
                    'useDefault' => false,
                    'enabled' => true,
                    'language' => $language,
                    'version' => $wizardVersion,
                ]);
            }
        }

        // Else the translated defaults, in the first of those Transifex has
        // (pt_BR, else pt), else in English
        $language = 'en';
        foreach ($languages as $candidate) {
            if ($this->l10nFactory->languageExists($this->appName, $candidate)) {
                $language = $candidate;
                break;
            }
        }
        return new JSONResponse([
            'success' => true,
            'steps' => $this->defaultSteps->getForLanguage($language),
            'useDefault' => true,
            'enabled' => true,
            'language' => $language,
            'version' => $wizardVersion,
        ]);
    }

    /**
     * The steps of an app tour, for someone who may get it. Anyone else, an
     * unknown tour and a tour that is off all get the same 404, so the
     * answer says nothing about which tours exist.
     */
    private function appTourSteps(string $id): JSONResponse {
        $user = $this->userSession->getUser();
        $tour = $id === TourValidator::WELCOME ? null : $this->tours->forUser($id, $user);
        if ($tour === null) {
            return new JSONResponse(['success' => false], Http::STATUS_NOT_FOUND);
        }

        $userLang = (string)$this->l10nFactory->findLanguage(null);
        $own = fn (string $language): ?array => preg_match(TourValidator::LANG_PATTERN, $language) === 1 ? $this->tours->steps($id, $language) : null;
        // The admin's steps in the user's language, then in its base language
        $steps = $own($userLang) ?? $own(substr($userLang, 0, 2));
        // A built-in tour's translation goes before the admin's steps in
        // another language, where Transifex has one: what differs from the
        // English defaults
        if ($steps === null && BuiltinTours::isBuiltin($id)) {
            $translated = $this->tours->defaultSteps($id, $userLang);
            if ($translated !== $this->tours->defaultSteps($id, 'en')) {
                $steps = $translated;
            }
        }
        // Then the tour's main language, then the built-in English steps
        $steps ??= $own($tour['mainLanguage']) ?? $this->tours->defaultSteps($id, $userLang);

        $visible = StepValidator::visibleTo($steps ?? [], $this->groupManager->getUserGroupIds($user));

        return new JSONResponse([
            'success' => true,
            'tour' => $id,
            'version' => (int)$tour['version'],
            'steps' => $visible,
        ]);
    }

    /**
     * An app tour started, finished or was skipped for this user. The same
     * check as its steps first, so nobody can write state for a tour they do
     * not get; the welcome tour has its own routes. Start answers whether it
     * is the first start at this version: another tab may have been first.
     */
    #[NoAdminRequired]
    #[UserRateLimit(limit: 30, period: 3600)]
    public function tourEvent(string $id, string $event): JSONResponse {
        $user = $this->userSession->getUser();
        $tour = $id === TourValidator::WELCOME ? null : $this->tours->forUser($id, $user);
        if ($tour === null) {
            return new JSONResponse(['success' => false], Http::STATUS_NOT_FOUND);
        }
        if ($event === 'start') {
            return new JSONResponse(['success' => true, 'first' => $this->tourState->markStarted($user->getUID(), $tour)]);
        }
        if ($event === 'complete' || $event === 'skip') {
            $this->tourState->mark($user->getUID(), $id, $event === 'complete' ? 'completed' : 'skipped');
            return new JSONResponse(['success' => true]);
        }
        return new JSONResponse(['success' => false], Http::STATUS_BAD_REQUEST);
    }

    /**
     * A step of an automatic run was shown, for "how far do people get" in
     * the statistics. The welcome tour too. Only for someone who gets the
     * tour, with the same 404 as its steps otherwise; each user writes only
     * their own value, so the limit can be generous enough for long tours.
     */
    #[NoAdminRequired]
    #[UserRateLimit(limit: 300, period: 3600)]
    public function tourReached(string $id, string $step, int $index): JSONResponse {
        $user = $this->userSession->getUser();
        $tour = $this->tours->forUser($id, $user);
        if ($tour === null) {
            return new JSONResponse(['success' => false], Http::STATUS_NOT_FOUND);
        }
        if (!preg_match(TourStats::STEP_ID, $step) || $index < 1 || $index > StepValidator::MAX_STEPS) {
            return new JSONResponse(['success' => false], Http::STATUS_BAD_REQUEST);
        }
        $this->tourState->markReached($user->getUID(), $tour, $step, $index);
        return new JSONResponse(['success' => true]);
    }

    /**
     * An admin's own task of the checklist on the Dashboard, opened from
     * there: the page it opened reports it (src/main.js). The same 404 for a
     * task that is not there and for a list that is off.
     */
    #[NoAdminRequired]
    #[UserRateLimit(limit: 60, period: 3600)]
    public function checklistOpened(string $id): JSONResponse {
        $user = $this->userSession->getUser();
        if ($user === null || !$this->checklist->opened($user, $id)) {
            return new JSONResponse(['success' => false], Http::STATUS_NOT_FOUND);
        }
        return new JSONResponse(['success' => true]);
    }

    /**
     * Track wizard start event
     */
    #[NoAdminRequired]
    #[UserRateLimit(limit: 10, period: 3600)]
    public function trackWizardStart(): JSONResponse {
        $user = $this->userSession->getUser();
        if (!$user) {
            return new JSONResponse([
                'success' => false,
                'error' => 'User not logged in'
            ], 401);
        }

        $this->telemetryService->markUserStarted($user->getUID());

        return new JSONResponse([
            'success' => true
        ]);
    }

    /**
     * Track wizard complete event
     */
    #[NoAdminRequired]
    #[UserRateLimit(limit: 10, period: 3600)]
    public function trackWizardComplete(): JSONResponse {
        $user = $this->userSession->getUser();
        if (!$user) {
            return new JSONResponse([
                'success' => false,
                'error' => 'User not logged in'
            ], 401);
        }

        $this->telemetryService->markUserCompleted($user->getUID());

        return new JSONResponse([
            'success' => true
        ]);
    }

    /**
     * Track wizard skip event
     */
    #[NoAdminRequired]
    #[UserRateLimit(limit: 10, period: 3600)]
    public function trackWizardSkip(): JSONResponse {
        $user = $this->userSession->getUser();
        if (!$user) {
            return new JSONResponse([
                'success' => false,
                'error' => 'User not logged in'
            ], 401);
        }

        $this->telemetryService->markUserSkipped($user->getUID());

        return new JSONResponse([
            'success' => true
        ]);
    }
}
