<?php
/**
 * Which stored steps a user gets (StepValidator::isEnabled, ::visibleTo).
 * What passes here is sent to the browser: a step switched off as a draft,
 * or one for another group, must never get there, nor the group ids.
 */

declare(strict_types=1);

use OCA\IntroVox\Service\StepValidator;

test('step visibility: off in every form older exports wrote', function (): void {
    foreach ([false, 'false', 0, '0'] as $off) {
        assertTrue(!StepValidator::isEnabled(['id' => 'a', 'enabled' => $off]), var_export($off, true) . ' counts as on');
    }
    foreach ([true, 'true', 1, '1'] as $on) {
        assertTrue(StepValidator::isEnabled(['id' => 'a', 'enabled' => $on]), var_export($on, true) . ' counts as off');
    }
    assertTrue(StepValidator::isEnabled(['id' => 'a']), 'a step without the field is on');
    assertTrue(!StepValidator::isEnabled('a'), 'a string is a step');
});

test('step visibility: for everyone, or for one of the user\'s groups; group ids stay out', function (): void {
    $steps = [
        ['id' => 'all', 'visibleToGroups' => []],
        ['id' => 'staff', 'visibleToGroups' => ['staff']],
        ['id' => 'other', 'visibleToGroups' => ['other']],
        ['id' => 'draft', 'enabled' => false, 'visibleToGroups' => []],
        ['id' => 'broken', 'visibleToGroups' => 'staff'],
        'not a step',
    ];
    $visible = StepValidator::visibleTo($steps, ['staff', 'admin']);
    assertSame(['all', 'staff'], array_column($visible, 'id'));
    assertTrue(!array_key_exists('visibleToGroups', $visible[1]), 'group ids sent along');
    assertSame(['all'], array_column(StepValidator::visibleTo($steps, []), 'id'));
});
