<?php
/**
 * Tours per app: the fixed form of a trigger (access is checked on it), ids,
 * the fields an admin may set, and who counts as having opted out on update.
 */

declare(strict_types=1);

use OCA\IntroVox\Service\TourOptOut;
use OCA\IntroVox\Service\TourSchedule;
use OCA\IntroVox\Service\TourValidator;

test('tour trigger: every way to write an app is that app', function (): void {
    foreach (['/apps/spreed/', '/index.php/apps/spreed/', 'apps/spreed', '/apps/spreed/conversation/abc', '/call/abc12345', '/index.php/call/abc'] as $page) {
        assertSame(['type' => 'app', 'app' => 'spreed'], TourValidator::pageTrigger($page), $page);
    }
    assertSame(['type' => 'app', 'app' => 'files'], TourValidator::pageTrigger('/f/123'));
    assertSame(['type' => 'app', 'app' => 'deck'], TourValidator::pageTrigger('/index.php/apps/deck/board/4'));
});

test('tour trigger: other pages keep their path', function (): void {
    assertSame(['type' => 'page', 'page' => '/settings/user'], TourValidator::pageTrigger('/settings/user/'));
    assertSame(['type' => 'page', 'page' => '/settings/user/notifications'], TourValidator::pageTrigger('/index.php/settings/user/notifications'));
});

test('tour trigger: nothing that leads elsewhere or hides a path', function (): void {
    $bad = ['', '/', '/index.php', '/index.php/', '//evil.example/apps/spreed', 'https://evil.example/', '/apps/%2e%2e/x',
        '/apps/../settings', '/apps/./spreed', '/settings/%2fuser', '/settings\\user', '/apps/Spreed/', "/apps/spr\need/", "/settings/user\n/x",
        '/javascript:alert(1)', '/settings/user?x=1', '/settings/user#x', str_repeat('/a', 101), null, 42, ['/apps/spreed/']];
    foreach ($bad as $page) {
        assertSame(null, TourValidator::pageTrigger($page), 'accepted ' . json_encode($page));
    }
});

test('tour id: an ASCII slug from the name, unique, never welcome', function (): void {
    assertSame('talk', TourValidator::slug('Talk', []));
    assertSame('talk-2', TourValidator::slug('Talk', ['talk']));
    assertSame('talk-3', TourValidator::slug('TALK!', ['talk', 'talk-2']));
    assertSame('tour', TourValidator::slug('Welcome', []));
    assertSame('tour', TourValidator::slug('👋', []));
    $long = TourValidator::slug(str_repeat('Calendar and contacts ', 5), []);
    assertTrue(preg_match(TourValidator::ID_PATTERN, $long) === 1, 'not a valid id: ' . $long);
    assertTrue(!str_contains(TourValidator::slug('my_tour', []), '_'), 'underscore in an id');
});

test('tour keys stay under the 64 characters Nextcloud allows', function (): void {
    $id = str_repeat('a', 32);
    assertTrue(strlen(TourValidator::stepsKey($id, 'pt_BR')) <= 64, 'steps key too long');
    assertTrue(strlen(TourValidator::stateKey($id, 'completed')) <= 64, 'state key too long');
});

test('tour fields: a valid app tour', function (): void {
    [$clean, $error] = (new TourValidator())->validate([
        'name' => '  Talk  ', 'trigger' => ['type' => 'app', 'app' => 'spreed'], 'visibleToGroups' => ['staff', 'staff'],
        'mainLanguage' => 'nl', 'audience' => 'new', 'enabled' => true, 'id' => 'evil', 'version' => 99,
    ]);
    assertSame(null, $error);
    assertSame(['name' => 'Talk', 'trigger' => ['type' => 'app', 'app' => 'spreed'], 'visibleToGroups' => ['staff'],
        'mainLanguage' => 'nl', 'audience' => 'new', 'enabled' => true, 'startAfterDays' => 0, 'startFrom' => '', 'startUntil' => ''], $clean);
    assertSame(TourValidator::FIELDS, array_keys($clean), 'every field, in the order of FIELDS');
    assertSame([], array_diff(array_keys(TourValidator::DEFAULTS), TourValidator::FIELDS), 'a default for a field that does not exist');
});

test('tour fields: a tour that starts anywhere, and when it may start by itself', function (): void {
    [$clean, $error] = (new TourValidator())->validate([
        'name' => 'Tips', 'trigger' => ['type' => 'any', 'page' => '/ignored'],
        'startAfterDays' => 7, 'startFrom' => '2026-10-01', 'startUntil' => '2026-12-31',
    ]);
    assertSame(null, $error);
    assertSame([['type' => 'any'], 7, '2026-10-01', '2026-12-31'], [$clean['trigger'], $clean['startAfterDays'], $clean['startFrom'], $clean['startUntil']]);
    [$sameDay] = (new TourValidator())->validate(['name' => 'X', 'trigger' => ['type' => 'any'], 'startFrom' => '2026-10-01', 'startUntil' => '2026-10-01']);
    assertTrue($sameDay !== null, 'one day only');
});

test('tour trigger: the page each trigger opens', function (): void {
    assertSame('/apps/spreed/', TourValidator::triggerPage(['type' => 'app', 'app' => 'spreed']));
    assertSame('/settings/user', TourValidator::triggerPage(['type' => 'page', 'page' => '/settings/user']));
    assertSame('', TourValidator::triggerPage(['type' => 'any']));
    assertSame('', TourValidator::triggerPage(['type' => 'login']));
});

