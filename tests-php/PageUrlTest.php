<?php
/**
 * A page as a path from the web root, with and without pretty URLs.
 */

declare(strict_types=1);

use OCA\IntroVox\Service\PageUrl;

test('page url: one slash between the front controller and the page', function (): void {
    foreach ([
        // Without pretty URLs
        ['/index.php', '/apps/files/', '/index.php/apps/files/'],
        // With pretty URLs linkTo() gives '/': not //apps/files/
        ['/', '/apps/files/', '/apps/files/'],
        ['/', '/apps/spreed/?introvox-tour=builtin-talk', '/apps/spreed/?introvox-tour=builtin-talk'],
        // Nextcloud in a subdirectory
        ['/cloud/index.php', '/settings/user', '/cloud/index.php/settings/user'],
        ['/cloud/', '/settings/user', '/cloud/settings/user'],
    ] as [$front, $page, $expected]) {
        assertSame($expected, PageUrl::path($front, $page), $front . ' + ' . $page);
    }
});
