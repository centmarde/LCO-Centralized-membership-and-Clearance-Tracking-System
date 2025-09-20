<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useDisplay } from 'vuetify'
import { useRouter, useRoute } from 'vue-router'
import { useAuthUserStore } from '@/stores/authUser'
import { navigationConfig } from '@/utils/navigation'

// Vuetify display composable for responsive design
const { smAndDown } = useDisplay()

// Vue Router
const router = useRouter()
const route = useRoute()

// Auth store
const authStore = useAuthUserStore()

// Reactive state for sidebar
const isExpanded = ref(true)

// Control admin group expansion - make it persistent
const adminGroupExpanded = ref(true)

// Control organization group expansion - make it persistent
const organizationGroupExpanded = ref(true)

// Watch for route changes and keep admin group expanded if we're on an admin route
watch(
  () => route.path,
  (newPath) => {
    if (newPath.startsWith('/admin') || newPath === '/dashboard') {
      adminGroupExpanded.value = true
    }
    if (newPath.startsWith('/organization')) {
      organizationGroupExpanded.value = true
    }
  },
  { immediate: true }
)

// Hide sidebar on small screens
const showSidebar = computed(() => !smAndDown.value)

// Get navigation groups from shared config
const navigationGroups = computed(() => navigationConfig)

// Helper function to get group expansion state
const getGroupExpansion = (groupTitle: string) => {
  if (groupTitle === 'Admin Controls') return adminGroupExpanded
  if (groupTitle === 'My Organization') return organizationGroupExpanded
  return ref(true)
}

// Methods
const navigateTo = (route: string) => {
  router.push(route)
}

// Check if route is active
const isRouteActive = (routePath: string) => {
  return route.path === routePath
}

// Logout function
const handleLogout = async () => {
  await authStore.signOut()
}
</script>

<template>
  <v-navigation-drawer
      v-if="showSidebar"
      v-model="isExpanded"
      :permanent="!smAndDown"
      :temporary="smAndDown"
      app
      fixed
      class="elevation-2 sidebar-full-height"
      width="280"
      color="background"
    >
    <!-- Sidebar Header -->
    <v-list-item class="pa-4">
      <v-list-item-content>
        <v-list-item-title class="text-h6 font-weight-bold primary--text">
          Admin Panel
        </v-list-item-title>
        <v-list-item-subtitle class="text-caption grey--text">
          Management System
        </v-list-item-subtitle>
      </v-list-item-content>
    </v-list-item>

    <v-divider class="mx-4"></v-divider>

    <!-- Navigation Menu -->
    <v-list nav class="pa-2">
      <!-- Dynamic Navigation Groups -->
      <div
        v-for="group in navigationGroups"
        :key="group.title"
        class="navigation-group-section"
      >
        <!-- Group Header -->
        <v-list-item
          @click="getGroupExpansion(group.title).value = !getGroupExpansion(group.title).value"
          class="mb-1 rounded-lg group-header"
          :prepend-icon="group.icon"
          :append-icon="getGroupExpansion(group.title).value ? 'mdi-chevron-up' : 'mdi-chevron-down'"
        >
          <v-list-item-title class="font-weight-medium">
            {{ group.title }}
          </v-list-item-title>
        </v-list-item>

        <!-- Collapsible Children -->
        <v-expand-transition>
          <div v-show="getGroupExpansion(group.title).value" class="group-children">
            <v-list-item
              v-for="child in group.children"
              :key="child.title"
              @click="navigateTo(child.route)"
              class="mb-1 rounded-lg ml-4"
              :class="{ 'v-list-item--active': isRouteActive(child.route) }"
              :prepend-icon="child.icon"
            >
              <v-list-item-title class="font-weight-medium">
                {{ child.title }}
              </v-list-item-title>
            </v-list-item>
          </div>
        </v-expand-transition>
      </div>
    </v-list>

    <!-- Sidebar Footer -->
    <template v-slot:append>
      <v-divider class="mx-4 mb-2"></v-divider>

      <!-- Logout Button -->
      <v-list class="pa-2">
        <v-list-item
          @click="handleLogout"
          class="mb-2 rounded-lg logout-button"
          prepend-icon="mdi-logout"
        >
          <v-list-item-title class="font-weight-medium">
            Logout
          </v-list-item-title>
        </v-list-item>
      </v-list>

      <!-- Version Info -->
      <v-list-item class="pa-4">
        <v-list-item-content>
          <v-list-item-subtitle class="text-caption grey--text text-center">
            LCO Management System v1.0
          </v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>
    </template>
  </v-navigation-drawer>
</template>

<style scoped>

.v-navigation-drawer {
  /* Remove static background so Vuetify theme color applies */
  z-index: 1000; /* Ensure sidebar is above other content */
}

.sidebar-full-height {
  height: 100vh !important;
  top: 0 !important;
  left: 0 !important;
  position: fixed !important;
}

.v-list-item--active {
  background-color: rgba(var(--v-theme-primary), 0.1) !important;
  color: rgb(var(--v-theme-primary)) !important;
}

.v-list-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.05) !important;
}

.v-list-group__items {
  background-color: rgba(0, 0, 0, 0.02);
}

.rounded-lg {
  border-radius: 8px !important;
}

.logout-button {
  color: rgb(var(--v-theme-error)) !important;
}

.logout-button:hover {
  background-color: rgba(var(--v-theme-error), 0.1) !important;
}

.admin-controls-section,
.organization-controls-section,
.navigation-group-section {
  margin-bottom: 8px;
}

.group-header {
  background-color: rgba(var(--v-theme-surface), 0.5) !important;
  font-weight: 500;
}

.group-header:hover {
  background-color: rgba(var(--v-theme-primary), 0.08) !important;
}

.admin-children,
.organization-children,
.group-children {
  background-color: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
  padding: 4px 0;
}
</style>
