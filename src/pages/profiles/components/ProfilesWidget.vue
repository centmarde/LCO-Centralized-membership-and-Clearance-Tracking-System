<script setup lang="ts">
import { computed } from 'vue'
import {
  getUserDisplayName,
  getRoleText,
  getRoleColor,
  getStatusColor,
  getStatusText,
  getEmailInitials,
  formatDate
} from '@/utils/helpers'

// Props
interface Props {
  userData: any
  compact?: boolean
  showActions?: boolean
  showEmail?: boolean
  showStatus?: boolean
  expanded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
  showActions: false,
  showEmail: true,
  showStatus: true,
  expanded: false
})

// Emits
defineEmits<{
  edit: []
}>()

// Computed properties
const displayName = computed(() => {
  return getUserDisplayName(props.userData)
})

const userRole = computed(() => {
  const roleId = props.userData?.role_id || props.userData?.user_metadata?.role
  return getRoleText(roleId)
})

const isStudent = computed(() => {
  const roleId = props.userData?.role_id || props.userData?.user_metadata?.role
  return roleId === 2
})

const avatarColor = computed(() => {
  const roleId = props.userData?.role_id || props.userData?.user_metadata?.role
  return getRoleColor(roleId)
})

const statusColor = computed(() => {
  return getStatusColor(props.userData?.status)
})

const userInitials = computed(() => {
  // Try to get initials from full name first, then fall back to email
  const fullName = props.userData?.full_name || props.userData?.user_metadata?.full_name
  if (fullName) {
    // Extract initials from full name
    const nameParts = fullName.split(' ').filter((part: string) => part.length > 0)
    if (nameParts.length >= 2) {
      return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
    } else if (nameParts.length === 1) {
      return nameParts[0].substring(0, 2).toUpperCase()
    }
  }

  // Fall back to email-based initials
  return getEmailInitials(props.userData?.email)
})
</script>

<template>
  <v-card class="profile-widget" :class="{ 'compact': compact }">
    <v-card-text class="d-flex align-center">
      <!-- Avatar -->
      <v-avatar
        :size="compact ? 40 : 60"
        :color="avatarColor"
        class="mr-4"
      >
        <span class="text-white font-weight-bold" :style="{ fontSize: compact ? '14px' : '18px' }">
          {{ userInitials }}
        </span>
      </v-avatar>

      <!-- User Info -->
      <div class="flex-grow-1">
        <div class="font-weight-medium text-subtitle-1">
          {{ displayName }}
        </div>
        <div class="text-caption text-grey-600">
          {{ userRole }}
        </div>
        <div v-if="showEmail" class="text-caption text-grey-500">
          {{ userData?.email }}
        </div>
        <div v-if="showStatus && isStudent" class="mt-1">
          <v-chip
            :color="statusColor"
            size="x-small"
            variant="flat"
          >
            {{ getStatusText(userData?.status) }}
          </v-chip>
        </div>
      </div>

      <!-- Actions -->
      <div v-if="showActions" class="ml-4">
        <v-btn
          icon
          size="small"
          @click="$emit('edit')"
        >
          <v-icon>mdi-pencil</v-icon>
        </v-btn>
      </div>
    </v-card-text>

    <!-- Additional Info (expanded view) -->
    <v-expand-transition>
      <v-card-text v-if="expanded" class="pt-0">
        <v-divider class="mb-3" />
        <v-row dense>
          <v-col v-if="isStudent && userData?.student_number" cols="12" md="6">
            <div class="text-caption text-grey-600">Student Number</div>
            <div class="text-body-2">{{ userData.student_number }}</div>
          </v-col>
          <v-col cols="12" md="6">
            <div class="text-caption text-grey-600">Member Since</div>
            <div class="text-body-2">{{ formatDate(userData?.created_at) }}</div>
          </v-col>
          <v-col v-if="userData?.organization_name" cols="12">
            <div class="text-caption text-grey-600">Organization</div>
            <div class="text-body-2">{{ userData.organization_name }}</div>
          </v-col>
        </v-row>
      </v-card-text>
    </v-expand-transition>
  </v-card>
</template>

<style scoped>
.profile-widget {
  transition: all 0.2s ease-in-out;
}

.profile-widget:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.profile-widget.compact {
  border-radius: 8px;
}

.profile-widget.compact .v-card-text {
  padding: 12px 16px;
}
</style>
