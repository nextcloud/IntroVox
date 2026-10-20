<?php

declare(strict_types=1);

namespace OCA\IntroVox\Service;

use OCP\Config\IUserConfig;

/**
 * The numbers per tour on the Statistics pane: how many people started,
 * finished and skipped it, and how far they got, step by step. Counted from
 * each user's own preferences, so they are unique people, not clicks. Only
 * totals leave this class; nothing here goes into telemetry.
 */
class TourStatistics {
    public function __construct(
        private TourRepository $tours,
        private IUserConfig $userConfig,
    ) {
    }

    /**
     * @param string $language The language whose steps the funnel follows;
     *   the tour's main language (the welcome tour: English) when empty or
     *   unknown
     * @return array{started: int, completed: int, skipped: int, language: string,
     *   languages: string[], steps: array<int, array{id: string, title: string, enabled: bool, reached: int}>,
     *   other: int, counted: int}
     */
    public function forTour(array $tour, string $language): array {
        $id = $tour['id'];
        $welcome = $id === TourValidator::WELCOME;
        // English is there for the welcome tour on every install: its defaults
        $languages = $this->tours->languages($id);
        if ($welcome && !in_array('en', $languages, true)) {
            $languages = ['en', ...$languages];
            sort($languages);
        }
        if (!in_array($language, $languages, true)) {
            $language = $welcome ? 'en' : (string)$tour['mainLanguage'];
        }

        // The welcome tour keeps the keys it always had
        $keys = $welcome
            ? ['started' => 'wizard_started', 'completed' => 'wizard_completed', 'skipped' => 'wizard_skipped']
            : ['started' => TourValidator::stateKey($id, 'seen'), 'completed' => TourValidator::stateKey($id, 'completed'), 'skipped' => TourValidator::stateKey($id, 'skipped')];

        $steps = array_values(array_filter($this->steps($tour, $language), static fn ($step): bool => is_array($step) && is_string($step['id'] ?? null)));
        $funnel = TourStats::funnel(
            array_column($steps, 'id'),
            array_values($this->userConfig->getValuesByUsers('introvox', TourValidator::stateKey($id, 'reached'))),
        );

        return [
            'started' => $this->count($keys['started']),
            'completed' => $this->count($keys['completed']),
            'skipped' => $this->count($keys['skipped']),
            'language' => $language,
            'languages' => $languages,
            'steps' => array_map(static fn (array $step): array => [
                'id' => $step['id'],
                'title' => is_string($step['title'] ?? null) ? $step['title'] : '',
                'enabled' => StepValidator::isEnabled($step),
                'reached' => $funnel['reached'][$step['id']] ?? 0,
            ], $steps),
            'other' => $funnel['other'],
            'counted' => $funnel['total'],
        ];
    }

    private function count(string $key): int {
        return count(array_filter(
            $this->userConfig->getValuesByUsers('introvox', $key),
            static fn ($value): bool => $value !== '' && $value !== null,
        ));
    }

    /**
     * The steps as users get them in one language (the welcome and built-in
     * tours: the admin's own, or else the translated defaults)
     */
    private function steps(array $tour, string $language): array {
        return $this->tours->stepsOrDefaults($tour['id'], $language) ?? [];
    }
}
