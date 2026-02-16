<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { CalendarView } from 'vue-simple-calendar'
import { useEventsStore, type EventWithLCO } from '@/stores/eventsData'
import { useCalendarView, calendarViews } from '@/pages/admin/composables/calendarView'
import PerOrgEventDialog from '@/pages/admin/dialogs/PerOrgEventDialog.vue'
import PerOrgViewEventDialog from '@/pages/admin/dialogs/PerOrgViewEventDialog.vue'
import { useAuthUserStore } from '@/stores/authUser'
import { useOrganizations } from '@/pages/admin/composables/useOrganizations'
import { filterOrganizationsByLeader } from '@/utils/helpers'
import InnerLayoutWrapper from '@/layouts/InnerLayoutWrapper.vue'
import 'vue-simple-calendar/dist/vue-simple-calendar.css'
import '@/styles/calendar.css'

defineOptions({
	name: 'PerOrgCalendar'
})

// Stores
const eventsStore = useEventsStore()
const authStore = useAuthUserStore()

// Organization data
const { organizations, fetchOrganizations } = useOrganizations()
const leaderOrganizations = computed(() => filterOrganizationsByLeader(organizations.value, authStore.userData?.id))
const selectedOrganizationId = ref<string | number | null>(null)
const selectedOrganization = computed(() =>
	leaderOrganizations.value.find(org => org.id === selectedOrganizationId.value) || leaderOrganizations.value[0]
)

// Calendar view composable
const {
	currentView,
	currentPeriodStart,
	displayPeriodUom,
	displayPeriodCount,
	startingDayOfWeek,
	displayPeriodLabel,
	changeView,
	goToToday,
	goToPreviousPeriod,
	goToNextPeriod,
	formatEventsForCalendar,
	getEventCounts,
	storageUtils,
	eventClickUtils
} = useCalendarView()

// Reactive data
const events = ref<EventWithLCO[]>([])
const loading = ref(false)

// Dialog state
const showAddEventDialog = ref(false)
const selectedDateForEvent = ref<Date | null>(null)
const showViewEventDialog = ref(false)
const selectedEvent = ref<EventWithLCO | null>(null)

// Calendar configuration
const calendarRef = ref(null)

// Derived data
const calendarEvents = computed(() => formatEventsForCalendar(events.value))
const eventsCounts = computed(() => getEventCounts(events.value))
const lcoEventsCounts = computed(() => {
	const lcoEvents = events.value.filter(event => event.is_lco)
	const regularEvents = events.value.filter(event => !event.is_lco)

	return {
		lco: lcoEvents.length,
		regular: regularEvents.length,
		lcoUpcoming: lcoEvents.filter(event => {
			const eventDate = new Date(event.date)
			const today = new Date()
			today.setHours(0, 0, 0, 0)
			return eventDate >= today
		}).length,
		regularUpcoming: regularEvents.filter(event => {
			const eventDate = new Date(event.date)
			const today = new Date()
			today.setHours(0, 0, 0, 0)
			return eventDate >= today
		}).length
	}
})

// Load events scoped to the selected organization plus global LCO + Org Leaders events
const loadEventsForOrganization = async (organizationId: string | number | null) => {
	if (!organizationId) {
		events.value = []
		return
	}

	try {
		loading.value = true

		const [orgEvents, allEvents] = await Promise.all([
			eventsStore.fetchEventsForOrganization(organizationId),
			eventsStore.fetchEvents()
		])

		const lcoEvents = allEvents.filter(ev => ev.is_lco)
		const orgLeaderEvents = allEvents.filter(ev => !ev.is_lco && (ev.organization_id === null || ev.organization_id === undefined))

		const merged = new Map<number, EventWithLCO>()
		;[...lcoEvents, ...orgLeaderEvents, ...orgEvents].forEach(ev => {
			merged.set(ev.id, {
				...ev,
				is_lco: !!ev.is_lco
			})
		})

		// Sort by date (desc), fallback to created_at
		events.value = Array.from(merged.values()).sort((a, b) => {
			const aDate = a.date ? new Date(a.date).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0)
			const bDate = b.date ? new Date(b.date).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0)
			return bDate - aDate
		})
	} catch (error) {
		console.error('Error loading organization and LCO events:', error)
	} finally {
		loading.value = false
	}
}