test('tour fields: a page trigger is put in its fixed form', function (): void {
    [$clean] = (new TourValidator())->validate(['name' => 'Talk', 'trigger' => ['type' => 'page', 'page' => '/index.php/apps/spreed/']]);
    assertSame(['type' => 'app', 'app' => 'spreed'], $clean['trigger']);
});

test('tour fields: wrong values are refused', function (): void {
    $validator = new TourValidator();
    $base = ['name' => 'X', 'trigger' => ['type' => 'app', 'app' => 'deck']];
    $bad = [
        ['name' => ''] + $base,
        ['name' => str_repeat('x', 101)] + $base,
        ['trigger' => ['type' => 'login']] + $base,
        ['trigger' => ['type' => 'app', 'app' => '../spreed']] + $base,
        ['trigger' => ['type' => 'page', 'page' => '//evil.example']] + $base,
        ['visibleToGroups' => 'admin'] + $base,
        ['mainLanguage' => 'english'] + $base,
        ['audience' => 'all'] + $base,
        ['enabled' => 'yes'] + $base,
        ['startAfterDays' => -1] + $base,
        ['startAfterDays' => 366] + $base,
        ['startAfterDays' => '7'] + $base,
        ['startFrom' => '2026-02-30'] + $base,
        ['startFrom' => '1-10-2026'] + $base,
        ['startUntil' => '2026-10-01T00:00'] + $base,
        ['startFrom' => '2026-12-01', 'startUntil' => '2026-11-30'] + $base,
    ];
    foreach ($bad as $input) {
        assertTrue($validator->validate($input)[1] !== null, 'accepted ' . json_encode($input));
    }
    assertTrue($validator->validate(['a', 'b'])[1] !== null, 'accepted a list');
});

test('tours on update: only who turned the welcome tour off on purpose opts out', function (): void {
    $optedOut = ['wizard_disabled' => 'true', 'wizard_started' => '1700000000'];
    assertTrue(TourOptOut::optedOut($optedOut), 'started, then switched off');
    assertTrue(!TourOptOut::optedOut($optedOut + ['wizard_completed' => '1700000100']), 'finished it');
    assertTrue(!TourOptOut::optedOut($optedOut + ['wizard_skipped' => '1700000100']), 'skipped it');
    assertTrue(!TourOptOut::optedOut(['wizard_disabled' => 'true']), 'from before 1.2, no markers');
    assertTrue(!TourOptOut::optedOut(['wizard_started' => '1700000000']), 'still open');
    assertTrue(!TourOptOut::optedOut($optedOut + ['tours_disabled' => 'false']), 'already chose');
    assertTrue(!TourOptOut::optedOut([]), 'never saw IntroVox');
});

test('tour trigger: the same cases as src/utils/pages.mjs (fixtures/page-triggers.json)', function (): void {
    foreach (json_decode(fixture('page-triggers.json'), true) as [$input, $expected]) {
        assertSame($expected, TourValidator::pageTrigger($input), json_encode($input));
    }
});

test('tour schedule: not before some days after the first login', function (): void {
    $tour = ['startAfterDays' => 7];
    $firstLogin = (new DateTimeImmutable('2026-10-01 09:00', new DateTimeZone('UTC')))->getTimestamp();
    assertTrue(!TourSchedule::allows($tour, $firstLogin, new DateTimeImmutable('2026-10-08 08:59', new DateTimeZone('UTC'))), 'a minute early');
    assertTrue(TourSchedule::allows($tour, $firstLogin, new DateTimeImmutable('2026-10-08 09:00', new DateTimeZone('UTC'))), 'on time');
    assertTrue(TourSchedule::allows($tour, 0, new DateTimeImmutable('2026-10-01', new DateTimeZone('UTC'))), 'an unknown first login counts as long ago');
    assertTrue(TourSchedule::allows([], $firstLogin, new DateTimeImmutable('2026-10-01 09:00', new DateTimeZone('UTC'))), 'no rule');
});

test('tour schedule: only between two dates, both included, in the user\'s time zone', function (): void {
    $tour = ['startFrom' => '2026-10-01', 'startUntil' => '2026-10-31'];
    $at = static fn (string $time, string $zone = 'UTC') => new DateTimeImmutable($time, new DateTimeZone($zone));
    assertTrue(!TourSchedule::allows($tour, 0, $at('2026-09-30 23:59')), 'the day before');
    assertTrue(TourSchedule::allows($tour, 0, $at('2026-10-01 00:00')), 'the first day');
    assertTrue(TourSchedule::allows($tour, 0, $at('2026-10-31 23:59')), 'the last day');
    assertTrue(!TourSchedule::allows($tour, 0, $at('2026-11-01 00:00')), 'the day after');
    // 23:30 UTC on 30 September is already 1 October in Amsterdam
    assertTrue(TourSchedule::allows($tour, 0, $at('2026-09-30 23:30')->setTimezone(new DateTimeZone('Europe/Amsterdam'))), 'in the user\'s zone');
    assertTrue(TourSchedule::allows(['startFrom' => '2026-10-01'], 0, $at('2030-01-01')), 'open-ended');
    assertTrue(!TourSchedule::allows(['startUntil' => '2026-10-01'], 0, $at('2026-10-02')), 'until only');
});
