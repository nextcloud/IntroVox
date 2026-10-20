<?php
/**
 * Regenerates the media fixtures used by tests-php/MediaSnifferTest.php and
 * tests-php/MetadataStripperTest.php. See README.md in this directory for
 * what each file holds.
 *
 *   php tests-php/fixtures/make-fixtures.php           images: PHP GD plus hand-built metadata
 *   php tests-php/fixtures/make-fixtures.php --video   also MP4 and WebM, made with ffmpeg in Docker
 *
 * The images are deterministic for a given GD/libjpeg/zlib build; the videos
 * are made single-threaded with +bitexact so a rerun gives the same bytes on
 * the same ffmpeg image.
 */

declare(strict_types=1);

const FIXTURES = __DIR__;
const FFMPEG_IMAGE = 'jrottenberg/ffmpeg:6.1-alpine';

// ------------------------------------------------------------------ helpers

function gdImage(int $width, int $height, int $seed): GdImage {
    $image = imagecreatetruecolor($width, $height);
    for ($y = 0; $y < $height; $y++) {
        for ($x = 0; $x < $width; $x++) {
            $red = ($x * 4 + $seed * 40) % 256;
            $green = ($y * 5 + $seed * 20) % 256;
            $blue = (($x + $y) * 3 + $seed * 90) % 256;
            imagesetpixel($image, $x, $y, ($red << 16) | ($green << 8) | $blue);
        }
    }
    return $image;
}

/** A JPEG as GD writes it: SOI, APP0 JFIF, COM "CREATOR: gd-jpeg ...", tables, scan(s), EOI. */
function gdJpeg(int $width, int $height, int $seed, bool $progressive = false): string {
    $image = gdImage($width, $height, $seed);
    imageinterlace($image, $progressive);
    ob_start();
    imagejpeg($image, null, 85);
    return (string)ob_get_clean();
}

/**
 * Splits a GD JPEG into its JFIF APP0 segment and everything after it.
 *
 * @return array{0: string, 1: string}
 */
function splitJfif(string $jpeg): array {
    if (substr($jpeg, 0, 4) !== "\xFF\xD8\xFF\xE0") {
        throw new RuntimeException('GD JPEG does not start with SOI + APP0');
    }
    $app0Length = unpack('n', $jpeg, 4)[1] + 2;
    return [substr($jpeg, 2, $app0Length), substr($jpeg, 2 + $app0Length)];
}

function jpegSegment(int $marker, string $payload): string {
    return "\xFF" . chr($marker) . pack('n', strlen($payload) + 2) . $payload;
}

/**
 * One TIFF IFD followed by the values that do not fit in an entry.
 *
 * @param list<array{0: int, 1: int, 2: int, 3: string}> $entries tag, type, count, raw value bytes
 */
function tiffIfd(bool $littleEndian, array $entries, int $offset): string {
    usort($entries, static fn (array $a, array $b): int => $a[0] <=> $b[0]);
    $u16 = $littleEndian ? 'v' : 'n';
    $u32 = $littleEndian ? 'V' : 'N';
    $dataStart = $offset + 2 + 12 * count($entries) + 4;
    $directory = pack($u16, count($entries));
    $data = '';
    foreach ($entries as [$tag, $type, $count, $raw]) {
        if (strlen($raw) <= 4) {
            $value = str_pad($raw, 4, "\0");
        } else {
            $value = pack($u32, $dataStart + strlen($data));
            $data .= $raw . (strlen($raw) % 2 === 1 ? "\0" : '');
        }
        $directory .= pack($u16, $tag) . pack($u16, $type) . pack($u32, $count) . $value;
    }
    return $directory . pack($u32, 0) . $data;
}

/**
 * A TIFF block as found in Exif APP1 and PNG eXIf: IFD0, and a GPS IFD
 * linked from it when $gps is given.
 */
