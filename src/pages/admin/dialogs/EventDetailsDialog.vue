<script setup lang="ts">
import { computed, watch } from 'vue';
import { formatDateShort } from '@/utils/helpers';
import { useOrganizationDataStore } from '@/stores/organizationData';
import type { Event } from '@/stores/studentsData';

type CalendarEvent = (Event & {
	isRegistered?: boolean;
	organization_id?: string | number | null;
	description?: string | null;
	location?: string | null;
	is_lco?: boolean;
}) | null;

const props = defineProps<{
	modelValue: boolean;
	event: CalendarEvent;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: boolean];
}>();

const orgStore = useOrganizationDataStore();

const dialog = computed({
	get: () => props.modelValue,
	set: value => emit('update:modelValue', value)
});

const isPastEvent = computed(() => {
	if (!props.event?.date) return false;
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const eventDate = new Date(props.event.date);
	eventDate.setHours(0, 0, 0, 0);
	return eventDate < today;
});

const statusLabel = computed(() => {
	if (!props.event) return 'Upcoming';
	if (isPastEvent.value) return 'Past';
	return props.event.isRegistered ? 'Registered' : 'Upcoming';
});

const statusColor = computed(() => {
	const label = statusLabel.value.toLowerCase();
	if (label === 'past') return 'black';
	if (label === 'registered') return '#fb8c00';
	return 'accent';
});

const organizationName = computed(() => {
	if (!props.event?.organization_id) return 'Not specified';
	const orgId = String(props.event.organization_id);
	const found = orgStore.organizations.find(o => String(o.id) === orgId);
	return found?.title || 'Loading...';
});

const eventTypeMeta = computed(() => {
	const ev = props.event;
	if (ev?.is_lco) {
		return {
			label: 'LCO Event',
			description: 'Official LCO event (all students)',
			color: 'primary',
			icon: 'mdi-account-tie'
		};
	}

	if (ev?.organization_id !== null && ev?.organization_id !== undefined) {
		return {
			label: 'Organization Event',
			description: 'Scoped to a specific organization',
			color: 'secondary',
			icon: 'mdi-account-group'
		};
	}

	return {
		label: 'Org Leaders Event',
		description: 'For organization leaders only',
		color: 'secondary',
		icon: 'mdi-account-group'
	};
});

const organizationLabel = computed(() => {
	const ev = props.event;
	if (!ev) return 'N/A';
	if (ev.organization_id !== null && ev.organization_id !== undefined) return organizationName.value;
	return ev.is_lco ? 'All Students (LCO Event)' : 'All Organization Leaders';
});

watch(
	() => props.event?.organization_id,
	async orgId => {
		if (orgId && orgStore.organizations.length === 0 && !orgStore.loading) {
			try {
				await orgStore.fetchOrganizations();
			} catch (err) {
				console.warn('Unable to fetch organizations for event dialog', err);
			}
		}
	},
	{ immediate: true }
);

const closeDialog = () => {
	emit('update:modelValue', false);
};
</script>

<template>
	<v-dialog v-model="dialog" max-width="560">
		<v-card rounded="xl" elevation="4">
			<v-card-title class="d-flex align-center justify-space-between py-3 px-4">
				<div class="d-flex align-center ga-2">
					<v-avatar color="primary" variant="tonal" size="36">
						<v-icon size="20">mdi-calendar-star</v-icon>
					</v-avatar>
					<div>
						<div class="font-weight-bold">Event Details</div>
						<div class="text-caption text-medium-emphasis">Registered & upcoming events</div>
					</div>
				</div>
				<v-btn icon variant="text" size="small" @click="closeDialog">
					<v-icon>mdi-close</v-icon>
				</v-btn>
			</v-card-title>

			<v-divider></v-divider>

			<v-card-text v-if="props.event" class="pa-4">
				<v-sheet color="surface-variant" variant="tonal" rounded="lg" class="pa-3 mb-4">
					<div class="d-flex align-center justify-space-between ga-3 flex-wrap">
						<div class="d-flex align-center ga-2">
							<v-icon color="primary">mdi-calendar</v-icon>
							<div class="text-body-2 text-medium-emphasis">{{ formatDateShort(props.event.date) }}</div>
						</div>
						<v-chip :color="statusColor" variant="elevated" size="small" class="text-uppercase">
							{{ statusLabel }}
						</v-chip>
					</div>
				</v-sheet>

				<v-sheet color="surface" variant="outlined" rounded="lg" class="pa-3 mb-4">
					<div class="d-flex flex-wrap ga-3 align-center justify-space-between">
						<div class="d-flex align-center ga-2">
							<v-avatar size="32" color="primary" variant="tonal">
								<v-icon size="18">{{ eventTypeMeta.icon }}</v-icon>
							</v-avatar>
							<div>
								<div class="text-body-2 font-weight-medium">{{ eventTypeMeta.label }}</div>
								<div class="text-caption text-medium-emphasis">{{ eventTypeMeta.description }}</div>
							</div>
						</div>
						<v-chip :color="eventTypeMeta.color" variant="elevated" size="small" prepend-icon="mdi-domain">
							{{ organizationLabel }}
						</v-chip>
					</div>
				</v-sheet>

				<div class="mb-4">
					<div class="text-caption text-medium-emphasis text-center">Event</div>
					<div class="text-body-1 text-sm-h6 font-weight-bold text-center">{{ props.event.title }}</div>
				</div>
				<div class="text-caption text-medium-emphasis text-center">Organization</div>
				<div class="mb-3 d-flex flex-wrap ga-2 text-center justify-center">
					<v-chip v-if="props.event.organization_id" color="primary" variant="tonal" size="small" prepend-icon="mdi-office-building">
						{{ organizationName }}
					</v-chip>
					<v-chip v-else :color="eventTypeMeta.color" variant="elevated" size="small" :prepend-icon="eventTypeMeta.icon">
						{{ organizationLabel }}
					</v-chip>
					<v-chip v-if="props.event.location" color="secondary" variant="tonal" size="small" prepend-icon="mdi-map-marker">
						{{ props.event.location }}
					</v-chip>
				</div>

				<div v-if="props.event.description" class="mb-2">
					<div class="text-caption text-medium-emphasis">Description</div>
					<div class="text-body-2 text-medium-emphasis">{{ props.event.description }}</div>
				</div>
			</v-card-text>

			<v-card-actions class="justify-end pa-3">
				<v-btn variant="text" color="primary" @click="closeDialog">Close</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>
