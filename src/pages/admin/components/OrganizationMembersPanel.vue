<script setup lang="ts">
import { watch, computed, ref } from 'vue'
import { getEmailInitials, memberStatusOptions, memberRoleOptions, getMemberStatusColor, getMemberRoleTitle } from '@/utils/helpers'
import type { OrganizationMember } from '@/stores/organizationMembersData'

interface Props {
  loading: boolean
  saving: boolean
  organizationId: string
  organizationTitle: string
  members: OrganizationMember[]
  availableStudents: any[]
  memberForm: {
    student_id: string
    organization_id: string
    status: 'active' | 'inactive' | 'pending' | 'suspended'
    member_role: 'member' | 'officer' | 'secretary' | 'treasurer' | 'vice_president'
    notes: string
  }
  viewOnly?: boolean
  organizationDeadline?: string | null
}

interface Emits {
  (e: 'add-member'): void
  (e: 'update-member', memberId: string, updates: Partial<OrganizationMember>): void
  (e: 'remove-member', memberId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const studentSearch = ref('')

const statusOptions = memberStatusOptions
const roleOptions = memberRoleOptions

// Helper methods to update individual form fields (mutate reactive memberForm)
const updateStudentId = (value: string | null) => {
  props.memberForm.student_id = value || ''
}
const updateMemberRole = (value: string) => {
  props.memberForm.member_role = value as any
}
const updateStatus = (value: string) => {
  props.memberForm.status = value as any
}
const updateNotes = (value: string | null) => {
  props.memberForm.notes = value || ''
}

// Methods
const deadlineDate = computed(() => {
  if (!props.organizationDeadline) return null
  const date = new Date(props.organizationDeadline)
  return Number.isNaN(date.getTime()) ? null : date
})

const isDeadlinePassed = computed(() => {
  const date = deadlineDate.value
  if (!date) return false
  return date.getTime() <= Date.now()
})

const handleAddMember = () => {
  if (isDeadlinePassed.value) return
  emit('add-member')
}
const handleUpdateMember = (member: OrganizationMember, field: string, value: any) => emit('update-member', member.id, { [field]: value })
const handleRemoveMember = (memberId: string) => emit('remove-member', memberId)

const getStatusColor = getMemberStatusColor
const getRoleTitle = getMemberRoleTitle

const formatStudentLabel = (student: any) => {
  const name = student?.full_name || student?.email || 'Unknown Student'
  const id = student?.student_number || 'No ID'
  return `${name} • ${id}`
}

const getStudentInitials = (student: any) => {
  const name = student?.full_name?.trim()
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    if (parts.length === 1) return (parts[0].slice(0, 2)).toUpperCase()
  }
  return getEmailInitials(student?.email || '')
}

const studentFilter = (item: any, queryText: string, itemText: string) => {
  const text = (itemText || '').toLowerCase()
  const query = (queryText || '').toLowerCase()
  const email = (item?.raw?.email || '').toLowerCase()
  const name = (item?.raw?.full_name || '').toLowerCase()
  const id = (item?.raw?.student_number || '').toLowerCase()
  return text.includes(query) || email.includes(query) || name.includes(query) || id.includes(query)
}

const showDeadlineWarning = computed(() => !!props.organizationDeadline && !isDeadlinePassed.value)
const showDeadlineRestriction = computed(() => !!props.organizationDeadline && isDeadlinePassed.value)
const formattedDeadline = computed(() => {
  if (!props.organizationDeadline) return ''
  const date = deadlineDate.value
  if (!date) return props.organizationDeadline
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
})

// Ensure the form has the correct organization id when the panel is shown
watch(() => props.organizationId, (newId) => {
  if (newId) {
    props.memberForm.organization_id = newId
  }
}, { immediate: true })
</script>

<template>
  <v-card elevation="2" rounded="lg">
    <v-card-title class="pa-6 bg-primary text-white">
      <div class="d-flex align-center">
        <v-icon size="28" class="me-3">mdi-account-group</v-icon>
        <div>
          <h2 class="text-h5 font-weight-bold mb-1">{{ organizationTitle }} Members</h2>
          <p class="text-body-2 mb-0 opacity-90">
            {{ viewOnly ? 'View organization members' : 'Manage organization membership' }}
          </p>
        </div>
      </div>
    </v-card-title>

