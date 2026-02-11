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

              <v-col cols="12">
                <v-select
                  v-model="organizationForm.category"
                  :items="categoryOptions"
                  item-title="title"
                  item-value="value"
                  label="Category"
                  variant="outlined"
                  prepend-inner-icon="mdi-shape"
                  :rules="organizationValidationRules.category"
                >
                  <template #selection="{ item }">
                    <div class="d-flex align-center">
                      <span class="font-weight-medium">{{ item.raw.short }}</span>
                      <span class="text-caption text-medium-emphasis ml-2">{{ item.raw.title }}</span>
                    </div>
                  </template>
                  <template #item="{ props, item }">
                    <v-list-item
                      v-bind="props"
                      :title="item.raw.title"
                      :subtitle="item.raw.short"
                    />
                  </template>
                </v-select>
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

              <v-col cols="12" sm="12">
                <v-text-field
                  v-model="membershipDeadlineInput"
                  label="Membership Deadline"
                  type="datetime-local"
                  variant="outlined"
                  append-inner-icon="mdi-calendar-clock"
                  class="deadline-field"
                  hint="After this date, new members cannot be added unless quota is met"
                  persistent-hint
                  ref="deadlineField"
                  @click="openDeadlinePicker"
                  @keydown.enter.prevent="openDeadlinePicker"
                />
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
          :disabled="!props.organizationForm.title.trim() || !props.organizationForm.category"
        >
          {{ editingOrganization ? 'Update' : 'Create' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { getEmailInitials, organizationValidationRules, organizationCategories } from '@/utils/helpers'
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
    membership_deadline: string | null
    category: string
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
const deadlineField = ref()
const categoryOptions = organizationCategories

const pad2 = (n: number) => String(n).padStart(2, '0')
const toDatetimeLocal = (value: string) => {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

const membershipDeadlineInput = computed({
  get: () => props.organizationForm.membership_deadline ? toDatetimeLocal(props.organizationForm.membership_deadline) : '',
  set: (value: string) => {
    props.organizationForm.membership_deadline = value || null
  }
})

const openDeadlinePicker = () => {
  const inputEl = deadlineField.value?.$el?.querySelector('input') as HTMLInputElement | undefined
  if (inputEl) {
    inputEl.showPicker?.()
    inputEl.focus()
  }
}

// Computed properties
const localDialog = computed({
  get: () => props.dialog,
  set: (value) => emit('update:dialog', value)
})

// Watch for form changes to validate
watch(() => props.organizationForm.title, async () => {
  if (formRef.value) {
    await nextTick()
    formRef.value.validate()
  }
}, { immediate: true })

// Watch for dialog opening to reset validation
watch(() => props.dialog, async (newVal) => {
  if (newVal && formRef.value) {
    await nextTick()
    // Reset validation and then validate
    formRef.value.resetValidation()
    if (props.organizationForm.title) {
      formRef.value.validate()
    }
  }
})

// Event handlers
const handleSave = async () => {
  if (formRef.value) {
    const { valid } = await formRef.value.validate()
    if (valid) {
      emit('save')
    }
  }
}

const handleClose = () => {
  emit('close')
}
</script>

<style scoped>
:deep(.deadline-field input::-webkit-calendar-picker-indicator) {
  opacity: 0;
  display: none;
}
</style>