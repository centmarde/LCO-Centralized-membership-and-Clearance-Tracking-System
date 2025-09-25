<script setup lang="ts">
import { computed } from 'vue'

interface User {
  id: string
  email?: string
  full_name?: string
  student_number?: string
  role_id?: number
  status?: string
  created_at?: string
}

interface Props {
  modelValue: boolean
  user: User | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Helper functions for display formatting
const getRoleColor = (roleId: number | null | undefined): string => {
  switch (roleId) {
    case 1: return 'red' // Admin
    case 2: return 'blue' // Student
    case 3: return 'green' // Teacher/Faculty
    default: return 'grey'
  }
}

const getRoleText = (roleId: number | null | undefined): string => {
  switch (roleId) {
    case 1: return 'Admin'
    case 2: return 'Student'
    case 3: return 'Organization Leader'
    default: return 'Unknown'
  }
}

const getStatusColor = (status: string | undefined): string => {
  switch (status?.toLowerCase()) {
    case 'cleared': return 'green'
    case 'blocked': return 'red'
    case 'active': return 'blue'
    case 'inactive': return 'orange'
    case 'suspended': return 'red'
    default: return 'red' // Default to blocked color
  }
}

const getStatusText = (status: string | undefined): string => {
  const statusLower = status?.toLowerCase()
  switch (statusLower) {
    case 'cleared': return 'Cleared'
    case 'blocked': return 'Blocked'
    case 'active': return 'Active'
    case 'inactive': return 'Inactive'
    case 'suspended': return 'Suspended'
    default: return status || 'Unknown'
  }
}

const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const closeDialog = () => {
  emit('update:modelValue', false)
}
</script>

<template>
  <!-- User Details Dialog -->
  <v-dialog 
    :model-value="modelValue" 
    @update:model-value="emit('update:modelValue', $event)" 
    max-width="500px"
  >
    <v-card v-if="user" class="pa-4">
      <v-card-title class="d-flex flex-column align-center text-center">
        <v-avatar color="primary" size="80" class="mb-4">
          <v-icon size="50">mdi-account-circle</v-icon>
        </v-avatar>
        <h2 class="text-h5 mb-1">{{ user.full_name || 'User' }}</h2>
        <p class="text-body-2 text-grey">{{ user.email }}</p>
      </v-card-title>

      <v-card-text class="mt-4">
        <v-list density="compact">
          <v-list-item prepend-icon="mdi-identifier">
            <v-list-item-title>Student Number</v-list-item-title>
            <v-list-item-subtitle>{{ user.student_number || 'N/A' }}</v-list-item-subtitle>
          </v-list-item>

          <v-divider class="my-2"></v-divider>

          <v-list-item prepend-icon="mdi-account-tie">
            <v-list-item-title>Role</v-list-item-title>
            <v-list-item-subtitle>
              <v-chip :color="getRoleColor(user.role_id)" variant="tonal" size="small">
                {{ getRoleText(user.role_id) }}
              </v-chip>
            </v-list-item-subtitle>
          </v-list-item>

          <v-divider class="my-2"></v-divider>

          <v-list-item prepend-icon="mdi-list-status">
            <v-list-item-title>Status</v-list-item-title>
            <v-list-item-subtitle>
              <v-chip :color="getStatusColor(user.status)" variant="tonal" size="small">
                {{ getStatusText(user.status) }}
              </v-chip>
            </v-list-item-subtitle>
          </v-list-item>

          <v-divider class="my-2"></v-divider>

          <v-list-item prepend-icon="mdi-calendar-clock">
            <v-list-item-title>Member Since</v-list-item-title>
            <v-list-item-subtitle>{{ formatDate(user.created_at) }}</v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-card-text>

      <v-card-actions class="mt-4">
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="flat" @click="closeDialog" block>
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
