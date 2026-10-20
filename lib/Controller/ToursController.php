<?php

declare(strict_types=1);

namespace OCA\IntroVox\Controller;

use OCA\IntroVox\Media\MediaException;
use OCA\IntroVox\Service\BuiltinTours;
use OCA\IntroVox\Service\MediaService;
use OCA\IntroVox\Service\StepValidator;
use OCA\IntroVox\Service\TourPackageException;
use OCA\IntroVox\Service\TourRepository;
use OCA\IntroVox\Service\TourStatistics;
use OCA\IntroVox\Service\TourTransfer;
use OCA\IntroVox\Service\TourValidator;
use OCP\AppFramework\Controller;
use OCP\AppFramework\Http;
use OCP\AppFramework\Http\JSONResponse;
use OCP\AppFramework\Http\Response;
use OCP\AppFramework\Http\StreamResponse;
use OCP\IGroupManager;
use OCP\IL10N;
use OCP\INavigationManager;
use OCP\IRequest;
use OCP\IUserSession;

/**
 * Managing the tours: the welcome tour, and tours that start in an app or on
 * a page. Admin only, with the CSRF check like every other route. Their
 * steps go through the step endpoints in AdminController, with a tour id.
 */
class ToursController extends Controller {
    use AdminOnly;

    public function __construct(
        string $appName,
        IRequest $request,
        private TourRepository $tours,
        private TourValidator $validator,
        private TourStatistics $tourStatistics,
        private TourTransfer $transfer,
        private MediaService $mediaService,
        private IUserSession $userSession,
        private IGroupManager $groupManager,
        private INavigationManager $navigationManager,
        private IL10N $l10n,
    ) {
        parent::__construct($appName, $request);
    }

    public function index(): JSONResponse {
        if ($forbidden = $this->requireAdmin()) {
            return $forbidden;
        }
        return new JSONResponse([
            'success' => true,
            'toursEnabled' => $this->tours->toursEnabled(),
            'tours' => array_map(fn (array $tour): array => $this->describe($tour), $this->tours->all()),
        ]);
    }

    public function create(array $tour = []): JSONResponse {
        if ($forbidden = $this->requireAdmin()) {
            return $forbidden;
        }
        [$fields, $error] = $this->validator->validate(['enabled' => false] + $tour);
        if ($error !== null) {
            return $this->invalid($error);
        }
        try {
            $created = $this->tours->create($fields);
        } catch (\RuntimeException $e) {
            return $this->invalid('at most ' . TourValidator::MAX_TOURS . ' tours');
        }
        return new JSONResponse(['success' => true, 'tour' => $this->describe($created)]);
    }

    public function update(string $id, array $tour = []): JSONResponse {
        if ($forbidden = $this->requireAdmin()) {
            return $forbidden;
        }
        $existing = $this->tours->get($id);
        if ($existing === null) {
            return new JSONResponse(['success' => false, 'error' => 'not_found'], Http::STATUS_NOT_FOUND);
        }
        if ($id === TourValidator::WELCOME) {
            if (!is_bool($tour['enabled'] ?? null)) {
                return $this->invalid('enabled must be true or false');
            }
            $fields = ['enabled' => $tour['enabled']];
        } else {
            // A built-in tour keeps its name, app and language, whatever is sent
            if (BuiltinTours::isBuiltin($id)) {
                $tour = array_intersect_key($tour, array_flip(BuiltinTours::EDITABLE));
            }
            [$fields, $error] = $this->validator->validate($tour + array_intersect_key($existing, array_flip(TourValidator::FIELDS)));
            if ($error !== null) {
                return $this->invalid($error);
            }
            // A tour goes on with something to show in its main language
            if ($fields['enabled'] && !$this->hasEnabledStep($id, $fields['mainLanguage'])) {
                return new JSONResponse(['success' => false, 'error' => 'needs_steps'], Http::STATUS_BAD_REQUEST);
            }
        }
        $updated = $this->tours->update($id, $fields);
        // Its media is for users only while it is on, and for its groups
        $this->mediaService->refreshAccess();
        return new JSONResponse(['success' => true, 'tour' => $this->describe($updated)]);
    }

    public function destroy(string $id): JSONResponse {
        if ($forbidden = $this->requireAdmin()) {
            return $forbidden;
        }
        if (!$this->tours->delete($id)) {
            return new JSONResponse(['success' => false, 'error' => 'not_found'], Http::STATUS_NOT_FOUND);
        }
        $this->mediaService->refreshAccess();
        return new JSONResponse(['success' => true]);
    }

    /**
     * Show again to everyone who saw it
     */
    public function reshow(string $id): JSONResponse {
        if ($forbidden = $this->requireAdmin()) {
            return $forbidden;
        }
        $tour = $this->tours->showAgain($id);
        if ($tour === null) {
            return new JSONResponse(['success' => false, 'error' => 'not_found'], Http::STATUS_NOT_FOUND);
        }
        return new JSONResponse(['success' => true, 'tour' => $this->describe($tour)]);
    }

    /**
     * Started, finished, skipped, and how far people got, step by step, in
     * the steps of one language
     */
    public function statistics(string $id, string $lang = ''): JSONResponse {
        if ($forbidden = $this->requireAdmin()) {
            return $forbidden;
        }
        $tour = $this->tours->get($id);
        if ($tour === null) {
            return new JSONResponse(['success' => false, 'error' => 'not_found'], Http::STATUS_NOT_FOUND);
        }
        return new JSONResponse(['success' => true, 'statistics' => $this->tourStatistics->forTour($tour, $lang)]);
    }

