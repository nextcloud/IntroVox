# Media in tour steps: threat model

Since 2.0.0 a step can show an image, GIF or video. This note records what that adds to the attack surface and how each part is handled, so a later change can be checked against it.

## Who can add media

Only admins: `POST /admin/media` and `POST /admin/media/from-files` (`MediaUploadController`) require an admin and the CSRF request token, like every other IntroVox route. "Choose from Files" reads from the admin's own Files only, and refuses a file from a share that may only be viewed (download disabled): through IntroVox every user could otherwise download it.

A tour package (`POST /admin/tours/import`, `TourTransfer`) is a third way in, also admin only with the request token. Its media goes through `MediaService::store` like an upload, as new copies with new ids; nothing in the package is trusted. See [Tour packages](#tour-packages).

## What is kept

`MediaService` keeps its own copy in IntroVox's app data, never a link into someone's Files.

- **Type from the bytes.** `MediaSniffer` decides the type from the file's first bytes, never from the name or the browser's claim. Allowed: PNG, JPEG, GIF, MP4, WebM, and WebVTT for captions. SVG, HTML, QuickTime and everything else is refused.
- **Metadata stripped without re-encoding.** `MetadataStripper` keeps an allowlist of JPEG segments, PNG chunks and GIF extensions, and cuts off everything after the end of the image; that removes EXIF and GPS, XMP, comments, MPF secondary images (which carry their own GPS) and polyglot tails such as a ZIP or HTML document appended to an image. A JPEG keeps its orientation. In videos, `udta`, `meta` and `uuid` boxes (MP4) and `Tags` and `Attachments` (WebM) are overwritten in place; a track that is not video or audio, such as GPS telemetry from an action camera, is refused.
- **Limits** on size, pixels, frames, total bytes in use and number of files.
- **Ids** are 128 random bits plus an extension the server chooses; the same content gets the same id (SHA-256).

## Who can see it

`GET /media/{file}` (`MediaController::show`) is the only IntroVox route without a request token: an `<img>` or `<video>` cannot send one. It only reads, needs a logged-in user with strict cookies (so no cross-site request carries them), and has no other method. `tests-js/controller-security.test.js` allows the exception there and nowhere else.

Each file has an access list (`refreshAccess`), rebuilt from the stored steps after every save, import, reset and switch of the tour: everyone, some groups, or nobody but admins. A user who does not get an enabled step with the file gets the same 404 as for a file that does not exist. When the list cannot be rebuilt, files stay closed rather than open.

## How it is served

`Content-Type` from the server, `X-Content-Type-Options: nosniff`, `Content-Disposition: inline`, `Cross-Origin-Resource-Policy: same-origin`, `Content-Security-Policy: default-src 'none'; sandbox` (opened on its own, the file is a document that may do nothing), and `Cache-Control: private, no-cache` with an ETag, so every view is checked again and a file taken out of a step is gone at once. Video is streamed with single byte ranges by `RangeFileResponse`, which writes the body only after Nextcloud has sent the status and headers.

## How it is shown

The tour builds the image or video with DOM APIs from the step's media block (`src/utils/stepMedia.js`), never through HTML, and checks the id again; the step HTML allowlist is unchanged. Alt text is required unless an image is marked decorative, and anything that moves can be paused.

## Tour packages

A whole tour moves between Nextclouds as one `.zip` (`TourPackage`): `tour.json` and `media/<id>.<ext>`. A package can come from anywhere, and an admin may be tricked into importing one, so reading it trusts nothing:

- **Names.** Only `tour.json` and `media/` followed by 32 hex characters and one of the media extensions, each once. Anything else (`../`, absolute paths, other folders, a second `tour.json`) refuses the whole package. Nothing is ever written to disk under a name from the zip; the files are read into memory.
- **Sizes.** At most 501 files and `tour_package_limit` bytes unpacked (default 100 MiB), checked against the zip's directory before reading anything, and again while reading: an entry is read for at most its declared size plus one byte, and refused when it holds more or less. A zip bomb or a lying header does not get past that.
- **Contents.** `tour.json` must name its format and a version this IntroVox knows. The tour and every step go through `TourValidator` and `StepValidator`, as when saved in the editor; the media through `MediaService::store`. A file only counts when a step uses it.
- **What it changes.** A tour for an app or page becomes a new tour, switched off, so nothing reaches users until an admin switches it on. Groups the instance lacks are dropped. A welcome tour package replaces the welcome tour's own steps only after the admin confirms.

`tests-php/TourPackageTest.php` covers the names, the sizes (including a zip whose header claims fewer bytes than it holds) and the contents.

