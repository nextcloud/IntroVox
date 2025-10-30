import { createApp } from 'vue'
import AdminApp from './admin/AdminApp.vue'

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  const adminRoot = document.getElementById('introvox-admin-app')

  if (adminRoot) {
    const app = createApp(AdminApp)
    app.mount('#introvox-admin-app')
    console.log('🎨 First Use Wizard Admin loaded')
  }
})
