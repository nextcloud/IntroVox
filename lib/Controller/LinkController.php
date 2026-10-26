<?php

declare(strict_types=1);

namespace OCA\IntroVox\Controller;

use OCA\IntroVox\Service\PageUrl;
use OCA\IntroVox\Service\TourRepository;
use OCA\IntroVox\Service\TourValidator;
use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\Attribute\NoAdminRequired;
use OCP\AppFramework\Http\Attribute\NoCSRFRequired;
use OCP\AppFramework\Http\RedirectResponse;
use OCP\IRequest;
use OCP\IURLGenerator;
use OCP\IUserSession;

/**
 * A tour's share link (Copy link in the tours list), as it goes into a
 * welcome mail: /apps/introvox/tour/<id>. Someone who is not logged in yet
 * goes through Nextcloud's login, which keeps this path but drops a query
 * string. Here it then opens the tour's page with ?introvox-tour=<id>, where
 * the tour starts (src/main.js).
 *
 * A link from a mail cannot carry a request token, so no CSRF check: this
 * reads only whether the user may get the tour, and changes nothing.
 */
class LinkController extends Controller {
    // Where a tour without a page of its own starts (src/utils/pages.mjs)
    private const ANYWHERE_PAGE = '/apps/files/';

    public function __construct(
        string $appName,
        IRequest $request,
        private TourRepository $tours,
        private IUserSession $userSession,
        private IURLGenerator $urlGenerator,
    ) {
        parent::__construct($appName, $request);
    }

    #[NoAdminRequired]
    #[NoCSRFRequired]
    public function open(string $id): RedirectResponse {
        $tour = $this->tours->forUser($id, $this->userSession->getUser());
        // A tour that is off, gone or not for this user: just Nextcloud
        if ($tour === null) {
            return new RedirectResponse($this->urlGenerator->linkToDefaultPageUrl());
        }
        $page = TourValidator::triggerPage($tour['trigger'] ?? []) ?: self::ANYWHERE_PAGE;
        return new RedirectResponse(PageUrl::path($this->urlGenerator->linkTo('', 'index.php'), $page) . '?introvox-tour=' . $id);
    }
}
