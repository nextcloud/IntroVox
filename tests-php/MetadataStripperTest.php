<?php
/**
 * MetadataStripper: what is left of a file after cleaning. Fixtures and how
 * they were made: tests-php/fixtures/README.md.
 */

declare(strict_types=1);

use OCA\IntroVox\Media\MediaException;
use OCA\IntroVox\Media\MediaSniffer;
use OCA\IntroVox\Media\MetadataStripper;
use OCA\IntroVox\Media\StrippedMedia;

// ----------------------------------------------------------------- helpers

function mediaStrip(string $type, string $bytes): StrippedMedia {
    return MetadataStripper::strip($type, $bytes);
}

/** Asserts that stripping throws a MediaException with this reason. */
function mediaAssertRefused(string $reason, string $type, string $bytes, string $message): MediaException {
    try {
        MetadataStripper::strip($type, $bytes);
    } catch (MediaException $e) {
        assertSame($reason, $e->getReason(), $message . ' (' . $e->getDetail() . ')');
        assertSame($reason, $e->getMessage(), $message);
        return $e;
    }
    fail($message . ': expected MediaException(' . $reason . '), nothing was thrown');
}

/** Compares binary strings without dumping them when they differ. */
function mediaAssertBytes(string $expected, string $actual, string $message): void {
    if ($expected === $actual) {
        return;
    }
    $diff = strspn($expected ^ $actual, "\0");
    fail(sprintf('%s: %d bytes expected, %d got, first difference at %d', $message, strlen($expected), strlen($actual), $diff));
}

function mediaAssertAbsent(string $haystack, array $needles, string $message): void {
    foreach ($needles as $needle) {
        assertTrue(strpos($haystack, $needle) === false, $message . ': still contains ' . var_export($needle, true));
    }
}

function mediaAssertPresent(string $haystack, array $needles, string $message): void {
    foreach ($needles as $needle) {
        assertTrue(strpos($haystack, $needle) !== false, $message . ': fixture lacks ' . var_export($needle, true));
    }
}

function mediaAssertDecodes(string $bytes, int $width, int $height): void {
    if (!function_exists('imagecreatefromstring')) {
        return;
    }
    $image = @imagecreatefromstring($bytes);
    assertTrue($image !== false, 'GD cannot decode the stripped image');
    assertSame($width, imagesx($image), 'decoded width');
    assertSame($height, imagesy($image), 'decoded height');
}

/**
 * The segments of a JPEG up to EOI, with each scan's data skipped.
 *
 * @return list<array{0: int, 1: string}> marker and payload
 */
function mediaJpegSegments(string $jpeg): array {
    $segments = [];
    $pos = 2;
    while ($pos < strlen($jpeg)) {
        $marker = ord($jpeg[$pos + 1]);
        if ($marker === 0xD9) {
            $segments[] = [0xD9, ''];
            break;
        }
        $length = unpack('n', $jpeg, $pos + 2)[1];
        $segments[] = [$marker, substr($jpeg, $pos + 4, $length - 2)];
        $pos += 2 + $length;
        if ($marker === 0xDA) {
            while (!($jpeg[$pos] === "\xFF" && $jpeg[$pos + 1] !== "\x00" && (ord($jpeg[$pos + 1]) < 0xD0 || ord($jpeg[$pos + 1]) > 0xD7))) {
                $pos++;
            }
        }
    }
    return $segments;
}

/** @return list<int> */
function mediaJpegMarkers(string $jpeg): array {
    return array_map(static fn (array $segment): int => $segment[0], mediaJpegSegments($jpeg));
}

/** @return list<string> */
function mediaPngChunkTypes(string $png): array {
    $types = [];
    for ($pos = 8; $pos < strlen($png);) {
        $types[] = substr($png, $pos + 4, 4);
        $pos += 12 + unpack('N', $png, $pos)[1];
    }
    return $types;
}

/**
 * MP4 boxes below $start..$end, depth first, with their offsets.
 *
 * @return list<array{0: string, 1: int, 2: int}> path ("moov/trak/tkhd"), offset, size
 */
function mediaMp4Boxes(string $mp4, int $start = 0, ?int $end = null, string $parent = ''): array {
    $containers = ['moov', 'trak', 'mdia', 'minf', 'stbl', 'edts', 'dinf', 'udta'];
    $end ??= strlen($mp4);
    $boxes = [];
    for ($pos = $start; $pos < $end;) {
        $size = unpack('N', $mp4, $pos)[1];
        $type = substr($mp4, $pos + 4, 4);
        $path = $parent === '' ? $type : $parent . '/' . $type;
        $boxes[] = [$path, $pos, $size];
        if (in_array($type, $containers, true)) {
            array_push($boxes, ...mediaMp4Boxes($mp4, $pos + 8, $pos + $size, $path));
        }
        $pos += $size;
    }
    return $boxes;
}

/** @return list<string> */
function mediaMp4Paths(string $mp4): array {
    return array_map(static fn (array $box): string => $box[0], mediaMp4Boxes($mp4));
}

function mediaMp4Find(string $mp4, string $path, int $nth = 0): array {
    $found = array_values(array_filter(mediaMp4Boxes($mp4), static fn (array $box): bool => $box[0] === $path));
    if (!isset($found[$nth])) {
        fail('no box ' . $path);
    }
    return $found[$nth];
}

/**
 * The elements directly inside the WebM Segment. Clusters of unknown size are
 * reported with size -1 and end the walk.
 *
 * @return list<array{0: int, 1: int, 2: int, 3: int}> ID, offset, data start, data size
 */
function mediaWebmLevel1(string $webm): array {
    $read = static function (int $pos) use ($webm): array {
        $first = ord($webm[$pos]);
        $idLength = $first >= 0x80 ? 1 : ($first >= 0x40 ? 2 : ($first >= 0x20 ? 3 : 4));
        $id = 0;
        for ($i = 0; $i < $idLength; $i++) {
            $id = ($id << 8) | ord($webm[$pos + $i]);
        }
        $first = ord($webm[$pos + $idLength]);
        $sizeLength = 1;
        for ($mask = 0x80; ($first & $mask) === 0; $mask >>= 1) {
            $sizeLength++;
        }
        $size = $first & ($mask - 1);
        $unknown = $size === $mask - 1;
        for ($i = 1; $i < $sizeLength; $i++) {
            $byte = ord($webm[$pos + $idLength + $i]);
            $size = ($size << 8) | $byte;
            $unknown = $unknown && $byte === 0xFF;
        }
        return [$id, $pos + $idLength + $sizeLength, $unknown ? -1 : $size];
    };
    [, $dataStart, $size] = $read(0);
    [, $pos] = $read($dataStart + $size);
    $elements = [];
    while ($pos < strlen($webm)) {
        [$id, $dataStart, $size] = $read($pos);
        $elements[] = [$id, $pos, $dataStart, $size];
        if ($size < 0) {
            break;
        }
        $pos = $dataStart + $size;
    }
    return $elements;
}

