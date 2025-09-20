<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDisplay } from 'vuetify'
import { useRouter, useRoute } from 'vue-router'
import { doLogout } from '@/lib/supabase'

// Vuetify display composable for responsive design
const { smAndDown } = useDisplay()

// Vue Router
const router = useRouter()
const route = useRoute()

// Reactive state for sidebar
const isExpanded = ref(true)

// Hide sidebar on small screens
const showSidebar = computed(() => !smAndDown.value)

// Menu items structure - flat structure without parent grouping
const menuItems = ref([
  {
    title: 'Users',
    icon: 'mdi-account-multiple',
    route: '/admin/users'
  },
  {
    title: 'User Roles',
    icon: 'mdi-account-key',
    route: '/admin/user-roles'
  },
  {
    title: 'User Pages',
    icon: 'mdi-file-document-multiple',
    route: '/admin/user-pages'
  }
])

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
  await doLogout()
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
      <!-- Individual Menu Items -->
      <v-list-item
        v-for="item in menuItems"
        :key="item.title"
        @click="navigateTo(item.route)"
        class="mb-1 rounded-lg"
        :class="{ 'v-list-item--active': isRouteActive(item.route) }"
        :prepend-icon="item.icon"
      >
        <v-list-item-title class="font-weight-medium">
          {{ item.title }}
        </v-list-item-title>
      </v-list-item>
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
  background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
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
</style>