function tiff(bool $littleEndian, array $ifd0, ?array $gps): string {
    $u32 = $littleEndian ? 'V' : 'N';
    $header = ($littleEndian ? 'II' : 'MM') . pack($littleEndian ? 'v' : 'n', 42) . pack($u32, 8);
    if ($gps === null) {
        return $header . tiffIfd($littleEndian, $ifd0, 8);
    }
    // The GPS pointer is a 4-byte inline value, so IFD0's length does not
    // depend on it: lay out once to learn where the GPS IFD goes.
    $withPointer = static fn (int $gpsOffset): array => array_merge($ifd0, [[0x8825, 4, 1, pack($u32, $gpsOffset)]]);
    $gpsOffset = 8 + strlen(tiffIfd($littleEndian, $withPointer(0), 8));
    return $header . tiffIfd($littleEndian, $withPointer($gpsOffset), 8) . tiffIfd($littleEndian, $gps, $gpsOffset);
}

function tiffAscii(int $tag, string $text): array {
    return [$tag, 2, strlen($text) + 1, $text . "\0"];
}

function tiffShort(bool $littleEndian, int $tag, int $value): array {
    return [$tag, 3, 1, pack($littleEndian ? 'v' : 'n', $value)];
}

/** @param list<array{0: int, 1: int}> $fractions */
function tiffRationals(bool $littleEndian, int $tag, array $fractions): array {
    $raw = '';
    foreach ($fractions as [$numerator, $denominator]) {
        $raw .= pack($littleEndian ? 'V' : 'N', $numerator) . pack($littleEndian ? 'V' : 'N', $denominator);
    }
    return [$tag, 5, count($fractions), $raw];
}

/** A GPS IFD that puts the photo on the Dam in Amsterdam. */
function gpsIfd(bool $littleEndian, string $datum): array {
    return [
        [0x0000, 1, 4, "\x02\x03\x00\x00"],
        tiffAscii(0x0001, 'N'),
        tiffRationals($littleEndian, 0x0002, [[52, 1], [22, 1], [1234, 100]]),
        tiffAscii(0x0003, 'E'),
        tiffRationals($littleEndian, 0x0004, [[4, 1], [53, 1], [4321, 100]]),
        tiffAscii(0x0012, $datum),
    ];
}

function exifApp1(bool $littleEndian, int $orientation, string $datum): string {
    $ifd0 = [
        tiffAscii(0x010F, 'SecretPhone Inc.'),
        tiffAscii(0x0110, 'SecretPhone 12'),
        tiffShort($littleEndian, 0x0112, $orientation),
        tiffAscii(0x0132, '2024:05:01 12:00:00'),
    ];
    return jpegSegment(0xE1, "Exif\0\0" . tiff($littleEndian, $ifd0, gpsIfd($littleEndian, $datum)));
}

function xmpPacket(): string {
    return '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">'
        . '<rdf:Description xmlns:xmp="http://ns.adobe.com/xap/1.0/" xmp:CreatorTool="SecretXmpTool"/>'
        . '</rdf:RDF></x:xmpmeta>';
}

/**
 * An APP2 MPF segment (CIPA DC-007) describing two images: the primary one
 * and a second JPEG stored after the first EOI, as phones do.
 */
function mpfApp2(int $primarySize, int $secondSize, int $secondOffset): string {
    $entries = pack('NNNnn', 0x20030000, $primarySize, 0, 0, 0)
        . pack('NNNnn', 0x00020002, $secondSize, $secondOffset, 0, 0);
    $tiff = "MM\x00\x2A\x00\x00\x00\x08"
        . pack('n', 3)
        . pack('nnN', 0xB000, 7, 4) . '0100'
        . pack('nnNN', 0xB001, 4, 1, 2)
        . pack('nnNN', 0xB002, 7, 32, 50)
        . pack('N', 0)
        . $entries;
    return jpegSegment(0xE2, "MPF\0" . $tiff);
}

function pngChunk(string $type, string $data): string {
    return pack('N', strlen($data)) . $type . $data . pack('N', crc32($type . $data));
}

