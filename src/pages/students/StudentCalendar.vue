<script setup lang="ts">

import { ref, computed, onMounted } from 'vue';
import { useTheme } from 'vuetify';
import { CalendarView, CalendarViewHeader } from 'vue-simple-calendar';
import { fetchStudentEvents, fetchStudents } from '@/stores/studentsData';
import { fetchEvents } from '@/stores/eventsData';
import { useAuthUserStore } from '@/stores/authUser';
import type { Event } from '@/stores/studentsData';
import 'vue-simple-calendar/dist/vue-simple-calendar.css';
import '@/styles/calendar.css';

defineOptions({
  name: 'StudentCalendar',
});

const events = ref<(Event & { isRegistered?: boolean })[]>([]);
const loading = ref(false);
const theme = useTheme();

const calendarRef = ref(null);
const showDate = ref(new Date());
const displayPeriodUom = ref('month');
const displayPeriodCount = ref(1);
const startingDayOfWeek = ref(0);
const currentPeriodStart = ref(new Date());
const currentView = ref('month');

const calendarViews = [
  { title: 'Month', value: 'month', icon: 'mdi-calendar-month' },
  { title: 'Week', value: 'week', icon: 'mdi-calendar-week' },
];

const calendarEvents = computed(() => {
  return events.value.map(event => ({
    id: event.id.toString(),
    title: event.title,
    startDate: new Date(event.date || new Date()),
    endDate: new Date(event.date || new Date()),
    classes: event.isRegistered ? ['event-registered'] : ['event-upcoming'],
    originalEvent: event,
  }));
});

const displayPeriodLabel = computed(() => {
  if (!currentPeriodStart.value) return '';
  const start = currentPeriodStart.value;
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
  };
  return start.toLocaleDateString('en-US', options);
});

const loadEvents = async () => {
  loading.value = true;
  try {
    // Get current user UUID from auth store
    const authUserStore = useAuthUserStore();
    const userId = authUserStore.userData?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Fetch all students and find the one matching this userId
    const students = await fetchStudents();
    const student = students.find(s => s.user_id === userId);
    if (!student) {
      throw new Error('No student record found for current user');
    }
    const studentId = student.id;

    // Fetch all events
    const allEvents = await fetchEvents();
    // Fetch only events the student is registered for
    const registeredEvents = await fetchStudentEvents(Number(studentId));
    const registeredEventIds = new Set(registeredEvents.map(e => e.id));
    events.value = allEvents.map(event => ({
      ...event,
      isRegistered: registeredEventIds.has(event.id),
    }));
  } catch (error) {
    console.error('Error loading events:', error);
    events.value = [];
  } finally {
    loading.value = false;
  }
};

const changeView = (view: string) => {
  currentView.value = view;
  switch (view) {
    case 'month':
      displayPeriodUom.value = 'month';
      displayPeriodCount.value = 1;
      break;
    case 'week':
      displayPeriodUom.value = 'week';
      displayPeriodCount.value = 1;
      break;
  }
};

const goToToday = () => {
  currentPeriodStart.value = new Date();
  showDate.value = new Date();
};

const goToPreviousPeriod = () => {
  const current = new Date(currentPeriodStart.value);
  switch (currentView.value) {
    case 'month':
      current.setMonth(current.getMonth() - 1);
      break;
    case 'week':
      current.setDate(current.getDate() - 7);
      break;
  }
  currentPeriodStart.value = current;
  showDate.value = current;
};

const goToNextPeriod = () => {
  const current = new Date(currentPeriodStart.value);
  switch (currentView.value) {
    case 'month':
      current.setMonth(current.getMonth() + 1);
      break;
    case 'week':
      current.setDate(current.getDate() + 7);
      break;
  }
  currentPeriodStart.value = current;
  showDate.value = current;
};

onMounted(() => {
  loadEvents();
});
</script>

