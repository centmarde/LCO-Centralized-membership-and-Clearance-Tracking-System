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
        @click="fetchUsers"
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
            Total: {{ users.length }}
          </v-chip>
        </v-col>
      </v-row>
    </v-card-subtitle>

    <v-card-text>
      <v-data-table
        :headers="headers"
        :items="users"
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
            :color="getStatusColor(item.status)"
            variant="tonal"
            size="small"
          >
            {{ getStatusText(item.status) }}
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
    <v-dialog v-model="userDialog" max-width="600px">
      <v-card v-if="selectedUser">
        <v-card-title>
          <span class="text-h5">User Details</span>
        </v-card-title>
        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  label="Full Name"
                  :model-value="selectedUser.full_name"
                  readonly
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  label="Email"
                  :model-value="selectedUser.email"
                  readonly
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  label="Student Number"
                  :model-value="selectedUser.student_number || 'N/A'"
                  readonly
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  label="Role"
                  :model-value="getRoleText(selectedUser.role_id)"
                  readonly
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  label="Status"
                  :model-value="selectedUser.status"
                  readonly
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  label="Created At"
                  :model-value="formatDate(selectedUser.created_at)"
                  readonly
                />
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue-darken-1" variant="text" @click="userDialog = false">
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthUserStore } from '@/stores/authUser'
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
}

// Composables
const authStore = useAuthUserStore()
const toast = useToast()

// Reactive data
const users = ref<User[]>([])
const loading = ref(false)
const search = ref('')
const userDialog = ref(false)
const selectedUser = ref<User | null>(null)

// Computed properties for status counts
const clearedCount = computed(() =>
  users.value.filter(user => user.status?.toLowerCase() === 'cleared').length
)

const blockedCount = computed(() =>
  users.value.filter(user => user.status?.toLowerCase() === 'blocked').length
)

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
      toast.error('Failed to fetch users: ' + result.error)
      console.error('Error fetching users:', result.error)
      return
    }

    if (result.users) {
      users.value = result.users
      toast.success(`Loaded ${result.users.length} users`)
    }
  } catch (error) {
    toast.error('An unexpected error occurred while fetching users')
    console.error('Unexpected error:', error)
  } finally {
    loading.value = false
  }
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
  const statusLower = status?.toLowerCase() || 'blocked'
  switch (statusLower) {
    case 'cleared': return `Cleared (${clearedCount.value})`
    case 'blocked': return `Blocked (${blockedCount.value})`
    case 'active': return 'Active'
    case 'inactive': return 'Inactive'
    case 'suspended': return 'Suspended'
    default: return `Blocked (${blockedCount.value})`
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

const editUser = (user: User) => {
  // TODO: Implement user editing functionality
  toast.info('Edit functionality coming soon...')
  console.log('Edit user:', user)
}

const deleteUser = (user: User) => {
  // TODO: Implement user deletion functionality
  if (confirm(`Are you sure you want to delete user ${user.full_name || user.email}?`)) {
    toast.info('Delete functionality coming soon...')
    console.log('Delete user:', user)
  }
}

// Lifecycle
onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
.v-card-title h3 {
  margin-bottom: 4px;
}
</style>
