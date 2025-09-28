<script setup lang="ts">
import { ref, computed, onMounted, defineOptions } from 'vue'
import { CalendarView, CalendarViewHeader } from 'vue-simple-calendar'
import { fetchEvents, fetchEventsWithStats } from '@/stores/eventsData'
import type { Event } from '@/stores/eventsData'
import { useCalendarView, calendarViews } from '@/pages/admin/composables/calendarView'
import AddCalendarDialog from '@/pages/admin/dialogs/AddCalendarDialog.vue'
import ViewCalendarDialog from '@/pages/admin/dialogs/ViewCalendarDialog.vue'
import 'vue-simple-calendar/dist/vue-simple-calendar.css'
import '@/styles/calendar.css'

// Component name for ESLint multi-word rule
defineOptions({
  name: 'CalendarEventsWidget'
})

// Use calendar view composable
const {
  currentView,
  currentPeriodStart,
  showDate,
  displayPeriodUom,
  displayPeriodCount,
  startingDayOfWeek,
  isDarkMode,
  currentThemeColors,
  displayPeriodLabel,
  changeView,
  goToToday,
  goToPreviousPeriod,
  goToNextPeriod,
  formatEventsForCalendar,
  getEventCounts,
  storageUtils,
  eventClickUtils
} = useCalendarView()

// Reactive data
const events = ref<Event[]>([])
const loading = ref(false)
const selectedDate = ref(new Date())

// Dialog state
const showAddEventDialog = ref(false)
const selectedDateForEvent = ref<Date | null>(null)
const showViewEventDialog = ref(false)
const selectedEvent = ref<Event | null>(null)

// Calendar configuration
const calendarRef = ref(null)

// Format events for vue-simple-calendar using composable
const calendarEvents = computed(() => {
  return formatEventsForCalendar(events.value)
})

// Get events count by status using composable
const eventsCounts = computed(() => {
  return getEventCounts(events.value)
})

// Load events data
const loadEvents = async () => {
  try {
    loading.value = true
    events.value = await fetchEvents()
  } catch (error) {
    console.error('Error loading events:', error)
  } finally {
    loading.value = false
  }
}

// Handle event click using composable utilities
const onEventClick = (event: any) => {
  const actualEvent = eventClickUtils.resolveEventFromClick(event, events.value)

  if (actualEvent) {
    // Save to localStorage using composable
    storageUtils.saveEvent(actualEvent)

    // Set selected event and open view dialog
    selectedEvent.value = actualEvent
    showViewEventDialog.value = true
  } else {
    console.warn('Could not resolve event from click data')
    // Try to load last event from storage as fallback
    const storedEvent = storageUtils.loadEvent()
    if (storedEvent) {
      console.log('Using stored event as fallback:', storedEvent)
      selectedEvent.value = storedEvent
      showViewEventDialog.value = true
    }
  }
}

// Handle date click using composable utilities
const onDateClick = (date: Date) => {
  console.log('Date clicked:', date)

  // Save to localStorage using composable
  storageUtils.saveDate(date)

  // Set selected date and open dialog for creating new event
  selectedDateForEvent.value = date
  showAddEventDialog.value = true
}

// Handle adding new event
const openAddEventDialog = () => {
  selectedDateForEvent.value = null // No specific date selected
  showAddEventDialog.value = true
}

// Handle event created
const onEventCreated = (newEvent: Event) => {
  console.log('New event created:', newEvent)
  // Refresh events list to include the new event
  loadEvents()
}

// Handle event updated
const onEventUpdated = (updatedEvent: Event) => {
  console.log('Event updated:', updatedEvent)
  // Refresh events list to show updated event
  loadEvents()
}

// Handle event deleted
const onEventDeleted = (eventId: number) => {
  console.log('Event deleted:', eventId)
  // Refresh events list to remove deleted event
  loadEvents()
}

// Load data on component mount
onMounted(() => {
  loadEvents()

  // Optionally restore last clicked event state (commented out by default)
  // const storedEvent = storageUtils.loadEvent()
  // if (storedEvent) {
  //   console.log('Restored event from storage:', storedEvent)
  //   selectedEvent.value = storedEvent
  // }
})
</script>

