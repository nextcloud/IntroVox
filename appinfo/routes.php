<?php
return [
    'routes' => [
        // Admin API routes
        ['name' => 'admin#getSteps', 'url' => '/admin/steps', 'verb' => 'GET'],
        ['name' => 'admin#saveSteps', 'url' => '/admin/steps', 'verb' => 'POST'],
        ['name' => 'admin#resetToDefault', 'url' => '/admin/reset', 'verb' => 'POST'],
        ['name' => 'admin#exportSteps', 'url' => '/admin/export', 'verb' => 'POST'],
        ['name' => 'admin#importSteps', 'url' => '/admin/import', 'verb' => 'POST'],
        ['name' => 'admin#getSettings', 'url' => '/admin/settings', 'verb' => 'GET'],
        ['name' => 'admin#saveSettings', 'url' => '/admin/settings', 'verb' => 'POST'],
        ['name' => 'admin#getAvailableLanguagesWithMetadata', 'url' => '/admin/languages', 'verb' => 'GET'],
        ['name' => 'admin#listOverrides', 'url' => '/admin/overrides', 'verb' => 'GET'],
        ['name' => 'admin#getGroups', 'url' => '/admin/groups', 'verb' => 'GET'],

        // Admin Statistics/Telemetry API routes
        ['name' => 'admin#getStatistics', 'url' => '/admin/statistics', 'verb' => 'GET'],
        ['name' => 'admin#toggleTelemetry', 'url' => '/admin/telemetry', 'verb' => 'POST'],
        ['name' => 'admin#sendTelemetryNow', 'url' => '/admin/telemetry/send', 'verb' => 'POST'],
        ['name' => 'admin#markTelemetryAsked', 'url' => '/admin/telemetry/asked', 'verb' => 'POST'],
        ['name' => 'admin#markIntroDone', 'url' => '/admin/intro/done', 'verb' => 'POST'],

        // Tours: the welcome tour and tours that start in an app or on a page
        ['name' => 'tours#index', 'url' => '/admin/tours', 'verb' => 'GET'],
        ['name' => 'tours#create', 'url' => '/admin/tours', 'verb' => 'POST'],
        ['name' => 'tours#update', 'url' => '/admin/tours/{id}', 'verb' => 'PUT',
            'requirements' => ['id' => '[a-z0-9][a-z0-9-]{0,31}']],
        ['name' => 'tours#destroy', 'url' => '/admin/tours/{id}', 'verb' => 'DELETE',
            'requirements' => ['id' => '[a-z0-9][a-z0-9-]{0,31}']],
        ['name' => 'tours#reshow', 'url' => '/admin/tours/{id}/reshow', 'verb' => 'POST',
            'requirements' => ['id' => '[a-z0-9][a-z0-9-]{0,31}']],
        ['name' => 'tours#statistics', 'url' => '/admin/tours/{id}/statistics', 'verb' => 'GET',
            'requirements' => ['id' => '[a-z0-9][a-z0-9-]{0,31}']],
        ['name' => 'tours#export', 'url' => '/admin/tours/{id}/export', 'verb' => 'GET',
            'requirements' => ['id' => '[a-z0-9][a-z0-9-]{0,31}']],
        ['name' => 'tours#import', 'url' => '/admin/tours/import', 'verb' => 'POST'],
        ['name' => 'tours#apps', 'url' => '/admin/apps', 'verb' => 'GET'],

        // The Nextcloud Assistant: translating a tour, drafting its steps
        ['name' => 'assistant#status', 'url' => '/admin/assistant', 'verb' => 'GET'],
        ['name' => 'assistant#translate', 'url' => '/admin/assistant/translate', 'verb' => 'POST'],
        ['name' => 'assistant#draft', 'url' => '/admin/assistant/draft', 'verb' => 'POST'],
        ['name' => 'assistant#result', 'url' => '/admin/assistant/tasks/{id}', 'verb' => 'GET',
            'requirements' => ['id' => '\\d+']],

        // Media in steps: adding it (admin), and serving it to users. media#show
        // has no request token (MediaController), as has link#open.
        ['name' => 'media_upload#upload', 'url' => '/admin/media', 'verb' => 'POST'],
        ['name' => 'media_upload#fromFiles', 'url' => '/admin/media/from-files', 'verb' => 'POST'],
        ['name' => 'media#show', 'url' => '/media/{file}', 'verb' => 'GET',
            'requirements' => ['file' => '[a-f0-9]{32}\.(png|jpg|gif|mp4|webm|vtt)']],

        // License API routes
        ['name' => 'license#getStats', 'url' => '/admin/license/stats', 'verb' => 'GET'],
        ['name' => 'license#saveSettings', 'url' => '/admin/license/settings', 'verb' => 'POST'],
        ['name' => 'license#validate', 'url' => '/admin/license/validate', 'verb' => 'POST'],
        ['name' => 'license#updateUsage', 'url' => '/admin/license/usage', 'verb' => 'POST'],

        // Personal API routes
        ['name' => 'personal#getSettings', 'url' => '/personal/settings', 'verb' => 'GET'],
        ['name' => 'personal#saveSettings', 'url' => '/personal/settings', 'verb' => 'POST'],

        // Public API routes
        ['name' => 'api#getWizardSteps', 'url' => '/api/steps', 'verb' => 'GET'],

        // Wizard tracking API routes
        ['name' => 'api#trackWizardStart', 'url' => '/api/wizard/start', 'verb' => 'POST'],
        ['name' => 'api#trackWizardComplete', 'url' => '/api/wizard/complete', 'verb' => 'POST'],
        ['name' => 'api#trackWizardSkip', 'url' => '/api/wizard/skip', 'verb' => 'POST'],
        ['name' => 'api#tourEvent', 'url' => '/api/tours/{id}/event', 'verb' => 'POST',
            'requirements' => ['id' => '[a-z0-9][a-z0-9-]{0,31}']],
        ['name' => 'api#tourReached', 'url' => '/api/tours/{id}/reached', 'verb' => 'POST',
            'requirements' => ['id' => '[a-z0-9][a-z0-9-]{0,31}']],
        // A tour's share link, through the login when need be (LinkController)
        ['name' => 'link#open', 'url' => '/tour/{id}', 'verb' => 'GET',
            'requirements' => ['id' => '[a-z0-9][a-z0-9-]{0,31}']],
        // An own task of the checklist on the Dashboard, opened from there
        ['name' => 'api#checklistOpened', 'url' => '/api/checklist/{id}', 'verb' => 'POST',
            'requirements' => ['id' => 'c-[a-z0-9]{8}']],
    ]
];
