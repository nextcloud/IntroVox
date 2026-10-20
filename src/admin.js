import { createApp } from 'vue'
import AdminApp from './admin/AdminApp.vue'

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  const adminRoot = document.getElementById('introvox-admin-app')

  if (adminRoot) {
    const app = createApp(AdminApp, {
      introDone: adminRoot.dataset.introDone === 'true',
      telemetryAsked: adminRoot.dataset.telemetryAsked === 'true'
    })
    app.mount('#introvox-admin-app')
  }
})
