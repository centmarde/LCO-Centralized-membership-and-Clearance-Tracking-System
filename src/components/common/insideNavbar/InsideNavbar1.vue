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
  const mobileDrawer = ref(false)

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
        if (mobile.value && mobileDrawer.value && currentScrollY > lastScrollY.value) {
          mobileDrawer.value = false
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
  <!-- Mobile Navigation Drawer -->
  <v-navigation-drawer
    v-if="mobile && config?.showNavbar && navbarConfig"
    v-model="mobileDrawer"
    temporary
    location="start"
    :color="navbarConfig.color"
    width="280"
    :elevation="navbarConfig.elevation"
  >
    <!-- Drawer Header with Logo/Title -->
    <div class="pa-4 d-flex align-center">
      <template v-if="navbarConfig?.logo?.src">
        <v-img
          :src="navbarConfig.logo.src"
          :alt="navbarConfig.logo.alt"
          :width="navbarConfig.logo.width"
          :height="navbarConfig.logo.height"
          class="me-2"
          contain
        >
          <template #error>
            <v-icon
              class="me-2"
              :icon="navbarConfig.icon"
              size="large"
            />
          </template>
        </v-img>
      </template>
      <template v-else>
        <v-icon
          class="me-2"
          :icon="navbarConfig?.icon"
          size="large"
        />
      </template>
      <span class="text-h6 font-weight-bold">{{ navbarConfig?.title }}</span>
    </div>

    <v-divider />

    <!-- Mobile Actions -->
    <div class="pa-4">
      <!-- Theme Toggle -->
      <v-btn
        :loading="isLoadingTheme"
        variant="outlined"
        block
        class="mb-2"
        @click="toggleTheme"
      >
        <v-icon :icon="themeIcon" class="me-2" />
        {{ themeTooltip }}
      </v-btn>

      <!-- Logout Button -->
      <v-btn
        :loading="authStore.loading"
        variant="outlined"
        block
        color="error"
        @click="handleLogout"
      >
        <v-icon icon="mdi-logout" class="me-2" />
        Logout
      </v-btn>
    </div>
  </v-navigation-drawer>

  <!-- Main Toolbar -->
  <v-toolbar
    v-if="config?.showNavbar && navbarConfig"
    app
    :color="navbarConfig.color"
    :density="navbarConfig.density"
    :elevation="navbarConfig.elevation"
  >
    <template #prepend>
      <!-- Mobile Hamburger Menu -->
      <v-btn
        v-if="mobile"
        icon
        variant="text"
        @click="mobileDrawer = !mobileDrawer"
      >
        <v-icon icon="mdi-menu" />
      </v-btn>

      <!-- Logo and Title -->
      <div class="d-flex align-center">
        <!-- Logo Image with Icon Fallback -->
        <template v-if="navbarConfig?.logo?.src">
          <v-img
            :src="navbarConfig.logo.src"
            :alt="navbarConfig.logo.alt"
            :width="navbarConfig.logo.width"
            :height="navbarConfig.logo.height"
            class="me-2"
            contain
          >
            <template #error>
              <!-- Fallback to icon if image fails to load -->
              <v-icon
                class="me-2"
                :icon="navbarConfig.icon"
                size="large"
              />
            </template>
          </v-img>
        </template>

        <template v-else>
          <!-- Default icon when no logo is configured -->
          <v-icon
            class="me-2"
            :icon="navbarConfig?.icon"
            size="large"
          />
        </template>

        <span class="text-h6 font-weight-bold ms-2">{{ navbarConfig?.title }}</span>
      </div>
    </template>

    <v-spacer />

    <!-- Desktop Actions -->
    <template #append>
      <!-- Theme Toggle Button -->
      <v-btn
        :loading="isLoadingTheme"
        size="small"
        variant="text"
        @click="toggleTheme"
      >
        <v-icon :icon="themeIcon" />
        <v-tooltip activator="parent" location="bottom">
          {{ themeTooltip }}
        </v-tooltip>
      </v-btn>

      <!-- Logout Button -->
      <v-btn
        :loading="authStore.loading"
        size="small"
        variant="text"
        color="error"
        @click="handleLogout"
      >
        <v-icon icon="mdi-logout" />
        <v-tooltip activator="parent" location="bottom">
          Logout
        </v-tooltip>
      </v-btn>
    </template>
  </v-toolbar>
</template>
