<?php
/**
 * The media block of a step (StepValidator::validateMedia). What passes here
 * reaches every user's tour; the file itself is checked by MediaService.
 */

declare(strict_types=1);

use OCA\IntroVox\Service\StepValidator;

$validate = static function (array $media): array {
    $step = ['id' => 'one', 'title' => 'One', 'text' => '', 'media' => $media];
    return (new StepValidator())->validate($step);
};
$file = str_repeat('a1', 16);

test('step media: an image with alt text', function () use ($validate, $file): void {
    [$clean, $error] = $validate(['file' => "$file.png", 'alt' => '  The apps menu  ', 'width' => 99999, 'animated' => true]);
    assertSame(null, $error);
    assertSame(['file' => "$file.png", 'alt' => 'The apps menu', 'decorative' => false, 'size' => 'full'], $clean['media']);
});

test('step media: alt text is required unless the image is decorative', function () use ($validate, $file): void {
    assertTrue($validate(['file' => "$file.jpg", 'alt' => '   '])[1] !== null, 'empty alt accepted');
    [$clean, $error] = $validate(['file' => "$file.jpg", 'alt' => 'ignored', 'decorative' => true]);
    assertSame(null, $error);
    assertSame('', $clean['media']['alt']);
});

test('step media: a video gets a playback mode and optional captions', function () use ($validate, $file): void {
    [$clean, $error] = $validate(['file' => "$file.mp4", 'alt' => 'Calling', 'playback' => 'loop', 'captions' => "$file.vtt"]);
    assertSame(null, $error);
    assertSame('loop', $clean['media']['playback']);
    assertSame("$file.vtt", $clean['media']['captions']);
    [$clean] = $validate(['file' => "$file.webm", 'alt' => 'Calling']);
    assertSame('controls', $clean['media']['playback']);
    assertTrue(!isset($clean['media']['captions']), 'captions without a file');
});

test('step media: only IntroVox media ids, never a path or a URL', function () use ($validate, $file): void {
    foreach (['https://example.com/a.png', '../../etc/passwd', "$file.svg", "$file.png\n", strtoupper($file) . '.png', "$file.vtt", 'a.png'] as $bad) {
        assertTrue($validate(['file' => $bad, 'alt' => 'x'])[1] !== null, 'accepted ' . json_encode($bad));
    }
    assertTrue($validate(['file' => "$file.mp4", 'alt' => 'x', 'captions' => 'https://example.com/a.vtt'])[1] !== null, 'foreign captions');
});

test('step media: wrong shapes and values are refused', function () use ($validate, $file): void {
    $step = ['id' => 'one', 'title' => 'One', 'text' => '', 'media' => ['a', 'b']];
    assertTrue((new StepValidator())->validate($step)[1] !== null, 'a list as media');
    assertTrue($validate(['file' => "$file.png", 'alt' => str_repeat('x', 301)])[1] !== null, 'alt too long');
    assertTrue($validate(['file' => "$file.png", 'alt' => 'x', 'size' => 'huge'])[1] !== null, 'size');
    assertTrue($validate(['file' => "$file.mp4", 'alt' => 'x', 'playback' => 'autoplay'])[1] !== null, 'playback');
    assertTrue($validate(['file' => "$file.png", 'alt' => 'x', 'decorative' => 'yes'])[1] !== null, 'decorative');
});

test('step media: a step without media stays without', function (): void {
    [$clean, $error] = (new StepValidator())->validate(['id' => 'one', 'title' => 'One', 'text' => '']);
    assertSame(null, $error);
    assertTrue(!array_key_exists('media', $clean), 'media added');
});
