<?php
declare(strict_types=1);

namespace OCA\IntroVox\BackgroundJob;

use OCA\IntroVox\AppInfo\Application;
use OCA\IntroVox\Service\LicenseService;
use OCP\AppFramework\Utility\ITimeFactory;
use OCP\BackgroundJob\TimedJob;
use OCP\IConfig;
use Psr\Log\LoggerInterface;

/**
 * Background job that periodically sends license usage data to the license server.
 * Runs every 24 hours by default, with stable per-instance jitter (0-60 min) to spread load.
 */
class LicenseUsageJob extends TimedJob {
    private const DEFAULT_INTERVAL_HOURS = 24;
    private const JITTER_MAX_MINUTES = 60;

    private LicenseService $licenseService;
    private IConfig $config;
    private LoggerInterface $logger;

    public function __construct(
        ITimeFactory $time,
        LicenseService $licenseService,
        IConfig $config,
        LoggerInterface $logger
    ) {
        parent::__construct($time);

        $this->licenseService = $licenseService;
        $this->config = $config;
        $this->logger = $logger;

        $intervalHours = (int)$this->config->getAppValue(
            Application::APP_ID,
            'license_sync_interval_hours',
            (string)self::DEFAULT_INTERVAL_HOURS
        );
        $intervalHours = max(1, $intervalHours);

        $jitterMinutes = $this->getStableJitter();
        $this->setInterval(($intervalHours * 60 * 60) + ($jitterMinutes * 60));
    }

    private function getStableJitter(): int {
        $instanceId = $this->config->getSystemValue('instanceid', '');
        if (empty($instanceId)) {
            return random_int(0, self::JITTER_MAX_MINUTES);
        }
        $hash = crc32($instanceId . 'license_sync_jitter');
        return abs($hash) % (self::JITTER_MAX_MINUTES + 1);
    }

    protected function run($argument): void {
        $this->logger->info('LicenseUsageJob: Starting license usage sync');

        $licenseKey = $this->licenseService->getLicenseKey();
        if (empty($licenseKey)) {
            $this->logger->info('LicenseUsageJob: No license key configured, skipping');
            return;
        }

        try {
            $validation = $this->licenseService->validateLicense();

            if (!$validation['valid']) {
                $this->logger->warning('LicenseUsageJob: License validation failed', [
                    'reason' => $validation['reason'] ?? 'Unknown'
                ]);
                // Still update usage so the server records this instance
            }

            $result = $this->licenseService->updateUsage();

            if ($result['success']) {
                $this->logger->info('LicenseUsageJob: Usage sync completed successfully', [
                    'limits' => $result['limits'] ?? null
                ]);

                $this->config->setAppValue(
                    Application::APP_ID,
                    'license_last_sync',
                    (string)time()
                );
            } else {
                $this->logger->warning('LicenseUsageJob: Usage sync failed', [
                    'reason' => $result['reason'] ?? 'Unknown'
                ]);
            }
        } catch (\Exception $e) {
            $this->logger->error('LicenseUsageJob: Exception during sync', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }
}
