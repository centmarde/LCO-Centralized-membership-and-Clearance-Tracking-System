<template>
  <v-card class="pa-4">

    <!-- Loading State -->
    <v-progress-linear
      v-if="loading"
      indeterminate
      color="primary"
      class="mb-4"
    ></v-progress-linear>

    <!-- Data Table -->
    <v-data-table
      :headers="headers"
      :items="events"
      :loading="loading"
      :search="search"
      class="elevation-1"
      item-key="id"
    >
      <!-- Top Slot with Search -->
      <template v-slot:top>
        <v-toolbar flat>
          <v-text-field
            v-model="search"
            append-icon="mdi-magnify"
            label="Search events..."
            single-line
            hide-details
            class="mr-4"
          ></v-text-field>
          <v-spacer></v-spacer>
          <v-btn
            color="primary"
            @click="openCreateDialog"
            class="mr-2"
          >
            <v-icon left>mdi-plus</v-icon>
            Add Event
          </v-btn>
          <v-btn
            color="primary"
            variant="outlined"
            @click="refreshEvents"
          >
            <v-icon left>mdi-refresh</v-icon>
            Refresh
          </v-btn>
        </v-toolbar>
      </template>

      <!-- Date Column -->
      <template v-slot:item.date="{ item }">
        <span v-if="item.date">
          {{ formatDate(item.date) }}
        </span>
        <span v-else class="text-grey">
          No date set
        </span>
      </template>

      <!-- Registration Count Column -->
      <template v-slot:item.registration_count="{ item }">
        <v-chip
          :color="getRegistrationColor(item.registration_count || 0)"
          small
        >
          {{ item.registration_count || 0 }} registered
        </v-chip>
      </template>

      <!-- Status Counts Column -->
      <template v-slot:item.status_counts="{ item }">
        <div class="d-flex flex-column ga-1">
          <v-chip
            v-if="(item.status_counts?.blocked || 0) > 0"
            color="error"
            size="x-small"
          >
            {{ item.status_counts?.blocked || 0 }} blocked
          </v-chip>
          <v-chip
            v-if="(item.status_counts?.cleared || 0) > 0"
            color="green"
            size="x-small"
          >
            {{ item.status_counts?.cleared || 0 }} cleared
          </v-chip>
          <v-chip
            v-if="(item.status_counts?.pending || 0) > 0"
            color="warning"
            size="x-small"
          >
            {{ item.status_counts?.pending || 0 }} pending
          </v-chip>
          <span v-if="!item.status_counts || ((item.status_counts.blocked || 0) === 0 && (item.status_counts.cleared || 0) === 0 && (item.status_counts.pending || 0) === 0)" class="text-grey text-caption">
            No status data
          </span>
        </div>
      </template>

      <!-- Actions Column -->
      <template v-slot:item.actions="{ item }">
        <v-btn
          icon
          size="small"
          @click="editEvent(item)"
          class="mr-2"
        >
          <v-icon>mdi-pencil</v-icon>
        </v-btn>
        <v-btn
          icon
          size="small"
          color="error"
          @click="deleteEvent(item)"
        >
          <v-icon>mdi-delete</v-icon>
        </v-btn>
      </template>

      <!-- No Data -->
      <template v-slot:no-data>
        <v-alert
          type="info"
          class="ma-4"
        >
          No events found. Click "Add Event" to create your first event.
        </v-alert>
      </template>
    </v-data-table>

    <!-- Create/Edit Dialog -->
    <v-dialog v-model="dialog" max-width="600px">
      <v-card>
        <v-card-title>
          <span class="text-h5">{{ dialogTitle }}</span>
        </v-card-title>
        <v-card-text>
          <v-form ref="form" v-model="formValid">
            <v-text-field
              v-model="editedEvent.title"
              label="Event Title"
              :rules="[rules.required]"
              required
            ></v-text-field>
            <v-text-field
              v-model="editedEvent.date"
              label="Event Date"
              type="date"
              :rules="[rules.required]"
              required
            ></v-text-field>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="grey"
            variant="text"
            @click="closeDialog"
          >
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            variant="text"
            @click="saveEvent"
            :disabled="!formValid"
            :loading="saving"
          >
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="deleteDialog" max-width="500px">
      <v-card>
        <v-card-title class="text-h5">
          Confirm Delete
        </v-card-title>
        <v-card-text>
          Are you sure you want to delete the event "{{ eventToDelete?.title }}"?
          This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="grey"
            variant="text"
            @click="deleteDialog = false"
          >
            Cancel
          </v-btn>
          <v-btn
            color="error"
            variant="text"
            @click="confirmDelete"
            :loading="deleting"
          >
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar for notifications -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      timeout="4000"
    >
      {{ snackbar.message }}
      <template v-slot:actions>
        <v-btn
          variant="text"
          @click="snackbar.show = false"
        >
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  fetchEvents,
  createEvent,
  updateEvent,
  deleteEvent as deleteEventApi,
  fetchEventsWithRegistrationCounts,
  fetchEventsWithStats,
  type Event,
  type CreateEventRequest
} from '@/stores/eventsData'// Reactive state
const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const events = ref<(Event & {
  registration_count?: number
  status_counts?: {
    blocked: number
    cleared: number
    pending: number
  }
})[]>([])
const search = ref('')
const dialog = ref(false)
const deleteDialog = ref(false)
const formValid = ref(false)
const form = ref()

