<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import axios from 'axios'

// Props
interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

// Types
interface VersionLog {
  version: string
  date: string
  title: string
  changes: string[]
}

interface VersionsData {
  versions: VersionLog[]
}

// Reactive state
const loading = ref(false)
const error = ref<string | null>(null)
const versionsData = ref<VersionLog[]>([])

// Computed
const isOpen = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const sortedVersions = computed(() => {
  return [...versionsData.value].sort((a, b) => {
    // Sort by date descending (newest first)
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })
})

const latestVersion = computed(() => {
  return sortedVersions.value.length > 0 ? sortedVersions.value[0].version : null
})

// Methods
const fetchVersions = async () => {
  try {
    loading.value = true
    error.value = null

    const response = await axios.get<VersionsData>('/data/versions.json')
    versionsData.value = response.data.versions
  } catch (err) {
    console.error('Failed to fetch versions:', err)
    error.value = 'Failed to load version information'
  } finally {
    loading.value = false
  }
}

const closeDialog = () => {
  isOpen.value = false
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Lifecycle
onMounted(() => {
  if (props.modelValue) {
    fetchVersions()
  }
})

// Watch for dialog open/close
watch(() => props.modelValue, (newValue) => {
  if (newValue && versionsData.value.length === 0) {
    fetchVersions()
  }
})
</script>

<template>
  <v-dialog
    v-model="isOpen"
    max-width="900px"
    width="90%"
    scrollable
    persistent
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span class="text-h5">Version Logs</span>
        <v-btn
          icon="mdi-close"
          variant="text"
          @click="closeDialog"
        />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-0">
        <!-- Loading State -->
        <div v-if="loading" class="d-flex justify-center align-center pa-8">
          <v-progress-circular
            indeterminate
            color="primary"
            size="48"
          />
          <span class="ml-4 text-h6">Loading version logs...</span>
        </div>

        <!-- Error State -->
        <v-alert
          v-else-if="error"
          type="error"
          class="ma-4"
          :text="error"
        />

        <!-- Content -->
        <div v-else-if="versionsData.length > 0" class="pa-4">
          <div class="version-logs-container">
            <div
              v-for="(version, index) in sortedVersions"
              :key="version.version"
              class="version-item mb-4"
            >
              <div class="d-flex align-start mb-3">
                <v-avatar
                  :color="version.version === latestVersion ? 'primary' : 'surface-variant'"
                  size="32"
                  class="flex-shrink-0 me-3"
                >
                  <v-icon
                    :color="version.version === latestVersion ? 'white' : 'primary'"
                    size="16"
                  >
                    mdi-tag
                  </v-icon>
                </v-avatar>

                <div class="flex-grow-1">
                  <div class="d-flex align-center justify-space-between mb-1">
                    <div class="d-flex align-center">
                      <span class="text-h6 me-2">{{ version.version }}</span>
                      <v-chip
                        v-if="version.version === latestVersion"
                        color="primary"
                        size="small"
                        variant="flat"
                      >
                        Latest
                      </v-chip>
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ formatDate(version.date) }}
                    </div>
                  </div>

                  <v-card variant="outlined" class="version-card">
                    <v-card-subtitle class="pb-2">
                      {{ version.title }}
                    </v-card-subtitle>

                    <v-card-text class="pt-0">
                      <div class="text-body-2 mb-2 font-weight-medium">Changes:</div>
                      <v-list density="compact" class="pa-0">
                        <v-list-item
                          v-for="change in version.changes"
                          :key="change"
                          class="px-0 py-1"
                        >
                          <template #prepend>
                            <v-icon
                              size="12"
                              color="primary"
                              class="me-2"
                            >
                              mdi-circle-small
                            </v-icon>
                          </template>
                          <v-list-item-title class="text-body-2">
                            {{ change }}
                          </v-list-item-title>
                        </v-list-item>
                      </v-list>
                    </v-card-text>
                  </v-card>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="d-flex flex-column align-center justify-center pa-8">
          <v-icon size="64" color="grey-lighten-1" class="mb-4">
            mdi-history
          </v-icon>
          <div class="text-h6 text-grey-lighten-1 mb-2">No Version Logs</div>
          <div class="text-body-2 text-grey-lighten-1">
            Version information is not available at this time.
          </div>
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions>
        <v-spacer />
        <v-btn
          color="primary"
          variant="text"
          @click="closeDialog"
        >
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.version-logs-container {
  max-width: 100%;
  width: 100%;
}

.version-item {
  position: relative;
}

.version-item:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 16px;
  top: 40px;
  bottom: -16px;
  width: 2px;
  background-color: rgba(var(--v-theme-surface-variant), 0.3);
}

.version-card {
  transition: all 0.3s ease;
  width: 100%;
}

.version-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
}

.v-list-item {
  min-height: 28px !important;
}

.v-list-item-title {
  line-height: 1.5;
  white-space: normal;
}

/* Ensure full width usage */
.v-card-text,
.v-card-subtitle {
  width: 100%;
}

/* Remove default list styles */
.v-list {
  background: transparent !important;
}
</style>
