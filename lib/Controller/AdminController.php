<?php
namespace OCA\IntroVox\Controller;

use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\JSONResponse;
use OCP\IConfig;
use OCP\IRequest;
use OCP\IL10N;

class AdminController extends Controller {
    protected $config;
    protected $appName;
    protected $l10n;

    public function __construct(
        $appName,
        IRequest $request,
        IConfig $config,
        IL10N $l10n
    ) {
        parent::__construct($appName, $request);
        $this->config = $config;
        $this->appName = $appName;
        $this->l10n = $l10n;
    }

    private function getDefaultSteps(): array {
        return [
            ['id' => 'welcome', 'title' => $this->l10n->t('step_welcome_title'), 'text' => $this->l10n->t('step_welcome_text'), 'attachTo' => '', 'position' => 'right'],
            ['id' => 'files', 'title' => $this->l10n->t('step_files_title'), 'text' => $this->l10n->t('step_files_text'), 'attachTo' => 'a[href*="/apps/files/"]', 'position' => 'right'],
            ['id' => 'calendar', 'title' => $this->l10n->t('step_calendar_title'), 'text' => $this->l10n->t('step_calendar_text'), 'attachTo' => 'a[href*="/apps/calendar/"]', 'position' => 'right'],
            ['id' => 'search', 'title' => $this->l10n->t('step_search_title'), 'text' => $this->l10n->t('step_search_text'), 'attachTo' => 'button[aria-label="Unified search"]', 'position' => 'bottom'],
            ['id' => 'intro', 'title' => $this->l10n->t('step_intro_title'), 'text' => $this->l10n->t('step_intro_text'), 'attachTo' => '', 'position' => 'right'],
            ['id' => 'features', 'title' => $this->l10n->t('step_features_title'), 'text' => $this->l10n->t('step_features_text'), 'attachTo' => '', 'position' => 'right'],
            ['id' => 'tips', 'title' => $this->l10n->t('step_tips_title'), 'text' => $this->l10n->t('step_tips_text'), 'attachTo' => '', 'position' => 'right'],
            ['id' => 'complete', 'title' => $this->l10n->t('step_complete_title'), 'text' => $this->l10n->t('step_complete_text'), 'attachTo' => '', 'position' => 'right']
        ];
    }

    /**
     * Get all wizard steps
     * @NoCSRFRequired
     */
    public function getSteps(): JSONResponse {
        $stepsJson = $this->config->getAppValue($this->appName, 'wizard_steps', '');

        if (empty($stepsJson)) {
            $steps = $this->getDefaultSteps();
            // Save default steps to database so they can be reordered
            $this->config->setAppValue($this->appName, 'wizard_steps', json_encode($steps));
        } else {
            $steps = json_decode($stepsJson, true);
        }

        return new JSONResponse([
            'success' => true,
            'steps' => $steps
        ]);
    }

    /**
     * Save wizard steps
     * @param array $steps
     * @NoCSRFRequired
     */
    public function saveSteps(array $steps): JSONResponse {
        try {
            // Validate steps
            foreach ($steps as $step) {
                if (!isset($step['id']) || !isset($step['title'])) {
                    return new JSONResponse([
                        'success' => false,
                        'error' => 'Invalid step data: id and title are required'
                    ], 400);
                }
            }

            $stepsJson = json_encode($steps);
            $this->config->setAppValue($this->appName, 'wizard_steps', $stepsJson);

            return new JSONResponse([
                'success' => true,
                'message' => 'Steps saved successfully'
            ]);
        } catch (\Exception $e) {
            return new JSONResponse([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Add a new step
     * @param array $step
     */
    public function addStep(array $step): JSONResponse {
        try {
            $stepsJson = $this->config->getAppValue($this->appName, 'wizard_steps', '[]');
            $steps = json_decode($stepsJson, true);

            // Generate unique ID
            $step['id'] = 'custom_' . uniqid();

            $steps[] = $step;

            $stepsJson = json_encode($steps);
            $this->config->setAppValue($this->appName, 'wizard_steps', $stepsJson);

            return new JSONResponse([
                'success' => true,
                'step' => $step
            ]);
        } catch (\Exception $e) {
            return new JSONResponse([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update an existing step
     * @param string $id
     * @param array $step
     */
    public function updateStep(string $id, array $step): JSONResponse {
        try {
            $stepsJson = $this->config->getAppValue($this->appName, 'wizard_steps', '[]');
            $steps = json_decode($stepsJson, true);

            $found = false;
            foreach ($steps as $key => $existingStep) {
                if ($existingStep['id'] === $id) {
                    // Keep the original ID
                    $step['id'] = $id;
                    $steps[$key] = $step;
                    $found = true;
                    break;
                }
            }

            if (!$found) {
                return new JSONResponse([
                    'success' => false,
                    'error' => 'Step not found'
                ], 404);
            }

            $stepsJson = json_encode($steps);
            $this->config->setAppValue($this->appName, 'wizard_steps', $stepsJson);

            return new JSONResponse([
                'success' => true,
                'step' => $step
            ]);
        } catch (\Exception $e) {
            return new JSONResponse([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete a step
     * @param string $id
     */
    public function deleteStep(string $id): JSONResponse {
        try {
            $stepsJson = $this->config->getAppValue($this->appName, 'wizard_steps', '[]');
            $steps = json_decode($stepsJson, true);

            $steps = array_filter($steps, function($step) use ($id) {
                return $step['id'] !== $id;
            });

            // Re-index array
            $steps = array_values($steps);

            $stepsJson = json_encode($steps);
            $this->config->setAppValue($this->appName, 'wizard_steps', $stepsJson);

            return new JSONResponse([
                'success' => true,
                'message' => 'Step deleted successfully'
            ]);
        } catch (\Exception $e) {
            return new JSONResponse([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reset to default steps
     * @NoCSRFRequired
     */
    public function resetToDefault(): JSONResponse {
        try {
            $this->config->deleteAppValue($this->appName, 'wizard_steps');

            return new JSONResponse([
                'success' => true,
                'message' => 'Steps reset to default'
            ]);
        } catch (\Exception $e) {
            return new JSONResponse([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get global settings
     * @NoCSRFRequired
     */
    public function getSettings(): JSONResponse {
        try {
            $enabled = $this->config->getAppValue($this->appName, 'wizard_enabled', 'true');

            return new JSONResponse([
                'success' => true,
                'enabled' => $enabled === 'true'
            ]);
        } catch (\Exception $e) {
            return new JSONResponse([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Save global settings
     * @NoCSRFRequired
     */
    public function saveSettings(): JSONResponse {
        try {
            // Get enabled from request body
            $data = $this->request->getParams();
            $enabled = isset($data['enabled']) ? $data['enabled'] : true;

            // Convert to boolean if it's a string
            if (is_string($enabled)) {
                $enabled = $enabled === 'true' || $enabled === '1';
            }

            $this->config->setAppValue($this->appName, 'wizard_enabled', $enabled ? 'true' : 'false');

            return new JSONResponse([
                'success' => true,
                'message' => 'Settings saved successfully',
                'enabled' => $enabled
            ]);
        } catch (\Exception $e) {
            return new JSONResponse([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