/**
 * @return list<array{0: string, 1: string}> type and data of each chunk
 */
function pngChunks(string $png): array {
    $chunks = [];
    for ($pos = 8; $pos < strlen($png);) {
        $length = unpack('N', $png, $pos)[1];
        $chunks[] = [substr($png, $pos + 4, 4), substr($png, $pos + 8, $length)];
        $pos += 12 + $length;
    }
    return $chunks;
}

/** A ZIP archive with one stored file, built by hand so it has no timestamps. */
function zipStored(string $name, string $content): string {
    $crc = crc32($content);
    $size = strlen($content);
    $local = 'PK' . "\x03\x04" . pack('vvvvvVVVvv', 20, 0, 0, 0, 0x21, $crc, $size, $size, strlen($name), 0) . $name . $content;
    $central = 'PK' . "\x01\x02" . pack('vvvvvvVVVvvvvvVV', 20, 20, 0, 0, 0, 0x21, $crc, $size, $size, strlen($name), 0, 0, 0, 0, 0, 0) . $name;
    $end = 'PK' . "\x05\x06" . pack('vvvvVVv', 0, 0, 1, 1, strlen($central), strlen($local), 0);
    return $local . $central . $end;
}

/**
 * GIF image data without real compression: a clear code before every two
 * pixels keeps the code size at 3 bits, so no dictionary is needed. Every
 * decoder handles this, and it is easy to check by hand.
 *
 * @param list<int> $pixels Colour indexes 0..3
 */
function gifImageData(array $pixels): string {
    $minimumCodeSize = 2;
    $clear = 1 << $minimumCodeSize;
    $codes = [];
    foreach (array_chunk($pixels, 2) as $pair) {
        $codes[] = $clear;
        array_push($codes, ...$pair);
    }
    $codes[] = $clear + 1;

    $bytes = '';
    $buffer = 0;
    $bits = 0;
    foreach ($codes as $code) {
        $buffer |= $code << $bits;
        $bits += $minimumCodeSize + 1;
        while ($bits >= 8) {
            $bytes .= chr($buffer & 0xFF);
            $buffer >>= 8;
            $bits -= 8;
        }
    }
    if ($bits > 0) {
        $bytes .= chr($buffer & 0xFF);
    }
    return chr($minimumCodeSize) . gifSubBlocks($bytes);
}

function gifSubBlocks(string $data): string {
    $out = '';
    foreach (str_split($data, 255) as $block) {
        $out .= chr(strlen($block)) . $block;
    }
    return $out . "\x00";
}

function write(string $name, string $bytes): void {
    file_put_contents(FIXTURES . '/' . $name, $bytes);
    printf("%-34s %7d bytes\n", $name, strlen($bytes));
}

// ------------------------------------------------------------------- JPEG

// jpeg-phone.jpg: laid out like a phone photo. No JFIF; Exif (little-endian,
// Orientation 6, Make/Model/DateTime, GPS IFD), XMP, MPF, a comment, GD's
// own COM, then after the first EOI a second JPEG with its own Exif GPS,
// which the MPF index points at.
[, $primaryRest] = splitJfif(gdJpeg(64, 48, 1));
[, $secondRest] = splitJfif(gdJpeg(32, 24, 2));
$second = "\xFF\xD8" . exifApp1(true, 1, 'WGS-84-SECOND') . $secondRest;
$head = "\xFF\xD8"
    . exifApp1(true, 6, 'WGS-84-SECRET')
    . jpegSegment(0xE1, "http://ns.adobe.com/xap/1.0/\0" . xmpPacket());
// MPF offsets count from the TIFF header inside APP2: after FF E2, the
// length and "MPF\0".
$mpfTiffStart = strlen($head) + 8;
$tail = jpegSegment(0xFE, 'Secret comment') . $primaryRest;
$primarySize = strlen($head) + strlen(mpfApp2(0, 0, 0)) + strlen($tail);
$primary = $head . mpfApp2($primarySize, strlen($second), $primarySize - $mpfTiffStart) . $tail;
write('jpeg-phone.jpg', $primary . $second);