// Event handlers
const onEventClick = (event: any) => {
	const actualEvent = eventClickUtils.resolveEventFromClick(event, events.value) as EventWithLCO

	if (actualEvent) {
		storageUtils.saveEvent(actualEvent)
		selectedEvent.value = actualEvent
		showViewEventDialog.value = true
	} else {
		const storedEvent = storageUtils.loadEvent() as EventWithLCO
		if (storedEvent) {
			selectedEvent.value = storedEvent
			showViewEventDialog.value = true
		}
	}
}

const onDateClick = (date: Date) => {
	storageUtils.saveDate(date)
	selectedDateForEvent.value = date
	showAddEventDialog.value = true
}

const openAddEventDialog = () => {
	selectedDateForEvent.value = null
	showAddEventDialog.value = true
}

const onEventCreated = () => {
	loadEventsForOrganization(selectedOrganizationId.value)
}

const onEventUpdated = () => {
	loadEventsForOrganization(selectedOrganizationId.value)
}

const onEventDeleted = () => {
	loadEventsForOrganization(selectedOrganizationId.value)
}

// Watch for organization changes and auto-load
watch(leaderOrganizations, (orgs) => {
	if (!orgs || orgs.length === 0) {
		selectedOrganizationId.value = null
		events.value = []
		return
	}

	if (!selectedOrganizationId.value) {
		selectedOrganizationId.value = orgs[0].id
	}

	loadEventsForOrganization(selectedOrganizationId.value)
}, { immediate: true })

watch(selectedOrganizationId, (orgId) => {
	loadEventsForOrganization(orgId)
})

// Load organizations on mount
onMounted(async () => {
	await fetchOrganizations()
})
</script>

