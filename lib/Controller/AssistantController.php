<?php

declare(strict_types=1);

namespace OCA\IntroVox\Controller;

use OCA\IntroVox\Service\TourAssistant;
use OCA\IntroVox\Service\TourPrompts;
use OCA\IntroVox\Service\TourRepository;
use OCA\IntroVox\Service\TourValidator;
use OCP\AppFramework\Controller;
use OCP\AppFramework\Http;
use OCP\AppFramework\Http\Attribute\UserRateLimit;
use OCP\AppFramework\Http\JSONResponse;
use OCP\IGroupManager;
use OCP\IRequest;
use OCP\IUserSession;
use OCP\TaskProcessing\Exception\NotFoundException;
use Psr\Log\LoggerInterface;

/**
 * Translating a tour and drafting its steps with the Nextcloud Assistant
 * (TourAssistant). Admin only, with the CSRF check like every other route.
 * Nothing is stored here: the admin page shows the result for review and
 * saves it through the step endpoints.
 */
class AssistantController extends Controller {
    use AdminOnly;

    public function __construct(
        string $appName,
        IRequest $request,
        private TourAssistant $assistant,
        private TourRepository $tours,
        private IUserSession $userSession,
        private IGroupManager $groupManager,
        private LoggerInterface $logger,
    ) {
        parent::__construct($appName, $request);
    }

    public function status(): JSONResponse {
        if ($forbidden = $this->requireAdmin()) {
            return $forbidden;
        }
        return new JSONResponse(['success' => true, 'available' => $this->assistant->available()]);
    }

    #[UserRateLimit(limit: 60, period: 3600)]
    public function translate(string $tour = '', string $from = '', string $to = ''): JSONResponse {
        if ($forbidden = $this->requireAdmin()) {
            return $forbidden;
        }
        $found = $this->tours->get($tour);
        if ($found === null || !preg_match(TourValidator::LANG_PATTERN, $from) || !preg_match(TourValidator::LANG_PATTERN, $to) || $from === $to) {
            return new JSONResponse(['success' => false, 'error' => 'invalid'], Http::STATUS_BAD_REQUEST);
        }
        return $this->scheduled(fn (): int => $this->assistant->translate($found, $from, $to, $this->uid()));
    }

    #[UserRateLimit(limit: 60, period: 3600)]
    public function draft(string $tour = '', string $description = '', string $lang = ''): JSONResponse {
        if ($forbidden = $this->requireAdmin()) {
            return $forbidden;
        }
        $found = $this->tours->get($tour);
        $description = trim($description);
        if ($found === null || $description === '' || mb_strlen($description) > TourPrompts::MAX_DESCRIPTION || !preg_match(TourValidator::LANG_PATTERN, $lang)) {
            return new JSONResponse(['success' => false, 'error' => 'invalid'], Http::STATUS_BAD_REQUEST);
        }
        return $this->scheduled(fn (): int => $this->assistant->draft($found, $description, $lang, $this->uid()));
    }

    public function result(int $id): JSONResponse {
        if ($forbidden = $this->requireAdmin()) {
            return $forbidden;
        }
        try {
            return new JSONResponse(['success' => true] + $this->assistant->result($id, $this->uid()));
        } catch (NotFoundException $e) {
            return new JSONResponse(['success' => false, 'error' => 'not_found'], Http::STATUS_NOT_FOUND);
        }
    }

    private function scheduled(callable $schedule): JSONResponse {
        if (!$this->assistant->available()) {
            return new JSONResponse(['success' => false, 'error' => 'unavailable'], Http::STATUS_SERVICE_UNAVAILABLE);
        }
        try {
            return new JSONResponse(['success' => true, 'task' => $schedule()]);
        } catch (\Throwable $e) {
            if ($e instanceof \RuntimeException && $e->getMessage() === 'no_steps') {
                return new JSONResponse(['success' => false, 'error' => 'no_steps'], Http::STATUS_BAD_REQUEST);
            }
            $this->logger->warning('IntroVox: an Assistant task could not be scheduled: ' . $e->getMessage(), ['app' => 'introvox']);
            return new JSONResponse(['success' => false, 'error' => 'failed'], Http::STATUS_INTERNAL_SERVER_ERROR);
        }
    }

    private function uid(): string {
        return (string)$this->userSession->getUser()?->getUID();
    }
}
