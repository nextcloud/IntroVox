<?php
declare(strict_types=1);

namespace OCA\IntroVox\Service;

use OCA\IntroVox\AppInfo\Application;
use OCP\Http\Client\IClientService;
use OCP\IConfig;
use OCP\IGroupManager;
use OCP\IURLGenerator;
use OCP\IUserManager;
use Psr\Log\LoggerInterface;

/**
 * Service for license management and step counting
 */
class LicenseService {
    private const FREE_LIMIT = 10; // Steps per language in free version
    private const DEFAULT_LICENSE_SERVER_URL = 'https://licenses.voxcloud.nl';

    /**
     * How the user count is taken, reported alongside it so the licence server
     * can keep readings from releases that counted unreliably out of the
     * averages a contract is measured against.
     */
    public const COUNT_METHOD = 'callForAllUsers';

    private IConfig $config;
    private IClientService $clientService;
    private IUserManager $userManager;
    private IGroupManager $groupManager;
    private IURLGenerator $urlGenerator;
    private LoggerInterface $logger;

    public function __construct(
        IConfig $config,
        IClientService $clientService,
        IUserManager $userManager,
        IGroupManager $groupManager,
        IURLGenerator $urlGenerator,
        LoggerInterface $logger
    ) {
        $this->config = $config;
        $this->clientService = $clientService;
        $this->userManager = $userManager;
        $this->groupManager = $groupManager;
        $this->urlGenerator = $urlGenerator;
        $this->logger = $logger;
    }

    public function getLicenseServerUrl(): string {
        $url = $this->config->getAppValue(Application::APP_ID, 'license_server_url', '');
        return empty($url) ? self::DEFAULT_LICENSE_SERVER_URL : $url;
    }

    public function setLicenseServerUrl(string $url): void {
        $url = rtrim(trim($url), '/');
        $this->config->setAppValue(Application::APP_ID, 'license_server_url', $url);
        $this->config->deleteAppValue(Application::APP_ID, 'license_valid');
        $this->config->deleteAppValue(Application::APP_ID, 'license_info');
    }

    private function getApiUrl(string $endpoint): string {
        return $this->getLicenseServerUrl() . '/api/licenses' . $endpoint;
    }

    public function getLicenseKey(): ?string {
        $key = $this->config->getAppValue(Application::APP_ID, 'license_key', '');
        return empty($key) ? null : $key;
    }

    public function setLicenseKey(string $key): void {
        $this->config->setAppValue(Application::APP_ID, 'license_key', trim($key));
        $this->config->deleteAppValue(Application::APP_ID, 'license_valid');
        $this->config->deleteAppValue(Application::APP_ID, 'license_info');
    }

    /**
     * SHA-256 of the instance URL, so the licence server never sees the URL
     * itself.
     *
     * The source must be request-context-independent: the daily cron job and an
     * admin web request both compute this hash, and if they disagreed the server
     * would see two instances for one customer and freeze the seat count.
     */
    public function getInstanceUrlHash(): string {
        return hash('sha256', $this->normalizedInstanceUrl());
    }

    /**
     * Request-independent instance URL, lower-cased and without a trailing
     * slash. overwrite.cli.url wins; otherwise trusted_domains[0] is promoted
     * to https:// so it is a full URL rather than a bare hostname.
     *
     * Deliberately NOT getInstanceUrl(): that falls back to
     * getAbsoluteURL(), whose result derives from the current request host and
     * so differs between a web request and the cron job.
     */
    private function normalizedInstanceUrl(): string {
        $url = $this->config->getSystemValue('overwrite.cli.url', '');
        if (empty($url)) {
            $domain = $this->config->getSystemValue('trusted_domains', ['localhost'])[0] ?? 'localhost';
            // Promote a bare hostname to a full URL; leave an already-qualified
            // value (someone put a scheme in trusted_domains) untouched.
            $url = preg_match('#^https?://#i', $domain) ? $domain : 'https://' . $domain;
        }
        return strtolower(rtrim($url, '/'));
    }

