<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthUserStore } from '@/stores/authUser'
import { useUserRolesStore } from '@/stores/roles'
import { fetchStudentEventDetailsByUserId } from '@/stores/studentsData'
import { updateStudentEventStatus } from '@/stores/eventsData'
import { supabase } from '@/lib/supabase'
import { useToast } from 'vue-toastification'

interface User {
  id: string
  email?: string
  created_at?: string
  user_metadata?: Record<string, any>
  app_metadata?: Record<string, any>
  full_name?: string
  student_number?: string
  status?: string
  organization_id?: number
  role_id?: number
  student_id?: number
}

// Composables
const authStore = useAuthUserStore()
const rolesStore = useUserRolesStore()
const toast = useToast()

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

// Reactive data
const loading = ref(false)
const search = ref('')
const userDialog = ref(false)
const editDialog = ref(false)
const selectedUser = ref<User | null>(null)
const editingUser = ref<User | null>(null)
const studentEventDetails = ref<any[]>([])
const editedEventStatuses = ref<Record<number, string>>({})
const isSaving = ref(false)
const studentEventStatusMap = ref<Record<string, any[]>>({}) // userId -> events array
const deleteDialog = ref(false)
const userToDelete = ref<User | null>(null)
const isDeleting = ref(false)

// Computed properties for status counts
const clearedCount = computed(() =>
  authStore.users.filter(user => user.status?.toLowerCase() === 'cleared').length
)

const blockedCount = computed(() =>
  authStore.users.filter(user => user.status?.toLowerCase() === 'blocked').length
)

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

// Function to get user status display with blocked events count
const getUserStatusDisplay = (user: User) => {
  if (user.role_id !== 2) {
    // For non-students, use the original status
    return {
      text: getStatusText(user.status),
      color: getStatusColor(user.status),
      showCount: false,
      blockedCount: 0
    }
  }
  
  // For students, check their event statuses
  const userEvents = studentEventStatusMap.value[user.id] || []
  const blockedEvents = userEvents.filter(event => event.status?.toLowerCase() === 'blocked')
  const clearedEvents = userEvents.filter(event => event.status?.toLowerCase() === 'cleared')
  
  if (blockedEvents.length > 0) {
    return {
      text: blockedEvents.length === 1 ? 'Blocked (1 event)' : `Blocked (${blockedEvents.length} events)`,
      color: 'red',
      showCount: true,
      blockedCount: blockedEvents.length
    }
  } else if (clearedEvents.length > 0) {
    return {
      text: 'Cleared',
      color: 'green',
      showCount: false,
      blockedCount: 0
    }
  } else {
    // No events or unknown status
    return {
      text: getStatusText(user.status),
      color: getStatusColor(user.status),
      showCount: false,
      blockedCount: 0
    }
  }
}