/**
 * Feeds damaged copies of a file to strip(): cut at many lengths and with
 * bytes flipped. It must either clean the file or throw MediaException, and
 * never hit a PHP warning or a type error (which strip() reports with a
 * "php:" or class-name detail).
 */
function mediaFuzz(string $type, string $bytes, int $seed): void {
    $check = static function (string $variant, string $label) use ($type): void {
        try {
            $result = MetadataStripper::strip($type, $variant);
            assertTrue($result->bytes !== '', $label . ': empty result');
        } catch (MediaException $e) {
            $detail = $e->getDetail();
            assertTrue(!str_starts_with($detail, 'php: ') && !str_contains($detail, 'Error:'), $label . ': ' . $detail);
        }
    };
    $length = strlen($bytes);
    $step = max(1, intdiv($length, 400));
    for ($cut = 0; $cut < $length; $cut += $step) {
        $check(substr($bytes, 0, $cut), 'cut at ' . $cut);
    }
    mt_srand($seed);
    for ($i = 0; $i < 300; $i++) {
        $variant = $bytes;
        for ($flips = mt_rand(1, 4); $flips > 0; $flips--) {
            // Mostly the structure near the start, where the headers are.
            $pos = mt_rand(0, 3) === 0 ? mt_rand(0, $length - 1) : mt_rand(0, min($length - 1, 600));
            $variant[$pos] = chr(mt_rand(0, 255));
        }
        $check($variant, 'flip #' . $i);
    }
}

// -------------------------------------------------------------- dispatch

test('strip: the type must match the bytes', function (): void {
    mediaAssertRefused('unsupported_type', 'png', fixture('jpeg-phone.jpg'), 'JPEG passed as png');
    mediaAssertRefused('unsupported_type', 'jpg', fixture('png-dirty.png'), 'PNG passed as jpg');
    mediaAssertRefused('unsupported_type', 'svg', '<svg xmlns="http://www.w3.org/2000/svg"/>', 'svg');
    mediaAssertRefused('unsupported_type', 'mp4', pack('N', 20) . "ftypqt  \x00\x00\x02\x00qt  " . pack('N', 8) . 'mdat', 'QuickTime');
    mediaAssertRefused('unsupported_type', 'vtt', '<html>', 'HTML as vtt');
    mediaAssertRefused('unsupported_type', 'jpg', '', 'empty');
});

test('strip: WebP is detected but not accepted yet', function (): void {
    $webp = "RIFF\x24\x00\x00\x00WEBPVP8 \x18\x00\x00\x00" . str_repeat("\x00", 24);
    assertSame('webp', MediaSniffer::detect($webp));
    mediaAssertRefused('unsupported_type', 'webp', $webp, 'webp');
});

test('strip: MediaException carries reason and detail', function (): void {
    $e = new MediaException('metadata_track', 'sbtl');
    assertSame('metadata_track', $e->getReason());
    assertSame('metadata_track', $e->getMessage());
    assertSame('sbtl', $e->getDetail());
    assertSame('', (new MediaException('corrupt'))->getDetail());
    assertTrue($e instanceof RuntimeException, 'is a RuntimeException');
});

// -------------------------------------------------------------------- JPEG

test('jpeg: a phone photo loses GPS, XMP, MPF, comments and the second image', function (): void {
    $in = fixture('jpeg-phone.jpg');
    $gpsLatitude = pack('VVVVVV', 52, 1, 22, 1, 1234, 100);
    $secrets = ['WGS-84-SECRET', 'WGS-84-SECOND', 'SecretPhone', '2024:05:01', 'MPF', 'http://ns.adobe.com',
        'SecretXmpTool', 'Secret comment', 'CREATOR: gd-jpeg', $gpsLatitude, "\x25\x88\x04\x00"];
    mediaAssertPresent($in, $secrets, 'fixture');

    $result = mediaStrip('jpg', $in);
    $out = $result->bytes;
    mediaAssertAbsent($out, $secrets, 'stripped JPEG');

    // One image: a single SOI at the start, a single EOI at the very end.
    assertSame(1, substr_count($out, "\xFF\xD8"), 'SOI count');
    assertTrue(str_starts_with($out, "\xFF\xD8"), 'starts with SOI');
    assertSame(1, substr_count($out, "\xFF\xD9"), 'EOI count');
    assertTrue(str_ends_with($out, "\xFF\xD9"), 'ends with EOI');
    $firstEoi = strpos($in, "\xFF\xD9");
    assertTrue(strlen($out) < $firstEoi, 'shorter than the primary image');

    // Exactly one APP1, right after SOI, holding only Orientation 6.
    $markers = mediaJpegMarkers($out);
    assertSame(1, count(array_keys($markers, 0xE1, true)), 'APP1 count');
    $expected = "Exif\0\0MM\x00\x2A\x00\x00\x00\x08\x00\x01\x01\x12\x00\x03\x00\x00\x00\x01\x00\x06\x00\x00\x00\x00\x00\x00";
    assertSame([0xE1, $expected], mediaJpegSegments($out)[0], 'APP1 with Orientation only');
    // Only the decoder's segments are left besides that.
    assertSame([0xE1, 0xDB, 0xDB, 0xC0, 0xC4, 0xC4, 0xC4, 0xC4, 0xDA, 0xD9], $markers, 'segments');

    assertSame(64, $result->width);
    assertSame(48, $result->height);
    assertSame(false, $result->animated);
    assertSame(1, $result->frames);
    assertSame(false, $result->hasAudio);
    mediaAssertDecodes($out, 64, 48);

    if (function_exists('exif_read_data')) {
        $stream = fopen('php://memory', 'r+b');
        fwrite($stream, $out);
        rewind($stream);
        $exif = @exif_read_data($stream);
        assertTrue(is_array($exif), 'ext/exif reads the new APP1');
        assertSame(6, $exif['Orientation'] ?? null, 'Orientation as read by ext/exif');
        assertSame([], array_filter(array_keys($exif), static fn (string $key): bool => str_starts_with($key, 'GPS') || $key === 'Make'), 'no GPS or Make');
    }
});

