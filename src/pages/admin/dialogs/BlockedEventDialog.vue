<script setup lang="ts">
import { computed } from 'vue';
import { formatDateShort } from '@/utils/helpers';

type BlockedEvent = { name: string; date: string; status: string } | null;

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
