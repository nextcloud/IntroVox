<?php
/**
 * A small test runner for the parts of IntroVox that are plain PHP: no
 * Nextcloud, no Composer. Every tests-php/*Test.php file registers tests with
 * test(); classes under OCA\IntroVox\ that need nothing from Nextcloud load
 * from lib/.
 *
 * Run with: npm run test:php   (php tests-php/run.php [filter])
 */

declare(strict_types=1);

const INTROVOX_ROOT = __DIR__ . '/..';

spl_autoload_register(static function (string $class): void {
    $prefix = 'OCA\\IntroVox\\';
    if (strncmp($class, $prefix, strlen($prefix)) === 0) {
        $file = INTROVOX_ROOT . '/lib/' . str_replace('\\', '/', substr($class, strlen($prefix))) . '.php';
        if (is_file($file)) {
            require $file;
        }
    }
});

$GLOBALS['introvoxTests'] = [];

function test(string $name, callable $body): void {
    $GLOBALS['introvoxTests'][] = [$name, $body];
}

function fail(string $message): void {
    throw new AssertionError($message);
}

function assertSame(mixed $expected, mixed $actual, string $message = ''): void {
    if ($expected !== $actual) {
        fail(($message !== '' ? $message . ': ' : '') . 'expected ' . var_export($expected, true) . ', got ' . var_export($actual, true));
    }
}

function assertTrue(bool $condition, string $message): void {
    if (!$condition) {
        fail($message);
    }
}

/**
 * @param class-string<Throwable> $class
 */
function assertThrows(string $class, callable $body, string $message = ''): void {
    try {
        $body();
    } catch (Throwable $e) {
        if ($e instanceof $class) {
            return;
        }
        fail(($message !== '' ? $message . ': ' : '') . 'expected ' . $class . ', got ' . get_class($e) . ': ' . $e->getMessage());
    }
    fail(($message !== '' ? $message . ': ' : '') . 'expected ' . $class . ', nothing was thrown');
}

function fixture(string $name): string {
    $bytes = file_get_contents(__DIR__ . '/fixtures/' . $name);
    if ($bytes === false) {
        fail('missing fixture ' . $name);
    }
    return $bytes;
}

$filter = $argv[1] ?? '';
foreach (glob(__DIR__ . '/*Test.php') as $file) {
    require $file;
}

$passed = 0;
$failed = 0;
foreach ($GLOBALS['introvoxTests'] as [$name, $body]) {
    if ($filter !== '' && stripos($name, $filter) === false) {
        continue;
    }
    try {
        $body();
        $passed++;
        echo "  ok  $name\n";
    } catch (Throwable $e) {
        $failed++;
        echo "FAIL  $name\n      " . $e->getMessage() . "\n";
    }
}
echo "\n$passed passed, $failed failed\n";
exit($failed > 0 ? 1 : 0);
