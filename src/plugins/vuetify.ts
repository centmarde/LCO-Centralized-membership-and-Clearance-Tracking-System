/**
 * plugins/vuetify.ts
 *
 * Framework documentation: https://vuetifyjs.com`
 */

// Composables
import { createVuetify } from 'vuetify'

// Styles
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

// Get stored theme preference for initial setup
const getStoredTheme = (): 'light' | 'dark' => {
  try {
    const stored = localStorage.getItem('lco-theme-preference')
    if (stored && (stored === 'light' || stored === 'dark')) {
      return stored
    }
  } catch (error) {
    console.warn('Failed to load theme from localStorage during Vuetify initialization:', error)
  }
  return 'light' // default fallback
}

// Create vuetify instance with initial theme from localStorage
const vuetify = createVuetify({
  theme: {
    defaultTheme: getStoredTheme(),
    themes: {
      light: {
        dark: false,
        colors: {
          // Temporary minimal theme - will be replaced by dynamic loading
          primary: '#1976D2',
          secondary: '#424242',
        },
      },
      dark: {
        dark: true,
        colors: {
          // Temporary minimal theme - will be replaced by dynamic loading
          primary: '#2196F3',
          secondary: '#616161',
        },
      },
    },
  },
})

// Export vuetify instance for dynamic theme updates
export { vuetify }

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export default vuetify
