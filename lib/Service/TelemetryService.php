<?php
declare(strict_types=1);

namespace OCA\IntroVox\Service;

use OCA\IntroVox\AppInfo\Application;
use OCP\Http\Client\IClientService;
use OCP\IConfig;
use OCP\IUserManager;
use OCP\IGroupManager;
use OCP\IDBConnection;
use Psr\Log\LoggerInterface;

/**
 * Service for anonymous telemetry data collection and reporting
 * This is an opt-in feature that helps improve IntroVox
 */
class TelemetryService {
    private const TELEMETRY_URL = 'https://licenses.voxcloud.nl/api/telemetry/introvox';

    private IClientService $httpClient;
    private IConfig $config;
    private LoggerInterface $logger;
    private IUserManager $userManager;
    private IGroupManager $groupManager;
    private IDBConnection $db;

    public function __construct(
        IClientService $httpClient,
        IConfig $config,
        LoggerInterface $logger,
        IUserManager $userManager,
        IGroupManager $groupManager,
        IDBConnection $db
    ) {
        $this->httpClient = $httpClient;
        $this->config = $config;
        $this->logger = $logger;
        $this->userManager = $userManager;
        $this->groupManager = $groupManager;
        $this->db = $db;
    }

    /**
     * Check if telemetry is enabled
     * Default is true (opt-out)
     */
    public function isEnabled(): bool {
        return $this->config->getAppValue(Application::APP_ID, 'telemetry_enabled', 'true') === 'true';
    }

    /**
     * Enable or disable telemetry
     */
    public function setEnabled(bool $enabled): void {
        $this->config->setAppValue(Application::APP_ID, 'telemetry_enabled', $enabled ? 'true' : 'false');
        $this->logger->info('TelemetryService: Telemetry ' . ($enabled ? 'enabled' : 'disabled'));
    }

    /**
     * Get the telemetry server URL
     */
    public function getTelemetryUrl(): string {
        return $this->config->getAppValue(
            Application::APP_ID,
            'telemetry_url',
            self::TELEMETRY_URL
        );
    }

    /**
     * Send telemetry report to the server
     * @return bool Success status
     */
    public function sendReport(): bool {
        if (!$this->isEnabled()) {
            $this->logger->debug('TelemetryService: Telemetry is disabled, skipping report');
            return false;
        }

        try {
            $data = $this->collectData();

            $client = $this->httpClient->newClient();
            $response = $client->post($this->getTelemetryUrl(), [
                'json' => $data,
                'timeout' => 15,
                'headers' => [
                    'User-Agent' => 'IntroVox/' . $this->getAppVersion(),
                    'Content-Type' => 'application/json'
                ]
            ]);

            $statusCode = $response->getStatusCode();

            if ($statusCode >= 200 && $statusCode < 300) {
                $this->logger->info('TelemetryService: Report sent successfully', [
                    'totalUsers' => $data['totalUsers'],
                    'wizardEnabled' => $data['wizardEnabled']
                ]);

                // Store last report time
                $this->config->setAppValue(
                    Application::APP_ID,
                    'telemetry_last_report',
                    (string)time()
                );

                return true;
            }

            // Silent fail - server may not be ready yet
            // TODO v1.3: Add proper error logging once server is stable
            return false;
        } catch (\Exception $e) {
            // Silent fail - server may not be available
            // TODO v1.3: Add proper error logging once server is stable
            return false;
        }
    }

