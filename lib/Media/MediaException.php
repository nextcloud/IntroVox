<?php

declare(strict_types=1);

namespace OCA\IntroVox\Media;

/**
 * Why a media file was refused. The reason is a short fixed word the
 * controller can map to a translated message. MetadataStripper uses three:
 *   unsupported_type  not one of the formats IntroVox accepts
 *   corrupt           the bytes do not follow the format's structure
 *   metadata_track    a video carries a track that is not audio or video
 *                     (subtitles, chapters, timecode, GPS telemetry, ...)
 * Code around it may add its own (a size limit, a quota). The detail is for
 * logs only; it is never shown to users as is.
 */
class MediaException extends \RuntimeException {
    private string $reason;
    private string $detail;

    public function __construct(string $reason, string $detail = '') {
        parent::__construct($reason);
        $this->reason = $reason;
        $this->detail = $detail;
    }

    public function getReason(): string {
        return $this->reason;
    }

    public function getDetail(): string {
        return $this->detail;
    }
}
