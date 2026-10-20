<?php

declare(strict_types=1);

namespace OCA\IntroVox\Service;

use OCP\App\IAppManager;
use OCP\L10N\IFactory;
use OCP\TaskProcessing\Exception\Exception as TaskProcessingException;
use OCP\TaskProcessing\Exception\NotFoundException;
use OCP\TaskProcessing\IManager;
use OCP\TaskProcessing\Task;

/**
 * Translating a tour and drafting one with the Nextcloud Assistant: a
 * "free prompt" task (core:text2text) for whatever provider the admin set up
 * under Artificial intelligence. Tasks run in the background; the admin page
 * asks for the result (TourPrompts reads it).
 *
 * What a task is for is kept in its custom id, so the answer is read against
 * the steps that are there when it comes back: a tour changed meanwhile
 * gives "changed", never steps of another version.
 */
class TourAssistant {
    public const TASK_TYPE = 'core:text2text';
    private const PREFIX = 'introvox:';

    public function __construct(
        private IManager $taskProcessing,
        private TourRepository $tours,
        private StepValidator $stepValidator,
        private IFactory $l10nFactory,
        private IAppManager $appManager,
    ) {
    }

    /**
     * Whether a provider for free prompts is set up
     */
    public function available(): bool {
        return isset($this->taskProcessing->getAvailableTaskTypes()[self::TASK_TYPE]);
    }

    /**
     * @return int The task's id
     * @throws \RuntimeException 'no_steps' when there is nothing to translate
     * @throws TaskProcessingException
     */
    public function translate(array $tour, string $from, string $to, string $uid): int {
        $steps = $this->tours->stepsOrDefaults($tour['id'], $from) ?? [];
        if ($steps === []) {
            throw new \RuntimeException('no_steps');
        }
        $prompt = TourPrompts::translate($steps, $this->languageName($from), $this->languageName($to));
        return $this->schedule($prompt, $uid, ['translate', $tour['id'], $from, $to]);
    }

    /**
     * @param string $language The language the steps are written in
     * @return int The task's id
     * @throws TaskProcessingException
     */
    public function draft(array $tour, string $description, string $language, string $uid): int {
        $prompt = TourPrompts::draft($this->where($tour), $description, $this->languageName($language));
        return $this->schedule($prompt, $uid, ['draft', $tour['id'], $language]);
    }

    /**
     * Where the task stands, and its steps once it is done
     *
     * @return array{status: string, steps?: array[], language?: string, error?: string}
     *   status: running, done or failed; error: failed, cut_off, unreadable,
     *   changed
     * @throws NotFoundException Not a task of this user's, or not IntroVox's
     */
    public function result(int $taskId, string $uid): array {
        $task = $this->taskProcessing->getUserTask($taskId, $uid);
        $purpose = explode(':', (string)$task->getCustomId());
        if ($task->getAppId() !== 'introvox' || ($purpose[0] ?? '') !== 'introvox') {
            throw new NotFoundException();
        }
        $status = $task->getStatus();
        if (in_array($status, [Task::STATUS_SCHEDULED, Task::STATUS_RUNNING, Task::STATUS_UNKNOWN], true)) {
            return ['status' => 'running'];
        }
        if ($status !== Task::STATUS_SUCCESSFUL) {
            return ['status' => 'failed', 'error' => 'failed'];
        }

        // translate:<tour>:<from>:<to> or draft:<tour>:<language>
        [, $mode, $tourId, $language, $to] = $purpose + ['', '', '', '', ''];
        $output = (string)($task->getOutput()['output'] ?? '');
        $answer = TourPrompts::readSteps($output);
        $tour = $this->tours->get($tourId);
        if ($answer === null || $tour === null) {
            return ['status' => 'failed', 'error' => match (true) {
                $tour === null => 'changed',
                TourPrompts::cutOff($output) => 'cut_off',
                default => 'unreadable',
            }];
        }

        if ($mode === 'translate') {
            $steps = TourPrompts::applyTranslation($this->tours->stepsOrDefaults($tourId, $language) ?? [], $answer);
            if ($steps === null) {
                return ['status' => 'failed', 'error' => 'changed'];
            }
            $language = $to;
        } else {
            $steps = TourPrompts::draftSteps($answer, TourValidator::triggerPage($tour['trigger'] ?? []), 'ai-' . $taskId);
        }
        [$valid, $error] = $this->stepValidator->validateAll($steps);
        if ($error !== null) {
            return ['status' => 'failed', 'error' => 'unreadable'];
        }
        return ['status' => 'done', 'steps' => $valid, 'language' => $language];
    }

    /**
     * @param string[] $purpose Kept in the task's custom id
     * @throws TaskProcessingException
     */
    private function schedule(string $prompt, string $uid, array $purpose): int {
        $task = new Task(self::TASK_TYPE, ['input' => $prompt], 'introvox', $uid, self::PREFIX . implode(':', $purpose));
        $this->taskProcessing->scheduleTask($task);
        return (int)$task->getId();
    }

    /**
     * A language as the model is told it: its own name and its code
     */
    private function languageName(string $code): string {
        $languages = $this->l10nFactory->getLanguages();
        foreach (array_merge($languages['commonLanguages'] ?? [], $languages['otherLanguages'] ?? []) as $entry) {
            if (($entry['code'] ?? null) === $code) {
                return $entry['name'] . ' (' . $code . ')';
            }
        }
        return $code;
    }

    /**
     * What a draft is about: the app's name, a page, or Nextcloud itself
     */
    private function where(array $tour): string {
        $trigger = $tour['trigger'] ?? [];
        if (($trigger['type'] ?? '') === 'app') {
            $name = $this->appManager->getAppInfo($trigger['app'])['name'] ?? $trigger['app'];
            return 'the app "' . (is_array($name) ? (string)reset($name) : (string)$name) . '"';
        }
        if (($trigger['type'] ?? '') === 'page') {
            return 'the page ' . $trigger['page'];
        }
        return 'Nextcloud as a whole';
    }
}
