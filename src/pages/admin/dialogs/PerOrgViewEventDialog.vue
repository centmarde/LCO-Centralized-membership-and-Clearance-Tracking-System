<script setup lang="ts">
import { computed, watch } from 'vue'
import { useViewCalendarDialog } from '@/pages/admin/composables/calendarDialog'
import type { EventWithLCO } from '@/stores/eventsData'

interface Props {
	isOpen: boolean
	event: EventWithLCO | null
	organizationId: string | number | null
}

interface Emits {
	(e: 'update:isOpen', value: boolean): void
	(e: 'eventUpdated', event: EventWithLCO): void
	(e: 'eventDeleted', eventId: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const {
	isEditMode,
	loading,
	deleteLoading,
	showDeleteConfirm,
	formData,
	formRef,
	isValid,
	minDate,
	initializeForm,
	toggleEditMode,
	handleUpdate,
	confirmDelete,
	cancelDelete,
	handleDelete,
	resetStates,
	getFormattedDate,
	getFormattedCreatedAt,
	getEventStatusColor,
	getEventStatusText,
	getIsEventInPast,
	validationRules
} = useViewCalendarDialog()

const currentEvent = computed(() => props.event)

const formattedDate = computed(() => getFormattedDate(currentEvent.value).value)
const formattedCreatedAt = computed(() => getFormattedCreatedAt(currentEvent.value).value)
const eventStatusColor = computed(() => getEventStatusColor(currentEvent.value).value)
const eventStatusText = computed(() => getEventStatusText(currentEvent.value).value)
const isEventInPast = computed(() => getIsEventInPast(currentEvent.value).value)

const eventTypeMeta = computed(() => {
	if (currentEvent.value?.is_lco) {
		return {
			label: 'LCO Event',
			description: 'Official LCO event',
			icon: 'mdi-account-tie',
			color: 'primary'
		}
	}

	if (currentEvent.value?.organization_id) {
		return {
			label: 'Organization Event',
			description: 'Visible to members of this organization',
			icon: 'mdi-account-group',
			color: 'secondary'
		}
	}

	return {
		label: 'Org Leaders Event',
		description: 'Targets all organization leaders in the system',
		icon: 'mdi-account-group',
		color: 'secondary'
	}
})

const internalDialog = computed({
	get: () => props.isOpen,
	set: (value: boolean) => emit('update:isOpen', value)
})

const canModify = computed(() => {
	if (!currentEvent.value) return false
	if (currentEvent.value.organization_id === null || currentEvent.value.organization_id === undefined) return false
	if (props.organizationId === null || props.organizationId === undefined) return false
	const eventOrgId = Number(currentEvent.value.organization_id)
	const activeOrgId = Number(props.organizationId)
	if (Number.isNaN(eventOrgId) || Number.isNaN(activeOrgId)) return false
	return eventOrgId === activeOrgId
})

watch(() => props.isOpen, (newValue) => {
	if (newValue && props.event) {
		initializeForm(props.event)
	} else if (!newValue) {
		resetStates()
	}
})

watch(() => props.event, (newEvent) => {
	if (newEvent && props.isOpen) {
		initializeForm(newEvent)
	}
}, { deep: true })

const closeDialog = () => {
	internalDialog.value = false
}

const handleEditToggle = () => {
	if (!canModify.value) return
	toggleEditMode(props.event)
}

const handleUpdateSubmit = async () => {
	if (!canModify.value) return
	try {
		const updatedEvent = await handleUpdate()
		if (updatedEvent) {
			emit('eventUpdated', updatedEvent)
			closeDialog()
		}
	} catch (error) {
		console.error('Error updating event:', error)
	}
}

const handleDeleteConfirm = () => {
	if (!canModify.value) return
	confirmDelete()
}

const handleDeleteCancel = () => {
	cancelDelete()
}

const handleDeleteSubmit = async () => {
	if (!canModify.value || !props.event) return

	try {
		const success = await handleDelete(props.event.id)
		if (success) {
			emit('eventDeleted', props.event.id)
			closeDialog()
		}
	} catch (error) {
		console.error('Error deleting event:', error)
	}
}
</script>

<template>
	<v-dialog
		v-model="internalDialog"
		max-width="600px"
		persistent
	>
		<v-card>
			<v-card-title class="d-flex justify-space-between align-center pa-4">
				<span class="text-h5">
					{{ isEditMode ? 'Edit Event' : 'Event Details' }}
				</span>
				<v-btn
					icon="mdi-close"
					variant="text"
					size="small"
					@click="closeDialog"
				/>
			</v-card-title>

			<v-divider />

			<v-card-text class="pa-4">
				<div class="mb-4">
					<v-chip
						:color="eventStatusColor"
						variant="flat"
						size="small"
						class="text-white"
					>
						<v-icon
							start
							:icon="isEventInPast ? 'mdi-clock-alert' : 'mdi-calendar-check'"
						/>
						{{ eventStatusText }}
					</v-chip>
				</div>

				<div v-if="!isEditMode" class="space-y-4">
					<div>
						<v-label class="text-subtitle-2 text-medium-emphasis mb-1">
							Event Title
						</v-label>
						<div class="text-h6">
							{{ currentEvent?.title || 'No title' }}
						</div>
					</div>

					<div>
						<v-label class="text-subtitle-2 text-medium-emphasis mb-1">
							Event Date
						</v-label>
						<div class="text-body-1">
							{{ formattedDate }}
						</div>
					</div>

					<div>
						<v-label class="text-subtitle-2 text-medium-emphasis mb-1">
							Event Type
						</v-label>
						<div class="d-flex align-center">
							<v-chip
								:color="eventTypeMeta.color"
								variant="tonal"
								size="small"
								class="me-2"
							>
								<v-icon
									start
									:icon="eventTypeMeta.icon"
								/>
								{{ eventTypeMeta.label }}
							</v-chip>
							<span class="text-caption text-medium-emphasis">
								{{ eventTypeMeta.description }}
							</span>
						</div>
					</div>

					<div>
						<v-label class="text-subtitle-2 text-medium-emphasis mb-1">
							Created
						</v-label>
						<div class="text-body-2 text-medium-emphasis">
							{{ formattedCreatedAt }}
						</div>
					</div>
				</div>

				<v-form
					v-else
					ref="formRef"
					v-model="isValid"
					@submit.prevent="handleUpdateSubmit"
				>
					<v-text-field
						v-model="formData.title"
						label="Event Title"
						:rules="validationRules.title"
						variant="outlined"
						density="comfortable"
						class="mb-4"
						autofocus
					/>

					<v-text-field
						v-model="formData.date"
						label="Event Date"
						type="date"
						:rules="validationRules.date"
						:min="minDate"
						variant="outlined"
						density="comfortable"
						class="mb-4"
					/>
				</v-form>

				<v-alert
					v-if="showDeleteConfirm"
					type="warning"
					variant="tonal"
					class="mt-4"
				>
					<div class="text-body-2 mb-3">
						Are you sure you want to delete this event? This action cannot be undone.
					</div>
					<div class="d-flex gap-2">
						<v-btn
							color="error"
							variant="flat"
							size="small"
							:loading="deleteLoading"
							@click="handleDeleteSubmit"
						>
							Delete Event
						</v-btn>
						<v-btn
							variant="outlined"
							size="small"
							@click="handleDeleteCancel"
						>
							Cancel
						</v-btn>
					</div>
				</v-alert>
			</v-card-text>

			<v-divider />

			<v-card-actions class="pa-4">
				<v-spacer />

				<template v-if="canModify && !isEditMode && !showDeleteConfirm">
					<v-btn
						color="error"
						variant="outlined"
						prepend-icon="mdi-delete"
						@click="handleDeleteConfirm"
					>
						Delete
					</v-btn>
					<v-btn
						color="primary"
						variant="flat"
						prepend-icon="mdi-pencil"
						@click="handleEditToggle"
					>
						Edit
					</v-btn>
				</template>

				<template v-if="canModify && isEditMode && !showDeleteConfirm">
					<v-btn
						variant="outlined"
						@click="handleEditToggle"
					>
						Cancel
					</v-btn>
					<v-btn
						color="primary"
						variant="flat"
						prepend-icon="mdi-content-save"
						:loading="loading"
						:disabled="!isValid"
						@click="handleUpdateSubmit"
					>
						Save Changes
					</v-btn>
				</template>

				<template v-if="showDeleteConfirm">
					<v-btn
						variant="outlined"
						@click="closeDialog"
					>
						Close
					</v-btn>
				</template>

				<template v-if="!canModify && !showDeleteConfirm">
					<v-btn
						variant="outlined"
						@click="closeDialog"
					>
						Close
					</v-btn>
				</template>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<style scoped>
.space-y-4 > * + * {
	margin-top: 1rem;
}
</style>
