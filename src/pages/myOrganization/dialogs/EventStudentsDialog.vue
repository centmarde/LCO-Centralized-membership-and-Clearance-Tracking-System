<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { fetchEventStudents, setStudentEventPresence } from '@/stores/studentsData'
import { getEmailInitials, getStatusColor, getStatusText, filterStudentsBySearch } from '@/utils/helpers'
import { useToast } from 'vue-toastification'

const props = defineProps<{
  modelValue: boolean
  event: { id: number; title: string; date?: string } | null
  memberStudentIds: (string | number)[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

// v-model bridge for dialog
const open = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v)
})

const loading = ref(false)
const students = ref<any[]>([])
const toast = useToast()

// Search state (to match OrganizationMembersStatusDialog UI)
const search = ref('')
const filteredStudents = computed(() => filterStudentsBySearch(students.value || [], search.value))

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

const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString() : 'No date'

async function onTogglePresence(s: any, checked: boolean) {
  if (!props.event?.id) return
  const prev = !!s.event_present
  s.event_present = checked
  const ok = await setStudentEventPresence(s.id, props.event.id, checked)
  if (!ok) {
    s.event_present = prev
    toast.error('Failed to update presence')
  } else {
    toast.success(checked ? 'Marked present' : 'Presence removed')
  }
}
</script>

<template>
  <v-dialog v-model="open" max-width="1000px" scrollable :retain-focus="false">
    <v-card>
      <v-card-title class="pa-6 bg-primary text-white">
        <div class="d-flex align-center">
          <v-icon size="28" class="me-3">mdi-account-group</v-icon>
          <div>
            <h2 class="text-h5 font-weight-bold mb-1">Event Students</h2>
            <p class="text-body-2 mb-0 opacity-90" v-if="event">
              {{ event.title }} • {{ formatDate(event?.date) }}
            </p>
          </div>
        </div>
      </v-card-title>

      <v-card-text class="pa-0">
        <v-container fluid class="pa-6 pt-4">
          <div v-if="loading" class="text-center py-6">
            <v-progress-circular indeterminate color="primary" />
          </div>

          <template v-else>
            <div v-if="!students || students.length === 0" class="text-center pa-8">
              <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-account-group-outline</v-icon>
              <div class="text-h6">No students from your organization are attached to this event.</div>
            </div>

            <template v-else>
              <!-- Search bar -->
              <v-row class="mb-4">
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="search"
                    prepend-inner-icon="mdi-magnify"
                    label="Search students..."
                    variant="outlined"
                    hide-details
                    clearable
                    density="compact"
                  />
                </v-col>
              </v-row>

              <div v-if="filteredStudents.length === 0" class="text-center pa-8">
                <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-account-search</v-icon>
                <div class="text-subtitle-1">No students match your search.</div>
              </div>

              <v-list v-else density="compact">
                <v-list-item
                  v-for="s in filteredStudents"
                  :key="s.id"
                  class="mb-1"
                >
                  <template #prepend>
                    <v-avatar size="36" color="primary" class="mr-3">
                      <span class="text-white">{{ getEmailInitials(s.email || '') }}</span>
                    </v-avatar>
                  </template>

                  <v-list-item-title class="font-weight-medium">
                    {{ s.full_name || s.email }}
                  </v-list-item-title>
                  <v-list-item-subtitle class="d-flex align-center mt-1 flex-wrap">
                    <v-icon size="16" class="mr-1">mdi-card-account-details</v-icon>
                    {{ s.student_number }} • {{ s.email }}
                    <v-spacer />
                    <div class="d-flex align-center mr-4">
                      <v-checkbox
                        v-model="s.event_present"
                        density="compact"
                        hide-details
                        color="success"
                        label="Present"
                        @update:model-value="val => onTogglePresence(s, !!val)"
                      />
                    </div>
                    <span class="text-caption mr-2">Current:</span>
                    <v-chip :color="getStatusColor(s.event_status)" variant="tonal" size="x-small">
                      {{ getStatusText(s.event_status) }}
                    </v-chip>
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </template>
          </template>
        </v-container>
      </v-card-text>

      <v-card-actions class="pa-6 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="open = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  
</template>
