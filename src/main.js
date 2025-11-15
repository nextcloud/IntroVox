import { createApp } from 'vue'
import WizardManager from './components/WizardManager.vue'
import '../css/wizard.css'

// Initialize Vue app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Create a mount point for the Vue app if it doesn't exist
  let mountPoint = document.getElementById('nextcloud-wizard-mount')

  if (!mountPoint) {
    mountPoint = document.createElement('div')
    mountPoint.id = 'nextcloud-wizard-mount'
    document.body.appendChild(mountPoint)
  }

  // Create and mount the Vue app
  const app = createApp(WizardManager)
  app.mount('#nextcloud-wizard-mount')
})
