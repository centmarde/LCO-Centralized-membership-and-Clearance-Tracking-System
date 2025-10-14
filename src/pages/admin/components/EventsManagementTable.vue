<template>
  <div class="mt-5">
    <v-card-title
      :class="[
        'd-flex',
        'align-center',
        smAndDown ? 'flex-column' : 'justify-space-between',
        smAndDown ? 'gap-3' : ''
      ]"
    >
      <div :class="smAndDown ? 'text-center' : ''">
        <h3 :class="xs ? 'text-h6' : 'text-h5'">Events Management</h3>
        <p :class="xs ? 'text-caption' : 'text-subtitle-1'" class="text-grey">
          Manage all system events
        </p>
      </div>
      <div :class="['d-flex', 'gap-2', smAndDown ? 'flex-column' : '']" :style="smAndDown ? 'width: 100%' : ''">
        <v-btn
          color="primary"
          :prepend-icon="xs ? undefined : 'mdi-plus'"
          @click="openCreateDialog"
          :block="smAndDown"
          :size="xs ? 'default' : 'large'"
        >
          <v-icon v-if="xs">mdi-plus</v-icon>
          <span v-else>Add Event</span>
        </v-btn>
        <v-btn
          color="primary"
          :prepend-icon="smAndDown ? undefined : 'mdi-refresh'"
          :icon="xs ? 'mdi-refresh' : undefined"
          @click="refreshEvents"
          :loading="loading"
          :size="xs ? 'default' : 'large'"
          :block="smAndDown && !xs"
          :variant="xs ? 'elevated' : 'outlined'"
        >
          <v-icon v-if="xs" color="white">mdi-refresh</v-icon>
          <span v-if="!xs">Refresh</span>
        </v-btn>
      </div>
    </v-card-title>

    <v-card-text>
      <!-- Search Bar -->
      <v-row class="mb-4">
        <v-col cols="12" md="6">
          <v-text-field
            v-model="search"
            prepend-inner-icon="mdi-magnify"
            label="Search events..."
            single-line
            hide-details
            clearable
            variant="outlined"
            density="comfortable"
          />
        </v-col>
      </v-row>

      <!-- Loading State -->
      <div v-if="loading" class="d-flex flex-column gap-4">
        <v-skeleton-loader
          v-for="i in 4"
          :key="i"
          type="card"
          class="mb-4"
        ></v-skeleton-loader>
      </div>

      <!-- No Data State -->
      <div v-else-if="filteredEvents.length === 0" class="text-center pa-8">
        <v-icon size="64" color="grey">mdi-calendar-blank</v-icon>
        <p class="text-h6 mt-4">No events found</p>
        <p class="text-body-2 text-grey">
          {{ search ? 'No events match your search criteria.' : 'There are no events in the system yet.' }}
        </p>
      </div>

      <!-- Event Cards Grid -->
      <v-row v-else>
        <v-col
          v-for="event in paginatedEvents"
          :key="event.id"
          cols="12"
          sm="6"
          md="6"
          lg="3"
        >
          <v-card class="event-card" elevation="2" hover>
            <v-card-title class="d-flex align-center pb-2">
              <v-avatar color="primary" size="40" class="mr-3">
                <v-icon color="white">mdi-calendar-star</v-icon>
              </v-avatar>
              <div class="text-truncate flex-grow-1">
                <div class="text-subtitle-1 font-weight-bold text-truncate">
                  {{ event.title || 'N/A' }}
                </div>
                <div class="text-caption text-grey">
                  ID: {{ event.id }}
                </div>
              </div>
            </v-card-title>

            <v-divider></v-divider>

            <v-card-text>
              <div class="event-info mb-3">
                <div class="d-flex align-center mb-2">
                  <v-icon size="small" class="mr-2">mdi-calendar</v-icon>
                  <span class="text-body-2">
                    {{ event.date ? formatDate(event.date) : 'No date set' }}
                  </span>
                </div>
                <div class="d-flex align-center mb-2">
                  <v-icon size="small" class="mr-2">mdi-clock-outline</v-icon>
                  <span class="text-body-2">{{ formatDate(event.created_at) }}</span>
                </div>
              </div>

              <div class="d-flex flex-wrap gap-2 mb-3">
                <v-chip
                  :color="getRegistrationColor(event.registration_count || 0)"
                  variant="tonal"
                  size="small"
                  label
                >
                  <v-icon start size="small">mdi-account-group</v-icon>
                  {{ event.registration_count || 0 }} registered
                </v-chip>
              </div>

              <!-- Status Counts -->
              <div v-if="event.status_counts && ((event.status_counts.blocked || 0) > 0 || (event.status_counts.cleared || 0) > 0 || (event.status_counts.pending || 0) > 0)" class="d-flex flex-wrap gap-1">
                <v-chip
                  v-if="(event.status_counts?.blocked || 0) > 0"
                  color="error"
                  size="x-small"
                  label
                >
                  {{ event.status_counts?.blocked || 0 }} blocked
                </v-chip>
                <v-chip
                  v-if="(event.status_counts?.cleared || 0) > 0"
                  color="success"
                  size="x-small"
                  label
                >
                  {{ event.status_counts?.cleared || 0 }} cleared
                </v-chip>
                <v-chip
                  v-if="(event.status_counts?.pending || 0) > 0"
                  color="warning"
                  size="x-small"
                  label
                >
                  {{ event.status_counts?.pending || 0 }} pending
                </v-chip>
              </div>
              <div v-else class="text-caption text-grey">
                No status data
              </div>
            </v-card-text>

            <v-divider></v-divider>

            <v-card-actions class="justify-space-between px-4">
              <v-btn
                icon="mdi-pencil"
                variant="text"
                size="small"
                @click="editEvent(event)"
                color="primary"
              >
                <v-icon>mdi-pencil</v-icon>
                <v-tooltip activator="parent" location="top">Edit Event</v-tooltip>
              </v-btn>
              <v-btn
                icon="mdi-delete"
                variant="text"
                size="small"
                @click="deleteEvent(event)"
                color="error"
              >
                <v-icon>mdi-delete</v-icon>
                <v-tooltip activator="parent" location="top">Delete Event</v-tooltip>
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>

      <!-- Pagination -->
      <v-row v-if="!loading && filteredEvents.length > 0" class="mt-4">
        <v-col cols="12" class="d-flex justify-center align-center">
          <v-pagination
            v-model="page"
            :length="totalPages"
            :total-visible="5"
            rounded="circle"
            show-first-last-page
          ></v-pagination>
        </v-col>
        <v-col cols="12" class="text-center">
          <span class="text-body-2 text-grey">
            Showing {{ (page - 1) * itemsPerPage + 1 }} -
            {{ Math.min(page * itemsPerPage, filteredEvents.length) }}
            of {{ filteredEvents.length }} events
          </span>
        </v-col>
      </v-row>
    </v-card-text>

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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useDisplay } from 'vuetify'
import {
  fetchEvents,
  createEvent,
  updateEvent,
  deleteEvent as deleteEventApi,
  fetchEventsWithRegistrationCounts,
  fetchEventsWithStats,
  type Event,
  type CreateEventRequest
} from '@/stores/eventsData'