    /**
     * Collect telemetry data
     */
    public function collectData(): array {
        return [
            'instanceHash' => $this->getInstanceHash(),
            'totalUsers' => $this->getUserCount(),
            'activeUsers30d' => $this->getActiveUserCount(30),
            'introvoxVersion' => $this->getAppVersion(),
            'nextcloudVersion' => $this->getNextcloudVersion(),
            'phpVersion' => PHP_VERSION,
            'totalSteps' => $this->getStepCounts(),
            'enabledLanguages' => $this->getEnabledLanguages(),
            'wizardEnabled' => $this->isWizardEnabled(),
            'wizardStartedCount' => $this->getWizardStartedCount(),
            'wizardCompletedCount' => $this->getWizardCompletedCount(),
            'wizardSkippedCount' => $this->getWizardSkippedCount(),
            'usersStartedWizard' => $this->getUsersStartedCount(),
            'usersCompletedWizard' => $this->getUsersCompletedCount(),
            // Privacy-friendly server environment info (admin-configured settings only)
            'serverRegion' => $this->getServerRegion(),
            'defaultLanguage' => $this->getDefaultLanguage(),
            'defaultTimezone' => $this->getDefaultTimezone(),
            'databaseType' => $this->getDatabaseType(),
            'totalGroups' => $this->getGroupCount(),
            'groupVisibilityUsed' => $this->isGroupVisibilityUsed(),
            'osFamily' => PHP_OS_FAMILY,
            'webServer' => $this->getWebServer(),
            'isDocker' => $this->isDocker(),
        ];
    }

    /**
     * Detect web server from SERVER_SOFTWARE header
     */
    private function getWebServer(): ?string {
        $software = $_SERVER['SERVER_SOFTWARE'] ?? null;
        if ($software === null) {
            return null;
        }
        if (stripos($software, 'apache') !== false) {
            return 'Apache';
        }
        if (stripos($software, 'nginx') !== false) {
            return 'nginx';
        }
        return explode('/', $software)[0];
    }

