<?php

declare(strict_types=1);

namespace OCA\IntroVox\Media;

/**
 * Removes metadata from an uploaded image, video or caption file before
 * IntroVox keeps its own copy and shows it to every user.
 *
 * Photos and videos carry far more than pixels: GPS position, camera serial
 * numbers, names, edit history, and with MPF a second full-size JPEG that has
 * its own GPS block. Admins rarely know this. Nothing is re-encoded (that
 * would cost quality and need GD/Imagick/ffmpeg on the server); instead each
 * format is walked structure by structure and only parts on an allowlist are
 * copied. Anything after the format's end marker is cut off, so a file cannot
 * be an image and, say, an HTML page or a ZIP at the same time.
 *
 * Video keeps its exact length: MP4 sample tables and WebM cue points hold
 * absolute byte offsets, so metadata is blanked in place instead of removed.
 *
 * The parsers distrust every length: each is checked against the bytes that
 * are left before it is used, loops are bounded, and anything that does not
 * add up is refused as 'corrupt' rather than half-copied.
 *
 * Plain PHP without Nextcloud dependencies, so it can be tested directly.
 */
final class MetadataStripper {
    /** Upper bound for structures that do not grow with the file (segments, header children). */
    private const MAX_ITEMS = 10000;
    /** Upper bound for structures that grow with duration (GIF frames, clusters, fragments). */
    private const MAX_STREAM_ITEMS = 100000;
    private const MAX_DEPTH = 8;

    private const JPEG_SOF = [0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF];
    /** DQT, DHT, DAC, DRI: tables the decoder needs. */
    private const JPEG_TABLES = [0xDB, 0xC4, 0xCC, 0xDD];

    private const PNG_KEEP = [
        'IHDR', 'PLTE', 'IDAT', 'IEND', 'tRNS', 'gAMA', 'cHRM', 'sRGB', 'iCCP',
        'sBIT', 'pHYs', 'bKGD', 'acTL', 'fcTL', 'fdAT',
    ];

    private const GIF_LOOP_EXTENSIONS = ['NETSCAPE2.0', 'ANIMEXTS1.0'];

    private const MP4_TOP_LEVEL = ['ftyp', 'moov', 'mdat', 'free', 'skip', 'wide', 'moof', 'mfra', 'sidx', 'styp'];
    /**
     * Boxes whose children are walked. moof and traf hold no metadata by
     * design, but fragmented files can carry udta or uuid boxes there too.
     */
    private const MP4_CONTAINERS = ['moov', 'trak', 'mdia', 'minf', 'stbl', 'edts', 'dinf', 'mvex', 'moof', 'traf'];
    /** Top-level boxes that only ever hold metadata: renamed to free and zeroed. */
    private const MP4_METADATA = ['udta', 'meta', 'uuid'];
    /**
     * Every box a player may need inside the walked containers (ISO/IEC
     * 14496-12 and QuickTime). Anything else there is blanked like udta:
     * players skip boxes they do not know, so blanking cannot change
     * playback, while a vendor box or a renamed trak could carry anything.
     */
    private const MP4_KNOWN_CHILDREN = [
        // moov
        'mvhd', 'trak', 'mvex', 'iods', 'pssh', 'ipmc', 'ctab',
        // trak, edts
        'tkhd', 'tref', 'trgr', 'edts', 'mdia', 'load', 'imap', 'txas', 'tapt', 'clip', 'matt', 'kmat', 'elst',
        // mdia, minf, dinf
        'mdhd', 'hdlr', 'minf', 'elng', 'vmhd', 'smhd', 'hmhd', 'nmhd', 'sthd', 'gmhd', 'dinf', 'stbl', 'dref',
        // stbl
        'stsd', 'stts', 'ctts', 'cslg', 'stsc', 'stsz', 'stz2', 'stco', 'co64', 'stss', 'stsh', 'padb',
        'stdp', 'sdtp', 'sbgp', 'sgpd', 'subs', 'saiz', 'saio', 'stps', 'csgp',
        // mvex, moof, traf
        'mehd', 'trex', 'leva', 'trep', 'mfhd', 'traf', 'tfhd', 'tfdt', 'trun', 'senc',
    ];
    /** Padding boxes: their content is ignored by every reader, so it is zeroed. */
    private const MP4_PADDING = ['free', 'skip', 'wide'];

    private const EBML_HEADER = 0x1A45DFA3;
    private const EBML_DOCTYPE = 0x4282;
    private const MKV_SEGMENT = 0x18538067;
    private const MKV_SEEKHEAD = 0x114D9B74;
    private const MKV_INFO = 0x1549A966;
    private const MKV_TRACKS = 0x1654AE6B;
    private const MKV_CUES = 0x1C53BB6B;
    private const MKV_CLUSTER = 0x1F43B675;
    private const MKV_CHAPTERS = 0x1043A770;
    private const MKV_TAGS = 0x1254C367;
    private const MKV_ATTACHMENTS = 0x1941A469;
    private const MKV_VOID = 0xEC;
    private const MKV_CRC32 = 0xBF;
    private const MKV_TRACK_ENTRY = 0xAE;
    private const MKV_TRACK_TYPE = 0x83;
    private const MKV_TRACK_NAME = 0x536E;
    private const MKV_VIDEO = 0xE0;
    private const MKV_PIXEL_WIDTH = 0xB0;
    private const MKV_PIXEL_HEIGHT = 0xBA;
    /** Every element that may sit directly in a Segment; one of them ends a Cluster of unknown size. */
    private const MKV_LEVEL1 = [
        self::MKV_SEEKHEAD, self::MKV_INFO, self::MKV_TRACKS, self::MKV_CUES, self::MKV_CLUSTER,
        self::MKV_CHAPTERS, self::MKV_TAGS, self::MKV_ATTACHMENTS,
    ];
    /**
     * Info children that are kept: timing, the segment ID and the (mandatory)
     * muxer names. Title, DateUTC, file names and the rest become Void.
     */
    private const MKV_INFO_KEEP = [0x2AD7B1, 0x4489, 0x4D80, 0x5741, 0x73A4, self::MKV_VOID, self::MKV_CRC32];
    /** Timestamp, SilentTracks, Position, PrevSize, SimpleBlock, BlockGroup, EncryptedBlock, Void, CRC-32. */
    private const MKV_CLUSTER_CHILDREN = [0xE7, 0x5854, 0xA7, 0xAB, 0xA3, 0xA0, 0xAF, self::MKV_VOID, self::MKV_CRC32];

