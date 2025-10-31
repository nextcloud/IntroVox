<?php
script('introvox', 'admin');
style('introvox', 'admin');
?>

<div id="introvox-admin" class="section">
    <h2><?php p($l->t('IntroVox')); ?></h2>
    <p class="settings-hint">
        <?php p($l->t('Manage the introduction tour steps shown to new users.')); ?>
    </p>

    <div id="introvox-admin-app"></div>
</div>
