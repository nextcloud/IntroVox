<?php

declare(strict_types=1);

namespace OCA\IntroVox\Service;

/**
 * How far people get in a tour, from one value per user: the furthest step of
 * their last automatic run, as "<version>|<index>|<step id>" in the
 * preference tour_<id>_reached. Each user writes only their own value, so
 * nothing is lost when many people run a tour at once, and the admin only
 * ever sees totals.
 *
 * Plain PHP without Nextcloud dependencies, so it can be tested directly.
 */
class TourStats {
    // A step id as StepValidator allows it
    public const STEP_ID = '/^[A-Za-z0-9_.-]{1,100}$/D';
    private const PATTERN = '/^(\d{1,9})\|(\d{1,3})\|([A-Za-z0-9_.-]{1,100})$/D';

    public static function encode(int $version, int $index, string $step): string {
        return $version . '|' . $index . '|' . $step;
    }

    /**
     * @return array{version: int, index: int, step: string}|null
     */
    public static function decode(string $value): ?array {
        if (!preg_match(self::PATTERN, $value, $matches)) {
            return null;
        }
        return ['version' => (int)$matches[1], 'index' => (int)$matches[2], 'step' => $matches[3]];
    }

    /**
     * Whether a step just shown replaces what is stored: a later step in the
     * same version of the tour, or any step once the tour was shown again
     * (a new version). Going back a step changes nothing.
     */
    public static function replaces(?string $stored, int $version, int $index): bool {
        $current = $stored === null ? null : self::decode($stored);
        if ($current === null || $current['version'] < $version) {
            return true;
        }
        return $current['version'] === $version && $index > $current['index'];
    }

    /**
     * For each step, in the order given, how many people got at least that
     * far. Someone whose furthest step is no longer in the list (deleted, or
     * in another language with other ids) counts under "other".
     *
     * @param string[] $stepIds The steps in their current order
     * @param string[] $values The stored values, one per user
     * @return array{reached: array<string, int>, other: int, total: int}
     */
    public static function funnel(array $stepIds, array $values): array {
        $position = array_flip(array_values($stepIds));
        $atPosition = array_fill(0, count($stepIds), 0);
        $other = 0;
        $total = 0;
        foreach ($values as $value) {
            $decoded = is_string($value) ? self::decode($value) : null;
            if ($decoded === null) {
                continue;
            }
            $total++;
            if (!isset($position[$decoded['step']])) {
                $other++;
                continue;
            }
            $atPosition[$position[$decoded['step']]]++;
        }

        // At least step k: everyone whose furthest step is k or later
        $reached = [];
        $running = 0;
        for ($k = count($stepIds) - 1; $k >= 0; $k--) {
            $running += $atPosition[$k];
            $reached[$stepIds[$k]] = $running;
        }
        return ['reached' => array_reverse($reached, true), 'other' => $other, 'total' => $total];
    }
}
