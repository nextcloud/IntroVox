<?php

declare(strict_types=1);

namespace OCA\IntroVox\Embed;

use OCP\App\IAppManager;
use OCP\IUserManager;
use OCP\Util;

/**
 * Lets another app show the tours a user can start, <introvox-tour-list>:
 * the same list as IntroVox's personal settings (src/embed/embed.js).
 *
 * A host app calls this while rendering its page; IntroVox is optional to it:
 *
 *     if (class_exists(\OCA\IntroVox\Embed\TourListEmbed::class)) {
 *         \OCP\Server::get(\OCA\IntroVox\Embed\TourListEmbed::class)->load();
 *     }
 *
 * The tag name, this class and its methods are a fixed interface for other
 * apps: see docs/architecture/frontend-architecture.md.
 */
class TourListEmbed {
    public const TAG_NAME = 'introvox-tour-list';
    private const SCRIPT = 'introvox-embed';

    public function __construct(
        private readonly IAppManager $appManager,
        private readonly IUserManager $userManager,
    ) {
    }

    /**
     * Installed but disabled for this user is not caught by class_exists()
     */
    public function isAvailable(?string $userId = null): bool {
        $user = $userId === null ? null : $this->userManager->get($userId);
        return $this->appManager->isEnabledForUser('introvox', $user);
    }

    /**
     * Queue the bundle that defines the element. Safe to call twice.
     */
    public function load(): void {
        Util::addScript('introvox', self::SCRIPT);
    }
}