// jpeg-orientation1-mm.jpg: JFIF first, then big-endian Exif with
// Orientation 1 and GPS. Nothing of the Exif should survive.
[$jfif, $rest] = splitJfif(gdJpeg(40, 30, 3));
write('jpeg-orientation1-mm.jpg', "\xFF\xD8" . $jfif . exifApp1(false, 1, 'WGS-84-SECRET') . $rest);

// jpeg-orientation8-exif-first.jpg: big-endian Exif with Orientation 8
// placed before the JFIF segment. The JFIF must come first in the output.
write('jpeg-orientation8-exif-first.jpg', "\xFF\xD8" . exifApp1(false, 8, 'WGS-84-SECRET') . $jfif . $rest);

// jpeg-progressive.jpg: GD with interlacing on writes a progressive JPEG
// (several SOS and DHT segments).
write('jpeg-progressive.jpg', gdJpeg(48, 32, 4, true));

// -------------------------------------------------------------------- PNG

// png-dirty.png: GD's PNG with gAMA (kept) and tEXt, iTXt XMP, eXIf with
// GPS, tIME and a private vendor chunk (all dropped), a tEXt between the
// image data and IEND, and a ZIP after IEND.
ob_start();
imagepng(gdImage(32, 24, 5), null, 9);
$chunks = pngChunks((string)ob_get_clean());
$png = "\x89PNG\r\n\x1a\n";
foreach ($chunks as [$type, $data]) {
    if ($type === 'IEND') {
        $png .= pngChunk('tEXt', "Author\0Secret author");
    }
    $png .= pngChunk($type, $data);
    if ($type === 'IHDR') {
        $png .= pngChunk('gAMA', pack('N', 45455))
            . pngChunk('tEXt', "Comment\0Secret png comment")
            . pngChunk('iTXt', "XML:com.adobe.xmp\0\0\0\0\0" . xmpPacket())
            . pngChunk('eXIf', tiff(false, [tiffShort(false, 0x0112, 1)], gpsIfd(false, 'WGS-84-SECRET')))
            . pngChunk('tIME', pack('nCCCCC', 2024, 5, 1, 12, 0, 0))
            . pngChunk('scRt', 'SecretVendor');
    }
}
write('png-dirty.png', $png . zipStored('secret.txt', 'Secret zip payload'));

// png-apng.png: an 8x8 APNG with three frames (acTL num_frames 3), the
// first frame in IDAT and the others in fdAT.
$frame = static function (int $red, int $green, int $blue): string {
    $raw = '';
    for ($y = 0; $y < 8; $y++) {
        $raw .= "\x00" . str_repeat(chr($red) . chr($green) . chr($blue), 8);
    }
    return (string)gzcompress($raw, 9);
};
$frameControl = static fn (int $sequence): string => pack('NNNNNnnCC', $sequence, 8, 8, 0, 0, 1, 10, 0, 0);
write('png-apng.png', "\x89PNG\r\n\x1a\n"
    . pngChunk('IHDR', pack('NNCCCCC', 8, 8, 8, 2, 0, 0, 0))
    . pngChunk('acTL', pack('NN', 3, 0))
    . pngChunk('fcTL', $frameControl(0))
    . pngChunk('IDAT', $frame(255, 0, 0))
    . pngChunk('fcTL', $frameControl(1))
    . pngChunk('fdAT', pack('N', 2) . $frame(0, 255, 0))
    . pngChunk('fcTL', $frameControl(3))
    . pngChunk('fdAT', pack('N', 4) . $frame(0, 0, 255))
    . pngChunk('IEND', ''));

// -------------------------------------------------------------------- GIF

