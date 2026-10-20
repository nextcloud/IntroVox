<?php

declare(strict_types=1);

namespace OCA\IntroVox\Service;

use OCP\IConfig;
use OCP\IDateTimeZone;
use OCP\IUser;

/**
 * Where each user stands with the app tours, kept as their own preferences:
 * tour_<id>_seen (the version it last started at), tour_<id>_completed and
 * tour_<id>_skipped (when, set once), tour_<id>_reached (how far their last
 * automatic run got, for the statistics) and tours_disabled for "Start tours
 * by themselves" switched off. The welcome tour keeps its own keys
 * (wizard_disabled and the counters TelemetryService reads), and shares only
 * tour_welcome_reached.
 */
class TourStateService {
    public function __construct(
        private IConfig $config,
        private TourRepository $tours,
        private IDateTimeZone $timeZone,
    ) {
    }

    public function toursDisabled(string $uid): bool {
        return $this->config->getUserValue($uid, 'introvox', 'tours_disabled', 'false') === 'true';
    }

    /**
     * Switching automatic tours off also marks the welcome tour as done, so
     * an older IntroVox, which only knows wizard_disabled, respects it too.
     */
    public function setToursDisabled(string $uid, bool $disabled): void {
        $this->config->setUserValue($uid, 'introvox', 'tours_disabled', $disabled ? 'true' : 'false');
        if ($disabled) {
            $this->config->setUserValue($uid, 'introvox', 'wizard_disabled', 'true');
        }
    }

    public function seen(string $uid, string $id): int {
        return (int)$this->config->getUserValue($uid, 'introvox', TourValidator::stateKey($id, 'seen'), '0');
    }

    /**
     * A tour started for this user. Starting counts as seeing it: it does
     * not come back by itself until it is shown to everyone again.
     *
     * @return bool Whether this is the first start at this version; another
     *   tab or device may have started it a moment before
     */
    public function markStarted(string $uid, array $tour): bool {
        $version = (int)$tour['version'];
        if ($this->seen($uid, $tour['id']) >= $version) {
            return false;
        }
        $this->config->setUserValue($uid, 'introvox', TourValidator::stateKey($tour['id'], 'seen'), (string)$version);
        return true;
    }

    /**
     * @param string $state 'completed' or 'skipped'; kept from the first time
     */
    public function mark(string $uid, string $id, string $state): void {
        $key = TourValidator::stateKey($id, $state);
        if ($this->config->getUserValue($uid, 'introvox', $key, '') === '') {
            $this->config->setUserValue($uid, 'introvox', $key, (string)time());
        }
    }

    /**
     * A step of an automatic run was shown: kept when it is further than
     * what is stored for this version of the tour (TourStats)
     *
     * @param int $index The step's place in the run as this user saw it, from 1
     */
    public function markReached(string $uid, array $tour, string $step, int $index): void {
        $key = TourValidator::stateKey($tour['id'], 'reached');
        $stored = $this->config->getUserValue($uid, 'introvox', $key, '');
        $version = (int)$tour['version'];
        if (TourStats::replaces($stored === '' ? null : $stored, $version, $index)) {
            $this->config->setUserValue($uid, 'introvox', $key, TourStats::encode($version, $index, $step));
        }
    }

    /**
     * Whether a tour starts by itself for this user the next time they open
     * its page: they may get it, have not seen this version, did not switch
     * tours off, fit its audience ("new" users: their first login came after
     * the tour went on), and it is the time for it (TourSchedule).
     */
    public function due(IUser $user, array $tour): bool {
        if ($tour['id'] === TourValidator::WELCOME || !$this->tours->availableTo($tour, $user)) {
            return false;
        }
        if ($this->toursDisabled($user->getUID()) || $this->seen($user->getUID(), $tour['id']) >= (int)$tour['version']) {
            return false;
        }
        $firstLogin = $user->getFirstLogin();
        if (($tour['audience'] ?? 'everyone') === 'new' && ($firstLogin <= 0 || $firstLogin < (int)($tour['enabledAt'] ?? 0))) {
            return false;
        }
        return TourSchedule::allows($tour, $firstLogin, new \DateTimeImmutable('now', $this->timeZone->getTimeZone()));
    }
}
