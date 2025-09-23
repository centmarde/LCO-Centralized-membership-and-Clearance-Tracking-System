<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useViewCalendarDialog } from '@/pages/admin/composables/calendarDialog'
import type { Event } from '@/stores/eventsData'

interface Props {
  isOpen: boolean
  event: Event | null
}

interface Emits {
  (e: 'update:isOpen', value: boolean): void
  (e: 'eventUpdated', event: Event): void
  (e: 'eventDeleted', eventId: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Use the view calendar dialog composable
const {
  isEditMode,
  loading,
  deleteLoading,
  showDeleteConfirm,
  formData,
  formRef,
  isValid,
  minDate,
  initializeForm,
  toggleEditMode,
  handleUpdate,
  confirmDelete,
  cancelDelete,
  handleDelete,
  resetStates,
  getFormattedDate,
  getFormattedCreatedAt,
  getEventStatusColor,
  getEventStatusText,
  getIsEventInPast,
  validationRules
} = useViewCalendarDialog()

// Computed properties for current event with proper reactivity and debugging
const formattedDate = computed(() => {
  console.log('🔍 Debug - Event object:', props.event)
  console.log('🔍 Debug - Event date property:', props.event?.date)
  console.log('🔍 Debug - Event date type:', typeof props.event?.date)

  if (props.event?.date) {
    const dateValue = new Date(props.event.date)
    console.log('🔍 Debug - Parsed date:', dateValue)
    console.log('🔍 Debug - Formatted date:', dateValue.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }))

    return dateValue.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }
  return 'No date available'
})

