import { ref, computed, watch } from 'vue'
import { createEvent, updateEvent, deleteEvent, type Event, type CreateEventRequest, type UpdateEventRequest } from '@/stores/eventsData'
import { supabase } from '@/lib/supabase'
import { useOrganizationMembersStore } from '@/stores/organizationMembersData'

// Types
export interface DialogState {
  isOpen: boolean
  loading: boolean
  deleteLoading?: boolean
  isEditMode?: boolean
  showDeleteConfirm?: boolean
}

export interface FormValidation {
  isValid: boolean
  formRef: any
}

// Validation Rules
export const validationRules = {
  title: [
    (v: string) => !!v || 'Event title is required',
    (v: string) => (v && v.length >= 3) || 'Title must be at least 3 characters',
    (v: string) => (v && v.length <= 100) || 'Title must be less than 100 characters'
  ],
  date: [
    (v: string) => !!v || 'Event date is required',
    (v: string) => {
      if (!v) return 'Event date is required'
      const date = new Date(v)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return date >= today || 'Event date cannot be in the past'
    }
  ]
}

// Utility Functions
export const formatters = {
  selectedDate: (date: Date | null): string => {
    if (!date) return ''
    return date.toISOString().split('T')[0]
  },

  eventDate: (dateString: string | undefined): string => {
    if (!dateString) return 'No date set'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  },

  createdAt: (dateString: string | undefined): string => {
    if (!dateString) return 'Unknown'
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  },

  minDate: (): string => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }
}

// Event Status Utilities
export const eventStatus = {
  getColor: (dateString: string | undefined): string => {
    if (!dateString) return 'grey'
    const eventDate = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (eventDate < today) return 'error'
    if (eventDate.getTime() === today.getTime()) return 'warning'
    return 'success'
  },

  getText: (dateString: string | undefined): string => {
    if (!dateString) return 'No Date'
    const eventDate = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (eventDate < today) return 'Past Event'
    if (eventDate.getTime() === today.getTime()) return 'Today'
    return 'Upcoming'
  },

  isInPast: (dateString: string | undefined): boolean => {
    if (!dateString) return false
    const eventDate = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return eventDate < today
  }
}

