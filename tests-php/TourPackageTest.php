<?php
/**
 * A whole tour in one .zip: what an export writes reads back, and a package
 * from anywhere else is held to the same rules, whatever the zip claims.
 */

declare(strict_types=1);

use OCA\IntroVox\Service\StepValidator;
use OCA\IntroVox\Service\TourPackage;
use OCA\IntroVox\Service\TourPackageException;
use OCA\IntroVox\Service\TourValidator;

const PNG_FILE = '0123456789abcdef0123456789abcdef.png';
const VTT_FILE = 'fedcba9876543210fedcba9876543210.vtt';

function packagePath(): string {
    $path = tempnam(sys_get_temp_dir(), 'introvox-package-');
    unlink($path);
    register_shutdown_function(static fn () => @unlink($path));
    return $path . '.zip';
}

function appManifest(array $overrides = []): array {
    return array_replace([
        'format' => TourPackage::FORMAT,
        'version' => TourPackage::VERSION,
        'tour' => ['kind' => 'app', 'name' => 'Talk', 'trigger' => ['type' => 'app', 'app' => 'spreed'], 'mainLanguage' => 'en', 'visibleToGroups' => ['staff'], 'audience' => 'everyone'],
        'languages' => [
            'en' => [['id' => 't-1', 'title' => 'Hi', 'text' => '<p>Hi</p>', 'media' => ['file' => PNG_FILE, 'alt' => 'The Talk window']]],
            'nl' => [['id' => 't-1', 'title' => 'Hoi', 'text' => '<p>Hoi</p>']],
        ],
    ], $overrides);
}

/**
 * A zip written by hand, to say things an export never would
 *
 * @param array<string, string> $entries
 */
function rawZip(array $entries): string {
    $path = packagePath();
    $zip = new ZipArchive();
    $zip->open($path, ZipArchive::CREATE);
    foreach ($entries as $name => $bytes) {
        $zip->addFromString($name, $bytes);
    }
    $zip->close();
    return $path;
}

function readsAs(string $reason, string $path, int $max = 10 * 1024 * 1024): void {
    try {
        TourPackage::read($path, $max);
    } catch (TourPackageException $e) {
        assertSame($reason, $e->reason, $e->getMessage());
        return;
    }
    fail('read without complaint, expected ' . $reason);
}

test('tour package: what an export writes reads back', function (): void {
    $path = packagePath();
    TourPackage::write($path, appManifest(), [PNG_FILE => "\x89PNG fake", VTT_FILE => "WEBVTT\n"]);
    $package = TourPackage::read($path, 1024 * 1024);
    assertSame(appManifest(), $package['manifest']);
    assertSame(["\x89PNG fake", "WEBVTT\n"], [$package['files'][PNG_FILE], $package['files'][VTT_FILE]]);
});

test('tour package: only tour.json and media/<id>.<ext>, each once', function (): void {
    $manifest = json_encode(appManifest());
    foreach (['../tour.json', '/etc/passwd', 'media/../../x.png', 'media/evil.php', 'media/' . strtoupper(PNG_FILE), 'Tour.json', 'media/sub/' . PNG_FILE, 'notes.txt'] as $name) {
        readsAs('unexpected_file', rawZip(['tour.json' => $manifest, $name => 'x']));
    }
    readsAs('no_manifest', rawZip(['media/' . PNG_FILE => 'x']));
    readsAs('not_a_package', rawZip([]) . '.missing');
    $notZip = packagePath();
    file_put_contents($notZip, 'not a zip at all');
    readsAs('not_a_package', $notZip);
});

test('tour package: sizes are checked before reading, and against the zip\'s own claims', function (): void {
    $manifest = json_encode(appManifest());
    readsAs('too_large', rawZip(['tour.json' => $manifest, 'media/' . PNG_FILE => str_repeat('a', 5000)]), 4000);
    // Highly compressible: small on disk, large unpacked
    readsAs('too_large', rawZip(['tour.json' => $manifest, 'media/' . PNG_FILE => str_repeat("\0", 3 * 1024 * 1024)]), 2 * 1024 * 1024);
    readsAs('too_large', rawZip(['tour.json' => str_pad($manifest, TourPackage::MAX_MANIFEST_BYTES + 1)]), 64 * 1024 * 1024);

    $many = ['tour.json' => $manifest];
    for ($i = 0; $i < TourPackage::MAX_ENTRIES; $i++) {
        $many['media/' . str_pad(dechex($i), 32, '0', STR_PAD_LEFT) . '.png'] = 'x';
    }
    readsAs('too_many_files', rawZip($many));

    // An entry whose header claims fewer bytes than it holds
    $path = rawZip(['tour.json' => $manifest, 'media/' . PNG_FILE => str_repeat('b', 300)]);
    $bytes = file_get_contents($path);
    $name = 'media/' . PNG_FILE;
    // The size in the central directory, right before the name
    $at = strrpos($bytes, $name);
    $bytes = substr_replace($bytes, pack('V', 10), $at - 46 + 24, 4);
    file_put_contents($path, $bytes);
    $zip = new ZipArchive();
    $zip->open($path, ZipArchive::RDONLY);
    assertSame(10, $zip->statName($name)['size'], 'the header was not changed');
    $zip->close();
    readsAs('not_a_package', $path);
});

test('tour package: tour.json must be ours, and not from a newer IntroVox', function (): void {
    readsAs('no_manifest', rawZip(['tour.json' => 'not json']));
    readsAs('no_manifest', rawZip(['tour.json' => json_encode(['format' => 'something-else', 'version' => 1])]));
    readsAs('no_manifest', rawZip(['tour.json' => json_encode(appManifest(['version' => '1']))]));
    readsAs('newer_version', rawZip(['tour.json' => json_encode(appManifest(['version' => TourPackage::VERSION + 1]))]));
});

test('tour package: the tour and its steps go through the editor\'s own checks', function (): void {
    $contents = TourPackage::contents(appManifest(), new TourValidator(), new StepValidator());
    assertSame('app', $contents['kind']);
    assertSame(['Talk', ['type' => 'app', 'app' => 'spreed'], false], [$contents['tour']['name'], $contents['tour']['trigger'], $contents['tour']['enabled']]);
    assertSame(['en', 'nl'], array_keys($contents['languages']));
    assertSame([PNG_FILE], $contents['media']);

    $welcome = TourPackage::contents(appManifest(['tour' => ['kind' => 'welcome']]), new TourValidator(), new StepValidator());
    assertSame(['welcome', null], [$welcome['kind'], $welcome['tour']]);

    $bad = [
        ['tour' => ['kind' => 'other']],
        ['tour' => ['kind' => 'app', 'name' => '', 'trigger' => ['type' => 'app', 'app' => 'spreed']]],
        ['tour' => ['kind' => 'app', 'name' => 'X', 'trigger' => ['type' => 'page', 'page' => 'https://evil.example/']]],
        ['languages' => []],
        ['languages' => [['id' => 'a', 'title' => 'A']]],
        ['languages' => ['../en' => []]],
        ['languages' => ['en' => [['id' => 'a b', 'title' => 'A']]]],
        ['languages' => ['en' => [['id' => 'a', 'title' => 'A', 'media' => ['file' => '../../config.php', 'alt' => 'x']]]]],
    ];
    foreach ($bad as $overrides) {
        assertThrows(TourPackageException::class, fn () => TourPackage::contents(appManifest($overrides), new TourValidator(), new StepValidator()), json_encode($overrides));
    }
});