<template>
  <v-card class="calendar-container mt-5" elevation="7" rounded="lg">
    <v-card-title class="d-flex align-center justify-space-between pa-4 pa-sm-6 bg-primary text-white">
      <div class="d-flex align-center">
        <v-icon :size="$vuetify.display.xs ? '24' : '32'" class="me-2 me-sm-3">mdi-calendar-multiple</v-icon>
        <div>
          <h2 class="text-h6 text-sm-h5 font-weight-bold mb-1">My Events Calendar</h2>
          <p class="text-caption text-sm-body-2 mb-0 opacity-90 d-none d-sm-block">Registered and Upcoming Events</p>
          <p class="text-caption mb-0 opacity-90 d-block d-sm-none">Events</p>
        </div>
      </div>
      <div class="d-none d-sm-block">
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
      <div class="d-block d-sm-none">
        <v-btn
          color="white"
          variant="elevated"
          size="small"
          @click="loadEvents"
          :loading="loading"
          icon
        >
          <v-icon>mdi-refresh</v-icon>
        </v-btn>
      </div>
    </v-card-title>
    <v-divider></v-divider>
    <v-card-text class="pa-4 pa-sm-6 pb-0">
      <div class="d-flex flex-column flex-sm-row align-center justify-space-between gap-3 gap-sm-4 mb-4 mb-sm-6">
        <div class="d-flex align-center gap-1 gap-sm-2">
          <v-btn icon="mdi-chevron-left" variant="outlined" :size="$vuetify.display.xs ? 'x-small' : 'small'" @click="goToPreviousPeriod"></v-btn>
          <v-btn color="primary" variant="elevated" :size="$vuetify.display.xs ? 'small' : 'default'" class="mx-1 mx-sm-2" @click="goToToday">Today</v-btn>
          <v-btn icon="mdi-chevron-right" variant="outlined" :size="$vuetify.display.xs ? 'x-small' : 'small'" @click="goToNextPeriod"></v-btn>
          <div class="ms-2 ms-sm-4">
            <h3 class="text-body-1 text-sm-h6 font-weight-medium">{{ displayPeriodLabel }}</h3>
          </div>
        </div>
        <div class="d-flex align-center gap-1 gap-sm-2">
          <v-btn-toggle v-model="currentView" color="primary" variant="outlined" divided mandatory>
            <v-btn v-for="view in calendarViews" :key="view.value" :value="view.value" :size="$vuetify.display.xs ? 'x-small' : 'small'" @click="changeView(view.value)">
              <v-icon :icon="view.icon" :class="$vuetify.display.xs ? '' : 'me-1'"></v-icon>
              <span class="d-none d-sm-inline">{{ view.title }}</span>
            </v-btn>
          </v-btn-toggle>
        </div>
      </div>
    </v-card-text>
    <div v-if="loading" class="d-flex justify-center align-center pa-6 pa-sm-8">
      <v-progress-circular indeterminate color="primary" :size="$vuetify.display.xs ? '36' : '48'"></v-progress-circular>
      <span class="ms-3 ms-sm-4 text-body-2 text-sm-subtitle-1">Loading calendar events...</span>
    </div>
    <div v-else class="calendar-wrapper pa-4 pa-sm-6 pt-0">
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
      />
    </div>
    <div v-if="!loading && calendarEvents.length === 0" class="text-center pa-6 pa-sm-8">
      <v-icon color="grey-lighten-1" :size="$vuetify.display.xs ? '48' : '64'" class="mb-3 mb-sm-4">mdi-calendar-blank</v-icon>
      <h3 class="text-body-1 text-sm-h6 text-grey-darken-1 mb-2">No Events Scheduled</h3>
      <p class="text-caption text-sm-body-2 text-grey mb-3 mb-sm-4">No events are currently scheduled. Check back later for updates.</p>
      <v-btn color="primary" variant="elevated" :size="$vuetify.display.xs ? 'small' : 'default'" @click="loadEvents">Refresh Calendar</v-btn>
    </div>
    <v-card-text v-if="!loading && calendarEvents.length > 0" class="pt-0 pa-4 pa-sm-6">
      <v-row class="events-summary">
        <v-col cols="12">
          <div class="d-flex flex-wrap ga-2 ga-sm-3 align-center">
            <v-chip color="primary" variant="elevated" :size="$vuetify.display.xs ? 'small' : 'default'" prepend-icon="mdi-calendar-check">
              <span class="d-none d-sm-inline">Registered Events</span>
              <span class="d-inline d-sm-none">Registered</span>
            </v-chip>
            <v-chip color="accent" variant="elevated" :size="$vuetify.display.xs ? 'small' : 'default'" prepend-icon="mdi-calendar-clock">
              <span class="d-none d-sm-inline">Upcoming Events</span>
              <span class="d-inline d-sm-none">Upcoming</span>
            </v-chip>
          </div>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>


