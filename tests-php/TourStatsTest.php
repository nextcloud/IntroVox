<?php
/**
 * How far people get in a tour: one value per user, the furthest step of
 * their last automatic run, and the totals the admin sees.
 */

declare(strict_types=1);

use OCA\IntroVox\Service\TourStats;

test('tour stats: a value reads back, anything else is ignored', function (): void {
    assertSame(['version' => 3, 'index' => 2, 'step' => 'files.1'], TourStats::decode(TourStats::encode(3, 2, 'files.1')));
    foreach (['', '3|2', '3|x|files', '-1|2|files', '3|2|a b', '3|2|' . str_repeat('a', 101), '3|2|files|x', "3|2|files\n"] as $bad) {
        assertSame(null, TourStats::decode($bad), 'accepted ' . json_encode($bad));
    }
});

test('tour stats: only a later step, or a new run after "Show again", replaces the value', function (): void {
    assertTrue(TourStats::replaces(null, 1, 1), 'nothing stored yet');
    assertTrue(TourStats::replaces('garbage', 1, 1), 'unreadable value');
    assertTrue(TourStats::replaces(TourStats::encode(1, 2, 'b'), 1, 3), 'a later step');
    assertTrue(!TourStats::replaces(TourStats::encode(1, 3, 'c'), 1, 2), 'going back a step');
    assertTrue(!TourStats::replaces(TourStats::encode(1, 3, 'c'), 1, 3), 'the same step again');
    assertTrue(TourStats::replaces(TourStats::encode(1, 5, 'e'), 2, 1), 'shown again: the new run starts over');
    assertTrue(!TourStats::replaces(TourStats::encode(3, 1, 'a'), 2, 4), 'a run of an older version');
});

test('tour stats: each step counts everyone who got at least that far', function (): void {
    $values = [
        TourStats::encode(1, 1, 'a'),
        TourStats::encode(1, 2, 'b'),
        TourStats::encode(1, 2, 'b'),
        TourStats::encode(1, 3, 'c'),
        TourStats::encode(1, 4, 'gone'),
        'unreadable',
    ];
    assertSame(['reached' => ['a' => 4, 'b' => 3, 'c' => 1], 'other' => 1, 'total' => 5], TourStats::funnel(['a', 'b', 'c'], $values));
});

test('tour stats: the current order decides, not the order people saw', function (): void {
    // Steps reordered after people ran the tour: c is now second
    $values = [TourStats::encode(1, 3, 'c'), TourStats::encode(1, 2, 'b')];
    assertSame(['reached' => ['a' => 2, 'c' => 2, 'b' => 1], 'other' => 0, 'total' => 2], TourStats::funnel(['a', 'c', 'b'], $values));
});

test('tour stats: no steps or no people', function (): void {
    assertSame(['reached' => [], 'other' => 1, 'total' => 1], TourStats::funnel([], [TourStats::encode(1, 1, 'a')]));
    assertSame(['reached' => ['a' => 0, 'b' => 0], 'other' => 0, 'total' => 0], TourStats::funnel(['a', 'b'], []));
});
