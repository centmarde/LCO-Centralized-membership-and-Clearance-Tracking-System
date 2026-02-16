<script setup lang="ts">
import { computed, watch } from 'vue'
import { useAddCalendarDialog } from '@/pages/admin/composables/calendarDialog'

defineOptions({
	name: 'PerOrgEventDialog'
})

interface Props {
	modelValue: boolean
	selectedDate?: Date | null
	organizationId?: string | number | null
}

const props = withDefaults(defineProps<Props>(), {
	selectedDate: null,
	organizationId: null
})

const emit = defineEmits<{
	'update:modelValue': [value: boolean]
	'event-created': [event: any]
}>()

const {
	formData,
	formRef,
	isValid,
	loading,
	minDate,
	initializeForm,
	handleSubmit,
	validationRules,
	formatters,
	selectedOrganizationId
} = useAddCalendarDialog()

const dialog = computed({
	get: () => props.modelValue,
	set: (value: boolean) => emit('update:modelValue', value)
})

const formattedSelectedDate = computed(() => formatters.selectedDate(props.selectedDate))
const missingOrganization = computed(() => props.organizationId === null || props.organizationId === undefined)

watch(() => props.selectedDate, (newDate) => {
	if (newDate && !formData.value.date) {
		formData.value.date = formattedSelectedDate.value
	}
}, { immediate: true })

watch(dialog, (isOpen) => {
	if (isOpen) {
		initializeForm(props.selectedDate)
		formData.value.is_lco = false
		selectedOrganizationId.value = props.organizationId ?? null
	}
})

watch(() => props.organizationId, (orgId) => {
	if (dialog.value) {
		selectedOrganizationId.value = orgId ?? null
	}
})

const closeDialog = () => {
	dialog.value = false
}

const handleFormSubmit = async () => {
	if (missingOrganization.value) return

	try {
		// Ensure the organization context is locked before submit
		selectedOrganizationId.value = props.organizationId ?? null
		formData.value.is_lco = false

		const newEvent = await handleSubmit()
		if (newEvent) {
			emit('event-created', newEvent)
			closeDialog()
		}
	} catch (error) {
		// Error already handled inside composable
	}
}

const handleCancel = () => {
	closeDialog()
}
</script>

<template>
	<v-dialog
		v-model="dialog"
		max-width="600"
		persistent
		scrollable
	>
		<v-card class="add-event-dialog" elevation="8" rounded="lg">
			<v-card-title class="d-flex align-center justify-space-between pa-6 bg-primary text-white">
				<div class="d-flex align-center">
					<v-icon size="28" class="me-3">mdi-calendar-plus</v-icon>
					<div>
						<h2 class="text-h5 font-weight-bold mb-1">Add New Event</h2>
						<p class="text-body-2 mb-0 opacity-90">Create an event for your organization</p>
					</div>
				</div>
				<v-btn
					icon="mdi-close"
					variant="text"
					color="white"
					size="small"
					@click="handleCancel"
					:disabled="loading"
				/>
			</v-card-title>

			<v-divider />

			<v-card-text class="pa-6">
				<v-form
					ref="formRef"
					v-model="isValid"
					@submit.prevent="handleFormSubmit"
				>
					<v-container fluid class="pa-0">
						<v-row>
							<v-col cols="12">
								<v-text-field
									v-model="formData.title"
									label="Event Title"
									placeholder="Enter event title"
									variant="outlined"
									:rules="validationRules.title"
									:disabled="loading"
									prepend-inner-icon="mdi-calendar-text"
									class="mb-2"
									hint="Enter a descriptive title for your event"
									persistent-hint
								/>
							</v-col>

							<v-col cols="12">
								<v-text-field
									v-model="formData.date"
									label="Event Date"
									type="date"
									variant="outlined"
									:rules="validationRules.date"
									:disabled="loading"
									:min="minDate"
									prepend-inner-icon="mdi-calendar-clock"
									class="mb-2"
									hint="Select the date when the event will take place"
									persistent-hint
								/>
							</v-col>

							<v-col cols="12">
								<v-alert
									type="info"
									variant="tonal"
									density="comfortable"
									class="mb-2"
								>
									<template #prepend>
										<v-icon>mdi-account-group</v-icon>
									</template>
									<div class="d-flex flex-column">
										<span class="text-body-2 font-weight-medium">Organizational Event</span>
										<span class="text-caption text-medium-emphasis">
											This event is locked to your organization and will also block its members for the selected date.
										</span>
									</div>
								</v-alert>
							</v-col>

							<v-col v-if="selectedDate" cols="12">
								<v-alert
									type="info"
									variant="tonal"
									density="compact"
									class="mb-2"
								>
									<template #prepend>
										<v-icon>mdi-information</v-icon>
									</template>
									<span class="text-body-2">
										Creating event for selected date: {{ formattedSelectedDate }}
									</span>
								</v-alert>
							</v-col>

							<v-col v-if="missingOrganization" cols="12">
								<v-alert
									type="warning"
									variant="tonal"
									density="compact"
									class="mb-2"
								>
									<template #prepend>
										<v-icon>mdi-alert</v-icon>
									</template>
									<span class="text-body-2">Select an organization before creating an event.</span>
								</v-alert>
							</v-col>
						</v-row>
					</v-container>
				</v-form>
			</v-card-text>

			<v-divider />

			<v-card-actions class="pa-6 pt-4">
				<v-spacer />

				<v-btn
					variant="outlined"
					color="grey"
					@click="handleCancel"
					:disabled="loading"
					class="me-3"
				>
					Cancel
				</v-btn>

				<v-btn
					color="primary"
					variant="elevated"
					@click="handleFormSubmit"
					:loading="loading"
					:disabled="!isValid || loading || missingOrganization"
					prepend-icon="mdi-calendar-plus"
				>
					Create Event
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<style scoped>
.add-event-dialog :deep(.v-card-title) {
	border-radius: 8px 8px 0 0;
}

.add-event-dialog :deep(.v-form) {
	width: 100%;
}

.add-event-dialog :deep(.v-text-field) {
	margin-bottom: 8px;
}

.add-event-dialog :deep(.v-btn--loading) {
	pointer-events: none;
}
</style>
