<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthUserStore } from '@/stores/authUser'
import { useUserRolesStore } from '@/stores/roles'
import { fetchStudentEventDetailsByUserId } from '@/stores/studentsData'
import { updateStudentEventStatus } from '@/stores/eventsData'
import { supabase } from '@/lib/supabase'
import { useToast } from 'vue-toastification'
import DeleteUserDialog from '@/pages/admin/dialogs/DeleteUserDialog.vue'
import EditUserDialog from '@/pages/admin/dialogs/EditUserDialog.vue'
import UserDetailsDialog from '@/pages/admin/dialogs/UserDetailsDialog.vue'
import StatusSummary from '@/pages/admin/components/StatusSummary.vue'
import { 
  getRoleColor, 
  getRoleText, 
  getStatusColor, 
  getStatusText, 
  formatDate, 
  getUserStatusDisplay,
  getErrorMessage,
  type UserStatusDisplay 
} from '@/utils/helpers'

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

// Reactive data
const loading = ref(false)
const search = ref('')
const userDialog = ref(false)
const editDialog = ref(false)
const selectedUser = ref<User | null>(null)
const editingUser = ref<User | null>(null)
const studentEventStatusMap = ref<Record<string, any[]>>({}) // userId -> events array
const deleteDialog = ref(false)
const userToDelete = ref<User | null>(null)

// Function to get user status display with blocked events count (using helper function)
const getUserStatusDisplayForUser = (user: User): UserStatusDisplay => {
  const userEvents = studentEventStatusMap.value[user.id] || []
  return getUserStatusDisplay(user, userEvents)
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

const viewUser = (user: User) => {
  selectedUser.value = user
  userDialog.value = true
}

const editUser = (user: User) => {
  editingUser.value = user
  editDialog.value = true
}

const onUserUpdated = async () => {
  await refreshData() // Refresh the user list and student event statuses
}

const deleteUser = (user: User) => {
  userToDelete.value = user
  deleteDialog.value = true
}

const onUserDeleted = async () => {
  await refreshData() // Refresh the user list and student event statuses
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
    <StatusSummary :users="authStore.users" />

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
            :color="getUserStatusDisplayForUser(item).color"
            variant="tonal"
            size="small"
          >
            {{ getUserStatusDisplayForUser(item).text }}
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
    <UserDetailsDialog 
      v-model="userDialog" 
      :user="selectedUser"
    />

    <!-- Edit User Dialog -->
    <EditUserDialog 
      v-model="editDialog" 
      :user="editingUser" 
      @user-updated="onUserUpdated"
    />

    <!-- Delete User Dialog -->
    <DeleteUserDialog 
      v-model="deleteDialog" 
      :user="userToDelete" 
      @user-deleted="onUserDeleted"
    />
  </v-card>
</template>

<style scoped>
.v-card-title h3 {
  margin-bottom: 4px;
}
</style>
