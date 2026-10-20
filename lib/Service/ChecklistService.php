<?php

declare(strict_types=1);

namespace OCA\IntroVox\Service;

use OCP\App\IAppManager;
use OCP\Authentication\TwoFactorAuth\IRegistry;
use OCP\Config\IUserConfig;
use OCP\DB\QueryBuilder\IQueryBuilder;
use OCP\Files\IRootFolder;
use OCP\IAvatarManager;
use OCP\IConfig;
use OCP\IDBConnection;
use OCP\IL10N;
use OCP\IURLGenerator;
use OCP\IUser;

/**
 * The checklist on the Dashboard (Dashboard\ChecklistWidget): its settings,
 * and how far each user is. Every task is ticked off by what the user did:
 * the fixed ones by what Nextcloud knows, an admin's own ones by opening
 * their page from the list.
 */
class ChecklistService {
    // A desktop or mobile client, by the name its sign-in got (the user
    // agent, as Devices & sessions reads it)
    private const CLIENT = '/\b(?:mirall|csyncoC)\/|(?:ownCloud|Nextcloud)-(?:android|iOS|Talk)/i';
    // The Dashboard's own default (apps/dashboard DashboardService)
    private const DASHBOARD_DEFAULT = 'recommendations,spreed,mail,calendar';
    // The second factor every account has, which says nothing
    private const BACKUP_CODES = 'backup_codes';

    public function __construct(
        private IConfig $config,
        private IUserConfig $userConfig,
        private IL10N $l10n,
        private IURLGenerator $urlGenerator,
        private IAppManager $appManager,
        private IAvatarManager $avatarManager,
        private IRootFolder $rootFolder,
        private IRegistry $twoFactor,
        private IDBConnection $db,
        private TourRepository $tours,
    ) {
    }

    public function enabled(): bool {
        return $this->config->getAppValue('introvox', 'checklist_enabled', 'false') === 'true';
    }

    /**
     * For the admin page
     *
     * @return array{enabled: bool, onDashboard: bool, tasks: array[]}
     */
    public function settings(): array {
        $chosen = $this->chosen();
        return [
            'enabled' => $this->enabled(),
            'onDashboard' => $this->onDashboard(),
            'tasks' => array_map(fn (string $task): array => [
                'id' => $task,
                'title' => $this->title($task),
                'hint' => $this->hint($task),
                'note' => $this->note($task),
                'chosen' => in_array($task, $chosen, true),
            ], Checklist::TASKS),
            'custom' => $this->custom(),
        ];
    }

    /**
     * Only what is given changes; nothing does when the own tasks do not pass
     *
     * @param array{enabled?: mixed, tasks?: mixed, onDashboard?: mixed, custom?: mixed} $changes
     * @return string|null Why the own tasks were refused (Checklist::custom())
     */
    public function save(array $changes): ?string {
        $flag = static fn ($value): bool => $value === true || $value === 'true' || $value === '1';
        if (array_key_exists('custom', $changes)) {
            [$custom, $error] = Checklist::custom($changes['custom'], static fn (): string => 'c-' . bin2hex(random_bytes(4)));
            if ($error !== null) {
                return $error;
            }
            // Who opened a task that is gone is forgotten with it
            foreach (array_diff(array_column($this->custom(), 'id'), array_column($custom, 'id')) as $gone) {
                $this->userConfig->deleteKey('introvox', 'checklist_' . $gone);
            }
            $this->config->setAppValue('introvox', 'checklist_custom', json_encode($custom));
        }
        if (array_key_exists('enabled', $changes)) {
            $this->config->setAppValue('introvox', 'checklist_enabled', $flag($changes['enabled']) ? 'true' : 'false');
        }
        if (is_array($changes['tasks'] ?? null)) {
            $this->config->setAppValue('introvox', 'checklist_tasks', json_encode(array_values(array_intersect(Checklist::TASKS, $changes['tasks']))));
        }
        if (array_key_exists('onDashboard', $changes)) {
            $layout = Checklist::layout($this->config->getAppValue('dashboard', 'layout', self::DASHBOARD_DEFAULT), $flag($changes['onDashboard']));
            $this->config->setAppValue('dashboard', 'layout', $layout);
        }
        return null;
    }

