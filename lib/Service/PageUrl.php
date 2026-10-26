<?php

declare(strict_types=1);

namespace OCA\IntroVox\Service;

/**
 * A page of this Nextcloud ('/apps/files/') as a path from the web root.
 *
 * IURLGenerator::linkTo('', 'index.php') is '/index.php', or just '/' on an
 * instance with pretty URLs (front controller). Put in front of a page as it
 * is, that last one makes '//apps/files/': a browser reads it as a link to a
 * host called "apps".
 *
 * Plain PHP without Nextcloud dependencies, so it can be tested directly.
 */
class PageUrl {
    /**
     * @param string $front what linkTo('', 'index.php') gives
     * @param string $page a page starting with '/'
     */
    public static function path(string $front, string $page): string {
        return rtrim($front, '/') . $page;
    }
}