test('jpeg: Orientation 1 (big-endian Exif) leaves no APP1 at all', function (): void {
    $in = fixture('jpeg-orientation1-mm.jpg');
    mediaAssertPresent($in, ['Exif', 'WGS-84-SECRET'], 'fixture');
    $result = mediaStrip('jpg', $in);
    $markers = mediaJpegMarkers($result->bytes);
    assertSame(0xE0, $markers[0], 'JFIF first');
    assertTrue(!in_array(0xE1, $markers, true), 'no APP1');
    assertTrue(!in_array(0xFE, $markers, true), 'no COM');
    mediaAssertAbsent($result->bytes, ['Exif', 'WGS-84-SECRET', 'SecretPhone'], 'stripped');
    assertSame([40, 30], [$result->width, $result->height]);
    mediaAssertDecodes($result->bytes, 40, 30);
});

test('jpeg: Orientation 8 from big-endian Exif is kept, after the JFIF segment', function (): void {
    $in = fixture('jpeg-orientation8-exif-first.jpg');
    assertSame(0xE1, mediaJpegMarkers($in)[0], 'fixture has Exif before JFIF');
    $result = mediaStrip('jpg', $in);
    $segments = mediaJpegSegments($result->bytes);
    assertSame(0xE0, $segments[0][0], 'JFIF moved to the front');
    assertTrue(str_starts_with($segments[0][1], "JFIF\0"), 'JFIF payload');
    assertSame(0xE1, $segments[1][0], 'APP1 right after JFIF');
    // "Exif\0\0", TIFF header (8), entry count (2), tag/type/count (8), value.
    assertSame("\x00\x08", substr($segments[1][1], 6 + 8 + 2 + 8, 2), 'Orientation value 8');
    assertSame(1, count(array_keys(mediaJpegMarkers($result->bytes), 0xE1, true)), 'one APP1');
    mediaAssertAbsent($result->bytes, ['WGS-84-SECRET', 'SecretPhone'], 'stripped');
    mediaAssertDecodes($result->bytes, 40, 30);
});

test('jpeg: a JFIF thumbnail is dropped', function (): void {
    $in = fixture('jpeg-orientation1-mm.jpg');
    $app0Length = unpack('n', $in, 4)[1];
    $thumbnail = "JFIF\0\x01\x01\x00\x00\x48\x00\x48\x02\x01" . 'THUMBS';
    $withThumbnail = "\xFF\xD8\xFF\xE0" . pack('n', strlen($thumbnail) + 2) . $thumbnail . substr($in, 4 + $app0Length);
    mediaAssertDecodes($withThumbnail, 40, 30);
    $result = mediaStrip('jpg', $withThumbnail);
    $segments = mediaJpegSegments($result->bytes);
    assertSame([0xE0, "JFIF\0\x01\x01\x00\x00\x48\x00\x48\x00\x00"], $segments[0], 'JFIF without thumbnail');
    mediaAssertAbsent($result->bytes, ['THUMBS'], 'stripped');
    mediaAssertDecodes($result->bytes, 40, 30);
});

test('jpeg: a broken Exif block is dropped without an orientation', function (): void {
    $in = fixture('jpeg-orientation1-mm.jpg');
    $app0Length = unpack('n', $in, 4)[1];
    $jfif = substr($in, 2, 2 + $app0Length);
    $exifStart = 4 + $app0Length;
    $exifLength = unpack('n', $in, $exifStart + 2)[1];
    $rest = substr($in, $exifStart + 2 + $exifLength);
    $brokenExifs = [
        "Exif\0\0",
        "Exif\0\0II*\0",
        "Exif\0\0XX*\0\x08\0\0\0",
        "Exif\0\0MM\0\x2A\xFF\xFF\xFF\xF0",                          // IFD offset past the end
        "Exif\0\0MM\0\x2A\0\0\0\x08\xFF\xFF\x01\x12\x00\x03",        // 65535 entries
        "Exif\0\0MM\0\x2A\0\0\0\x08\x00\x01\x01\x12\x00\x04\x00\x00\x00\x01\x00\x00\x00\x06", // LONG, not SHORT
        "Exif\0\0MM\0\x2A\0\0\0\x08\x00\x01\x01\x12\x00\x03\x00\x00\x00\x01\x00\x09\x00\x00", // value 9
    ];
    foreach ($brokenExifs as $i => $exif) {
        $jpeg = "\xFF\xD8" . $jfif . "\xFF\xE1" . pack('n', strlen($exif) + 2) . $exif . $rest;
        $result = mediaStrip('jpg', $jpeg);
        assertTrue(!in_array(0xE1, mediaJpegMarkers($result->bytes), true), 'no APP1 for broken Exif #' . $i);
    }
});

test('jpeg: progressive JPEG with several scans', function (): void {
    $in = fixture('jpeg-progressive.jpg');
    $result = mediaStrip('jpg', $in);
    $markers = mediaJpegMarkers($result->bytes);
    assertTrue(count(array_keys($markers, 0xDA, true)) > 1, 'several SOS');
    assertTrue(in_array(0xC2, $markers, true), 'progressive frame header (SOF2)');
    assertSame([48, 32], [$result->width, $result->height]);
    mediaAssertAbsent($result->bytes, ['CREATOR: gd-jpeg'], 'stripped');
    mediaAssertDecodes($result->bytes, 48, 32);
    // Cleaning a clean file changes nothing.
    mediaAssertBytes($result->bytes, mediaStrip('jpg', $result->bytes)->bytes, 'idempotent');
});

test('jpeg: anything after the first EOI is cut off', function (): void {
    $in = fixture('jpeg-orientation1-mm.jpg');
    $clean = mediaStrip('jpg', $in)->bytes;
    $polyglot = mediaStrip('jpg', $in . "<html><script>alert('tail')</script></html>")->bytes;
    mediaAssertBytes($clean, $polyglot, 'tail removed');
});