<template>
	<InnerLayoutWrapper>
		<template #content>
			<v-container fluid class="pa-0">
				<div v-if="leaderOrganizations.length === 0" class="text-center pa-6 pa-sm-8">
					<v-icon color="grey" :size="$vuetify.display.xs ? '48' : '64'" class="mb-3 mb-sm-4">
						mdi-domain-off
					</v-icon>
					<h3 class="text-body-1 text-sm-h6 text-grey-darken-1 mb-2">No Organization Assigned</h3>
					<p class="text-caption text-sm-body-2 text-grey mb-3 mb-sm-4">
						You are not currently assigned as a leader of any organization.
					</p>
				</div>

				<div v-else class="calendar-shell">
				<v-card class="calendar-container" elevation="2" rounded="lg">
					<!-- Calendar Header -->
					<v-card-title class="d-flex flex-column flex-sm-row align-start align-sm-center justify-space-between pa-4 pa-sm-6 bg-primary text-white">
						<div class="d-flex align-center mb-3 mb-sm-0">
							<v-icon :size="$vuetify.display.xs ? '24' : '32'" class="me-2 me-sm-3">mdi-calendar-blank</v-icon>
							<div>
								<h2 class="text-h6 text-sm-h5 font-weight-bold mb-1">Organization Events</h2>
								<p class="text-caption text-sm-body-2 mb-0 opacity-90 d-none d-sm-block">Manage events for your organization</p>
								<p class="text-caption mb-0 opacity-90 d-block d-sm-none">Manage events</p>
							</div>
						</div>
						<div class="d-flex flex-column align-end ga-2 align-self-stretch align-self-sm-center w-100 w-sm-auto">
							<v-select
								v-if="leaderOrganizations.length > 1"
								v-model="selectedOrganizationId"
								:items="leaderOrganizations"
								item-title="title"
								item-value="id"
								label="Organization"
								variant="outlined"
								density="compact"
								hide-details
								class="org-select"
							/>
							<div class="d-flex align-center ga-1 ga-sm-2">
								<v-btn
									color="white"
									variant="outlined"
									:size="$vuetify.display.xs ? 'small' : 'default'"
									@click="openAddEventDialog"
									:disabled="!selectedOrganizationId"
									prepend-icon="mdi-calendar-plus"
									class="me-1 me-sm-2"
								>
									<span class="d-none d-sm-inline">Add Event</span>
									<span class="d-inline d-sm-none">Add</span>
								</v-btn>
								<v-btn
									color="white"
									variant="elevated"
									:size="$vuetify.display.xs ? 'small' : 'default'"
									@click="loadEventsForOrganization(selectedOrganizationId)"
									:loading="loading"
									prepend-icon="mdi-refresh"
								>
									<span class="d-none d-sm-inline">Refresh</span>
									<span class="d-inline d-sm-none">Refresh</span>
								</v-btn>
							</div>
						</div>
					</v-card-title>

					<v-divider />

					<!-- Calendar Controls -->
					<v-card-text class="pa-4 pa-sm-6 pb-0">
						<div class="d-flex flex-column flex-sm-row align-center justify-space-between gap-3 gap-sm-4 mb-4 mb-sm-6">
							<!-- Navigation Controls -->
							<div class="d-flex align-center gap-1 gap-sm-2">
								<v-btn
									icon="mdi-chevron-left"
									variant="outlined"
									:size="$vuetify.display.xs ? 'x-small' : 'small'"
									@click="goToPreviousPeriod"
								/>

								<v-btn
									color="primary"
									variant="elevated"
									:size="$vuetify.display.xs ? 'small' : 'default'"
									class="mx-1 mx-sm-2"
									@click="goToToday"
								>
									Today
								</v-btn>

								<v-btn
									icon="mdi-chevron-right"
									variant="outlined"
									:size="$vuetify.display.xs ? 'x-small' : 'small'"
									@click="goToNextPeriod"
								/>

								<div class="ms-2 ms-sm-4">
									<h3 class="text-body-1 text-sm-h6 font-weight-medium">{{ displayPeriodLabel }}</h3>
									<div class="text-caption text-medium-emphasis" v-if="selectedOrganization">
										{{ selectedOrganization.title || 'Organization' }}
									</div>
								</div>
							</div>

							<!-- View Toggle -->
							<div class="d-flex align-center gap-1 gap-sm-2">
								<v-btn-toggle
									v-model="currentView"
									color="primary"
									variant="outlined"
									divided
									mandatory
								>
									<v-btn
										v-for="view in calendarViews"
										:key="view.value"
										:value="view.value"
										:size="$vuetify.display.xs ? 'x-small' : 'small'"
										@click="changeView(view.value)"
									>
										<v-icon :icon="view.icon" :class="$vuetify.display.xs ? '' : 'me-1'"></v-icon>
										<span class="d-none d-sm-inline">{{ view.title }}</span>
									</v-btn>
								</v-btn-toggle>
							</div>
						</div>
					</v-card-text>

					<!-- Loading State -->
					<div v-if="loading" class="d-flex justify-center align-center pa-6 pa-sm-8">
						<v-progress-circular indeterminate color="primary" :size="$vuetify.display.xs ? '36' : '48'" />
						<span class="ms-3 ms-sm-4 text-body-2 text-sm-subtitle-1">Loading organization events...</span>
					</div>

					<!-- Calendar View -->
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
							@click-item="onEventClick"
							@click-date="onDateClick"
						/>
					</div>

					<!-- Empty State -->
					<div v-if="!loading && calendarEvents.length === 0" class="text-center pa-6 pa-sm-8">
						<v-icon color="grey-lighten-1" :size="$vuetify.display.xs ? '48' : '64'" class="mb-3 mb-sm-4">
							mdi-calendar-blank
						</v-icon>
						<h3 class="text-body-1 text-sm-h6 text-grey-darken-1 mb-2">No Events Scheduled</h3>
						<p class="text-caption text-sm-body-2 text-grey mb-3 mb-sm-4">
							No events are currently scheduled for this organization.
						</p>
						<v-btn
							color="primary"
							variant="elevated"
							:size="$vuetify.display.xs ? 'small' : 'default'"
							@click="openAddEventDialog"
							:disabled="!selectedOrganizationId"
						>
							Add Event
						</v-btn>
					</div>

					<!-- Events Summary -->
					<v-card-text v-if="!loading && calendarEvents.length > 0" class="pt-0 pa-4 pa-sm-6">
						<v-row class="events-summary">
							<v-col cols="12">
								<div class="d-flex flex-wrap ga-2 ga-sm-3 align-center">
									<v-chip
										v-if="eventsCounts.total > 0"
										color="primary"
										variant="elevated"
										:size="$vuetify.display.xs ? 'small' : 'default'"
										prepend-icon="mdi-calendar-check"
									>
										<span class="d-none d-sm-inline">Total: {{ eventsCounts.total }}</span>
										<span class="d-inline d-sm-none">{{ eventsCounts.total }}</span>
									</v-chip>

									<v-chip
										v-if="lcoEventsCounts.lco > 0"
										color="primary"
										variant="tonal"
										:size="$vuetify.display.xs ? 'small' : 'default'"
										prepend-icon="mdi-account-tie"
									>
										<span class="d-none d-sm-inline">LCO: {{ lcoEventsCounts.lco }}</span>
										<span class="d-inline d-sm-none">LCO {{ lcoEventsCounts.lco }}</span>
									</v-chip>

									<v-chip
										v-if="lcoEventsCounts.regular > 0"
										color="secondary"
										variant="tonal"
										:size="$vuetify.display.xs ? 'small' : 'default'"
										prepend-icon="mdi-calendar"
									>
										<span class="d-none d-sm-inline">Regular: {{ lcoEventsCounts.regular }}</span>
										<span class="d-inline d-sm-none">REG {{ lcoEventsCounts.regular }}</span>
									</v-chip>

									<v-chip
										v-if="eventsCounts.today > 0"
										color="warning"
										variant="elevated"
										:size="$vuetify.display.xs ? 'small' : 'default'"
										prepend-icon="mdi-calendar-today"
									>
										<span class="d-none d-sm-inline">Today: {{ eventsCounts.today }}</span>
										<span class="d-inline d-sm-none">{{ eventsCounts.today }}</span>
									</v-chip>

									<v-chip
										v-if="eventsCounts.upcoming > 0"
										color="accent"
										variant="elevated"
										:size="$vuetify.display.xs ? 'small' : 'default'"
										prepend-icon="mdi-calendar-clock"
									>
										<span class="d-none d-sm-inline">Upcoming: {{ eventsCounts.upcoming }}</span>
										<span class="d-inline d-sm-none">{{ eventsCounts.upcoming }}</span>
									</v-chip>

									<v-chip
										v-if="eventsCounts.past > 0"
										color="surface-variant"
										variant="outlined"
										:size="$vuetify.display.xs ? 'small' : 'default'"
										prepend-icon="mdi-calendar-check-outline"
									>
										<span class="d-none d-sm-inline">Past: {{ eventsCounts.past }}</span>
										<span class="d-inline d-sm-none">{{ eventsCounts.past }}</span>
									</v-chip>
								</div>
							</v-col>
						</v-row>
					</v-card-text>

					<!-- Add Event Dialog (Org-scoped) -->
					<PerOrgEventDialog
						v-model="showAddEventDialog"
						:selected-date="selectedDateForEvent"
						:organization-id="selectedOrganizationId"
						@event-created="onEventCreated"
					/>

					<!-- View Event Dialog (Org leader scoped) -->
					<PerOrgViewEventDialog
						v-model:is-open="showViewEventDialog"
						:event="selectedEvent"
						:organization-id="selectedOrganizationId"
						@event-updated="onEventUpdated"
						@event-deleted="onEventDeleted"
					/>
				</v-card>
				</div>
			</v-container>
		</template>
	</InnerLayoutWrapper>
</template>

<style scoped>
.org-select :deep(.v-field) {
	min-width: 240px;
}

.calendar-shell {
	max-width: 1200px;
	margin: 16px auto 0;
	padding: 12px 16px 24px;
}

.calendar-container {
	margin-top: 12px;
}

.calendar-wrapper {
	padding-top: 8px;
}
</style>
