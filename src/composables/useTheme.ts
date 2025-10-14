/**
 * Theme Management Composable
 *
 * Wrapper around the theme store that provides a composable interface
 * for theme management with persistence across page reloads.
 */

import { storeToRefs } from 'pinia'
import { useThemeStore } from '@/stores/theme'

export function useTheme() {
  const themeStore = useThemeStore()

  // Use storeToRefs to maintain reactivity when destructuring
  const {
    currentTheme,
    isDarkTheme,
    isThemeLoaded,
    themeLoadError,
    isLoadingTheme
  } = storeToRefs(themeStore)

  return {
    // State (reactive refs from store)
    currentTheme,
    isDarkTheme,
    isThemeLoaded,
    themeLoadError,
    isLoadingTheme,

    // Actions
    initializeTheme: themeStore.initializeTheme,
    initializeOnLoad: themeStore.initializeOnLoad,
    toggleTheme: themeStore.toggleTheme,
    setTheme: themeStore.setTheme,
    getCurrentTheme: themeStore.getCurrentTheme,
    resetTheme: themeStore.resetTheme,
    isThemeInitialized: themeStore.isThemeInitialized,
  }
}
