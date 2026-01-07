<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import {
  getEmailInitials,
  formatDate,
  createViewMembersHandler,
  organizationsTableHeaders
} from '@/utils/helpers'
import InnerLayoutWrapper from '@/layouts/InnerLayoutWrapper.vue'
import OrganizationFormDialog from './dialogs/OrganizationFormDialog.vue'
import OrganizationDeleteDialog from './dialogs/OrganizationDeleteDialog.vue'
import OrganizationMembersStatusDialog from './dialogs/OrganizationMembersStatusDialog.vue'
import { useOrganizations } from './composables/useOrganizations'
import { useDialogs } from './composables/useDialogs'
import { useOrganizationMembers } from './composables/useOrganizationMembers'

// Composables
const {
  // State
  loading,
  saving,
  deleting,
  loadingLeaders,
  organizations,
  organizationLeaders,
  editingOrganization,
  organizationToDelete,
  organizationForm,
  // Actions
  fetchOrganizations,
  saveOrganization,
  deleteOrganization,
  prepareCreateOrganization,
  prepareEditOrganization,
  prepareDeleteOrganization,
  resetForm
} = useOrganizations()

const {
  // State
  dialog,
  deleteDialog,
  formValid,
  formRef,
  search,
  // Actions
  openDialog,
  closeDialog,
  openDeleteDialog,
  closeDeleteDialog
} = useDialogs()

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

// Table configuration
const headers = organizationsTableHeaders

// Member dialog state
const membersDialog = ref(false)
const selectedOrganization = ref<any>(null)

// Computed properties
const filteredOrganizations = computed(() => {
  if (!search.value) return organizations.value

  const searchTerm = search.value.toLowerCase()
  return organizations.value.filter(org =>
    org.title.toLowerCase().includes(searchTerm) ||
    org.leader?.full_name?.toLowerCase().includes(searchTerm) ||
    org.leader?.email?.toLowerCase().includes(searchTerm)
  )
})

// Event handlers
const handleCreateOrganization = () => {
  prepareCreateOrganization()
  openDialog()
}

const handleEditOrganization = (organization: any) => {
  prepareEditOrganization(organization)
  openDialog()
}

const handleDeleteOrganization = (organization: any) => {
  prepareDeleteOrganization(organization)
  openDeleteDialog()
}

const handleSaveOrganization = async () => {
  const success = await saveOrganization()
  if (success) {
    closeDialog()
    resetForm()
  }
}

const handleCloseDialog = () => {
  closeDialog()
  resetForm()
}

const handleConfirmDelete = async () => {
  if (!organizationToDelete.value) return

  const success = await deleteOrganization(organizationToDelete.value)
  if (success) {
    closeDeleteDialog()
  }
}

// Open dialog to manage member event statuses (Blocked/Cleared)
const handleOpenMembersStatusDialog = async (organization: any) => {
  selectedOrganization.value = organization
  membersDialog.value = true
  await fetchOrganizationMembers(organization.id)
}