    private string $b;
    private int $len;
    /**
     * In-place edits for video, applied in one pass at the end: each is an
     * offset plus either replacement bytes or a number of zero bytes.
     *
     * @var list<array{0: int, 1: string|int}>
     */
    private array $patches = [];
    /** @var array{handler: ?string, width: ?int, height: ?int}|null */
    private ?array $track = null;
    private bool $hasVideo = false;
    private bool $hasAudio = false;
    private int $width = 0;
    private int $height = 0;

    private function __construct(string $bytes) {
        $this->b = $bytes;
        $this->len = strlen($bytes);
    }

    /**
     * @param string $type As returned by MediaSniffer::detect
     * @throws MediaException
     */
    public static function strip(string $type, string $bytes): StrippedMedia {
        // The caller's type must match the bytes, so a parser never runs on
        // something it was not written for.
        if (MediaSniffer::detect(substr($bytes, 0, 4096)) !== $type) {
            throw new MediaException('unsupported_type', 'content is not ' . self::printable($type));
        }
        if ($type === 'webp') {
            throw new MediaException('unsupported_type', 'webp');
        }

        // The parsers check every bound themselves; this only makes sure a
        // missed one can never turn into a warning and a half-cleaned file.
        // Deprecations are left alone: they say nothing about the input.
        set_error_handler(static function (int $errno, string $message): bool {
            throw new MediaException('corrupt', 'php: ' . $message);
        }, E_WARNING | E_NOTICE);
        try {
            $stripper = new self($bytes);
            switch ($type) {
                case 'jpg':
                    return $stripper->jpeg();
                case 'png':
                    return $stripper->png();
                case 'gif':
                    return $stripper->gif();
                case 'mp4':
                    return $stripper->mp4();
                case 'webm':
                    return $stripper->webm();
                case 'vtt':
                    return $stripper->vtt();
            }
            throw new MediaException('unsupported_type', self::printable($type));
        } catch (\ValueError|\TypeError|\ArithmeticError $e) {
            throw new MediaException('corrupt', get_class($e) . ': ' . $e->getMessage());
        } finally {
            restore_error_handler();
        }
    }

    // ---------------------------------------------------------------- JPEG

    private function jpeg(): StrippedMedia {
        $jfif = '';
        $body = '';
        $orientation = 1;
        $exifSeen = false;
        $sofSeen = false;
        $scanSeen = false;
        $width = 0;
        $height = 0;

        $pos = 2;
        for ($count = 0; ; $count++) {
            if ($count >= self::MAX_ITEMS) {
                self::corrupt('too many JPEG segments');
            }
            if ($pos >= $this->len || $this->b[$pos] !== "\xFF") {
                self::corrupt('expected a JPEG marker at ' . $pos);
            }
            // Any number of 0xFF fill bytes may precede a marker code.
            while ($pos < $this->len && $this->b[$pos] === "\xFF") {
                $pos++;
            }
            if ($pos >= $this->len) {
                self::corrupt('JPEG ends inside a marker');
            }
            $marker = ord($this->b[$pos]);
            $pos++;

            if ($marker === 0xD9) {
                // The first real EOI ends the image. Whatever follows (MPF
                // secondary images with their own GPS, a polyglot tail) is
                // not copied.
                if (!$sofSeen || !$scanSeen) {
                    self::corrupt('JPEG without frame or scan');
                }
                $out = "\xFF\xD8" . $jfif . self::orientationApp1($orientation) . $body . "\xFF\xD9";
                return new StrippedMedia($out, $width, $height, false, 1, false);
            }
            // SOI again, RSTn outside a scan, TEM and the stuffing code are
            // not segments; a clean JPEG has none of them here.
            if ($marker === 0x00 || $marker === 0x01 || ($marker >= 0xD0 && $marker <= 0xD8)) {
                self::corrupt(sprintf('unexpected JPEG marker %02X', $marker));
            }

            $segmentLength = $this->u16be($pos);
            if ($segmentLength < 2 || $segmentLength > $this->len - $pos) {
                self::corrupt('JPEG segment runs past the end');
            }
            $payload = substr($this->b, $pos + 2, $segmentLength - 2);
            $segment = "\xFF" . chr($marker) . substr($this->b, $pos, $segmentLength);
            $pos += $segmentLength;

            if ($marker === 0xE0) {
                if ($jfif === '' && str_starts_with($payload, "JFIF\0") && strlen($payload) >= 14) {
                    $jfif = self::minimalJfif($payload);
                }
            } elseif ($marker === 0xE1) {
                // Exif is dropped; only its orientation survives (below),
                // since without it phone photos would show sideways.
                if (!$exifSeen && str_starts_with($payload, "Exif\0\0")) {
                    $exifSeen = true;
                    $orientation = self::exifOrientation(substr($payload, 6));
                }
            } elseif ($marker === 0xE2) {
                if (str_starts_with($payload, "ICC_PROFILE\0")) {
                    $body .= $segment;
                }
            } elseif ($marker === 0xEE) {
                // Adobe: tells the decoder how colours are transformed.
                if (str_starts_with($payload, 'Adobe')) {
                    $body .= $segment;
                }
            } elseif (in_array($marker, self::JPEG_TABLES, true)) {
                $body .= $segment;
            } elseif (in_array($marker, self::JPEG_SOF, true)) {
                if ($sofSeen) {
                    self::corrupt('second JPEG frame header');
                }
                if (strlen($payload) < 6) {
                    self::corrupt('short JPEG frame header');
                }
                $sofSeen = true;
                $height = (ord($payload[1]) << 8) | ord($payload[2]);
                $width = (ord($payload[3]) << 8) | ord($payload[4]);
                // Height 0 means "given later in a DNL segment", which
                // browsers do not support either.
                if ($width === 0 || $height === 0) {
                    self::corrupt('JPEG without dimensions');
                }
                $body .= $segment;
            } elseif ($marker === 0xDA) {
                if (!$sofSeen) {
                    self::corrupt('JPEG scan before frame header');
                }
                $scanEnd = $this->jpegScanEnd($pos);
                $body .= $segment . substr($this->b, $pos, $scanEnd - $pos);
                $pos = $scanEnd;
                $scanSeen = true;
            }
            // Everything else is dropped: APP1 Exif/XMP, APP2 MPF, APP13
            // IPTC, COM, other APPn, JPGn, and reserved markers.
        }
    }

