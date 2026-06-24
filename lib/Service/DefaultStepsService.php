<?php
namespace OCA\IntroVox\Service;

use OCP\IL10N;
use OCP\L10N\IFactory;

/**
 * Single source of truth for the built-in tour steps.
 * Both AdminController (editor view) and ApiController (end-user fetch) use this
 * so the Transifex-translated defaults are identical across both code paths.
 */
class DefaultStepsService {
    private const APP_NAME = 'introvox';

    private IFactory $l10nFactory;

    public function __construct(IFactory $l10nFactory) {
        $this->l10nFactory = $l10nFactory;
    }

    /**
     * Build defaults in the requested language, falling back to English (NOT
     * the current admin's UI locale) when no translation file exists yet.
     *
     * `IFactory::get($app, $lang)` returns the current user's locale when the
     * requested `$lang` has no l10n file, which is surprising when an admin in
     * a Dutch session opens "Add language override → Italian" and sees Dutch
     * default copy. Forcing the fallback to English makes the seed predictable
     * and matches the Transifex msgid language.
     */
    public function getForLanguage(string $lang): array {
        if (!$this->l10nFactory->languageExists(self::APP_NAME, $lang)) {
            $lang = 'en';
        }
        return $this->build($this->l10nFactory->get(self::APP_NAME, $lang));
    }

    private function build(IL10N $l): array {
        return [
            [
                'id' => 'welcome',
                'title' => $l->t('👋 Welcome to Nextcloud'),
                'text' => $l->t('<p>Nice to have you here! This short tour will help you get started quickly.</p><p>You can close this wizard at any time and open it again later.</p>'),
                'attachTo' => '',
                'position' => 'right',
                'enabled' => true,
                'visibleToGroups' => [],
            ],
            [
                'id' => 'files',
                'title' => $l->t('📁 Files'),
                'text' => $l->t('<p>Files is where you view and manage everything you store.</p><p>On Nextcloud 34 your apps live behind the apps menu (top left) — open it to find Files.</p>'),
                // NC <=33 pinned the app in the header; NC 34 keeps everything behind the
                // always-visible apps menu (waffle). Pinned entries are tried first, then
                // the waffle, so the step always has a visible target. The client wraps
                // this string in a lazy resolver and may override it with a richer
                // function attachTo via enrichSteps().
                'attachTo' => '#appmenu li[data-id="files"], a.app-menu-entry[href*="/apps/files"], [data-id="files"], .app-menu__waffle, [aria-label="Open apps menu"]',
                'position' => 'bottom',
                'enabled' => true,
                'visibleToGroups' => [],
            ],
            // NOTE: the old "calendar" step is intentionally gone. Calendar is often not
            // installed, and on NC 34 app entries live behind the apps menu. The client
            // injects a richer auto-opening "appsmenu" step here instead (it cannot live
            // server-side because it needs function-valued behavior).
            [
                'id' => 'search',
                'title' => $l->t('🔍 Search'),
                'text' => $l->t('<p>With the search bar you can quickly find files, contacts and more.</p><p>Just type what you\'re looking for and press Enter.</p>'),
                // NC 34+ renders an inline searchbar (.unified-search-input); NC <=33 used an
                // icon button (.unified-search__trigger). Tried in order so the step targets
                // the real search on every supported version (.header-menu__trigger alone
                // lands on the notifications bell in NC 34).
                'attachTo' => '.unified-search-input, .unified-search__trigger, .header-menu__trigger',
                'position' => 'bottom',
                'enabled' => true,
                'visibleToGroups' => [],
            ],
            [
                'id' => 'settings',
                'title' => $l->t('⚙️ Your account & settings'),
                'text' => $l->t('<p>Your profile, personal settings and the log out button live under your avatar (top right).</p><p>Click it whenever you want to adjust your account.</p>'),
                // The account/avatar menu trigger is always visible on every version.
                'attachTo' => '.header-menu.account-menu .header-menu__trigger, [aria-label="Settings menu"], #settings .header-menu__trigger, #expand',
                'position' => 'bottom',
                'enabled' => true,
                'visibleToGroups' => [],
            ],
            [
                'id' => 'intro',
                'title' => $l->t('🎯 Getting started'),
                'text' => $l->t('<p><strong>Nextcloud is your personal cloud storage!</strong></p><p>Here you can:</p><ul><li>📁 Upload, share and collaborate on files</li><li>📅 Manage your calendar</li><li>✉️ Send and receive email</li><li>👥 Keep track of contacts</li></ul>'),
                'attachTo' => '',
                'position' => 'right',
                'enabled' => true,
                'visibleToGroups' => [],
            ],
            [
                'id' => 'features',
                'title' => $l->t('✨ Important features'),
                'text' => $l->t('<p><strong>Finding your way around:</strong></p><ul><li>Use the <strong>apps menu</strong> (top left) to switch between apps</li><li>Open your <strong>avatar</strong> (top right) for your account and settings</li><li>Use the <strong>search bar</strong> to quickly find files and more</li></ul>'),
                'attachTo' => '',
                'position' => 'right',
                'enabled' => true,
                'visibleToGroups' => [],
            ],
            [
                'id' => 'tips',
                'title' => $l->t('💡 Useful tips'),
                'text' => $l->t('<p><strong>Did you know:</strong></p><ul><li>You can upload files by dragging them to your browser</li><li>You can directly share files with a link</li><li>You can also use Nextcloud as an app on your phone</li><li>All your data is stored privately and securely</li></ul>'),
                'attachTo' => '',
                'position' => 'right',
                'enabled' => true,
                'visibleToGroups' => [],
            ],
            [
                'id' => 'complete',
                'title' => $l->t('🎉 Done!'),
                'text' => $l->t('<p>You\'re all set to get started!</p><p>If you want to see this tour again, you can find it in your personal settings.</p><p>Have fun with Nextcloud!</p>'),
                'attachTo' => '',
                'position' => 'right',
                'enabled' => true,
                'visibleToGroups' => [],
            ],
        ];
    }
}
