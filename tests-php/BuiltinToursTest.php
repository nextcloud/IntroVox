<?php
/**
 * The tours IntroVox ships for Files, Talk, Deck and Calendar: each one a
 * valid tour whose steps pass the editor's own checks, in its own app.
 */

declare(strict_types=1);

use OCA\IntroVox\Service\BuiltinTours;
use OCA\IntroVox\Service\StepValidator;
use OCA\IntroVox\Service\TourValidator;

// Stands in for IL10N: the English source text
final class EnglishL10n {
    public function t(string $text): string {
        return $text;
    }
}

test('built-in tours: one for each app, each with a name', function (): void {
    $steps = BuiltinTours::stepsIn(new EnglishL10n());
    assertSame(array_keys(BuiltinTours::APPS), array_keys($steps));
    assertSame(array_keys(BuiltinTours::APPS), array_keys(BuiltinTours::names(new EnglishL10n())));
    foreach (array_keys(BuiltinTours::APPS) as $id) {
        assertTrue((bool)preg_match(TourValidator::ID_PATTERN, $id), $id . ' is no tour id');
        assertTrue(TourValidator::slug('X', [$id]) !== $id, 'slug can take ' . $id);
    }
});

test('built-in tours: every step passes the editor\'s checks and stays in its app', function (): void {
    foreach (BuiltinTours::stepsIn(new EnglishL10n()) as $id => $steps) {
        [$valid, $error] = (new StepValidator())->validateAll($steps);
        assertSame(null, $error, $id);
        assertTrue(count($valid) >= 3 && count($valid) <= 11, $id . ': ' . count($valid) . ' steps');
        // A click goes on to what it opened: never the last step
        assertSame('', $valid[count($valid) - 1]['advance'] ?? '', $id . ' ends on a click');
        $page = TourValidator::triggerPage(['type' => 'app', 'app' => BuiltinTours::APPS[$id]]);
        foreach ($valid as $step) {
            assertSame($page, $step['page'], $id . '/' . $step['id']);
            assertTrue(trim(strip_tags($step['text'])) !== '' && $step['title'] !== '', $id . '/' . $step['id'] . ' has no text');
        }
        // The first step introduces the app, in the middle of the page
        assertSame('', $valid[0]['attachTo'], $id . ' starts on an element');
    }
});

test('built-in tours: what an admin may change leaves where they start alone', function (): void {
    assertSame([], array_diff(BuiltinTours::EDITABLE, TourValidator::FIELDS));
    foreach (['name', 'trigger', 'mainLanguage'] as $fixed) {
        assertTrue(!in_array($fixed, BuiltinTours::EDITABLE, true), $fixed . ' is editable');
    }
});