<template>
  <v-card class="calendar-container" elevation="2" rounded="lg">
    <!-- Calendar Header -->
    <v-card-title class="d-flex align-center justify-space-between pa-6 bg-primary text-white">
      <div class="d-flex align-center">
        <v-icon size="32" class="me-3">mdi-calendar-multiple</v-icon>
        <div>
          <h2 class="text-h5 font-weight-bold mb-1">Events Calendar</h2>
          <p class="text-body-2 mb-0 opacity-90">View and manage organizational events</p>
        </div>
      </div>
      <div class="d-flex align-center ga-2">
        <v-btn
          color="white"
          variant="outlined"
          size="default"
          @click="openAddEventDialog"
          prepend-icon="mdi-calendar-plus"
          class="me-2"
        >
          Add Event
        </v-btn>
        <v-btn
          color="white"
          variant="elevated"
          size="default"
          @click="loadEvents"
          :loading="loading"
          prepend-icon="mdi-refresh"
        >
          Refresh
        </v-btn>
      </div>
    </v-card-title>

    <v-divider></v-divider>    <!-- Calendar Controls -->
    <v-card-text class="pa-6 pb-0">
      <div class="d-flex flex-column flex-sm-row align-center justify-space-between gap-4 mb-6">
        <!-- Navigation Controls -->
        <div class="d-flex align-center gap-2">
          <v-btn
            icon="mdi-chevron-left"
            variant="outlined"
            size="small"
            @click="goToPreviousPeriod"
          ></v-btn>

          <v-btn
            color="primary"
            variant="elevated"
            class="mx-2"
            @click="goToToday"
          >
            Today
          </v-btn>

          <v-btn
            icon="mdi-chevron-right"
            variant="outlined"
            size="small"
            @click="goToNextPeriod"
          ></v-btn>

          <div class="ms-4">
            <h3 class="text-h6 font-weight-medium">{{ displayPeriodLabel }}</h3>
          </div>
        </div>

        <!-- View Toggle -->
        <div class="d-flex align-center gap-2">
          <v-btn-toggle
            v-model="currentView"
            color="primary"
            variant="outlined"
            divided
            mandatory
          >
            <v-btn
              v-for="view in calendarViews"
              :key="view.value"
              :value="view.value"
              size="small"
              @click="changeView(view.value)"
            >
              <v-icon :icon="view.icon" class="me-1"></v-icon>
              <span class="d-none d-sm-inline">{{ view.title }}</span>
            </v-btn>
          </v-btn-toggle>
        </div>
      </div>
    </v-card-text>

    <!-- Loading State -->
    <div v-if="loading" class="d-flex justify-center align-center pa-8">
      <v-progress-circular
        indeterminate
        color="primary"
        size="48"
      ></v-progress-circular>
      <span class="ms-4 text-subtitle-1">Loading calendar events...</span>
    </div>

    <!-- Calendar View -->
    <div v-else class="calendar-wrapper pa-6 pt-0">
      <CalendarView
        ref="calendarRef"
        :show-date="currentPeriodStart"
        :items="calendarEvents"
        :display-period-uom="displayPeriodUom"
        :display-period-count="displayPeriodCount"
        :starting-day-of-week="startingDayOfWeek"
        :enable-drag-drop="false"
        :show-times="false"
        :time-format-options="{ hour: 'numeric', minute: '2-digit' }"
        class="theme-calendar calendar-large"
        item-content-height="2.5rem"
        @click-item="onEventClick"
        @click-date="onDateClick"
      >
      </CalendarView>
    </div>

    <!-- Empty State -->
    <div
      v-if="!loading && calendarEvents.length === 0"
      class="text-center pa-8"
    >
      <v-icon color="grey-lighten-1" size="64" class="mb-4">
        mdi-calendar-blank
      </v-icon>
      <h3 class="text-h6 text-grey-darken-1 mb-2">No Events Scheduled</h3>
      <p class="text-body-2 text-grey mb-4">
        No events are currently scheduled. Check back later for updates.
      </p>
      <v-btn color="primary" variant="elevated" @click="loadEvents">
        Refresh Calendar
      </v-btn>
    </div>

    <!-- Enhanced Events Summary -->
    <v-card-text v-if="!loading && calendarEvents.length > 0" class="pt-0">
      <v-row class="events-summary">
        <v-col cols="12">
          <div class="d-flex flex-wrap ga-3 align-center">
            <v-chip
              v-if="eventsCounts.total > 0"
              color="primary"
              variant="elevated"
              size="default"
              prepend-icon="mdi-calendar-check"
            >
              Total: {{ eventsCounts.total }}
            </v-chip>

            <v-chip
              v-if="eventsCounts.today > 0"
              color="secondary"
              variant="elevated"
              size="default"
              prepend-icon="mdi-calendar-today"
            >
              Today: {{ eventsCounts.today }}
            </v-chip>

            <v-chip
              v-if="eventsCounts.upcoming > 0"
              color="accent"
              variant="elevated"
              size="default"
              prepend-icon="mdi-calendar-clock"
            >
              Upcoming: {{ eventsCounts.upcoming }}
            </v-chip>

            <v-chip
              v-if="eventsCounts.past > 0"
              color="surface-variant"
              variant="outlined"
              size="default"
              prepend-icon="mdi-calendar-check-outline"
            >
              Past: {{ eventsCounts.past }}
            </v-chip>
          </div>
        </v-col>
      </v-row>
    </v-card-text>

    <!-- Add Event Dialog -->
    <AddCalendarDialog
      v-model="showAddEventDialog"
      :selected-date="selectedDateForEvent"
      @event-created="onEventCreated"
    />

    <!-- View Event Dialog -->
    <ViewCalendarDialog
      v-model:is-open="showViewEventDialog"
      :event="selectedEvent"
      @event-updated="onEventUpdated"
      @event-deleted="onEventDeleted"
    />
  </v-card>
</template>