const handleCloseMembersDialog = () => {
  membersDialog.value = false
  selectedOrganization.value = null
  clearMembersData()
}

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
            <div class="organizations-container">
    <!-- Page Header -->
    <v-card class="mb-6" elevation="7" rounded="lg">
      <v-card-title class="pa-4 pa-sm-6 bg-primary text-white">
        <!-- Mobile Layout -->
        <div class="d-block d-sm-none w-100">
          <div class="d-flex align-center justify-space-between mb-2">
            <div class="d-flex align-center">
              <v-icon size="24" class="me-2">mdi-domain</v-icon>
              <h2 class="text-body-1 font-weight-bold">Manage Organizations</h2>
            </div>
            <v-btn
              color="white"
              variant="elevated"
              size="x-small"
              @click="handleCreateOrganization"
              :loading="loading"
              icon
            >
              <v-icon size="18">mdi-plus</v-icon>
            </v-btn>
          </div>
          <p class="text-caption mb-0 opacity-90">Organizations & leaders</p>
        </div>

        <!-- Desktop Layout -->
        <div class="d-none d-sm-flex align-center justify-space-between w-100">
          <div class="d-flex align-center">
            <v-icon size="32" class="me-3">mdi-domain</v-icon>
            <div>
              <h2 class="text-h5 font-weight-bold mb-1">Manage Organizations</h2>
              <p class="text-body-2 mb-0 opacity-90">Manage organizations and their leaders</p>
            </div>
          </div>
          <v-btn
            color="white"
            variant="elevated"
            size="default"
            @click="handleCreateOrganization"
            :loading="loading"
            prepend-icon="mdi-plus"
          >
            Create Organization
          </v-btn>
        </div>
      </v-card-title>
    </v-card>

    <!-- Search Bar -->
    <v-card class="mb-4" elevation="2">
      <v-card-text class="pa-3 pa-sm-4">
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="search"
              prepend-inner-icon="mdi-magnify"
              label="Search organizations..."
              variant="outlined"
              hide-details
              clearable
              density="compact"
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Organizations Cards Grid -->
    <div v-if="loading" class="text-center pa-6 pa-sm-8">
      <v-progress-circular indeterminate color="primary" :size="$vuetify.display.xs ? '48' : '60'" class="mb-3 mb-sm-4" />
      <div class="text-body-1 text-sm-h6">Loading organizations...</div>
    </div>

    <div v-else-if="filteredOrganizations.length === 0 && !loading">
      <v-card elevation="2" class="text-center pa-6 pa-sm-8">
        <v-icon :size="$vuetify.display.xs ? '64' : '80'" color="grey-lighten-1" class="mb-3 mb-sm-4">mdi-domain-off</v-icon>
        <h3 class="text-h6 text-sm-h5 mb-2">No organizations found</h3>
        <p class="text-body-2 text-sm-body-1 text-medium-emphasis mb-3 mb-sm-4">
          {{ search ? `No organizations match "${search}"` : 'Create your first organization to get started.' }}
        </p>
        <v-btn
          v-if="!search"
          color="primary"
          prepend-icon="mdi-plus"
          @click="handleCreateOrganization"
          :size="$vuetify.display.xs ? 'default' : 'large'"
        >
          <span class="d-none d-sm-inline">Create First Organization</span>
          <span class="d-inline d-sm-none">Create Organization</span>
        </v-btn>
      </v-card>
    </div>

    <div v-else>
      <v-row>
        <v-col
          v-for="organization in filteredOrganizations"
          :key="organization.id"
          cols="12"
          sm="6"
          md="4"
          lg="3"
        >
          <v-card
            elevation="3"
            rounded="lg"
            class="organization-card fill-height"
            hover
            @click="handleOpenMembersStatusDialog(organization)"
          >
            <!-- Card Header with Organization Info -->
            <v-card-title class="pa-3 pa-sm-4 pb-2">
              <div class="d-flex align-center justify-space-between w-100">
                <div class="flex-grow-1">
                  <v-icon color="primary" :size="$vuetify.display.xs ? '20' : '24'" class="mr-2">mdi-domain</v-icon>
                  <span class="text-body-1 text-sm-h6 font-weight-bold">{{ organization.title }}</span>
                </div>
                <!-- Action Menu -->
                <v-menu location="bottom end">
                  <template v-slot:activator="{ props }">
                    <v-btn
                      icon="mdi-dots-vertical"
                      variant="text"
                      :size="$vuetify.display.xs ? 'x-small' : 'small'"
                      v-bind="props"
                      @click.stop
                    />
                  </template>
                  <v-list density="compact">
                    <v-list-item
                      @click.stop="handleOpenMembersStatusDialog(organization)"
                      prepend-icon="mdi-eye"
                    >
                      <v-list-item-title>View Members</v-list-item-title>
                    </v-list-item>
                    <v-divider />
                    <v-list-item
                      @click="handleEditOrganization(organization)"
                      prepend-icon="mdi-pencil"
                    >
                      <v-list-item-title>Edit</v-list-item-title>
                    </v-list-item>
                    <v-list-item
                      @click="handleDeleteOrganization(organization)"
                      prepend-icon="mdi-delete"
                      class="text-error"
                    >
                      <v-list-item-title>Delete</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </div>
            </v-card-title>

            <!-- Card Content -->
            <v-card-text class="pa-3 pa-sm-4 pt-0">
              <!-- Leader Information -->
              <div class="mb-2 mb-sm-3">
                <div class="text-caption text-medium-emphasis mb-1">Organization Leader</div>
                <div v-if="organization.leader" class="d-flex align-center">
                  <v-avatar :size="$vuetify.display.xs ? '24' : '28'" color="primary" class="mr-2">
                    <span class="text-white text-caption">
                      {{ getEmailInitials(organization.leader.email) }}
                    </span>
                  </v-avatar>
                  <div class="flex-grow-1">
                    <div class="text-caption text-sm-body-2 font-weight-medium">
                      {{ organization.leader.full_name || organization.leader.email }}
                    </div>
                    <div class="text-caption text-medium-emphasis d-none d-sm-block">
                      {{ organization.leader.email }}
                    </div>
                  </div>
                </div>
                <div v-else class="d-flex align-center">
                  <v-avatar :size="$vuetify.display.xs ? '24' : '28'" color="grey-lighten-2" class="mr-2">
                    <v-icon :size="$vuetify.display.xs ? '12' : '16'" color="grey">mdi-account-off</v-icon>
                  </v-avatar>
                  <v-chip color="warning" variant="tonal" :size="$vuetify.display.xs ? 'x-small' : 'small'">
                    <span class="d-none d-sm-inline">No Leader Assigned</span>
                    <span class="d-inline d-sm-none">No Leader</span>
                  </v-chip>
                </div>
              </div>

              <!-- Creation Date -->
              <div class="mb-0">
                <div class="text-caption text-medium-emphasis mb-1">Created</div>
                <div class="d-flex align-center">
                  <v-icon :size="$vuetify.display.xs ? '14' : '16'" color="grey" class="mr-1">mdi-calendar</v-icon>
                  <span class="text-caption text-sm-body-2">{{ formatDate(organization.created_at) }}</span>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- Create/Edit Organization Dialog -->
    <OrganizationFormDialog
      v-model:dialog="dialog"
      :saving="saving"
      :loading-leaders="loadingLeaders"
      :editing-organization="editingOrganization"
      :organization-form="organizationForm"
      :organization-leaders="organizationLeaders"
      @save="handleSaveOrganization"
      @close="handleCloseDialog"
    />

    <!-- Delete Confirmation Dialog -->
    <OrganizationDeleteDialog
      v-model:dialog="deleteDialog"
      :deleting="deleting"
      :organization-to-delete="organizationToDelete"
      @confirm="handleConfirmDelete"
      @close="closeDeleteDialog"
    />

    <!-- Admin: Manage Members' Event Statuses (Blocked/Cleared) -->
    <OrganizationMembersStatusDialog
      v-if="selectedOrganization?.id"
      v-model:dialog="membersDialog"
      :organization-id="selectedOrganization.id"
      :organization-title="selectedOrganization.title || 'Unknown Organization'"
      :members="members"
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
.organizations-container {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.v-card {
  border-radius: 12px !important;
}

.organization-card {
  transition: all 0.3s ease;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.organization-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15) !important;
}

.organization-card .v-card-title {
  background: rgba(var(--v-theme-surface), 0.02);
  border-bottom: 1px solid rgba(var(--v-theme-primary), 0.1);
}

/* Mobile optimizations */
@media (max-width: 600px) {
  .organizations-container {
    padding: 10px;
  }
}

/* Responsive grid improvements */
@media (min-width: 1400px) {
  .organizations-container {
    max-width: 1600px;
  }
}
</style>
