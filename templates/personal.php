<?php
script('introvox', 'personal');
style('introvox', 'personal');
?>

<div class="section" id="introvox-personal-settings">
    <h2><?php p($l->t('IntroVox')); ?></h2>

    <p class="settings-hint">
        <?php p($l->t('IntroVox helpt je om bekend te raken met Nextcloud met een interactieve tour.')); ?>
    </p>

    <div class="wizard-controls">
        <button id="restart-wizard-btn" class="button primary">
            🔄 <?php p($l->t('Tour opnieuw starten')); ?>
        </button>
        <p class="wizard-status">
            <span id="wizard-completed-status"></span>
        </p>
        <p class="wizard-info">
            <small><?php p($l->t('Klik op de knop om de tour opnieuw te doorlopen. Je wordt doorgestuurd naar het dashboard waar de tour automatisch start.')); ?></small>
        </p>
    </div>
</div>
