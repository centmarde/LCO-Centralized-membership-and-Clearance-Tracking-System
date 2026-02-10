<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import {
  getEmailInitials,
  formatDate,
  organizationsTableHeaders
} from '@/utils/helpers'
import InnerLayoutWrapper from '@/layouts/InnerLayoutWrapper.vue'
import OrganizationFormDialog from './dialogs/OrganizationFormDialog.vue'
import OrganizationDeleteDialog from './dialogs/OrganizationDeleteDialog.vue'
import OrganizationMembersStatusDialog from './dialogs/OrganizationMembersStatusDialog.vue'
import DeletedOrgDialog from './dialogs/DeletedOrg.vue'
import { useOrganizations } from './composables/useOrganizations'
import { useDialogs } from './composables/useDialogs'
import { useOrganizationMembers } from './composables/useOrganizationMembers'
import { useEventBlockingStore } from '@/stores/eventBlocking'
import { useAuthUserStore } from '@/stores/authUser'

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
  restoreOrganization,
  hardDeleteOrganization,
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

const eventBlockingStore = useEventBlockingStore()
const authStore = useAuthUserStore()
const batchDialog = ref(false)
const selectedBatchId = ref<string | null>(null)

// Table configuration
const headers = organizationsTableHeaders

// Member dialog state
const membersDialog = ref(false)
const selectedOrganization = ref<any>(null)
const deletedOrgDialog = ref(false)
const selectedDeletedOrganization = ref<any>(null)
const pendingBatches = computed(() => eventBlockingStore.pendingBatches)
const batchItems = computed(() => eventBlockingStore.batchItems)

// Computed properties
const activeOrganizations = computed(() => organizations.value.filter(org => !org.deleted_at))
const deletedOrganizations = computed(() => organizations.value.filter(org => !!org.deleted_at))

const filteredActiveOrganizations = computed(() => {
  if (!search.value) return activeOrganizations.value
  const searchTerm = search.value.toLowerCase()
  return activeOrganizations.value.filter(org =>
    org.title.toLowerCase().includes(searchTerm) ||
    org.leader?.full_name?.toLowerCase().includes(searchTerm) ||
    org.leader?.email?.toLowerCase().includes(searchTerm)
  )
})

