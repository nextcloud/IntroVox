<?php

declare(strict_types=1);

namespace OCA\IntroVox\Service;

use OCP\L10N\IFactory;

/**
 * The tours IntroVox ships for Files, Talk, Deck and Calendar. They appear in
 * the Tours list once their app is installed, switched off; an admin switches
 * them on and may change everything but where they start. Their steps are
 * translated on Transifex, like the welcome tour's; an admin's own steps for
 * a language replace them, and Reset brings them back.
 *
 * Steps only point at parts of the apps that stay put between versions (the
 * same on Nextcloud 32 and 35, Talk 22 and 25) and between languages:
 * data-cy attributes, long-lived classes, link targets, never a label. Where
 * the user does something (shares a file, starts a conversation, plans an
 * event), a step goes on with that click, and the next one waits aside until
 * what the click opened is there. A step whose element never comes still
 * makes sense by its text, and Next goes on.
 */
class BuiltinTours {
    /** Tour id => the app it starts in */
    public const APPS = [
        'builtin-files' => 'files',
        'builtin-talk' => 'spreed',
        'builtin-deck' => 'deck',
        'builtin-calendar' => 'calendar',
    ];

    /** What an admin may change on a built-in tour (TourValidator::FIELDS) */
    public const EDITABLE = ['enabled', 'visibleToGroups', 'audience', 'startAfterDays', 'startFrom', 'startUntil'];

    public function __construct(
        private IFactory $l10nFactory,
    ) {
    }

    public static function isBuiltin(string $id): bool {
        return isset(self::APPS[$id]);
    }

    /**
     * The tour's name in the current user's language
     */
    public function name(string $id): string {
        return self::names($this->l10nFactory->get('introvox'))[$id] ?? $id;
    }

    /**
     * The steps in a language, or the base language, or English when IntroVox
     * has no translation for it; null for a tour that is not built in
     */
    public function steps(string $id, string $language): ?array {
        if (!self::isBuiltin($id)) {
            return null;
        }
        foreach ([$language, substr($language, 0, 2), 'en'] as $candidate) {
            if ($candidate === 'en' || $this->l10nFactory->languageExists('introvox', $candidate)) {
                return self::stepsIn($this->l10nFactory->get('introvox', $candidate))[$id];
            }
        }
        return null;
    }

    /**
     * @param object $l Anything with t(string): string, such as IL10N
     * @return array<string, string>
     */
    public static function names(object $l): array {
        return [
            // TRANSLATORS: Name of the Files app, as Nextcloud shows it in your language
            'builtin-files' => $l->t('Files'),
            // TRANSLATORS: Name of the Talk app, as Nextcloud shows it in your language
            'builtin-talk' => $l->t('Talk'),
            // TRANSLATORS: Name of the Deck app, as Nextcloud shows it in your language
            'builtin-deck' => $l->t('Deck'),
            // TRANSLATORS: Name of the Calendar app, as Nextcloud shows it in your language
            'builtin-calendar' => $l->t('Calendar'),
        ];
    }

