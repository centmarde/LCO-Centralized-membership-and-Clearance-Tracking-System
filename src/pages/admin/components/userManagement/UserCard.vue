<script setup lang="ts">
import { computed } from 'vue'
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

// Debug function to check organizations data
const debugUserOrganizations = (user: User) => {
  console.log(`User: ${user.full_name}, Role: ${user.role_id}, Organizations:`, user.organizations)
  console.log('Organization ID:', user.organization_id, 'Student ID:', user.student_id)
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
  <v-row>
    <v-col
      v-for="user in users"
      :key="user.id"
      cols="12"
      sm="6"
      md="4"
      lg="3"
    >
      <v-card
        class="organization-card user-card fill-height"
        elevation="3"
        rounded="lg"
        hover
      >
        <v-card-title class="pa-4 pb-2" :class="{ 'bg-red-lighten-5': viewMode === 'blocked' }">
          <div class="d-flex align-center w-100">
            <v-avatar :color="viewMode === 'blocked' ? 'red' : 'primary'" size="40" class="mr-3">
              <span class="text-h6" :class="viewMode === 'blocked' ? 'text-white' : ''">
                {{ user.full_name?.charAt(0).toUpperCase() || '?' }}
              </span>
            </v-avatar>
            <div class="text-truncate flex-grow-1">
              <div class="text-subtitle-1 font-weight-bold text-truncate">
                {{ user.full_name || 'N/A' }}
              </div>
              <div class="text-caption text-grey">
                {{ user.student_number || 'No ID' }}
              </div>
            </div>
            <v-chip
              v-if="viewMode === 'blocked' && getBlockedEventsForUser(user).length > 0"
              color="red"
              variant="elevated"
              size="small"
              label
            >
              <v-icon start size="small">mdi-alert-circle</v-icon>
              {{ getBlockedEventsForUser(user).length }} blocked
            </v-chip>
          </div>
        </v-card-title>

        <v-divider></v-divider>

        <v-card-text class="pa-4 pt-3">
          <div class="user-info mb-3">
            <div class="d-flex align-center mb-2">
              <v-icon size="small" class="mr-2">mdi-email</v-icon>
              <span class="text-body-2 text-truncate">{{ user.email || 'N/A' }}</span>
            </div>
            <div class="d-flex align-center mb-2">
              <v-icon size="small" class="mr-2">mdi-calendar</v-icon>
              <span class="text-body-2">{{ formatDate(user.created_at) }}</span>
            </div>
            <div v-if="user.role_id === 2" class="mb-2">
              <!-- Debug call -->
              {{ debugUserOrganizations(user) }}
              <div class="d-flex align-center mb-1">
                <v-icon size="small" class="mr-2">mdi-account-group</v-icon>
                <div v-if="user.organizations && user.organizations.length > 0" class="d-flex flex-wrap gap-1">
                  <v-chip
                    v-for="org in user.organizations.slice(0, 2)"
                    :key="org.id"
                    size="x-small"
                    variant="tonal"
                    color="primary"
										class="my-1 mx-1"
                    label
                  >
                    {{ org.title }}
                  </v-chip>
                  <v-chip
                    v-if="user.organizations.length > 2"
                    size="x-small"
                    variant="tonal"
                    color="grey"
                    label
                  >
                    +{{ user.organizations.length - 2 }} more
                  </v-chip>
                </div>
                <span v-else class="text-body-2 text-grey">No Organization</span>
              </div>
              <!-- Additional organizations -->
              <div v-if="user.organizations && user.organizations.length > 2" class="ml-6">
                <div class="d-flex flex-wrap gap-1">
                  <v-chip
                    v-for="org in user.organizations.slice(2)"
                    :key="org.id"
                    size="x-small"
                    variant="outlined"
                    color="primary"
                    label
                  >
                    {{ org.title }}
                  </v-chip>
                </div>
              </div>
            </div>
          </div>

          <div class="d-flex flex-wrap gap-2 mb-3">
            <v-chip
              :color="getRoleColor(user.role_id)"
              variant="tonal"
              size="small"
							class="my-1 mx-1"
              label
            >
              <v-icon start size="small">mdi-shield-account</v-icon>
              {{ getRoleText(user.role_id) }}
            </v-chip>
            <v-chip
              :color="getUserStatusDisplayForUser(user).color"
              variant="tonal"
              size="small"
							class="my-1 mx-1"
              label
            >
              <v-icon start size="small">mdi-circle</v-icon>
              {{ getUserStatusDisplayForUser(user).text }}
            </v-chip>
          </div>

          <!-- Blocked Events List (only show in blocked students view) -->
          <div v-if="viewMode === 'blocked' && getBlockedEventsForUser(user).length > 0" class="blocked-events">
            <h4 class="text-subtitle-2 font-weight-bold mb-2 text-red">
              <v-icon size="small" class="mr-1">mdi-block-helper</v-icon>
              Blocked Events:
            </h4>
            <div class="events-list">
              <v-chip
                v-for="(event, index) in getBlockedEventsForUser(user).slice(0, 3)"
                :key="index"
                :color="getEventStatusColor(event.status)"
                variant="tonal"
                size="small"
                class="ma-1"
                label
              >
                <v-icon start size="x-small">mdi-calendar-clock</v-icon>
                {{ getEventTypeDisplay(event) }}
              </v-chip>
              <v-chip
                v-if="getBlockedEventsForUser(user).length > 3"
                color="grey"
                variant="tonal"
                size="small"
                class="ma-1"
                label
              >
                +{{ getBlockedEventsForUser(user).length - 3 }} more
              </v-chip>
            </div>
          </div>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions class="justify-space-between px-4">
          <v-btn
            icon="mdi-eye"
            variant="text"
            size="small"
            @click="emit('viewUser', user)"
            color="info"
          >
            <v-icon>mdi-eye</v-icon>
            <v-tooltip activator="parent" location="top">View Details</v-tooltip>
          </v-btn>
          <v-btn
            icon="mdi-pencil"
            variant="text"
            size="small"
            @click="emit('editUser', user)"
            color="primary"
          >
            <v-icon>mdi-pencil</v-icon>
            <v-tooltip activator="parent" location="top">Edit User</v-tooltip>
          </v-btn>
          <v-btn
            icon="mdi-delete"
            variant="text"
            size="small"
            @click="emit('deleteUser', user)"
            color="error"
          >
            <v-icon>mdi-delete</v-icon>
            <v-tooltip activator="parent" location="top">Delete User</v-tooltip>
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-col>
  </v-row>
</template>