    /**
     * The hash this app used to send before the change above, so the server can
     * recognise the instance across it instead of treating it as a second one —
     * which would be refused, freezing the seat count at its pre-update value.
     *
     * Returns '' when overwrite.cli.url is set (the hash never changed for those
     * instances) or when the legacy hash equals the current one. Otherwise it
     * keeps returning the legacy hash: we have no local signal that the server
     * has adopted the new one, so we keep sending it — the server is idempotent
     * and ignores it once adopted.
     */
    public function getPreviousInstanceUrlHash(): string {
        if (!empty($this->config->getSystemValue('overwrite.cli.url', ''))) {
            return '';
        }

        $legacy = strtolower(rtrim($this->getInstanceUrl(), '/'));
        $hash = hash('sha256', $legacy);

        return $hash === $this->getInstanceUrlHash() ? '' : $hash;
    }

    /**
     * Includes previousInstanceUrlHash while the legacy hash differs from the
     * current one, so the server can adopt the new hash. The field is omitted
     * for instances whose hash never changed (overwrite.cli.url set).
     */
    private function hashMigrationPayload(): array {
        $previous = $this->getPreviousInstanceUrlHash();

        return $previous === '' ? [] : ['previousInstanceUrlHash' => $previous];
    }

    public function getInstanceUrl(): string {
        $instanceUrl = $this->config->getSystemValue('overwrite.cli.url', '');
        if (empty($instanceUrl)) {
            $instanceUrl = $this->urlGenerator->getAbsoluteURL('/');
        }
        return $instanceUrl;
    }

    public function getInstanceName(): string {
        return $this->config->getAppValue(
            Application::APP_ID,
            'instance_name',
            $this->config->getSystemValue('instancename', 'IntroVox Instance')
        );
    }

    /**
     * Validate license against the license server
     * @return array{valid: bool, reason?: string, license?: array, limits?: array, isFree: bool, cached?: bool}
     */
    public function validateLicense(): array {
        $licenseKey = $this->getLicenseKey();

        if (empty($licenseKey)) {
            return [
                'valid' => false,
                'reason' => 'No license key configured',
                'isFree' => true
            ];
        }

        try {
            $client = $this->clientService->newClient();
            $response = $client->post($this->getApiUrl('/validate'), [
                'json' => [
                    'licenseKey' => $licenseKey,
                    'instanceUrlHash' => $this->getInstanceUrlHash(),
                    'appType' => 'introvox'
                ] + $this->hashMigrationPayload(),
                'timeout' => 10,
                'headers' => [
                    'User-Agent' => 'IntroVox/' . $this->getAppVersion(),
                    'Content-Type' => 'application/json'
                ],
            ]);

            $statusCode = $response->getStatusCode();
            if ($statusCode < 200 || $statusCode >= 300) {
                $this->logger->warning('LicenseService: Validation HTTP error', ['status' => $statusCode]);
                return ['valid' => false, 'reason' => 'License server returned HTTP ' . $statusCode, 'isFree' => true];
            }

            $data = json_decode($response->getBody(), true);
            if (!is_array($data)) {
                return ['valid' => false, 'reason' => 'License server returned invalid response', 'isFree' => true];
            }

            if (!($data['valid'] ?? false)) {
                $this->logger->warning('LicenseService: License validation failed', [
                    'reason' => $data['reason'] ?? 'Unknown'
                ]);
                return [
                    'valid' => false,
                    'reason' => $data['reason'] ?? 'License validation failed',
                    'isFree' => true
                ];
            }

            $this->config->setAppValue(Application::APP_ID, 'license_valid', 'true');
            $this->config->setAppValue(Application::APP_ID, 'license_info', json_encode($data['license'] ?? []));
            $this->config->setAppValue(Application::APP_ID, 'license_last_check', (string)time());

            $this->logger->info('LicenseService: License validated successfully');

            return [
                'valid' => true,
                'license' => $data['license'] ?? [],
                'limits' => $data['limits'] ?? [],
                'isFree' => false
            ];
        } catch (\Exception $e) {
            $this->logger->warning('LicenseService: Failed to validate license', [
                'error' => $e->getMessage()
            ]);

            $cachedValid = $this->config->getAppValue(Application::APP_ID, 'license_valid', '');
            if ($cachedValid === 'true') {
                $cachedInfo = $this->config->getAppValue(Application::APP_ID, 'license_info', '{}');
                return [
                    'valid' => true,
                    'license' => json_decode($cachedInfo, true),
                    'cached' => true,
                    'isFree' => false
                ];
            }

            return [
                'valid' => false,
                'reason' => 'Could not connect to license server',
                'isFree' => true
            ];
        }
    }

