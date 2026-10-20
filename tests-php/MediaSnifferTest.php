<?php
/**
 * MediaSniffer: the type comes from the bytes, never from a name or a
 * browser-supplied MIME type.
 */

declare(strict_types=1);

use OCA\IntroVox\Media\MediaSniffer;

test('sniffer: detects every supported format from its first bytes', function (): void {
    $cases = [
        'png-dirty.png' => 'png',
        'png-apng.png' => 'png',
        'jpeg-phone.jpg' => 'jpg',
        'jpeg-progressive.jpg' => 'jpg',
        'gif-dirty.gif' => 'gif',
        'mp4-udta.mp4' => 'mp4',
        'mp4-noaudio.mp4' => 'mp4',
        'webm-tags.webm' => 'webm',
        'webm-live.webm' => 'webm',
    ];
    foreach ($cases as $file => $type) {
        assertSame($type, MediaSniffer::detect(substr(fixture($file), 0, 4096)), $file);
    }
    assertSame('webp', MediaSniffer::detect("RIFF\x24\x00\x00\x00WEBPVP8 \x18\x00\x00\x00"));
    assertSame('gif', MediaSniffer::detect("GIF87a\x01\x00\x01\x00"));
    assertSame('vtt', MediaSniffer::detect("WEBVTT\n\n00:00.000 --> 00:01.000\nHello\n"));
});

test('sniffer: an SVG, HTML or PDF named .png is unknown', function (): void {
    $cases = [
        '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
        '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>',
        "<!DOCTYPE html>\n<html><body>hi</body></html>",
        '<html><script>alert(1)</script>',
        "%PDF-1.7\n%\xE2\xE3\xCF\xD3",
        'just some text',
        "PK\x03\x04\x14\x00",
        '',
    ];
    foreach ($cases as $head) {
        assertSame(null, MediaSniffer::detect($head), substr($head, 0, 20));
    }
});

test('sniffer: truncated signatures are unknown', function (): void {
    $cases = ["\x89PNG\r\n\x1a", "\xFF\xD8", 'GIF89', 'GIF8', "RIFF\x00\x00\x00\x00WEB", "\x00\x00\x00\x18ftypis",
        "\x00\x00\x00\x18fty", "\x1A\x45\xDF", "\x1A\x45\xDF\xA3", 'WEBVT', "\xEF\xBB\xBFWEBV"];
    foreach ($cases as $head) {
        assertSame(null, MediaSniffer::detect($head), bin2hex($head));
    }
});

test('sniffer: MP4 only with an MP4 major brand, so QuickTime is unknown', function (): void {
    $ftyp = static fn (string $brand, int $size = 20): string => pack('N', $size) . 'ftyp' . $brand . "\x00\x00\x02\x00" . $brand;
    foreach (['isom', 'iso2', 'iso6', 'mp41', 'mp42', 'avc1', 'M4V ', 'dash', 'mmp4', 'MSNV'] as $brand) {
        assertSame('mp4', MediaSniffer::detect($ftyp($brand)), $brand);
    }
    foreach (['qt  ', 'heic', 'mif1', 'M4A ', '3gp4', 'crx ', 'ISOM', 'm4v '] as $brand) {
        assertSame(null, MediaSniffer::detect($ftyp($brand)), $brand);
    }
    assertSame(null, MediaSniffer::detect($ftyp('isom', 12)), 'ftyp box smaller than 16 bytes');
    assertSame(null, MediaSniffer::detect($ftyp('isom', 1)), 'ftyp with a 64-bit size');
});

test('sniffer: WebM needs DocType webm, so Matroska is unknown', function (): void {
    $header = static fn (string $docType): string => "\x1A\x45\xDF\xA3" . chr(0x80 | (strlen($docType) + 7))
        . "\x42\x86\x81\x01" . "\x42\x82" . chr(0x80 | strlen($docType)) . $docType;
    assertSame('webm', MediaSniffer::detect($header('webm')));
    assertSame('webm', MediaSniffer::detect($header("webm\0")), 'NUL padding');
    assertSame(null, MediaSniffer::detect($header('matroska')));
    assertSame(null, MediaSniffer::detect($header('webmx')));
    assertSame(null, MediaSniffer::detect($header('WEBM')));
    assertSame(null, MediaSniffer::detect(substr($header('webm'), 0, -2)), 'DocType cut off');
    // An EBML header without a DocType at all.
    assertSame(null, MediaSniffer::detect("\x1A\x45\xDF\xA3\x84\x42\x86\x81\x01"));
    // Header of unknown size, or a size vint longer than 8 bytes.
    assertSame(null, MediaSniffer::detect("\x1A\x45\xDF\xA3\xFF\x42\x82\x84webm"));
    assertSame(null, MediaSniffer::detect("\x1A\x45\xDF\xA3\x00\x42\x82\x84webm"));
    // Matroska from a real header: swap the DocType in the WebM fixture.
    $webm = substr(fixture('webm-tags.webm'), 0, 4096);
    assertSame(null, MediaSniffer::detect(str_replace("\x42\x82\x84webm", "\x42\x82\x84mkvx", $webm)));
});

test('sniffer: WEBVTT with an optional BOM, followed by nothing or whitespace', function (): void {
    foreach (['WEBVTT', "WEBVTT\n", "WEBVTT\r\n", "WEBVTT\t", 'WEBVTT - Captions', "\xEF\xBB\xBFWEBVTT\n\n", "\xEF\xBB\xBFWEBVTT"] as $head) {
        assertSame('vtt', MediaSniffer::detect($head), bin2hex($head));
    }
    foreach (['WEBVTTX', 'WEBVTT-', 'webvtt', ' WEBVTT', "\xEF\xBB\xBF\xEF\xBB\xBFWEBVTT", "\xEF\xBBWEBVTT", 'WEBVTT<script>'] as $head) {
        assertSame(null, MediaSniffer::detect($head), bin2hex($head));
    }
});

test('sniffer: never warns on random bytes', function (): void {
    set_error_handler(static function (int $errno, string $message): bool {
        throw new AssertionError('PHP warning: ' . $message);
    });
    try {
        mt_srand(20261001);
        $prefixes = ['', "\x1A\x45\xDF\xA3", "\x00\x00\x00\x18ftyp", "\xEF\xBB\xBF", 'RIFF'];
        for ($i = 0; $i < 3000; $i++) {
            $head = $prefixes[$i % count($prefixes)];
            for ($j = mt_rand(0, 40); $j > 0; $j--) {
                $head .= chr(mt_rand(0, 255));
            }
            $type = MediaSniffer::detect($head);
            assertTrue($type === null || in_array($type, ['png', 'jpg', 'gif', 'webp', 'mp4', 'webm', 'vtt'], true), 'unexpected ' . var_export($type, true));
        }
    } finally {
        restore_error_handler();
    }
});