test('jpeg: truncated or malformed files are corrupt', function (): void {
    $in = fixture('jpeg-orientation1-mm.jpg');
    $scanStart = strrpos($in, "\xFF\xDA");
    $scanLength = strlen($in) - $scanStart;
    assertTrue($scanLength > 100, 'fixture scan is long enough to cut');
    mediaAssertRefused('corrupt', 'jpg', substr($in, 0, $scanStart + intdiv($scanLength, 2)), 'cut in the scan');
    mediaAssertRefused('corrupt', 'jpg', substr($in, 0, -2), 'no EOI');
    mediaAssertRefused('corrupt', 'jpg', substr($in, 0, -1), 'half an EOI');
    mediaAssertRefused('corrupt', 'jpg', substr($in, 0, $scanStart + 5), 'cut in the SOS header');
    mediaAssertRefused('corrupt', 'jpg', "\xFF\xD8\xFF", 'only the signature');
    mediaAssertRefused('corrupt', 'jpg', "\xFF\xD8\xFF\xD9", 'SOI and EOI only');
    mediaAssertRefused('corrupt', 'jpg', "\xFF\xD8\xFF\xE1\xFF\xFFExif", 'segment longer than the file');
    mediaAssertRefused('corrupt', 'jpg', "\xFF\xD8\xFF\xE1\x00\x01", 'segment length below 2');
    mediaAssertRefused('corrupt', 'jpg', "\xFF\xD8\xFF\xD8\xFF\xD9", 'second SOI');
    mediaAssertRefused('corrupt', 'jpg', "\xFF\xD8\xFF\x00\xFF\xD9", 'stuffing outside a scan');
    mediaAssertRefused('corrupt', 'jpg', "\xFF\xD8\xFF\xE0\x00\x02garbage\xFF\xD9", 'bytes between segments');

    // No frame header: drop SOF0 from a real file.
    $sof = strpos($in, "\xFF\xC0");
    $withoutSof = substr($in, 0, $sof) . substr($in, $sof + 2 + unpack('n', $in, $sof + 2)[1]);
    mediaAssertRefused('corrupt', 'jpg', $withoutSof, 'no SOF');
    // Two frame headers.
    $sofSegment = substr($in, $sof, 2 + unpack('n', $in, $sof + 2)[1]);
    mediaAssertRefused('corrupt', 'jpg', substr($in, 0, $sof) . $sofSegment . substr($in, $sof), 'two SOF');
    // Height 0 (DNL) is not supported.
    $zeroHeight = $in;
    $zeroHeight[$sof + 5] = "\x00";
    $zeroHeight[$sof + 6] = "\x00";
    mediaAssertRefused('corrupt', 'jpg', $zeroHeight, 'height 0');
});

test('jpeg: damaged copies never cause a PHP warning', function (): void {
    mediaFuzz('jpg', fixture('jpeg-phone.jpg'), 1);
    mediaFuzz('jpg', fixture('jpeg-progressive.jpg'), 2);
});

// --------------------------------------------------------------------- PNG

test('png: only allowed chunks remain, the file ends at IEND', function (): void {
    $in = fixture('png-dirty.png');
    $secrets = ['Secret png comment', 'Secret author', 'SecretXmpTool', 'XML:com.adobe.xmp', 'WGS-84-SECRET',
        'SecretVendor', 'tEXt', 'iTXt', 'eXIf', 'tIME', 'scRt', 'PK', 'Secret zip payload'];
    mediaAssertPresent($in, $secrets, 'fixture');

    $result = mediaStrip('png', $in);
    $out = $result->bytes;
    mediaAssertAbsent($out, $secrets, 'stripped PNG');
    $types = mediaPngChunkTypes($out);
    assertSame(['IHDR', 'gAMA'], array_slice($types, 0, 2), 'leading chunks');
    assertSame('IEND', end($types), 'last chunk');
    // GD writes pHYs itself; it is on the allowlist.
    assertSame([], array_values(array_diff(array_unique($types), ['IHDR', 'gAMA', 'pHYs', 'IDAT', 'IEND'])), 'only allowed chunks');
    assertTrue(str_ends_with($out, "IEND\xAE\x42\x60\x82"), 'ends right after IEND');
    assertSame([32, 24, false, 1, false], [$result->width, $result->height, $result->animated, $result->frames, $result->hasAudio]);
    mediaAssertDecodes($out, 32, 24);
    mediaAssertBytes($out, mediaStrip('png', $out)->bytes, 'idempotent');
});

test('png: an APNG keeps its animation chunks', function (): void {
    $in = fixture('png-apng.png');
    $result = mediaStrip('png', $in);
    mediaAssertBytes($in, $result->bytes, 'nothing to remove');
    assertSame(['IHDR', 'acTL', 'fcTL', 'IDAT', 'fcTL', 'fdAT', 'fcTL', 'fdAT', 'IEND'], mediaPngChunkTypes($result->bytes));
    assertSame(true, $result->animated);
    assertSame(3, $result->frames);
    assertSame([8, 8], [$result->width, $result->height]);
    mediaAssertDecodes($result->bytes, 8, 8);
});

test('png: a bad CRC in a kept chunk is corrupt, in a dropped chunk it does not matter', function (): void {
    $in = fixture('png-dirty.png');
    $idat = strpos($in, 'IDAT');
    $badData = $in;
    $badData[$idat + 6] = chr(ord($badData[$idat + 6]) ^ 0x01);
    mediaAssertRefused('corrupt', 'png', $badData, 'IDAT data changed');
    $badIhdr = $in;
    $badIhdr[16 + 3] = chr(ord($badIhdr[16 + 3]) ^ 0x01);
    mediaAssertRefused('corrupt', 'png', $badIhdr, 'IHDR width changed');

    $text = strpos($in, 'tEXt');
    $textLength = unpack('N', $in, $text - 4)[1];
    $badText = $in;
    $badText[$text + 4 + $textLength] = chr(ord($badText[$text + 4 + $textLength]) ^ 0xFF);
    mediaAssertBytes(mediaStrip('png', $in)->bytes, mediaStrip('png', $badText)->bytes, 'tEXt CRC is not checked');
});

