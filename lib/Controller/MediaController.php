<?php

declare(strict_types=1);

namespace OCA\IntroVox\Controller;

use OCA\IntroVox\Http\RangeFileResponse;
use OCA\IntroVox\Media\RangeParser;
use OCA\IntroVox\Service\MediaService;
use OCP\AppFramework\Controller;
use OCP\AppFramework\Http;
use OCP\AppFramework\Http\Attribute\NoAdminRequired;
use OCP\AppFramework\Http\Attribute\NoCSRFRequired;
use OCP\AppFramework\Http\Attribute\StrictCookiesRequired;
use OCP\AppFramework\Http\DataDisplayResponse;
use OCP\AppFramework\Http\JSONResponse;
use OCP\AppFramework\Http\Response;
use OCP\Files\NotFoundException;
use OCP\IRequest;
use OCP\IUserSession;

/**
 * Serves the images, videos and captions of tour steps (MediaService).
 *
 * It has no request token, as an <img> or a <video> cannot send one. So it
 * only ever reads, needs a logged-in user with strict cookies (no cross-site
 * request carries them), and answers everything it refuses — no such file,
 * not in an enabled step for this user — with the same 404.
 * tests-js/controller-security.test.js allows the exception here and for the
 * share link's redirect (LinkController), and this controller has no other
 * method.
 */
class MediaController extends Controller {
    public function __construct(
        string $appName,
        IRequest $request,
        private MediaService $mediaService,
        private IUserSession $userSession,
    ) {
        parent::__construct($appName, $request);
    }

    #[NoAdminRequired]
    #[NoCSRFRequired]
    #[StrictCookiesRequired]
    public function show(string $file): Response {
        $user = $this->userSession->getUser();
        $meta = $this->mediaService->meta($file);
        if ($user === null || $meta === null || !$this->mediaService->canView($meta, $user)) {
            return new JSONResponse(['success' => false], Http::STATUS_NOT_FOUND);
        }
        try {
            $content = $this->mediaService->content($file);
        } catch (NotFoundException $e) {
            return new JSONResponse(['success' => false], Http::STATUS_NOT_FOUND);
        }

        // The id names the content: a file never changes under it
        $etag = '"' . $meta['sha256'] . '"';
        $headers = [
            'Content-Type' => MediaService::MIME[$meta['type']],
            'Content-Disposition' => 'inline; filename="' . $file . '"',
            'X-Content-Type-Options' => 'nosniff',
            'Cross-Origin-Resource-Policy' => 'same-origin',
            // Opened on its own, it is a document that may do nothing
            'Content-Security-Policy' => "default-src 'none'; sandbox",
            // Revalidated on every view, after the access check above, so a
            // file taken out of a step or a group is gone at once
            'Cache-Control' => 'private, no-cache',
            'ETag' => $etag,
        ];

        if ($this->request->getHeader('If-None-Match') === $etag) {
            $response = new Response(Http::STATUS_NOT_MODIFIED);
            foreach ($headers as $name => $value) {
                $response->addHeader($name, $value);
            }
            return $response;
        }

        if (in_array($meta['type'], ['mp4', 'webm'], true)) {
            $stream = $content->read();
            $size = $content->getSize();
            $range = ['status' => Http::STATUS_OK];
            $ifRange = $this->request->getHeader('If-Range');
            $seekable = is_resource($stream) && (stream_get_meta_data($stream)['seekable'] ?? false);
            if ($seekable && ($ifRange === '' || $ifRange === $etag)) {
                $range = RangeParser::parse($this->request->getHeader('Range'), $size);
            }
            return new RangeFileResponse($stream, $size, $range, $headers);
        }

        $response = new DataDisplayResponse($content->getContent(), Http::STATUS_OK, $headers);
        return $response;
    }
}
