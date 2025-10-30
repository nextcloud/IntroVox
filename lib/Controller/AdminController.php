<?php
namespace OCA\IntroVox\Controller;

use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\JSONResponse;
use OCP\IConfig;
use OCP\IRequest;

class AdminController extends Controller {
    protected $config;
    protected $appName;

    public function __construct(
        $appName,
        IRequest $request,
        IConfig $config
    ) {
        parent::__construct($appName, $request);
        $this->config = $config;
        $this->appName = $appName;
    }

    private function getDefaultSteps(): array {
        return [
            ['id' => 'welcome', 'title' => '👋 Welkom bij Nextcloud', 'text' => '<p>Leuk dat je er bent! Deze korte tour helpt je om snel op weg te gaan.</p><p>Je kunt op elk moment deze wizard afsluiten en later weer openen.</p>', 'attachTo' => '', 'position' => 'right'],
            ['id' => 'files', 'title' => '📁 Bestanden', 'text' => '<p>Dit is je hoofdmenu. Klik hier om al je bestanden te bekijken en te beheren.</p><p>Je kunt bestanden uploaden, mappen maken en delen met anderen.</p>', 'attachTo' => '[data-id="files"]', 'position' => 'right'],
            ['id' => 'calendar', 'title' => '📅 Agenda', 'text' => '<p>Hier vind je je persoonlijke agenda.</p><p>Plan afspraken, stel herinneringen in en deel je agenda met anderen.</p>', 'attachTo' => '[data-id="calendar"]', 'position' => 'right'],
            ['id' => 'search', 'title' => '🔍 Zoeken', 'text' => '<p>Met de zoekbalk kun je snel bestanden, contacten en meer vinden.</p><p>Typ gewoon wat je zoekt en druk op Enter.</p>', 'attachTo' => 'button[aria-label="Unified search"]', 'position' => 'bottom'],
            ['id' => 'intro', 'title' => '🎯 Aan de slag', 'text' => '<p><strong>Nextcloud is jouw persoonlijke cloudopslag!</strong></p><p>Hier kun je:</p><ul><li>📁 Bestanden uploaden, delen en samenwerken</li><li>📅 Je agenda beheren</li><li>✉️ E-mail versturen en ontvangen</li><li>👥 Contacten bijhouden</li></ul>', 'attachTo' => '', 'position' => 'right'],
            ['id' => 'features', 'title' => '✨ Belangrijke functies', 'text' => '<p><strong>Navigatie:</strong></p><ul><li>Gebruik het <strong>hoofdmenu</strong> (links) om tussen apps te schakelen</li><li>Klik op je <strong>gebruikersnaam</strong> (rechts boven) voor instellingen</li><li>Gebruik de <strong>zoekbalk</strong> om snel bestanden te vinden</li></ul>', 'attachTo' => '', 'position' => 'right'],
            ['id' => 'tips', 'title' => '💡 Handige tips', 'text' => '<p><strong>Wist je dat:</strong></p><ul><li>Je bestanden kunt uploaden door ze naar je browser te slepen</li><li>Je bestanden direct kunt delen met een link</li><li>Je Nextcloud ook als app op je telefoon kunt gebruiken</li><li>Al je data privé en veilig is opgeslagen</li></ul>', 'attachTo' => '', 'position' => 'right'],
            ['id' => 'complete', 'title' => '🎉 Klaar!', 'text' => '<p>Je bent helemaal klaar om te beginnen!</p><p>Als je deze tour nog een keer wilt zien, kun je die vinden in de help sectie.</p><p>Veel plezier met Nextcloud!</p>', 'attachTo' => '', 'position' => 'right']
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
