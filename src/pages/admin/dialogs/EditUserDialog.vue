<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAuthUserStore } from '@/stores/authUser'
import { useUserRolesStore } from '@/stores/roles'
import { fetchStudentEventDetailsByUserId } from '@/stores/studentsData'
import { updateStudentEventStatus } from '@/stores/eventsData'
import { useToast } from 'vue-toastification'
import { getStatusColor, getStatusText } from '@/utils/helpers'

interface User {
  id: string
  email?: string
  full_name?: string
  student_number?: string
  role_id?: number
  student_id?: number
}

interface Props {
  modelValue: boolean
  user: User | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'user-updated'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const authStore = useAuthUserStore()
const rolesStore = useUserRolesStore()
const toast = useToast()

const loading = ref(false)
const isSaving = ref(false)
const editingUser = ref<User | null>(null)
const studentEventDetails = ref<any[]>([])
const editedEventStatuses = ref<Record<number, string>>({})

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

// Computed property to count changes
const changesCount = computed(() => {
  let count = 0
  for (const eventId in editedEventStatuses.value) {
    const originalEvent = studentEventDetails.value.find(e => e.event_id === parseInt(eventId))
    if (originalEvent && originalEvent.status !== editedEventStatuses.value[parseInt(eventId)]) {
      count++
    }
  }
  return count
})

// Watch for user changes to load data
watch(() => props.user, async (newUser) => {
  if (newUser && props.modelValue) {
    await loadUserData(newUser)
  }
}, { immediate: true })

// Watch for dialog opening
watch(() => props.modelValue, async (isOpen) => {
  if (isOpen && props.user) {
    await loadUserData(props.user)
  }
})

const loadUserData = async (user: User) => {
  editingUser.value = { ...user }
  studentEventDetails.value = []
  editedEventStatuses.value = {}
  loading.value = true

  // If the user is a student (role_id === 2), fetch their event details
  if (user.role_id === 2) {
    try {
      const eventDetails = await fetchStudentEventDetailsByUserId(user.id)
      studentEventDetails.value = eventDetails
      
      // Pre-populate the status dropdowns with current values
      eventDetails.forEach(event => {
        // Ensure the status is either 'cleared' or 'blocked', default to 'blocked' if neither
        const currentStatus = event.status?.toLowerCase()
        editedEventStatuses.value[event.event_id] = 
          currentStatus === 'cleared' || currentStatus === 'blocked' 
            ? currentStatus 
            : 'blocked'
      })
    } catch (error) {
      console.error('Error fetching student events:', error)
      toast.error('Failed to fetch student event details')
    }
  }
  
  loading.value = false
}

const saveUser = async () => {
  if (!editingUser.value) return
  
  isSaving.value = true
  try {
    let hasChanges = false

    // Update role if changed
    if (editingUser.value.role_id !== props.user?.role_id) {
      const { error } = await authStore.updateUser(editingUser.value.id, { 
        role_id: editingUser.value.role_id 
      })
      if (error) {
        toast.error('Failed to update user role: ' + getErrorMessage(error))
        return
      }
      hasChanges = true
    }

    // Update event statuses for students
    if (editingUser.value.role_id === 2 && editingUser.value.student_id) {
      for (const eventId in editedEventStatuses.value) {
        const newStatus = editedEventStatuses.value[parseInt(eventId)]
        const originalEvent = studentEventDetails.value.find(e => e.event_id === parseInt(eventId))
        
        if (originalEvent && originalEvent.status !== newStatus) {
          try {
            await updateStudentEventStatus(
              editingUser.value.student_id, // Use the student_id from the user object
              parseInt(eventId),
              newStatus
            )
            hasChanges = true
          } catch (error) {
            console.error('Error updating event status:', error)
            toast.error(`Failed to update status for event ${originalEvent.events?.title}`)
          }
        }
      }
    }

    if (hasChanges) {
      toast.success('User updated successfully!')
      emit('user-updated') // Notify parent to refresh data
    } else {
      toast.info('No changes were made.')
    }

    emit('update:modelValue', false)
  } catch (error) {
    console.error('Error saving user:', error)
    toast.error('Failed to update user')
  } finally {
    isSaving.value = false
  }
}

const cancelEdit = () => {
  emit('update:modelValue', false)
}
</script>

<template>
  <!-- Edit User Dialog -->
  <v-dialog 
    :model-value="modelValue" 
    @update:model-value="emit('update:modelValue', $event)" 
    max-width="800px" 
    persistent
  >
    <v-card v-if="editingUser">
      <v-card-title class="d-flex flex-column align-center text-center mt-3">
        <v-avatar color="primary" size="80" class="mb-4">
          <v-icon size="50">mdi-account-edit</v-icon>
        </v-avatar>
        <h2 class="text-h5 mb-1">{{ editingUser.full_name || 'User' }}</h2>
        <p class="text-body-2 text-grey">{{ editingUser.email }}</p>
      </v-card-title>
      <v-card-text>
        <v-container>
          <v-row>
            <v-col cols="12">
              <v-select
                v-model="editingUser.role_id"
                :items="rolesStore.roles"
                item-title="title"
                item-value="id"
                label="Role"
                :loading="rolesStore.loading"
              />
            </v-col>
          </v-row>

