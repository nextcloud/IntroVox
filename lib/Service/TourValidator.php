<?php

declare(strict_types=1);

namespace OCA\IntroVox\Service;

/**
 * Checks a tour before it is stored: the welcome tour, or a tour that starts
 * in an app or on a page. Whatever passes here decides who gets a tour and
 * where, so a trigger is reduced to one fixed form the server also checks
 * access on: /index.php/apps/spreed/ and /call/abc are both app "spreed".
 *
 * Plain PHP without Nextcloud dependencies, so it can be tested directly.
 */
class TourValidator {
    public const WELCOME = 'welcome';
    public const MAX_TOURS = 50;
    public const ID_PATTERN = '/^[a-z0-9][a-z0-9-]{0,31}$/D';
    // Nextcloud app ids: lowercase letters, digits and underscores
    public const APP_PATTERN = '/^[a-z][a-z0-9_]{0,63}$/D';
    public const LANG_PATTERN = '/^[a-z]{2}(_[A-Z]{2})?$/D';
    private const MAX_NAME = 100;
    private const MAX_PAGE = 200;
    private const MAX_GROUP = 255;
    private const MAX_DAYS = 365;
    private const DATE_PATTERN = '/^\d{4}-\d{2}-\d{2}$/D';

    /**
     * What an admin may set on a tour for an app or page; the id, version
     * and enabledAt are the server's. The one list the repository, the
     * controller and tour packages work from.
     */
    public const FIELDS = ['name', 'trigger', 'visibleToGroups', 'mainLanguage', 'audience', 'enabled', 'startAfterDays', 'startFrom', 'startUntil'];

    /**
     * The fields a new tour, or one stored before they existed, has when
     * nothing was given
     */
    public const DEFAULTS = ['visibleToGroups' => [], 'mainLanguage' => 'en', 'audience' => 'everyone', 'enabled' => false, 'startAfterDays' => 0, 'startFrom' => '', 'startUntil' => ''];

    /**
     * A page an admin typed or picked, in the fixed form the server checks:
     * an app (/apps/<id>/…, and the short routes /call/ and /f/), or a plain
     * page of this Nextcloud. Mirrors pageTrigger() in src/utils/pages.mjs.
     *
     * @return array{type: string, app?: string, page?: string}|null Null for
     *   anything that is not a plain path here: another host, a scheme,
     *   escapes (%), dot segments, backslashes
     */
    public static function pageTrigger(mixed $input): ?array {
        if (!is_string($input)) {
            return null;
        }
        $path = trim($input);
        if ($path === '' || mb_strlen($path) > self::MAX_PAGE) {
            return null;
        }
        if ($path[0] !== '/') {
            $path = '/' . $path;
        }
        if (preg_match('#^/index\.php(/|$)#D', $path)) {
            $path = substr($path, strlen('/index.php'));
        }
        // Only letters, digits, - _ and slashes: no %, no dots, no \, no :,
        // no // (another host)
        if (!preg_match('#^(/[A-Za-z0-9_-]+)+/?$#D', $path)) {
            return null;
        }
        if (preg_match('#^/call(/|$)#', $path)) {
            return ['type' => 'app', 'app' => 'spreed'];
        }
        if (preg_match('#^/f(/|$)#', $path)) {
            return ['type' => 'app', 'app' => 'files'];
        }
        if (preg_match('#^/apps/([^/]+)#', $path, $matches)) {
            return preg_match(self::APP_PATTERN, $matches[1]) ? ['type' => 'app', 'app' => $matches[1]] : null;
        }
        return ['type' => 'page', 'page' => rtrim($path, '/')];
    }

    /**
     * The page a trigger opens: the app's start page, the page itself, or ''
     * for a tour that starts anywhere (and the welcome tour). Mirrors
     * triggerPage() in src/utils/pages.mjs.
     */
    public static function triggerPage(array $trigger): string {
        return match ($trigger['type'] ?? '') {
            'app' => '/apps/' . $trigger['app'] . '/',
            'page' => (string)$trigger['page'],
            default => '',
        };
    }

