# Browser tests

These suites run IntroVox in a real browser against a real Nextcloud: the admin
pages, the tours as users see them, share links, media, the checklist. They
complement `tests-php/` and `tests-js/`, which run without a server.

They change things on that server: they create and delete users, tours and
settings, switch the built-in tours, and reset the telemetry question. Use a
test server, never a production one.

## Setup

1. Node 20 or newer, and Google Chrome (or another Chromium; set `chrome`).
2. `npm install` in this folder (it has its own `package.json`, with only
   `playwright-core`).
3. Copy `config.example.json` to `config.local.json` and fill it in:

   | Key | What |
   |---|---|
   | `base` | The Nextcloud the suites run against, such as `https://cloud.example.com` |
   | `ssh` | `user@host` for `ssh` to that server, with a key (BatchMode). The user needs `sudo` for `www-data` |
   | `nextcloud` | The Nextcloud folder on the server, default `/var/www/nextcloud` |
   | `chrome` | The browser to run, default Google Chrome on macOS |
   | `dismiss` | Optional: close buttons of other apps' popups that cover the page after logging in, such as a notice for new users |
   | `nc32` | Optional, for `nc32/`: a local Nextcloud 32 container (`base`, `container`, `adminPassword`) |

4. Put a password for the test users in `.pw` (one line, `chmod 600 .pw`).
5. `npm run users` makes the test users afresh with that password:
   `introvox-e2e-admin`, `-admin2`, `-user` (in group `introvox-e2e`) and
   `-other`.

`config.local.json`, `.pw` and `shots/` stay out of git.

The server needs Redis as its memory cache: `all.mjs` clears the rate limits
between suites with `redis-cli`. Run a single suite twice in an hour, and some
checks may hit a rate limit; clear them with
`node -e "import('./lib.mjs').then(l => l.clearRateLimits())"`.

## Running

```bash
npm run all                      # every suite, built-in tours put back as they were
SUITES="runtime media" npm run all
node checklist.mjs               # one suite
ONLY='share link' node links-timing.mjs   # only the checks whose name matches
```

Each check prints `PASS` or `FAIL`; a failing check saves a screenshot in
`shots/`. A suite exits with 1 when a check failed.

| Suite | What it covers |
|---|---|
| `runtime.mjs` | The small bootstrap on every page and the tour chunk that loads only when a tour starts |
| `editor.mjs` | The step editor: validation, the text editor, the element picker, preview, import and export, the API's access rules |
| `media.mjs` | Images, GIFs and videos in steps: uploads checked and cleaned, who may see them, headers, the wizard |
| `app-tours.mjs` | Tours per app: when they start and for whom, two tabs, New users only, deleting |
| `statistics-export.mjs` | Statistics per tour, and moving a whole tour with its media as a .zip |
| `links-timing.mjs` | Share links, Tours in the user menu, days and dates, tours that start anywhere |
| `builtin-tours.mjs` | The built-in tours for Files, Talk, Deck and Calendar |
| `checklist.mjs` | The Getting started checklist on the Dashboard, with own tasks |
| `app-states.mjs` | Steps that wait aside until what the user opened is there, and the picker's note about such steps |
| `admin-intro.mjs` | The admin intro and the telemetry question |
| `share-links.mjs` | A share link mid-tour, and one opened while logged out |
| `assistant.mjs` | Translating and drafting steps with AI, against a fake provider (below). Not in `all` |
| `walk-builtin.mjs` | Plays every built-in tour in English and Dutch, doing what the steps ask. Needs the built-in tours on; leaves folders, conversations, cards and events behind. Not in `all` |

`builtin-switch.mjs` prints which built-in tours are on, or switches exactly
the given ones on: `node builtin-switch.mjs "builtin-files builtin-talk"`.
Most suites put test steps in the welcome tour; `reset-welcome.mjs` gives it
its own steps back in English and Dutch, and `all` runs it at the end.

Several suites start by deleting every tour that is not built in.
`node tours-backup.mjs save` exports them to `backup/` first, and
`node tours-backup.mjs restore` imports them again, on or off as they were;
`all` does both. Do the same around a single suite on a server with tours you
want to keep. A restored tour is a new tour: who saw it and its statistics
start over.

### The fake AI provider

`assistant.mjs` needs answers it can predict. `fakeai/introvox_fakeai` is a
tiny app with a text-to-text provider that answers from the prompt: it puts
`[<code>] ` before every translated word, drafts three steps, returns no JSON
for a description with `GARBAGE` and fails for one with `FAIL`. Copy it into
the server's `apps/` folder, enable it, and make it the provider for free
prompts under **Administration settings → Artificial intelligence** while
the suite runs.

### Nextcloud 32

`nc32/` has smaller suites for the oldest supported Nextcloud, run against a
local container. `node nc32/setup-users.mjs` makes `introvox-e2e-admin2` there
with the password in `.pw`; `runtime.mjs`, `media.mjs` and `tours.mjs` log in
as `admin` with `nc32.adminPassword`.
