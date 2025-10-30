// Personal settings JavaScript for First Use Wizard
document.addEventListener('DOMContentLoaded', function() {
    const restartBtn = document.getElementById('restart-wizard-btn');
    const statusSpan = document.getElementById('wizard-completed-status');
    const storageKey = 'introvox_completed';

    if (!restartBtn || !statusSpan) {
        return; // Elements not found on this page
    }

    // Update status
    function updateStatus() {
        const completed = localStorage.getItem(storageKey) === 'true';
        if (completed) {
            statusSpan.textContent = '✅ Wizard is voltooid';
            statusSpan.style.color = 'var(--color-success)';
        } else {
            statusSpan.textContent = '⏳ Wizard nog niet voltooid';
            statusSpan.style.color = 'var(--color-warning)';
        }
    }

    updateStatus();

    // Restart wizard - reset localStorage and redirect to dashboard
    restartBtn.addEventListener('click', function() {
        // Reset the completion status
        localStorage.removeItem(storageKey);

        // Show feedback
        restartBtn.textContent = '✅ Reset! Doorsturen naar dashboard...';
        restartBtn.disabled = true;

        // Redirect to dashboard after a short delay
        setTimeout(function() {
            window.location.href = OC.generateUrl('/apps/dashboard/');
        }, 1000);
    });
});