test('png: missing IEND, a chunk past the end or a wrong first chunk is corrupt', function (): void {
    $in = fixture('png-dirty.png');
    $iend = strpos($in, 'IEND') - 4;
    mediaAssertRefused('corrupt', 'png', substr($in, 0, $iend), 'no IEND');
    mediaAssertRefused('corrupt', 'png', substr($in, 0, $iend + 8), 'IEND without CRC');
    $idat = strpos($in, 'IDAT');
    mediaAssertRefused('corrupt', 'png', substr($in, 0, $idat + 20), 'cut in IDAT');
    mediaAssertRefused('corrupt', 'png', "\x89PNG\r\n\x1a\n", 'signature only');

    $chunk = static fn (string $type, string $data): string => pack('N', strlen($data)) . $type . $data . pack('N', crc32($type . $data));
    $ihdr = $chunk('IHDR', pack('NNCCCCC', 1, 1, 8, 0, 0, 0, 0));
    $idatChunk = $chunk('IDAT', (string)gzcompress("\x00\x00"));
    $iendChunk = $chunk('IEND', '');
    $signature = "\x89PNG\r\n\x1a\n";
    mediaStrip('png', $signature . $ihdr . $idatChunk . $iendChunk);
    mediaAssertRefused('corrupt', 'png', $signature . $chunk('gAMA', pack('N', 45455)) . $ihdr . $idatChunk . $iendChunk, 'IHDR not first');
    mediaAssertRefused('corrupt', 'png', $signature . $ihdr . $ihdr . $idatChunk . $iendChunk, 'two IHDR');
    mediaAssertRefused('corrupt', 'png', $signature . $ihdr . $iendChunk, 'no IDAT');
    mediaAssertRefused('corrupt', 'png', $signature . $chunk('IHDR', pack('NNCCCCC', 0, 1, 8, 0, 0, 0, 0)) . $idatChunk . $iendChunk, 'width 0');
    mediaAssertRefused('corrupt', 'png', $signature . $ihdr . $chunk("ID\x00T", 'x') . $idatChunk . $iendChunk, 'chunk type not letters');
    mediaAssertRefused('corrupt', 'png', $signature . $ihdr . "\x80\x00\x00\x00IDAT" . $idatChunk . $iendChunk, 'length above 2^31');
    mediaAssertRefused('corrupt', 'png', $signature . $ihdr . $chunk('acTL', pack('NN', 0, 0)) . $idatChunk . $iendChunk, 'APNG with 0 frames');
});

test('png: damaged copies never cause a PHP warning', function (): void {
    mediaFuzz('png', fixture('png-dirty.png'), 3);
    mediaFuzz('png', fixture('png-apng.png'), 4);
});

// --------------------------------------------------------------------- GIF

test('gif: an animated GIF keeps its frames and loop, loses comment, XMP and tail', function (): void {
    $in = fixture('gif-dirty.gif');
    $secrets = ['Secret gif comment', 'XMP DataXMP', 'SecretXmpTool', '<html', 'Secret tail'];
    mediaAssertPresent($in, $secrets, 'fixture');

    $result = mediaStrip('gif', $in);
    $out = $result->bytes;
    mediaAssertAbsent($out, $secrets, 'stripped GIF');
    assertSame(3, $result->frames);
    assertSame(true, $result->animated);
    assertSame([8, 8], [$result->width, $result->height]);
    assertSame(1, substr_count($out, "\x21\xFF\x0BNETSCAPE2.0\x03\x01\x00\x00\x00"), 'loop extension kept');
    assertSame(3, substr_count($out, "\x21\xF9\x04\x04\x0A\x00\x00\x00"), 'graphic control kept');
    assertTrue(str_ends_with($out, "\x00;"), 'ends with the trailer');
    // Exactly the header, the loop and the three frames.
    $expected = substr($in, 0, 25) . "\x21\xFF\x0BNETSCAPE2.0\x03\x01\x00\x00\x00" . substr($in, strpos($in, "\x21\xF9"), strrpos($in, ';') - strpos($in, "\x21\xF9") + 1);
    mediaAssertBytes($expected, $out, 'exact output');
    mediaAssertDecodes($out, 8, 8);
});

test('gif: a still GIF has one frame', function (): void {
    $in = fixture('gif-dirty.gif');
    $firstFrame = strpos($in, "\x21\xF9");
    $secondFrame = strpos($in, "\x21\xF9", $firstFrame + 1);
    $still = substr($in, 0, 25) . substr($in, $firstFrame, $secondFrame - $firstFrame) . ';';
    $result = mediaStrip('gif', $still);
    assertSame([1, false], [$result->frames, $result->animated]);
    mediaAssertBytes($still, $result->bytes, 'still GIF unchanged');
    mediaAssertDecodes($result->bytes, 8, 8);
});

test('gif: only the loop count survives from a NETSCAPE2.0 extension', function (): void {
    $in = fixture('gif-dirty.gif');
    $padded = str_replace("NETSCAPE2.0\x03\x01\x00\x00\x00", "NETSCAPE2.0\x0ASecretData\x03\x01\x05\x00\x04more\x00", $in);
    $out = mediaStrip('gif', $padded)->bytes;
    assertTrue(str_contains($out, "NETSCAPE2.0\x03\x01\x05\x00\x00"), 'loop count 5 kept');
    mediaAssertAbsent($out, ['SecretData', 'more'], 'extra sub-blocks');
    // Without a loop sub-block the extension is dropped.
    $noLoop = str_replace("NETSCAPE2.0\x03\x01\x00\x00\x00", "NETSCAPE2.0\x02\x01\x00\x00", $in);
    assertTrue(!str_contains(mediaStrip('gif', $noLoop)->bytes, 'NETSCAPE'), 'no loop, no extension');
});

test('gif: truncated or malformed files are corrupt', function (): void {
    $in = fixture('gif-dirty.gif');
    $trailer = strrpos($in, ';');
    mediaAssertRefused('corrupt', 'gif', substr($in, 0, $trailer), 'no trailer');
    $image = strpos($in, "\x2C");
    mediaAssertRefused('corrupt', 'gif', substr($in, 0, $image + 15), 'cut in the image data');
    mediaAssertRefused('corrupt', 'gif', substr($in, 0, $image + 5), 'cut in the image descriptor');
    mediaAssertRefused('corrupt', 'gif', substr($in, 0, 20), 'cut in the colour table');
    mediaAssertRefused('corrupt', 'gif', 'GIF89a', 'header only');
    mediaAssertRefused('corrupt', 'gif', substr($in, 0, 25) . ';', 'no images');
    mediaAssertRefused('corrupt', 'gif', substr($in, 0, 25) . "\x99" . substr($in, 25), 'unknown block');
    mediaAssertRefused('corrupt', 'gif', str_replace("\x21\xF9\x04", "\x21\xF9\x03", $in), 'graphic control of the wrong size');
    $comment = strpos($in, "\x21\xFE");
    mediaAssertRefused('corrupt', 'gif', substr($in, 0, $comment + 5), 'cut in a comment');
});

