<script setup lang="ts">
import {
  getRoleColor,
  getRoleText,
  formatDate,
  getUserStatusDisplay,
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
  organizations?: Array<{
    id: string
    title: string
  }>
}

interface Props {
  users: User[]
  viewMode: 'all' | 'blocked'
  studentEventStatusMap: Record<string, any[]>
  loading?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  viewUser: [user: User]
  editUser: [user: User]
  deleteUser: [user: User]
}>()

// Helper functions
const getUserStatusDisplayForUser = (user: User): UserStatusDisplay => {
  const userEvents = props.studentEventStatusMap[user.id] || []
  return getUserStatusDisplay(user, userEvents)
}

const getEventTypeDisplay = (event: any): string => {
  if (event.events) {
    const eventData = Array.isArray(event.events) ? event.events[0] : event.events
    return eventData?.title || 'Unknown Event'
  }
  return event.title || event.event_type_name || event.event_type || 'Unknown Event'
}

const getEventStatusColor = (status: string): string => {
  switch (status?.toLowerCase()) {
    case 'blocked': return 'red'
    case 'cleared': return 'green'
    case 'pending': return 'orange'
    default: return 'grey'
  }
}

const getBlockedEventsForUser = (user: User) => {
  const userEvents = props.studentEventStatusMap[user.id] || []
  return userEvents.filter(event => event.status?.toLowerCase() === 'blocked')
}

// Helper function to safely get organizations display
const getOrganizationsDisplay = (organizations: User['organizations']): string => {
  if (!organizations || organizations.length === 0) return 'No Organization'

  // Handle case where organizations might be incorrectly typed
  if (!Array.isArray(organizations)) {
    console.warn('Organizations is not an array:', organizations)
    return 'No Organization'
  }

  if (organizations.length === 1) {
    return organizations[0]?.title || 'Unknown Organization'
  }

  return organizations.map(org => org?.title || 'Unknown Organization').join(', ')
}
</script>

<template>
  <v-card elevation="2" rounded="lg">
    <v-data-table
      :headers="[
        { title: 'User', key: 'user', sortable: true },
        { title: 'Email', key: 'email', sortable: true },
        { title: 'Organization', key: 'organization', sortable: false },
        { title: 'Role', key: 'role', sortable: false },
        { title: 'Status', key: 'status', sortable: false },
        { title: 'Created', key: 'created_at', sortable: true },
        { title: 'Actions', key: 'actions', sortable: false, align: 'center' }
      ]"
      :items="users"
      :loading="loading"
      hide-default-footer
      item-key="id"
      class="user-list-table"
    >
      <!-- User column -->
      <template v-slot:item.user="{ item }">
        <div class="d-flex align-center py-2">
          <v-avatar :color="viewMode === 'blocked' ? 'red' : 'primary'" size="32" class="mr-3">
            <span class="text-body-2" :class="viewMode === 'blocked' ? 'text-white' : ''">
              {{ item.full_name?.charAt(0).toUpperCase() || '?' }}
            </span>
          </v-avatar>
          <div>
            <div class="text-subtitle-2 font-weight-medium">{{ item.full_name || 'N/A' }}</div>
            <div class="text-caption text-grey">{{ item.student_number || 'No ID' }}</div>
          </div>
        </div>
      </template>

      <!-- Email column -->
      <template v-slot:item.email="{ item }">
        <span class="text-body-2">{{ item.email || 'N/A' }}</span>
      </template>

      <!-- Organization column -->
      <template v-slot:item.organization="{ item }">
        <div v-if="item.role_id === 2" class="d-flex align-center">
          <v-icon size="small" class="mr-2">mdi-account-group</v-icon>
          <div v-if="Array.isArray(item.organizations) && item.organizations.length > 0" class="text-body-2">
            <template v-if="item.organizations.length === 1">
              {{ item.organizations[0]?.title || 'Unknown Organization' }}
            </template>
            <template v-else>
              <div class="d-flex flex-wrap gap-1">
                <v-chip
                  v-for="org in item.organizations.slice(0, 2)"
                  :key="org.id"
                  size="x-small"
                  variant="outlined"
                  color="primary"
                >
                  {{ org?.title || 'Unknown Organization' }}
                </v-chip>
                <v-chip
                  v-if="item.organizations.length > 2"
                  size="x-small"
                  variant="outlined"
                  color="grey"
                >
                  +{{ item.organizations.length - 2 }}
                </v-chip>
              </div>
            </template>
          </div>
          <span v-else class="text-body-2 text-grey">{{ getOrganizationsDisplay(item.organizations) }}</span>
        </div>
        <span v-else class="text-body-2 text-grey">-</span>
      </template>

      <!-- Role column -->
      <template v-slot:item.role="{ item }">
        <v-chip
          :color="getRoleColor(item.role_id)"
          variant="tonal"
          size="small"
          label
        >
          <v-icon start size="small">mdi-shield-account</v-icon>
          {{ getRoleText(item.role_id) }}
        </v-chip>
      </template>

      <!-- Status column -->
      <template v-slot:item.status="{ item }">
        <div class="d-flex flex-column align-start">
          <v-chip
            :color="getUserStatusDisplayForUser(item).color"
            variant="tonal"
            size="small"
            label
            class="mb-1"
          >
            <v-icon start size="small">mdi-circle</v-icon>
            {{ getUserStatusDisplayForUser(item).text }}
          </v-chip>
          <!-- Blocked events chips for blocked students view -->
          <div v-if="viewMode === 'blocked' && getBlockedEventsForUser(item).length > 0" class="blocked-events-inline">
            <v-chip
              v-for="(event, index) in getBlockedEventsForUser(item).slice(0, 2)"
              :key="index"
              :color="getEventStatusColor(event.status)"
              variant="outlined"
              size="x-small"
              class="ma-0 mb-1 mr-1"
              label
            >
              {{ getEventTypeDisplay(event) }}
            </v-chip>
            <v-chip
              v-if="getBlockedEventsForUser(item).length > 2"
              color="grey"
              variant="outlined"
              size="x-small"
              class="ma-0"
              label
            >
              +{{ getBlockedEventsForUser(item).length - 2 }}
            </v-chip>
          </div>
        </div>
      </template>

      <!-- Created column -->
      <template v-slot:item.created_at="{ item }">
        <span class="text-body-2">{{ formatDate(item.created_at) }}</span>
      </template>

      <!-- Actions column -->
      <template v-slot:item.actions="{ item }">
        <div class="d-flex justify-center">
          <v-btn
            icon="mdi-eye"
            variant="text"
            size="small"
            @click="emit('viewUser', item)"
            color="info"
          >
            <v-icon size="small">mdi-eye</v-icon>
            <v-tooltip activator="parent" location="top">View Details</v-tooltip>
          </v-btn>
          <v-btn
            icon="mdi-pencil"
            variant="text"
            size="small"
            @click="emit('editUser', item)"
            color="primary"
          >
            <v-icon size="small">mdi-pencil</v-icon>
            <v-tooltip activator="parent" location="top">Edit User</v-tooltip>
          </v-btn>
          <v-btn
            icon="mdi-delete"
            variant="text"
            size="small"
            @click="emit('deleteUser', item)"
            color="error"
          >
            <v-icon size="small">mdi-delete</v-icon>
            <v-tooltip activator="parent" location="top">Delete User</v-tooltip>
          </v-btn>
        </div>
      </template>
    </v-data-table>
  </v-card>
</template>
