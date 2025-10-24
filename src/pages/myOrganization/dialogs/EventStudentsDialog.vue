<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { fetchEventStudents } from '@/stores/studentsData'

const props = defineProps<{
  modelValue: boolean
  event: { id: number; title: string; date?: string } | null
  memberStudentIds: (string | number)[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const open = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v)
})

const loading = ref(false)
const students = ref<any[]>([])

async function load() {
  if (!props.event?.id) return
  loading.value = true
  try {
    const all = await fetchEventStudents(props.event.id)
    // Filter students to only those who are members of the selected organization
    const idSet = new Set((props.memberStudentIds || []).map(id => String(id)))
    students.value = all.filter(s => idSet.has(String(s.id)))
  } finally {
    loading.value = false
  }
}

watch(() => props.event?.id, () => {
  if (open.value) load()
})

watch(open, (v) => {
  if (v) load()
})
</script>

<template>
  <v-dialog v-model="open" max-width="800" :retain-focus="false">
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="me-2">mdi-account-school</v-icon>
        <div>
          <div class="text-h6">Event Students</div>
          <div class="text-caption text-medium-emphasis" v-if="event">
            {{ event.title }}
          </div>
        </div>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" @click="open = false" />
      </v-card-title>

      <v-divider />

      <v-card-text>
        <div v-if="loading" class="text-center py-8">
          <v-progress-circular indeterminate color="primary" />
        </div>
        <div v-else>
          <div v-if="students.length === 0" class="text-center py-10">
            <v-icon size="40" class="mb-2" color="warning">mdi-account-off</v-icon>
            <div class="text-subtitle-1">No students from your organization are attached to this event.</div>
          </div>
          <v-data-table
            v-else
            :items="students"
            :headers="[
              { title: 'Name', value: 'full_name' },
              { title: 'Student No.', value: 'student_number' },
              { title: 'Email', value: 'email' },
              { title: 'Org', value: 'organization' },
              { title: 'Event Status', value: 'event_status' },
            ]"
            :items-per-page="10"
          >
            <template #item.event_status="{ item }">
              <v-chip size="small" :color="item.event_status?.toLowerCase() === 'cleared' ? 'success' : item.event_status?.toLowerCase() === 'blocked' ? 'error' : 'default'" variant="tonal">
                {{ item.event_status || '—' }}
              </v-chip>
            </template>
          </v-data-table>
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" variant="elevated" @click="open = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