test('gif: damaged copies never cause a PHP warning', function (): void {
    mediaFuzz('gif', fixture('gif-dirty.gif'), 5);
});

// --------------------------------------------------------------------- MP4

test('mp4: udta/meta metadata is blanked in place, the length stays', function (): void {
    $in = fixture('mp4-udta.mp4');
    $secrets = ['Secret title', '+52.37', 'Secret handler', 'loci', 'mdta'];
    mediaAssertPresent($in, $secrets, 'fixture');

    $result = mediaStrip('mp4', $in);
    $out = $result->bytes;
    assertSame(strlen($in), strlen($out), 'same length');
    mediaAssertAbsent($out, $secrets, 'stripped MP4');
    assertTrue(!in_array('moov/udta', mediaMp4Paths($out), true), 'no udta');
    assertSame(mediaMp4Find($in, 'moov/udta')[1], mediaMp4Find($out, 'moov/free')[1], 'udta became free at the same offset');
    $free = mediaMp4Find($out, 'moov/free');
    assertSame(str_repeat("\0", $free[2] - 8), substr($out, $free[1] + 8, $free[2] - 8), 'free box zeroed');

    // The media data itself is untouched.
    [, $mdat, $mdatSize] = mediaMp4Find($in, 'mdat');
    mediaAssertBytes(substr($in, $mdat, $mdatSize), substr($out, $mdat, $mdatSize), 'mdat unchanged');

    // Recording time is gone from mvhd, tkhd and mdhd.
    [, $mvhd] = mediaMp4Find($in, 'moov/mvhd');
    assertTrue(substr($in, $mvhd + 12, 8) !== str_repeat("\0", 8), 'fixture has a creation time');
    assertSame(str_repeat("\0", 8), substr($out, $mvhd + 12, 8), 'mvhd times zeroed');
    [, $tkhd] = mediaMp4Find($out, 'moov/trak/tkhd');
    assertSame(str_repeat("\0", 8), substr($out, $tkhd + 12, 8), 'tkhd times zeroed');

    assertSame([160, 120], [$result->width, $result->height]);
    assertSame(true, $result->hasAudio);
    assertSame([false, 0], [$result->animated, $result->frames]);
    mediaAssertBytes($out, mediaStrip('mp4', $out)->bytes, 'idempotent');
});

test('mp4: a subtitle track is a metadata track', function (): void {
    $e = mediaAssertRefused('metadata_track', 'mp4', fixture('mp4-subtitle.mp4'), 'mov_text');
    assertSame('sbtl', $e->getDetail());
});

test('mp4: other handlers are refused, a file without video is unsupported', function (): void {
    $in = fixture('mp4-udta.mp4');
    [, $videoHandler] = mediaMp4Find($in, 'moov/trak/mdia/hdlr', 0);
    [, $audioHandler] = mediaMp4Find($in, 'moov/trak/mdia/hdlr', 1);
    foreach (['meta', 'tmcd', 'text', 'gpmd', 'camm', "\x00\x00\x00\x00"] as $handler) {
        $variant = substr_replace($in, $handler, $audioHandler + 16, 4);
        mediaAssertRefused('metadata_track', 'mp4', $variant, 'handler ' . bin2hex($handler));
    }
    mediaAssertRefused('unsupported_type', 'mp4', substr_replace($in, 'soun', $videoHandler + 16, 4), 'audio only');
});

test('mp4: a file without audio', function (): void {
    $result = mediaStrip('mp4', fixture('mp4-noaudio.mp4'));
    assertSame(false, $result->hasAudio);
    assertSame([160, 120], [$result->width, $result->height]);
});

test('mp4: unknown top-level boxes, trailing bytes and truncation are corrupt', function (): void {
    $in = fixture('mp4-noaudio.mp4');
    mediaAssertRefused('corrupt', 'mp4', $in . pack('N', 16) . 'abcd' . str_repeat("\0", 8), 'unknown box at the end');
    [, $moov] = mediaMp4Find($in, 'moov');
    mediaAssertRefused('corrupt', 'mp4', substr($in, 0, $moov) . pack('N', 8) . 'junk' . substr($in, $moov), 'unknown box before moov');
    mediaAssertRefused('corrupt', 'mp4', $in . "\0\0\0", 'trailing bytes');
    mediaAssertRefused('corrupt', 'mp4', substr($in, 0, -100), 'cut in moov');
    mediaAssertRefused('corrupt', 'mp4', substr($in, 0, 1000), 'cut in mdat');
    mediaAssertRefused('corrupt', 'mp4', substr($in, 0, 40), 'no mdat');
    mediaAssertRefused('corrupt', 'mp4', substr($in, 0, $moov), 'no moov');
    mediaAssertRefused('corrupt', 'mp4', $in . substr($in, $moov), 'two moov');
    mediaAssertRefused('corrupt', 'mp4', $in . substr($in, 0, 32), 'two ftyp');
    mediaAssertRefused('corrupt', 'mp4', $in . pack('N', 4) . 'free', 'box smaller than its header');
});

test('mp4: metadata boxes at the top level, of size 0 and with 64-bit sizes', function (): void {
    $in = fixture('mp4-noaudio.mp4');
    // The fixture has a moov/udta of its own, which is blanked as well.
    $clean = mediaStrip('mp4', $in)->bytes;
    $udta = pack('N', 31) . 'udta' . pack('N', 23) . "\xA9nam" . 'Secret appended';
    mediaAssertBytes($clean . pack('N', 31) . 'free' . str_repeat("\0", 23), mediaStrip('mp4', $in . $udta)->bytes, 'top-level udta blanked');

    $uuid = pack('N', 40) . 'uuid' . 'PROFUSMTSECRETID' . 'Secret uuid data';
    mediaAssertBytes($clean . pack('N', 40) . 'free' . str_repeat("\0", 32), mediaStrip('mp4', $in . $uuid)->bytes, 'uuid blanked with its extended type');

    $toEnd = pack('N', 0) . 'meta' . 'Secret to the end';
    mediaAssertBytes($clean . pack('N', 0) . 'free' . str_repeat("\0", 17), mediaStrip('mp4', $in . $toEnd)->bytes, 'size 0 runs to the end');

    $large = pack('N', 1) . 'skip' . pack('NN', 0, 28) . 'Secret 64bit';
    mediaAssertBytes($clean . pack('N', 1) . 'skip' . pack('NN', 0, 28) . str_repeat("\0", 12), mediaStrip('mp4', $in . $large)->bytes, '64-bit size');
    mediaAssertRefused('corrupt', 'mp4', $in . pack('N', 1) . 'free' . pack('NN', 0x80000000, 0), 'size above 2^63');
    mediaAssertRefused('corrupt', 'mp4', $in . pack('N', 1) . 'free' . pack('NN', 1, 0), 'size past the end');
    mediaAssertRefused('corrupt', 'mp4', $in . pack('N', 1) . 'free' . pack('NN', 0, 8), '64-bit size below the header');
    mediaAssertRefused('corrupt', 'mp4', $in . pack('N', 1) . 'free', '64-bit size cut off');
});

