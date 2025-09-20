/**
 * Theme Management Composable
 *
 * Wrapper around the theme store that provides a composable interface
 * for theme management with persistence across page reloads.
 */

import { useThemeStore } from '@/stores/theme'

export function useTheme() {
  const themeStore = useThemeStore()

  return {
    // State (computed refs from store)
    currentTheme: themeStore.currentTheme,
    isDarkTheme: themeStore.isDarkTheme,
    isThemeLoaded: themeStore.isThemeLoaded,
    themeLoadError: themeStore.themeLoadError,
    isLoadingTheme: themeStore.isLoadingTheme,

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
