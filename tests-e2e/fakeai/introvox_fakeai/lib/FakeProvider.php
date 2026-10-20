<?php
declare(strict_types=1);
namespace OCA\IntroVoxFakeAi;

use OCP\TaskProcessing\ISynchronousProvider;

/**
 * Answers like a model would, from the prompt alone:
 * - a translation: the same JSON with "[<code>] " before every title, text
 *   word and alt, in a code fence with a sentence around it
 * - a draft: three steps that quote the description
 * - a description with GARBAGE in it: an answer without JSON
 * - a description with FAIL in it: an exception (a failed task)
 */
class FakeProvider implements ISynchronousProvider {
    public function getId(): string { return 'introvox_fakeai-text2text'; }
    public function getName(): string { return 'IntroVox fake AI'; }
    public function getTaskTypeId(): string { return 'core:text2text'; }
    public function getExpectedRuntime(): int { return 3; }
    public function getOptionalInputShape(): array { return []; }
    public function getOptionalOutputShape(): array { return []; }
    public function getInputShapeEnumValues(): array { return []; }
    public function getInputShapeDefaults(): array { return []; }
    public function getOptionalInputShapeEnumValues(): array { return []; }
    public function getOptionalInputShapeDefaults(): array { return []; }
    public function getOutputShapeEnumValues(): array { return []; }
    public function getOptionalOutputShapeEnumValues(): array { return []; }

    public function process(?string $userId, array $input, callable $reportProgress): array {
        $prompt = (string)$input['input'];
        // Long enough for the dialog to show its progress
        sleep(3);
        if (str_contains($prompt, 'You translate the steps')) {
            preg_match('/ to [^\n]*\((\w+)\)\./', $prompt, $m);
            $code = $m[1] ?? '??';
            $steps = json_decode(substr($prompt, strpos($prompt, "The steps:\n") + 11), true);
            foreach ($steps as &$step) {
                $step['title'] = "[$code] " . $step['title'];
                $step['text'] = preg_replace('/>([^<>]+)</', ">[$code] $1<", $step['text']);
                if (isset($step['alt'])) {
                    $step['alt'] = "[$code] " . $step['alt'];
                }
            }
            return ['output' => "Here is the translation:\n```json\n" . json_encode($steps, JSON_UNESCAPED_UNICODE) . "\n```\nGood luck!"];
        }
        if (str_contains($prompt, 'FAIL')) {
            throw new \RuntimeException('The fake model failed on purpose');
        }
        if (str_contains($prompt, 'GARBAGE')) {
            return ['output' => 'Sorry, I would rather write a poem about boards.'];
        }
        preg_match("/What the tour should explain:\n(.*)\n\nRules:/s", $prompt, $m);
        $about = trim($m[1] ?? '');
        $steps = [
            ['title' => '👋 About ' . mb_substr($about, 0, 30), 'text' => '<p>This tour shows <strong>' . htmlspecialchars($about) . '</strong>.</p>'],
            ['title' => '📋 The list', 'text' => '<p>Everything is in the list.</p><ul><li>One</li><li>Two</li></ul>'],
            ['title' => '🎉 Done', 'text' => '<p>That is all.</p>', 'attachTo' => '#evil'],
        ];
        return ['output' => json_encode($steps, JSON_UNESCAPED_UNICODE)];
    }
}
