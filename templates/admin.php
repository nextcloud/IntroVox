<?php
script('introvox', 'admin');
style('introvox', 'admin');
?>

<div id="introvox-admin" class="section">
    <h2><?php p($l->t('IntroVox')); ?></h2>
    <p class="settings-hint">
        <?php // TRANSLATORS: Description under the heading IntroVox on the administration page
        p($l->t('Tours that show people around Nextcloud and its apps: when they start, for whom, and their steps.')); ?>
    </p>

    <div id="introvox-admin-app"
        data-intro-done="<?php p($_['introDone'] ? 'true' : 'false'); ?>"
        data-telemetry-asked="<?php p($_['telemetryAsked'] ? 'true' : 'false'); ?>"
        data-upload-limit="<?php p((string)$_['uploadLimit']); ?>"></div>
</div>
