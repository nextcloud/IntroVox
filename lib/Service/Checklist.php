<?php

declare(strict_types=1);

namespace OCA\IntroVox\Service;

/**
 * The checklist on the Dashboard: which tasks there are, in what order, which
 * of them an admin chose, an admin's own tasks, and the Dashboard's default
 * layout with or without it. What counts as done is ChecklistService's.
 *
 * Plain PHP without Nextcloud dependencies, so it can be tested directly.
 */
class Checklist {
    public const WIDGET_ID = 'introvox-checklist';
    // In the order the widget shows them
    public const TASKS = ['welcome', 'upload', 'avatar', 'client', 'talk', 'twofactor'];

    // An admin's own tasks: a page of this Nextcloud, ticked off once opened
    // from the list
    public const MAX_CUSTOM = 10;
    public const CUSTOM_ID = '/^c-[a-z0-9]{8}$/D';
    // On the link of an own task; src/main.js takes it off and reports it
    public const CHECK_PARAM = 'introvox-check';
    private const MAX_TITLE = 60;
    private const MAX_TEXT = 120;
    private const MAX_PAGE = 300;

    /**
     * A page of this Nextcloud as an admin typed it: a path, with a query or
     * a fragment if need be ("/apps/files/?dir=/Handbook"). It always becomes
     * a link on this Nextcloud, so no other site and no "javascript:".
     *
     * @return string|null Null for anything that is not such a path
     */
    public static function page(mixed $input): ?string {
        if (!is_string($input)) {
            return null;
        }
        $page = trim($input);
        // An address of its own (https:, javascript:) is no page here
        if ($page === '' || mb_strlen($page) > self::MAX_PAGE || preg_match('/^[a-z][a-z0-9+.\-]*:/i', $page)) {
            return null;
        }
        if ($page[0] !== '/') {
            $page = '/' . $page;
        }
        if (preg_match('#^/index\.php(?=[/?\#]|$)#', $page)) {
            $page = substr($page, strlen('/index.php')) ?: '/';
            $page = $page[0] === '/' ? $page : '/' . $page;
        }
        // One leading slash (// is another host), and nothing a URL does not hold as is
        if (str_starts_with($page, '//') || preg_match('/[\s\\\\<>"\'`\x00-\x1f\x7f]/u', $page)) {
            return null;
        }
        return $page;
    }

    /**
     * An admin's own tasks, checked as a whole
     *
     * @param mixed $input [{ id?, title, text?, page }], in their order
     * @param callable(): string $newId An id for a task that has none yet
     * @return array{0: array[]|null, 1: string|null} The tasks, or the
     *   reason: invalid, too_many, title, text or page
     */
    public static function custom(mixed $input, callable $newId): array {
        if (!is_array($input) || !array_is_list($input)) {
            return [null, 'invalid'];
        }
        if (count($input) > self::MAX_CUSTOM) {
            return [null, 'too_many'];
        }
        $tasks = [];
        foreach ($input as $item) {
            if (!is_array($item)) {
                return [null, 'invalid'];
            }
            $title = is_string($item['title'] ?? null) ? trim($item['title']) : '';
            $text = is_string($item['text'] ?? null) ? trim($item['text']) : '';
            $page = self::page($item['page'] ?? null);
            if ($title === '' || mb_strlen($title) > self::MAX_TITLE) {
                return [null, 'title'];
            }
            if (mb_strlen($text) > self::MAX_TEXT) {
                return [null, 'text'];
            }
            if ($page === null) {
                return [null, 'page'];
            }
            $id = is_string($item['id'] ?? null) && preg_match(self::CUSTOM_ID, $item['id']) ? $item['id'] : $newId();
            $tasks[] = ['id' => $id, 'title' => $title, 'text' => $text, 'page' => $page];
        }
        // An id twice would tick off two tasks at once
        if (count(array_unique(array_column($tasks, 'id'))) !== count($tasks)) {
            return [null, 'invalid'];
        }
        return [$tasks, null];
    }

    /**
     * The stored own tasks; anything that no longer passes is left out
     *
     * @return array[]
     */
    public static function stored(string $json): array {
        $decoded = json_decode($json, true);
        $tasks = [];
        foreach (is_array($decoded) ? $decoded : [] as $item) {
            [$checked] = self::custom([$item], static fn (): string => '');
            if ($checked !== null && $checked[0]['id'] !== '') {
                $tasks[] = $checked[0];
            }
        }
        return array_slice($tasks, 0, self::MAX_CUSTOM);
    }

    /**
     * The page of an own task, with what ticks it off when it is opened
     */
    public static function withCheck(string $page, string $id): string {
        $fragment = '';
        $hash = strpos($page, '#');
        if ($hash !== false) {
            $fragment = substr($page, $hash);
            $page = substr($page, 0, $hash);
        }
        return $page . (str_contains($page, '?') ? '&' : '?') . self::CHECK_PARAM . '=' . $id . $fragment;
    }

    /**
     * The tasks an admin chose, from the stored setting: known ones only, in
     * the widget's order. Never chosen means all of them.
     *
     * @return string[]
     */
    public static function chosen(string $stored): array {
        $list = json_decode($stored, true);
        if (!is_array($list)) {
            return self::TASKS;
        }
        return array_values(array_intersect(self::TASKS, $list));
    }

    /**
     * A Dashboard layout (widget ids, comma separated) with the checklist
     * first, or without it; the other widgets keep their order
     */
    public static function layout(string $layout, bool $with): string {
        $ids = array_values(array_filter(explode(',', $layout), static fn (string $id): bool => $id !== '' && $id !== self::WIDGET_ID));
        return implode(',', $with ? [self::WIDGET_ID, ...$ids] : $ids);
    }
}