    <v-card-text class="pa-0">
      <v-container fluid class="pa-6">
        <v-alert
          v-if="showDeadlineWarning"
          type="warning"
          variant="tonal"
          class="mb-4"
          border="start"
          color="warning"
        >
          Membership deadline: {{ formattedDeadline }}. Ensure membership is finalized before the deadline.
        </v-alert>

        <v-alert
          v-else-if="showDeadlineRestriction"
          type="error"
          variant="tonal"
          class="mb-4"
          border="start"
          color="error"
        >
          Membership deadline passed on {{ formattedDeadline }}. Adding new members is disabled. Contact an administrator to request an extension.
        </v-alert>

        <!-- Add New Member Section -->
        <v-card v-if="!viewOnly" class="mb-6" elevation="2" rounded="lg">
          <v-card-title class="pb-2">
            <v-icon class="me-2">mdi-account-plus</v-icon>
            Add New Member
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" md="6">
                <v-autocomplete
                  :model-value="memberForm.student_id"
                  @update:model-value="updateStudentId"
                  :items="availableStudents"
                  item-value="id"
                  :item-title="formatStudentLabel"
                  v-model:search="studentSearch"
                  :filter="studentFilter"
                  :menu-props="{ maxHeight: 320 }"
                  label="Select Student"
                  variant="outlined"
                  density="compact"
                  :loading="loading"
                  clearable
                  :return-object="false"
                  :disabled="isDeadlinePassed"
                >
                  <template #selection="{ item }">
                    <div v-if="item?.raw?.id" class="d-flex align-center">
                      <v-avatar size="24" color="primary" class="me-2">
                        <span class="text-white text-caption">
                          {{ getStudentInitials(item.raw) }}
                        </span>
                      </v-avatar>
                      <div class="d-flex flex-column">
                        <span class="text-body-2 font-weight-medium">{{ item.raw.full_name || 'Unknown Student' }}</span>
                        <span class="text-caption text-medium-emphasis">ID: {{ item.raw.student_number || 'N/A' }}</span>
                      </div>
                    </div>
                    <span v-else></span>
                  </template>
                  <template #item="{ item, props: itemProps }">
                    <v-list-item v-bind="itemProps" title="" subtitle="">
                      <template #prepend>
                        <v-avatar size="28" color="primary" class="me-2">
                          <span class="text-white text-caption">
                            {{ getStudentInitials(item.raw) }}
                          </span>
                        </v-avatar>
                      </template>
                      <v-list-item-title>{{ formatStudentLabel(item.raw) }}</v-list-item-title>
                      <v-list-item-subtitle class="d-flex flex-column">
                        <span v-if="item.raw.email" class="text-caption">{{ item.raw.email }}</span>
                      </v-list-item-subtitle>
                    </v-list-item>
                  </template>
                </v-autocomplete>
              </v-col>
              <v-col cols="12" md="3">
                <v-select
                  :model-value="memberForm.member_role"
                  @update:model-value="updateMemberRole"
                  :items="roleOptions"
                  label="Member Role"
                  variant="outlined"
                  density="compact"
                  :disabled="isDeadlinePassed"
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-select
                  :model-value="memberForm.status"
                  @update:model-value="updateStatus"
                  :items="statusOptions"
                  label="Status"
                  variant="outlined"
                  density="compact"
                  :disabled="isDeadlinePassed"
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  :model-value="memberForm.notes"
                  @update:model-value="updateNotes"
                  label="Notes (Optional)"
                  variant="outlined"
                  density="compact"
                  rows="2"
                  auto-grow
                  :disabled="isDeadlinePassed"
                />
              </v-col>
              <v-col cols="12">
                <v-btn
                  color="primary"
                  prepend-icon="mdi-account-plus"
                  @click="handleAddMember"
                  :loading="saving"
                  :disabled="isDeadlinePassed || !memberForm.student_id"
                >
                  Add Member
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Current Members Section -->
        <v-card elevation="2" rounded="lg">
          <v-card-title class="pb-2">
            <v-icon class="me-2">mdi-account-group</v-icon>
            Current Members ({{ members.length }})
          </v-card-title>
          <v-card-text class="pa-0">
            <div v-if="loading && members.length === 0" class="text-center pa-8">
              <v-progress-circular indeterminate color="primary" size="40" class="mb-4" />
              <div class="text-body-1">Loading members...</div>
            </div>

