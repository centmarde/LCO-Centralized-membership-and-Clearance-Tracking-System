<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { 
  getRoleColor, 
  getRoleText, 
  getStatusColor, 
  getStatusText, 
  formatDate 
} from '@/utils/helpers'
import { fetchStudentEventDetailsByUserId } from '@/stores/studentsData'

interface User {
  id: string
  email?: string
  full_name?: string
  student_number?: string
  role_id?: number
  status?: string
  created_at?: string
}

interface Props {
  modelValue: boolean
  user: User | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const closeDialog = () => {
  emit('update:modelValue', false)
}

// Local state for blocked events (read-only view)
const loadingEvents = ref(false)
const blockedEvents = ref<any[]>([])

const loadBlockedEvents = async () => {
  blockedEvents.value = []
  if (!props.user || props.user.role_id !== 2) return
  loadingEvents.value = true
  try {
    const details = await fetchStudentEventDetailsByUserId(props.user.id)
    blockedEvents.value = (details || []).filter(
      (e: any) => e.status?.toLowerCase?.() === 'blocked'
    )
  } catch (e) {
    // Silent fail in details dialog; nothing critical to act on
    blockedEvents.value = []
  } finally {
    loadingEvents.value = false
  }
}

// Fetch whenever dialog opens or user changes
watch(() => props.modelValue, async (open) => {
  if (open) await loadBlockedEvents()
})
watch(() => props.user?.id, async () => {
  if (props.modelValue) await loadBlockedEvents()
})
</script>

<template>
  <!-- User Details Dialog -->
  <v-dialog 
    :model-value="modelValue" 
    @update:model-value="emit('update:modelValue', $event)" 
    max-width="500px"
  >
    <v-card v-if="user" class="pa-4">
      <v-card-title class="d-flex flex-column align-center text-center">
        <v-avatar color="primary" size="80" class="mb-4">
          <v-icon size="50">mdi-account-circle</v-icon>
        </v-avatar>
        <h2 class="text-h5 mb-1">{{ user.full_name || 'User' }}</h2>
        <p class="text-body-2 text-grey">{{ user.email }}</p>
      </v-card-title>

      <v-card-text class="mt-4">
        <v-list density="compact">
          <v-list-item prepend-icon="mdi-identifier">
            <v-list-item-title>Student Number</v-list-item-title>
            <v-list-item-subtitle>{{ user.student_number || 'N/A' }}</v-list-item-subtitle>
          </v-list-item>

          <v-divider class="my-2"></v-divider>

          <v-list-item prepend-icon="mdi-account-tie">
            <v-list-item-title>Role</v-list-item-title>
            <v-list-item-subtitle>
              <v-chip :color="getRoleColor(user.role_id)" variant="tonal" size="small">
                {{ getRoleText(user.role_id) }}
              </v-chip>
            </v-list-item-subtitle>
          </v-list-item>

          <v-divider class="my-2"></v-divider>

          <v-list-item prepend-icon="mdi-list-status">
            <v-list-item-title>Status</v-list-item-title>
            <v-list-item-subtitle>
              <v-chip :color="getStatusColor(user.status)" variant="tonal" size="small">
                {{ getStatusText(user.status) }}
              </v-chip>
            </v-list-item-subtitle>
          </v-list-item>

          <v-divider class="my-2"></v-divider>

          <v-list-item prepend-icon="mdi-calendar-clock">
            <v-list-item-title>Member Since</v-list-item-title>
            <v-list-item-subtitle>{{ formatDate(user.created_at) }}</v-list-item-subtitle>
          </v-list-item>
        </v-list>

        <!-- Blocked Events (Students only) -->
        <template v-if="user.role_id === 2">
          <v-divider class="my-4" />
          <div class="d-flex align-center mb-2">
            <v-icon class="mr-2">mdi-block-helper</v-icon>
            <h3 class="text-subtitle-1 mb-0">Blocked Events</h3>
          </div>

          <v-progress-linear v-if="loadingEvents" indeterminate color="primary" class="mb-2" />

          <v-alert v-else-if="blockedEvents.length === 0" type="success" variant="tonal">
            No blocked events
          </v-alert>

          <v-list v-else density="compact">
            <v-list-item
              v-for="ev in blockedEvents"
              :key="ev.id"
            >
              <template #prepend>
                <v-avatar size="36" color="error" class="mr-3">
                  <v-icon>mdi-alert-circle</v-icon>
                </v-avatar>
              </template>

              <v-list-item-title class="font-weight-medium">
                {{ ev.events?.title || 'Unknown Event' }}
              </v-list-item-title>
              <v-list-item-subtitle class="d-flex align-center mt-1">
                <v-icon size="16" class="mr-1">mdi-calendar</v-icon>
                {{ ev.events?.date ? new Date(ev.events.date).toLocaleDateString() : 'No date' }}
                <v-spacer />
                <v-chip color="error" variant="tonal" size="x-small">Blocked</v-chip>
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </template>
      </v-card-text>

      <v-card-actions class="mt-4">
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="flat" @click="closeDialog" block>
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
