<?php

declare(strict_types=1);

namespace OCA\IntroVox\Migration;

use OCA\IntroVox\Service\TourOptOut;
use OCP\Config\IUserConfig;
use OCP\IConfig;
use OCP\Migration\IOutput;
use OCP\Migration\IRepairStep;
use Psr\Log\LoggerInterface;

/**
 * Tours per app arrive with a new personal switch, "Start tours by
 * themselves". A user who switched the welcome tour off on purpose should not
 * get app tours either: this sets tours_disabled for them, by the rule in
 * TourOptOut, and never for a user who already has a value.
 *
 * Post-migration repair steps run on every update; the flag, set after the
 * loop, makes this run once. A fresh install needs nothing: there are no
 * choices to carry over, and the tour index fills itself (TourRepository).
 */
class IntroduceTours implements IRepairStep {
    private const DONE_FLAG = 'tours_introduced';
    private const KEYS = ['wizard_disabled', 'wizard_started', 'wizard_completed', 'wizard_skipped', 'tours_disabled'];

    public function __construct(
        private IConfig $config,
        private IUserConfig $userConfig,
        private LoggerInterface $logger,
    ) {
    }

    public function getName(): string {
        return 'Keep tours off for users who switched the IntroVox tour off';
    }

    public function run(IOutput $output): void {
        if ($this->config->getAppValue('introvox', self::DONE_FLAG, '') !== '') {
            return;
        }

        // One query per key, not one per user
        $values = [];
        foreach (self::KEYS as $key) {
            foreach ($this->userConfig->getValuesByUsers('introvox', $key) as $uid => $value) {
                $values[(string)$uid][$key] = (string)$value;
            }
        }

        $changed = 0;
        foreach ($values as $uid => $preferences) {
            if (TourOptOut::optedOut($preferences)) {
                // Untyped, as TourStateService writes it: a typed value here
                // makes every later IConfig::setUserValue on the key throw
                // (a type conflict), so the user could not switch tours on
                $this->config->setUserValue($uid, 'introvox', 'tours_disabled', 'true');
                $changed++;
            }
        }

        $this->config->setAppValue('introvox', self::DONE_FLAG, (string)time());
        $this->logger->info('IntroVox: tours stay off for ' . $changed . ' users who switched the tour off', ['app' => 'introvox']);
        $output->info('Tours stay off for ' . $changed . ' users who switched the tour off');
    }
}
