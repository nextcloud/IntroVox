<?php
script('introvox', 'personal');
style('introvox', 'personal');
?>

<script>
// Pass wizard status to JavaScript
window.introvoxPersonalSettings = {
    wizardEnabled: <?php p($_['wizardEnabled'] ? 'true' : 'false'); ?>,
    wizardGloballyEnabled: <?php p($_['wizardGloballyEnabled'] ? 'true' : 'false'); ?>,
    userLanguageEnabled: <?php p($_['userLanguageEnabled'] ? 'true' : 'false'); ?>
};
</script>

<div class="section" id="introvox-personal-settings">
    <h2><?php p($l->t('IntroVox')); ?></h2>

    <?php if ($_['wizardEnabled']): ?>
        <p class="settings-hint">
            <?php p($l->t('Manage your introduction tour preferences.')); ?>
        </p>

        <div class="personal-setting-row">
            <input type="checkbox" id="disable-wizard-checkbox" class="checkbox">
            <label for="disable-wizard-checkbox">
                <?php p($l->t('Permanently disable the introduction tour')); ?>
            </label>
        </div>
        <p class="settings-hint warning-hint">
            <?php p($l->t('⚠️ When enabled, you will never see the introduction tour again, even after app updates. Your administrator can override this setting by using the "Show wizard to all users" button in the admin settings, which will reset your preference and show the wizard again.')); ?>
        </p>

        <div class="button-row">
            <button id="restart-wizard-btn" class="button">
                🔄 <?php p($l->t('Restart tour now')); ?>
            </button>
            <button id="save-settings-btn" class="button primary">
                💾 <?php p($l->t('Save settings')); ?>
            </button>
        </div>
    <?php elseif (!$_['wizardGloballyEnabled']): ?>
        <p class="settings-hint">
            <?php p($l->t('The introduction tour is currently disabled by your administrator.')); ?>
        </p>
        <p class="settings-hint">
            <?php p($l->t('Contact your administrator if you would like to see the guided tour.')); ?>
        </p>
    <?php elseif (!$_['userLanguageEnabled']): ?>
        <p class="settings-hint">
            <?php p($l->t('The introduction tour is not available in your language.')); ?>
        </p>
        <p class="settings-hint">
            <?php p($l->t('Contact your administrator if you would like to have the tour available in your language.')); ?>
        </p>
    <?php endif; ?>
</div>