    /**
     * Detect if running inside a Docker container
     */
    private function isDocker(): bool {
        if (file_exists('/.dockerenv')) {
            return true;
        }
        if (file_exists('/proc/1/cgroup')) {
            $cgroup = @file_get_contents('/proc/1/cgroup');
            if ($cgroup !== false && str_contains($cgroup, 'docker')) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get SHA-256 hash of instance URL for privacy
     */
    private function getInstanceHash(): string {
        $instanceUrl = $this->config->getSystemValue('overwrite.cli.url', '');
        if (empty($instanceUrl)) {
            $instanceUrl = $this->config->getSystemValue('instanceid', '');
        }
        return hash('sha256', $instanceUrl);
    }

    /**
     * Get total user count
     */
    private function getUserCount(): int {
        try {
            $count = 0;
            $this->userManager->callForSeenUsers(function ($user) use (&$count) {
                $count++;
            });
            return $count;
        } catch (\Exception $e) {
            $this->logger->warning('TelemetryService: Failed to count users', [
                'error' => $e->getMessage()
            ]);
            return 0;
        }
    }

    /**
     * Get active user count for the last N days
     */
    private function getActiveUserCount(int $days): int {
        try {
            $cutoffTime = time() - ($days * 24 * 60 * 60);
            $count = 0;

            $this->userManager->callForSeenUsers(function ($user) use (&$count, $cutoffTime) {
                $lastLogin = $user->getLastLogin();
                if ($lastLogin >= $cutoffTime) {
                    $count++;
                }
            });

            return $count;
        } catch (\Exception $e) {
            $this->logger->warning('TelemetryService: Failed to count active users', [
                'error' => $e->getMessage()
            ]);
            return 0;
        }
    }

    /**
     * Get the IntroVox app version
     */
    private function getAppVersion(): string {
        return $this->config->getAppValue(Application::APP_ID, 'installed_version', 'unknown');
    }

    /**
     * Get the Nextcloud version
     */
    private function getNextcloudVersion(): string {
        return $this->config->getSystemValue('version', 'unknown');
    }

    /**
     * Get the server region (ISO 3166-1 country code)
     * From admin-configured default_phone_region setting
     * Privacy-friendly: only country-level, admin-set value
     */
    private function getServerRegion(): string {
        return $this->config->getSystemValue('default_phone_region', '');
    }

    /**
     * Get the default language setting
     * Privacy-friendly: general server configuration
     */
    private function getDefaultLanguage(): string {
        return $this->config->getSystemValue('default_language', 'en');
    }

    /**
     * Get the default timezone setting
     * Tries Nextcloud config first, then PHP default, falls back to UTC
     */
    private function getDefaultTimezone(): string {
        $tz = $this->config->getSystemValue('default_timezone', '');
        if (!empty($tz) && $tz !== 'UTC') {
            return $tz;
        }
        // Try PHP's configured timezone (from php.ini)
        $phpTz = date_default_timezone_get();
        if (!empty($phpTz) && $phpTz !== 'UTC') {
            return $phpTz;
        }
        return 'UTC';
    }

    /**
     * Get the database type
     * Privacy-friendly: only database type (mysql/pgsql/sqlite)
     */
    private function getDatabaseType(): string {
        return $this->config->getSystemValue('dbtype', 'unknown');
    }

    /**
     * Get total number of groups
     * Privacy-friendly: only count, no group names
     */
    private function getGroupCount(): int {
        try {
            $groups = $this->groupManager->search('');
            return count($groups);
        } catch (\Exception $e) {
            return 0;
        }
    }

    /**
     * Check if group visibility feature is used in any step
     * Privacy-friendly: only boolean, no group names
     */
    private function isGroupVisibilityUsed(): bool {
        $enabledLanguages = $this->getEnabledLanguages();

        foreach ($enabledLanguages as $lang) {
            $configKey = 'wizard_steps_' . $lang;
            $stepsJson = $this->config->getAppValue(Application::APP_ID, $configKey, '');
            if (!empty($stepsJson)) {
                $steps = json_decode($stepsJson, true);
                if (is_array($steps)) {
                    foreach ($steps as $step) {
                        if (!empty($step['visibleToGroups']) && is_array($step['visibleToGroups']) && count($step['visibleToGroups']) > 0) {
                            return true;
                        }
                    }
                }
            }
        }

        return false;
    }

    /**
     * Get step counts per language
     */
    private function getStepCounts(): array {
        $counts = [];
        $enabledLanguages = $this->getEnabledLanguages();

        foreach ($enabledLanguages as $lang) {
            $configKey = 'wizard_steps_' . $lang;
            $stepsJson = $this->config->getAppValue(Application::APP_ID, $configKey, '');
            if (!empty($stepsJson)) {
                $steps = json_decode($stepsJson, true);
                $counts[$lang] = is_array($steps) ? count($steps) : 0;
            } else {
                $counts[$lang] = 0;
            }
        }

        return $counts;
    }

    /**
     * Get enabled languages
     */
    private function getEnabledLanguages(): array {
        $enabledLanguagesJson = $this->config->getAppValue(Application::APP_ID, 'enabled_languages', '');
        if (empty($enabledLanguagesJson)) {
            return ['en'];
        }
        return json_decode($enabledLanguagesJson, true) ?: ['en'];
    }

    /**
     * Check if wizard is globally enabled
     */
    private function isWizardEnabled(): bool {
        return $this->config->getAppValue(Application::APP_ID, 'wizard_enabled', 'true') === 'true';
    }

    /**
     * Get count of wizard started events
     */
    private function getWizardStartedCount(): int {
        return (int)$this->config->getAppValue(Application::APP_ID, 'wizard_started_count', '0');
    }

    /**
     * Get count of wizard completed events
     */
    private function getWizardCompletedCount(): int {
        return (int)$this->config->getAppValue(Application::APP_ID, 'wizard_completed_count', '0');
    }

    /**
     * Get count of wizard skipped events
     */
    private function getWizardSkippedCount(): int {
        return (int)$this->config->getAppValue(Application::APP_ID, 'wizard_skipped_count', '0');
    }

    /**
     * Get count of unique users who started wizard
     */
    private function getUsersStartedCount(): int {
        try {
            $qb = $this->db->getQueryBuilder();
            $qb->select($qb->createFunction('COUNT(DISTINCT userid)'))
               ->from('preferences')
               ->where($qb->expr()->eq('appid', $qb->createNamedParameter(Application::APP_ID)))
               ->andWhere($qb->expr()->eq('configkey', $qb->createNamedParameter('wizard_started')));

            $result = $qb->executeQuery();
            $count = (int)$result->fetchOne();
            $result->closeCursor();
            return $count;
        } catch (\Exception $e) {
            $this->logger->warning('TelemetryService: Failed to count users started', [
                'error' => $e->getMessage()
            ]);
            return 0;
        }
    }

    /**
     * Get count of unique users who completed wizard
     */
    private function getUsersCompletedCount(): int {
        try {
            $qb = $this->db->getQueryBuilder();
            $qb->select($qb->createFunction('COUNT(DISTINCT userid)'))
               ->from('preferences')
               ->where($qb->expr()->eq('appid', $qb->createNamedParameter(Application::APP_ID)))
               ->andWhere($qb->expr()->eq('configkey', $qb->createNamedParameter('wizard_completed')));

            $result = $qb->executeQuery();
            $count = (int)$result->fetchOne();
            $result->closeCursor();
            return $count;
        } catch (\Exception $e) {
            $this->logger->warning('TelemetryService: Failed to count users completed', [
                'error' => $e->getMessage()
            ]);
            return 0;
        }
    }

    /**
     * Increment wizard started count
     */
    public function incrementWizardStarted(): void {
        $count = $this->getWizardStartedCount();
        $this->config->setAppValue(Application::APP_ID, 'wizard_started_count', (string)($count + 1));
    }

    /**
     * Increment wizard completed count
     */
    public function incrementWizardCompleted(): void {
        $count = $this->getWizardCompletedCount();
        $this->config->setAppValue(Application::APP_ID, 'wizard_completed_count', (string)($count + 1));
    }

    /**
     * Increment wizard skipped count
     */
    public function incrementWizardSkipped(): void {
        $count = $this->getWizardSkippedCount();
        $this->config->setAppValue(Application::APP_ID, 'wizard_skipped_count', (string)($count + 1));
    }

    /**
     * Mark user as started wizard
     */
    public function markUserStarted(string $userId): void {
        $existing = $this->config->getUserValue($userId, Application::APP_ID, 'wizard_started', '');
        if (empty($existing)) {
            $this->config->setUserValue($userId, Application::APP_ID, 'wizard_started', (string)time());
            $this->incrementWizardStarted();
        }
    }

    /**
     * Mark user as completed wizard
     */
    public function markUserCompleted(string $userId): void {
        $existing = $this->config->getUserValue($userId, Application::APP_ID, 'wizard_completed', '');
        if (empty($existing)) {
            $this->config->setUserValue($userId, Application::APP_ID, 'wizard_completed', (string)time());
            $this->incrementWizardCompleted();
        }
    }

    /**
     * Mark user as skipped wizard
     */
    public function markUserSkipped(string $userId): void {
        $this->config->setUserValue($userId, Application::APP_ID, 'wizard_skipped', (string)time());
        $this->incrementWizardSkipped();
    }

    /**
     * Get the last report timestamp
     */
    public function getLastReportTime(): ?int {
        $time = $this->config->getAppValue(Application::APP_ID, 'telemetry_last_report', '');
        return empty($time) ? null : (int)$time;
    }

    /**
     * Check if a report should be sent (not sent in last 24 hours)
     */
    public function shouldSendReport(): bool {
        if (!$this->isEnabled()) {
            return false;
        }

        $lastReport = $this->getLastReportTime();
        if ($lastReport === null) {
            return true;
        }

        // Send report if more than 24 hours since last report
        return (time() - $lastReport) > (24 * 60 * 60);
    }

    /**
     * Get telemetry status for admin panel
     */
    public function getStatus(): array {
        return [
            'enabled' => $this->isEnabled(),
            'lastReport' => $this->getLastReportTime(),
            'telemetryUrl' => $this->getTelemetryUrl()
        ];
    }

    /**
     * Get statistics for admin panel
     */
    public function getStatistics(): array {
        return [
            'totalUsers' => $this->getUserCount(),
            'activeUsers30d' => $this->getActiveUserCount(30),
            'wizardStartedCount' => $this->getWizardStartedCount(),
            'wizardCompletedCount' => $this->getWizardCompletedCount(),
            'wizardSkippedCount' => $this->getWizardSkippedCount(),
            'usersStartedWizard' => $this->getUsersStartedCount(),
            'usersCompletedWizard' => $this->getUsersCompletedCount(),
            'totalSteps' => $this->getStepCounts(),
            'enabledLanguages' => $this->getEnabledLanguages(),
            'wizardEnabled' => $this->isWizardEnabled(),
        ];
    }
}
