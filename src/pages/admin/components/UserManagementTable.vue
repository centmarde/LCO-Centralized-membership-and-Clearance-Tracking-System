<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useDisplay } from 'vuetify'
import { useAuthUserStore } from '@/stores/authUser'
import { useUserRolesStore } from '@/stores/roles'
import { useOrganizationDataStore } from '@/stores/organizationData'
import { useOrganizationMembersStore } from '@/stores/organizationMembersData'
import { fetchStudentEventDetailsByUserId } from '@/stores/studentsData'
import { updateStudentEventStatus } from '@/stores/eventsData'
import { supabase } from '@/lib/supabase'
import { useToast } from 'vue-toastification'

// Component imports
import DeleteUserDialog from '@/pages/admin/dialogs/DeleteUserDialog.vue'
import EditUserDialog from '@/pages/admin/dialogs/EditUserDialog.vue'
import UserDetailsDialog from '@/pages/admin/dialogs/UserDetailsDialog.vue'
import StatusSummary from '@/pages/admin/components/StatusSummary.vue'
import UserManagementHeader from '@/pages/admin/components/userManagement/UserManagementHeader.vue'
import UserSearchControls from '@/pages/admin/components/userManagement/UserSearchControls.vue'
import UserCard from '@/pages/admin/components/userManagement/UserCard.vue'
import UserListTable from '@/pages/admin/components/userManagement/UserListTable.vue'
import UserEmptyState from '@/pages/admin/components/userManagement/UserEmptyState.vue'
import UserPagination from '@/pages/admin/components/userManagement/UserPagination.vue'

import {
  getUserStatusDisplay,
  getErrorMessage,
  type UserStatusDisplay
} from '@/utils/helpers'

// Export utilities
import { exportBlockedStudentsToPDF, exportBlockedStudentsToDocx } from '@/utils/exportUtils'

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
  organizations?: Array<{
    id: string
    title: string
  }>
}

// Composables
const { xs, smAndDown, mdAndUp } = useDisplay()
const authStore = useAuthUserStore()
const rolesStore = useUserRolesStore()
const organizationStore = useOrganizationDataStore()
const membersStore = useOrganizationMembersStore()
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
const viewMode = ref<'all' | 'blocked'>('all')
const layoutMode = ref<'card' | 'list'>('card')
const selectedOrganization = ref<string | null>(null)

// Watch viewMode to reset pagination
watch(viewMode, () => {
  page.value = 1
})

// Watch selectedOrganization to reset pagination
watch(selectedOrganization, () => {
  page.value = 1
})

// Watch layoutMode to adjust items per page
watch(layoutMode, () => {
  page.value = 1
  itemsPerPage.value = layoutMode.value === 'list' ? 10 : 4
})

// Function to get user status display with blocked events count (using helper function)
const getUserStatusDisplayForUser = (user: User): UserStatusDisplay => {
  const userEvents = studentEventStatusMap.value[user.id] || []
  return getUserStatusDisplay(user, userEvents)
}

// Get blocked students
const blockedStudents = computed(() => {
  const students = authStore.users.filter(user => user.role_id === 2 && user.student_id)

  return students.filter(student => {
    const userEvents = studentEventStatusMap.value[student.id] || []
    const blockedEvents = userEvents.filter(event => event.status?.toLowerCase() === 'blocked')
    return blockedEvents.length > 0
  })
})

// Get users based on view mode
const usersToShow = computed(() => {
  return viewMode.value === 'blocked' ? blockedStudents.value : authStore.users
})

// Get all unique organizations from users
const allOrganizations = computed(() => {
  const organizations: Array<{ id: string; title: string }> = []
  const seen = new Set<string>()

  authStore.users.forEach(user => {
    if (user.organizations && user.organizations.length > 0) {
      user.organizations.forEach((org: { id: string; title: string }) => {
        if (!seen.has(org.id)) {
          seen.add(org.id)
          organizations.push({
            id: org.id,
            title: org.title
          })
        }
      })
    }
  })

  return organizations.sort((a, b) => a.title.localeCompare(b.title))
})