    /**
     * Where the entropy-coded data after an SOS header ends: at the first
     * 0xFF that is neither byte stuffing (FF 00) nor a restart marker.
     */
    private function jpegScanEnd(int $pos): int {
        while (true) {
            $ff = strpos($this->b, "\xFF", $pos);
            if ($ff === false || $ff + 1 >= $this->len) {
                self::corrupt('JPEG scan runs past the end');
            }
            $next = ord($this->b[$ff + 1]);
            if ($next === 0x00 || ($next >= 0xD0 && $next <= 0xD7)) {
                $pos = $ff + 2;
                continue;
            }
            return $ff;
        }
    }

    /**
     * The JFIF segment without its optional thumbnail: a thumbnail can still
     * show what was cropped out of the photo.
     */
    private static function minimalJfif(string $payload): string {
        // "JFIF\0", version, units, X and Y density; then a 0x0 thumbnail.
        return "\xFF\xE0\x00\x10" . substr($payload, 0, 12) . "\x00\x00";
    }

    /**
     * The Orientation tag (0x0112) from IFD0 of an Exif TIFF block, or 1.
     * A broken Exif block is treated as "no orientation": all of it is
     * dropped anyway, and browsers ignore a broken one too.
     */
    private static function exifOrientation(string $tiff): int {
        $length = strlen($tiff);
        if ($length < 8) {
            return 1;
        }
        $order = substr($tiff, 0, 2);
        if ($order !== 'II' && $order !== 'MM') {
            return 1;
        }
        $u16 = $order === 'II' ? 'v' : 'n';
        $u32 = $order === 'II' ? 'V' : 'N';
        if (unpack($u16, $tiff, 2)[1] !== 42) {
            return 1;
        }
        $ifd = unpack($u32, $tiff, 4)[1];
        if ($ifd < 8 || $ifd > $length - 2) {
            return 1;
        }
        $entries = unpack($u16, $tiff, $ifd)[1];
        if ($entries > ($length - $ifd - 2) / 12) {
            return 1;
        }
        for ($i = 0; $i < $entries; $i++) {
            $entry = $ifd + 2 + 12 * $i;
            if (unpack($u16, $tiff, $entry)[1] !== 0x0112) {
                continue;
            }
            $type = unpack($u16, $tiff, $entry + 2)[1];
            $count = unpack($u32, $tiff, $entry + 4)[1];
            if ($type !== 3 || $count !== 1) {
                return 1;
            }
            $value = unpack($u16, $tiff, $entry + 8)[1];
            return $value >= 1 && $value <= 8 ? $value : 1;
        }
        return 1;
    }

    /**
     * A new APP1 that holds nothing but the orientation, or '' when the
     * image is upright anyway.
     */
    private static function orientationApp1(int $orientation): string {
        if ($orientation < 2 || $orientation > 8) {
            return '';
        }
        $tiff = "MM\x00\x2A\x00\x00\x00\x08"    // big-endian TIFF header, IFD0 at offset 8
            . "\x00\x01"                          // one entry
            . "\x01\x12\x00\x03\x00\x00\x00\x01"  // Orientation, SHORT, count 1
            . pack('n', $orientation) . "\x00\x00"
            . "\x00\x00\x00\x00";                 // no next IFD
        $payload = "Exif\0\0" . $tiff;
        return "\xFF\xE1" . pack('n', strlen($payload) + 2) . $payload;
    }

    // ----------------------------------------------------------------- PNG

    private function png(): StrippedMedia {
        $out = substr($this->b, 0, 8);
        $pos = 8;
        $width = 0;
        $height = 0;
        $frames = 1;
        $hasImageData = false;

        for ($count = 0; ; $count++) {
            if ($count >= self::MAX_STREAM_ITEMS) {
                self::corrupt('too many PNG chunks');
            }
            if ($this->len - $pos < 12) {
                self::corrupt('PNG without IEND');
            }
            $dataLength = $this->u32be($pos);
            if ($dataLength > 0x7FFFFFFF || $dataLength > $this->len - $pos - 12) {
                self::corrupt('PNG chunk runs past the end');
            }
            $type = substr($this->b, $pos + 4, 4);
            if (preg_match('/^[A-Za-z]{4}$/D', $type) !== 1) {
                self::corrupt('invalid PNG chunk type');
            }
            if (($count === 0) !== ($type === 'IHDR')) {
                self::corrupt('IHDR must be the first and only header');
            }
            $chunkLength = 12 + $dataLength;

            if (in_array($type, self::PNG_KEEP, true)) {
                $crc = $this->u32be($pos + 8 + $dataLength);
                if (crc32(substr($this->b, $pos + 4, 4 + $dataLength)) !== $crc) {
                    self::corrupt('bad CRC in PNG ' . $type);
                }
                $out .= substr($this->b, $pos, $chunkLength);

                if ($type === 'IHDR') {
                    if ($dataLength !== 13) {
                        self::corrupt('bad IHDR');
                    }
                    $width = $this->u32be($pos + 8);
                    $height = $this->u32be($pos + 12);
                    if ($width === 0 || $height === 0 || $width > 0x7FFFFFFF || $height > 0x7FFFFFFF) {
                        self::corrupt('bad PNG dimensions');
                    }
                } elseif ($type === 'IDAT') {
                    $hasImageData = true;
                } elseif ($type === 'acTL') {
                    if ($dataLength !== 8) {
                        self::corrupt('bad acTL');
                    }
                    $frames = $this->u32be($pos + 8);
                    if ($frames === 0) {
                        self::corrupt('APNG without frames');
                    }
                } elseif ($type === 'IEND') {
                    if (!$hasImageData) {
                        self::corrupt('PNG without image data');
                    }
                    // Anything after IEND (a ZIP, a script) is cut off.
                    return new StrippedMedia($out, $width, $height, $frames > 1, $frames, false);
                }
            }
            // Dropped: tEXt, zTXt, iTXt (XMP), eXIf, tIME and every chunk
            // not on the list, including vendor chunks.
            $pos += $chunkLength;
        }
    }

