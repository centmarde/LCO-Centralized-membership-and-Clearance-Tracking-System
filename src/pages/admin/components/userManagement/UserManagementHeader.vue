<script setup lang="ts">
interface Props {
  loading?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  refresh: []
}>()
</script>

<template>
  <v-card class="mb-6" elevation="7" rounded="lg">
    <v-card-title class="pa-4 bg-primary text-white">
      <!-- Mobile Layout -->
      <div class="d-block d-sm-none w-100">
        <div class="d-flex align-center justify-space-between mb-3">
          <div class="d-flex align-center">
            <v-icon size="28" class="me-2">mdi-account-group</v-icon>
            <h2 class="text-h6 font-weight-bold">User Management</h2>
          </div>
          <v-btn
            color="white"
            variant="elevated"
            size="small"
            @click="emit('refresh')"
            :loading="loading"
            icon
          >
            <v-icon>mdi-refresh</v-icon>
          </v-btn>
        </div>
        <p class="text-body-2 mb-0 opacity-90">Manage all system users</p>
      </div>

      <!-- Desktop Layout -->
      <div class="d-none d-sm-flex align-center justify-space-between w-100">
        <div class="d-flex align-center">
          <v-icon size="32" class="me-3">mdi-account-group</v-icon>
          <div>
            <h2 class="text-h5 font-weight-bold mb-1">User Management</h2>
            <p class="text-body-2 mb-0 opacity-90">Manage all system users</p>
          </div>
        </div>
        <v-btn
          color="white"
          variant="elevated"
          size="default"
          @click="emit('refresh')"
          :loading="loading"
          prepend-icon="mdi-refresh"
        >
          Refresh
        </v-btn>
      </div>
    </v-card-title>
  </v-card>
</template>