    /**
     * An own task opened from the list (src/main.js): done for this user
     *
     * @return bool False for a task that is not there, or a list that is off
     */
    public function opened(IUser $user, string $id): bool {
        if (!$this->enabled() || !in_array($id, array_column($this->custom(), 'id'), true)) {
            return false;
        }
        $this->config->setUserValue($user->getUID(), 'introvox', 'checklist_' . $id, (string)time());
        return true;
    }

    /**
     * The chosen tasks that apply to this user, and whether each is done
     *
     * @return array{id: string, title: string, hint: string, link: string, done: bool}[]
     */
    public function progress(IUser $user): array {
        $tasks = [];
        foreach ($this->chosen() as $task) {
            if (!$this->applies($task, $user)) {
                continue;
            }
            $tasks[] = [
                'id' => $task,
                'title' => $this->title($task),
                'hint' => $this->hint($task),
                'link' => $this->link($task),
                'done' => $this->done($task, $user),
            ];
        }
        // An admin's own, after the fixed ones
        foreach ($this->custom() as $task) {
            $tasks[] = [
                'id' => $task['id'],
                'title' => $task['title'],
                'hint' => $task['text'],
                'link' => $this->absolute(Checklist::withCheck($task['page'], $task['id'])),
                'done' => $this->config->getUserValue($user->getUID(), 'introvox', 'checklist_' . $task['id'], '') !== '',
            ];
        }
        return $tasks;
    }

    /**
     * @return array{id: string, title: string, text: string, page: string}[]
     */
    private function custom(): array {
        return Checklist::stored($this->config->getAppValue('introvox', 'checklist_custom', ''));
    }

    /**
     * @return string[]
     */
    private function chosen(): array {
        return Checklist::chosen($this->config->getAppValue('introvox', 'checklist_tasks', ''));
    }

    // Whether the Dashboard of someone who never arranged their own has it
    private function onDashboard(): bool {
        $layout = $this->config->getAppValue('dashboard', 'layout', self::DASHBOARD_DEFAULT);
        return in_array(Checklist::WIDGET_ID, explode(',', $layout), true);
    }

    private function applies(string $task, IUser $user): bool {
        return match ($task) {
            'welcome' => $this->tours->toursEnabled() && ($this->tours->get(TourValidator::WELCOME)['enabled'] ?? false) === true,
            'talk' => $this->appManager->isEnabledForUser('spreed', $user),
            'twofactor' => array_diff(array_keys($this->twoFactor->getProviderStates($user)), [self::BACKUP_CODES]) !== [],
            default => true,
        };
    }

    private function done(string $task, IUser $user): bool {
        $uid = $user->getUID();
        return match ($task) {
            'welcome' => $this->config->getUserValue($uid, 'introvox', 'wizard_completed', '') !== '',
            'upload' => $this->uploaded($uid),
            'avatar' => $this->avatarManager->getAvatar($uid)->isCustomAvatar(),
            'client' => $this->clientConnected($uid),
            'talk' => $this->wroteInTalk($uid),
            'twofactor' => in_array(true, array_diff_key($this->twoFactor->getProviderStates($user), [self::BACKUP_CODES => true]), true),
            default => false,
        };
    }

    // A file of their own: an upload through WebDAV (the web page, the
    // clients) records when; the files a new account starts with were copied.
    // Not by modification time: a client keeps that of the file it syncs.
    // Once found it stays done, so the files are looked through only until then.
    private function uploaded(string $uid): bool {
        if ($this->config->getUserValue($uid, 'introvox', 'checklist_uploaded', '') !== '') {
            return true;
        }
        $storage = $this->rootFolder->getUserFolder($uid)->getStorage()->getCache()->getNumericStorageId();
        $query = $this->db->getQueryBuilder();
        $query->select('f.fileid')
            ->from('filecache', 'f')
            ->innerJoin('f', 'filecache_extended', 'fe', $query->expr()->eq('fe.fileid', 'f.fileid'))
            ->where($query->expr()->eq('f.storage', $query->createNamedParameter($storage, IQueryBuilder::PARAM_INT)))
            ->andWhere($query->expr()->gt('fe.upload_time', $query->createNamedParameter(0, IQueryBuilder::PARAM_INT)))
            ->setMaxResults(1);
        $result = $query->executeQuery();
        try {
            $found = $result->fetchOne() !== false;
        } finally {
            $result->closeCursor();
        }
        if ($found) {
            $this->config->setUserValue($uid, 'introvox', 'checklist_uploaded', (string)time());
        }
        return $found;
    }