    // ----------------------------------------------------------------- GIF

    private function gif(): StrippedMedia {
        if ($this->len < 13) {
            self::corrupt('GIF header too short');
        }
        $width = $this->u16le(6);
        $height = $this->u16le(8);
        $pos = 13 + self::gifColourTableSize(ord($this->b[10]));
        if ($pos > $this->len) {
            self::corrupt('GIF colour table runs past the end');
        }
        $out = substr($this->b, 0, $pos);
        $frames = 0;

        for ($count = 0; ; $count++) {
            if ($count >= self::MAX_STREAM_ITEMS) {
                self::corrupt('too many GIF blocks');
            }
            if ($pos >= $this->len) {
                self::corrupt('GIF without trailer');
            }
            $introducer = ord($this->b[$pos]);

            if ($introducer === 0x3B) {
                if ($frames === 0) {
                    self::corrupt('GIF without images');
                }
                // The trailer ends the file; anything after it is cut off.
                $out .= ';';
                return new StrippedMedia($out, $width, $height, $frames > 1, $frames, false);
            }

            if ($introducer === 0x2C) {
                // Image descriptor (10 bytes), local colour table, LZW
                // minimum code size, then the image data sub-blocks.
                if ($this->len - $pos < 11) {
                    self::corrupt('GIF image descriptor runs past the end');
                }
                $dataStart = $pos + 10 + self::gifColourTableSize(ord($this->b[$pos + 9])) + 1;
                if ($dataStart > $this->len) {
                    self::corrupt('GIF colour table runs past the end');
                }
                $end = $this->gifSubBlocksEnd($dataStart);
                $out .= substr($this->b, $pos, $end - $pos);
                $frames++;
                $pos = $end;
                continue;
            }

            if ($introducer === 0x21) {
                if ($this->len - $pos < 2) {
                    self::corrupt('GIF extension runs past the end');
                }
                $label = ord($this->b[$pos + 1]);
                $blocks = $this->gifSubBlocks($pos + 2);
                $end = array_pop($blocks);
                $out .= $this->gifExtension($label, $blocks);
                $pos = $end;
                continue;
            }

            self::corrupt(sprintf('unknown GIF block %02X', $introducer));
        }
    }

    private static function gifColourTableSize(int $packed): int {
        return ($packed & 0x80) !== 0 ? 3 << (($packed & 0x07) + 1) : 0;
    }

    /**
     * The extension to copy, rebuilt from only the fields that are needed so
     * that no extra sub-blocks ride along, or '' to drop it.
     *
     * @param list<array{0: int, 1: int}> $blocks Offset and length of each data sub-block
     */
    private function gifExtension(int $label, array $blocks): string {
        if ($label === 0xF9) {
            // Graphic control: frame delay, disposal and transparency.
            if ($blocks === [] || $blocks[0][1] !== 4) {
                self::corrupt('bad GIF graphic control extension');
            }
            return "\x21\xF9\x04" . substr($this->b, $blocks[0][0], 4) . "\x00";
        }
        if ($label === 0xFF && $blocks !== [] && $blocks[0][1] === 11) {
            $identifier = substr($this->b, $blocks[0][0], 11);
            if (in_array($identifier, self::GIF_LOOP_EXTENSIONS, true)) {
                // Keep only the loop count sub-block (ID 1, 16-bit count).
                foreach (array_slice($blocks, 1) as [$offset, $length]) {
                    if ($length === 3 && $this->b[$offset] === "\x01") {
                        return "\x21\xFF\x0B" . $identifier . "\x03" . substr($this->b, $offset, 3) . "\x00";
                    }
                }
            }
        }
        // Comments (FE), plain text (01), XMP and every other application
        // extension are dropped.
        return '';
    }

    /**
     * The data sub-blocks starting at $pos, followed by the offset just past
     * the terminating zero-length block.
     *
     * @return list<mixed>
     */
    private function gifSubBlocks(int $pos): array {
        $blocks = [];
        while (true) {
            if ($pos >= $this->len) {
                self::corrupt('GIF sub-block runs past the end');
            }
            $length = ord($this->b[$pos]);
            $pos++;
            if ($length === 0) {
                $blocks[] = $pos;
                return $blocks;
            }
            if ($length > $this->len - $pos) {
                self::corrupt('GIF sub-block runs past the end');
            }
            $blocks[] = [$pos, $length];
            $pos += $length;
        }
    }

    /** Like gifSubBlocks, for image data where only the end matters. */
    private function gifSubBlocksEnd(int $pos): int {
        while (true) {
            if ($pos >= $this->len) {
                self::corrupt('GIF sub-block runs past the end');
            }
            $length = ord($this->b[$pos]);
            $pos++;
            if ($length === 0) {
                return $pos;
            }
            if ($length > $this->len - $pos) {
                self::corrupt('GIF sub-block runs past the end');
            }
            $pos += $length;
        }
    }

    // ----------------------------------------------------------------- MP4

