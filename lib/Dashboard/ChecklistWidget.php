<?php

declare(strict_types=1);

namespace OCA\IntroVox\Dashboard;

use OCA\IntroVox\Service\Checklist;
use OCA\IntroVox\Service\ChecklistService;
use OCP\Dashboard\IAPIWidgetV2;
use OCP\Dashboard\IConditionalWidget;
use OCP\Dashboard\IIconWidget;
use OCP\Dashboard\IReloadableWidget;
use OCP\Dashboard\Model\WidgetItem;
use OCP\Dashboard\Model\WidgetItems;
use OCP\IL10N;
use OCP\IURLGenerator;
use OCP\IUserManager;

/**
 * "Getting started" on the Dashboard: the tasks an admin chose, ticked off by
 * what each user did (ChecklistService). Only there while an admin has it on;
 * each user can remove it under Customize, like any widget.
 *
 * The Dashboard draws the items itself (API v2), as do the mobile apps.
 */
class ChecklistWidget implements IAPIWidgetV2, IConditionalWidget, IIconWidget, IReloadableWidget {
    public function __construct(
        private ChecklistService $checklist,
        private IL10N $l10n,
        private IURLGenerator $urlGenerator,
        private IUserManager $userManager,
    ) {
    }

    public function getId(): string {
        return Checklist::WIDGET_ID;
    }

    public function getTitle(): string {
        // TRANSLATORS: Title of the checklist widget on the Dashboard
        return $this->l10n->t('Getting started');
    }

    public function getOrder(): int {
        return 1;
    }

    public function getIconClass(): string {
        return 'icon-checkmark';
    }

    public function getIconUrl(): string {
        return $this->image('app-dark.svg');
    }

    public function getUrl(): ?string {
        return null;
    }

    public function load(): void {
    }

    public function isEnabled(): bool {
        return $this->checklist->enabled();
    }

    // A task done in another tab shows up without a reload
    public function getReloadInterval(): int {
        return 60;
    }

    public function getItemsV2(string $userId, ?string $since = null, int $limit = 7): WidgetItems {
        $user = $this->userManager->get($userId);
        $tasks = $user === null ? [] : $this->checklist->progress($user);
        if (!in_array(false, array_column($tasks, 'done'), true)) {
            return new WidgetItems([], $this->l10n->t('All done. You can remove this list under Customize.'));
        }
        $items = array_map(fn (array $task): WidgetItem => new WidgetItem(
            $task['title'],
            $task['done'] ? $this->l10n->t('Completed') : $task['hint'],
            $task['link'],
            $this->image($task['done'] ? 'checklist-done.svg' : 'checklist-todo.svg'),
        ), $tasks);
        return new WidgetItems(array_slice($items, 0, $limit));
    }

    private function image(string $file): string {
        return $this->urlGenerator->getAbsoluteURL($this->urlGenerator->imagePath('introvox', $file));
    }
}
