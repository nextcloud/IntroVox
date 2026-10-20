<?php
/**
 * The checklist on the Dashboard: which tasks an admin's choice means, and
 * the Dashboard's default layout with or without it.
 */

declare(strict_types=1);

use OCA\IntroVox\Service\Checklist;

test('checklist: never chosen means every task; a choice keeps the widget\'s order', function (): void {
    assertSame(Checklist::TASKS, Checklist::chosen(''));
    assertSame(Checklist::TASKS, Checklist::chosen('not json'));
    assertSame(['upload', 'talk'], Checklist::chosen('["talk","upload"]'));
    // Unknown tasks, from an older or a tampered setting, are left out
    assertSame(['avatar'], Checklist::chosen('["avatar","bake-a-cake",3]'));
    assertSame([], Checklist::chosen('[]'));
});

test('checklist: an own task\'s page is a link on this Nextcloud, and nothing else', function (): void {
    foreach ([
        '/apps/spreed/' => '/apps/spreed/',
        'apps/spreed' => '/apps/spreed',
        ' /apps/files/?dir=/Handbook ' => '/apps/files/?dir=/Handbook',
        '/index.php/apps/deck/#/board/1' => '/apps/deck/#/board/1',
        '/index.php' => '/',
        '/call/abc123' => '/call/abc123',
        '/apps/files/?dir=/My%20files' => '/apps/files/?dir=/My%20files',
    ] as $input => $expected) {
        assertSame($expected, Checklist::page($input), $input);
    }
    foreach (['', '   ', '//evil.example/x', 'https://evil.example/', 'javascript:alert(1)', 'JavaScript:x', '/a b', "/a\nb", '/a\\b', '/"><script>', str_repeat('a', 301), 3, null] as $input) {
        assertSame(null, Checklist::page($input), json_encode($input));
    }
});

test('checklist: own tasks are checked as a whole, and keep their ids', function (): void {
    $n = 0;
    $newId = function () use (&$n): string {
        return 'c-' . str_pad((string)++$n, 8, '0', STR_PAD_LEFT);
    };
    [$tasks, $error] = Checklist::custom([
        ['title' => ' Open Talk ', 'text' => 'Say hello', 'page' => '/apps/spreed/'],
        ['id' => 'c-abcdefgh', 'title' => 'Read the handbook', 'page' => '/apps/files/?dir=/Handbook'],
        ['id' => 'not an id', 'title' => 'Deck', 'page' => 'apps/deck'],
    ], $newId);
    assertSame(null, $error);
    assertSame(['c-00000001', 'c-abcdefgh', 'c-00000002'], array_column($tasks, 'id'));
    assertSame(['Open Talk', 'Say hello', '/apps/spreed/'], [$tasks[0]['title'], $tasks[0]['text'], $tasks[0]['page']]);
    assertSame('', $tasks[1]['text']);
    foreach ([
        'invalid' => 'nope',
        'title' => [['title' => ' ', 'page' => '/apps/spreed/']],
        'text' => [['title' => 'x', 'text' => str_repeat('y', 121), 'page' => '/apps/spreed/']],
        'page' => [['title' => 'x', 'page' => 'https://evil.example/']],
        'too_many' => array_fill(0, 11, ['title' => 'x', 'page' => '/apps/spreed/']),
    ] as $reason => $input) {
        assertSame([null, $reason], Checklist::custom($input, $newId), $reason);
    }
    assertSame([null, 'invalid'], Checklist::custom([['id' => 'c-abcdefgh', 'title' => 'a', 'page' => '/'], ['id' => 'c-abcdefgh', 'title' => 'b', 'page' => '/']], $newId));
    assertSame([[], null], Checklist::custom([], $newId));
});

test('checklist: stored own tasks are read back, what no longer passes left out', function (): void {
    $stored = json_encode([
        ['id' => 'c-abcdefgh', 'title' => 'Open Talk', 'text' => '', 'page' => '/apps/spreed/'],
        ['id' => 'c-zzzzzzzz', 'title' => 'Evil', 'text' => '', 'page' => '//evil.example'],
        ['title' => 'No id', 'text' => '', 'page' => '/'],
    ]);
    assertSame(['c-abcdefgh'], array_column(Checklist::stored($stored), 'id'));
    assertSame([], Checklist::stored(''));
    assertSame([], Checklist::stored('{"a":1}'));
});

test('checklist: an own task\'s link carries what ticks it off, before any fragment', function (): void {
    assertSame('/apps/spreed/?introvox-check=c-abcdefgh', Checklist::withCheck('/apps/spreed/', 'c-abcdefgh'));
    assertSame('/apps/files/?dir=/H&introvox-check=c-abcdefgh', Checklist::withCheck('/apps/files/?dir=/H', 'c-abcdefgh'));
    assertSame('/apps/deck/?introvox-check=c-abcdefgh#/board/1', Checklist::withCheck('/apps/deck/#/board/1', 'c-abcdefgh'));
});

test('checklist: the default Dashboard gets it first, once, and loses only it', function (): void {
    $default = 'recommendations,spreed,mail,calendar';
    $with = Checklist::layout($default, true);
    assertSame('introvox-checklist,recommendations,spreed,mail,calendar', $with);
    assertSame($with, Checklist::layout($with, true));
    assertSame($default, Checklist::layout($with, false));
    assertSame('spreed,mail', Checklist::layout('spreed,introvox-checklist,,mail', false));
    assertSame('introvox-checklist', Checklist::layout('', true));
});
