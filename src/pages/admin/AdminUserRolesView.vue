<script setup lang="ts">
import { useAdminUserRoles } from './composables/adminUserRoles'
import InnerLayoutWrapper from '@/layouts/InnerLayoutWrapper.vue'
const {
  // Store state
  roles,
  loading,
  error,

  // Local state
  isDialogOpen,
  isDeleteDialogOpen,
  isEditing,
  selectedRole,
  searchQuery,
  formData,

  // Computed
  filteredRoles,
  isFormValid,

  // Actions
  openCreateDialog,
  openEditDialog,
  openDeleteDialog,
  closeDialog,
  handleSubmit,
  handleDelete,
  refreshRoles,
  clearError
} = useAdminUserRoles()

// Table headers
const headers = [
  { title: 'ID', key: 'id', sortable: true },
  { title: 'Title', key: 'title', sortable: true },
  { title: 'Created At', key: 'created_at', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, align: 'center' as const }
] as const

// Format date helper
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <InnerLayoutWrapper>
    <template #content>
      <v-container fluid class="pa-6">
    <!-- Header Section -->
    <v-row class="mb-6">
      <v-col cols="12">
        <div class="d-flex justify-space-between align-center">
          <div>
            <h1 class="text-h4 font-weight-bold mb-2">User Roles Management</h1>
            <p class="text-body-1 text-grey-darken-1">
              Manage system roles and permissions
            </p>
          </div>
          <v-btn
            color="primary"
            size="large"
            prepend-icon="mdi-plus"
            @click="openCreateDialog"
            :loading="loading"
          >
            Add New Role
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <!-- Error Alert -->
    <v-row v-if="error">
      <v-col cols="12">
        <v-alert
          type="error"
          variant="tonal"
          closable
          @click:close="clearError"
          class="mb-4"
        >
          {{ error }}
        </v-alert>
      </v-col>
    </v-row>

    <!-- Search and Filter Section -->
    <v-row class="mb-4">
      <v-col cols="12" md="6">
        <v-text-field
          v-model="searchQuery"
          label="Search roles..."
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          clearable
          hide-details
        />
      </v-col>
      <v-col cols="12" md="6" class="d-flex justify-end align-center">
        <v-btn
          variant="outlined"
          prepend-icon="mdi-refresh"
          @click="refreshRoles"
          :loading="loading"
        >
          Refresh
        </v-btn>
      </v-col>
    </v-row>

    <!-- Data Table -->
    <v-card>
      <v-data-table
        :headers="headers"
        :items="filteredRoles"
        :loading="loading"
        class="elevation-1"
        item-key="id"
        show-current-page
        :items-per-page="10"
      >
        <!-- Loading slot -->
        <template #loading>
          <v-skeleton-loader type="table-row@10" />
        </template>

        <!-- No data slot -->
        <template #no-data>
          <div class="text-center py-8">
            <v-icon size="64" color="grey-lighten-1" class="mb-4">
              mdi-account-group-outline
            </v-icon>
            <h3 class="text-h6 mb-2">No roles found</h3>
            <p class="text-body-2 text-grey-darken-1 mb-4">
              {{ searchQuery ? 'No roles match your search criteria.' : 'Get started by creating your first role.' }}
            </p>
            <v-btn
              v-if="!searchQuery"
              color="primary"
              @click="openCreateDialog"
            >
              Create First Role
            </v-btn>
          </div>
        </template>

        <!-- Title column -->
        <template #item.title="{ item }">
          <div class="d-flex align-center">
            <v-avatar size="32" color="primary" class="mr-3">
              <v-icon color="white">mdi-account-group</v-icon>
            </v-avatar>
            <div>
              <div class="font-weight-medium">
                {{ item.title || 'Untitled Role' }}
              </div>
            </div>
          </div>
        </template>

        <!-- Created at column -->
        <template #item.created_at="{ item }">
          <span class="text-body-2">
            {{ formatDate(item.created_at) }}
          </span>
        </template>

        <!-- Actions column -->
        <template #item.actions="{ item }">
          <div class="d-flex justify-center ga-2">
            <v-btn
              icon="mdi-pencil"
              size="small"
              variant="text"
              color="primary"
              @click="openEditDialog(item)"
              :loading="loading"
            />
            <v-btn
              icon="mdi-delete"
              size="small"
              variant="text"
              color="error"
              @click="openDeleteDialog(item)"
              :loading="loading"
            />
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Create/Edit Dialog -->
    <v-dialog
      v-model="isDialogOpen"
      max-width="500px"
      persistent
    >
      <v-card>
        <v-card-title class="text-h5 pa-6 pb-4">
          {{ isEditing ? 'Edit Role' : 'Create New Role' }}
        </v-card-title>

        <v-card-text class="pa-6 pt-0">
          <v-form @submit.prevent="handleSubmit">
            <v-text-field
              v-model="formData.title"
              label="Role Title *"
              variant="outlined"
              :rules="[v => !!v || 'Role title is required']"
              required
              autofocus
            />
          </v-form>
        </v-card-text>

        <v-card-actions class="pa-6 pt-0">
          <v-spacer />
          <v-btn
            variant="text"
            @click="closeDialog"
            :disabled="loading"
          >
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            @click="handleSubmit"
            :loading="loading"
            :disabled="!isFormValid"
          >
            {{ isEditing ? 'Update' : 'Create' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog
      v-model="isDeleteDialogOpen"
      max-width="400px"
      persistent
    >
      <v-card>
        <v-card-title class="text-h5 pa-6 pb-4">
          Confirm Delete
        </v-card-title>

        <v-card-text class="pa-6 pt-0">
          <p class="text-body-1 mb-4">
            Are you sure you want to delete the role
            <strong>"{{ selectedRole?.title }}"</strong>?
          </p>
          <v-alert
            type="warning"
            variant="tonal"
            density="compact"
            class="mb-0"
          >
            This action cannot be undone and will also delete all associated role pages.
          </v-alert>
        </v-card-text>

        <v-card-actions class="pa-6 pt-0">
          <v-spacer />
          <v-btn
            variant="text"
            @click="closeDialog"
            :disabled="loading"
          >
            Cancel
          </v-btn>
          <v-btn
            color="error"
            @click="handleDelete"
            :loading="loading"
          >
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
    </template>
  </InnerLayoutWrapper>
</template>

<style scoped>
/* Add any custom styles if needed */
</style>
