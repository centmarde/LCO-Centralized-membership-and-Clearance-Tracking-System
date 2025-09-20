<template>
  <v-app>
    <router-view />
  </v-app>
</template>

<script lang="ts" setup>
import { onMounted } from 'vue'
import { useTheme } from '@/composables/useTheme'

// Initialize theme on app startup
const { initializeOnLoad } = useTheme()

onMounted(async () => {
  try {
    // Initialize theme with persistence
    await initializeOnLoad()
  } catch (error) {
    console.warn('Failed to initialize theme on app startup:', error)
  }
})
</script>
