<?php
namespace OCA\IntroVox\Service;

class DefaultStepsService {
    /**
     * Get default wizard steps
     */
    public static function getDefaultSteps(): array {
        return [
            [
                'id' => 'welcome',
                'title' => '👋 Welkom bij Nextcloud',
                'text' => '<p>Leuk dat je er bent! Deze korte tour helpt je om snel op weg te gaan.</p><p>Je kunt op elk moment deze wizard afsluiten en later weer openen.</p>',
                'attachTo' => '',
                'position' => 'right'
            ],
            [
                'id' => 'files',
                'title' => '📁 Bestanden',
                'text' => '<p>Dit is je hoofdmenu. Klik hier om al je bestanden te bekijken en te beheren.</p><p>Je kunt bestanden uploaden, mappen maken en delen met anderen.</p>',
                'attachTo' => '[data-id="files"], #appmenu li[data-id="files"], a[href*="/apps/files"]',
                'position' => 'right'
            ],
            [
                'id' => 'calendar',
                'title' => '📅 Agenda',
                'text' => '<p>Hier vind je je persoonlijke agenda.</p><p>Plan afspraken, stel herinneringen in en deel je agenda met anderen.</p><p>Je kunt je agenda ook synchroniseren met je telefoon of andere apparaten.</p>',
                'attachTo' => '[data-id="calendar"], #appmenu li[data-id="calendar"], a[href*="/apps/calendar"]',
                'position' => 'right'
            ],
            [
                'id' => 'search',
                'title' => '🔍 Zoeken',
                'text' => '<p>Met de zoekbalk kun je snel bestanden, contacten en meer vinden.</p><p>Typ gewoon wat je zoekt en druk op Enter.</p><p>Je kunt ook filteren op bestandstype of datum.</p>',
                'attachTo' => 'button[aria-label="Unified search"], .header-menu__trigger, .unified-search__trigger',
                'position' => 'bottom'
            ],
            [
                'id' => 'intro',
                'title' => '🎯 Aan de slag',
                'text' => '<p><strong>Nextcloud is jouw persoonlijke cloudopslag!</strong></p><p>Hier kun je:</p><ul><li>📁 Bestanden uploaden, delen en samenwerken</li><li>📅 Je agenda beheren</li><li>✉️ E-mail versturen en ontvangen</li><li>👥 Contacten bijhouden</li></ul>',
                'attachTo' => '',
                'position' => 'right'
            ],
            [
                'id' => 'features',
                'title' => '✨ Belangrijke functies',
                'text' => '<p><strong>Navigatie:</strong></p><ul><li>Gebruik het <strong>hoofdmenu</strong> (links) om tussen apps te schakelen</li><li>Klik op je <strong>gebruikersnaam</strong> (rechts boven) voor instellingen</li><li>Gebruik de <strong>zoekbalk</strong> om snel bestanden te vinden</li></ul>',
                'attachTo' => '',
                'position' => 'right'
            ],
            [
                'id' => 'tips',
                'title' => '💡 Handige tips',
                'text' => '<p><strong>Wist je dat:</strong></p><ul><li>Je bestanden kunt uploaden door ze naar je browser te slepen</li><li>Je bestanden direct kunt delen met een link</li><li>Je Nextcloud ook als app op je telefoon kunt gebruiken</li><li>Al je data privé en veilig is opgeslagen</li></ul>',
                'attachTo' => '',
                'position' => 'right'
            ],
            [
                'id' => 'complete',
                'title' => '🎉 Klaar!',
                'text' => '<p>Je bent helemaal klaar om te beginnen!</p><p>Als je deze tour nog een keer wilt zien, kun je die vinden in de help sectie.</p><p>Veel plezier met Nextcloud!</p>',
                'attachTo' => '',
                'position' => 'right'
            ]
        ];
    }
}
