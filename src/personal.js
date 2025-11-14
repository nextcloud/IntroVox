// Personal settings JavaScript for IntroVox
document.addEventListener('DOMContentLoaded', function() {
    const restartBtn = document.getElementById('restart-wizard-btn');
    const storageKey = 'introvox_completed';

    if (!restartBtn) {
        return; // Button not found on this page
    }

    // Restart wizard - reset localStorage and redirect to root domain
    restartBtn.addEventListener('click', function() {
        // Reset the completion status
        localStorage.removeItem(storageKey);

        // Show feedback
        restartBtn.textContent = '✅ ' + t('introvox', 'Restarting tour...');
        restartBtn.disabled = true;

        // Redirect to root domain after a short delay
        setTimeout(function() {
            window.location.href = OC.generateUrl('/');
        }, 1000);
    });
});