// Event editing
const editedEvent = ref<CreateEventRequest & { id?: number }>({
  title: '',
  date: ''
})

const defaultEvent: CreateEventRequest & { id?: number } = {
  title: '',
  date: ''
}

const eventToDelete = ref<Event | null>(null)

// Snackbar
const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
})

// Table headers
const headers = [
  { title: 'ID', value: 'id', sortable: true },
  { title: 'Title', value: 'title', sortable: true },
  { title: 'Date', value: 'date', sortable: true },
  { title: 'Created', value: 'created_at', sortable: true },
  { title: 'Registrations', value: 'registration_count', sortable: true },
  { title: 'Status', value: 'status_counts', sortable: false, width: '200px' },
  { title: 'Actions', value: 'actions', sortable: false, width: '120px' }
]

// Form validation rules
const rules = {
  required: (value: string) => !!value || 'This field is required'
}

// Computed properties
const dialogTitle = computed(() => {
  return editedEvent.value.id ? 'Edit Event' : 'Add Event'
})

// Methods
const loadEvents = async () => {
  loading.value = true
  try {
    const data = await fetchEventsWithStats()
    events.value = data
    console.log('Events loaded with stats:', data)
  } catch (error) {
    console.error('Error loading events:', error)
    showSnackbar('Error loading events', 'error')
  } finally {
    loading.value = false
  }
}

const refreshEvents = () => {
  loadEvents()
}

const openCreateDialog = () => {
  editedEvent.value = { ...defaultEvent }
  dialog.value = true
}

const editEvent = (event: Event) => {
  editedEvent.value = {
    id: event.id,
    title: event.title || '',
    date: event.date || ''
  }
  dialog.value = true
}

const closeDialog = () => {
  dialog.value = false
  editedEvent.value = { ...defaultEvent }
  form.value?.reset()
}

const saveEvent = async () => {
  if (!formValid.value) return

  saving.value = true
  try {
    if (editedEvent.value.id) {
      // Update existing event
      await updateEvent(editedEvent.value as any)
      showSnackbar('Event updated successfully', 'success')
    } else {
      // Create new event
      await createEvent(editedEvent.value)
      showSnackbar('Event created successfully', 'success')
    }

    await loadEvents()
    closeDialog()
  } catch (error) {
    console.error('Error saving event:', error)
    showSnackbar('Error saving event', 'error')
  } finally {
    saving.value = false
  }
}

const deleteEvent = (event: Event) => {
  eventToDelete.value = event
  deleteDialog.value = true
}

const confirmDelete = async () => {
  if (!eventToDelete.value) return

  deleting.value = true
  try {
    await deleteEventApi(eventToDelete.value.id)
    showSnackbar('Event deleted successfully', 'success')
    await loadEvents()
  } catch (error) {
    console.error('Error deleting event:', error)
    showSnackbar('Error deleting event', 'error')
  } finally {
    deleting.value = false
    deleteDialog.value = false
    eventToDelete.value = null
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString()
}

const getRegistrationColor = (count: number) => {
  if (count === 0) return 'grey'
  if (count < 5) return 'orange'
  if (count < 10) return 'blue'
  return 'green'
}

const showSnackbar = (message: string, color: string = 'success') => {
  snackbar.value = {
    show: true,
    message,
    color
  }
}

// Lifecycle
onMounted(() => {
  loadEvents()
})
</script>

<style scoped>
.v-data-table {
  background: transparent;
}

.v-toolbar {
  background: transparent !important;
}
</style>
