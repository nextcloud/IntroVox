<?php

declare(strict_types=1);

namespace OCA\IntroVox\Http;

use OCP\AppFramework\Http;
use OCP\AppFramework\Http\ICallbackResponse;
use OCP\AppFramework\Http\IOutput;
use OCP\AppFramework\Http\Response;

/**
 * A video, whole or one range of it, for seeking.
 *
 * The body is written in callback(), which Nextcloud calls only after it
 * has sent the status line and every header. A response that echoes in
 * render() instead goes out before its headers, as 200 text/html: a video
 * with HTML in it would then render as a page on the Nextcloud domain.
 *
 * @template-extends Response<int, array<string, mixed>>
 */
class RangeFileResponse extends Response implements ICallbackResponse {
    /** @var resource|null */
    private $stream;
    private int $start = 0;
    private int $length = 0;

    /**
     * @param resource $stream Readable; seekable when $range asks for 206
     * @param array $range RangeParser::parse()
     * @param array<string, string> $headers Sent on every status
     */
    public function __construct($stream, int $size, array $range, array $headers) {
        parent::__construct();
        $this->stream = $stream;
        foreach ($headers as $name => $value) {
            $this->addHeader($name, $value);
        }
        $this->addHeader('Accept-Ranges', 'bytes');

        if ($range['status'] === Http::STATUS_REQUEST_RANGE_NOT_SATISFIABLE) {
            $this->setStatus(Http::STATUS_REQUEST_RANGE_NOT_SATISFIABLE);
            $this->addHeader('Content-Range', 'bytes */' . $size);
            $this->addHeader('Content-Length', '0');
            return;
        }
        if ($range['status'] === Http::STATUS_PARTIAL_CONTENT) {
            $this->setStatus(Http::STATUS_PARTIAL_CONTENT);
            $this->start = $range['start'];
            $this->length = $range['end'] - $range['start'] + 1;
            $this->addHeader('Content-Range', 'bytes ' . $range['start'] . '-' . $range['end'] . '/' . $size);
        } else {
            $this->setStatus(Http::STATUS_OK);
            $this->length = $size;
        }
        $this->addHeader('Content-Length', (string)$this->length);
    }

    public function callback(IOutput $output): void {
        if ($this->stream === null) {
            return;
        }
        try {
            if ($this->getStatus() === Http::STATUS_REQUEST_RANGE_NOT_SATISFIABLE) {
                return;
            }
            if ($this->start > 0 && fseek($this->stream, $this->start) !== 0) {
                return;
            }
            $remaining = $this->length;
            while ($remaining > 0 && !feof($this->stream)) {
                $chunk = fread($this->stream, min(65536, $remaining));
                if ($chunk === false || $chunk === '') {
                    break;
                }
                $output->setOutput($chunk);
                $remaining -= strlen($chunk);
            }
        } finally {
            fclose($this->stream);
            $this->stream = null;
        }
    }
}