// gif-dirty.gif: an 8x8 GIF89a with three frames, a NETSCAPE2.0 loop, a
// comment, an XMP application extension and HTML after the trailer.
$gif = 'GIF89a' . pack('vv', 8, 8) . "\x91\x00\x00"
    . "\x00\x00\x00" . "\xFF\x00\x00" . "\x00\xFF\x00" . "\x00\x00\xFF"
    . "\x21\xFF\x0BNETSCAPE2.0\x03\x01\x00\x00\x00"
    . "\x21\xFE" . gifSubBlocks('Secret gif comment')
    . "\x21\xFF\x0BXMP DataXMP" . gifSubBlocks(xmpPacket());
foreach ([1, 2, 3] as $colour) {
    $pixels = [];
    for ($i = 0; $i < 64; $i++) {
        $pixels[] = ($i % 9 === 0) ? 0 : $colour;
    }
    $gif .= "\x21\xF9\x04\x04\x0A\x00\x00\x00"
        . "\x2C" . pack('vvvv', 0, 0, 8, 8) . "\x00"
        . gifImageData($pixels);
}
write('gif-dirty.gif', $gif . ';' . "<html><body><script>alert('Secret tail')</script></body></html>\n");

// ------------------------------------------------------------------ Video

if (!in_array('--video', $argv, true)) {
    echo "Skipped MP4/WebM (pass --video to make them with ffmpeg in Docker).\n";
    exit(0);
}

// Subtitle sources live next to the fixtures only while ffmpeg runs, so
// Docker can mount them on any host.
$sources = FIXTURES . '/.sources';
if (!is_dir($sources)) {
    mkdir($sources);
}
file_put_contents($sources . '/subs.srt', "1\n00:00:00,000 --> 00:00:00,900\nSecret subtitle\n");
file_put_contents($sources . '/subs.vtt', "WEBVTT\n\n00:00:00.000 --> 00:00:00.900\nSecret subtitle\n");

function ffmpeg(string $sources, string $arguments): void {
    $command = 'docker run --rm -v ' . escapeshellarg(FIXTURES . ':/out') . ' -v ' . escapeshellarg($sources . ':/src')
        . ' ' . FFMPEG_IMAGE . ' -hide_banner -loglevel error -y ' . $arguments;
    echo '$ ' . $command . "\n";
    passthru($command, $status);
    if ($status !== 0) {
        throw new RuntimeException('ffmpeg failed');
    }
}

$video = '-f lavfi -i testsrc=size=160x120:rate=10';
$audio = '-f lavfi -i sine=frequency=440:sample_rate=48000';
$x264 = '-c:v libx264 -preset veryfast -threads 1 -pix_fmt yuv420p';
$vp8 = '-c:v libvpx -threads 1 -b:v 100k';
$exact = '-fflags +bitexact -flags:v +bitexact -flags:a +bitexact';

// mp4-udta.mp4: H.264 + AAC with title and ISO 6709 location as mdta
// metadata (as iPhones store them), a creation time and a custom handler name.
ffmpeg($sources, "$video $audio -t 1 $x264 -c:a aac -b:a 32k -shortest"
    . ' -metadata title="Secret title" -metadata location="+52.3700+004.8900/"'
    . ' -metadata creation_time=2024-05-01T12:00:00Z -metadata:s:v:0 handler_name="Secret handler"'
    . " -movflags +use_metadata_tags $exact /out/mp4-udta.mp4");

// mp4-subtitle.mp4: H.264 plus a mov_text subtitle track.
ffmpeg($sources, "$video -i /src/subs.srt -t 1 -map 0:v -map 1:s $x264 -c:s mov_text $exact /out/mp4-subtitle.mp4");

// mp4-noaudio.mp4: H.264 only, no metadata.
ffmpeg($sources, "$video -t 1 -an $x264 $exact /out/mp4-noaudio.mp4");

// webm-tags.webm: VP8 + Opus with a title (Info), artist and comment (Tags)
// and a track name; clusters of 200 ms so there are several.
ffmpeg($sources, "$video $audio -t 1 $vp8 -c:a libopus -b:a 24k -shortest"
    . ' -metadata title="Secret title" -metadata artist="Secret artist" -metadata comment="Secret comment"'
    . ' -metadata:s:v:0 title="Secret track name" -cluster_time_limit 200'
    . " $exact /out/webm-tags.webm");