          <!-- Student Event Statuses -->
          <template v-if="editingUser.role_id === 2">
            <v-divider class="my-4" />
            <h3 class="text-h6 mb-2">Event Clearance Status</h3>
            <v-progress-linear v-if="loading" indeterminate color="primary" />
            <v-list v-else-if="studentEventDetails.length > 0">
              <v-list-item
                v-for="(eventDetail, index) in studentEventDetails"
                :key="eventDetail.event_id"
                class="mb-2"
              >
                <template #prepend>
                  <v-avatar size="40" color="primary" class="mr-3">
                    <v-icon>mdi-calendar-check</v-icon>
                  </v-avatar>
                </template>
                
                <v-list-item-title class="font-weight-medium">
                  {{ eventDetail.events?.title || 'Unknown Event' }}
                </v-list-item-title>
                <v-list-item-subtitle class="d-flex align-center mt-1">
                  <v-icon size="16" class="mr-1">mdi-calendar</v-icon>
                  {{ eventDetail.events?.date ? new Date(eventDetail.events.date).toLocaleDateString() : 'No date' }}
                  <v-spacer />
                  <span class="text-caption mr-2">Current:</span>
                  <v-chip 
                    :color="getStatusColor(eventDetail.status)" 
                    variant="tonal" 
                    size="small"
                    class="mr-2"
                  >
                    {{ getStatusText(eventDetail.status) }}
                  </v-chip>
                </v-list-item-subtitle>
                
                <template #append>
                  <div class="d-flex flex-column align-end">
                    <span class="text-caption mb-1">Update to:</span>
                    <div class="d-flex align-center">
                      <v-select
                        v-model="editedEventStatuses[eventDetail.event_id]"
                        :items="[
                          { title: 'Cleared', value: 'cleared' },
                          { title: 'Blocked', value: 'blocked' }
                        ]"
                        item-title="title"
                        item-value="value"
                        density="compact"
                        style="min-width: 120px;"
                        hide-details
                        variant="outlined"
                      />
                      <v-icon
                        v-if="editedEventStatuses[eventDetail.event_id] !== eventDetail.status"
                        color="warning"
                        size="20"
                        class="ml-2"
                        title="Status will be changed"
                      >
                        mdi-pencil-circle
                      </v-icon>
                    </div>
                  </div>
                </template>
              </v-list-item>
            </v-list>
            <v-alert v-else type="info" variant="tonal">
              This student is not registered for any events.
            </v-alert>
            
            <!-- Changes Summary -->
            <template v-if="studentEventDetails.length > 0">
              <v-divider class="my-4" />
              <v-card variant="outlined" class="pa-3">
                <v-card-title class="text-subtitle-1 pa-0 mb-2">
                  <v-icon class="mr-2">mdi-file-document-edit</v-icon>
                  Changes Summary
                </v-card-title>
                <div v-if="changesCount > 0">
                  <v-chip color="warning" variant="tonal" size="small">
                    {{ changesCount }} event status{{ changesCount > 1 ? 'es' : '' }} will be updated
                  </v-chip>
                </div>
                <div v-else>
                  <v-chip color="success" variant="tonal" size="small">
                    No changes to event statuses
                  </v-chip>
                </div>
              </v-card>
            </template>
          </template>
        </v-container>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="grey" variant="text" @click="cancelEdit">
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          @click="saveUser"
          :loading="isSaving"
        >
          Save
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
