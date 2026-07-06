<?php

declare(strict_types=1);

namespace OCA\IntroVox\Migration;

use OCP\IConfig;
use OCP\Migration\IOutput;
use OCP\Migration\IRepairStep;

/**
 * Versions before 1.7.4 auto-persisted the bundled default tour into
 * `wizard_steps_<lang>` appconfig rows the first time the admin opened the
 * Steps tab. Those rows are byte-identical to the old defaults but, once
 * stored, shadow the new NC 34 defaults served by DefaultStepsService — so
 * upgraded instances keep showing the old Calendar step, the old Files target
 * and the broken `.unified-search__trigger` search selector.
 *
 * This repair step deletes only those untouched auto-saved defaults, detected
 * by the fingerprint of the pre-1.7.4 default set (a `calendar` step plus the
 * old search selector — selectors that live outside the translations, so this
 * is language independent). Rows that a real admin edited keep a different
 * shape and are left untouched.
 */
class RemoveStaleDefaultWizardSteps implements IRepairStep {
    private const APP_NAME = 'introvox';

    /**
     * The exact, ordered step-id fingerprint of the pre-1.7.4 default tour
     * (from DefaultStepsService before commit 9503a3a). A config only qualifies
     * as an untouched auto-saved default when its step ids match this list
     * exactly — same ids, same order, nothing added or removed. This is what
     * protects admins who extended the tour with a custom step (see #21): any
     * extra/missing/renamed/reordered step breaks the match and is left alone.
     */
    private const LEGACY_STEP_IDS = ['welcome', 'files', 'calendar', 'search', 'intro', 'features', 'tips', 'complete'];

    public function __construct(
        private IConfig $config,
    ) {
    }

    public function getName(): string {
        return 'Remove stale auto-saved default wizard steps (pre-1.7.4)';
    }

    public function run(IOutput $output): void {
        $keys = $this->config->getAppKeys(self::APP_NAME);
        $removed = 0;

        foreach ($keys as $key) {
            if (!str_starts_with($key, 'wizard_steps_')) {
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

            if ($this->isUntouchedLegacyDefault($steps)) {
                // Keep a recoverable copy before deleting, in case the fingerprint
                // ever misfires on a config we shouldn't have touched (see #21).
                $backupKey = 'stale_wizard_backup_' . $key;
                $this->config->setAppValue(self::APP_NAME, $backupKey, $json);
                $this->config->deleteAppValue(self::APP_NAME, $key);
                $removed++;
                $output->info(sprintf('Removed stale default override "%s" (backup saved as "%s")', $key, $backupKey));
            }
        }

        if ($removed === 0) {
            $output->info('No stale default wizard step overrides found');
        } else {
            $output->info(sprintf('Removed %d stale default wizard step override(s); they now follow the built-in NC 34 defaults', $removed));
        }
    }

    /**
     * A row is an untouched pre-1.7.4 default only when its step ids match the
     * legacy fingerprint EXACTLY (same ids, same order, nothing extra) AND the
     * two legacy selectors are still present. The exact-set check is what makes
     * this safe: an admin who added, removed, renamed or reordered a step no
     * longer matches and is left untouched — fixing the data-loss bug in #21
     * where a mere "presence of calendar + search" check deleted extended tours.
     *
     * @param array<int, array<string, mixed>> $steps
     */
    private function isUntouchedLegacyDefault(array $steps): bool {
        // Exact ordered step-id set — one extra/missing/renamed/reordered step
        // breaks the match. array_column drops non-array entries, so a malformed
        // row simply yields a mismatch rather than a false positive.
        if (array_column($steps, 'id') !== self::LEGACY_STEP_IDS) {
            return false;
        }

        $hasLegacyCalendar = false;
        $hasLegacySearch = false;

        foreach ($steps as $step) {
            $id = $step['id'] ?? '';
            $attachTo = (string)($step['attachTo'] ?? '');

            if ($id === 'calendar' && str_contains($attachTo, '[data-id="calendar"]')) {
                $hasLegacyCalendar = true;
            }
            if ($id === 'search' && str_starts_with($attachTo, '.unified-search__trigger')) {
                $hasLegacySearch = true;
            }
        }

        return $hasLegacyCalendar && $hasLegacySearch;
    }
}