    private function clientConnected(string $uid): bool {
        $query = $this->db->getQueryBuilder();
        $query->select('name')
            ->from('authtoken')
            ->where($query->expr()->eq('uid', $query->createNamedParameter($uid)));
        $result = $query->executeQuery();
        try {
            while (($name = $result->fetchOne()) !== false) {
                if (preg_match(self::CLIENT, (string)$name)) {
                    return true;
                }
            }
            return false;
        } finally {
            $result->closeCursor();
        }
    }

    // A message of their own; Talk starts every account with conversations
    // that hold messages from others
    private function wroteInTalk(string $uid): bool {
        $query = $this->db->getQueryBuilder();
        $query->select('id')
            ->from('comments')
            ->where($query->expr()->eq('actor_type', $query->createNamedParameter('users')))
            ->andWhere($query->expr()->eq('actor_id', $query->createNamedParameter($uid)))
            ->andWhere($query->expr()->eq('object_type', $query->createNamedParameter('chat')))
            ->andWhere($query->expr()->eq('verb', $query->createNamedParameter('comment')))
            ->setMaxResults(1);
        $result = $query->executeQuery();
        try {
            return $result->fetchOne() !== false;
        } finally {
            $result->closeCursor();
        }
    }

    private function title(string $task): string {
        return match ($task) {
            // TRANSLATORS: Checklist task on the Dashboard; the Dashboard cuts off text longer than one line
            'welcome' => $this->l10n->t('Take the welcome tour'),
            'upload' => $this->l10n->t('Upload a file'),
            // TRANSLATORS: Checklist task on the Dashboard; the Dashboard cuts off text longer than one line
            'avatar' => $this->l10n->t('Add a profile picture'),
            // TRANSLATORS: Checklist task on the Dashboard: install the Nextcloud desktop or mobile app; keep it short
            'client' => $this->l10n->t('Install the app'),
            'talk' => $this->l10n->t('Send a message in Talk'),
            // TRANSLATORS: Checklist task on the Dashboard; the Dashboard cuts off text longer than one line
            'twofactor' => $this->l10n->t('Secure your account'),
        };
    }

    // Short: the Dashboard cuts off what does not fit on one line
    private function hint(string $task): string {
        return match ($task) {
            'welcome' => $this->l10n->t('A short tour of Nextcloud'),
            'upload' => $this->l10n->t('Drag a file into Files, or use New'),
            // TRANSLATORS: Short explanation under the task "Add a profile picture"; keep it short
            'avatar' => $this->l10n->t('So others recognize you'),
            'client' => $this->l10n->t('On your computer or phone'),
            'talk' => $this->l10n->t('Chat and call with your team'),
            // TRANSLATORS: Short explanation under the task "Secure your account"; keep it short
            'twofactor' => $this->l10n->t('With two-factor authentication'),
        };
    }

    // When a task is left out for some users (applies())
    private function note(string $task): string {
        return match ($task) {
            'welcome' => $this->l10n->t('While the welcome tour is on'),
            'talk' => $this->l10n->t('For people who can use Talk'),
            'twofactor' => $this->l10n->t('When an app for two-factor authentication is installed'),
            default => '',
        };
    }

    private function link(string $task): string {
        $path = match ($task) {
            // Starts the welcome tour there (src/main.js, takeLink)
            'welcome' => '/apps/files/?introvox-tour=welcome',
            'upload' => '/apps/files/',
            'avatar' => '/settings/user/personal-info',
            'client' => '/settings/user/sync-clients',
            'talk' => '/apps/spreed/',
            'twofactor' => '/settings/user/security',
        };
        return $this->absolute($path);
    }

    // A page of this Nextcloud, as a full address for the Dashboard and the apps
    private function absolute(string $page): string {
        return $this->urlGenerator->getAbsoluteURL($this->urlGenerator->linkTo('', 'index.php') . $page);
    }
}
