<script setup lang="ts">
import { onMounted, computed, ref, watch } from 'vue'
import {
  getEmailInitials,
  formatDate,
  filterOrganizationsByLeader,
  filterMembersBySearch,
  createMemberManagementHandlers
} from '@/utils/helpers'
import { useAuthUserStore } from '@/stores/authUser'
import InnerLayoutWrapper from '@/layouts/InnerLayoutWrapper.vue'
import OrganizationMembersPanel from '../admin/components/OrganizationMembersPanel.vue'
import { useOrganizationMembers } from '../admin/composables/useOrganizationMembers'
import EventStudentsDialog from './dialogs/EventStudentsDialog.vue'
import { useOrganizations } from '../admin/composables/useOrganizations'

// Stores
const authStore = useAuthUserStore()

// Composables
const {
  // State
  loading,
  organizations,
  // Actions
  fetchOrganizations
} = useOrganizations()

const {
  // State
  loading: loadingMembers,
  saving: savingMembers,
  deleting: deletingMembers,
  members,
  availableStudents,
  memberForm,
  organizationEvents,
  // Actions
  fetchOrganizationMembers,
  fetchAvailableStudents,
  fetchOrganizationEvents,
  addMemberToOrganization,
  updateOrganizationMember,
  removeMemberFromOrganization,
  resetMemberForm,
  clearMembersData
} = useOrganizationMembers()

// Local state
const membersDialog = ref(false)
const selectedOrganization = ref<any>(null)
const search = ref('')
const eventsDialog = ref(false)
const selectedEvent = ref<any>(null)
const memberStudentIds = computed(() => (members.value || []).map(m => m.student?.id || m.student_id).filter(Boolean))

// Computed properties
const userOrganizations = computed(() => {
  return filterOrganizationsByLeader(organizations.value, authStore.userData?.id)
})

const filteredMembers = computed(() => {
  return filterMembersBySearch(members.value, search.value)
})

// Organization events state is already provided via useOrganizationMembers above

// Event handlers using helper factory
const {
  handleManageMembers,
  handleAddMember,
  handleUpdateMember,
  handleRemoveMember,
  handleCloseMembersDialog
} = createMemberManagementHandlers({
  setSelectedOrganization: (org) => { selectedOrganization.value = org },
  setMembersDialog: (open) => { membersDialog.value = open },
  fetchOrganizationMembers,
  fetchAvailableStudents,
  addMemberToOrganization,
  updateOrganizationMember,
  removeMemberFromOrganization,
  resetMemberForm,
  clearMembersData,
  getSelectedOrganization: () => selectedOrganization.value
})

// Auto-open members manager for the leader's single organization
const autoOpened = ref(false)

watch(organizations, (orgs) => {
  if (autoOpened.value) return
  const myOrgs = filterOrganizationsByLeader(orgs, authStore.userData?.id)
  if (myOrgs.length > 0) {
    handleManageMembers(myOrgs[0])
    // Also fetch organization events for the leader's org
    fetchOrganizationEvents(myOrgs[0].id)
    autoOpened.value = true
  }
}, { immediate: true })

// When switching selected org explicitly, refresh events
watch(selectedOrganization, (org) => {
  if (org?.id) fetchOrganizationEvents(org.id)
})

// Lifecycle
onMounted(async () => {
  await fetchOrganizations()
})
</script>

