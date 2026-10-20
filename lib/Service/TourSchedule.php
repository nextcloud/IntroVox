<?php

declare(strict_types=1);

namespace OCA\IntroVox\Service;

/**
 * When a tour may start by itself: not before a number of days after
 * someone's first login, and only between two dates (both included, in the
 * user's own time zone). Starting by hand and a share link ignore this; so
 * does the welcome tour, which has neither field.
 *
 * Plain PHP without Nextcloud dependencies, so it can be tested directly.
 */
class TourSchedule {
    /**
     * @param int $firstLogin The user's first login (Unix time); 0 or less
     *   when Nextcloud does not know it, which counts as long ago
     * @param \DateTimeImmutable $now The moment, in the time zone dates are
     *   read in
     */
    public static function allows(array $tour, int $firstLogin, \DateTimeImmutable $now): bool {
        $days = (int)($tour['startAfterDays'] ?? 0);
        if ($days > 0 && $firstLogin > 0 && $now->getTimestamp() < $firstLogin + $days * 86400) {
            return false;
        }
        $today = $now->format('Y-m-d');
        $from = (string)($tour['startFrom'] ?? '');
        $until = (string)($tour['startUntil'] ?? '');
        if ($from !== '' && $today < $from) {
            return false;
        }
        return $until === '' || $today <= $until;
    }
}
