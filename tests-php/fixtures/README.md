# Media fixtures

Small files for `tests-php/MediaSnifferTest.php` and
`tests-php/MetadataStripperTest.php`. Every file is made by
`make-fixtures.php` in this directory; nothing here comes from a real camera
or a real person. The "secrets" planted in them (`Secret title`,
`WGS-84-SECRET`, a GPS position on the Dam in Amsterdam, ...) are what the
tests look for after stripping.

```sh
php tests-php/fixtures/make-fixtures.php           # images: PHP GD + hand-built metadata
php tests-php/fixtures/make-fixtures.php --video   # also MP4/WebM via ffmpeg in Docker
```

The images need PHP with `gd`. The videos need Docker and the
`jrottenberg/ffmpeg:6.1-alpine` image (linux/amd64; it runs under emulation on
Apple silicon). Encoders run single-threaded with `+bitexact`, so a rerun on
the same GD/zlib build and the same ffmpeg image gives byte-identical files
(checked with `shasum` on 2026-10-01).

## Images (PHP GD plus hand-assembled segments and chunks)

| File | How it is made | What the tests check |
|---|---|---|
| `jpeg-phone.jpg` | GD 64x48 JPEG with its JFIF APP0 removed, then: APP1 Exif (little-endian; Make, Model, DateTime, Orientation 6, GPS IFD with latitude/longitude and GPSMapDatum `WGS-84-SECRET`), APP1 XMP (`http://ns.adobe.com/xap/1.0/`, CreatorTool `SecretXmpTool`), APP2 MPF index pointing at a second image, COM `Secret comment`, GD's own COM, the image; after the first EOI a second GD JPEG (32x24) with its own Exif GPS (`WGS-84-SECOND`), as phones store MPF images | no GPS IFD bytes, Make, XMP, MPF or comments left; nothing after the first EOI; exactly one APP1 holding only Orientation 6 (big-endian); decodes; 64x48 |
| `jpeg-orientation1-mm.jpg` | GD 40x30 JPEG (with JFIF), big-endian Exif with Orientation 1 and GPS inserted after JFIF | no APP1 at all in the output |
| `jpeg-orientation8-exif-first.jpg` | same image, big-endian Exif with Orientation 8 placed *before* the JFIF segment | output order is SOI, JFIF, APP1 (Orientation 8) |
| `jpeg-progressive.jpg` | GD 48x32 JPEG with `imageinterlace()` on (SOF2, several SOS/DHT) | several scans survive, decodes |
| `png-dirty.png` | GD 32x24 PNG (IHDR, pHYs, IDAT, IEND) plus gAMA, tEXt `Secret png comment`, iTXt XMP, eXIf with GPS, tIME and a private chunk `scRt` after IHDR, a tEXt `Secret author` before IEND, and a stored ZIP (`secret.txt`) after IEND | only IHDR, gAMA, pHYs, IDAT, IEND remain; ends at IEND; decodes |
| `png-apng.png` | hand-built 8x8 RGB APNG: acTL (3 frames), fcTL + IDAT, then fcTL + fdAT twice (zlib via `gzcompress`) | unchanged, animated, 3 frames |
| `gif-dirty.gif` | hand-built 8x8 GIF89a, 4-colour global table, NETSCAPE2.0 loop, comment `Secret gif comment`, `XMP DataXMP` application extension, three frames (graphic control + image; LZW data written with a clear code every two pixels so no dictionary is needed), trailer, then an HTML page | 3 frames, loop kept, comment/XMP/HTML gone, decodes |

Truncated, bit-flipped and otherwise broken variants are made inside the
tests from these files.

## Video (ffmpeg 6.1 in Docker)

Sources: `testsrc=size=160x120:rate=10`, `sine=frequency=440:sample_rate=48000`,
1 second, `-fflags +bitexact -flags:v +bitexact -flags:a +bitexact`.
`make-fixtures.php --video` prints the exact `docker run` command for each.

| File | ffmpeg options | What the tests check |
|---|---|---|
| `mp4-udta.mp4` | H.264 (`libx264 -preset veryfast -threads 1`) + AAC 32k, `-metadata title="Secret title" -metadata location="+52.3700+004.8900/" -metadata creation_time=2024-05-01T12:00:00Z -metadata:s:v:0 handler_name="Secret handler" -movflags +use_metadata_tags` (title and location as `mdta` strings, as iPhones store them, plus a 3GPP `loci` box) | same length; title, location, `loci`, `mdta` and handler name gone; udta became a zeroed `free`; mdat untouched; creation times zeroed; 160x120 with audio |
| `mp4-subtitle.mp4` | H.264 + a `mov_text` subtitle track from a one-cue SRT | `metadata_track` with detail `sbtl` |
| `mp4-noaudio.mp4` | H.264 only (`-an`) | no audio, 160x120 |
| `webm-tags.webm` | VP8 (`libvpx -threads 1 -b:v 100k`) + Opus 24k, `-metadata title="Secret title" -metadata artist="Secret artist" -metadata comment="Secret comment" -metadata:s:v:0 title="Secret track name" -cluster_time_limit 200` (title goes to Info, artist/comment to Tags, the track title to TrackEntry Name; six clusters) | same length; Tags at the same offset is now a zeroed Void; Info Title and track Name gone; clusters untouched; 160x120 with audio |
| `webm-subtitle.webm` | VP8 + a WebVTT subtitle track (`-c:s webvtt`) from a one-cue VTT | `metadata_track`, detail `type 17` |
| `webm-live.webm` | not from ffmpeg directly: `make-fixtures.php` rebuilds `webm-tags.webm` the way live recorders (browser MediaRecorder) write files: Segment and every Cluster of unknown size (8-byte all-ones), SeekHead/Cues/Void dropped, Tags moved after the clusters, plus an Attachments element (`secret.txt`, `Secret attachment`) | parses, unknown-size clusters end at the next Cluster/Tags, Tags and Attachments become Void, same length |

## One-off decoder check of the stripped videos (2026-10-01)

The PHP tests only check structure. Once, by hand, the stripped output of each
video fixture was written to a scratch directory and decoded with the same
Docker image:

```sh
docker run --rm -v "$PWD/stripped:/in" --entrypoint sh jrottenberg/ffmpeg:6.1-alpine -c \
  'ffprobe -v error -count_frames -show_entries stream=codec_type,codec_name,width,height,nb_read_frames -of compact /in/FILE;
   ffmpeg -v error -xerror -i /in/FILE -f null - && echo DECODE-OK'
```

| Stripped file | Result |
|---|---|
| `mp4-udta.mp4` | h264 160x120, 10 frames; aac, 47 frames; DECODE-OK. ffprobe shows no title, location or handler name any more (the original showed all three plus creation_time). |
| `mp4-noaudio.mp4` | h264 160x120, 10 frames; DECODE-OK |
| `webm-tags.webm` | vp8 160x120, 10 frames; opus, 51 frames; DECODE-OK. Only `encoder=Lavf` (MuxingApp) left; the original showed title, ARTIST, COMMENT and the track title. |
| `webm-live.webm` | vp8 160x120, 10 frames; opus, 51 frames; DECODE-OK |

The stripped images are decoded inside the tests with GD whenever the `gd`
extension is loaded.
