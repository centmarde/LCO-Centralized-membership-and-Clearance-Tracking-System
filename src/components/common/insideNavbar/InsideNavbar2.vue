<script lang="ts" setup>
  import type { UIConfig, LogoConfig } from '@/controller/landingController'
  import { computed, ref, onMounted, onUnmounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { useTheme } from '@/composables/useTheme'
  import { useDisplay } from 'vuetify'
  import { useAuthUserStore } from '@/stores/authUser'

  interface Props {
    config?: UIConfig | null
  }

  const props = defineProps<Props>()
  const router = useRouter()
  const authStore = useAuthUserStore()

  // Responsive breakpoints
  const { mobile } = useDisplay()

  // Mobile drawer state
  const drawer = ref(false)

  // Theme management
  const { toggleTheme: handleToggleTheme, getCurrentTheme, isLoadingTheme } = useTheme()

  // Scroll detection for mobile drawer auto-close
  let lastScrollY = ref(0)
  let ticking = ref(false)

  const handleScroll = () => {
    if (!ticking.value) {
      requestAnimationFrame(() => {
        const currentScrollY = window.scrollY

        // Close mobile drawer when scrolling down
        if (mobile.value && drawer.value && currentScrollY > lastScrollY.value) {
          drawer.value = false
        }

        lastScrollY.value = currentScrollY
        ticking.value = false
      })
      ticking.value = true
    }
  }

  // Add scroll listener on mount, remove on unmount
  onMounted(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    lastScrollY.value = window.scrollY
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
  })

  const navbarConfig = computed(() => props.config?.navbar)

  // Theme toggle computed properties
  const currentTheme = computed(() => getCurrentTheme())
  const themeIcon = computed(() => {
    return currentTheme.value === 'dark' ? 'mdi-white-balance-sunny' : 'mdi-weather-night'
  })
  const themeTooltip = computed(() => {
    return `Switch to ${currentTheme.value === 'dark' ? 'light' : 'dark'} theme`
  })

  function toggleTheme () {
    handleToggleTheme()
  }

  async function handleLogout () {
    try {
      await authStore.signOut()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }
</script>

<template>
  <div v-if="config?.showNavbar && navbarConfig">
    <!-- App Bar for Desktop -->
    <v-app-bar
      app
      :elevation="navbarConfig.elevation"
      density="comfortable"
      flat
      scroll-behavior="elevate"
      scroll-threshold="50"
      class="navbar-gradient"
    >
      <!-- Logo and Title Section -->
      <template #prepend>
        <!-- Logo Image with Icon Fallback -->
        <template v-if="navbarConfig.logo?.src">
          <v-img
            :src="navbarConfig.logo.src"
            :alt="navbarConfig.logo.alt"
            :width="navbarConfig.logo.width || 40"
            :height="navbarConfig.logo.height || 40"
            class="me-3"
            contain
          >
            <template #error>
              <!-- Fallback to avatar with icon if image fails to load -->
              <v-avatar
                class="me-3"
                size="40"
                :color="navbarConfig.color === 'transparent' ? 'primary' : 'primary-darken-1'"
              >
                <v-icon
                  :icon="navbarConfig.icon"
                  size="24"
                  color="white"
                />
              </v-avatar>
            </template>
          </v-img>
        </template>
        <template v-else>
          <!-- Default avatar with icon when no logo is configured -->
          <v-avatar
            class="me-3"
            size="40"
            :color="navbarConfig.color === 'transparent' ? 'primary' : 'primary-darken-1'"
          >
            <v-icon
              :icon="navbarConfig.icon"
              size="24"
              color="white"
            />
          </v-avatar>
        </template>

        <div class="d-flex flex-column">
          <span class="text-h6 font-weight-bold ">
            {{ navbarConfig.title }}
          </span>
          <span class="text-caption text-medium-emphasis">
            Modern Design
          </span>
        </div>
      </template>

      <v-spacer />

      <!-- Desktop Actions -->
      <template #append>
        <div class="d-none d-md-flex align-center">
          <!-- Action Buttons Container -->
          <div class="d-flex align-center">
            <!-- Theme Toggle with Badge -->
            <v-badge
              :content="currentTheme.charAt(0).toUpperCase()"
              color="secondary"
              offset-x="8"
              offset-y="8"
            >
              <v-btn
                :loading="isLoadingTheme"
                size="large"
                variant="text"
                rounded="xl"
                :aria-label="themeTooltip"
                @click="toggleTheme"
              >
                <v-icon :icon="themeIcon" />
                <v-tooltip activator="parent" location="bottom">
                  {{ themeTooltip }}
                </v-tooltip>
              </v-btn>
            </v-badge>

            <!-- Logout Button -->
            <v-btn
              :loading="authStore.loading"
              size="large"
              variant="text"
              rounded="xl"
              color="error"
              aria-label="Logout"
              @click="handleLogout"
            >
              <v-icon icon="mdi-logout" />
              <v-tooltip activator="parent" location="bottom">
                Logout
              </v-tooltip>
            </v-btn>
          </div>
        </div>

        <!-- Mobile Menu Button -->
        <v-btn
          class="d-md-none"
          icon="mdi-menu"
          variant="text"
          @click="drawer = !drawer"
        />
      </template>
    </v-app-bar>

    <!-- Mobile Navigation Drawer -->
    <v-navigation-drawer
      v-model="drawer"
      location="end"
      temporary
      width="300"
      class="d-md-none"
    >
      <!-- Drawer Header -->
      <v-list-item class="pa-4 border-b">
        <template #prepend>
          <!-- Logo Image with Icon Fallback -->
          <template v-if="navbarConfig.logo?.src">
            <v-img
              :src="navbarConfig.logo.src"
              :alt="navbarConfig.logo.alt"
              :width="navbarConfig.logo.width || 48"
              :height="navbarConfig.logo.height || 48"
              class="me-3"
              contain
            >
              <template #error>
                <!-- Fallback to avatar with icon if image fails to load -->
                <v-avatar
                  :color="navbarConfig.color === 'transparent' ? 'light' : 'primary-darken-1'"
                  size="48"
                >
                  <v-icon
                    :icon="navbarConfig.icon"
                    size="28"
                    color="white"
                  />
                </v-avatar>
              </template>
            </v-img>
          </template>
          <template v-else>
            <!-- Default avatar with icon when no logo is configured -->
            <v-avatar
              :color="navbarConfig.color === 'transparent' ? 'light' : 'primary-darken-1'"
              size="48"
            >
              <v-icon
                :icon="navbarConfig.icon"
                size="28"
                color="white"
              />
            </v-avatar>
          </template>
        </template>

        <v-list-item-title class="text-h6 font-weight-bold text-primary">
          {{ navbarConfig.title }}
        </v-list-item-title>
        <v-list-item-subtitle class="text-caption">
          Modern Design
        </v-list-item-subtitle>
      </v-list-item>

      <v-divider />

      <!-- Navigation Items -->
      <v-list nav>
        <!-- Theme Toggle List Item -->
        <v-list-item
          :title="themeTooltip"
          :prepend-icon="themeIcon"
          rounded="xl"
          class="ma-2"
          @click="toggleTheme"
        />

        <!-- Logout List Item -->
        <v-list-item
          title="Logout"
          prepend-icon="mdi-logout"
          rounded="xl"
          class="ma-2"
          color="error"
          @click="handleLogout"
        />
      </v-list>

      <!-- Mobile Actions -->
      <template #append>
        <div class="pa-4 border-t">
          <!-- Actions section now empty - all moved to list items -->
        </div>
      </template>
    </v-navigation-drawer>
  </div>
</template>

<style scoped>
/* Enhance the app bar with subtle animations */
.v-app-bar {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Gradient effect using primary theme color */
.navbar-gradient {
  background: linear-gradient(
    135deg,
    rgb(var(--v-theme-primary)) 0%,
    rgba(var(--v-theme-primary), 0.8) 50%,
    rgba(var(--v-theme-primary), 0.9) 100%
  ) !important;
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(var(--v-theme-primary), 0.2);
}

/* Smooth drawer animation */
.v-navigation-drawer {
  backdrop-filter: blur(10px);
}
</style>
