<?php

declare(strict_types=1);

namespace OCA\IntroVox\Migration;

use OCP\IConfig;
use OCP\Migration\IOutput;
use OCP\Migration\IRepairStep;

/**
 * IntroVox up to and including 1.6.x ran admin-authored wizard step title/text
 * through `\OCP\Util::sanitizeHTML()` on save, which HTML-escapes everything —
 * so `<p>…</p>` was stored as `&lt;p&gt;…&lt;/p&gt;`. Since 1.7.0 the text is
 * stored as-is (admins author HTML that Shepherd.js renders), but instances
 * that saved steps under the old behaviour keep the escaped copy and show the
 * literal `<p>` tags in the tour until every step is re-saved by hand.
 *
 * This repair step heals those stored rows once: it un-escapes only values that
 * still carry the pre-1.7.0 fingerprint (escaped angle brackets `&lt;`/`&gt;`
 * and NO raw `<`/`>`), so correctly-stored 1.7.x HTML is never touched and the
 * step is idempotent (after un-escaping, a raw `<` is present so it won't match
 * again). A recoverable copy is saved to `legacy_html_backup_<key>` first.
 */
class UnescapeLegacyWizardStepHtml implements IRepairStep {
    private const APP_NAME = 'introvox';

    public function __construct(
        private IConfig $config,
    ) {
    }

    public function getName(): string {
        return 'Un-escape pre-1.7.0 HTML-escaped wizard step copy';
    }

    public function run(IOutput $output): void {
        $keys = $this->config->getAppKeys(self::APP_NAME);
        $changedKeys = 0;
        $changedFields = 0;

        foreach ($keys as $key) {
            // Both the per-language overrides (wizard_steps_<lang>) and the
            // legacy global key (wizard_steps) can carry escaped copy.
            if ($key !== 'wizard_steps' && !str_starts_with($key, 'wizard_steps_')) {
                continue;
            }

            $json = $this->config->getAppValue(self::APP_NAME, $key, '');
            if ($json === '') {
                continue;
            }

            $steps = json_decode($json, true);
            if (!is_array($steps)) {
                continue;
            }

            $fieldsFixed = 0;
            foreach ($steps as &$step) {
                if (!is_array($step)) {
                    continue;
                }
                foreach (['title', 'text'] as $field) {
                    if (isset($step[$field]) && is_string($step[$field])) {
                        $fixed = $this->unescapeLegacyHtml($step[$field]);
                        if ($fixed !== $step[$field]) {
                            $step[$field] = $fixed;
                            $fieldsFixed++;
                        }
                    }
                }
            }
            unset($step);

            if ($fieldsFixed === 0) {
                continue;
            }

            // Keep a recoverable copy of the original before rewriting.
            $this->config->setAppValue(self::APP_NAME, 'legacy_html_backup_' . $key, $json);
            $this->config->setAppValue(self::APP_NAME, $key, json_encode($steps));
            $changedKeys++;
            $changedFields += $fieldsFixed;
            $output->info(sprintf('Un-escaped %d field(s) in "%s" (backup saved as "legacy_html_backup_%s")', $fieldsFixed, $key, $key));
        }

        if ($changedKeys === 0) {
            $output->info('No pre-1.7.0 HTML-escaped wizard step copy found');
        } else {
            $output->info(sprintf('Un-escaped %d field(s) across %d wizard step override(s)', $changedFields, $changedKeys));
        }
    }

    /**
     * Un-escape a value only when it carries the pre-1.7.0 fingerprint: it
     * contains escaped angle brackets AND no raw `<`/`>`. Correctly-stored
     * 1.7.x HTML already has raw tags and is returned unchanged, which also
     * makes this idempotent.
     */
    private function unescapeLegacyHtml(string $s): string {
        $hasEscapedTag = str_contains($s, '&lt;') || str_contains($s, '&gt;');
        $hasRawTag = str_contains($s, '<') || str_contains($s, '>');
        if (!$hasEscapedTag || $hasRawTag) {
            return $s;
        }
        return htmlspecialchars_decode($s, ENT_QUOTES);
    }
}