    /**
     * Update usage statistics on the license server
     */
    public function updateUsage(): array {
        $licenseKey = $this->getLicenseKey();

        if (empty($licenseKey)) {
            return ['success' => false, 'reason' => 'No license key configured'];
        }

        try {
            $client = $this->clientService->newClient();
            $stepCounts = $this->getStepCountsPerLanguage();
            $totalSteps = array_sum($stepCounts);
            $userCount = $this->getUserCount();

            // Server expects pageCountsPerLanguage / currentPages — we map our steps onto those
            // (the server schema is generic; field names are historical from IntraVox)
            $response = $client->post($this->getApiUrl('/usage'), [
                'json' => [
                    'licenseKey' => $licenseKey,
                    'instanceUrlHash' => $this->getInstanceUrlHash(),
                    'instanceName' => $this->getInstanceName(),
                    'appType' => 'introvox',
                    'currentPages' => $totalSteps,
                    'pageCountsPerLanguage' => $stepCounts,
                    'currentUsers' => $userCount,
                    'disabledUsers' => $this->countDisabledUsers(),
                    // Tells the server how the count was taken, so readings
                    // from releases that counted unreliably stay out of the
                    // averages a contract is measured against.
                    'countMethod' => self::COUNT_METHOD,
                ] + $this->hashMigrationPayload(),
                'timeout' => 15,
                'headers' => [
                    'User-Agent' => 'IntroVox/' . $this->getAppVersion(),
                    'Content-Type' => 'application/json'
                ],
            ]);

            $statusCode = $response->getStatusCode();
            if ($statusCode < 200 || $statusCode >= 300) {
                $this->logger->warning('LicenseService: Usage update HTTP error', ['status' => $statusCode]);
                return ['success' => false, 'reason' => 'License server returned HTTP ' . $statusCode];
            }

            $data = json_decode($response->getBody(), true);
            if (!is_array($data)) {
                return ['success' => false, 'reason' => 'License server returned invalid response'];
            }

            if ($data['success'] ?? false) {
                $this->logger->info('LicenseService: Usage updated successfully', [
                    'steps' => $totalSteps,
                    'users' => $userCount
                ]);

                if (isset($data['limits'])) {
                    $this->config->setAppValue(Application::APP_ID, 'license_limits', json_encode($data['limits']));
                }

                return [
                    'success' => true,
                    'usage' => $data['usage'] ?? null,
                    'limits' => $data['limits'] ?? null
                ];
            }

            return [
                'success' => false,
                'reason' => $data['error'] ?? 'Unknown error'
            ];
        } catch (\Exception $e) {
            $this->logger->warning('LicenseService: Failed to update usage', [
                'error' => $e->getMessage()
            ]);
            return [
                'success' => false,
                'reason' => $e->getMessage()
            ];
        }
    }

