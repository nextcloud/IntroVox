<?php
script('introvox', 'personal');
style('introvox', 'personal');
?>

<div class="section" id="introvox-personal-settings">
    <h2><?php p($l->t('IntroVox')); ?></h2>

    <p class="settings-hint">
        <?php p($l->t('Start the guided tour again to learn about Nextcloud features.')); ?>
    </p>

    <button id="restart-wizard-btn" class="button primary">
        🔄 <?php p($l->t('Restart tour')); ?>
    </button>
</div>
