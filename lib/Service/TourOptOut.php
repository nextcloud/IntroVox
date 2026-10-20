<?php

declare(strict_types=1);

namespace OCA\IntroVox\Service;

/**
 * Who, on the update that brings tours per app, counts as having switched
 * automatic tours off (tours_disabled). Before, there was one switch: a user
 * could turn the welcome tour off in their personal settings. Finishing or
 * skipping it set that same preference, so it alone says nothing.
 *
 * The rule (decision B in the design): the preference is on, the tour was
 * started, and it was neither finished nor skipped. Then the user turned it
 * off on purpose. Users from before 1.2, who have no markers at all, get app
 * tours like everyone else. A user who already has tours_disabled keeps it.
 *
 * Plain PHP, so the rule can be tested directly (lib/Migration/IntroduceTours).
 */
class TourOptOut {
    /**
     * @param array<string, string> $preferences The user's IntroVox values,
     *   by key, as stored (missing keys absent)
     */
    public static function optedOut(array $preferences): bool {
        if (array_key_exists('tours_disabled', $preferences)) {
            return false;
        }
        return ($preferences['wizard_disabled'] ?? '') === 'true'
            && ($preferences['wizard_started'] ?? '') !== ''
            && ($preferences['wizard_completed'] ?? '') === ''
            && ($preferences['wizard_skipped'] ?? '') === '';
    }
}
