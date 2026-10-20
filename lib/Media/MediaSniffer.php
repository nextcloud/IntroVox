<?php

declare(strict_types=1);

namespace OCA\IntroVox\Media;

/**
 * Tells what a file really is from its first bytes. The file name and the
 * MIME type the browser sends are chosen by whoever uploads, so neither is
 * looked at; only the signatures below decide. Everything else (SVG, HTML,
 * PDF, QuickTime, Matroska, plain text, ...) is unknown, so it can never be
 * stored under one of the allowed types.
 *
 * Plain PHP without Nextcloud dependencies, so it can be tested directly.
 */
final class MediaSniffer {
    /**
     * ISO BMFF major brands browsers play as MP4. QuickTime ("qt  ") is left
     * out: it is a different container that browsers only partly support.
     */
    private const MP4_BRANDS = [
        'isom', 'iso2', 'iso3', 'iso4', 'iso5', 'iso6',
        'mp41', 'mp42', 'avc1', 'M4V ', 'dash', 'mmp4', 'MSNV',
    ];

    private const EBML_MAGIC = "\x1A\x45\xDF\xA3";
    private const EBML_DOCTYPE = 0x4282;

    /**
     * @param string $head The first bytes of the file (callers pass up to 4096)
     * @return string|null 'png', 'jpg', 'gif', 'webp', 'mp4', 'webm', 'vtt' or null
     */
    public static function detect(string $head): ?string {
        if (str_starts_with($head, "\x89PNG\r\n\x1a\n")) {
            return 'png';
        }
        if (str_starts_with($head, "\xFF\xD8\xFF")) {
            return 'jpg';
        }
        if (str_starts_with($head, 'GIF87a') || str_starts_with($head, 'GIF89a')) {
            return 'gif';
        }
        if (strlen($head) >= 12 && substr($head, 0, 4) === 'RIFF' && substr($head, 8, 4) === 'WEBP') {
            return 'webp';
        }
        if (strlen($head) >= 12 && substr($head, 4, 4) === 'ftyp') {
            // The ftyp box holds at least its header, the major brand and
            // the minor version: 16 bytes.
            $boxSize = unpack('N', $head)[1];
            if ($boxSize < 16) {
                return null;
            }
            return in_array(substr($head, 8, 4), self::MP4_BRANDS, true) ? 'mp4' : null;
        }
        if (str_starts_with($head, self::EBML_MAGIC)) {
            // WebM and Matroska share the EBML container; only the DocType
            // in the header tells them apart.
            return self::ebmlDocType($head) === 'webm' ? 'webm' : null;
        }
        if (self::isVtt($head)) {
            return 'vtt';
        }
        return null;
    }

    private static function isVtt(string $head): bool {
        if (str_starts_with($head, "\xEF\xBB\xBF")) {
            $head = substr($head, 3);
        }
        if (!str_starts_with($head, 'WEBVTT')) {
            return false;
        }
        // "WEBVTT" must stand alone or be followed by whitespace, so that
        // "WEBVTTX" or "WEBVTT<html>" are not taken for a caption file.
        return strlen($head) === 6 || in_array($head[6], [' ', "\t", "\r", "\n"], true);
    }

    /**
     * The DocType string from an EBML header, or null when it cannot be found
     * in the bytes given.
     */
    private static function ebmlDocType(string $head): ?string {
        $length = strlen($head);
        $size = self::vint($head, 4, $length);
        if ($size === null || $size[0] < 0) {
            return null;
        }
        $pos = 4 + $size[1];
        $end = min($length, $pos + $size[0]);
        // The header has about seven children; a few more allows for Void.
        for ($i = 0; $i < 32 && $pos < $end; $i++) {
            $id = self::elementId($head, $pos, $end);
            if ($id === null) {
                return null;
            }
            $size = self::vint($head, $pos + $id[1], $end);
            if ($size === null || $size[0] < 0) {
                return null;
            }
            $dataStart = $pos + $id[1] + $size[1];
            if ($size[0] > $end - $dataStart) {
                return null;
            }
            if ($id[0] === self::EBML_DOCTYPE) {
                // EBML strings may be padded with NUL bytes.
                return rtrim(substr($head, $dataStart, $size[0]), "\0");
            }
            $pos = $dataStart + $size[0];
        }
        return null;
    }

    /**
     * An EBML element ID (marker bits kept, as IDs are written in specs).
     *
     * @return array{0: int, 1: int}|null The ID and its length in bytes
     */
    private static function elementId(string $bytes, int $pos, int $end): ?array {
        if ($pos >= $end) {
            return null;
        }
        $first = ord($bytes[$pos]);
        $length = $first >= 0x80 ? 1 : ($first >= 0x40 ? 2 : ($first >= 0x20 ? 3 : ($first >= 0x10 ? 4 : 0)));
        if ($length === 0 || $length > $end - $pos) {
            return null;
        }
        $id = 0;
        for ($i = 0; $i < $length; $i++) {
            $id = ($id << 8) | ord($bytes[$pos + $i]);
        }
        return [$id, $length];
    }

    /**
     * An EBML size: a variable-length integer of 1 to 8 bytes.
     *
     * @return array{0: int, 1: int}|null The value (-1 for "unknown") and
     *         its length in bytes
     */
    private static function vint(string $bytes, int $pos, int $end): ?array {
        if ($pos >= $end) {
            return null;
        }
        $first = ord($bytes[$pos]);
        if ($first === 0) {
            return null;
        }
        $length = 1;
        $mask = 0x80;
        while (($first & $mask) === 0) {
            $length++;
            $mask >>= 1;
        }
        if ($length > $end - $pos) {
            return null;
        }
        $value = $first & ($mask - 1);
        $allOnes = $value === $mask - 1;
        for ($i = 1; $i < $length; $i++) {
            $byte = ord($bytes[$pos + $i]);
            $value = ($value << 8) | $byte;
            $allOnes = $allOnes && $byte === 0xFF;
        }
        return [$allOnes ? -1 : $value, $length];
    }
}
