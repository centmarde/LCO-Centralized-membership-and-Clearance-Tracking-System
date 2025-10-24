<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import { useToast } from 'vue-toastification'
import { getStatusColor, getStatusText, getEmailInitials, filterMembersBySearch } from '@/utils/helpers'
import type { OrganizationMember } from '@/stores/organizationMembersData'
import { useOrganizationMembers } from '@/pages/admin/composables/useOrganizationMembers'

interface Props {
  dialog: boolean
  organizationId: string
  organizationTitle: string
  members: OrganizationMember[]
}

interface Emits {
  (e: 'update:dialog', value: boolean): void
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const toast = useToast()

// v-model bridge
const dialogValue = computed({
  get: () => props.dialog,
  set: (v: boolean) => emit('update:dialog', v)
})

// Per-member events cache and loading state
const memberEvents = ref<Record<string, any[]>>({}) // key: user_id
const memberLoadings = ref<Record<string, boolean>>({})
const editedStatuses = ref<Record<string, Record<number, string>>>({}) // user_id -> { eventId: status }

// Composable actions
const { fetchMemberEventsByUserId, setMemberEventStatus } = useOrganizationMembers()

// Search
const search = ref('')
const filteredMembers = computed(() => filterMembersBySearch(props.members || [], search.value))

// Load events for a specific member on-demand
const loadMemberEvents = async (member: OrganizationMember) => {
  const userId = member.student?.user_id
  if (!userId) return
  if (memberEvents.value[userId]) return // already loaded

  memberLoadings.value[userId] = true
  try {
    const events = await fetchMemberEventsByUserId(userId)
    memberEvents.value[userId] = events
    // Seed edited statuses
    const map: Record<number, string> = {}
    events.forEach((e: any) => {
      const s = (e.status || '').toLowerCase()
      map[e.event_id] = s === 'cleared' || s === 'blocked' ? s : 'blocked'
    })
    editedStatuses.value[userId] = map
  } catch (err) {
    console.error('Failed to load member events', err)
    toast.error('Failed to load member events')
  } finally {
    memberLoadings.value[userId] = false
  }
}

// Update a single event status for a member (immediate commit)
const updateMemberEventStatus = async (member: OrganizationMember, eventId: number, newStatus: string) => {
  try {
    const studentId = member.student?.id || member.student_id
    if (!studentId) {
      toast.error('Missing student id')
      return
    }
    const ok = await setMemberEventStatus(studentId as any, eventId, newStatus)
    if (!ok) return

    // Reflect in local cache
    const userId = member.student?.user_id as string
    const list = memberEvents.value[userId] || []
    const target = list.find((e: any) => e.event_id === eventId)
    if (target) target.status = newStatus
    editedStatuses.value[userId] = {
      ...(editedStatuses.value[userId] || {}),
      [eventId]: newStatus
    }

    // toast handled in store; no extra toast here
  } catch (err) {
    console.error('Update failed', err)
    // error toast handled in store
  }
}

const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString() : 'No date'
</script>

<template>
  <v-dialog v-model="dialogValue" max-width="1000px" scrollable persistent>
    <v-card>
      <v-card-title class="pa-6 bg-primary text-white">
        <div class="d-flex align-center">
          <v-icon size="28" class="me-3">mdi-account-group</v-icon>
          <div>
            <h2 class="text-h5 font-weight-bold mb-1">{{ organizationTitle }} — Members</h2>
            <p class="text-body-2 mb-0 opacity-90">View blocked events per member and set to Cleared or Blocked</p>
          </div>
        </div>
      </v-card-title>

      <v-card-text class="pa-0">
        <v-container fluid class="pa-6 pt-4">
              <div v-if="!members || members.length === 0" class="text-center pa-8">
            <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-account-group-outline</v-icon>
            <div class="text-h6">No members for this organization.</div>
          </div>

              <template v-else>
                <!-- Search bar -->
                <v-row class="mb-4">
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="search"
                      prepend-inner-icon="mdi-magnify"
                      label="Search members..."
                      variant="outlined"
                      hide-details
                      clearable
                      density="compact"
                    />
                  </v-col>
                </v-row>

                <div v-if="filteredMembers.length === 0" class="text-center pa-8">
                  <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-account-search</v-icon>
                  <div class="text-subtitle-1">No members match your search.</div>
                </div>

                <v-expansion-panels v-else variant="accordion">
                  <v-expansion-panel
                  v-for="member in filteredMembers"
              :key="member.id"
              @group:selected="val => { if (val) loadMemberEvents(member) }"
            >
              <v-expansion-panel-title>
                <div class="d-flex align-center w-100">
                  <v-avatar size="36" color="primary" class="mr-3">
                    <span class="text-white">{{ getEmailInitials(member.student?.email || '') }}</span>
                  </v-avatar>
                  <div class="flex-grow-1">
                    <div class="font-weight-medium">{{ member.student?.full_name || member.student?.email }}</div>
                    <div class="text-caption text-medium-emphasis">{{ member.student?.student_number }} • {{ member.student?.email }}</div>
                  </div>
                </div>
              </v-expansion-panel-title>

              <v-expansion-panel-text>
                <div v-if="memberLoadings[member.student?.user_id || '']" class="text-center py-6">
                  <v-progress-circular indeterminate color="primary" />
                </div>

                <div v-else>
                  <v-list v-if="(memberEvents[member.student?.user_id || ''] || []).length > 0" density="compact">
                    <v-list-item
                      v-for="eventDetail in memberEvents[member.student?.user_id || '']"
                      :key="eventDetail.event_id"
                      class="mb-1"
                    >
                      <template #prepend>
                        <v-avatar size="36" color="primary" class="mr-3">
                          <v-icon>mdi-calendar-check</v-icon>
                        </v-avatar>
                      </template>

                      <v-list-item-title class="font-weight-medium">
                        {{ eventDetail.events?.title || 'Unknown Event' }}
                      </v-list-item-title>
                      <v-list-item-subtitle class="d-flex align-center mt-1 flex-wrap">
                        <v-icon size="16" class="mr-1">mdi-calendar</v-icon>
                        {{ formatDate(eventDetail.events?.date) }}
                        <v-spacer />
                        <template v-if="eventDetail.present">
                          <v-chip color="success" variant="tonal" size="x-small" class="mr-2">
                            Present (leader)
                          </v-chip>
                        </template>
                        <span class="text-caption mr-2">Current:</span>
                        <v-chip :color="getStatusColor(eventDetail.status)" variant="tonal" size="x-small">
                          {{ getStatusText(eventDetail.status) }}
                        </v-chip>
                      </v-list-item-subtitle>

                      <template #append>
                        <div class="d-flex flex-column align-end">
                          <span class="text-caption mb-1 d-none d-sm-inline">Update to:</span>
                          <div class="d-flex align-center">
                            <v-select
                              v-model="editedStatuses[member.student?.user_id || ''][eventDetail.event_id]"
                              :items="[
                                { title: 'Cleared', value: 'cleared' },
                                { title: 'Blocked', value: 'blocked' }
                              ]"
                              item-title="title"
                              item-value="value"
                              density="compact"
                              hide-details
                              variant="outlined"
                              style="min-width: 140px;"
                              @update:model-value="val => updateMemberEventStatus(member, eventDetail.event_id, val as string)"
                            />
                          </div>
                        </div>
                      </template>
                    </v-list-item>
                  </v-list>

                  <v-alert v-else type="info" variant="tonal">
                    This member has no registered events.
                  </v-alert>
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>
            </v-expansion-panels>
          </template>
        </v-container>
      </v-card-text>

      <v-card-actions class="pa-6 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="emit('close')">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