// Table headers
const headers = [
  { title: 'Full Name', key: 'full_name', sortable: true },
  { title: 'Email', key: 'email', sortable: true },
  { title: 'Student Number', key: 'student_number', sortable: true },
  { title: 'Role', key: 'role_id', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Created At', key: 'created_at', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false },
]

// Methods
const fetchUsers = async () => {
  loading.value = true
  try {
    const result = await authStore.getAllUsers()

    if (result.error) {
      toast.error('Failed to fetch users: ' + getErrorMessage(result.error))
      console.error('Error fetching users:', result.error)
      return
    }

    // Users are now stored in authStore.users reactively
    if (result.users) {
      // toast.success(`Loaded ${result.users.length} users`)
    }
  } catch (error) {
    toast.error('An unexpected error occurred while fetching users')
    console.error('Unexpected error:', error)
  } finally {
    loading.value = false
  }
}

// Fetch event status data for all students
const fetchStudentEventStatuses = async () => {
  try {
    // Get all students from the user list (users with role_id === 2 AND student_id exists)
    const students = authStore.users.filter(user => user.role_id === 2 && user.student_id)
    
    // Clear the current map
    studentEventStatusMap.value = {}
    
    // Fetch event details for each student
    for (const student of students) {
      try {
        const eventDetails = await fetchStudentEventDetailsByUserId(student.id)
        studentEventStatusMap.value[student.id] = eventDetails
      } catch (error: any) {
        // Only log unexpected errors, not "student record not found" which is expected for non-students
        if (error?.code !== 'PGRST116' && error?.message !== 'Could not find student record') {
          console.error(`Failed to fetch events for student ${student.id}:`, error)
        }
        // Set empty array for students with fetch errors
        studentEventStatusMap.value[student.id] = []
      }
    }
  } catch (error) {
    console.error('Error fetching student event statuses:', error)
  }
}

// Combined refresh function
const refreshData = async () => {
  await fetchUsers()
  await fetchStudentEventStatuses()
}

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
    case 3: return 'Faculty'
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

const viewUser = (user: User) => {
  selectedUser.value = user
  userDialog.value = true
}

const editUser = async (user: User) => {
  editingUser.value = { ...user }
  studentEventDetails.value = []
  editedEventStatuses.value = {}

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
  
  editDialog.value = true
}

const saveUser = async () => {
  if (!editingUser.value) return
  
  isSaving.value = true
  try {
    let hasChanges = false

    // Update role if changed
    if (editingUser.value.role_id !== selectedUser.value?.role_id) {
      const { error } = await authStore.updateUser(editingUser.value.id, { 
        role_id: editingUser.value.role_id 
      })
      if (error) {
        toast.error('Failed to update user role')
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
      await refreshData() // Refresh the user list and student event statuses
    } else {
      toast.info('No changes were made.')
    }

    editDialog.value = false
  } catch (error) {
    console.error('Error saving user:', error)
    toast.error('Failed to update user')
  } finally {
    isSaving.value = false
  }
}

const deleteUser = (user: User) => {
  userToDelete.value = user
  deleteDialog.value = true
}

const confirmDelete = async () => {
  if (!userToDelete.value) return
  
  isDeleting.value = true
  try {
    const result = await authStore.deleteUser(userToDelete.value.id)
    
    if (result.error) {
      toast.error('Failed to delete user: ' + getErrorMessage(result.error))
      console.error('Error deleting user:', result.error)
      return
    }

    toast.success(`User ${userToDelete.value.full_name || userToDelete.value.email} deleted successfully!`)
    await refreshData() // Refresh the user list and student event statuses
    
  } catch (error) {
    toast.error('An unexpected error occurred while deleting user')
    console.error('Unexpected error:', error)
  } finally {
    isDeleting.value = false
    deleteDialog.value = false
    userToDelete.value = null
  }
}

const cancelDelete = () => {
  deleteDialog.value = false
  userToDelete.value = null
}

// Lifecycle
onMounted(async () => {
  await refreshData()
  await rolesStore.fetchRoles()
})
</script>

<template>
  <v-card class="mt-5">
    <v-card-title class="d-flex justify-space-between align-center">
      <div>
        <h3>User Management</h3>
        <p class="text-subtitle-1 text-grey">Manage all system users</p>
      </div>
      <v-btn
        color="primary"
        prepend-icon="mdi-refresh"
        @click="refreshData"
        :loading="loading"
      >
        Refresh
      </v-btn>
    </v-card-title>

    <!-- Status Summary -->
    <v-card-subtitle>
      <v-row class="ma-0">
        <v-col cols="auto" class="pa-1">
          <v-chip color="green" variant="tonal" size="small">
            <v-icon left size="small">mdi-check-circle</v-icon>
            Cleared: {{ clearedCount }}
          </v-chip>
        </v-col>
        <v-col cols="auto" class="pa-1">
          <v-chip color="red" variant="tonal" size="small">
            <v-icon left size="small">mdi-block-helper</v-icon>
            Blocked: {{ blockedCount }}
          </v-chip>
        </v-col>
        <v-col cols="auto" class="pa-1">
          <v-chip color="blue" variant="tonal" size="small">
            <v-icon left size="small">mdi-account-group</v-icon>
            Total: {{ authStore.users.length }}
          </v-chip>
        </v-col>
      </v-row>
    </v-card-subtitle>

    <v-card-text>
      <v-data-table
        :headers="headers"
        :items="authStore.users"
        :loading="loading"
        class="elevation-1"
        item-key="id"
        :search="search"
        show-current-page
      >
        <template v-slot:top>
          <v-row class="ma-2">
            <v-col cols="12" md="4">
              <v-text-field
                v-model="search"
                prepend-inner-icon="mdi-magnify"
                label="Search users..."
                single-line
                hide-details
                clearable
              />
            </v-col>
          </v-row>
        </template>

        <template v-slot:item.role_id="{ item }">
          <v-chip
            :color="getRoleColor(item.role_id)"
            variant="tonal"
            size="small"
          >
            {{ getRoleText(item.role_id) }}
          </v-chip>
        </template>

        <template v-slot:item.status="{ item }">
          <v-chip
            :color="getUserStatusDisplay(item).color"
            variant="tonal"
            size="small"
          >
            {{ getUserStatusDisplay(item).text }}
          </v-chip>
        </template>

        <template v-slot:item.created_at="{ item }">
          {{ formatDate(item.created_at) }}
        </template>

        <template v-slot:item.actions="{ item }">
          <v-btn
            icon="mdi-eye"
            variant="text"
            size="small"
            @click="viewUser(item)"
          >
          </v-btn>
          <v-btn
            icon="mdi-pencil"
            variant="text"
            size="small"
            @click="editUser(item)"
            color="primary"
          >
          </v-btn>
          <v-btn
            icon="mdi-delete"
            variant="text"
            size="small"
            @click="deleteUser(item)"
            color="error"
          >
          </v-btn>
        </template>

        <template v-slot:no-data>
          <div class="text-center pa-4">
            <v-icon size="64" color="grey">mdi-account-off</v-icon>
            <p class="text-h6 mt-4">No users found</p>
            <p class="text-body-2 text-grey">There are no users in the system yet.</p>
          </div>
        </template>

        <template v-slot:loading>
          <v-skeleton-loader type="table-row@10"></v-skeleton-loader>
        </template>
      </v-data-table>
    </v-card-text>

    <!-- User Details Dialog -->
    <v-dialog v-model="userDialog" max-width="500px">
      <v-card v-if="selectedUser" class="pa-4">
        <v-card-title class="d-flex flex-column align-center text-center">
          <v-avatar color="primary" size="80" class="mb-4">
            <v-icon size="50">mdi-account-circle</v-icon>
          </v-avatar>
          <h2 class="text-h5 mb-1">{{ selectedUser.full_name || 'User' }}</h2>
          <p class="text-body-2 text-grey">{{ selectedUser.email }}</p>
        </v-card-title>

        <v-card-text class="mt-4">
          <v-list density="compact">
            <v-list-item prepend-icon="mdi-identifier">
              <v-list-item-title>Student Number</v-list-item-title>
              <v-list-item-subtitle>{{ selectedUser.student_number || 'N/A' }}</v-list-item-subtitle>
            </v-list-item>

            <v-divider class="my-2"></v-divider>

            <v-list-item prepend-icon="mdi-account-tie">
              <v-list-item-title>Role</v-list-item-title>
              <v-list-item-subtitle>
                <v-chip :color="getRoleColor(selectedUser.role_id)" variant="tonal" size="small">
                  {{ getRoleText(selectedUser.role_id) }}
                </v-chip>
              </v-list-item-subtitle>
            </v-list-item>

            <v-divider class="my-2"></v-divider>

            <v-list-item prepend-icon="mdi-list-status">
              <v-list-item-title>Status</v-list-item-title>
              <v-list-item-subtitle>
                <v-chip :color="getStatusColor(selectedUser.status)" variant="tonal" size="small">
                  {{ getStatusText(selectedUser.status) }}
                </v-chip>
              </v-list-item-subtitle>
            </v-list-item>

            <v-divider class="my-2"></v-divider>

            <v-list-item prepend-icon="mdi-calendar-clock">
              <v-list-item-title>Member Since</v-list-item-title>
              <v-list-item-subtitle>{{ formatDate(selectedUser.created_at) }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>

        <v-card-actions class="mt-4">
          <v-spacer></v-spacer>
          <v-btn color="primary" variant="flat" @click="userDialog = false" block>
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit User Dialog -->
    <v-dialog v-model="editDialog" max-width="800px" persistent>
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
          <v-btn color="grey" variant="text" @click="editDialog = false">
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

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="deleteDialog" max-width="500px" persistent>
      <v-card>
        <v-card-title class="text-h5 text-center">
          <v-icon color="error" size="large" class="mb-2">mdi-alert-circle</v-icon>
          <div>Confirm Deletion</div>
        </v-card-title>
        
        <v-card-text class="text-center">
          <div class="mb-4">
            <p>Are you sure you want to delete this user?</p>
            <div v-if="userToDelete" class="mt-4 pa-3 bg-grey-lighten-4 rounded">
              <div class="text-h6 font-weight-bold">{{ userToDelete.full_name || 'No Name' }}</div>
              <div class="text-body-2 text-grey-darken-1">{{ userToDelete.email }}</div>
              <div v-if="userToDelete.student_number" class="text-body-2 text-grey-darken-1">
                Student Number: {{ userToDelete.student_number }}
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

        <v-card-actions>
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
  </v-card>
</template>

<style scoped>
.v-card-title h3 {
  margin-bottom: 4px;
}
</style>
