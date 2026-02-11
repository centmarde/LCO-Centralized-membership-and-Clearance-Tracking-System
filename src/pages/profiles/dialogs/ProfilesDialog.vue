<script setup lang="ts">
import { ref, computed, watch } from 'vue'

// Props
interface Props {
  modelValue: boolean
  dialogType: 'confirm' | 'edit' | 'password'
  dialogTitle: string
  dialogMessage?: string
  confirmType?: 'danger' | 'warning' | 'info'
  profileData?: any
}

const props = withDefaults(defineProps<Props>(), {
  dialogMessage: '',
  confirmType: 'info',
  profileData: () => ({})
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'confirm': []
  'save': [data: any]
  'password-change': [data: any]
}>()

// Reactive data
const loading = ref(false)
const formValid = ref(false)
const passwordFormValid = ref(false)
const dialogForm = ref()
const passwordForm = ref()

const editData = ref({
  full_name: '',
  student_number: '',
  role_id: null
})

const passwordData = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// Computed
const dialog = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const dialogIcon = computed(() => {
  switch (props.dialogType) {
    case 'confirm':
      return props.confirmType === 'danger' ? 'mdi-alert-circle' : 'mdi-help-circle'
    case 'edit':
      return 'mdi-pencil'
    case 'password':
      return 'mdi-lock-reset'
    default:
      return 'mdi-information'
  }
})

const actionButtonText = computed(() => {
  switch (props.dialogType) {
    case 'confirm':
      return props.confirmType === 'danger' ? 'Delete' : 'Confirm'
    case 'edit':
      return 'Save Changes'
    case 'password':
      return 'Change Password'
    default:
      return 'OK'
  }
})

const isFormValid = computed(() => {
  switch (props.dialogType) {
    case 'confirm':
      return true
    case 'edit':
      return formValid.value
    case 'password':
      return passwordFormValid.value
    default:
      return true
  }
})

// Form validation rules
const rules = {
  required: (value: string) => !!value || 'This field is required',
  minLength: (value: string) => (value && value.length >= 6) || 'Password must be at least 6 characters',
  passwordMatch: (value: string) => value === passwordData.value.newPassword || 'Passwords do not match'
}

// Methods
const closeDialog = () => {
  dialog.value = false
  resetForms()
}

const resetForms = () => {
  editData.value = {
    full_name: '',
    student_number: '',
    role_id: null
  }

  passwordData.value = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  }

  formValid.value = false
  passwordFormValid.value = false
}

const handleAction = async () => {
  loading.value = true

  try {
    switch (props.dialogType) {
      case 'confirm':
        emit('confirm')
        break
      case 'edit':
        if (dialogForm.value) {
          const { valid } = await dialogForm.value.validate()
          if (valid) {
            emit('save', { ...editData.value })
          }
        }
        break
      case 'password':
        if (passwordForm.value) {
          const { valid } = await passwordForm.value.validate()
          if (valid) {
            emit('password-change', { ...passwordData.value })
          }
        }
        break
    }
  } finally {
    loading.value = false
  }
}

// Watch for profile data changes
watch(() => props.profileData, (newData) => {
  if (newData && props.dialogType === 'edit') {
    editData.value = {
      full_name: newData.full_name || '',
      student_number: newData.student_number || '',
      role_id: newData.role_id
    }
  }
}, { immediate: true, deep: true })

// Watch dialog state
watch(dialog, (newValue) => {
  if (!newValue) {
    resetForms()
  }
})
</script>

<template>
  <v-dialog v-model="dialog" max-width="600px" persistent>
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon left class="mr-2">{{ dialogIcon }}</v-icon>
        {{ dialogTitle }}
        <v-spacer />
        <v-btn
          icon
          @click="closeDialog"
          :disabled="loading"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text>
        <!-- Confirmation Dialog -->
        <div v-if="dialogType === 'confirm'">
          <p class="text-body-1 mb-4">{{ dialogMessage }}</p>
        </div>

        <!-- Edit Profile Dialog -->
        <div v-else-if="dialogType === 'edit'">
          <v-form ref="dialogForm" v-model="formValid">
            <v-text-field
              v-model="editData.full_name"
              label="Full Name"
              :rules="[rules.required]"
              prepend-inner-icon="mdi-account"
            />

            <v-text-field
              v-if="editData.role_id === 2"
              v-model="editData.student_number"
              label="Student Number"
              prepend-inner-icon="mdi-school"
            />
          </v-form>
        </div>

        <!-- Change Password Dialog -->
        <div v-else-if="dialogType === 'password'">
          <v-form ref="passwordForm" v-model="passwordFormValid">
            <v-text-field
              v-model="passwordData.currentPassword"
              label="Current Password"
              type="password"
              :rules="[rules.required]"
              prepend-inner-icon="mdi-lock"
            />

            <v-text-field
              v-model="passwordData.newPassword"
              label="New Password"
              type="password"
              :rules="[rules.required, rules.minLength]"
              prepend-inner-icon="mdi-lock-reset"
            />

            <v-text-field
              v-model="passwordData.confirmPassword"
              label="Confirm New Password"
              type="password"
              :rules="[rules.required, rules.passwordMatch]"
              prepend-inner-icon="mdi-lock-check"
            />
          </v-form>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn
          color="grey"
          variant="outlined"
          @click="closeDialog"
          :disabled="loading"
        >
          Cancel
        </v-btn>
        <v-btn
          :color="dialogType === 'confirm' && confirmType === 'danger' ? 'error' : 'primary'"
          @click="handleAction"
          :loading="loading"
          :disabled="!isFormValid"
        >
          {{ actionButtonText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* Add any specific styling for the dialog here */
</style>
