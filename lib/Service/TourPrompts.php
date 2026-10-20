<?php

declare(strict_types=1);

namespace OCA\IntroVox\Service;

/**
 * What IntroVox asks a language model through the Nextcloud Assistant, and
 * how it reads the answer: translating a tour's steps, and drafting the steps
 * of a new tour from a description.
 *
 * A model's answer is treated like an imported file: only JSON of the
 * expected shape counts, every step then goes through StepValidator, and the
 * HTML is cleaned where it is shown. An answer that does not fit is refused
 * as a whole, never half used.
 *
 * Plain PHP without Nextcloud dependencies, so it can be tested directly.
 */
class TourPrompts {
    public const MAX_DRAFT_STEPS = 6;
    public const MAX_DESCRIPTION = 2000;

    /**
     * @param array[] $steps The steps in their source language
     */
    public static function translate(array $steps, string $from, string $to): string {
        $payload = array_map(static function (array $step): array {
            $item = ['id' => $step['id'], 'title' => (string)($step['title'] ?? ''), 'text' => (string)($step['text'] ?? '')];
            if (is_string($step['media']['alt'] ?? null) && $step['media']['alt'] !== '') {
                $item['alt'] = $step['media']['alt'];
            }
            return $item;
        }, array_values($steps));

        return <<<PROMPT
        You translate the steps of a guided tour in Nextcloud from {$from} to {$to}.

        Rules:
        - Translate the values of "title", "text" and "alt". Keep every "id" exactly as it is.
        - "text" is HTML. Keep every tag and attribute exactly as it is, and translate only the words between the tags.
        - Keep emoji where they are. Keep product names such as Nextcloud, Talk, Deck and Files as they are, unless {$to} uses another name for them in Nextcloud.
        - Keep the tone: short, friendly, addressing the reader directly.
        - Answer with the JSON array only, in the same order, without any explanation.

        The steps:
        PROMPT . "\n" . json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    /**
     * @param string $where What the tour is about: 'the app "Deck"', 'the
     *   page /settings/user', or 'Nextcloud as a whole'
     */
    public static function draft(string $where, string $description, string $language): string {
        $description = trim(mb_substr($description, 0, self::MAX_DESCRIPTION));
        $max = self::MAX_DRAFT_STEPS;
        return <<<PROMPT
        Write a short guided tour in Nextcloud about {$where}, in {$language}.

        What the tour should explain:
        {$description}

        Rules:
        - 3 to {$max} steps. The first step says what the tour shows; the last one rounds it off.
        - Each step has a "title" of at most 60 characters that starts with one fitting emoji, and a "text" of one or two short paragraphs as HTML, using only <p>, <strong>, <em>, <ul> and <li>.
        - Address the reader directly, in plain words, without marketing language.
        - Only mention buttons and features you are sure exist in Nextcloud.
        - Answer with a JSON array of objects with "title" and "text" only, without any explanation.
        PROMPT;
    }

    /**
     * Whether an answer stopped before its end: empty (a model that thinks
     * first can spend the whole limit on that), or an array of steps that
     * never closes. That is a provider's limit on the length of an answer,
     * such as the OpenAI integration's default of 1000 tokens, which is too
     * little for a whole tour. The admin can raise it; IntroVox cannot.
     */
    public static function cutOff(string $answer): bool {
        $answer = trim($answer);
        if ($answer === '') {
            return true;
        }
        if (!preg_match('/\[\s*\{/', $answer)) {
            return false;
        }
        // Nothing closes the array after the last step that was finished
        $lastBrace = strrpos($answer, '}');
        return !str_contains(substr($answer, $lastBrace === false ? 0 : $lastBrace), ']');
    }

    /**
     * The JSON array in a model's answer. Models wrap it in a code fence or
     * a sentence now and then; anything else around it is ignored.
     *
     * @return array[]|null Null when there is no array of objects in it
     */
    public static function readSteps(string $answer): ?array {
        // The array of objects, not a bracket in a sentence before it
        if (!preg_match('/\[\s*\{/', $answer, $match, PREG_OFFSET_CAPTURE)) {
            return null;
        }
        $start = $match[0][1];
        $end = strrpos($answer, ']');
        if ($end === false || $end < $start) {
            return null;
        }
        $decoded = json_decode(substr($answer, $start, $end - $start + 1), true);
        if (!is_array($decoded) || $decoded === [] || !array_is_list($decoded)) {
            return null;
        }
        foreach ($decoded as $item) {
            if (!is_array($item) || !is_string($item['title'] ?? null) || !is_string($item['text'] ?? null)) {
                return null;
            }
        }
        return $decoded;
    }

    /**
     * The translated words in the original steps: everything else (element,
     * page, media, groups) stays as it was
     *
     * @param array[] $original The steps that were sent
     * @param array[] $translated readSteps() of the answer
     * @return array[]|null Null when a step is missing or not translated
     */
    public static function applyTranslation(array $original, array $translated): ?array {
        $byId = [];
        foreach ($translated as $item) {
            if (is_string($item['id'] ?? null)) {
                $byId[$item['id']] = $item;
            }
        }
        $result = [];
        foreach ($original as $step) {
            $item = $byId[$step['id']] ?? null;
            if ($item === null || trim($item['title']) === '') {
                return null;
            }
            $step['title'] = $item['title'];
            $step['text'] = $item['text'];
            if (isset($step['media']) && is_string($item['alt'] ?? null) && ($step['media']['alt'] ?? '') !== '') {
                $step['media']['alt'] = $item['alt'];
            }
            $result[] = $step;
        }
        return $result;
    }

    /**
     * Steps of a draft, ready for the editor: centered (the admin picks
     * the elements), on the tour's page, switched on, for everyone
     *
     * @param array[] $drafted readSteps() of the answer
     * @param string $page The tour's page, '' for none
     * @return array[]
     */
    public static function draftSteps(array $drafted, string $page, string $idPrefix): array {
        $steps = [];
        foreach (array_slice($drafted, 0, self::MAX_DRAFT_STEPS) as $index => $item) {
            $steps[] = [
                'id' => $idPrefix . '-' . ($index + 1),
                'title' => trim($item['title']),
                'text' => $item['text'],
                'attachTo' => '',
                'position' => 'right',
                'enabled' => true,
                'visibleToGroups' => [],
            ] + ($page !== '' ? ['page' => $page] : []);
        }
        return $steps;
    }
}