const filteredDeletedOrganizations = computed(() => {
  if (!search.value) return deletedOrganizations.value
  const searchTerm = search.value.toLowerCase()
  return deletedOrganizations.value.filter(org =>
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

const handleOpenDeletedDialog = (organization: any) => {
  selectedDeletedOrganization.value = organization
  deletedOrgDialog.value = true
}

const closeDeletedDialog = () => {
  deletedOrgDialog.value = false
  selectedDeletedOrganization.value = null
}

const handleRecoverOrganizationFromCard = async (organization: any) => {
  selectedDeletedOrganization.value = organization
  await handleRecoverOrganization()
}

const handleRecoverOrganization = async () => {
  if (!selectedDeletedOrganization.value) return
  const success = await restoreOrganization(selectedDeletedOrganization.value)
  if (success) {
    closeDeletedDialog()
  }
}

const handleHardDeleteOrganization = async () => {
  if (!selectedDeletedOrganization.value) return
  const success = await hardDeleteOrganization(selectedDeletedOrganization.value)
  if (success) {
    closeDeletedDialog()
  }
}

const handleOpenBatch = async (batchId: string) => {
  selectedBatchId.value = batchId
  batchDialog.value = true
  await eventBlockingStore.fetchBatchItems(batchId)
}

const closeBatchDialog = () => {
  batchDialog.value = false
  selectedBatchId.value = null
}

const handleApproveBatch = async (batchId: string) => {
  await eventBlockingStore.approveBatch(batchId, authStore.userData?.id || null)
}

const handleDeclineBatch = async (batchId: string) => {
  await eventBlockingStore.declineBatch(batchId, authStore.userData?.id || null)
}

// Open dialog to manage member event statuses (Blocked/Cleared)
const handleOpenMembersStatusDialog = async (organization: any) => {
  if (organization.deleted_at) {
    handleOpenDeletedDialog(organization)
    return
  }
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
  eventBlockingStore.fetchPendingBatches()
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

    <!-- Pending Batch Blocking Submissions -->
    <v-card class="mb-6" elevation="2">
      <v-card-title class="d-flex align-center justify-space-between pa-4 pa-sm-5">
        <div class="d-flex align-center">
          <v-icon class="me-2" color="primary">mdi-clipboard-clock</v-icon>
          <div>
            <div class="text-subtitle-1 font-weight-bold">Pending Batch Blocking</div>
            <div class="text-caption text-medium-emphasis">Submitted by organization leaders for approval</div>
          </div>
        </div>
        <v-chip color="primary" variant="tonal" size="small">{{ pendingBatches.length }} pending</v-chip>
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-4 pa-sm-5">
        <div v-if="eventBlockingStore.loading" class="text-center py-4">
          <v-progress-circular indeterminate color="primary" />
        </div>
        <div v-else-if="pendingBatches.length === 0" class="text-medium-emphasis text-body-2">No pending submissions.</div>
        <v-table v-else density="compact">
          <thead>
            <tr>
              <th class="text-left">Event</th>
              <th class="text-left">Organization</th>
              <th class="text-left">Leader</th>
              <th class="text-left">Submitted</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="batch in pendingBatches" :key="batch.id">
              <td>
                <div class="font-weight-medium">{{ batch.event?.title || 'Unknown Event' }}</div>
                <div class="text-caption text-medium-emphasis">{{ formatDate(batch.event?.date || undefined) }}</div>
              </td>
              <td>{{ batch.organization?.title || batch.organization_id }}</td>
              <td>{{ batch.leader?.full_name || batch.leader?.email || batch.leader_id || 'Unknown' }}</td>
              <td>{{ formatDate(batch.submitted_at || undefined) }}</td>
              <td class="text-right">
                <v-btn size="small" variant="text" color="primary" @click="handleOpenBatch(batch.id)">View</v-btn>
                <v-btn size="small" variant="tonal" color="success" class="ml-1" :loading="eventBlockingStore.approving" @click="handleApproveBatch(batch.id)">Approve</v-btn>
                <v-btn size="small" variant="text" color="error" class="ml-1" :loading="eventBlockingStore.approving" @click="handleDeclineBatch(batch.id)">Decline</v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>

    <!-- Organizations Cards Grid -->
    <div v-if="loading" class="text-center pa-6 pa-sm-8">
      <v-progress-circular indeterminate color="primary" :size="$vuetify.display.xs ? '48' : '60'" class="mb-3 mb-sm-4" />
      <div class="text-body-1 text-sm-h6">Loading organizations...</div>
    </div>

    <div v-else-if="filteredActiveOrganizations.length === 0 && !loading">
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
          v-for="organization in filteredActiveOrganizations"
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
                      <v-list-item-title>Move to Deleted</v-list-item-title>
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

    <!-- Deleted Organizations Section -->
    <div v-if="filteredDeletedOrganizations.length > 0" class="mt-8">
      <div class="d-flex align-center mb-3">
        <v-icon class="me-2" color="error">mdi-delete-clock</v-icon>
        <span class="text-subtitle-1 font-weight-bold">Deleted Organizations (Recoverable)</span>
      </div>
      <v-row>
        <v-col
          v-for="organization in filteredDeletedOrganizations"
          :key="organization.id"
          cols="12"
          sm="6"
          md="4"
          lg="3"
        >
          <v-card
            elevation="1"
            rounded="lg"
            class="organization-card fill-height"
          >
            <v-card-title class="pa-3 pa-sm-4 pb-2 d-flex justify-space-between align-center">
              <div class="d-flex align-center">
                <v-icon color="error" :size="$vuetify.display.xs ? '20' : '24'" class="mr-2">mdi-domain-off</v-icon>
                <span class="text-body-1 text-sm-h6 font-weight-bold">{{ organization.title }}</span>
              </div>
              <v-chip color="error" variant="tonal" size="x-small">Deleted</v-chip>
            </v-card-title>

            <v-card-text class="pa-3 pa-sm-4 pt-0">
              <div class="text-caption text-medium-emphasis mb-2">Deleted At</div>
              <div class="d-flex align-center mb-3">
                <v-icon :size="$vuetify.display.xs ? '14' : '16'" color="grey" class="mr-1">mdi-calendar-remove</v-icon>
                <span class="text-caption text-sm-body-2">{{ formatDate(organization.deleted_at || undefined) }}</span>
              </div>

              <v-alert type="warning" variant="tonal" density="comfortable" class="mb-3">
                Members removed and leader reset to student. Recover to use again.
              </v-alert>

              <div class="d-flex flex-column">
                <v-btn color="primary" variant="tonal" block class="mb-2" @click="handleRecoverOrganizationFromCard(organization)" :loading="saving" :disabled="deleting">
                  Recover
                </v-btn>
                <v-btn color="error" variant="text" block @click="handleOpenDeletedDialog(organization)" :loading="deleting" :disabled="saving">
                  Options
                </v-btn>
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

    <DeletedOrgDialog
      v-model:dialog="deletedOrgDialog"
      :organization="selectedDeletedOrganization"
      :loading="deleting || saving"
      @recover="handleRecoverOrganization"
      @purge="handleHardDeleteOrganization"
      @close="closeDeletedDialog"
    />

    <v-dialog v-model="batchDialog" max-width="720px">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="me-2" color="primary">mdi-clipboard-list</v-icon>
          Batch Details
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" @click="closeBatchDialog" />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
          <div v-if="eventBlockingStore.loading" class="text-center py-4">
            <v-progress-circular indeterminate color="primary" />
          </div>
          <div v-else-if="batchItems.length === 0" class="text-medium-emphasis text-body-2">No students in this batch.</div>
          <v-table v-else density="compact">
            <thead>
              <tr>
                <th class="text-left">Student</th>
                <th class="text-left">Student #</th>
                <th class="text-left">Email</th>
                <th class="text-left">Present</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in batchItems" :key="item.id">
                <td>{{ item.student?.full_name || item.student?.email || item.student_id }}</td>
                <td>{{ item.student?.student_number || '—' }}</td>
                <td>{{ item.student?.email || '—' }}</td>
                <td>
                  <v-chip color="success" variant="tonal" size="x-small" v-if="item.present">Present</v-chip>
                  <v-chip color="grey" variant="tonal" size="x-small" v-else>Not marked</v-chip>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="closeBatchDialog">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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
