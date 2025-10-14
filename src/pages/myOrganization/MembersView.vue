<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import {
  getEmailInitials,
  formatDate,
  filterOrganizationsByLeader,
  filterMembersBySearch,
  createMemberManagementHandlers
} from '@/utils/helpers'
import { useAuthUserStore } from '@/stores/authUser'
import InnerLayoutWrapper from '@/layouts/InnerLayoutWrapper.vue'
import OrganizationMembersDialog from '../admin/dialogs/OrganizationMembersDialog.vue'
import { useOrganizationMembers } from '../admin/composables/useOrganizationMembers'
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
  // Actions
  fetchOrganizationMembers,
  fetchAvailableStudents,
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

// Computed properties
const userOrganizations = computed(() => {
  return filterOrganizationsByLeader(organizations.value, authStore.userData?.id)
})

const filteredMembers = computed(() => {
  return filterMembersBySearch(members.value, search.value)
})

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

// Lifecycle
onMounted(() => {
  fetchOrganizations()
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
                <v-card-title class="pa-4 bg-primary text-white">
                  <div class="d-flex align-center">
                    <v-icon size="32" class="me-3">mdi-account-group</v-icon>
                    <div>
                      <h2 class="text-h5 font-weight-bold mb-1">Organization Members</h2>
                      <p class="text-body-2 mb-0 opacity-90">Manage your organization's membership</p>
                    </div>
                  </div>
                </v-card-title>
              </v-card>

              <!-- Loading State -->
              <div v-if="loading" class="text-center pa-8">
                <v-progress-circular indeterminate color="primary" size="60" class="mb-4" />
                <div class="text-h6">Loading organizations...</div>
              </div>

              <!-- No Organizations -->
              <div v-else-if="userOrganizations.length === 0" class="text-center pa-8">
                <img src="/images/fail.png" alt="No organizations" class="mb-4" style="width: 400px; height: auto;" />
                <h3 class="text-h5 mb-2">No Organizations Found</h3>
                <p class="text-body-1 text-medium-emphasis mb-4">
                  You are not currently assigned as a leader of any organization.
                </p>
                <p class="text-body-2 text-medium-emphasis">
                  Contact an administrator to be assigned as an organization leader.
                </p>
              </div>

              <!-- Organizations Grid -->
              <div v-else>
                <v-row>
                  <v-col
                    v-for="organization in userOrganizations"
                    :key="organization.id"
                    cols="12"
                    md="6"
                    lg="4"
                  >
                    <v-card
                      elevation="3"
                      rounded="lg"
                      class="organization-card fill-height"
                      hover
                    >
                      <!-- Card Header -->
                      <v-card-title class="pa-4 pb-2 bg-gradient-primary text-white">
                        <div class="d-flex align-center justify-space-between w-100">
                          <div class="flex-grow-1">
                            <v-icon color="white" size="24" class="mr-2">mdi-domain</v-icon>
                            <span class="text-h6 font-weight-bold">{{ organization.title }}</span>
                          </div>
                          <v-chip color="white" variant="tonal" size="small">
                            Leader
                          </v-chip>
                        </div>
                      </v-card-title>

                      <!-- Card Content -->
                      <v-card-text class="pa-4">
                        <div class="mb-4">
                          <div class="text-caption text-medium-emphasis mb-1">Created</div>
                          <div class="d-flex align-center">
                            <v-icon size="16" color="grey" class="mr-1">mdi-calendar</v-icon>
                            <span class="text-body-2">{{ formatDate(organization.created_at) }}</span>
                          </div>
                        </div>

                        <div class="d-flex justify-center">
                          <v-btn
                            color="primary"
                            variant="elevated"
                            prepend-icon="mdi-account-group"
                            @click="handleManageMembers(organization)"
                            block
                          >
                            Manage Members
                          </v-btn>
                        </div>
                      </v-card-text>
                    </v-card>
                  </v-col>
                </v-row>
              </div>

              <!-- Organization Members Dialog (only show if organization is selected) -->
              <OrganizationMembersDialog
                v-if="selectedOrganization?.id"
                v-model:dialog="membersDialog"
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
                @close="handleCloseMembersDialog"
              />
            </div>
          </v-col>
        </v-row>
      </v-container>
    </template>
  </InnerLayoutWrapper>
</template>

<style scoped>


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
}
</style>
