<?php

declare(strict_types=1);

namespace OCA\IntroVox\Media;

/**
 * Reads the HTTP Range header that browsers send when they stream a video.
 *
 * Only one plain byte range is honoured. Multiple ranges would need a
 * multipart response, and every browser falls back to the full file when it
 * gets a 200, so anything unusual is simply answered with the whole file.
 */
final class RangeParser {
    /**
     * More digits than this could overflow a 64-bit integer, and no file
     * IntroVox serves comes anywhere near 10^18 bytes.
     */
    private const MAX_DIGITS = 18;

    /**
     * @return array{status: int, start?: int, end?: int} 200 for the full
     *         file, 206 with an inclusive byte range, or 416
     */
    public static function parse(?string $header, int $size): array {
        $full = ['status' => 200];
        if ($header === null || $header === '') {
            return $full;
        }
        // Anchored, and D so that a trailing newline does not slip through $.
        if (preg_match('/^bytes=(\d*)-(\d*)$/D', $header, $match) !== 1) {
            return $full;
        }
        [, $first, $last] = $match;
        if ($first === '' && $last === '') {
            return $full;
        }

        $unsatisfiable = ['status' => 416];
        if (strlen($first) > self::MAX_DIGITS || strlen($last) > self::MAX_DIGITS) {
            return $unsatisfiable;
        }
        if ($size <= 0) {
            return $unsatisfiable;
        }

        if ($first === '') {
            // "bytes=-N": the last N bytes; asking for more than there is
            // means the whole file.
            $suffix = (int)$last;
            if ($suffix === 0) {
                return $unsatisfiable;
            }
            return ['status' => 206, 'start' => max(0, $size - $suffix), 'end' => $size - 1];
        }

        $start = (int)$first;
        if ($start >= $size) {
            return $unsatisfiable;
        }
        if ($last === '') {
            return ['status' => 206, 'start' => $start, 'end' => $size - 1];
        }
        $end = (int)$last;
        if ($start > $end) {
            return $unsatisfiable;
        }
        return ['status' => 206, 'start' => $start, 'end' => min($end, $size - 1)];
    }
}
