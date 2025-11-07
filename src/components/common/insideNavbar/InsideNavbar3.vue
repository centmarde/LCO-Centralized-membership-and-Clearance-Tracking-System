<script lang="ts" setup>
  import type { UIConfig, LogoConfig } from '@/controller/landingController'
  import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import { useDisplay } from 'vuetify'
  import { useTheme } from '@/composables/useTheme'
  import { useAuthUserStore } from '@/stores/authUser'
  import { navigationConfig, type NavigationGroup, type NavigationItem } from '@/utils/navigation'
  import { getEmailInitials, getUserDisplayName } from '@/utils/helpers'

  interface Props {
    config?: UIConfig | null
  }

  const props = defineProps<Props>()
  const router = useRouter()
  const authStore = useAuthUserStore()

  // Vuetify display composable for responsiveness
  const { mobile, mdAndUp, lgAndUp, xs, sm, md } = useDisplay()

  // Mobile drawer state
  const drawer = ref(false)
  const isScrolled = ref(false)
  const lastScrollY = ref(0)

  // Theme management
  const { toggleTheme: handleToggleTheme, getCurrentTheme, isLoadingTheme } = useTheme()

  const navbarConfig = computed(() => props.config?.navbar)

  // Navigation handling
  const currentRoute = computed(() => router.currentRoute.value.path)

  // Get all navigation items flattened from groups for easier handling
  const allNavigationItems = computed(() => {
    const items: NavigationItem[] = []
    navigationConfig.forEach(group => {
      group.children.forEach(item => {
        items.push(item)
      })
    })
    return items
  })

  // Filter navigation based on user permissions (for now, show all - you can implement permission checking)
  const filteredNavigation = computed(() => {
    // For now, return all navigation items
    // You can implement permission checking here based on authStore.userData
    return navigationConfig
  })

  // Check if current route matches any navigation item
  const isNavigationRoute = computed(() => {
    return allNavigationItems.value.some(item =>
      currentRoute.value.startsWith(item.route) || currentRoute.value === item.route
    )
  })

  // Theme toggle computed properties
  const currentTheme = computed(() => getCurrentTheme())
  const themeIcon = computed(() => {
    return currentTheme.value === 'dark' ? 'mdi-white-balance-sunny' : 'mdi-weather-night'
  })
  const themeTooltip = computed(() => {
    return `Switch to ${currentTheme.value === 'dark' ? 'light' : 'dark'} theme`
  })

  // User avatar computed properties
  const userInitials = computed(() => getEmailInitials(authStore.userEmail))
  const userDisplayName = computed(() => getUserDisplayName(authStore.userData))

  // Dynamic navbar color to match dashboard cards in both light and dark mode
  // Vuetify v3: 'surface' is the default card color in both themes
  const navbarColor = computed(() => 'surface')
  const navbarStyle = computed(() => {
    const sidebarWidth = 280;
    const containerPadding = 24;
    const containerMaxWidth = 1280;
    const base = {
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      border: '2px solid rgba(120,120,160,0.10)',
      boxShadow: '0 2px 16px 0 rgba(120, 120, 160, 0.10)',
      marginBottom: '48px',
      boxSizing: 'border-box' as const,
      marginLeft: 'auto',
      marginRight: 'auto',
      paddingLeft: '10px',
      paddingRight: '10px',
    };
    if (lgAndUp.value) {
      const desktopLeft = sidebarWidth + 16;
      return {
        ...base,
        top: isScrolled.value ? '10px' : '20px',
        left: `${desktopLeft}px`,
        right: 'auto',
        width: `calc(100vw - ${desktopLeft + containerPadding * 2}px)`,
        maxWidth: `${containerMaxWidth}px`,
        transform: isScrolled.value ? 'scale(0.98)' : 'scale(1)',
      }
    } else {
      // On mobile/tablet, add margin to both sides
      return {
        ...base,
        top: isScrolled.value ? (xs.value ? '4px' : '10px') : (xs.value ? '8px' : '20px'),
        left: '50%',
        right: 'auto',
        transform: `translateX(-50%) ${isScrolled.value ? 'scale(0.98)' : 'scale(1)'}`,
        width: xs.value ? '100%' : '98%',
        maxWidth: `${containerMaxWidth}px`,
        paddingLeft: '16px',
        paddingRight: '16px',
      }
    }
  })

  // Scroll handler for floating effect and auto-close drawer
  const handleScroll = () => {
    const currentScrollY = window.scrollY
    isScrolled.value = currentScrollY > 20

    // Auto-close drawer when scrolling down on mobile and tablets
    if (!lgAndUp.value && drawer.value) {
      if (currentScrollY > lastScrollY.value && currentScrollY > 100) {
        drawer.value = false
      }
    }

    lastScrollY.value = currentScrollY
  }

  // Watch for drawer state changes and close on route change
  watch(() => router.currentRoute.value, () => {
    if (drawer.value) {
      drawer.value = false
    }
  })

  // Close drawer when switching from mobile to desktop
  watch(lgAndUp, (newLgAndUp, oldLgAndUp) => {
    if (!oldLgAndUp && newLgAndUp && drawer.value) {
      drawer.value = false
    }
  })

  onMounted(() => {
    window.addEventListener('scroll', handleScroll)
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
  })

  function toggleTheme () {
    handleToggleTheme()
  }

  function navigateToRoute(route: string) {
    router.push(route)
    // Close mobile drawer if open
    if (drawer.value) {
      drawer.value = false
    }
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
    <!-- Floating Navbar using v-app-bar with Vuetify positioning -->
  <v-app-bar
  :elevation="0"
  :height="xs ? 56 : 64"
  rounded="pill"
  position="fixed"
  class="mx-auto px-2 glass-nav"
  :style="{
    top: isScrolled ? (xs ? '4px' : '10px') : (xs ? '8px' : '20px'),
    left: lgAndUp ? '59%' : '50%',
    transform: `translateX(-50%) ${isScrolled ? 'scale(0.98)' : 'scale(1)'}`,
    width: isScrolled ? (xs ? '96%' : (isNavigationRoute && mdAndUp ? '95%' : '90%')) : (xs ? '98%' : (isNavigationRoute && mdAndUp ? '98%' : '95%')),
    maxWidth: isNavigationRoute && mdAndUp ? '1400px' : '1200px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  }"
>

      <!-- Logo Section with Badge -->
      <template #prepend>
        <div class="d-flex align-center">
          <v-badge
            content="V3"
            color="success"
            dot
            offset-x="8"
            offset-y="8"
            class="me-2"
          >
            <!-- Logo Image with Icon Fallback -->
            <template v-if="navbarConfig.logo?.src">
              <v-img
                :src="navbarConfig.logo.src"
                :alt="navbarConfig.logo.alt"
                :width="navbarConfig.logo.width || 42"
                :height="navbarConfig.logo.height || 42"
                contain
              >
                <template #error>
                  <!-- Fallback to avatar with icon if image fails to load -->
                  <v-avatar
                    :color="navbarConfig.color"
                    size="42"
                  >
                    <v-icon
                      :icon="navbarConfig.icon"
                      size="22"
                      color="white"
                    />
                  </v-avatar>
                </template>
              </v-img>
            </template>
            <template v-else>
              <!-- Default avatar with icon when no logo is configured -->
              <v-avatar
                :color="navbarConfig.color"
                size="42"
              >
                <v-icon
                  :icon="navbarConfig.icon"
                  size="22"
                  color="white"
                />
              </v-avatar>
            </template>
          </v-badge>

          <!-- Hide title on mobile to minimize navbar -->
          <div class="d-flex flex-column ms-2 d-none d-md-flex">
            <span class="text-subtitle-1 font-weight-bold text-primary">
              {{ navbarConfig.title }}
            </span>
            <span class="text-caption text-medium-emphasis">
              Academic Excellence
            </span>
          </div>
        </div>
      </template>

      <!-- Navigation Tabs (Desktop and Tablet) -->
      <div v-if="mdAndUp && isNavigationRoute" class="d-flex align-center mx-4">
        <v-menu
          v-for="group in filteredNavigation"
          :key="group.title"
          location="bottom"
          offset="8"
        >
          <template #activator="{ props: menuProps }">
            <v-btn
              v-bind="menuProps"
              variant="text"
              rounded="pill"
              size="small"
              :prepend-icon="group.icon"
              class="mx-1"
              :color="group.children.some(item => currentRoute.startsWith(item.route)) ? 'primary' : undefined"
            >
              <span class="text-caption font-weight-medium">{{ group.title }}</span>
            </v-btn>
          </template>

          <v-card width="220" class="mt-2">
            <v-list density="compact">
              <v-list-item
                v-for="item in group.children"
                :key="item.route"
                :prepend-icon="item.icon"
                :title="item.title"
                :active="currentRoute.startsWith(item.route)"
                rounded="xl"
                class="ma-1"
                @click="navigateToRoute(item.route)"
              />
            </v-list>
          </v-card>
        </v-menu>
      </div>

      <v-spacer />

      <!-- Desktop Actions -->
      <template #append>
        <div class="d-flex align-center" v-if="lgAndUp">
           <!-- Theme Toggle Menu -->
          <v-menu location="bottom">
            <template #activator="{ props: menuProps }">
              <v-btn
                v-bind="menuProps"
                :loading="isLoadingTheme"
                variant="outlined"
                rounded="pill"
                size="large"
                :prepend-icon="themeIcon"
              >
                <span>Theme</span>
              </v-btn>
            </template>

            <v-card width="200" class="mt-2">
              <v-list density="compact">
                <v-list-item
                  prepend-icon="mdi-white-balance-sunny"
                  title="Light Mode"
                  :active="currentTheme === 'light'"
                  @click="currentTheme === 'dark' && toggleTheme()"
                />
                <v-list-item
                  prepend-icon="mdi-weather-night"
                  title="Dark Mode"
                  :active="currentTheme === 'dark'"
                  @click="currentTheme === 'light' && toggleTheme()"
                />
              </v-list>
            </v-card>
          </v-menu>

          <!-- User Avatar Menu -->
          <v-menu location="bottom">
            <template #activator="{ props: menuProps }">
              <v-btn
                v-bind="menuProps"
                variant="text"
                size="large"
                class="ml-2"
              >
                <v-avatar
                  size="32"
                  color="primary"
                  class="me-2"
                >
                  <span class="text-caption font-weight-bold">
                    {{ userInitials }}
                  </span>
                </v-avatar>
                <div class="d-flex flex-column align-start text-left">
                  <span class="text-body-2 font-weight-medium">
                    {{ userDisplayName }}
                  </span>
                  <span class="text-caption text-medium-emphasis">
                    {{ authStore.userEmail }}
                  </span>
                </div>
                <v-icon icon="mdi-chevron-down" class="ml-2" />
              </v-btn>
            </template>

            <v-card width="280" class="mt-2">
              <v-card-text class="pa-3">
                <div class="d-flex align-center">
                  <v-avatar
                    size="40"
                    color="primary"
                    class="me-3"
                  >
                    <span class="text-subtitle-1 font-weight-bold">
                      {{ userInitials }}
                    </span>
                  </v-avatar>
                  <div class="d-flex flex-column">
                    <span class="text-subtitle-2 font-weight-medium">
                      {{ userDisplayName }}
                    </span>
                    <span class="text-caption text-medium-emphasis">
                      {{ authStore.userEmail }}
                    </span>
                  </div>
                </div>
              </v-card-text>

              <v-divider />

              <v-list density="compact">
               <!--  <v-list-item
                  prepend-icon="mdi-account"
                  title="My Account"
                  subtitle="View your account"
                /> -->
               <!--  <v-list-item
                  prepend-icon="mdi-cog"
                  title="Settings"
                  subtitle="Account preferences"
                /> -->
                <v-divider class="my-1" />
                <v-list-item
                  prepend-icon="mdi-logout"
                  title="Logout"
                  subtitle="Sign out of your account"
                  color="error"
                  :loading="authStore.loading"
                  @click="handleLogout"
                />
              </v-list>
            </v-card>
          </v-menu>
        </div>

        <!-- Mobile Menu Button -->
        <v-btn
          v-if="!lgAndUp"
          icon="mdi-menu"
          variant="text"
          :size="xs ? 'default' : 'large'"
          @click="drawer = !drawer"
        />
      </template>
    </v-app-bar>

    <!-- Mobile Navigation Drawer -->
    <v-navigation-drawer
      v-model="drawer"
      :temporary="!lgAndUp"
      :permanent="false"
      location="start"
      :width="280"
      :scrim="true"
      :elevation="24"
      absolute
      class="pa-0"
      style="position: fixed !important; z-index: 9999 !important; top: 0 !important; left: 0 !important; height: 100vh !important;"
    >
      <!-- Drawer Header with Logo and Title -->
      <template #prepend>
        <v-card flat class="px-4 py-6">
          <div class="d-flex align-center">
            <v-badge
              content="V3"
              color="success"
              dot
              offset-x="8"
              offset-y="8"
              class="me-3"
            >
              <!-- Logo Image with Icon Fallback -->
              <template v-if="navbarConfig.logo?.src">
                <v-img
                  :src="navbarConfig.logo.src"
                  :alt="navbarConfig.logo.alt"
                  :width="navbarConfig.logo.width || 48"
                  :height="navbarConfig.logo.height || 48"
                  contain
                >
                  <template #error>
                    <!-- Fallback to avatar with icon if image fails to load -->
                    <v-avatar
                      :color="navbarConfig.color"
                      size="48"
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
                  :color="navbarConfig.color"
                  size="48"
                >
                  <v-icon
                    :icon="navbarConfig.icon"
                    size="24"
                    color="white"
                  />
                </v-avatar>
              </template>
            </v-badge>

            <div class="d-flex flex-column">
              <span class="text-h6 font-weight-bold text-primary">
                {{ navbarConfig.title }}
              </span>
              <span class="text-caption text-medium-emphasis">
                Academic Excellence
              </span>
            </div>
          </div>

          <!-- Close Button -->
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            class="position-absolute"
            style="top: 16px; right: 16px;"
            @click="drawer = false"
          />
        </v-card>
        <v-divider />
      </template>

      <!-- Navigation List -->
      <v-list nav class="py-0">
        <!-- Navigation Groups -->
        <template v-for="group in filteredNavigation" :key="group.title">
          <v-list-group :value="group.title">
            <template #activator="{ props: activatorProps }">
              <v-list-item
                v-bind="activatorProps"
                :prepend-icon="group.icon"
                :title="group.title"
                rounded="xl"
                class="ma-2"
                :color="group.children.some(item => currentRoute.startsWith(item.route)) ? 'primary' : undefined"
              />
            </template>

            <v-list-item
              v-for="item in group.children"
              :key="item.route"
              :prepend-icon="item.icon"
              :title="item.title"
              :active="currentRoute.startsWith(item.route)"
              rounded="xl"
              class="ma-2 ms-4"
              @click="navigateToRoute(item.route)"
            />
          </v-list-group>
        </template>

        <v-divider class="my-2" />

        <!-- Theme Toggle -->
        <v-list-group value="Theme">
          <template #activator="{ props: activatorProps }">
            <v-list-item
              v-bind="activatorProps"
              :prepend-icon="themeIcon"
              title="Theme"
              :subtitle="`Current: ${currentTheme === 'dark' ? 'Dark' : 'Light'} Mode`"
              rounded="xl"
              class="ma-2"
            />
          </template>

          <v-list-item
            prepend-icon="mdi-white-balance-sunny"
            title="Light Mode"
            :active="currentTheme === 'light'"
            rounded="xl"
            class="ma-2 ms-4"
            @click="currentTheme === 'dark' && toggleTheme()"
          />
          <v-list-item
            prepend-icon="mdi-weather-night"
            title="Dark Mode"
            :active="currentTheme === 'dark'"
            rounded="xl"
            class="ma-2 ms-4"
            @click="currentTheme === 'light' && toggleTheme()"
          />
        </v-list-group>

        <!-- User Profile Section -->
        <v-list-group value="Profile">
          <template #activator="{ props: activatorProps }">
            <v-list-item
              v-bind="activatorProps"
              rounded="xl"
              class="ma-2"
            >
              <template #prepend>
                <v-avatar
                  size="32"
                  color="primary"
                  class="me-3"
                >
                  <span class="text-caption font-weight-bold">
                    {{ userInitials }}
                  </span>
                </v-avatar>
              </template>
              <v-list-item-title class="text-subtitle-2">
                {{ userDisplayName }}
              </v-list-item-title>
              <v-list-item-subtitle class="text-caption">
                {{ authStore.userEmail }}
              </v-list-item-subtitle>
            </v-list-item>
          </template>

          <v-list-item
            prepend-icon="mdi-account"
            title="Profile"
            rounded="xl"
            class="ma-2 ms-4"
          />
          <v-list-item
            prepend-icon="mdi-cog"
            title="Settings"
            rounded="xl"
            class="ma-2 ms-4"
          />
          <v-list-item
            prepend-icon="mdi-logout"
            title="Logout"
            rounded="xl"
            class="ma-2 ms-4"
            color="error"
            :loading="authStore.loading"
            @click="handleLogout"
          />
        </v-list-group>
      </v-list>

      <!-- Empty append section -->
      <template #append>
        <div class="pa-4">
          <!-- No CTA button for inner navbar -->
        </div>
      </template>
    </v-navigation-drawer>

  </div>
</template>

<style scoped>
</style>
