<?php

declare(strict_types=1);

namespace OCA\IntroVox\Media;

/**
 * A media file after MetadataStripper has cleaned it, with the few facts the
 * step editor needs to show it.
 */
final class StrippedMedia {
    public function __construct(
        /** The cleaned file */
        public readonly string $bytes,
        /** Pixels; 0 for vtt */
        public readonly int $width,
        /** Pixels; 0 for vtt */
        public readonly int $height,
        /** A GIF (or APNG) with more than one frame */
        public readonly bool $animated,
        /** Frame count: 1 for still images, 0 for video and vtt */
        public readonly int $frames,
        /** A video with a sound track */
        public readonly bool $hasAudio,
    ) {
    }
}