<template>
  <InnerLayoutWrapper>
    <template #content>
      <v-container fluid class="pa-6">
        <v-row>
          <v-col cols="12">
            <div >
              <!-- Page Header -->
              <v-card class="my-6" elevation="7" rounded="lg">
                <v-card-title class="pa-4 pa-sm-6 bg-primary text-white">
                  <div class="d-flex align-center">
                    <v-icon :size="$vuetify.display.xs ? '24' : '32'" class="me-2 me-sm-3">mdi-account-group</v-icon>
                    <div>
                      <h2 class="text-h6 text-sm-h5 font-weight-bold mb-1">Organization Members</h2>
                      <p class="text-caption text-sm-body-2 mb-0 opacity-90 d-none d-sm-block">Manage your organization's membership</p>
                      <p class="text-caption mb-0 opacity-90 d-block d-sm-none">Manage membership</p>
                    </div>
                  </div>
                </v-card-title>
              </v-card>

              <!-- Loading State -->
              <div v-if="loading" class="text-center pa-6 pa-sm-8">
                <v-progress-circular indeterminate color="primary" :size="$vuetify.display.xs ? '48' : '60'" class="mb-3 mb-sm-4" />
                <div class="text-body-1 text-sm-h6">Loading organizations...</div>
              </div>

              <!-- No Organizations -->
              <div v-else-if="userOrganizations.length === 0" class="text-center pa-6 pa-sm-8">
                <img src="/images/fail.png" alt="No organizations" class="mb-3 mb-sm-4 responsive-image" />
                <h3 class="text-h6 text-sm-h5 mb-2">No Organizations Found</h3>
                <p class="text-body-2 text-sm-body-1 text-medium-emphasis mb-3 mb-sm-4">
                  You are not currently assigned as a leader of any organization.
                </p>
                <p class="text-caption text-sm-body-2 text-medium-emphasis">
                  Contact an administrator to be assigned as an organization leader.
                </p>
              </div>

              <!-- No grid/cards: leaders have a single organization. Members dialog opens automatically. -->
              <div v-else></div>

              <!-- Inline Members Management Panel -->
              <OrganizationMembersPanel
                v-if="selectedOrganization?.id"
                :loading="loadingMembers"
                :saving="savingMembers"
                :organization-id="selectedOrganization.id"
                :organization-title="selectedOrganization.title || 'Unknown Organization'"
                :members="members"
                :available-students="availableStudents"
                :member-form="memberForm"
                :view-only="false"
                @add-member="handleAddMember"
                @update-member="handleUpdateMember"
                @remove-member="handleRemoveMember"
              />

              <!-- Organization Events List -->
              <div v-if="selectedOrganization?.id" class="mt-6 mt-sm-8">
                <v-card class="mb-4" elevation="4" rounded="lg">
                  <v-card-title class="d-flex align-center pa-4 pa-sm-6">
                    <v-icon :size="$vuetify.display.xs ? '20' : '24'" class="me-2">mdi-calendar-multiselect</v-icon>
                    <span class="text-body-1 text-sm-h6">Organization Events</span>
                    <v-spacer />
                    <v-chip color="primary" variant="tonal" :size="$vuetify.display.xs ? 'x-small' : 'small'">{{ organizationEvents?.length || 0 }} total</v-chip>
                  </v-card-title>
                  <v-divider />
                  <v-card-text class="pa-4 pa-sm-6">
                    <div v-if="!organizationEvents || organizationEvents.length === 0" class="text-medium-emphasis text-center py-6 py-sm-8">
                      <div class="text-body-2 text-sm-body-1">No events are currently attached to your organization.</div>
                    </div>
                    <v-row v-else>
                      <v-col v-for="ev in organizationEvents" :key="ev.id" cols="12" sm="6" md="4">
                        <v-card class="hoverable" @click="selectedEvent = ev; eventsDialog = true">
                          <v-card-title class="text-body-1 text-sm-subtitle-1 pa-3 pa-sm-4">{{ ev.title }}</v-card-title>
                          <v-card-subtitle class="pa-3 pa-sm-4 pt-0">{{ formatDate(ev.date) }}</v-card-subtitle>
                          <v-card-actions class="pa-3 pa-sm-4 pt-0">
                            <v-spacer />
                            <v-btn color="primary" variant="text" :size="$vuetify.display.xs ? 'small' : 'default'" append-icon="mdi-open-in-new">
                              <span class="d-none d-sm-inline">View Students</span>
                              <span class="d-inline d-sm-none">View</span>
                            </v-btn>
                          </v-card-actions>
                        </v-card>
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
              </div>

              <!-- Event Students Dialog -->
              <EventStudentsDialog
                v-model="eventsDialog"
                :event="selectedEvent"
                :member-student-ids="memberStudentIds as any"
              />
            </div>
          </v-col>
        </v-row>
      </v-container>
    </template>
  </InnerLayoutWrapper>
</template>

<style scoped>

.responsive-image {
  max-width: 100%;
  height: auto;
  width: 400px;
}

.organization-card {
  transition: all 0.3s ease;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.organization-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15) !important;
}

.bg-gradient-primary {
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)) 0%, rgba(var(--v-theme-primary), 0.8) 100%);
}

/* Mobile optimizations */
@media (max-width: 600px) {
  .members-container {
    padding: 10px;
  }

  .responsive-image {
    width: 90%;
    max-width: 300px;
  }
}
</style>
