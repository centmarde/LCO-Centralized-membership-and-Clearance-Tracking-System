<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAuthUserStore } from '@/stores/authUser'
import { useToast } from 'vue-toastification'

interface User {
  id: string
  email?: string
  full_name?: string
  student_number?: string
  role_id?: number
}

interface Props {
  modelValue: boolean
  user: User | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'deleted'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const authStore = useAuthUserStore()
const toast = useToast()

const isDeleting = ref(false)

// Helper function to extract error messages
const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') {
    return error
  }
  if (error?.message) {
    return error.message
  }
  if (error?.msg) {
    return error.msg
  }
  return 'Unknown error occurred'
}

// Helper function to get role text
const getRoleText = (roleId: number | null | undefined): string => {
  switch (roleId) {
    case 1: return 'Admin'
    case 2: return 'Student'
    case 3: return 'Faculty'
    default: return 'Unknown'
  }
}

const confirmDelete = async () => {
  if (!props.user) return
  
  isDeleting.value = true
  try {
    const result = await authStore.deleteUser(props.user.id)
    
    if (result.error) {
      toast.error('Failed to delete user: ' + getErrorMessage(result.error))
      console.error('Error deleting user:', result.error)
      return
    }

    toast.success(`User ${props.user.full_name || props.user.email} deleted successfully!`)
    emit('deleted') // Emit event to refresh data in parent
    cancelDelete()
    
  } catch (error) {
    toast.error('An unexpected error occurred while deleting user')
    console.error('Unexpected error:', error)
  } finally {
    isDeleting.value = false
  }
}

const cancelDelete = () => {
  emit('update:modelValue', false)
}
</script>

<template>
  <!-- Delete Confirmation Dialog -->
  <v-dialog :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)" max-width="500px" persistent>
    <v-card>
      <v-card-title class="text-h5 text-center mt-3">
        <v-icon color="error" size="large" class="mb-2">mdi-alert-circle</v-icon>
        <div>Confirm Deletion</div>
      </v-card-title>
      
      <v-card-text class="text-center">
        <div class="mb-4">
          <p>Are you sure you want to delete this user?</p>
          <div v-if="user" class="mt-4 pa-3 bg-grey-lighten-4 rounded">
            <div class="text-h6 font-weight-bold">{{ user.full_name || 'No Name' }}</div>
            <div class="text-body-2 text-grey-darken-1">{{ user.email }}</div>
            <div v-if="user.student_number" class="text-body-2 text-grey-darken-1">
              Student Number: {{ user.student_number }}
            </div>
            <div class="text-body-2 text-grey-darken-1">
              Role: {{ getRoleText(user.role_id) }}
            </div>
          </div>
        </div>
        <v-alert
          type="warning"
          variant="tonal"
          class="text-left"
        >
          <strong>Warning:</strong> This action cannot be undone. All associated data including student records and event registrations will be permanently deleted.
        </v-alert>
      </v-card-text>

      <v-card-actions class="ma-4">
        <v-spacer />
        <v-btn
          color="grey"
          variant="text"
          @click="cancelDelete"
          :disabled="isDeleting"
        >
          Cancel
        </v-btn>
        <v-btn
          color="error"
          variant="flat"
          @click="confirmDelete"
          :loading="isDeleting"
        >
          Delete User
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
