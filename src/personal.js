// Personal settings JavaScript for IntroVox
import axios from '@nextcloud/axios';
import { generateUrl } from '@nextcloud/router';
import { translate as t } from '@nextcloud/l10n';

document.addEventListener('DOMContentLoaded', async function() {
    const storageKey = 'introvox_completed';
    const versionKey = 'introvox_version';

    // Check wizard status dynamically from server
    let wizardEnabled = false;
    let languageDisabled = false;
    try {
        const statusResponse = await axios.get(generateUrl('/apps/introvox/api/steps'));
        wizardEnabled = statusResponse.data.enabled === true;
        languageDisabled = statusResponse.data.languageDisabled === true;
        console.log('Wizard status from server:', {
            enabled: wizardEnabled,
            languageDisabled: languageDisabled,
            fullResponse: statusResponse.data
        });
    } catch (error) {
        console.error('Failed to check wizard status:', error);
        wizardEnabled = false;
    }

    // If wizard is disabled, update the UI to show the appropriate message
    const settingsContainer = document.getElementById('introvox-personal-settings');
    if (!wizardEnabled && settingsContainer) {
        let message = '';
        if (languageDisabled) {
            // Language not enabled
            message = `
                <h2>${t('introvox', 'IntroVox')}</h2>
                <p class="settings-hint">${t('introvox', 'The introduction tour is not available in your language.')}</p>
                <p class="settings-hint">${t('introvox', 'Contact your administrator if you would like to have the tour available in your language.')}</p>
            `;
        } else {
            // Wizard globally disabled
            message = `
                <h2>${t('introvox', 'IntroVox')}</h2>
                <p class="settings-hint">${t('introvox', 'The introduction tour is currently disabled by your administrator.')}</p>
                <p class="settings-hint">${t('introvox', 'Contact your administrator if you would like to see the guided tour.')}</p>
            `;
        }
        settingsContainer.innerHTML = message;
        console.log('Wizard is disabled - showing read-only message');
        return;
    }

    // Wizard is enabled, attach event listeners
    const restartBtn = document.getElementById('restart-wizard-btn');
    const saveBtn = document.getElementById('save-settings-btn');
    const disableCheckbox = document.getElementById('disable-wizard-checkbox');

    if (!restartBtn) {
        return; // Button not found on this page
    }

    // Load current settings
    try {
        const response = await axios.get(generateUrl('/apps/introvox/personal/settings'));
        if (response.data.success && disableCheckbox) {
            disableCheckbox.checked = response.data.wizardDisabledByUser;
        }
    } catch (error) {
        console.error('Failed to load personal settings:', error);
    }

    // Save settings button
    if (saveBtn && disableCheckbox) {
        saveBtn.addEventListener('click', async function() {
            try {
                saveBtn.disabled = true;
                saveBtn.textContent = t('introvox', 'Saving...');

                const response = await axios.post(generateUrl('/apps/introvox/personal/settings'), {
                    wizardDisabled: disableCheckbox.checked
                });

                if (response.data.success) {
                    OCP.Toast.success(t('introvox', 'Settings saved successfully'));
                    saveBtn.textContent = '💾 ' + t('introvox', 'Save settings');
                } else {
                    OCP.Toast.error(t('introvox', 'Error saving settings'));
                    saveBtn.textContent = '💾 ' + t('introvox', 'Save settings');
                }
            } catch (error) {
                console.error('Error saving settings:', error);
                OCP.Toast.error(t('introvox', 'Error saving settings'));
                saveBtn.textContent = '💾 ' + t('introvox', 'Save settings');
            } finally {
                saveBtn.disabled = false;
            }
        });
    }

    // Restart wizard - reset localStorage and redirect to dashboard
    restartBtn.addEventListener('click', async function() {
        try {
            // Reset the completion status and version
            localStorage.removeItem(storageKey);
            localStorage.removeItem(versionKey);

            // Reset the disable preference on server
            await axios.post(generateUrl('/apps/introvox/personal/settings'), {
                wizardDisabled: false
            });

            // Update checkbox state
            if (disableCheckbox) {
                disableCheckbox.checked = false;
            }

            // Show feedback
            restartBtn.textContent = '✅ ' + t('introvox', 'Restarting tour...');
            restartBtn.disabled = true;

            // Redirect to dashboard after a short delay
            setTimeout(function() {
                window.location.href = OC.generateUrl('/apps/dashboard/');
            }, 1000);
        } catch (error) {
            console.error('Error resetting wizard preference:', error);
            OCP.Toast.error(t('introvox', 'Error restarting tour'));
            restartBtn.textContent = '🔄 ' + t('introvox', 'Restart tour now');
            restartBtn.disabled = false;
        }
    });
});