// Composables
const { xs, smAndDown, mdAndUp } = useDisplay()

// Reactive state
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
const page = ref(1)
const itemsPerPage = ref(8)

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

// Form validation rules
const rules = {
  required: (value: string) => !!value || 'This field is required'
}

// Computed properties
const dialogTitle = computed(() => {
  return editedEvent.value.id ? 'Edit Event' : 'Add Event'
})

// Computed filtered and paginated events
const filteredEvents = computed(() => {
  if (!search.value) {
    return events.value
  }
  const searchLower = search.value.toLowerCase()
  return events.value.filter(event =>
    event.title?.toLowerCase().includes(searchLower) ||
    event.id?.toString().includes(searchLower)
  )
})

const totalPages = computed(() => {
  return Math.ceil(filteredEvents.value.length / itemsPerPage.value)
})

const paginatedEvents = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredEvents.value.slice(start, end)
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
.v-card-title h3 {
  margin-bottom: 4px;
}

.event-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease-in-out;
}

.event-card:hover {
  transform: translateY(-4px);
}

.event-info {
  min-height: 60px;
}

.gap-1 {
  gap: 4px;
}

.gap-2 {
  gap: 8px;
}

.gap-3 {
  gap: 12px;
}

.gap-4 {
  gap: 16px;
}
</style>