            <div v-else-if="members.length === 0" class="text-center pa-8">
              <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-account-group-outline</v-icon>
              <h3 class="text-h6 mb-2">No members yet</h3>
              <p class="text-body-2 text-medium-emphasis">
                {{ viewOnly ? 'This organization has no members.' : 'Add the first member to get started.' }}
              </p>
            </div>

            <v-list v-else class="pa-0">
              <v-list-item
                v-for="(member, index) in members"
                :key="member.id"
                class="pa-4"
                :class="{ 'border-b': index < members.length - 1 }"
              >
                <template #prepend>
                  <v-avatar size="40" color="primary">
                    <span class="text-white">
                      {{ getEmailInitials(member.student?.email || '') }}
                    </span>
                  </v-avatar>
                </template>

                <v-list-item-title class="font-weight-medium">
                  {{ member.student?.full_name || member.student?.email }}
                </v-list-item-title>
                <v-list-item-subtitle class="d-flex flex-column">
                  <span>{{ member.student?.student_number }} • {{ member.student?.email }}</span>
                  <div class="d-flex align-center mt-1">
                    <v-chip
                      :color="getStatusColor(member.status)"
                      variant="tonal"
                      size="x-small"
                      class="me-2"
                    >
                      {{ member.status }}
                    </v-chip>
                    <v-chip
                      color="blue"
                      variant="tonal"
                      size="x-small"
                      class="me-2"
                    >
                      {{ getRoleTitle(member.member_role) }}
                    </v-chip>
                    <span class="text-caption text-medium-emphasis">
                      Joined {{ new Date(member.joined_at).toLocaleDateString() }}
                    </span>
                  </div>
                </v-list-item-subtitle>

                <template #append v-if="!viewOnly">
                  <div class="d-flex align-center">
                    <!-- Update status/role via menu -->
                    <v-menu location="bottom end">
                      <template #activator="{ props: menuProps }">
                        <v-btn icon="mdi-account-cog" variant="text" size="small" v-bind="menuProps" />
                      </template>
                      <v-list density="compact">
                        <v-list-subheader>Update Status</v-list-subheader>
                        <v-list-item
                          v-for="status in statusOptions"
                          :key="status.value"
                          @click="handleUpdateMember(member, 'status', status.value)"
                          :disabled="member.status === status.value"
                        >
                          <template #prepend>
                            <v-icon :color="status.color">mdi-circle</v-icon>
                          </template>
                          <v-list-item-title>{{ status.title }}</v-list-item-title>
                        </v-list-item>
                        <v-divider />
                        <v-list-subheader>Update Role</v-list-subheader>
                        <v-list-item
                          v-for="role in roleOptions"
                          :key="role.value"
                          @click="handleUpdateMember(member, 'member_role', role.value)"
                          :disabled="member.member_role === role.value"
                        >
                          <v-list-item-title>{{ role.title }}</v-list-item-title>
                        </v-list-item>
                      </v-list>
                    </v-menu>

                    <!-- Remove Member -->
                    <v-btn
                      icon="mdi-account-remove"
                      variant="text"
                      size="small"
                      color="error"
                      @click="handleRemoveMember(member.id)"
                    />
                  </div>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-container>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.border-b { border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); }
</style>
