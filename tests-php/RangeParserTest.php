<?php
/**
 * RangeParser: one byte range for video streaming; anything odd gets the
 * full file (200) or 416.
 */

declare(strict_types=1);

use OCA\IntroVox\Media\RangeParser;

test('range: no, empty or ignored header serves the full file', function (): void {
    $cases = [
        null, '', 'bytes=-', 'bytes=0-99,200-299', 'bytes=0-1,5-6', 'items=0-1', 'Bytes=0-1', 'bytes =0-1',
        'bytes= 0-1', 'bytes=0-1 ', ' bytes=0-1', "bytes=0-99\n", "bytes=0-99\r\n", 'bytes=a-b', 'bytes=0x10-',
        'bytes=1.5-2', 'bytes=-1-2', 'bytes=+1-2', 'bytes=0--1', 'bytes', 'bytes=', "bytes=0-1\0",
        "bytes=\u{0661}-", // an Arabic-Indic digit is not \d without the u modifier
    ];
    foreach ($cases as $header) {
        assertSame(['status' => 200], RangeParser::parse($header, 1000), var_export($header, true));
    }
    assertSame(['status' => 200], RangeParser::parse(null, 0), 'empty file, no range');
    assertSame(['status' => 200], RangeParser::parse('bytes=-', 0), 'empty file, empty range');
});

test('range: a single range is served as 206 with an inclusive end', function (): void {
    assertSame(['status' => 206, 'start' => 0, 'end' => 99], RangeParser::parse('bytes=0-99', 1000));
    assertSame(['status' => 206, 'start' => 0, 'end' => 0], RangeParser::parse('bytes=0-0', 1000));
    assertSame(['status' => 206, 'start' => 100, 'end' => 999], RangeParser::parse('bytes=100-', 1000));
    assertSame(['status' => 206, 'start' => 999, 'end' => 999], RangeParser::parse('bytes=999-', 1000));
    assertSame(['status' => 206, 'start' => 500, 'end' => 999], RangeParser::parse('bytes=-500', 1000));
    assertSame(['status' => 206, 'start' => 999, 'end' => 999], RangeParser::parse('bytes=-1', 1000));
    assertSame(['status' => 206, 'start' => 5, 'end' => 5], RangeParser::parse('bytes=5-5', 1000));
    assertSame(['status' => 206, 'start' => 7, 'end' => 9], RangeParser::parse('bytes=007-009', 10), 'leading zeros');
});

test('range: an end past the file is clamped, a suffix larger than the file is the whole file', function (): void {
    assertSame(['status' => 206, 'start' => 0, 'end' => 999], RangeParser::parse('bytes=0-5000', 1000));
    assertSame(['status' => 206, 'start' => 500, 'end' => 999], RangeParser::parse('bytes=500-999999999999999999', 1000));
    assertSame(['status' => 206, 'start' => 0, 'end' => 999], RangeParser::parse('bytes=-5000', 1000));
    assertSame(['status' => 206, 'start' => 0, 'end' => 999], RangeParser::parse('bytes=-999999999999999999', 1000));
});

test('range: unsatisfiable ranges are 416', function (): void {
    $cases = [
        'bytes=5-2', 'bytes=1000-', 'bytes=1000-1000', 'bytes=5000-6000', 'bytes=-0', 'bytes=-000',
        'bytes=99999999999999999999-', 'bytes=0-99999999999999999999', 'bytes=-99999999999999999999',
        'bytes=1234567890123456789-', // 19 digits
    ];
    foreach ($cases as $header) {
        assertSame(['status' => 416], RangeParser::parse($header, 1000), $header);
    }
});

test('range: any range on an empty file is 416', function (): void {
    foreach (['bytes=0-0', 'bytes=0-', 'bytes=-1', 'bytes=-500'] as $header) {
        assertSame(['status' => 416], RangeParser::parse($header, 0), $header);
    }
});

test('range: works for files above 4 GB', function (): void {
    $size = 5 * 1024 * 1024 * 1024;
    assertSame(['status' => 206, 'start' => 4294967296, 'end' => $size - 1], RangeParser::parse('bytes=4294967296-', $size));
    assertSame(['status' => 206, 'start' => $size - 10, 'end' => $size - 1], RangeParser::parse('bytes=-10', $size));
});
