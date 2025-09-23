<script setup lang="ts">
import { computed, defineEmits, defineProps, defineOptions, watch } from 'vue'
import { useAddCalendarDialog } from '@/pages/admin/composables/calendarDialog'

// Component name for ESLint multi-word rule
defineOptions({
  name: 'AddCalendarDialog'
})

// Props
interface Props {
  modelValue: boolean
  selectedDate?: Date | null
}

const props = withDefaults(defineProps<Props>(), {
  selectedDate: null
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'event-created': [event: any]
}>()

// Use composable
const {
  formData,
  formRef,
  isValid,
  loading,
  minDate,
  initializeForm,
  handleSubmit,
  validationRules,
  formatters
} = useAddCalendarDialog()

// Dialog state
const dialog = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

// Computed properties
const formattedSelectedDate = computed(() => formatters.selectedDate(props.selectedDate))

// Watch for selectedDate changes
watch(() => props.selectedDate, (newDate) => {
  if (newDate && !formData.value.date) {
    formData.value.date = formattedSelectedDate.value
  }
}, { immediate: true })

// Watch for dialog open/close
watch(dialog, (isOpen) => {
  if (isOpen) {
    initializeForm(props.selectedDate)
  }
})

// Methods
const closeDialog = () => {
  dialog.value = false
}

const handleFormSubmit = async () => {
  try {
    const newEvent = await handleSubmit()
    if (newEvent) {
      emit('event-created', newEvent)
      closeDialog()
    }
  } catch (error) {
    // Error is already logged in the composable
    // You might want to show an error message to the user here
  }
}

const handleCancel = () => {
  closeDialog()
}
</script>

<template>
  <v-dialog
    v-model="dialog"
    max-width="600"
    persistent
    scrollable
  >
    <v-card class="add-event-dialog" elevation="8" rounded="lg">
      <!-- Dialog Header -->
      <v-card-title class="d-flex align-center justify-space-between pa-6 bg-primary text-white">
        <div class="d-flex align-center">
          <v-icon size="28" class="me-3">mdi-calendar-plus</v-icon>
          <div>
            <h2 class="text-h5 font-weight-bold mb-1">Add New Event</h2>
            <p class="text-body-2 mb-0 opacity-90">Create a new calendar event</p>
          </div>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          color="white"
          size="small"
          @click="handleCancel"
          :disabled="loading"
        ></v-btn>
      </v-card-title>

      <v-divider></v-divider>

      <!-- Dialog Content -->
      <v-card-text class="pa-6">
        <v-form
          ref="formRef"
          v-model="isValid"
          @submit.prevent="handleSubmit"
        >
          <v-container fluid class="pa-0">
            <v-row>
              <!-- Event Title -->
              <v-col cols="12">
                <v-text-field
                  v-model="formData.title"
                  label="Event Title"
                  placeholder="Enter event title"
                  variant="outlined"
                  :rules="validationRules.title"
                  :disabled="loading"
                  prepend-inner-icon="mdi-calendar-text"
                  class="mb-2"
                  hint="Enter a descriptive title for your event"
                  persistent-hint
                ></v-text-field>
              </v-col>

              <!-- Event Date -->
              <v-col cols="12">
                <v-text-field
                  v-model="formData.date"
                  label="Event Date"
                  type="date"
                  variant="outlined"
                  :rules="validationRules.date"
                  :disabled="loading"
                  :min="minDate"
                  prepend-inner-icon="mdi-calendar-clock"
                  class="mb-2"
                  hint="Select the date when the event will take place"
                  persistent-hint
                ></v-text-field>
              </v-col>

              <!-- Selected Date Info (if provided) -->
              <v-col v-if="selectedDate" cols="12">
                <v-alert
                  type="info"
                  variant="tonal"
                  density="compact"
                  class="mb-2"
                >
                  <template #prepend>
                    <v-icon>mdi-information</v-icon>
                  </template>
                  <span class="text-body-2">
                    Creating event for selected date: {{ formattedSelectedDate }}
                  </span>
                </v-alert>
              </v-col>
            </v-row>
          </v-container>
        </v-form>
      </v-card-text>

      <v-divider></v-divider>

      <!-- Dialog Actions -->
      <v-card-actions class="pa-6 pt-4">
        <v-spacer></v-spacer>

        <v-btn
          variant="outlined"
          color="grey"
          @click="handleCancel"
          :disabled="loading"
          class="me-3"
        >
          Cancel
        </v-btn>

        <v-btn
          color="primary"
          variant="elevated"
          @click="handleFormSubmit"
          :loading="loading"
          :disabled="!isValid || loading"
          prepend-icon="mdi-calendar-plus"
        >
          Create Event
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.add-event-dialog :deep(.v-card-title) {
  border-radius: 8px 8px 0 0;
}

.add-event-dialog :deep(.v-form) {
  width: 100%;
}

/* Ensure form fields have proper spacing */
.add-event-dialog :deep(.v-text-field) {
  margin-bottom: 8px;
}

/* Loading state styling */
.add-event-dialog :deep(.v-btn--loading) {
  pointer-events: none;
}
</style>
