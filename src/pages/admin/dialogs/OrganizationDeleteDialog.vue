<template>
  <v-dialog v-model="localDialog" max-width="500px">
    <v-card>
      <v-card-title class="text-h5 text-center">
        <v-icon color="error" size="large" class="mb-2">mdi-alert-circle</v-icon>
        <div>Confirm Deletion</div>
      </v-card-title>
      
      <v-card-text class="text-center">
        <p>Are you sure you want to delete this organization?</p>
        <div v-if="organizationToDelete" class="mt-4 pa-3 bg-grey-lighten-4 rounded">
          <div class="text-h6 font-weight-bold">{{ organizationToDelete.title }}</div>
          <div v-if="organizationToDelete.leader" class="text-body-2 text-grey-darken-1 mt-1">
            <strong>Leader:</strong> {{ organizationToDelete.leader.full_name || organizationToDelete.leader.email }}
          </div>
          <div class="text-body-2 text-grey-darken-1 mt-1">
            <strong>ID:</strong> {{ organizationToDelete.id }}
          </div>
        </div>
        <v-alert type="warning" variant="tonal" class="text-left mt-4">
          <strong>Warning:</strong> This action cannot be undone. All associated data will be affected.
        </v-alert>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn color="grey" variant="text" @click="handleClose">
          Cancel
        </v-btn>
        <v-btn
          color="error"
          variant="flat"
          @click="handleConfirm"
          :loading="deleting"
        >
          Delete Organization
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Organization } from '../composables/useOrganizations'

// Props
interface Props {
  dialog: boolean
  deleting: boolean
  organizationToDelete: Organization | null
}

const props = defineProps<Props>()

// Emits
interface Emits {
  (e: 'update:dialog', value: boolean): void
  (e: 'confirm'): void
  (e: 'close'): void
}

const emit = defineEmits<Emits>()

// Computed properties
const localDialog = computed({
  get: () => props.dialog,
  set: (value) => emit('update:dialog', value)
})

// Event handlers
const handleConfirm = () => {
  emit('confirm')
}

const handleClose = () => {
  emit('close')
}
</script>