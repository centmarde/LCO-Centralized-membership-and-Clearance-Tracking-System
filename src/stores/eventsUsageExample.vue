<!--
  Example component showing new eventsStore capabilities
  This demonstrates how to use the is_lco field and new Pinia store features
-->
<template>
  <div>
    <h2>Events Store Example Usage</h2>

    <!-- Loading state -->
    <v-progress-linear v-if="eventsStore.loading" indeterminate />

    <!-- Error state -->
    <v-alert v-if="eventsStore.error" type="error">
      {{ eventsStore.error }}
    </v-alert>

    <!-- LCO Events Section -->
    <v-card class="mb-4">
      <v-card-title>LCO Events ({{ eventsStore.lcoEvents.length }})</v-card-title>
      <v-card-text>
        <v-chip
          v-for="event in eventsStore.lcoEvents"
          :key="event.id"
          color="primary"
          class="ma-1"
        >
          {{ event.title }} - {{ event.date }}
        </v-chip>
      </v-card-text>
    </v-card>

    <!-- Non-LCO Events Section -->
    <v-card class="mb-4">
      <v-card-title>Regular Events ({{ eventsStore.nonLcoEvents.length }})</v-card-title>
      <v-card-text>
        <v-chip
          v-for="event in eventsStore.nonLcoEvents"
          :key="event.id"
          color="secondary"
          class="ma-1"
        >
          {{ event.title }} - {{ event.date }}
        </v-chip>
      </v-card-text>
    </v-card>

    <!-- Upcoming Events -->
    <v-card class="mb-4">
      <v-card-title>Upcoming Events ({{ eventsStore.upcomingEvents.length }})</v-card-title>
      <v-card-text>
        <v-list>
          <v-list-item
            v-for="event in eventsStore.upcomingEvents"
            :key="event.id"
          >
            <template #prepend>
              <v-icon :color="event.is_lco ? 'primary' : 'secondary'">
                {{ event.is_lco ? 'mdi-account-tie' : 'mdi-calendar' }}
              </v-icon>
            </template>
            <v-list-item-title>{{ event.title }}</v-list-item-title>
            <v-list-item-subtitle>{{ event.date }} - {{ event.is_lco ? 'LCO Event' : 'Regular Event' }}</v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>

    <!-- Action Buttons -->
    <div class="d-flex gap-2 flex-wrap">
      <v-btn @click="eventsStore.fetchEvents()" :loading="eventsStore.loading">
        Refresh Events
      </v-btn>

      <v-btn @click="createLCOEvent" :loading="eventsStore.loading" color="primary">
        Create LCO Event
      </v-btn>

      <v-btn @click="createRegularEvent" :loading="eventsStore.loading" color="secondary">
        Create Regular Event
      </v-btn>

      <v-btn @click="eventsStore.loadBlockedEvents()" :loading="eventsStore.loading" color="warning">
        Load My Blocked Events
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useEventsStore } from '@/stores/eventsData'

const eventsStore = useEventsStore()

// Create example LCO event
const createLCOEvent = async () => {
  try {
    await eventsStore.createEvent({
      title: `LCO Meeting - ${new Date().toLocaleDateString()}`,
      date: new Date().toISOString().split('T')[0],
      is_lco: true
    })
    // The store will automatically update the reactive state
  } catch (error) {
    console.error('Error creating LCO event:', error)
  }
}

// Create example regular event
const createRegularEvent = async () => {
  try {
    await eventsStore.createEvent({
      title: `Regular Event - ${new Date().toLocaleDateString()}`,
      date: new Date().toISOString().split('T')[0],
      is_lco: false // or omit this, defaults to false
    })
  } catch (error) {
    console.error('Error creating regular event:', error)
  }
}

// Load events on mount
onMounted(async () => {
  await eventsStore.fetchEvents()
})
</script>
