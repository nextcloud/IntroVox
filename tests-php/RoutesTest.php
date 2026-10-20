<?php
/**
 * The route table as Nextcloud reads it (appinfo/routes.php), not as a regex
 * sees it. tests-js/controller-security.test.js checks the controllers.
 */

declare(strict_types=1);

$routes = (static fn () => require INTROVOX_ROOT . '/appinfo/routes.php')();

test('routes: every route has a name, a url and a verb', function () use ($routes): void {
    foreach ($routes['routes'] as $route) {
        assertTrue(isset($route['name'], $route['url']), 'route without name or url: ' . json_encode($route));
        assertTrue(isset($route['verb']), 'route without an explicit verb: ' . $route['name']);
    }
    assertTrue(count($routes['routes']) > 20, 'only ' . count($routes['routes']) . ' routes');
});

test('routes: only the routes array, nothing declared another way', function () use ($routes): void {
    assertSame(['routes'], array_keys($routes));
});

test('routes: media#show, the one route without a request token, only reads one file', function () use ($routes): void {
    $show = array_values(array_filter($routes['routes'], static fn (array $route): bool => $route['name'] === 'media#show'));
    if ($show === []) {
        return;
    }
    assertSame(1, count($show), 'media#show declared once');
    assertSame('GET', $show[0]['verb']);
    assertSame('/media/{file}', $show[0]['url']);
    $pattern = $show[0]['requirements']['file'] ?? '';
    assertSame('[a-f0-9]{32}\.(png|jpg|gif|mp4|webm|vtt)', $pattern);
});