    /**
     * An id from a tour's name: an ASCII slug, never "welcome", unique among
     * the ids there are. No underscores, so tour_steps_<id>_<lang> reads back
     * unambiguously.
     *
     * @param string[] $taken
     */
    public static function slug(string $name, array $taken): string {
        $ascii = strtolower($name);
        if (function_exists('iconv')) {
            $converted = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $name);
            if (is_string($converted) && $converted !== '') {
                $ascii = strtolower($converted);
            }
        }
        $base = trim(preg_replace('/[^a-z0-9]+/', '-', $ascii) ?? '', '-');
        $base = substr($base, 0, 28);
        $base = rtrim($base, '-');
        if ($base === '' || $base === self::WELCOME) {
            $base = 'tour';
        }
        $id = $base;
        for ($n = 2; in_array($id, $taken, true) || $id === self::WELCOME; $n++) {
            $id = $base . '-' . $n;
        }
        return $id;
    }

    /**
     * Checks the fields an admin may set on a tour for an app or page
     * (FIELDS); missing ones get their DEFAULTS
     *
     * @return array{0: ?array, 1: ?string} The clean fields, or an error
     */
    public function validate(mixed $input): array {
        if (!is_array($input) || array_is_list($input)) {
            return [null, 'tour must be an object'];
        }
        $name = $input['name'] ?? null;
        if (!is_string($name) || trim($name) === '' || mb_strlen($name) > self::MAX_NAME) {
            return [null, 'name must be text of 1 to ' . self::MAX_NAME . ' characters'];
        }

        $trigger = $input['trigger'] ?? null;
        if (!is_array($trigger)) {
            return [null, 'trigger must be an app or a page'];
        }
        if (($trigger['type'] ?? null) === 'app') {
            $app = $trigger['app'] ?? null;
            if (!is_string($app) || !preg_match(self::APP_PATTERN, $app)) {
                return [null, 'trigger.app is not an app id'];
            }
            $cleanTrigger = ['type' => 'app', 'app' => $app];
        } elseif (($trigger['type'] ?? null) === 'page') {
            $cleanTrigger = self::pageTrigger($trigger['page'] ?? null);
            if ($cleanTrigger === null) {
                return [null, 'trigger.page must be a path on this Nextcloud, such as /settings/user'];
            }
        } elseif (($trigger['type'] ?? null) === 'any') {
            $cleanTrigger = ['type' => 'any'];
        } else {
            return [null, 'trigger must be an app, a page or any'];
        }

        $groups = $input['visibleToGroups'] ?? [];
        if (!is_array($groups) || !array_is_list($groups)) {
            return [null, 'visibleToGroups must be a list of group ids'];
        }
        foreach ($groups as $group) {
            if (!is_string($group) || $group === '' || mb_strlen($group) > self::MAX_GROUP) {
                return [null, 'visibleToGroups must be a list of group ids'];
            }
        }

        $language = $input['mainLanguage'] ?? 'en';
        if (!is_string($language) || !preg_match(self::LANG_PATTERN, $language)) {
            return [null, 'mainLanguage must be a language code such as en or pt_BR'];
        }
        $audience = $input['audience'] ?? 'everyone';
        if (!in_array($audience, ['everyone', 'new'], true)) {
            return [null, 'audience must be everyone or new'];
        }
        $enabled = $input['enabled'] ?? false;
        if (!is_bool($enabled)) {
            return [null, 'enabled must be true or false'];
        }

        // When it may start by itself (TourSchedule)
        $days = $input['startAfterDays'] ?? 0;
        if (!is_int($days) || $days < 0 || $days > self::MAX_DAYS) {
            return [null, 'startAfterDays must be a whole number from 0 to ' . self::MAX_DAYS];
        }
        $dates = [];
        foreach (['startFrom', 'startUntil'] as $key) {
            $date = $input[$key] ?? '';
            if ($date !== '' && !self::isDate($date)) {
                return [null, $key . ' must be a date such as 2026-10-01, or empty'];
            }
            $dates[$key] = $date;
        }
        if ($dates['startFrom'] !== '' && $dates['startUntil'] !== '' && $dates['startFrom'] > $dates['startUntil']) {
            return [null, 'startFrom must not be after startUntil'];
        }

        return [[
            'name' => trim($name),
            'trigger' => $cleanTrigger,
            'visibleToGroups' => array_values(array_unique($groups)),
            'mainLanguage' => $language,
            'audience' => $audience,
            'enabled' => $enabled,
            'startAfterDays' => $days,
            'startFrom' => $dates['startFrom'],
            'startUntil' => $dates['startUntil'],
        ], null];
    }

    /**
     * A real calendar day as YYYY-MM-DD
     */
    private static function isDate(mixed $value): bool {
        if (!is_string($value) || !preg_match(self::DATE_PATTERN, $value)) {
            return false;
        }
        [$year, $month, $day] = array_map('intval', explode('-', $value));
        return checkdate($month, $day, $year);
    }

    /**
     * Where a tour's steps are stored for one language
     */
    public static function stepsKey(string $id, string $language): string {
        return 'tour_steps_' . $id . '_' . $language;
    }

    /**
     * Per-user state of a tour: seen (the version it started at), completed,
     * skipped
     */
    public static function stateKey(string $id, string $state): string {
        return 'tour_' . $id . '_' . $state;
    }
}