test('mp4: unknown boxes inside the walked containers are blanked too', function (): void {
    // A track renamed to something players do not know is no track to them,
    // but its boxes would still ride along.
    $in = fixture('mp4-subtitle.mp4');
    [, $trak, $size] = mediaMp4Find($in, 'moov/trak', 1);
    $result = mediaStrip('mp4', substr_replace($in, 'xtrk', $trak + 4, 4));
    assertSame('free' . str_repeat("\0", $size - 8), substr($result->bytes, $trak + 4, $size - 4), 'renamed track blanked');
    assertSame(false, $result->hasAudio);

    // A vendor box at the end of moov (moov is the last box in the fixture).
    $in = fixture('mp4-noaudio.mp4');
    [, $moov, $moovSize] = mediaMp4Find($in, 'moov');
    assertSame(strlen($in), $moov + $moovSize, 'fixture ends with moov');
    $vendor = pack('N', 21) . 'Xtra' . 'Secret vendor';
    $out = mediaStrip('mp4', substr($in, 0, $moov) . pack('N', $moovSize + 21) . 'moov' . substr($in, $moov + 8) . $vendor)->bytes;
    assertSame(pack('N', 21) . 'free' . str_repeat("\0", 13), substr($out, -21), 'vendor box blanked');
    assertTrue(in_array('moov/trak/mdia/minf/stbl/stsd', mediaMp4Paths($out), true), 'known boxes kept');
});

test('mp4: nesting is bounded and size 0 is refused inside a container', function (): void {
    $in = fixture('mp4-noaudio.mp4');
    [, $moov, $moovSize] = mediaMp4Find($in, 'moov');
    $box = static fn (string $type, string $content): string => pack('N', 8 + strlen($content)) . $type . $content;
    $nested = $box('free', 'x');
    for ($i = 0; $i < 10; $i++) {
        $nested = $box('edts', $nested);
    }
    $deep = substr($in, 0, $moov) . $box('moov', substr($in, $moov + 8, $moovSize - 8) . $nested);
    mediaAssertRefused('corrupt', 'mp4', $deep, 'nested too deep');
    $zero = substr($in, 0, $moov) . $box('moov', substr($in, $moov + 8, $moovSize - 8) . pack('N', 0) . 'free');
    mediaAssertRefused('corrupt', 'mp4', $zero, 'size 0 inside moov');
});

test('mp4: a data reference to another file is corrupt', function (): void {
    $in = fixture('mp4-noaudio.mp4');
    [, $dref] = mediaMp4Find($in, 'moov/trak/mdia/minf/dinf/dref');
    // dref: header (8), version/flags (4), entry count (4), then "url " with flags.
    assertSame("url \x00\x00\x00\x01", substr($in, $dref + 20, 8), 'fixture has a self-contained url entry');
    $external = $in;
    $external[$dref + 27] = "\x00";
    mediaAssertRefused('corrupt', 'mp4', $external, 'url entry without the self-contained flag');
});

test('mp4: damaged copies never cause a PHP warning', function (): void {
    $in = fixture('mp4-udta.mp4');
    // Fuzz the moov (headers) rather than the first bytes, which are mdat.
    [, $moov] = mediaMp4Find($in, 'moov');
    mediaFuzz('mp4', substr($in, 0, 40) . pack('N', 8) . 'mdat' . substr($in, $moov), 6);
});

// -------------------------------------------------------------------- WebM

test('webm: Tags and the Info title become Void, the length stays', function (): void {
    $in = fixture('webm-tags.webm');
    $secrets = ['Secret title', 'Secret artist', 'Secret comment', 'Secret track name'];
    mediaAssertPresent($in, $secrets, 'fixture');

    $result = mediaStrip('webm', $in);
    $out = $result->bytes;
    assertSame(strlen($in), strlen($out), 'same length');
    mediaAssertAbsent($out, $secrets, 'stripped WebM');
    assertTrue(str_contains($out, 'Lavf'), 'muxing app kept');

    $before = mediaWebmLevel1($in);
    $after = mediaWebmLevel1($out);
    assertSame(count($before), count($after), 'same number of level-1 elements');
    foreach ($before as $i => [$id, $offset]) {
        assertSame($offset, $after[$i][1], 'element ' . $i . ' stays at its offset');
        assertSame($id === 0x1254C367 ? 0xEC : $id, $after[$i][0], sprintf('element %X', $id));
        if ($id === 0x1F43B675) {
            mediaAssertBytes(substr($in, $offset, $before[$i][3]), substr($out, $offset, $after[$i][3]), 'cluster unchanged');
        }
    }
    $void = array_values(array_filter($after, static fn (array $element): bool => $element[0] === 0xEC));
    foreach ($void as [, , $dataStart, $size]) {
        assertSame(str_repeat("\0", $size), substr($out, $dataStart, $size), 'Void zeroed');
    }

    assertSame([160, 120], [$result->width, $result->height]);
    assertSame(true, $result->hasAudio);
    assertSame([false, 0], [$result->animated, $result->frames]);
    mediaAssertBytes($out, mediaStrip('webm', $out)->bytes, 'idempotent');
});

