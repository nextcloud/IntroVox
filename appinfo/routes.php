<?php
return [
    'routes' => [
        // Admin API routes
        ['name' => 'admin#getSteps', 'url' => '/admin/steps', 'verb' => 'GET'],
        ['name' => 'admin#saveSteps', 'url' => '/admin/steps', 'verb' => 'POST'],
        ['name' => 'admin#addStep', 'url' => '/admin/step', 'verb' => 'POST'],
        ['name' => 'admin#updateStep', 'url' => '/admin/step/{id}', 'verb' => 'PUT'],
        ['name' => 'admin#deleteStep', 'url' => '/admin/step/{id}', 'verb' => 'DELETE'],
        ['name' => 'admin#resetToDefault', 'url' => '/admin/reset', 'verb' => 'POST'],
        ['name' => 'admin#exportSteps', 'url' => '/admin/export', 'verb' => 'POST'],
        ['name' => 'admin#importSteps', 'url' => '/admin/import', 'verb' => 'POST'],
        ['name' => 'admin#getSettings', 'url' => '/admin/settings', 'verb' => 'GET'],
        ['name' => 'admin#saveSettings', 'url' => '/admin/settings', 'verb' => 'POST'],
        ['name' => 'admin#getAvailableLanguagesWithMetadata', 'url' => '/admin/languages', 'verb' => 'GET'],
        ['name' => 'admin#getGroups', 'url' => '/admin/groups', 'verb' => 'GET'],

        // Personal API routes
        ['name' => 'personal#getSettings', 'url' => '/personal/settings', 'verb' => 'GET'],
        ['name' => 'personal#saveSettings', 'url' => '/personal/settings', 'verb' => 'POST'],

        // Public API routes
        ['name' => 'api#getWizardSteps', 'url' => '/api/steps', 'verb' => 'GET'],
    ]
];
