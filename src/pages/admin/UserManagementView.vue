<script setup lang="ts">
import { onMounted } from 'vue';
import InnerLayoutWrapper from '@/layouts/InnerLayoutWrapper.vue';
import UserManagementTable from './components/UserManagementTable.vue';
import { fetchStudentsWithEvents } from '@/stores/studentsData';

onMounted(async () => {
  try {
    const studentsWithEvents = await fetchStudentsWithEvents();
    console.log('Students with events:', studentsWithEvents);

    // Also log the student events separately
    studentsWithEvents.forEach(student => {
      if (student.student_events.length > 0) {
        console.log(`Student: ${student.full_name}`);
        student.student_events.forEach(studentEvent => {
          console.log(`  Event ID: ${studentEvent.event_id}, Status: ${studentEvent.status}`);
        });
      }
    });
  } catch (error) {
    console.error('Error fetching students with events:', error);
  }
});
</script>
<template>
  <InnerLayoutWrapper>
    <template #content>
      <v-container fluid class="pa-6">
        <v-row>
          <v-col cols="12">
            <UserManagementTable />
          </v-col>
        </v-row>
      </v-container>
    </template>
  </InnerLayoutWrapper>
</template>
