<script setup lang="ts">
import { computed, watch } from 'vue'
import { getEmailInitials, memberStatusOptions, memberRoleOptions, getMemberStatusColor, getMemberRoleTitle } from '@/utils/helpers'
import type { OrganizationMember } from '@/stores/organizationMembersData'

interface Props {
  dialog: boolean
  loading: boolean
  saving: boolean
  organizationId: string | null
  organizationTitle: string
  members: OrganizationMember[]
  availableStudents: any[]
  memberForm: {
    student_id: string | null
    organization_id: string | null
    status: 'active' | 'inactive' | 'pending' | 'suspended'
    member_role: 'member' | 'officer' | 'secretary' | 'treasurer' | 'vice_president'
    notes: string | null
  }
  viewOnly?: boolean // New prop to make dialog read-only
}

interface Emits {
  (e: 'update:dialog', value: boolean): void
  (e: 'add-member'): void
  (e: 'update-member', memberId: string, updates: Partial<OrganizationMember>): void
  (e: 'remove-member', memberId: string): void
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Debug logging
watch(() => props.members, (newMembers) => {
  console.log('OrganizationMembersDialog - members prop changed:', newMembers?.length || 0, newMembers)
}, { immediate: true })

watch(() => props.dialog, (newDialog) => {
  console.log('OrganizationMembersDialog - dialog prop changed:', newDialog)
  if (newDialog) {
    console.log('Dialog opened with members:', props.members?.length || 0)
  }
}, { immediate: true })

// Computed
const dialogValue = computed({
  get: () => props.dialog,
  set: (value) => emit('update:dialog', value)
})

const statusOptions = memberStatusOptions
const roleOptions = memberRoleOptions

// Methods
const handleAddMember = () => {
  emit('add-member')
}

const handleUpdateMember = (member: OrganizationMember, field: string, value: any) => {
  emit('update-member', member.id, { [field]: value })
}

const handleRemoveMember = (memberId: string) => {
  emit('remove-member', memberId)
}

const handleClose = () => {
  emit('close')
}

const getStatusColor = getMemberStatusColor
const getRoleTitle = getMemberRoleTitle

// Watch for dialog changes to reset form
watch(() => props.dialog, (newVal) => {
  if (newVal && props.organizationId) {
    props.memberForm.organization_id = props.organizationId
  }
})
</script>

<template>
  <v-dialog
    v-model="dialogValue"
    max-width="900px"
    persistent
    scrollable
  >
    <v-card>
      <v-card-title class="pa-6 bg-primary text-white">
        <div class="d-flex align-center">
          <v-icon size="28" class="me-3" :class="viewOnly ? 'mdi-eye' : 'mdi-account-group'">
            {{ viewOnly ? 'mdi-eye' : 'mdi-account-group' }}
          </v-icon>
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
          <!-- Admin Info Message -->
          <v-alert
            v-if="viewOnly"
            type="info"
            variant="tonal"
            class="mb-6"
            icon="mdi-information"
          >
            <v-alert-title>Admin View</v-alert-title>
            You are viewing organization members as an administrator. 
            To manage members (add/edit/remove), organization leaders should use the Members section in their dashboard.
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
                  <v-select
                    v-model="memberForm.student_id"
                    :items="availableStudents"
                    item-value="id"
                    item-title="display_name"
                    label="Select Student"
                    variant="outlined"
                    density="compact"
                    :loading="loading"
                    clearable
                    :return-object="false"
                  >
                    <template v-slot:selection="{ item }">
                      <div class="d-flex align-center">
                        <v-avatar size="24" color="primary" class="me-2">
                          <span class="text-white text-caption">
                            {{ getEmailInitials(item.raw.email || '') }}
                          </span>
                        </v-avatar>
                        {{ item.raw.display_name }}
                      </div>
                    </template>
                  </v-select>
                </v-col>
                <v-col cols="12" md="3">
                  <v-select
                    v-model="memberForm.member_role"
                    :items="roleOptions"
                    label="Member Role"
                    variant="outlined"
                    density="compact"
                  />
                </v-col>
                <v-col cols="12" md="3">
                  <v-select
                    v-model="memberForm.status"
                    :items="statusOptions"
                    label="Status"
                    variant="outlined"
                    density="compact"
                  />
                </v-col>
                <v-col cols="12">
                  <v-textarea
                    v-model="memberForm.notes"
                    label="Notes (Optional)"
                    variant="outlined"
                    density="compact"
                    rows="2"
                    auto-grow
                  />
                </v-col>
                <v-col cols="12">
                  <v-btn
                    color="primary"
                    prepend-icon="mdi-account-plus"
                    @click="handleAddMember"
                    :loading="saving"
                    :disabled="!memberForm.student_id"
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
                <p class="text-body-2 text-medium-emphasis">Add the first member to get started.</p>
              </div>

              <v-list v-else class="pa-0">
                <v-list-item
                  v-for="(member, index) in members"
                  :key="member.id"
                  class="pa-4"
                  :class="{ 'border-b': index < members.length - 1 }"
                >
                  <template v-slot:prepend>
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

                  <template v-slot:append v-if="!viewOnly">
                    <div class="d-flex align-center">
                      <!-- Status Update -->
                      <v-menu location="bottom end">
                        <template v-slot:activator="{ props: menuProps }">
                          <v-btn
                            icon="mdi-account-edit"
                            variant="text"
                            size="small"
                            v-bind="menuProps"
                          />
                        </template>
                        <v-list density="compact">
                          <v-list-subheader>Update Status</v-list-subheader>
                          <v-list-item
                            v-for="status in statusOptions"
                            :key="status.value"
                            @click="handleUpdateMember(member, 'status', status.value)"
                            :disabled="member.status === status.value"
                          >
                            <template v-slot:prepend>
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

      <v-card-actions class="pa-6 pt-0">
        <v-spacer />
        <v-btn
          variant="text"
          @click="handleClose"
        >
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.border-b {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>