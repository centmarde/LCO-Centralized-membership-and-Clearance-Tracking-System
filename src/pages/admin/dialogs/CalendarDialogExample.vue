<!--
  Example usage of AddCalendarDialog with is_lco functionality
  This demonstrates the new LCO event creation capability
-->
<template>
  <div class="pa-4">
    <h2 class="text-h4 mb-4">Calendar Dialog Examples</h2>

    <!-- Add Event Button -->
    <v-btn
      @click="showAddDialog = true"
      color="primary"
      prepend-icon="mdi-calendar-plus"
      class="mb-4 me-2"
    >
      Add New Event
    </v-btn>

    <!-- View Sample Event Button -->
    <v-btn
      @click="showViewDialog = true"
      color="secondary"
      prepend-icon="mdi-eye"
      class="mb-4"
      :disabled="!sampleEvent"
    >
      View Sample Event
    </v-btn>

    <!-- Sample Event Creation -->
    <v-card class="mb-4">
      <v-card-title>Create Sample LCO Event</v-card-title>
      <v-card-text>
        <v-btn
          @click="createSampleLCOEvent"
          color="primary"
          variant="tonal"
          prepend-icon="mdi-account-tie"
          :loading="creating"
        >
          Create Sample LCO Event
        </v-btn>

        <v-btn
          @click="createSampleRegularEvent"
          color="secondary"
          variant="tonal"
          prepend-icon="mdi-calendar"
          :loading="creating"
          class="ml-2"
        >
          Create Sample Regular Event
        </v-btn>
      </v-card-text>
    </v-card>

    <!-- Events List -->
    <v-card>
      <v-card-title>Recent Events</v-card-title>
      <v-card-text>
        <v-progress-circular v-if="eventsStore.loading" indeterminate />
        <div v-else-if="eventsStore.events.length === 0" class="text-center text-medium-emphasis">
          No events created yet
        </div>
        <v-list v-else>
          <v-list-item
            v-for="event in eventsStore.events.slice(0, 5)"
            :key="event.id"
            @click="viewEvent(event)"
          >
            <template #prepend>
              <v-icon :color="event.is_lco ? 'primary' : 'secondary'">
                {{ event.is_lco ? 'mdi-account-tie' : 'mdi-calendar' }}
              </v-icon>
            </template>
            <v-list-item-title>{{ event.title }}</v-list-item-title>
            <v-list-item-subtitle>
              {{ event.date }} - {{ event.is_lco ? 'LCO Event' : 'Regular Event' }}
            </v-list-item-subtitle>
            <template #append>
              <v-chip
                :color="event.is_lco ? 'primary' : 'secondary'"
                size="x-small"
                variant="tonal"
              >
                {{ event.is_lco ? 'LCO' : 'REG' }}
              </v-chip>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>

    <!-- Add Calendar Dialog -->
    <AddCalendarDialog
      v-model="showAddDialog"
      @event-created="onEventCreated"
    />

    <!-- View Calendar Dialog -->
    <ViewCalendarDialog
      v-model:is-open="showViewDialog"
      :event="selectedEvent"
      @event-updated="onEventUpdated"
      @event-deleted="onEventDeleted"
    />

    <!-- Success Snackbar -->
    <v-snackbar v-model="showSuccess" color="success">
      {{ successMessage }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useEventsStore } from '@/stores/eventsData'
import type { EventWithLCO } from '@/stores/eventsData'
import AddCalendarDialog from '@/pages/admin/dialogs/AddCalendarDialog.vue'
import ViewCalendarDialog from '@/pages/admin/dialogs/ViewCalendarDialog.vue'

const eventsStore = useEventsStore()

// Dialog states
const showAddDialog = ref(false)
const showViewDialog = ref(false)
const selectedEvent = ref<EventWithLCO | null>(null)
const sampleEvent = ref<EventWithLCO | null>(null)
const creating = ref(false)

// UI states
const showSuccess = ref(false)
const successMessage = ref('')

// Event handlers
const onEventCreated = (event: EventWithLCO) => {
  successMessage.value = `Event "${event.title}" created successfully! ${event.is_lco ? '(LCO Event)' : '(Regular Event)'}`
  showSuccess.value = true
  showAddDialog.value = false
}

const onEventUpdated = (event: EventWithLCO) => {
  successMessage.value = `Event "${event.title}" updated successfully!`
  showSuccess.value = true
  showViewDialog.value = false
}

const onEventDeleted = (eventId: number) => {
  successMessage.value = 'Event deleted successfully!'
  showSuccess.value = true
  showViewDialog.value = false
  selectedEvent.value = null
}

const viewEvent = (event: EventWithLCO) => {
  selectedEvent.value = event
  showViewDialog.value = true
}

// Sample event creators
const createSampleLCOEvent = async () => {
  creating.value = true
  try {
    const event = await eventsStore.createEvent({
      title: 'LCO Monthly Meeting',
      date: new Date().toISOString().split('T')[0],
      is_lco: true
    })
    sampleEvent.value = event
    successMessage.value = 'Sample LCO event created!'
    showSuccess.value = true
  } catch (error) {
    console.error('Error creating sample LCO event:', error)
  } finally {
    creating.value = false
  }
}

const createSampleRegularEvent = async () => {
  creating.value = true
  try {
    const event = await eventsStore.createEvent({
      title: 'Regular Community Event',
      date: new Date().toISOString().split('T')[0],
      is_lco: false
    })
    sampleEvent.value = event
    successMessage.value = 'Sample regular event created!'
    showSuccess.value = true
  } catch (error) {
    console.error('Error creating sample regular event:', error)
  } finally {
    creating.value = false
  }
}

// Load events on mount
onMounted(async () => {
  await eventsStore.fetchEvents()
})
</script>
