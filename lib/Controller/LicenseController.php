<?php
declare(strict_types=1);

namespace OCA\IntroVox\Controller;

use OCA\IntroVox\Service\LicenseService;
use OCP\AppFramework\Controller;
use OCP\AppFramework\Http;
use OCP\AppFramework\Http\Attribute\NoCSRFRequired;
use OCP\AppFramework\Http\DataResponse;
use OCP\IGroupManager;
use OCP\IRequest;
use OCP\IUserSession;
use Psr\Log\LoggerInterface;

/**
 * API Controller for IntroVox License Management
 *
 * All endpoints are admin-only.
 */
class LicenseController extends Controller {
    public function __construct(
        string $appName,
        IRequest $request,
        private LicenseService $licenseService,
        private IUserSession $userSession,
        private IGroupManager $groupManager,
        private LoggerInterface $logger
    ) {
        parent::__construct($appName, $request);
    }

    private function isAdmin(): bool {
        $user = $this->userSession->getUser();
        if ($user === null) {
            return false;
        }
        return $this->groupManager->isAdmin($user->getUID());
    }

    private function forbidden(): DataResponse {
        return new DataResponse(
            ['success' => false, 'error' => 'Admin privileges required'],
            Http::STATUS_FORBIDDEN
        );
    }

    /**
     * Get license statistics
     * @NoCSRFRequired
     */
    public function getStats(): DataResponse {
        if (!$this->isAdmin()) {
            return $this->forbidden();
        }

        try {
            $stats = $this->licenseService->getStats();
            return new DataResponse(['success' => true, ...$stats]);
        } catch (\Exception $e) {
            $this->logger->error('LicenseController::getStats failed', ['error' => $e->getMessage()]);
            return new DataResponse(
                ['success' => false, 'error' => 'Failed to retrieve license statistics'],
                Http::STATUS_INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Save license settings (license key)
     */
    public function saveSettings(): DataResponse {
        if (!$this->isAdmin()) {
            return $this->forbidden();
        }

        try {
            $licenseKey = $this->request->getParam('licenseKey', '');
            if ($licenseKey !== null) {
                $this->licenseService->setLicenseKey((string)$licenseKey);
                $this->logger->info('IntroVox Audit: License key updated by admin');
            }

            return new DataResponse([
                'success' => true,
                'message' => 'License settings saved successfully'
            ]);
        } catch (\Exception $e) {
            $this->logger->error('LicenseController::saveSettings failed', ['error' => $e->getMessage()]);
            return new DataResponse(
                ['success' => false, 'error' => 'Failed to save license settings'],
                Http::STATUS_INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Validate the configured license
     */
    public function validate(): DataResponse {
        if (!$this->isAdmin()) {
            return $this->forbidden();
        }

        try {
            $result = $this->licenseService->validateLicense();
            return new DataResponse($result);
        } catch (\Exception $e) {
            $this->logger->error('LicenseController::validate failed', ['error' => $e->getMessage()]);
            return new DataResponse(
                ['success' => false, 'error' => 'Failed to validate license'],
                Http::STATUS_INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Update license usage on the license server
     */
    public function updateUsage(): DataResponse {
        if (!$this->isAdmin()) {
            return $this->forbidden();
        }

        try {
            $result = $this->licenseService->updateUsage();
            return new DataResponse($result);
        } catch (\Exception $e) {
            $this->logger->error('LicenseController::updateUsage failed', ['error' => $e->getMessage()]);
            return new DataResponse(
                ['success' => false, 'error' => 'Failed to update license usage'],
                Http::STATUS_INTERNAL_SERVER_ERROR
            );
        }
    }
}