    /**
     * The whole tour as one .zip: settings, steps in every language, media
     */
    public function export(string $id): Response {
        if ($forbidden = $this->requireAdmin()) {
            return $forbidden;
        }
        $tour = $this->tours->get($id);
        if ($tour === null) {
            return new JSONResponse(['success' => false, 'error' => 'not_found'], Http::STATUS_NOT_FOUND);
        }
        try {
            $path = $this->transfer->export($tour);
        } catch (TourPackageException $e) {
            return $this->packageRefused($e);
        }
        $response = new StreamResponse($path);
        $response->addHeader('Content-Type', 'application/zip');
        $response->addHeader('Content-Disposition', 'attachment; filename="introvox-tour-' . $id . '.zip"');
        return $response;
    }

    /**
     * A tour from a .zip of TourTransfer::export(): uploaded as "file", or
     * from the admin's own Files by path. It becomes a new tour, switched off.
     * A package of the welcome tour first answers 409 with its languages; sent
     * again with replaceWelcome, it replaces those.
     */
    public function import(string $path = '', string $replaceWelcome = ''): JSONResponse {
        if ($forbidden = $this->requireAdmin()) {
            return $forbidden;
        }
        $user = $this->userSession->getUser();
        try {
            if ($path !== '') {
                $package = $this->transfer->fromFiles($user, $path);
            } else {
                $upload = $this->request->getUploadedFile('file');
                if (!is_array($upload) || ($upload['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK
                    || !is_string($upload['tmp_name'] ?? null) || !is_uploaded_file($upload['tmp_name'])) {
                    // UPLOAD_ERR_INI_SIZE and _FORM_SIZE: PHP's own limit, below ours
                    $tooLarge = in_array($upload['error'] ?? null, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true);
                    throw new TourPackageException($tooLarge ? 'too_large_for_server' : 'no_file');
                }
                $package = $upload['tmp_name'];
            }
            $result = $this->transfer->import($package, $user, in_array($replaceWelcome, ['1', 'true'], true));
        } catch (TourPackageException $e) {
            return $this->packageRefused($e);
        } catch (MediaException $e) {
            return $this->packageRefused(new TourPackageException($e->getReason()));
        }
        if ($result['confirm']) {
            return new JSONResponse(['success' => false, 'error' => 'confirm_welcome', 'languages' => $result['languages']], Http::STATUS_CONFLICT);
        }
        if ($result['tour'] !== null) {
            $result['tour'] = $this->describe($result['tour']);
        }
        return new JSONResponse(['success' => true] + $result);
    }

    /**
     * The apps in Nextcloud's apps menu, for "Where does it start?"
     */
    public function apps(): JSONResponse {
        if ($forbidden = $this->requireAdmin()) {
            return $forbidden;
        }
        $apps = [];
        foreach ($this->navigationManager->getAll(INavigationManager::TYPE_APPS) as $entry) {
            $id = $entry['app'] ?? $entry['id'] ?? '';
            if (is_string($id) && preg_match(TourValidator::APP_PATTERN, $id)) {
                $apps[$id] = ['id' => $id, 'name' => (string)($entry['name'] ?? $id), 'icon' => (string)($entry['icon'] ?? '')];
            }
        }
        return new JSONResponse(['success' => true, 'apps' => array_values($apps)]);
    }

    /**
     * A tour as the Tours list shows it: with its languages and the app's
     * name and icon, read from the apps menu, never from stored data
     */
    private function describe(array $tour): array {
        $languages = $this->tours->languages($tour['id']);
        $app = null;
        if (($tour['trigger']['type'] ?? '') === 'app') {
            foreach ($this->navigationManager->getAll(INavigationManager::TYPE_APPS) as $entry) {
                if (($entry['app'] ?? $entry['id'] ?? '') === $tour['trigger']['app']) {
                    $app = ['name' => (string)($entry['name'] ?? ''), 'icon' => (string)($entry['icon'] ?? '')];
                    break;
                }
            }
        }
        $steps = 0;
        if ($tour['id'] !== TourValidator::WELCOME) {
            $steps = count($this->tours->stepsOrDefaults($tour['id'], $tour['mainLanguage']) ?? []);
        }
        return $tour + ['languages' => $languages, 'app' => $app, 'stepCount' => $steps];
    }

    private function hasEnabledStep(string $id, string $language): bool {
        foreach ($this->tours->stepsOrDefaults($id, $language) ?? [] as $step) {
            if (StepValidator::isEnabled($step)) {
                return true;
            }
        }
        return false;
    }

    /**
     * The reason is a code the admin page turns into a message; the detail
     * (a limit, a file, a field) helps the admin find what is wrong
     */
    private function packageRefused(TourPackageException $e): JSONResponse {
        return new JSONResponse(['success' => false, 'error' => $e->reason, 'detail' => $e->detail], Http::STATUS_BAD_REQUEST);
    }

    private function invalid(string $error): JSONResponse {
        // TRANSLATORS: %s is a technical description of the problem, in English, such as "audience must be everyone or new"
        return new JSONResponse(['success' => false, 'error' => $this->l10n->t('Invalid tour: %s', [$error])], Http::STATUS_BAD_REQUEST);
    }
}