test('webm: a live recording with unknown sizes, Tags and Attachments', function (): void {
    $in = fixture('webm-live.webm');
    $secrets = ['Secret title', 'Secret artist', 'Secret track name', 'secret.txt', 'Secret attachment'];
    mediaAssertPresent($in, $secrets, 'fixture');
    assertTrue(substr_count($in, "\x1F\x43\xB6\x75\x01\xFF\xFF\xFF\xFF\xFF\xFF\xFF") > 1, 'fixture has several clusters of unknown size');

    $result = mediaStrip('webm', $in);
    assertSame(strlen($in), strlen($result->bytes), 'same length');
    mediaAssertAbsent($result->bytes, $secrets, 'stripped');
    assertSame([160, 120, true], [$result->width, $result->height, $result->hasAudio]);
    // Cluster data is untouched: everything from the first cluster up to the Tags.
    $firstCluster = strpos($in, "\x1F\x43\xB6\x75");
    $tags = strrpos($in, "\x12\x54\xC3\x67");
    mediaAssertBytes(substr($in, $firstCluster, $tags - $firstCluster), substr($result->bytes, $firstCluster, $tags - $firstCluster), 'clusters unchanged');
    assertSame("\xEC\x01", substr($result->bytes, $tags, 2), 'Tags became Void');
});

test('webm: a subtitle track is a metadata track', function (): void {
    $e = mediaAssertRefused('metadata_track', 'webm', fixture('webm-subtitle.webm'), 'WebVTT track');
    assertSame('type 17', $e->getDetail());
});

test('webm: other track types are refused, a file without video is unsupported', function (): void {
    $in = fixture('webm-tags.webm');
    // TrackType is "83 81 xx"; the first is video (1), the second audio (2).
    $video = strpos($in, "\x83\x81\x01");
    $audio = strpos($in, "\x83\x81\x02");
    foreach ([3, 0x10, 0x11, 0x12, 0x20, 0x21] as $type) {
        $variant = $in;
        $variant[$audio + 2] = chr($type);
        $e = mediaAssertRefused('metadata_track', 'webm', $variant, 'type ' . $type);
        assertSame('type ' . $type, $e->getDetail());
    }
    $audioOnly = $in;
    $audioOnly[$video + 2] = "\x02";
    mediaAssertRefused('unsupported_type', 'webm', $audioOnly, 'no video');
});

test('webm: truncated or malformed files are corrupt', function (): void {
    $in = fixture('webm-tags.webm');
    mediaAssertRefused('corrupt', 'webm', substr($in, 0, -100), 'cut (Segment size past the end)');
    mediaAssertRefused('corrupt', 'webm', substr($in, 0, 40), 'cut in the Segment header');
    mediaAssertRefused('corrupt', 'webm', $in . "\xEC\x80", 'bytes after the Segment');
    mediaAssertRefused('corrupt', 'webm', fixture('webm-live.webm') . "\xA3\x88\x81", 'live file cut in a block');

    $elements = mediaWebmLevel1($in);
    $byId = static function (int $id) use ($elements): array {
        foreach ($elements as $element) {
            if ($element[0] === $id) {
                return $element;
            }
        }
        fail(sprintf('no element %X', $id));
    };
    // Grow the Segment by $extra bytes appended at its end.
    $appendToSegment = static function (string $extra) use ($in): string {
        $size = unpack('J', "\x00" . substr($in, 41, 7))[1] + strlen($extra);
        return substr($in, 0, 40) . "\x01" . substr(pack('J', $size), 1) . substr($in, 48) . $extra;
    };
    assertSame(0x18538067, unpack('N', $in, 36)[1], 'fixture Segment at offset 36');
    mediaStrip('webm', $appendToSegment("\xEC\x82\x00\x00"));
    mediaAssertRefused('corrupt', 'webm', $appendToSegment("\x1F\x00\x00\x00\x81\x00"), 'unknown level-1 element');
    mediaAssertRefused('corrupt', 'webm', $appendToSegment("\x15\x49\xA9\x66\x80"), 'second Info');
    mediaAssertRefused('corrupt', 'webm', $appendToSegment("\x12\x54\xC3\x67\xFF"), 'Tags of unknown size');
    mediaAssertRefused('corrupt', 'webm', $appendToSegment("\x1F\x43\xB6\x75\x83\xE7\x81"), 'cluster child past the cluster');
    mediaAssertRefused('corrupt', 'webm', $appendToSegment("\x1F\x43\xB6\x75\x83\x7B\xA9\x80"), 'Title inside a cluster');

    [, $tags] = $byId(0x1254C367);
    $longVint = $in;
    $longVint[$tags + 4] = "\x00";
    mediaAssertRefused('corrupt', 'webm', $longVint, 'size vint longer than 8 bytes');
    $badId = $in;
    $badId[$tags] = "\x08";
    mediaAssertRefused('corrupt', 'webm', $badId, 'ID longer than 4 bytes');

    $header = substr($in, 0, 36);
    mediaAssertRefused('unsupported_type', 'webm', str_replace("\x42\x82\x84webm", "\x42\x82\x84mkv0", $header) . substr($in, 36), 'Matroska DocType');
});

test('webm: damaged copies never cause a PHP warning', function (): void {
    mediaFuzz('webm', fixture('webm-tags.webm'), 7);
    mediaFuzz('webm', fixture('webm-live.webm'), 8);
});

// --------------------------------------------------------------------- VTT

test('vtt: valid captions pass unchanged', function (): void {
    foreach (["WEBVTT\n\n00:00.000 --> 00:01.000\nHallo wereld, één\n", "\xEF\xBB\xBFWEBVTT\r\n\r\nNOTE emoji \u{1F600}\r\n", 'WEBVTT'] as $vtt) {
        $result = mediaStrip('vtt', $vtt);
        mediaAssertBytes($vtt, $result->bytes, 'caption file unchanged');
        assertSame([0, 0, false, 0, false], [$result->width, $result->height, $result->animated, $result->frames, $result->hasAudio]);
    }
});

test('vtt: invalid UTF-8 or a NUL byte is corrupt', function (): void {
    mediaAssertRefused('corrupt', 'vtt', "WEBVTT\n\n00:00.000 --> 00:01.000\n\xC3\x28\n", 'invalid UTF-8');
    mediaAssertRefused('corrupt', 'vtt', "WEBVTT\n\n\xED\xA0\x80\n", 'UTF-16 surrogate');
    mediaAssertRefused('corrupt', 'vtt', "WEBVTT\n\n\xC0\xAF\n", 'overlong encoding');
    mediaAssertRefused('corrupt', 'vtt', "WEBVTT\n\nHello\0world\n", 'NUL byte');
    mediaAssertRefused('unsupported_type', 'vtt', "WEBVTTX\n", 'not a caption file');
});