// Computed filtered and paginated users
const filteredUsers = computed(() => {
  let users = usersToShow.value

  // Filter by search term
  if (search.value) {
    const searchLower = search.value.toLowerCase()
    users = users.filter(user =>
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.student_number?.toLowerCase().includes(searchLower)
    )
  }

  // Filter by organization
  if (selectedOrganization.value) {
    users = users.filter(user =>
      user.organizations &&
      user.organizations.some((org: { id: string; title: string }) => org.id === selectedOrganization.value)
    )
  }  return users
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

    // Fetch organizations
    await organizationStore.fetchOrganizations()

    // Map organization data to users
    if (result.users) {
      const usersWithOrganizations = await Promise.all(
        result.users.map(async (user: any) => {
          let organizations: Array<{ id: string; title: string }> = []

          // For students (role_id === 2), try to find their organizations
          if (user.role_id === 2) {
            // First try direct organization_id if it exists
            if (user.organization_id) {
              console.log(`User ${user.full_name} has direct organization_id:`, user.organization_id)
              const directOrg = organizationStore.organizations.find(
                org => org.id === String(user.organization_id) ||
                       parseInt(org.id) === user.organization_id ||
                       org.id === user.organization_id
              )
              if (directOrg) {
                organizations.push({
                  id: directOrg.id,
                  title: directOrg.title
                })
              }
            }

            // Always check organization_members table for additional memberships
            if (user.student_id) {
              try {
                const { data: membershipData, error } = await supabase
                  .from('organization_members')
                  .select(`
                    organization_id,
                    organization:organizations!organization_members_organization_id_fkey (
                      id,
                      title
                    )
                  `)
                  .eq('student_id', user.student_id)
                  .eq('status', 'active')

                if (!error && membershipData && membershipData.length > 0) {
                  membershipData.forEach(membership => {
                    if (membership.organization) {
                      const orgId = String(membership.organization_id)
                      // Handle both single object and array cases
                      const orgData = Array.isArray(membership.organization)
                        ? membership.organization[0]
                        : membership.organization

                      // Avoid duplicates and ensure orgData is valid
                      if (orgData && orgData.title && !organizations.find(org => org.id === orgId)) {
                        organizations.push({
                          id: orgId,
                          title: String(orgData.title) || 'Unknown Organization'
                        })
                      }
                    }
                  })
                  console.log(`Found ${membershipData.length} organization(s) via membership for ${user.full_name}:`, organizations)
                }
              } catch (error) {
                console.warn(`Failed to fetch organization membership for user ${user.full_name}:`, error)
              }
            }
          }

          return {
            ...user,
            organizations: organizations.length > 0 ? organizations : []
          }
        })
      )

      // Update the auth store users with organization data
      authStore.users = usersWithOrganizations
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

// Export functions
const handleExportToPDF = () => {
  try {
    exportBlockedStudentsToPDF(blockedStudents.value, studentEventStatusMap.value)
    toast.success('PDF export completed successfully!')
  } catch (error) {
    toast.error('Failed to export PDF: ' + getErrorMessage(error))
    console.error('PDF export error:', error)
  }
}

const handleExportToDocx = async () => {
  try {
    await exportBlockedStudentsToDocx(blockedStudents.value, studentEventStatusMap.value)
    toast.success('DOCX export completed successfully!')
  } catch (error) {
    toast.error('Failed to export DOCX: ' + getErrorMessage(error))
    console.error('DOCX export error:', error)
  }
}

// Lifecycle
onMounted(async () => {
  await refreshData()
  await rolesStore.fetchRoles()
})
</script>

<template>
  <v-container fluid class="user-management">
    <!-- Header -->
    <UserManagementHeader
      :loading="loading"
      @refresh="refreshData"
    />

    <!-- Search and Controls -->
    <UserSearchControls
      v-model:search="search"
      v-model:view-mode="viewMode"
      v-model:layout-mode="layoutMode"
      v-model:selected-organization="selectedOrganization"
      :all-users-count="authStore.users.length"
      :blocked-students-count="blockedStudents.length"
      :organizations="allOrganizations"
      @export:pdf="handleExportToPDF"
      @export:docx="handleExportToDocx"
    />

    <!-- Status Summary -->
    <div class="summary-section mb-4">
      <StatusSummary :users="filteredUsers" />
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" size="64" />
      <div class="text-h6 mt-4">Loading users...</div>
    </div>

    <!-- Empty State -->
    <UserEmptyState
      v-else-if="paginatedUsers.length === 0"
      :view-mode="viewMode"
      :has-search="!!search"
    />

    <!-- Users Content -->
    <div v-else>
      <!-- Card Layout -->
      <UserCard
        v-if="layoutMode === 'card'"
        :users="paginatedUsers"
        :student-event-status-map="studentEventStatusMap"
        :view-mode="viewMode"
        @view-user="viewUser"
        @edit-user="editUser"
        @delete-user="deleteUser"
      />

      <!-- List Layout -->
      <UserListTable
        v-else
        :users="paginatedUsers"
        :student-event-status-map="studentEventStatusMap"
        :loading="loading"
        :view-mode="viewMode"
        @view-user="viewUser"
        @edit-user="editUser"
        @delete-user="deleteUser"
      />

      <!-- Pagination -->
      <UserPagination
        v-model:current-page="page"
        :total-pages="totalPages"
        :total-items="filteredUsers.length"
        :items-per-page="itemsPerPage"
        :view-mode="viewMode"
      />
    </div>

    <!-- Dialogs -->
    <UserDetailsDialog
      v-model="userDialog"
      :user="selectedUser"
    />

    <EditUserDialog
      v-model="editDialog"
      :user="editingUser"
      @user-updated="onUserUpdated"
    />

    <DeleteUserDialog
      v-model="deleteDialog"
      :user="userToDelete"
      @user-deleted="onUserDeleted"
    />
  </v-container>
</template>

<style scoped src="@/styles/userManagement.css"></style>
