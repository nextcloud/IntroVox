<template>
  <div id="nextcloud-wizard-app">
    <!-- Wizard component wordt hier geladen -->
  </div>
</template>

<script>
import WizardManager from './components/WizardManager.vue'

export default {
  name: 'App',
  components: {
    WizardManager
  },
  mounted() {
    // De wizard wordt automatisch geïnitialiseerd door WizardManager
  }
}
</script>

<style>
/* Global wizard styles indien nodig */
</style>