    /**
     * Check if a step can be added for a specific language
     * @param string|null $language The language to check, or null for overall check
     * @param int $delta How many steps will be added (default 1)
     */
    public function checkStepLimit(?string $language = null, int $delta = 1): array {
        $licenseKey = $this->getLicenseKey();
        $stepCounts = $this->getStepCountsPerLanguage();
        $totalSteps = array_sum($stepCounts);

        if (empty($licenseKey)) {
            if ($language !== null) {
                $currentForLang = $stepCounts[$language] ?? 0;
                $exceeded = ($currentForLang + $delta) > self::FREE_LIMIT;
                return [
                    'allowed' => !$exceeded,
                    'current' => $currentForLang,
                    'max' => self::FREE_LIMIT,
                    'language' => $language,
                    'isFree' => true,
                    'perLanguage' => true,
                    'reason' => $exceeded ? "Free tier limit of " . self::FREE_LIMIT . " steps per language exceeded for {$language}" : null
                ];
            }

            $exceededLanguages = [];
            foreach ($stepCounts as $lang => $count) {
                if ($count >= self::FREE_LIMIT) {
                    $exceededLanguages[] = $lang;
                }
            }

            return [
                'allowed' => empty($exceededLanguages),
                'current' => $totalSteps,
                'currentPerLanguage' => $stepCounts,
                'max' => self::FREE_LIMIT,
                'exceededLanguages' => $exceededLanguages,
                'isFree' => true,
                'perLanguage' => true,
                'reason' => !empty($exceededLanguages) ? 'Free tier step limit exceeded for: ' . implode(', ', $exceededLanguages) : null
            ];
        }

        try {
            $client = $this->clientService->newClient();
            $response = $client->post($this->getApiUrl('/check-page-limit'), [
                'json' => [
                    'licenseKey' => $licenseKey,
                    'instanceUrlHash' => $this->getInstanceUrlHash(),
                    'language' => $language,
                    'pageCountsPerLanguage' => $stepCounts
                ] + $this->hashMigrationPayload(),
                'timeout' => 10,
                'headers' => [
                    'User-Agent' => 'IntroVox/' . $this->getAppVersion(),
                    'Content-Type' => 'application/json'
                ],
            ]);

            $statusCode = $response->getStatusCode();
            if ($statusCode < 200 || $statusCode >= 300) {
                throw new \RuntimeException('License server returned HTTP ' . $statusCode);
            }

            $data = json_decode($response->getBody(), true);
            if (!is_array($data)) {
                throw new \RuntimeException('License server returned invalid response');
            }

            return [
                'allowed' => $data['allowed'] ?? false,
                'current' => $data['current'] ?? $totalSteps,
                'currentPerLanguage' => $stepCounts,
                'max' => $data['max'] ?? null,
                'exceededLanguages' => $data['exceededLanguages'] ?? [],
                'reason' => $data['reason'] ?? null,
                'perLanguage' => $data['perLanguage'] ?? true,
                'isFree' => false
            ];
        } catch (\Exception $e) {
            $this->logger->warning('LicenseService: Failed to check step limit', [
                'error' => $e->getMessage()
            ]);

            $cachedLimits = $this->config->getAppValue(Application::APP_ID, 'license_limits', '');
            if (!empty($cachedLimits)) {
                $limits = json_decode($cachedLimits, true);
                $maxPerLang = $limits['maxPagesPerLanguage'] ?? $limits['maxPages'] ?? null;

                $exceededLanguages = [];
                if ($maxPerLang !== null) {
                    foreach ($stepCounts as $lang => $count) {
                        if ($count >= $maxPerLang) {
                            $exceededLanguages[] = $lang;
                        }
                    }
                }

                return [
                    'allowed' => empty($exceededLanguages),
                    'current' => $totalSteps,
                    'currentPerLanguage' => $stepCounts,
                    'max' => $maxPerLang,
                    'exceededLanguages' => $exceededLanguages,
                    'cached' => true,
                    'perLanguage' => true,
                    'isFree' => false
                ];
            }

            // Fail-open: if we cannot verify, allow the action
            return [
                'allowed' => true,
                'current' => $totalSteps,
                'currentPerLanguage' => $stepCounts,
                'max' => null,
                'reason' => 'Could not verify limit',
                'perLanguage' => true,
                'isFree' => false
            ];
        }
    }