    private function mp4(): StrippedMedia {
        $pos = 0;
        $hasMovie = false;
        $hasMediaData = false;
        for ($count = 0; $pos < $this->len; $count++) {
            if ($count >= self::MAX_STREAM_ITEMS) {
                self::corrupt('too many MP4 boxes');
            }
            [$type, $headerLength, $contentStart, $end] = $this->mp4Box($pos, $this->len, true);
            if (($count === 0) !== ($type === 'ftyp')) {
                self::corrupt('ftyp must be the first and only file type box');
            }

            if (in_array($type, self::MP4_METADATA, true)) {
                $this->blankMp4Box($pos, $headerLength, $end, true);
            } elseif (in_array($type, self::MP4_PADDING, true)) {
                $this->blankMp4Box($pos, $headerLength, $end, false);
            } elseif (!in_array($type, self::MP4_TOP_LEVEL, true)) {
                self::corrupt('unknown top-level box ' . self::printable($type));
            } elseif ($type === 'moov') {
                if ($hasMovie) {
                    self::corrupt('second moov');
                }
                $hasMovie = true;
                $this->walkMp4($contentStart, $end, 1, $type);
            } elseif ($type === 'moof') {
                $this->walkMp4($contentStart, $end, 1, $type);
            } elseif ($type === 'mdat') {
                $hasMediaData = true;
            }
            $pos = $end;
        }

        if (!$hasMediaData || !$hasMovie) {
            self::corrupt('MP4 without mdat or moov');
        }
        if (!$this->hasVideo) {
            throw new MediaException('unsupported_type', 'no video track');
        }
        return new StrippedMedia($this->applyPatches(), $this->width, $this->height, false, 0, $this->hasAudio);
    }

    /**
     * Reads one box header.
     *
     * @return array{0: string, 1: int, 2: int, 3: int} Type, length of the
     *         size/type header (8 or 16), where the content starts (after a
     *         uuid's extended type) and where the box ends
     */
    private function mp4Box(int $pos, int $end, bool $topLevel): array {
        if ($end - $pos < 8) {
            self::corrupt('bytes left after the last MP4 box');
        }
        $size = $this->u32be($pos);
        $type = substr($this->b, $pos + 4, 4);
        $headerLength = 8;
        if ($size === 1) {
            // A 64-bit size follows. Read it as two halves so a value above
            // PHP_INT_MAX cannot wrap around to a negative number.
            if ($end - $pos < 16) {
                self::corrupt('MP4 box header runs past the end');
            }
            $high = $this->u32be($pos + 8);
            if ($high > 0x7FFFFFFF) {
                self::corrupt('MP4 box too large');
            }
            $size = $high * 0x100000000 + $this->u32be($pos + 12);
            $headerLength = 16;
        } elseif ($size === 0) {
            // "Runs to the end of the file" only makes sense at the top.
            if (!$topLevel) {
                self::corrupt('MP4 box of size 0 inside a container');
            }
            $size = $end - $pos;
        }
        if ($size < $headerLength || $size > $end - $pos) {
            self::corrupt('MP4 box ' . self::printable($type) . ' has a bad size');
        }
        $contentStart = $pos + $headerLength;
        if ($type === 'uuid') {
            $contentStart += 16;
            if ($contentStart > $pos + $size) {
                self::corrupt('MP4 uuid box too short');
            }
        }
        return [$type, $headerLength, $contentStart, $pos + $size];
    }

    /**
     * Zeroes a box's content in place, and renames it to free when it is a
     * metadata box. The size stays, so every chunk offset into mdat stays
     * valid.
     */
    private function blankMp4Box(int $pos, int $headerLength, int $end, bool $rename): void {
        if ($rename) {
            $this->patches[] = [$pos + 4, 'free'];
        }
        // From after the size/type header: a uuid's extended type goes too.
        $this->zero($pos + $headerLength, $end - $pos - $headerLength);
    }

    private function walkMp4(int $start, int $end, int $depth, string $parent): void {
        if ($depth > self::MAX_DEPTH) {
            self::corrupt('MP4 boxes nested too deep');
        }
        $pos = $start;
        for ($count = 0; $pos < $end; $count++) {
            if ($count >= self::MAX_STREAM_ITEMS) {
                self::corrupt('too many MP4 boxes');
            }
            [$type, $headerLength, $contentStart, $boxEnd] = $this->mp4Box($pos, $end, false);

            if (in_array($type, self::MP4_PADDING, true)) {
                $this->blankMp4Box($pos, $headerLength, $boxEnd, false);
            } elseif (!in_array($type, self::MP4_KNOWN_CHILDREN, true)) {
                // udta, meta, uuid and anything unknown.
                $this->blankMp4Box($pos, $headerLength, $boxEnd, true);
            } elseif ($type === 'trak') {
                if ($parent !== 'moov' || $this->track !== null) {
                    self::corrupt('trak outside moov');
                }
                $this->track = ['handler' => null, 'width' => null, 'height' => null];
                $this->walkMp4($contentStart, $boxEnd, $depth + 1, $type);
                $this->finishMp4Track();
            } elseif (in_array($type, self::MP4_CONTAINERS, true)) {
                $this->walkMp4($contentStart, $boxEnd, $depth + 1, $type);
            } elseif ($type === 'mvhd' || $type === 'mdhd') {
                $this->zeroMp4Times($contentStart, $boxEnd);
            } elseif ($type === 'tkhd') {
                $this->readTrackHeader($contentStart, $boxEnd, $parent);
            } elseif ($type === 'hdlr') {
                $this->readHandler($contentStart, $boxEnd, $parent);
            } elseif ($type === 'dref') {
                $this->checkDataReferences($contentStart, $boxEnd);
            }
            $pos = $boxEnd;
        }
    }

    /**
     * Creation and modification time say when the video was recorded, much
     * like Exif DateTimeOriginal; players do not need them.
     */
    private function zeroMp4Times(int $start, int $end): void {
        $version = $this->u8($start, $end);
        if ($version > 1) {
            self::corrupt('unknown MP4 header version');
        }
        // After version and flags: two 32-bit times (version 0) or two
        // 64-bit times (version 1).
        $timesLength = $version === 0 ? 8 : 16;
        if ($end - $start < 4 + $timesLength) {
            self::corrupt('MP4 header too short');
        }
        $this->zero($start + 4, $timesLength);
    }

    private function readTrackHeader(int $start, int $end, string $parent): void {
        if ($parent !== 'trak' || $this->track === null || $this->track['width'] !== null) {
            self::corrupt('misplaced tkhd');
        }
        $version = $this->u8($start, $end);
        if ($version > 1) {
            self::corrupt('unknown tkhd version');
        }
        // Version 1 has 64-bit times and duration: 12 bytes longer. Width
        // and height are the last two 16.16 fixed-point fields.
        $sizeOffset = $version === 0 ? 76 : 88;
        if ($end - $start < $sizeOffset + 8) {
            self::corrupt('tkhd too short');
        }
        $this->zeroMp4Times($start, $end);
        $this->track['width'] = $this->u32be($start + $sizeOffset) >> 16;
        $this->track['height'] = $this->u32be($start + $sizeOffset + 4) >> 16;
    }

