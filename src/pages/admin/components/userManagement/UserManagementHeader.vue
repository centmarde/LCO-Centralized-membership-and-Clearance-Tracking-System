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
    <v-card-title class="pa-3 pa-sm-4 bg-primary text-white">
      <!-- Mobile Layout (xs to sm) -->
      <div class="d-block d-md-none w-100">
        <div class="d-flex align-center justify-space-between mb-2">
          <div class="d-flex align-center">
            <v-icon size="20" class="me-2">mdi-account-group</v-icon>
            <h2 class="text-subtitle-1 font-weight-bold">User Management</h2>
          </div>
          <v-btn
            color="white"
            variant="elevated"
            size="x-small"
            @click="emit('refresh')"
            :loading="loading"
            icon
            density="compact"
          >
            <v-icon size="16">mdi-refresh</v-icon>
          </v-btn>
        </div>
        <p class="text-caption mb-0 opacity-80">Manage all system users</p>
      </div>

      <!-- Tablet Layout (sm to md) -->
      <div class="d-none d-sm-block d-md-none w-100">
        <div class="d-flex align-center justify-space-between mb-2">
          <div class="d-flex align-center">
            <v-icon size="24" class="me-2">mdi-account-group</v-icon>
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
            <v-icon size="18">mdi-refresh</v-icon>
          </v-btn>
        </div>
        <p class="text-body-2 mb-0 opacity-85">Manage all system users</p>
      </div>

      <!-- Desktop Layout (md and up) -->
      <div class="d-none d-md-flex align-center justify-space-between w-100">
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