// webm-subtitle.webm: VP8 plus a WebVTT subtitle track.
ffmpeg($sources, "$video -i /src/subs.vtt -t 1 -map 0:v -map 1:s $vp8 -c:s webvtt $exact /out/webm-subtitle.webm");

// webm-live.webm: webm-tags.webm rebuilt the way live recorders (browser
// MediaRecorder) write files: Segment and every Cluster of unknown size, no
// SeekHead or Cues, Tags after the clusters, plus an Attachments element.
write('webm-live.webm', liveWebm((string)file_get_contents(FIXTURES . '/webm-tags.webm')));

unlink($sources . '/subs.srt');
unlink($sources . '/subs.vtt');
rmdir($sources);

foreach (['mp4-udta.mp4', 'mp4-subtitle.mp4', 'mp4-noaudio.mp4', 'webm-tags.webm', 'webm-subtitle.webm'] as $name) {
    printf("%-34s %7d bytes\n", $name, filesize(FIXTURES . '/' . $name));
}

/**
 * @return array{0: int, 1: int, 2: int} element ID, data start, data size
 */
function ebmlHeader(string $bytes, int $pos): array {
    $first = ord($bytes[$pos]);
    $idLength = $first >= 0x80 ? 1 : ($first >= 0x40 ? 2 : ($first >= 0x20 ? 3 : 4));
    $id = 0;
    for ($i = 0; $i < $idLength; $i++) {
        $id = ($id << 8) | ord($bytes[$pos + $i]);
    }
    $pos += $idLength;
    $first = ord($bytes[$pos]);
    $sizeLength = 1;
    for ($mask = 0x80; ($first & $mask) === 0; $mask >>= 1) {
        $sizeLength++;
    }
    $size = $first & ($mask - 1);
    for ($i = 1; $i < $sizeLength; $i++) {
        $size = ($size << 8) | ord($bytes[$pos + $i]);
    }
    return [$id, $pos + $sizeLength, $size];
}

function ebmlElement(int $id, string $data): string {
    $idBytes = ltrim(pack('N', $id), "\0");
    return $idBytes . "\x01" . substr(pack('J', strlen($data)), 1) . $data;
}

function liveWebm(string $webm): string {
    [, $headerData, $headerSize] = ebmlHeader($webm, 0);
    $out = substr($webm, 0, $headerData + $headerSize);
    [$segmentId, $pos] = ebmlHeader($webm, $headerData + $headerSize);
    if ($segmentId !== 0x18538067) {
        throw new RuntimeException('no Segment');
    }
    $kept = '';
    $tags = '';
    while ($pos < strlen($webm)) {
        [$id, $dataStart, $size] = ebmlHeader($webm, $pos);
        $element = substr($webm, $pos, $dataStart + $size - $pos);
        if ($id === 0x1F43B675) {
            $kept .= "\x1F\x43\xB6\x75\x01\xFF\xFF\xFF\xFF\xFF\xFF\xFF" . substr($webm, $dataStart, $size);
        } elseif ($id === 0x1254C367) {
            $tags = $element;
        } elseif ($id === 0x1549A966 || $id === 0x1654AE6B) {
            $kept .= $element;
        }
        $pos = $dataStart + $size;
    }
    // Attachments > AttachedFile > FileName, FileMediaType, FileData, FileUID.
    $attachments = ebmlElement(0x1941A469, ebmlElement(0x61A7,
        ebmlElement(0x466E, 'secret.txt') . ebmlElement(0x4660, 'text/plain')
        . ebmlElement(0x465C, 'Secret attachment') . ebmlElement(0x46AE, "\x01")));
    return $out . "\x18\x53\x80\x67\x01\xFF\xFF\xFF\xFF\xFF\xFF\xFF" . $kept . $tags . $attachments;
}
