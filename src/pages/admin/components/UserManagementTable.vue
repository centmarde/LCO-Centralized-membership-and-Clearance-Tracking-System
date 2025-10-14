<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useDisplay } from 'vuetify'
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
const { xs, smAndDown, mdAndUp } = useDisplay()
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
const page = ref(1)
const itemsPerPage = ref(4)

// Function to get user status display with blocked events count (using helper function)
const getUserStatusDisplayForUser = (user: User): UserStatusDisplay => {
  const userEvents = studentEventStatusMap.value[user.id] || []
  return getUserStatusDisplay(user, userEvents)
}

// Computed filtered and paginated users
const filteredUsers = computed(() => {
  if (!search.value) {
    return authStore.users
  }
  const searchLower = search.value.toLowerCase()
  return authStore.users.filter(user =>
    user.full_name?.toLowerCase().includes(searchLower) ||
    user.email?.toLowerCase().includes(searchLower) ||
    user.student_number?.toLowerCase().includes(searchLower)
  )
})

const totalPages = computed(() => {
  return Math.ceil(filteredUsers.value.length / itemsPerPage.value)
})

const paginatedUsers = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredUsers.value.slice(start, end)
})

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
  <div class="mt-5">
    <v-card-title
      :class="[
        'd-flex',
        'align-center',
        smAndDown ? 'flex-column' : 'justify-space-between',
        smAndDown ? 'gap-3' : ''
      ]"
    >
      <div :class="smAndDown ? 'text-center' : ''">
        <h3 :class="xs ? 'text-h6' : 'text-h5'">User Management</h3>
        <p :class="xs ? 'text-caption' : 'text-subtitle-1'" class="text-grey">
          Manage all system users
        </p>
      </div>
      <v-btn
        color="primary"
        :prepend-icon="smAndDown ? undefined : 'mdi-refresh'"
        :icon="xs ? 'mdi-refresh' : undefined"
        @click="refreshData"
        :loading="loading"
        :size="xs ? 'default' : 'large'"
        :block="smAndDown && !xs"
        :variant="xs ? 'elevated' : undefined"
      >
        <v-icon v-if="xs" color="white">mdi-refresh</v-icon>
        <span v-if="!xs">Refresh</span>
      </v-btn>
    </v-card-title>

    <!-- Status Summary -->
    <StatusSummary :users="authStore.users" />

    <v-card-text>
      <!-- Search Bar -->
      <v-row class="mb-4">
        <v-col cols="12" md="6">
          <v-text-field
            v-model="search"
            prepend-inner-icon="mdi-magnify"
            label="Search users..."
            single-line
            hide-details
            clearable
            variant="outlined"
            density="comfortable"
          />
        </v-col>
      </v-row>

      <!-- Loading State -->
      <div v-if="loading" class="d-flex flex-column gap-4">
        <v-skeleton-loader
          v-for="i in 4"
          :key="i"
          type="card"
          class="mb-4"
        ></v-skeleton-loader>
      </div>

      <!-- No Data State -->
      <div v-else-if="filteredUsers.length === 0" class="text-center pa-8">
        <v-icon size="64" color="grey">mdi-account-off</v-icon>
        <p class="text-h6 mt-4">No users found</p>
        <p class="text-body-2 text-grey">
          {{ search ? 'No users match your search criteria.' : 'There are no users in the system yet.' }}
        </p>
      </div>

      <!-- User Cards Grid -->
      <v-row v-else>
        <v-col
          v-for="user in paginatedUsers"
          :key="user.id"
          cols="12"
          sm="6"
          md="6"
          lg="3"
        >
          <v-card class="user-card" elevation="2" hover>
            <v-card-title class="d-flex align-center pb-2">
              <v-avatar color="primary" size="40" class="mr-3">
                <span class="text-h6">{{ user.full_name?.charAt(0).toUpperCase() || '?' }}</span>
              </v-avatar>
              <div class="text-truncate flex-grow-1">
                <div class="text-subtitle-1 font-weight-bold text-truncate">
                  {{ user.full_name || 'N/A' }}
                </div>
                <div class="text-caption text-grey">
                  {{ user.student_number || 'No ID' }}
                </div>
              </div>
            </v-card-title>

            <v-divider></v-divider>

            <v-card-text>
              <div class="user-info mb-3">
                <div class="d-flex align-center mb-2">
                  <v-icon size="small" class="mr-2">mdi-email</v-icon>
                  <span class="text-body-2 text-truncate">{{ user.email || 'N/A' }}</span>
                </div>
                <div class="d-flex align-center mb-2">
                  <v-icon size="small" class="mr-2">mdi-calendar</v-icon>
                  <span class="text-body-2">{{ formatDate(user.created_at) }}</span>
                </div>
              </div>

              <div class="d-flex flex-wrap gap-2 mb-3">
                <v-chip
                  :color="getRoleColor(user.role_id)"
                  variant="tonal"
                  size="small"
                  label
                >
                  <v-icon start size="small">mdi-shield-account</v-icon>
                  {{ getRoleText(user.role_id) }}
                </v-chip>
                <v-chip
                  :color="getUserStatusDisplayForUser(user).color"
                  variant="tonal"
                  size="small"
                  label
                >
                  <v-icon start size="small">mdi-circle</v-icon>
                  {{ getUserStatusDisplayForUser(user).text }}
                </v-chip>
              </div>
            </v-card-text>

            <v-divider></v-divider>

            <v-card-actions class="justify-space-between px-4">
              <v-btn
                icon="mdi-eye"
                variant="text"
                size="small"
                @click="viewUser(user)"
                color="info"
              >
                <v-icon>mdi-eye</v-icon>
                <v-tooltip activator="parent" location="top">View Details</v-tooltip>
              </v-btn>
              <v-btn
                icon="mdi-pencil"
                variant="text"
                size="small"
                @click="editUser(user)"
                color="primary"
              >
                <v-icon>mdi-pencil</v-icon>
                <v-tooltip activator="parent" location="top">Edit User</v-tooltip>
              </v-btn>
              <v-btn
                icon="mdi-delete"
                variant="text"
                size="small"
                @click="deleteUser(user)"
                color="error"
              >
                <v-icon>mdi-delete</v-icon>
                <v-tooltip activator="parent" location="top">Delete User</v-tooltip>
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>

      <!-- Pagination -->
      <v-row v-if="!loading && filteredUsers.length > 0" class="mt-4">
        <v-col cols="12" class="d-flex justify-center align-center">
          <v-pagination
            v-model="page"
            :length="totalPages"
            :total-visible="5"
            rounded="circle"
            show-first-last-page
          ></v-pagination>
        </v-col>
        <v-col cols="12" class="text-center">
          <span class="text-body-2 text-grey">
            Showing {{ (page - 1) * itemsPerPage + 1 }} -
            {{ Math.min(page * itemsPerPage, filteredUsers.length) }}
            of {{ filteredUsers.length }} users
          </span>
        </v-col>
      </v-row>
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
  </div>
</template>

<style scoped>
.v-card-title h3 {
  margin-bottom: 4px;
}

.user-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease-in-out;
}

.user-card:hover {
  transform: translateY(-4px);
}

.user-info {
  min-height: 60px;
}

.gap-2 {
  gap: 8px;
}

.gap-4 {
  gap: 16px;
}
</style>