    private function readHandler(int $start, int $end, string $parent): void {
        // Version/flags, pre_defined, handler type, three reserved words,
        // then a name.
        if ($end - $start < 12) {
            self::corrupt('hdlr too short');
        }
        if ($parent === 'mdia') {
            if ($this->track === null || $this->track['handler'] !== null) {
                self::corrupt('misplaced hdlr');
            }
            $this->track['handler'] = substr($this->b, $start + 8, 4);
        }
        // The name is free text that muxers fill from user metadata. Zeroes
        // read as an empty string both as a C string (MP4) and as a Pascal
        // string (QuickTime-style writers).
        if ($end - $start > 24) {
            $this->zero($start + 24, $end - $start - 24);
        }
    }

    /**
     * A data reference can point at media in another file, by URL or as a
     * Mac alias holding a local path. A file IntroVox serves must contain
     * its own media, so only self-contained entries (flag 1) are allowed,
     * and any text left in them is zeroed.
     */
    private function checkDataReferences(int $start, int $end): void {
        if ($end - $start < 8) {
            self::corrupt('dref too short');
        }
        $pos = $start + 8;
        for ($count = 0; $pos < $end; $count++) {
            if ($count >= self::MAX_ITEMS) {
                self::corrupt('too many data references');
            }
            [, $headerLength, $contentStart, $entryEnd] = $this->mp4Box($pos, $end, false);
            if ($entryEnd - $contentStart < 4 || ($this->u32be($contentStart) & 1) === 0) {
                self::corrupt('MP4 refers to media outside the file');
            }
            $this->zero($contentStart + 4, $entryEnd - $contentStart - 4);
            $pos = $entryEnd;
        }
    }

    private function finishMp4Track(): void {
        $track = $this->track;
        $this->track = null;
        if ($track === null || $track['handler'] === null || $track['width'] === null) {
            self::corrupt('MP4 track without tkhd or hdlr');
        }
        if ($track['handler'] === 'vide') {
            if (!$this->hasVideo) {
                $this->width = $track['width'];
                $this->height = (int)$track['height'];
            }
            $this->hasVideo = true;
        } elseif ($track['handler'] === 'soun') {
            $this->hasAudio = true;
        } else {
            // Subtitles, chapters, timecode, GoPro/camera telemetry (GPS):
            // none of it is shown in a tour, all of it can leak.
            throw new MediaException('metadata_track', self::printable($track['handler']));
        }
    }

    // ---------------------------------------------------------------- WebM

    private function webm(): StrippedMedia {
        [$id, $headerEnd] = $this->ebmlElement(0, $this->len);
        if ($id !== self::EBML_HEADER || $headerEnd[1] < 0) {
            self::corrupt('missing EBML header');
        }
        [$dataStart, $size] = $headerEnd;
        $this->checkEbmlHeader($dataStart, $dataStart + $size);

        [$id, [$segmentStart, $segmentSize]] = $this->ebmlElement($dataStart + $size, $this->len);
        if ($id !== self::MKV_SEGMENT) {
            self::corrupt('missing Segment');
        }
        // An unknown size (live recordings) means "to the end of the file".
        $segmentEnd = $segmentSize < 0 ? $this->len : $segmentStart + $segmentSize;
        if ($segmentEnd !== $this->len) {
            self::corrupt('bytes after the Segment');
        }
        $this->walkSegment($segmentStart, $segmentEnd);

        if (!$this->hasVideo) {
            throw new MediaException('unsupported_type', 'no video track');
        }
        return new StrippedMedia($this->applyPatches(), $this->width, $this->height, false, 0, $this->hasAudio);
    }

    private function checkEbmlHeader(int $start, int $end): void {
        $docType = null;
        $pos = $start;
        for ($count = 0; $pos < $end; $count++) {
            if ($count >= self::MAX_ITEMS) {
                self::corrupt('too many EBML header elements');
            }
            [$id, [$dataStart, $size]] = $this->ebmlElement($pos, $end);
            if ($size < 0) {
                self::corrupt('EBML header element of unknown size');
            }
            if ($id === self::EBML_DOCTYPE) {
                $docType = rtrim(substr($this->b, $dataStart, $size), "\0");
            }
            $pos = $dataStart + $size;
        }
        if ($docType !== 'webm') {
            self::corrupt('DocType is not webm');
        }
    }

    private function walkSegment(int $start, int $end): void {
        $seenInfo = false;
        $seenTracks = false;
        $pos = $start;
        for ($count = 0; $pos < $end; $count++) {
            if ($count >= self::MAX_STREAM_ITEMS) {
                self::corrupt('too many Segment elements');
            }
            [$id, [$dataStart, $size]] = $this->ebmlElement($pos, $end);
            if ($size < 0) {
                // Only a Cluster may have an unknown size (Matroska allows
                // it for Segment and Cluster). It ends where the next level-1
                // element starts, or at the end of the Segment.
                if ($id !== self::MKV_CLUSTER) {
                    self::corrupt('element of unknown size');
                }
                $pos = $this->walkCluster($dataStart, $end, true);
                continue;
            }
            $elementEnd = $dataStart + $size;

            switch ($id) {
                case self::MKV_SEEKHEAD:
                case self::MKV_CUES:
                case self::MKV_CHAPTERS:
                case self::MKV_CRC32:
                    break;
                case self::MKV_VOID:
                    // Void content is ignored by every reader, but tools
                    // that "remove" tags often leave the old text in it.
                    $this->zero($dataStart, $size);
                    break;
                case self::MKV_INFO:
                    if ($seenInfo) {
                        self::corrupt('second Info');
                    }
                    $seenInfo = true;
                    $this->walkInfo($dataStart, $elementEnd);
                    break;
                case self::MKV_TRACKS:
                    if ($seenTracks) {
                        self::corrupt('second Tracks');
                    }
                    $seenTracks = true;
                    $this->walkTracks($dataStart, $elementEnd);
                    break;
                case self::MKV_CLUSTER:
                    $this->walkCluster($dataStart, $elementEnd, false);
                    break;
                case self::MKV_TAGS:
                case self::MKV_ATTACHMENTS:
                    // Same length, so SeekHead and Cues positions stay valid.
                    $this->voidElement($pos, $elementEnd);
                    break;
                default:
                    self::corrupt(sprintf('unknown Segment element %X', $id));
            }
            $pos = $elementEnd;
        }
    }

