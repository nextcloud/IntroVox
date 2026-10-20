<?php

declare(strict_types=1);

namespace OCA\IntroVox\Controller;

use OCA\IntroVox\Media\MediaException;
use OCA\IntroVox\Service\MediaService;
use OCP\AppFramework\Controller;
use OCP\AppFramework\Http;
use OCP\AppFramework\Http\JSONResponse;
use OCP\IGroupManager;
use OCP\IRequest;
use OCP\IUserSession;
use Psr\Log\LoggerInterface;

/**
 * Adding an image, video or captions file to a step: uploaded, or copied in
 * from the admin's own Files. Admin only, with the CSRF check like every
 * other route. MediaService checks and cleans the file.
 */
class MediaUploadController extends Controller {
    use AdminOnly;

    public function __construct(
        string $appName,
        IRequest $request,
        private MediaService $mediaService,
        private IUserSession $userSession,
        private IGroupManager $groupManager,
        private LoggerInterface $logger,
    ) {
        parent::__construct($appName, $request);
    }

    public function upload(string $kind = 'media'): JSONResponse {
        if ($forbidden = $this->requireAdmin()) {
            return $forbidden;
        }
        $user = $this->userSession->getUser();
        $upload = $this->request->getUploadedFile('file');
        if (!is_array($upload) || ($upload['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK
            || !is_string($upload['tmp_name'] ?? null) || !is_uploaded_file($upload['tmp_name'])) {
            // UPLOAD_ERR_INI_SIZE and _FORM_SIZE: PHP's own limit, below ours
            $tooLarge = in_array($upload['error'] ?? null, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true);
            return $this->refused(new MediaException($tooLarge ? 'too_large_for_server' : 'no_file'));
        }
        $bytes = file_get_contents($upload['tmp_name']);
        if ($bytes === false) {
            return $this->refused(new MediaException('no_file'));
        }
        return $this->stored(fn () => $this->mediaService->store($bytes, (string)($upload['name'] ?? ''), $user->getUID(), $this->kind($kind)));
    }

    public function fromFiles(string $path, string $kind = 'media'): JSONResponse {
        if ($forbidden = $this->requireAdmin()) {
            return $forbidden;
        }
        $user = $this->userSession->getUser();
        return $this->stored(fn () => $this->mediaService->storeFromFiles($user, $path, $this->kind($kind)));
    }

    private function kind(string $kind): string {
        return $kind === 'captions' ? 'captions' : 'media';
    }

    private function stored(callable $store): JSONResponse {
        try {
            return new JSONResponse(['success' => true, 'media' => $store()]);
        } catch (MediaException $e) {
            return $this->refused($e);
        } catch (\Throwable $e) {
            $this->logger->error('IntroVox: storing media failed: ' . $e->getMessage(), ['app' => 'introvox', 'exception' => $e]);
            return new JSONResponse(['success' => false, 'error' => 'failed'], Http::STATUS_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * The reason is a code the editor turns into a translated message
     * (src/admin/StepMediaBlock.vue), with the limit when there is one
     */
    private function refused(MediaException $e): JSONResponse {
        return new JSONResponse([
            'success' => false,
            'error' => $e->getReason(),
            'limit' => ctype_digit($e->getDetail()) ? (int)$e->getDetail() : null,
        ], Http::STATUS_BAD_REQUEST);
    }
}