const formattedCreatedAt = computed(() => {
  console.log('🔍 Debug - Event created_at:', props.event?.created_at)

  if (props.event?.created_at) {
    const createdDate = new Date(props.event.created_at)
    console.log('🔍 Debug - Parsed created_at:', createdDate)

    return createdDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  return 'Unknown'
})

const eventStatusColor = computed(() => getEventStatusColor(props.event))
const eventStatusText = computed(() => getEventStatusText(props.event))
const isEventInPast = computed(() => getIsEventInPast(props.event))

// Local dialog state
const internalDialog = computed({
  get: () => props.isOpen,
  set: (value: boolean) => emit('update:isOpen', value)
})

// Watch for dialog open/close to initialize form
watch(() => props.isOpen, (newValue) => {
  console.log('🔍 Debug - Dialog isOpen changed:', newValue)

  if (newValue && props.event) {
    console.log('🔍 Debug - Dialog opened with event:', props.event)
    console.log('🔍 Debug - Event keys:', Object.keys(props.event))
    console.log('🔍 Debug - Event date in watch:', props.event.date)
    initializeForm(props.event)
  } else if (!newValue) {
    console.log('🔍 Debug - Dialog closed, resetting states')
    resetStates()
  }
})

// Watch for event changes
watch(() => props.event, (newEvent) => {
  console.log('🔍 Debug - Event prop changed:', newEvent)
  if (newEvent) {
    console.log('🔍 Debug - New event date:', newEvent.date)
    console.log('🔍 Debug - New event created_at:', newEvent.created_at)
  }
}, { deep: true })

// Handle close dialog
const closeDialog = () => {
  internalDialog.value = false
}

// Handle edit mode toggle
const handleEditToggle = () => {
  toggleEditMode(props.event)
}

// Handle update submission
const handleUpdateSubmit = async () => {
  try {
    const updatedEvent = await handleUpdate()
    if (updatedEvent) {
      emit('eventUpdated', updatedEvent)
      closeDialog()
    }
  } catch (error) {
    console.error('Failed to update event:', error)
    // Could add toast notification here
  }
}

// Handle delete confirmation
const handleDeleteConfirm = () => {
  confirmDelete()
}

// Handle delete cancellation
const handleDeleteCancel = () => {
  cancelDelete()
}

// Handle delete submission
const handleDeleteSubmit = async () => {
  if (!props.event) return

  try {
    const success = await handleDelete(props.event.id)
    if (success) {
      emit('eventDeleted', props.event.id)
      closeDialog()
    }
  } catch (error) {
    console.error('Failed to delete event:', error)
    // Could add toast notification here
  }
}
</script>

<template>
  <v-dialog
    v-model="internalDialog"
    max-width="600px"
    persistent
  >
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex justify-space-between align-center pa-4">
        <span class="text-h5">
          {{ isEditMode ? 'Edit Event' : 'Event Details' }}
        </span>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          @click="closeDialog"
        />
      </v-card-title>

      <v-divider />

      <!-- Content -->
      <v-card-text class="pa-4">
        <!-- Event Status Chip -->
        <div class="mb-4">
          <v-chip
            :color="eventStatusColor.value"
            variant="flat"
            size="small"
            class="text-white"
          >
            <v-icon
              start
              :icon="isEventInPast ? 'mdi-clock-alert' : 'mdi-calendar-check'"
            />
            {{ eventStatusText }}
          </v-chip>
        </div>

        <!-- View Mode -->
        <div v-if="!isEditMode" class="space-y-4">
          <!-- Event Title -->
          <div>
            <v-label class="text-subtitle-2 text-medium-emphasis mb-1">
              Event Title
            </v-label>
            <div class="text-h6">
              {{ event?.title || 'No title' }}
            </div>
          </div>

          <!-- Event Date -->
          <div>
            <v-label class="text-subtitle-2 text-medium-emphasis mb-1">
              Event Date
            </v-label>
            <div class="text-body-1">
              {{ formattedDate }}
            </div>

          </div>

          <!-- Created Date -->
          <div>
            <v-label class="text-subtitle-2 text-medium-emphasis mb-1">
              Created
            </v-label>
            <div class="text-body-2 text-medium-emphasis">
              {{ formattedCreatedAt }}
            </div>
          </div>
        </div>

        <!-- Edit Mode -->
        <v-form
          v-else
          ref="formRef"
          v-model="isValid"
          @submit.prevent="handleUpdateSubmit"
        >
          <!-- Event Title Input -->
          <v-text-field
            v-model="formData.title"
            label="Event Title"
            :rules="validationRules.title"
            variant="outlined"
            density="comfortable"
            class="mb-4"
            autofocus
          />

          <!-- Event Date Input -->
          <v-text-field
            v-model="formData.date"
            label="Event Date"
            type="date"
            :rules="validationRules.date"
            :min="minDate"
            variant="outlined"
            density="comfortable"
            class="mb-4"
          />
        </v-form>

        <!-- Delete Confirmation -->
        <v-alert
          v-if="showDeleteConfirm"
          type="warning"
          variant="tonal"
          class="mt-4"
        >
          <div class="text-body-2 mb-3">
            Are you sure you want to delete this event? This action cannot be undone.
          </div>
          <div class="d-flex gap-2">
            <v-btn
              color="error"
              variant="flat"
              size="small"
              :loading="deleteLoading"
              @click="handleDeleteSubmit"
            >
              Delete Event
            </v-btn>
            <v-btn
              variant="outlined"
              size="small"
              @click="handleDeleteCancel"
            >
              Cancel
            </v-btn>
          </div>
        </v-alert>
      </v-card-text>

      <v-divider />

      <!-- Actions -->
      <v-card-actions class="pa-4">
        <v-spacer />

        <!-- View Mode Actions -->
        <template v-if="!isEditMode && !showDeleteConfirm">
          <v-btn
            color="error"
            variant="outlined"
            prepend-icon="mdi-delete"
            @click="handleDeleteConfirm"
          >
            Delete
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            prepend-icon="mdi-pencil"
            @click="handleEditToggle"
          >
            Edit
          </v-btn>
        </template>

        <!-- Edit Mode Actions -->
        <template v-if="isEditMode && !showDeleteConfirm">
          <v-btn
            variant="outlined"
            @click="handleEditToggle"
          >
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            prepend-icon="mdi-content-save"
            :loading="loading"
            :disabled="!isValid"
            @click="handleUpdateSubmit"
          >
            Save Changes
          </v-btn>
        </template>

        <!-- Close button when in delete confirmation mode -->
        <template v-if="showDeleteConfirm">
          <v-btn
            variant="outlined"
            @click="closeDialog"
          >
            Close
          </v-btn>
        </template>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.space-y-4 > * + * {
  margin-top: 1rem;
}
</style>