    /**
     * Checks a Cluster's children and returns where the Cluster ends. For a
     * Cluster of unknown size that is the first level-1 ID met while walking
     * its children (Matroska's own rule), or the end of the Segment.
     */
    private function walkCluster(int $start, int $end, bool $unknownSize): int {
        $pos = $start;
        for ($count = 0; $pos < $end; $count++) {
            if ($count >= self::MAX_STREAM_ITEMS) {
                self::corrupt('too many Cluster elements');
            }
            [$id] = $this->ebmlId($pos, $end);
            if ($unknownSize && in_array($id, self::MKV_LEVEL1, true)) {
                return $pos;
            }
            [, [$dataStart, $size]] = $this->ebmlElement($pos, $end);
            if ($size < 0 || !in_array($id, self::MKV_CLUSTER_CHILDREN, true)) {
                self::corrupt(sprintf('unexpected Cluster element %X', $id));
            }
            $pos = $dataStart + $size;
        }
        return $end;
    }

    private function walkInfo(int $start, int $end): void {
        $changed = false;
        $checksums = [];
        foreach ($this->ebmlChildren($start, $end) as [$id, $pos, , $childEnd]) {
            if ($id === self::MKV_CRC32) {
                $checksums[] = [$pos, $childEnd];
            } elseif (!in_array($id, self::MKV_INFO_KEEP, true)) {
                // Title, DateUTC, file names, segment family and so on.
                $this->voidElement($pos, $childEnd);
                $changed = true;
            }
        }
        $this->voidStaleChecksums($changed, $checksums);
    }

    private function walkTracks(int $start, int $end): void {
        $changed = false;
        $checksums = [];
        foreach ($this->ebmlChildren($start, $end) as [$id, $pos, $dataStart, $childEnd]) {
            if ($id === self::MKV_TRACK_ENTRY) {
                $changed = $this->walkTrackEntry($dataStart, $childEnd) || $changed;
            } elseif ($id === self::MKV_CRC32) {
                $checksums[] = [$pos, $childEnd];
            } elseif ($id !== self::MKV_VOID) {
                self::corrupt(sprintf('unexpected Tracks element %X', $id));
            }
        }
        $this->voidStaleChecksums($changed, $checksums);
    }

    /**
     * @return bool Whether the entry was changed
     */
    private function walkTrackEntry(int $start, int $end): bool {
        $type = null;
        $size = null;
        $changed = false;
        $checksums = [];
        foreach ($this->ebmlChildren($start, $end) as [$id, $pos, $dataStart, $childEnd]) {
            if ($id === self::MKV_TRACK_TYPE) {
                $type = $this->ebmlUint($dataStart, $childEnd);
            } elseif ($id === self::MKV_VIDEO) {
                $size = $this->readVideoSize($dataStart, $childEnd);
            } elseif ($id === self::MKV_TRACK_NAME) {
                // A free-text track name, filled from user metadata.
                $this->voidElement($pos, $childEnd);
                $changed = true;
            } elseif ($id === self::MKV_CRC32) {
                $checksums[] = [$pos, $childEnd];
            }
        }
        $this->voidStaleChecksums($changed, $checksums);

        if ($type === null || $type === 0) {
            self::corrupt('track without type');
        }
        if ($type === 1) {
            if ($size === null) {
                self::corrupt('video track without size');
            }
            if (!$this->hasVideo) {
                [$this->width, $this->height] = $size;
            }
            $this->hasVideo = true;
        } elseif ($type === 2) {
            $this->hasAudio = true;
        } else {
            // Subtitles, buttons, logos, metadata, complex tracks.
            throw new MediaException('metadata_track', 'type ' . $type);
        }
        return $changed;
    }

    /**
     * @return array{0: int, 1: int}|null PixelWidth and PixelHeight
     */
    private function readVideoSize(int $start, int $end): ?array {
        $width = null;
        $height = null;
        foreach ($this->ebmlChildren($start, $end) as [$id, , $dataStart, $childEnd]) {
            if ($id === self::MKV_PIXEL_WIDTH) {
                $width = $this->ebmlUint($dataStart, $childEnd);
            } elseif ($id === self::MKV_PIXEL_HEIGHT) {
                $height = $this->ebmlUint($dataStart, $childEnd);
            }
        }
        return $width === null || $height === null ? null : [$width, $height];
    }

    /**
     * A CRC-32 element no longer matches once its parent was changed. WebM
     * does not use them (ffmpeg does not write them for WebM), but if one is
     * there it is turned into Void rather than left wrong.
     *
     * @param list<array{0: int, 1: int}> $checksums
     */
    private function voidStaleChecksums(bool $changed, array $checksums): void {
        if ($changed) {
            foreach ($checksums as [$start, $end]) {
                $this->voidElement($start, $end);
            }
        }
    }

    /**
     * The children of a master element of known size, none of which may have
     * an unknown size.
     *
     * @return list<array{0: int, 1: int, 2: int, 3: int}> ID, start, data start, end
     */
    private function ebmlChildren(int $start, int $end): array {
        $children = [];
        $pos = $start;
        for ($count = 0; $pos < $end; $count++) {
            if ($count >= self::MAX_ITEMS) {
                self::corrupt('too many EBML elements');
            }
            [$id, [$dataStart, $size]] = $this->ebmlElement($pos, $end);
            if ($size < 0) {
                self::corrupt(sprintf('element %X of unknown size', $id));
            }
            $children[] = [$id, $pos, $dataStart, $dataStart + $size];
            $pos = $dataStart + $size;
        }
        return $children;
    }