// Add Event Composable
export function useAddCalendarDialog() {
  // State
  const formData = ref<CreateEventRequest>({
    title: '',
    date: ''
  })

  // Optional organization to attach for auto-blocking members
  const selectedOrganizationId = ref<string | null>(null)

  const formRef = ref<any>(null)
  const isValid = ref(false)
  const loading = ref(false)

  // Computed
  const minDate = computed(() => formatters.minDate())

  // Methods
  const resetForm = (selectedDate?: Date | null) => {
    formData.value = {
      title: '',
      date: selectedDate ? formatters.selectedDate(selectedDate) : ''
    }
    selectedOrganizationId.value = null

    // Reset validation
    if (formRef.value) {
      formRef.value.resetValidation()
    }
    isValid.value = false
  }

  const initializeForm = (selectedDate?: Date | null) => {
    resetForm(selectedDate)
    if (selectedDate) {
      formData.value.date = formatters.selectedDate(selectedDate)
    }
  }

  const handleSubmit = async (): Promise<Event | null> => {
    if (!formRef.value) return null

    // Validate form
    const { valid } = await formRef.value.validate()
    if (!valid) return null

    try {
      loading.value = true
      const newEvent = await createEvent(formData.value)
      console.log('Event created successfully:', newEvent)

      // If an organization is selected, block all its members for this new event
      if (newEvent && selectedOrganizationId.value) {
        // Coerce to number if organizations.id is integer
        const orgIdForEvent: any = isNaN(Number(selectedOrganizationId.value))
          ? selectedOrganizationId.value
          : Number(selectedOrganizationId.value)
        const orgMembersStore = useOrganizationMembersStore()
        await orgMembersStore.blockAllMembersForEvent(String(selectedOrganizationId.value), newEvent.id)

        // Best-effort: persist explicit attachment if events.organization_id exists
        try {
          const { error: attachErr } = await supabase
            .from('events')
            .update({ organization_id: orgIdForEvent })
            .eq('id', newEvent.id)
          if (attachErr) {
            // Likely the column doesn't exist; ignore silently
            console.warn('Optional attach organization to event failed (non-fatal):', attachErr.message)
          }
        } catch (_) {
          // Ignore any failure here, as schema may not have organization_id
        }

        // Also best-effort: insert into junction table if it exists
        try {
          const { error: jErr } = await supabase
            .from('event_organizations')
            .insert([{ event_id: newEvent.id, organization_id: selectedOrganizationId.value }])
          if (jErr) {
            // Table might not exist; ignore
            console.warn('Optional event_organizations insert failed (non-fatal):', jErr.message)
          }
        } catch (_) {
          // Ignore if table doesn't exist
        }
      }
      return newEvent
    } catch (error) {
      console.error('Error creating event:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    formData,
    formRef,
    isValid,
    loading,

    // Computed
    minDate,

    // Methods
    resetForm,
    initializeForm,
    handleSubmit,
  selectedOrganizationId,

    // Shared
    validationRules,
    formatters
  }
}

// View/Edit Event Composable
export function useViewCalendarDialog() {
  // State
  const isEditMode = ref(false)
  const loading = ref(false)
  const deleteLoading = ref(false)
  const showDeleteConfirm = ref(false)

  const formData = ref<UpdateEventRequest>({
    id: 0,
    title: '',
    date: ''
  })

  const formRef = ref<any>(null)
  const isValid = ref(false)

  // Computed
  const minDate = computed(() => formatters.minDate())

  // Methods
  const initializeForm = (event: Event | null) => {
    if (event) {
      formData.value = {
        id: event.id,
        title: event.title || '',
        date: event.date || ''
      }
    }
    isEditMode.value = false
    showDeleteConfirm.value = false
  }

  const toggleEditMode = (event: Event | null) => {
    if (isEditMode.value) {
      // Cancel edit mode - restore original data
      if (event) {
        formData.value = {
          id: event.id,
          title: event.title || '',
          date: event.date || ''
        }
      }
      isEditMode.value = false
      if (formRef.value) {
        formRef.value.resetValidation()
      }
    } else {
      isEditMode.value = true
    }
  }

  const handleUpdate = async (): Promise<Event | null> => {
    if (!formRef.value) return null

    // Validate form
    const { valid } = await formRef.value.validate()
    if (!valid) return null

    try {
      loading.value = true
      const updatedEvent = await updateEvent(formData.value)
      isEditMode.value = false
      console.log('Event updated successfully:', updatedEvent)
      return updatedEvent
    } catch (error) {
      console.error('Error updating event:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  const confirmDelete = () => {
    showDeleteConfirm.value = true
  }

  const cancelDelete = () => {
    showDeleteConfirm.value = false
  }

  const handleDelete = async (eventId: number): Promise<boolean> => {
    try {
      deleteLoading.value = true
      await deleteEvent(eventId)
      console.log('Event deleted successfully')
      showDeleteConfirm.value = false
      return true
    } catch (error) {
      console.error('Error deleting event:', error)
      throw error
    } finally {
      deleteLoading.value = false
    }
  }

  const resetStates = () => {
    isEditMode.value = false
    showDeleteConfirm.value = false
    loading.value = false
    deleteLoading.value = false
  }

  // Computed properties for event display
  const getFormattedDate = (event: Event | null) => {
    return computed(() => formatters.eventDate(event?.date))
  }

  const getFormattedCreatedAt = (event: Event | null) => {
    return computed(() => formatters.createdAt(event?.created_at))
  }

  const getEventStatusColor = (event: Event | null) => {
    return computed(() => eventStatus.getColor(event?.date))
  }

  const getEventStatusText = (event: Event | null) => {
    return computed(() => eventStatus.getText(event?.date))
  }

  const getIsEventInPast = (event: Event | null) => {
    return computed(() => eventStatus.isInPast(event?.date))
  }

  return {
    // State
    isEditMode,
    loading,
    deleteLoading,
    showDeleteConfirm,
    formData,
    formRef,
    isValid,

    // Computed
    minDate,

    // Methods
    initializeForm,
    toggleEditMode,
    handleUpdate,
    confirmDelete,
    cancelDelete,
    handleDelete,
    resetStates,

    // Dynamic computed generators
    getFormattedDate,
    getFormattedCreatedAt,
    getEventStatusColor,
    getEventStatusText,
    getIsEventInPast,

    // Shared
    validationRules,
    formatters,
    eventStatus
  }
}

// Dialog State Management Composable
export function useDialogState() {
  const showAddEventDialog = ref(false)
  const showViewEventDialog = ref(false)
  const selectedDateForEvent = ref<Date | null>(null)
  const selectedEvent = ref<Event | null>(null)

  const openAddDialog = (selectedDate?: Date | null) => {
    selectedDateForEvent.value = selectedDate || null
    showAddEventDialog.value = true
  }

  const closeAddDialog = () => {
    showAddEventDialog.value = false
    selectedDateForEvent.value = null
  }

  const openViewDialog = (event: Event) => {
    selectedEvent.value = event
    showViewEventDialog.value = true
  }

  const closeViewDialog = () => {
    showViewEventDialog.value = false
    selectedEvent.value = null
  }

  const closeAllDialogs = () => {
    closeAddDialog()
    closeViewDialog()
  }

  return {
    // State
    showAddEventDialog,
    showViewEventDialog,
    selectedDateForEvent,
    selectedEvent,

    // Methods
    openAddDialog,
    closeAddDialog,
    openViewDialog,
    closeViewDialog,
    closeAllDialogs
  }
}

// Calendar Event Handlers Composable
export function useCalendarEventHandlers(refreshCallback?: () => void) {
  const { openAddDialog, openViewDialog } = useDialogState()

  const onDateClick = (date: Date) => {
    console.log('Date clicked:', date)
    openAddDialog(date)
  }

  const onEventClick = (calendarEvent: any) => {
    console.log('Event clicked:', calendarEvent.originalEvent)
    if (calendarEvent.originalEvent) {
      openViewDialog(calendarEvent.originalEvent)
    }
  }

  const onEventCreated = (newEvent: Event) => {
    console.log('New event created:', newEvent)
    if (refreshCallback) refreshCallback()
  }

  const onEventUpdated = (updatedEvent: Event) => {
    console.log('Event updated:', updatedEvent)
    if (refreshCallback) refreshCallback()
  }

  const onEventDeleted = (eventId: number) => {
    console.log('Event deleted:', eventId)
    if (refreshCallback) refreshCallback()
  }

  return {
    onDateClick,
    onEventClick,
    onEventCreated,
    onEventUpdated,
    onEventDeleted
  }
}

// Complete Calendar Dialog System
export function useCalendarDialogs(refreshCallback?: () => void) {
  const dialogState = useDialogState()
  const eventHandlers = useCalendarEventHandlers(refreshCallback)
  const addDialog = useAddCalendarDialog()
  const viewDialog = useViewCalendarDialog()

  return {
    // Dialog state
    ...dialogState,

    // Event handlers
    ...eventHandlers,

    // Add dialog
    addDialog,

    // View dialog
    viewDialog,

    // Shared utilities
    validationRules,
    formatters,
    eventStatus
  }
}
