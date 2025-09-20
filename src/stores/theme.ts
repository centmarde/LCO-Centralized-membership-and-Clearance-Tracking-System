/**
 * Theme Store with Persistence
 *
 * Manages theme state with localStorage persistence to maintain
 * theme selection across page reloads and browser sessions.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { vuetify } from '@/plugins/vuetify'
import { createDynamicThemes } from '@/themes'

// Storage key for theme persistence
const THEME_STORAGE_KEY = 'lco-theme-preference'
const THEME_INITIALIZED_KEY = 'lco-theme-initialized'

export const useThemeStore = defineStore('theme', () => {
  // State
  const currentTheme = ref<'light' | 'dark'>('light')
  const isThemeLoaded = ref(false)
  const isLoadingTheme = ref(false)
  const themeLoadError = ref<string | null>(null)

  // Computed
  const isDarkTheme = computed(() => currentTheme.value === 'dark')

  // Load theme preference from localStorage
  const loadStoredTheme = (): 'light' | 'dark' => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY)
      if (stored && (stored === 'light' || stored === 'dark')) {
        return stored
      }
    } catch (error) {
      console.warn('Failed to load theme from localStorage:', error)
    }
    return 'light' // default fallback
  }

  // Save theme preference to localStorage
  const saveThemePreference = (theme: 'light' | 'dark'): void => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch (error) {
      console.warn('Failed to save theme to localStorage:', error)
    }
  }

  // Check if theme has been initialized before
  const isThemeInitialized = (): boolean => {
    try {
      return localStorage.getItem(THEME_INITIALIZED_KEY) === 'true'
    } catch (error) {
      return false
    }
  }

  // Mark theme as initialized
  const markThemeInitialized = (): void => {
    try {
      localStorage.setItem(THEME_INITIALIZED_KEY, 'true')
    } catch (error) {
      console.warn('Failed to mark theme as initialized:', error)
    }
  }

  // Initialize themes from external configuration
  const initializeTheme = async (): Promise<void> => {
    if (isThemeLoaded.value) {
      return // Already loaded
    }

    try {
      isLoadingTheme.value = true
      themeLoadError.value = null

      // Load stored theme preference
      const storedTheme = loadStoredTheme()
      currentTheme.value = storedTheme

      // Load dynamic themes from external-page.json
      const themes = await createDynamicThemes()

      // Update Vuetify themes
      if (vuetify.theme && vuetify.theme.themes) {
        vuetify.theme.themes.value.light = themes.light
        vuetify.theme.themes.value.dark = themes.dark

        // Apply the stored theme preference
        vuetify.theme.global.name.value = currentTheme.value
      }

      isThemeLoaded.value = true
      markThemeInitialized()
      console.log(`Dynamic themes loaded successfully with ${currentTheme.value} theme`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load theme configuration'
      themeLoadError.value = errorMessage
      console.error('Theme initialization failed:', error)
      throw error
    } finally {
      isLoadingTheme.value = false
    }
  }

  // Set theme and persist preference
  const setTheme = (theme: 'light' | 'dark'): void => {
    currentTheme.value = theme
    saveThemePreference(theme)

    // Apply to Vuetify if themes are loaded
    if (vuetify.theme && isThemeLoaded.value) {
      vuetify.theme.global.name.value = theme
    }
  }

  // Toggle between light and dark themes
  const toggleTheme = (): void => {
    const newTheme = currentTheme.value === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
  }

  // Get current theme name
  const getCurrentTheme = (): 'light' | 'dark' => {
    return currentTheme.value
  }

  // Initialize on first load if not already initialized
  const initializeOnLoad = async (): Promise<void> => {
    // Always load stored preference
    const storedTheme = loadStoredTheme()
    currentTheme.value = storedTheme

    // Initialize themes if not already done or if themes aren't loaded
    if (!isThemeLoaded.value) {
      await initializeTheme()
    }
  }

  // Reset theme to default and clear storage
  const resetTheme = (): void => {
    try {
      localStorage.removeItem(THEME_STORAGE_KEY)
      localStorage.removeItem(THEME_INITIALIZED_KEY)
      currentTheme.value = 'light'
      if (vuetify.theme) {
        vuetify.theme.global.name.value = 'light'
      }
    } catch (error) {
      console.warn('Failed to reset theme:', error)
    }
  }

  return {
    // State
    currentTheme: computed(() => currentTheme.value),
    isDarkTheme,
    isThemeLoaded: computed(() => isThemeLoaded.value),
    isLoadingTheme: computed(() => isLoadingTheme.value),
    themeLoadError: computed(() => themeLoadError.value),

    // Actions
    initializeTheme,
    initializeOnLoad,
    setTheme,
    toggleTheme,
    getCurrentTheme,
    resetTheme,
    isThemeInitialized,
  }
})
