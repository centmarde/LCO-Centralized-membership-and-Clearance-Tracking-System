<script setup lang="ts">
import { computed } from 'vue';
import { formatDateShort } from '@/utils/helpers';

type BlockedEvent = {
	name: string;
	date: string;
	status: string;
	organization_id?: string | number | null;
	organization_name?: string | null;
	organization_title?: string | null;
	organization?: string | null;
	is_lco?: boolean;
} | null;

const props = defineProps<{
	modelValue: boolean;
	event: BlockedEvent;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: boolean];
	close: [];
}>();

const dialog = computed({
	get: () => props.modelValue,
	set: value => emit('update:modelValue', value)
});

const getEventStatusColor = (status: string) => {
	const normalized = status.toLowerCase();
	if (normalized.includes('block')) return 'error';
	if (normalized.includes('pending')) return 'warning';
	if (normalized.includes('clear') || normalized.includes('approved')) return 'success';
	return 'primary';
};

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

	const isOrgEvent = (ev?.organization_id !== null && ev?.organization_id !== undefined)
		|| (!!ev?.organization_name && ev.organization_name.trim() !== '')
		|| (!!ev?.organization_title && ev.organization_title.trim() !== '')
		|| (!!ev?.organization && ev.organization.trim() !== '');

	if (isOrgEvent) {
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
	if (ev.organization_title) return ev.organization_title;
	if (ev.organization_name) return ev.organization_name;
	if (ev.organization) return ev.organization;
	if (ev.organization_id !== null && ev.organization_id !== undefined) return `Organization #${ev.organization_id}`;
	return ev.is_lco ? 'All Students (LCO Event)' : 'All Organization Leaders';
});

const closeDialog = () => {
	emit('update:modelValue', false);
	emit('close');
};
</script>

<template>
	<v-dialog v-model="dialog" max-width="560">
		<v-card rounded="xl" elevation="4">
			<v-card-title class="d-flex align-center justify-space-between py-3 px-4">
				<div class="d-flex align-center ga-2">
					<v-avatar color="primary" variant="tonal" size="36">
						<v-icon size="20">mdi-calendar-alert</v-icon>
					</v-avatar>
					<div>
						<div class="font-weight-bold">Event Details</div>
						<div class="text-caption text-medium-emphasis">Blocked event information</div>
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
						<v-chip :color="getEventStatusColor(props.event.status)" variant="elevated" size="small" class="text-uppercase font-weight-bold">
							{{ props.event.status }}
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

				<div class="mb-4 text-center">
					<div class="text-caption text-medium-emphasis">Event</div>
					<div class="text-body-1 text-sm-h6 font-weight-bold">{{ props.event.name }}</div>
				</div>

				<div class="mb-2">
					<div class="text-caption text-medium-emphasis text-center">Status details</div>
					<v-alert type="warning" variant="tonal" density="comfortable" class="mb-3" border="start">
						<div class="font-weight-bold">Required event • Auto-blocked</div>
						<div class="text-body-2">Attendance is mandatory. You are blocked by default until your presence is processed.</div>
					</v-alert>
					<v-alert type="info" variant="tonal" density="comfortable" class="mb-2" border="start">
						<div class="font-weight-bold">One-week window after event</div>
						<div class="text-body-2">
							After the event date, you have <strong>7 days</strong> to settle attendance/clearance with your organization or clearance officer.
						</div>
					</v-alert>
					
				</div>
			</v-card-text>

			<v-card-actions class="justify-end pa-3">
				<v-btn variant="text" color="primary" @click="closeDialog">Close</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>
