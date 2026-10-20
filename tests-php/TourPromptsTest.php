<?php
/**
 * Translating and drafting tours with a language model: what is asked, and
 * how strictly the answer is read. Fixed answers stand in for the model.
 */

declare(strict_types=1);

use OCA\IntroVox\Service\StepValidator;
use OCA\IntroVox\Service\TourPrompts;

function tourSteps(): array {
    return [
        ['id' => 's-1', 'title' => '👋 Welcome', 'text' => '<p>Hi <strong>there</strong></p>', 'attachTo' => '', 'enabled' => true, 'visibleToGroups' => [], 'page' => '/apps/deck/'],
        ['id' => 's-2', 'title' => '📋 Boards', 'text' => '<p>Your boards</p>', 'attachTo' => '#app-navigation-vue', 'position' => 'right', 'enabled' => false, 'visibleToGroups' => ['staff'],
            'media' => ['file' => str_repeat('a', 32) . '.png', 'alt' => 'The board list', 'decorative' => false, 'size' => 'small']],
    ];
}

test('tour prompts: a translation sends only the words, with the ids', function (): void {
    $prompt = TourPrompts::translate(tourSteps(), 'English (en)', 'Nederlands (nl)');
    $json = json_decode(substr($prompt, strpos($prompt, '[')), true);
    assertSame([
        ['id' => 's-1', 'title' => '👋 Welcome', 'text' => '<p>Hi <strong>there</strong></p>'],
        ['id' => 's-2', 'title' => '📋 Boards', 'text' => '<p>Your boards</p>', 'alt' => 'The board list'],
    ], $json);
    assertTrue(str_contains($prompt, 'from English (en) to Nederlands (nl)'), 'languages named');
    assertTrue(!str_contains($prompt, '#app-navigation-vue') && !str_contains($prompt, 'staff'), 'selectors or groups sent');
});

test('tour prompts: the answer is read from code fences and chatter, and nothing else counts', function (): void {
    $array = '[{"id":"s-1","title":"👋 Welkom","text":"<p>Hoi</p>"}]';
    foreach (["```json\n$array\n```", "Here you go:\n$array\nGood luck!", $array, "As asked [see below]:\n$array"] as $answer) {
        assertSame('👋 Welkom', TourPrompts::readSteps($answer)[0]['title'] ?? null, $answer);
    }
    foreach (['', 'Sorry, I cannot do that.', '[]', '{"title":"x","text":"y"}', '[{"title":1,"text":"y"}]', '[{"title":"x"}]', '[{"title":"x","text":"y"', '["a"]'] as $answer) {
        assertSame(null, TourPrompts::readSteps($answer), 'accepted ' . json_encode($answer));
    }
});

test('tour prompts: a translation changes the words and keeps everything else', function (): void {
    $translated = TourPrompts::readSteps('[{"id":"s-2","title":"📋 Borden","text":"<p>Je borden</p>","alt":"De lijst met borden"},{"id":"s-1","title":"👋 Welkom","text":"<p>Hoi <strong>daar</strong></p>"}]');
    $result = TourPrompts::applyTranslation(tourSteps(), $translated);
    assertSame(['👋 Welkom', '📋 Borden'], array_column($result, 'title'));
    assertSame('De lijst met borden', $result[1]['media']['alt']);
    $original = tourSteps();
    foreach (['attachTo', 'enabled', 'visibleToGroups', 'page', 'position'] as $key) {
        assertSame($original[1][$key] ?? null, $result[1][$key] ?? null, $key);
    }
    [$valid, $error] = (new StepValidator())->validateAll($result);
    assertSame(null, $error);
    // A step left out, or left empty, refuses the whole answer
    assertSame(null, TourPrompts::applyTranslation(tourSteps(), [['id' => 's-1', 'title' => 'x', 'text' => 'y']]));
    assertSame(null, TourPrompts::applyTranslation(tourSteps(), [['id' => 's-1', 'title' => ' ', 'text' => 'y'], ['id' => 's-2', 'title' => 'x', 'text' => 'y']]));
});

test('tour prompts: a draft becomes valid, centered steps on the tour\'s page', function (): void {
    $prompt = TourPrompts::draft('the app "Deck"', 'How to make a card', 'Nederlands (nl)');
    assertTrue(str_contains($prompt, 'in Nextcloud about the app "Deck", in Nederlands (nl)') && str_contains($prompt, 'How to make a card'), $prompt);
    $answer = json_encode(array_fill(0, 9, ['title' => '🃏 Een kaart', 'text' => '<p>Klik op <strong>+</strong></p>', 'attachTo' => '#evil']));
    $steps = TourPrompts::draftSteps(TourPrompts::readSteps($answer), '/apps/deck/', 'ai-x');
    assertSame(TourPrompts::MAX_DRAFT_STEPS, count($steps));
    assertSame(['ai-x-1', ''], [$steps[0]['id'], $steps[0]['attachTo']]);
    assertSame('/apps/deck/', $steps[0]['page']);
    [$valid, $error] = (new StepValidator())->validateAll($steps);
    assertSame(null, $error);
    assertTrue(!isset(TourPrompts::draftSteps([['title' => 'x', 'text' => 'y']], '', 'ai')[0]['page']), 'page for a tour without one');
    // A long description is cut, not refused
    assertTrue(mb_strlen(TourPrompts::draft('Files', str_repeat('x', 5000), 'English')) < 4000, 'description not cut');
});

test('tour prompts: an answer cut off by the provider\'s length limit is told apart', function (): void {
    // As the OpenAI integration returned them with its default of 1000 tokens
    foreach (['', "  \n", "[\n  {\n    \"title\": \"🗺️ Overzicht\",\n    \"text\": \"<p>Deze tour</p>\"\n  },\n  {\n    \"title\": \"➕ Een nieuw bord", '[{"title":"a","text":"b"},', "```json\n[{\"title\":\"a\",\"text\":\"b\"}"] as $answer) {
        assertTrue(TourPrompts::cutOff($answer), 'not seen as cut off: ' . json_encode($answer));
    }
    // An answer that ended, but is no use, is not cut off
    foreach (['Sorry, I cannot do that.', '[{"title":"a","text":"b"}]', '[{"title":1,"text":"b"}]', "```json\n[{\"title\":\"a\"}]\n```"] as $answer) {
        assertTrue(!TourPrompts::cutOff($answer), 'seen as cut off: ' . json_encode($answer));
    }
});
