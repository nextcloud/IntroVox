<?php
// Test media for media.mjs
$png = imagecreatetruecolor(640, 400);
imagefill($png, 0, 0, imagecolorallocate($png, 0, 130, 201));
imagefilledrectangle($png, 40, 40, 300, 200, imagecolorallocate($png, 255, 255, 255));
imagepng($png, 'photo.png');

$second = imagecreatetruecolor(320, 200);
imagefill($second, 0, 0, imagecolorallocate($second, 46, 125, 50));
imagepng($second, 'group.png');

$third = imagecreatetruecolor(320, 200);
imagefill($third, 0, 0, imagecolorallocate($third, 198, 40, 40));
imagepng($third, 'off.png');

$fourth = imagecreatetruecolor(300, 200);
imagefill($fourth, 0, 0, imagecolorallocate($fourth, 120, 60, 160));
imagepng($fourth, 'pasted.png');

$viewOnly = imagecreatetruecolor(200, 200);
imagefill($viewOnly, 0, 0, imagecolorallocate($viewOnly, 255, 160, 0));
imagepng($viewOnly, 'viewonly.png');

// A JPEG with a comment and XMP that must not survive
$jpg = imagecreatetruecolor(400, 300);
imagefill($jpg, 0, 0, imagecolorallocate($jpg, 250, 200, 50));
ob_start();
imagejpeg($jpg, null, 85);
$bytes = ob_get_clean();
$segment = fn (string $marker, string $data): string => "\xFF" . $marker . pack('n', strlen($data) + 2) . $data;
$xmp = "http://ns.adobe.com/xap/1.0/\0<x:xmpmeta>SECRET-XMP-MARKER</x:xmpmeta>";
$bytes = substr($bytes, 0, 2) . $segment("\xE1", $xmp) . $segment("\xFE", 'SECRET-COMMENT-MARKER') . substr($bytes, 2);
file_put_contents('meta.jpg', $bytes);

// An animated GIF of three frames, looping
$frames = [];
foreach ([[200, 40, 40], [40, 160, 40], [40, 40, 200]] as [$r, $g, $b]) {
    $frame = imagecreate(200, 120);
    imagecolorallocate($frame, $r, $g, $b);
    ob_start();
    imagegif($frame);
    $frames[] = ob_get_clean();
}
$gif = 'GIF89a' . substr($frames[0], 6, 7);
$gif .= substr($frames[0], 13, 3 * (2 ** ((ord($frames[0][10]) & 7) + 1)));
$gif .= "\x21\xFF\x0BNETSCAPE2.0\x03\x01\x00\x00\x00";
foreach ($frames as $frame) {
    $colours = 3 * (2 ** ((ord($frame[10]) & 7) + 1));
    $body = substr($frame, 13 + $colours, -1);
    // A graphic control extension (100 ms) before each frame
    $gif .= "\x21\xF9\x04\x00\x0A\x00\x00\x00" . $body;
}
$gif .= "\x3B";
file_put_contents('anim.gif', $gif);

// An SVG pretending to be a PNG
file_put_contents('fake.png', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

// Over the 5 MB image limit
file_put_contents('big.png', "\x89PNG\r\n\x1a\n" . random_bytes(6 * 1024 * 1024));

file_put_contents('captions.vtt', "WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nHello from the test\n");
echo "ok\n";
