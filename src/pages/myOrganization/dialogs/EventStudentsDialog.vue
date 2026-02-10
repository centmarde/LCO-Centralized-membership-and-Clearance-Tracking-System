<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { fetchEventStudents } from '@/stores/studentsData'
import { useEventBlockingStore, type EventBlockBatch } from '@/stores/eventBlocking'
import { useAuthUserStore } from '@/stores/authUser'
import { getEmailInitials, getStatusColor, getStatusText, filterStudentsBySearch } from '@/utils/helpers'
import { useToast } from 'vue-toastification'

const props = defineProps<{
  modelValue: boolean
  event: { id: number; title: string; date?: string } | null
  memberStudentIds: (string | number)[]
  organizationId: string | number
  leaderId?: string | null
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
const initialPresence = ref<Map<string, boolean>>(new Map())
const presenceMap = ref<Map<string, boolean>>(new Map())
const submitting = ref(false)
const toast = useToast()
const eventBlockingStore = useEventBlockingStore()
const authStore = useAuthUserStore()
const lastBatch = ref<EventBlockBatch | null>(null)
const loadingBatch = ref(false)

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
    const filtered = all.filter(s => idSet.has(String(s.id)))
    students.value = filtered
    const map = new Map<string, boolean>()
    filtered.forEach(s => {
      map.set(String(s.id), !!s.event_present)
    })
    initialPresence.value = map
    presenceMap.value = new Map(map)
    await loadLatestBatch()
  } finally {
    loading.value = false
  }
}

const loadLatestBatch = async () => {
  if (!props.event?.id || !props.organizationId) return
  loadingBatch.value = true
  try {
    const leaderId = props.leaderId ?? authStore.userData?.id ?? null
    lastBatch.value = await eventBlockingStore.fetchLatestBatchForLeader(
      props.organizationId,
      props.event.id,
      leaderId
    )
  } finally {
    loadingBatch.value = false
  }
}

watch(() => props.event?.id, () => {
  if (open.value) load()
})

watch(open, (v) => {
  if (v) load()
})

const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString() : 'No date'
const formatDateTime = (d?: string | null) => d ? new Date(d).toLocaleString() : '—'

const statusColor = (status?: string) => {
  if (!status) return 'grey'
  switch (status) {
    case 'approved': return 'success'
    case 'pending': return 'warning'
    case 'declined': return 'error'
    default: return 'grey'
  }
}

const statusLabel = (status?: string) => {
  if (!status) return '—'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

async function onTogglePresence(s: any, checked: boolean) {
  presenceMap.value.set(String(s.id), checked)
}

const changedCount = computed(() => {
  let count = 0
  presenceMap.value.forEach((val, key) => {
    const prev = initialPresence.value.get(key)
    if (prev !== val) count += 1
  })
  return count
})

const selectedCount = computed(() => {
  let count = 0
  presenceMap.value.forEach(val => { if (val) count += 1 })
  return count
})

const hasPendingSelection = computed(() => selectedCount.value > 0)

const handleSubmitBatch = async () => {
  if (!props.event?.id) return
  if (!props.organizationId) {
    toast.error('Missing organization context')
    return
  }
  const items = Array.from(presenceMap.value.entries())
    .filter(([, present]) => present)
    .map(([id, present]) => ({ studentId: id, present }))

  if (items.length === 0) {
    toast.error('Select at least one present student before submitting')
    return
  }

  submitting.value = true
  const leaderId = props.leaderId ?? authStore.userData?.id ?? null
  const ok = await eventBlockingStore.createBatchSubmission({
    organizationId: props.organizationId,
    eventId: props.event.id,
    leaderId,
    items
  })
  submitting.value = false
  if (ok) {
    await loadLatestBatch()
    open.value = false
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
          <div class="d-flex align-center mb-4" v-if="lastBatch || loadingBatch">
            <v-skeleton-loader v-if="loadingBatch" type="chip" width="200" />
            <template v-else-if="lastBatch">
              <span class="text-body-2 text-medium-emphasis">Last submission:</span>
              <v-chip :color="statusColor(lastBatch.status)" class="ms-2" size="small" variant="tonal">
                {{ statusLabel(lastBatch.status) }}
              </v-chip>
              <span class="text-caption text-medium-emphasis ms-3">Submitted {{ formatDateTime(lastBatch.submitted_at) }}</span>
            </template>
          </div>

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
                        :model-value="presenceMap.get(String(s.id)) ?? s.event_present"
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

      <v-card-actions class="pa-6 pt-0 align-center">
        <div class="text-caption text-medium-emphasis">
          {{ selectedCount }} selected • {{ changedCount }} modified
        </div>
        <v-spacer />
        <v-btn variant="text" @click="open = false">Close</v-btn>
        <v-btn color="primary" variant="flat" @click="handleSubmitBatch" :loading="submitting" :disabled="!hasPendingSelection || submitting">
          Submit for Admin Approval
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  
</template>
