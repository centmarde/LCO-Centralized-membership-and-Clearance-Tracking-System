<template>
  <InnerLayoutWrapper>
    <template #content>
      <v-container fluid class="fill-height">
        <v-row justify="center" align="center" class="fill-height">
          <v-col cols="12" md="8" lg="6">
            <v-card elevation="4" class="pa-6">
              <v-card-title class="text-h4 text-center mb-4">
                Welcome Home!
              </v-card-title>

              <v-card-text class="text-center">
                <v-avatar size="80" class="mb-4" color="primary">
                  <v-icon size="40" color="white">mdi-account-circle</v-icon>
                </v-avatar>

                <p class="text-h6 mb-2">Hello, {{ userName }}!</p>
                <p class="text-body-1 text-medium-emphasis mb-4">
                  You are successfully logged in.
                </p>

                <v-chip
                  color="success"
                  variant="tonal"
                  class="mb-4"
                  prepend-icon="mdi-check-circle"
                >
                  Authenticated
                </v-chip>
              </v-card-text>

              <v-card-actions class="justify-center pt-4">
                <v-btn
                  color="error"
                  variant="elevated"
                  size="large"
                  prepend-icon="mdi-logout"
                  :loading="loading"
                  @click="handleLogout"
                  class="px-8"
                >
                  Logout
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </template>
  </InnerLayoutWrapper>
</template>

<script setup lang="ts">
import { useAuthUserStore } from '@/stores/authUser'
import { useToast } from 'vue-toastification'
import InnerLayoutWrapper from '@/layouts/InnerLayoutWrapper.vue'

const authStore = useAuthUserStore()
const toast = useToast()

// Reactive references from the auth store
const { userName, loading } = storeToRefs(authStore)

const handleLogout = async () => {
  try {
    const result = await authStore.signOut()

    if (result.error) {
      toast.error('Logout failed: ' + result.error.message)
    } else {
      toast.success('You have been logged out successfully')
    }
  } catch (error) {
    console.error('Logout error:', error)
    toast.error('An unexpected error occurred during logout')
  }
}
</script>