    /**
     * Reads an element header that must fit before $end.
     *
     * @return array{0: int, 1: array{0: int, 1: int}} ID, then the data start
     *         and the data size (-1 when unknown)
     */
    private function ebmlElement(int $pos, int $end): array {
        [$id, $sizeStart] = $this->ebmlId($pos, $end);
        [$size, $dataStart] = $this->ebmlSize($sizeStart, $end);
        if ($size > $end - $dataStart) {
            self::corrupt(sprintf('element %X runs past its parent', $id));
        }
        return [$id, [$dataStart, $size]];
    }

    /**
     * An element ID of 1 to 4 bytes, marker bits kept.
     *
     * @return array{0: int, 1: int} The ID and the offset after it
     */
    private function ebmlId(int $pos, int $end): array {
        $first = $this->u8($pos, $end);
        $length = $first >= 0x80 ? 1 : ($first >= 0x40 ? 2 : ($first >= 0x20 ? 3 : ($first >= 0x10 ? 4 : 0)));
        if ($length === 0 || $length > $end - $pos) {
            self::corrupt('bad EBML element ID');
        }
        $id = 0;
        for ($i = 0; $i < $length; $i++) {
            $id = ($id << 8) | ord($this->b[$pos + $i]);
        }
        return [$id, $pos + $length];
    }

    /**
     * A data size: a variable-length integer of 1 to 8 bytes. Eight bytes
     * leave 56 value bits, so the result always fits in a PHP int.
     *
     * @return array{0: int, 1: int} The size (-1 for "unknown") and the
     *         offset after it
     */
    private function ebmlSize(int $pos, int $end): array {
        $first = $this->u8($pos, $end);
        if ($first === 0) {
            self::corrupt('EBML size longer than 8 bytes');
        }
        $length = 1;
        $mask = 0x80;
        while (($first & $mask) === 0) {
            $length++;
            $mask >>= 1;
        }
        if ($length > $end - $pos) {
            self::corrupt('EBML size runs past the end');
        }
        $value = $first & ($mask - 1);
        $allOnes = $value === $mask - 1;
        for ($i = 1; $i < $length; $i++) {
            $byte = ord($this->b[$pos + $i]);
            $value = ($value << 8) | $byte;
            $allOnes = $allOnes && $byte === 0xFF;
        }
        return [$allOnes ? -1 : $value, $pos + $length];
    }

    private function ebmlUint(int $start, int $end): int {
        $length = $end - $start;
        // Eight bytes with the top bit set would not fit in a PHP int.
        if ($length > 8 || ($length === 8 && ord($this->b[$start]) >= 0x80)) {
            self::corrupt('EBML integer too large');
        }
        $value = 0;
        for ($i = $start; $i < $end; $i++) {
            $value = ($value << 8) | ord($this->b[$i]);
        }
        return $value;
    }

    /**
     * Replaces the element from $start to $end with a Void element of the
     * same total length and zeroed content.
     */
    private function voidElement(int $start, int $end): void {
        $total = $end - $start;
        if ($total >= 9) {
            // ID, an 8-byte size (0x01 then 7 bytes), then the zeroes.
            $this->patches[] = [$start, "\xEC\x01" . substr(pack('J', $total - 9), 1)];
            $this->zero($start + 9, $total - 9);
        } elseif ($total >= 2) {
            $this->patches[] = [$start, "\xEC" . chr(0x80 | ($total - 2))];
            $this->zero($start + 2, $total - 2);
        } else {
            self::corrupt('element too short to replace');
        }
    }

    // ----------------------------------------------------------------- VTT

    private function vtt(): StrippedMedia {
        if (strpos($this->b, "\0") !== false) {
            self::corrupt('NUL byte in caption file');
        }
        if (preg_match('//u', $this->b) !== 1) {
            self::corrupt('caption file is not valid UTF-8');
        }
        return new StrippedMedia($this->b, 0, 0, false, 0, false);
    }

    // ------------------------------------------------------------- Helpers

    private function zero(int $offset, int $length): void {
        if ($length > 0) {
            $this->patches[] = [$offset, $length];
        }
    }

    /**
     * Applies the in-place edits in one pass, so a large video is copied
     * once instead of once per edit.
     */
    private function applyPatches(): string {
        usort($this->patches, static fn (array $a, array $b): int => $a[0] <=> $b[0]);
        $out = '';
        $cursor = 0;
        foreach ($this->patches as [$offset, $replacement]) {
            if (is_int($replacement)) {
                $replacement = str_repeat("\0", $replacement);
            }
            if ($offset < $cursor || $offset + strlen($replacement) > $this->len) {
                throw new \LogicException('overlapping media patches');
            }
            $out .= substr($this->b, $cursor, $offset - $cursor);
            $out .= $replacement;
            $cursor = $offset + strlen($replacement);
        }
        $out .= substr($this->b, $cursor);
        if (strlen($out) !== $this->len) {
            throw new \LogicException('media patches changed the length');
        }
        return $out;
    }

    private function u8(int $pos, int $end): int {
        if ($pos < 0 || $pos >= $end || $pos >= $this->len) {
            self::corrupt('read past the end');
        }
        return ord($this->b[$pos]);
    }

    private function u16be(int $pos): int {
        if ($pos < 0 || $pos > $this->len - 2) {
            self::corrupt('read past the end');
        }
        return unpack('n', $this->b, $pos)[1];
    }

    private function u16le(int $pos): int {
        if ($pos < 0 || $pos > $this->len - 2) {
            self::corrupt('read past the end');
        }
        return unpack('v', $this->b, $pos)[1];
    }

    private function u32be(int $pos): int {
        if ($pos < 0 || $pos > $this->len - 4) {
            self::corrupt('read past the end');
        }
        return unpack('N', $this->b, $pos)[1];
    }

    private static function printable(string $value): string {
        return (string)preg_replace('/[^\x20-\x7E]/', '?', substr($value, 0, 32));
    }

    /**
     * @throws MediaException
     */
    private static function corrupt(string $detail): never {
        throw new MediaException('corrupt', $detail);
    }
}
