
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import InnerLayoutWrapper from '@/layouts/InnerLayoutWrapper.vue';
import { useAuthUserStore } from '@/stores/authUser';
import { fetchStudents } from '@/stores/studentsData';
import { supabase } from '@/lib/supabase';

const blockedEvents = ref<{ name: string; date: string; status: string }[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const loadBlockedEvents = async () => {
  loading.value = true;
  error.value = null;
  try {
    const authUserStore = useAuthUserStore();
    const userId = authUserStore.userData?.id;
    if (!userId) throw new Error('User not authenticated');
    const students = await fetchStudents();
    const student = students.find(s => s.user_id === userId);
    if (!student) throw new Error('No student record found for current user');
    const studentId = student.id;

    // Directly query student_events and join events
    const { data, error: seError } = await supabase
      .from('student_events')
      .select('status, events(title, date)')
      .eq('student_id', studentId)
      .ilike('status', 'blocked');

    if (seError) throw seError;

    blockedEvents.value = (data || [])
      .filter(ev => ev.status)
      .map(ev => {
        const eventObj = Array.isArray(ev.events) ? ev.events[0] : ev.events;
        return {
          name: eventObj?.title || 'Event not found',
          date: eventObj?.date || '-',
          status: ev.status
        };
      });
  } catch (err: any) {
    error.value = err.message || 'Failed to load clearance data.';
    blockedEvents.value = [];
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadBlockedEvents();
});
</script>

<template>
  <InnerLayoutWrapper>
    <template #content>
      <v-container fluid class="pa-6">
        <v-row>
          <v-col cols="12">
            <v-card class="pa-0" elevation="2" rounded="lg">
              <v-card-title class="d-flex align-center justify-space-between pa-6 bg-primary text-white">
                <div class="d-flex align-center">
                  <v-icon size="32" class="me-3">mdi-shield-check</v-icon>
                  <div>
                    <h2 class="text-h5 font-weight-bold mb-1">My Clearance</h2>
                    <p class="text-body-2 mb-0 opacity-90">Blocked Events & Clearance Status</p>
                  </div>
                </div>
                <v-btn color="white" variant="elevated" size="default" @click="loadBlockedEvents" :loading="loading" prepend-icon="mdi-refresh">
                  Refresh
                </v-btn>
              </v-card-title>
              <v-divider></v-divider>
              <v-card-text class="pa-6">
                <div v-if="loading" class="text-center">
                  <v-progress-circular indeterminate color="primary" size="40" class="mb-4" />
                  <div>Loading clearance data...</div>
                </div>
                <div v-else-if="error" class="text-center text-error">
                  {{ error }}
                </div>
                <div v-else-if="blockedEvents.length === 0" class="text-center text-success">
                  <v-icon color="success" size="48" class="mb-2">mdi-check-circle</v-icon>
                  <div class="text-h6">You have no blocked events. You are clear!</div>
                </div>
                <div v-else>
                  <v-table density="comfortable" class="mb-0">
                    <thead>
                      <tr>
                        <th>Event Name</th>
                        <th>Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="event in blockedEvents" :key="event.name + event.date">
                        <td>{{ event.name }}</td>
                        <td>{{ event.date }}</td>
                        <td>
                          <v-chip color="error" variant="elevated" size="small">{{ event.status }}</v-chip>
                        </td>
                      </tr>
                    </tbody>
                  </v-table>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </template>
  </InnerLayoutWrapper>
</template>