    /**
     * Every built-in tour's steps, in the language of $l
     *
     * @param object $l Anything with t(string): string, such as IL10N
     * @return array<string, array[]> Tour id => steps
     */
    public static function stepsIn(object $l): array {
        // $advance 'click': the step goes on when the user clicks its element
        $step = static fn (string $page, string $id, string $title, string $text, string $attachTo = '', string $position = 'right', string $advance = ''): array => [
            'id' => $id,
            'title' => $title,
            'text' => $text,
            'attachTo' => $attachTo,
            'position' => $position,
            'enabled' => true,
            'visibleToGroups' => [],
            'page' => $page,
        ] + ($advance !== '' ? ['advance' => $advance] : []);

        $files = static fn (...$args) => $step('/apps/files/', ...$args);
        $talk = static fn (...$args) => $step('/apps/spreed/', ...$args);
        $deck = static fn (...$args) => $step('/apps/deck/', ...$args);
        $calendar = static fn (...$args) => $step('/apps/calendar/', ...$args);

        return [
            'builtin-files' => [
                $files('files-welcome',
                    // TRANSLATORS: Title of a step in the built-in tour of the Files app; keep the emoji
                    $l->t('📁 Welcome to Files'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Files app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p>Files is where your work lives. Share a link instead of emailing attachments, so everyone works in the same copy.</p><p>In this tour you make a folder, see how to share it and learn how to undo mistakes.</p>')),
                $files('files-new',
                    // TRANSLATORS: Title of a step in the built-in tour of the Files app; keep the emoji
                    $l->t('➕ Make a place for your work'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Files app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p>Let\'s start with a folder of your own: click <strong>New</strong>.</p><p>No New button? Open a folder you can add to, such as a project folder.</p>'),
                    '[data-cy-upload-picker]',
                    'bottom',
                    'click'),
                $files('files-new-folder',
                    // TRANSLATORS: Title of a step in the built-in tour of the Files app; keep the emoji
                    $l->t('📤 Upload or create'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Files app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p>Here you upload files, or a whole folder at once, and create new documents to work on together.</p><p>For now, choose <strong>New folder</strong>.</p>'),
                    '[data-cy-upload-picker-menu-entry="newFolder"]',
                    'right',
                    'click'),
                $files('files-folder-name',
                    // TRANSLATORS: Title of a step in the built-in tour of the Files app; keep the emoji
                    $l->t('✏️ Give it a name'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Files app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p>Name it after something you\'re working on now, so it\'s useful right away and others see what\'s inside.</p><p>Click <strong>Create</strong> first, then click <strong>Next</strong>.</p>'),
                    '[data-cy-files-new-node-dialog-input]',
                    'top',
                    'input'),
                $files('files-share',
                    // TRANSLATORS: Title of a step in the built-in tour of the Files app; keep the emoji
                    $l->t('🤝 Share a folder'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Files app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p>Now click the share icon next to your new folder. Could not make one? Any folder you can share will do.</p><p>The icon opens a panel that shows who has access. Nothing gets shared yet.</p>'),
                    '.files-list__row--active [data-cy-files-list-row-action="sharing-status"], body:not(:has([data-cy-upload-picker])) [data-cy-files-list-row-action="sharing-status"]',
                    'left',
                    'click'),
                $files('files-share-people',
                    // TRANSLATORS: Title of a step in the built-in tour of the Files app; keep the emoji
                    $l->t('👥 Colleagues and teams'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Files app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p>Type a colleague\'s name, a group or a team. Choose <strong>View only</strong> or <strong>Allow upload and editing</strong>, then click <strong>Save share</strong>.</p><p>Anything you add to the folder later is shared too. You do not have to share anything now.</p>'),
                    '.sharing-search',
                    'left'),
                $files('files-internal-link',
                    // TRANSLATORS: Title of a step in the built-in tour of the Files app; keep the emoji
                    $l->t('🔗 Send a link, not a file'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Files app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p>Copy the <strong>Internal link</strong> into a chat or an email instead of attaching the file. Colleagues with access open this very folder, so nobody works on an old copy.</p><p>The link itself does not give anyone access.</p>'),
                    '.sharing-entry__internal',
                    'left'),
                $files('files-share-link',
                    // TRANSLATORS: Title of a step in the built-in tour of the Files app; keep the emoji
                    $l->t('🌐 People outside your organization'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Files app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p>Someone at another organization? Type their email address above, or their federated cloud ID if they use Nextcloud too.</p><p>Or create a public link: its <strong>⋯</strong> menu › <strong>Customize link</strong> adds a password and an expiration date. Your organization may limit public links.</p>'),
                    '.sharing-link-list',
                    'left'),
                $files('files-activity',
                    // TRANSLATORS: Title of a step in the built-in tour of the Files app; keep the emoji
                    $l->t('💬 Activity and comments'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Files app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p>The <strong>Activity</strong> tab shows what happened to this item, such as who created, renamed or shared it.</p><p>You can also leave a comment there for everyone with access.</p>'),
                    '#tab-button-activity',
                    'bottom'),
                $files('files-shares',
                    // TRANSLATORS: Title of a step in the built-in tour of the Files app; keep the emoji
                    $l->t('📥 Shared with you'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Files app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p>Everything shared with you or by you is under <strong>Shares</strong>. Folders shared with your group or project also show up in <strong>All files</strong>.</p><p>A share from another Nextcloud server may wait in <strong>Pending shares</strong>: open Shares with its arrow to accept it.</p>'),
                    '[data-cy-files-navigation-item="shareoverview"]'),
                $files('files-trash',
                    // TRANSLATORS: Title of a step in the built-in tour of the Files app; keep the emoji
                    $l->t('🗑️ Nothing is lost right away'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Files app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p>Changed a file by mistake? In its details, <strong>Versions</strong> brings back an earlier one. Deleted something? It stays in <strong>Deleted files</strong> for a while.</p><p>That\'s it. Now drag your files into your folder, and send links instead of attachments.</p>'),
                    '[data-cy-files-navigation-item="trashbin"]'),
            ],
            'builtin-talk' => [
                $talk('talk-welcome',
                    // TRANSLATORS: Title of a step in the built-in tour of the Talk app; keep the emoji
                    $l->t('💬 Welcome to Talk'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Talk app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p>Chat, calls and video meetings with your colleagues, right next to your files.</p><p>In this tour you set up a conversation for your team, add colleagues and see how calls, meetings and notifications work.</p>')),
                $talk('talk-start',
                    // TRANSLATORS: Title of a step in the built-in tour of the Talk app; keep the emoji
                    $l->t('🚀 A conversation for your team'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Talk app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p>A group conversation keeps a team\'s messages, files and calls in one place, instead of long email threads.</p><p>Let\'s make one: click the highlighted button. If it is not there, click <strong>Home</strong> at the top left.</p>'),
                    '.talk-dashboard__actions > :has(.plus-icon)',
                    'bottom',
                    'click'),
                $talk('talk-name',
                    // TRANSLATORS: Title of a step in the built-in tour of the Talk app; keep the emoji
                    $l->t('✏️ Name it after real work'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Talk app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p>Type the name of a team, project or research group you work with, then click <strong>Next</strong>. Leave the other options as they are.</p><p>Already have a team conversation? Close this with ✕, then click <strong>Next</strong>.</p>'),
                    '.new-group-conversation__content:not(.set-contacts) .input-field__input',
                    'bottom',
                    'input'),
                $talk('talk-create',
                    // TRANSLATORS: Title of a step in the built-in tour of the Talk app; keep the emoji
                    $l->t('✅ Create it'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Talk app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p>Click the highlighted button to create the conversation.</p>'),
                    '.new-group-conversation:not(:has(.set-contacts)) .new-group-conversation__footer > .button-vue--tertiary, .new-group-conversation:has(.set-contacts) .new-group-conversation__footer > .new-group-conversation__button',
                    'top',
                    'click'),
                $talk('talk-people',
                    // TRANSLATORS: Title of a step in the built-in tour of the Talk app; keep the emoji
                    $l->t('👥 Add your colleagues'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Talk app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p>In <strong>Participants</strong> on the right (open the sidebar if needed), type a colleague\'s or group\'s name and pick them. They get a notification.</p><p>External partners? Invite them by email in a separate conversation, if your organization allows guests.</p>'),
                    '#tab-participants, .app-sidebar__toggle',
                    'left'),
                $talk('talk-message',
                    // TRANSLATORS: Title of a step in the built-in tour of the Talk app; keep the emoji
                    $l->t('✍️ Say what it is for'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Talk app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p>Write a first message, for example what this conversation is for, and send it.</p><p>The <strong>+</strong> button shares one of your files, so everyone works in the same copy.</p>'),
                    '.new-message-form',
                    'top'),
                $talk('talk-calls',
                    // TRANSLATORS: Title of a step in the built-in tour of the Talk app; keep the emoji
                    $l->t('📞 Call with one click'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Talk app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p>Need to talk? <strong>Start call</strong> notifies everyone in the conversation, and they join with one click. You can share your screen too.</p><p>No need to try it now: it would ring them all.</p>'),
                    '.top-bar .join-call',
                    'bottom'),
                $talk('talk-meetings',
                    // TRANSLATORS: Title of a step in the built-in tour of the Talk app; keep the emoji
                    $l->t('📅 Plan a meeting'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Talk app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p>Next to <strong>Start call</strong>, the calendar button lists upcoming meetings. <strong>Schedule a meeting</strong> puts one in your calendar and invites everyone here.</p><p>At meeting time, everyone opens this conversation and joins the call.</p>'),
                    '.top-bar .upcoming-meeting',
                    'bottom'),
                $talk('talk-notifications',
                    // TRANSLATORS: Title of a step in the built-in tour of the Talk app; keep the emoji
                    $l->t('🔔 Choose what you hear'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Talk app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p>Each conversation has its own setting: hover over it, click the three dots and open <strong>Notifications</strong>. Put your team\'s conversation on <strong>All messages</strong>.</p><p>Someone chose <strong>@-mentions only</strong>? Type <strong>@</strong> and their name to reach them.</p>'),
                    'li.conversation--active'),
                $talk('talk-home',
                    // TRANSLATORS: Title of a step in the built-in tour of the Talk app; keep the emoji
                    $l->t('🏠 Start your day at Home'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Talk app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p><strong>Home</strong> shows your upcoming meetings, unread mentions and message reminders.</p><p>Search your phone\'s app store for Nextcloud Talk, so calls and messages reach you when this tab is closed.</p>'),
                    '#app-navigation-vue a[href$="/apps/spreed"]'),
                $talk('talk-search',
                    // TRANSLATORS: Title of a step in the built-in tour of the Talk app; keep the emoji
                    $l->t('🔍 A quick question?'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Talk app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p>Next time you have a quick question, type a colleague\'s name here to start a one-to-one chat. It also finds your conversations.</p><p>That\'s it. Send your next team update in your team conversation instead of an email.</p>'),
                    '.conversations-search'),
            ],
            'builtin-deck' => [
                $deck('deck-welcome',
                    // TRANSLATORS: Title of a step in the built-in tour of the Deck app; keep the emoji
                    $l->t('🗂️ Welcome to Deck'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Deck app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p>Deck keeps track of tasks, your own or your team\'s, so everyone sees who does what and what is due.</p><p>In this tour you add a task, give it a due date and see where it comes back.</p>')),
                $deck('deck-boards',
                    // TRANSLATORS: Title of a step in the built-in tour of the Deck app; keep the emoji
                    $l->t('📋 Open a board'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Deck app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p>Your boards are listed here, together with boards colleagues share with you.</p><p>Click your <strong>Welcome</strong> board to practice: only you can see it. No Welcome board? Open a board of your own.</p>'),
                    'body:not(:has(.modal__card)) #app-navigation-vue .app-navigation-entry__children',
                    'right',
                    'click'),
                $deck('deck-cards',
                    // TRANSLATORS: Title of a step in the built-in tour of the Deck app; keep the emoji
                    $l->t('➕ Add a card'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Deck app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p>Each column is a list, such as To do or Done, and each card is a task. Click the highlighted button to add one.</p><p>No button? You can only view this board, or it has no lists yet. Click <strong>Back</strong> and open another.</p>'),
                    '.board [data-cy="action:add-card"]',
                    'bottom',
                    'click'),
                $deck('deck-card-title',
                    // TRANSLATORS: Title of a step in the built-in tour of the Deck app; keep the emoji
                    $l->t('✏️ What needs doing?'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Deck app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p>Click in the field, type a real task, such as <em>Set up a board for my project</em>, and press <strong>Enter</strong>. Your card appears in the list and the field empties.</p><p>Only Enter saves it, so press Enter first, then click <strong>Next</strong>.</p>'),
                    '.stack__card-add'),
                $deck('deck-open-card',
                    // TRANSLATORS: Title of a step in the built-in tour of the Deck app; keep the emoji
                    $l->t('👆 Open your card'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Deck app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p>Your new card is at the bottom of the list. Click it to open it.</p><p>Later on, drag cards to the next list as the work moves on, and up or down to change their order.</p>'),
                    '.board .stack > .smooth-dnd-container:has(.card), .board .card',
                    'right',
                    'click'),
                $deck('deck-due',
                    // TRANSLATORS: Title of a step in the built-in tour of the Deck app; keep the emoji
                    $l->t('📅 Give it a due date'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Deck app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p>Click the <strong>+</strong> here and pick a date. Cards with a due date come back in <strong>Upcoming cards</strong> and, if you use Calendar, in your calendar.</p><p>On a shared board, you can assign the card to someone in the field above; they get a notification.</p>'),
                    '#app-sidebar-vue [data-cy-due-date-actions]'),
                $deck('deck-comments',
                    // TRANSLATORS: Title of a step in the built-in tour of the Deck app; keep the emoji
                    $l->t('💬 Notes, comments and files'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Deck app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p>Keep everything about a task on its card: notes and checklists in the description, discussion in the comments, files as attachments for everyone on the board. Type @ in a comment to mention someone.</p><p>Now close the card with ✕, then click <strong>Next</strong>.</p>'),
                    '#tab-button-comments',
                    'bottom'),
                $deck('deck-share',
                    // TRANSLATORS: Title of a step in the built-in tour of the Deck app; keep the emoji
                    $l->t('🤝 Work together'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Deck app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p>This button opens the board\'s details: share the board with colleagues, groups or teams, and see who changed what.</p><p>People you add can only view at first. Turn on <strong>Can edit</strong> for those who work on the cards.</p>'),
                    'body:not(:has(.modal__card)) .board-action-buttons button:has(.icon-menu-sidebar)',
                    'bottom'),
                $deck('deck-upcoming',
                    // TRANSLATORS: Title of a step in the built-in tour of the Deck app; keep the emoji
                    $l->t('📆 Upcoming cards'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Deck app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p>Now see your task come back: click <strong>Upcoming cards</strong>. It gathers the open cards from all your boards in one view.</p>'),
                    'body:not(:has(.modal__card)) #app-navigation-vue a[href$="/apps/deck/upcoming"], body:not(:has(.modal__card)) #app-navigation-vue a[href$="/apps/deck/"]',
                    'right',
                    'click'),
                $deck('deck-upcoming-cards',
                    // TRANSLATORS: Title of a step in the built-in tour of the Deck app; keep the emoji
                    $l->t('⏰ What\'s due when'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Deck app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p>Your open cards from every board, assigned to you or to no one, sorted by due date. Find your new card under the day you picked, or under <strong>No due</strong>.</p><p>Finished? Click <strong>Mark as done</strong> on its card, and it leaves this list.</p>'),
                    '.overview .dashboard-column:has(.card)'),
                $deck('deck-add-board',
                    // TRANSLATORS: Title of a step in the built-in tour of the Deck app; keep the emoji
                    $l->t('🚀 Make it yours'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Deck app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p>That\'s it. Ready for real work? Add a board for each project or team, give it your own lists and share it with the people involved.</p><p>The cards on the Welcome board have more tips.</p>'),
                    '#app-navigation-vue a:has(> .icon-add)'),
            ],
            'builtin-calendar' => [
                $calendar('calendar-welcome',
                    // TRANSLATORS: Title of a step in the built-in tour of the Calendar app; keep the emoji
                    $l->t('📅 Welcome to Calendar'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Calendar app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p>Plan meetings and time for your own work, and see when colleagues are free.</p><p>In this tour you plan an event, then see how to invite colleagues, share calendars and have them on your phone too.</p>')),
                $calendar('calendar-new',
                    // TRANSLATORS: Title of a step in the built-in tour of the Calendar app; keep the emoji
                    $l->t('➕ Plan your first event'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Calendar app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p>Let\'s plan something: click the highlighted button to start a new event.</p><p>Later you can also click a day in the calendar, or drag across a few hours in the week view.</p>'),
                    '.new-event',
                    'right',
                    'click'),
                $calendar('calendar-details',
                    // TRANSLATORS: Title of a step in the built-in tour of the Calendar app; keep the emoji
                    $l->t('👥 Meeting with others?'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Calendar app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p>Add colleagues, or anyone by email, under <strong>Attendees</strong>. Once they are added, <strong>Find a time</strong> in <strong>More details</strong> shows when they are free. Reminders are there too.</p><p>To invite people, your account needs an email address. First, the basics.</p>'),
                    '.event-popover__buttons .button-vue--secondary, .event-popover__buttons .button-vue--vue-secondary, .app-full-footer__left .invitees-list',
                    'left'),
                $calendar('calendar-title',
                    // TRANSLATORS: Title of a step in the built-in tour of the Calendar app; keep the emoji
                    $l->t('✏️ What and when'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Calendar app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p>Plan something real: type what it is, such as <em>Project meeting</em> or <em>Writing time</em>.</p><p>Then set the day and time just below it, and click <strong>Next</strong>.</p>'),
                    '.property-title__input input',
                    'right',
                    'input'),
                $calendar('calendar-save',
                    // TRANSLATORS: Title of a step in the built-in tour of the Calendar app; keep the emoji
                    $l->t('💾 Save it'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Calendar app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p>Click <strong>Save</strong>, and your event is in your calendar. Later, click it to see or edit it, or drag it to another day or time.</p><p>Rather not keep it? Close it with ✕, then click <strong>Next</strong>.</p>'),
                    '.save-buttons .button-vue--primary, .save-buttons .button-vue--vue-primary',
                    'right',
                    'click'),
                $calendar('calendar-navigate',
                    // TRANSLATORS: Title of a step in the built-in tour of the Calendar app; keep the emoji
                    $l->t('🧭 Day, week or month'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Calendar app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p>Planned it for another week or month? The arrows above take you there; click the date between them to jump to any day. <strong>Today</strong> brings you back.</p><p>This menu switches between day, week, month, year and a list.</p>'),
                    '.new-event-today-view-section .action-item__menutoggle'),
                $calendar('calendar-list',
                    // TRANSLATORS: Title of a step in the built-in tour of the Calendar app; keep the emoji
                    $l->t('☑️ Your calendars'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Calendar app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p>Click a calendar to show or hide its events. You may also see birthdays, Deck cards with a due date and calendars shared with you.</p><p>To share one, hover over it and choose <strong>Edit and share calendar</strong>.</p>'),
                    '.calendar-list-wrapper'),
                $calendar('calendar-add',
                    // TRANSLATORS: Title of a step in the built-in tour of the Calendar app; keep the emoji
                    $l->t('📆 Calendars for projects and teams'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Calendar app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p>Make a separate calendar for a project or team, and share it with them.</p><p>If your organization allows it, you can also subscribe to a read-only calendar by link, such as a course timetable, or add public holidays.</p>'),
                    '.app-navigation-entry-new-calendar .action-item__menutoggle'),
                $calendar('calendar-sync',
                    // TRANSLATORS: Title of a step in the built-in tour of the Calendar app; keep the emoji
                    $l->t('📱 On your phone too'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Calendar app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p><strong>Calendar settings</strong> has the CalDAV address for your phone or Thunderbird, and a separate one for iPhone and Mac. On Android, use the DAVx⁵ app.</p><p>Sign in there with an app password, made in your personal settings under <strong>Security</strong>.</p>'),
                    '.navigation-calendar-settings, #app-settings__header'),
                $calendar('calendar-appointments',
                    // TRANSLATORS: Title of a step in the built-in tour of the Calendar app; keep the emoji
                    $l->t('🕓 Let others book time with you'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Calendar app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p>For office hours, supervision or study participants: an appointment schedule gives people a link to book a free slot with you, no account needed.</p><p>See a warning here? Your account needs an email address; ask your IT team if you cannot add one.</p>'),
                    '.appointment-config-list'),
                $calendar('calendar-done',
                    // TRANSLATORS: Title of a step in the built-in tour of the Calendar app; keep the emoji
                    $l->t('🗑️ Nothing is lost right away'),
                    // TRANSLATORS: Text of a step in the built-in tour of the Calendar app. Words in bold are labels in Nextcloud: use the words Nextcloud shows in your language
                    $l->t('<p>Deleted an event by mistake? It stays in the <strong>Trash bin</strong> for a while, so you can restore it.</p><p>That\'s it. Now plan your next real meeting here, and invite the people involved.</p>'),
                    '.app-navigation__list > .app-navigation-entry--pinned'),
            ],
        ];
    }
}
