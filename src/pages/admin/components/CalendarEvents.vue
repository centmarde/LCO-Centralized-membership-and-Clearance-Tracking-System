<script setup lang="ts">
import { ref, computed, onMounted, defineOptions } from 'vue'
import { useTheme } from 'vuetify'
import { CalendarView, CalendarViewHeader } from 'vue-simple-calendar'
import { fetchEvents, fetchEventsWithStats } from '@/stores/eventsData'
import type { Event } from '@/stores/eventsData'
import 'vue-simple-calendar/dist/vue-simple-calendar.css'
import '@/styles/calendar.css'

// Component name for ESLint multi-word rule
defineOptions({
  name: 'CalendarEventsWidget'
})

// Reactive data
const events = ref<Event[]>([])
const loading = ref(false)
const selectedDate = ref(new Date())
const theme = useTheme()

// Calendar configuration with enhanced controls
const calendarRef = ref(null)
const showDate = ref(new Date())
const displayPeriodUom = ref('month')
const displayPeriodCount = ref(1)
const startingDayOfWeek = ref(0) // Sunday = 0
const currentPeriodStart = ref(new Date())

// Calendar view options
const calendarViews = [
  { title: 'Month', value: 'month', icon: 'mdi-calendar-month' },
  { title: 'Week', value: 'week', icon: 'mdi-calendar-week' }
]

const currentView = ref('month')

// Computed properties for theme integration
const isDarkMode = computed(() => theme.global.current.value.dark)
const currentThemeColors = computed(() => theme.global.current.value.colors)

// Format events for vue-simple-calendar with enhanced styling
const calendarEvents = computed(() => {
  return events.value.map(event => ({
    id: event.id.toString(),
    title: event.title,
    startDate: new Date(event.date || new Date()),
    endDate: new Date(event.date || new Date()),
    classes: getEventClasses(event),
    originalEvent: event
  }))
})

// Enhanced display period label
const displayPeriodLabel = computed(() => {
  if (!currentPeriodStart.value) return ''

  const start = currentPeriodStart.value
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long'
  }

  if (currentView.value === 'week') {
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  return start.toLocaleDateString('en-US', options)
})

// Helper function to determine text color based on background
const getContrastYIQ = (hexcolor: string): string => {
  if (!hexcolor) return '#000000'

  const r = parseInt(hexcolor.substr(1,2),16)
  const g = parseInt(hexcolor.substr(3,2),16)
  const b = parseInt(hexcolor.substr(5,2),16)
  const yiq = ((r*299)+(g*587)+(b*114))/1000
  return (yiq >= 128) ? '#000000' : '#FFFFFF'
}

// Get event color based on theme
const getEventColor = (event: Event): string => {
  const colors = currentThemeColors.value
  // Use primary color for events, could be enhanced based on event type/category
  return colors.primary || '#1976d2'
}

// Get CSS classes based on event properties
const getEventClasses = (event: Event): string[] => {
  const classes = ['event-item']

  // Add classes based on date
  const eventDate = new Date(event.date || new Date())
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  eventDate.setHours(0, 0, 0, 0)

  if (eventDate < today) {
    classes.push('past-event')
  } else if (eventDate.getTime() === today.getTime()) {
    classes.push('today-event')
  } else {
    classes.push('future-event')
  }

  return classes
}

// Get events count by status
const eventsCounts = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return {
    total: events.value.length,
    past: events.value.filter(e => {
      const eventDate = new Date(e.date || new Date())
      eventDate.setHours(0, 0, 0, 0)
      return eventDate < today
    }).length,
    today: events.value.filter(e => {
      const eventDate = new Date(e.date || new Date())
      eventDate.setHours(0, 0, 0, 0)
      return eventDate.getTime() === today.getTime()
    }).length,
    upcoming: events.value.filter(e => {
      const eventDate = new Date(e.date || new Date())
      eventDate.setHours(0, 0, 0, 0)
      return eventDate > today
    }).length
  }
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

// Handle event click
const onEventClick = (event: any) => {
  console.log('Event clicked:', event.originalEvent)
  // You can add event details modal or navigation here
}

// Handle date click
const onDateClick = (date: Date) => {
  console.log('Date clicked:', date)
  // You can add new event creation here
}

// Enhanced calendar navigation methods
const changeView = (view: string) => {
  currentView.value = view

  switch (view) {
    case 'month':
      displayPeriodUom.value = 'month'
      displayPeriodCount.value = 1
      break
    case 'week':
      displayPeriodUom.value = 'week'
      displayPeriodCount.value = 1
      break
  }
}

const goToToday = () => {
  currentPeriodStart.value = new Date()
  showDate.value = new Date()
}

const goToPreviousPeriod = () => {
  const current = new Date(currentPeriodStart.value)

  switch (currentView.value) {
    case 'month':
      current.setMonth(current.getMonth() - 1)
      break
    case 'week':
      current.setDate(current.getDate() - 7)
      break
  }

  currentPeriodStart.value = current
  showDate.value = current
}

const goToNextPeriod = () => {
  const current = new Date(currentPeriodStart.value)

  switch (currentView.value) {
    case 'month':
      current.setMonth(current.getMonth() + 1)
      break
    case 'week':
      current.setDate(current.getDate() + 7)
      break
  }

  currentPeriodStart.value = current
  showDate.value = current
}

// Load data on component mount
onMounted(() => {
  loadEvents()
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
  </v-card>
</template>
