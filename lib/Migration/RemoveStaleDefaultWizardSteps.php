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
                $this->config->deleteAppValue(self::APP_NAME, $key);
                $removed++;
                $output->info(sprintf('Removed stale default override "%s"', $key));
            }
        }

        if ($removed === 0) {
            $output->info('No stale default wizard step overrides found');
        } else {
            $output->info(sprintf('Removed %d stale default wizard step override(s); they now follow the built-in NC 34 defaults', $removed));
        }
    }

    /**
     * A row is an untouched pre-1.7.4 default when it still carries the old
     * Calendar step AND the old search selector. A real admin edit would not
     * keep both of these exact legacy selectors.
     *
     * @param array<int, array<string, mixed>> $steps
     */
    private function isUntouchedLegacyDefault(array $steps): bool {
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
