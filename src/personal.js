import { createApp } from 'vue'
import PersonalApp from './personal/PersonalApp.vue'

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('introvox-personal-settings')
  if (root) {
    createApp(PersonalApp, {
      wizardEnabled: root.dataset.wizardEnabled === 'true'
    }).mount(root)
  }
})
