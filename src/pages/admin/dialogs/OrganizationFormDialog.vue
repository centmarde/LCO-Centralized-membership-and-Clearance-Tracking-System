<template>
  <v-dialog v-model="localDialog" max-width="600px" persistent>
    <v-card>
      <v-card-title class="text-h5">
        {{ editingOrganization ? 'Edit Organization' : 'Create New Organization' }}
      </v-card-title>
      
      <v-card-text>
        <v-form ref="formRef" v-model="formValid">
          <v-container>
            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model="organizationForm.title"
                  label="Organization Name"
                  variant="outlined"
                  :rules="organizationValidationRules.title"
                  prepend-inner-icon="mdi-domain"
                />
              </v-col>
              
              <!-- Leader Selection -->
              <v-col cols="12">
                <v-select
                  v-model="organizationForm.leader_id"
                  :items="organizationLeaders"
                  item-title="display_name"
                  item-value="id"
                  label="Organization Leader"
                  variant="outlined"
                  prepend-inner-icon="mdi-account-tie"
                  :loading="loadingLeaders"
                  clearable
                  hint="Select a user with Organization Leader role"
                  persistent-hint
                >
                  <template v-slot:item="{ props, item }">
                    <v-list-item v-bind="props">
                      <template v-slot:prepend>
                        <v-avatar size="32" color="primary">
                          <span class="text-white text-caption">
                            {{ getEmailInitials(item.raw.email) }}
                          </span>
                        </v-avatar>
                      </template>
                      <v-list-item-title>{{ item.raw.full_name || item.raw.email }}</v-list-item-title>
                      <v-list-item-subtitle>{{ item.raw.email }}</v-list-item-subtitle>
                    </v-list-item>
                  </template>
                </v-select>
              </v-col>
            </v-row>
          </v-container>
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn color="grey" variant="text" @click="handleClose">
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          @click="handleSave"
          :loading="saving"
          :disabled="!formValid"
        >
          {{ editingOrganization ? 'Update' : 'Create' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { getEmailInitials } from '@/utils/helpers'
import { organizationValidationRules } from '../utils/organizationConfig'
import type { Organization, OrganizationLeader } from '../composables/useOrganizations'

// Props
interface Props {
  dialog: boolean
  saving: boolean
  loadingLeaders: boolean
  editingOrganization: Organization | null
  organizationForm: {
    title: string
    leader_id: string | null
  }
  organizationLeaders: OrganizationLeader[]
}

const props = defineProps<Props>()

// Emits
interface Emits {
  (e: 'update:dialog', value: boolean): void
  (e: 'save'): void
  (e: 'close'): void
}

const emit = defineEmits<Emits>()

// Local reactive state
const formRef = ref()
const formValid = ref(false)

// Computed properties
const localDialog = computed({
  get: () => props.dialog,
  set: (value) => emit('update:dialog', value)
})

// Event handlers
const handleSave = () => {
  if (formValid.value) {
    emit('save')
  }
}

const handleClose = () => {
  emit('close')
}
</script>