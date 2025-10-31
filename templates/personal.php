<?php
script('introvox', 'personal');
style('introvox', 'personal');
?>

<div class="section" id="introvox-personal-settings">
    <h2><?php p($l->t('IntroVox')); ?></h2>

    <p class="settings-hint">
        <?php p($l->t('Start the guided tour again to learn about Nextcloud features.')); ?>
    </p>

    <div class="wizard-controls">
        <button id="restart-wizard-btn" class="button primary">
            🔄 <?php p($l->t('Restart tour')); ?>
        </button>
        <p class="wizard-status">
            <span id="wizard-completed-status"></span>
        </p>
        <p class="wizard-info">
            <small><?php p($l->t('The tour will be restarted. Refresh the page to start.')); ?></small>
        </p>
    </div>
</div>
