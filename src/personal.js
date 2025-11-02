// Personal settings JavaScript for IntroVox
document.addEventListener('DOMContentLoaded', function() {
    const restartBtn = document.getElementById('restart-wizard-btn');
    const storageKey = 'introvox_completed';

    if (!restartBtn) {
        return; // Button not found on this page
    }

    // Restart wizard - reset localStorage and redirect to dashboard
    restartBtn.addEventListener('click', function() {
        // Reset the completion status
        localStorage.removeItem(storageKey);

        // Show feedback
        restartBtn.textContent = '✅ ' + t('introvox', 'Restarting tour...');
        restartBtn.disabled = true;

        // Redirect to dashboard after a short delay
        setTimeout(function() {
            window.location.href = OC.generateUrl('/apps/dashboard/');
        }, 1000);
    });
});