    /**
     * Get step counts per language that has an admin override row.
     * @return array ['en' => 8, 'nl' => 10, ...]
     */
    public function getStepCountsPerLanguage(): array {
        $counts = [];
        foreach ($this->getOverriddenLanguages() as $lang) {
            $stepsJson = $this->config->getAppValue(Application::APP_ID, 'wizard_steps_' . $lang, '');
            if (empty($stepsJson)) {
                $counts[$lang] = 0;
                continue;
            }
            $steps = json_decode($stepsJson, true);
            $counts[$lang] = is_array($steps) ? count($steps) : 0;
        }
        return $counts;
    }

    public function getTotalStepCount(): int {
        return array_sum($this->getStepCountsPerLanguage());
    }

    /**
     * Languages with an admin-authored wizard_steps_<lang> row.
     * Always includes 'en' so downstream callers that assume ≥1 entry don't break.
     */
    private function getOverriddenLanguages(): array {
        $keys = $this->config->getAppKeys(Application::APP_ID);
        $codes = ['en'];
        foreach ($keys as $key) {
            if (preg_match('/^wizard_steps_([a-z]{2}(?:_[A-Z]{2})?)$/', $key, $m)) {
                if (!in_array($m[1], $codes, true)) {
                    $codes[] = $m[1];
                }
            }
        }
        return $codes;
    }

    /**
     * Users that exist but are disabled. They count towards the named-user
     * total, because disabling is how an account is retired without deleting
     * its data — the seat is still occupied.
     *
     * Returns null rather than 0 on failure: the licence server distinguishes
     * "this app does not report the figure" from "measured, nobody disabled",
     * and a swallowed error must not read as the latter. Matches
     * TelemetryService::getDisabledUserCount(), which reports the same figure.
     */
    private function countDisabledUsers(): ?int {
        try {
            $count = 0;
            $this->userManager->callForAllUsers(function ($user) use (&$count) {
                if (!$user->isEnabled()) {
                    $count++;
                }
            });
            return $count;
        } catch (\Throwable $e) {
            $this->logger->warning('LicenseService: Failed to count disabled users', [
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    private function getUserCount(): int {
        try {
            $count = 0;
            $this->userManager->callForAllUsers(function () use (&$count) {
                $count++;
            });
            return max(1, $count);
        } catch (\Exception $e) {
            $this->logger->warning('LicenseService: Failed to count users', [
                'error' => $e->getMessage()
            ]);
            return 0;
        }
    }

    public function getFreeLimit(): int {
        return self::FREE_LIMIT;
    }

    private function getAppVersion(): string {
        return $this->config->getAppValue(Application::APP_ID, 'installed_version', '0.0.0');
    }

    /**
     * Get license statistics for admin panel
     */
    public function getStats(): array {
        $validation = $this->validateLicense();
        $limits = $this->checkStepLimit();
        $stepCounts = $this->getStepCountsPerLanguage();
        $hasLicense = !empty($this->getLicenseKey());

        $maskedKey = '';
        if ($hasLicense) {
            $key = $this->getLicenseKey();
            if (strlen($key) > 8) {
                $maskedKey = substr($key, 0, 4) . '-••••-••••-' . substr($key, -4);
            } else {
                $maskedKey = '••••••••';
            }
        }

        return [
            'stepCounts' => $stepCounts,
            'totalSteps' => array_sum($stepCounts),
            'freeLimit' => self::FREE_LIMIT,
            'languagesWithOverrides' => $this->getOverriddenLanguages(),
            'hasLicense' => $hasLicense,
            'licenseValid' => $validation['valid'],
            'licenseInfo' => $validation['license'] ?? null,
            'licenseKeyMasked' => $maskedKey,
            'maxStepsPerLanguage' => $limits['max'] ?? self::FREE_LIMIT,
            'exceededLanguages' => $limits['exceededLanguages'] ?? [],
            'stepsExceeded' => !($limits['allowed'] ?? true),
            'perLanguage' => true,
        ];
    }
}
