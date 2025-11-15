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
    } catch (error) {
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
        // Failed to load settings
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
                OCP.Toast.error(t('introvox', 'Error saving settings'));
                saveBtn.textContent = '💾 ' + t('introvox', 'Save settings');
            } finally {
                saveBtn.disabled = false;
            }
        });
    }

    // Restart wizard - reset localStorage and redirect to first available app
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

            // Find the first available app to redirect to
            // Priority: dashboard, files, or first available app
            let targetApp = 'dashboard'; // Default fallback

            if (typeof OC !== 'undefined' && OC.appswebroots) {
                // Preferred apps in order
                const preferredApps = ['dashboard', 'files'];

                // Check if any preferred app is available
                for (const app of preferredApps) {
                    if (OC.appswebroots[app]) {
                        targetApp = app;
                        break;
                    }
                }

                // If no preferred app found, use first available app
                if (!OC.appswebroots[targetApp]) {
                    const availableApps = Object.keys(OC.appswebroots);
                    if (availableApps.length > 0) {
                        targetApp = availableApps[0];
                    }
                }
            }

            // Redirect to selected app after a short delay
            setTimeout(function() {
                window.location.href = OC.generateUrl('/apps/' + targetApp + '/');
            }, 1000);
        } catch (error) {
            OCP.Toast.error(t('introvox', 'Error restarting tour'));
            restartBtn.textContent = '🔄 ' + t('introvox', 'Restart tour now');
            restartBtn.disabled = false;
        }
    });
});
