<template>
	<v-dialog v-model="localDialog" max-width="520px">
		<v-card>
			<v-card-title class="text-h6 d-flex align-center">
				<v-icon color="error" class="me-2">mdi-delete-clock</v-icon>
				Deleted Organization
			</v-card-title>

			<v-card-text>
				<v-alert type="warning" variant="tonal" border="start" class="mb-3">
					This organization was soft-deleted. Members were removed and the leader was demoted to student. You can recover it or permanently delete it.
				</v-alert>

				<div v-if="organization" class="bg-grey-lighten-4 rounded pa-3">
					<div class="text-subtitle-1 font-weight-medium">{{ organization.title }}</div>
					<div class="text-body-2 text-medium-emphasis mt-1">ID: {{ organization.id }}</div>
					<div v-if="organization.deleted_at" class="text-body-2 text-medium-emphasis mt-1">
						Deleted: {{ formatDate(organization.deleted_at) }}
					</div>
				</div>
			</v-card-text>

			<v-card-actions class="justify-space-between flex-wrap">
				<v-btn color="grey" variant="text" @click="handleClose">
					Close
				</v-btn>
				<div class="d-flex align-center gap-2">
					<v-btn color="primary" variant="tonal" @click="emitRecover" :loading="loading" :disabled="loading">
						Recover Organization
					</v-btn>
					<v-btn color="error" variant="flat" @click="emitPurge" :loading="loading" :disabled="loading">
						Permanently Delete
					</v-btn>
				</div>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatDate } from '@/utils/helpers'
import type { Organization } from '../composables/useOrganizations'

interface Props {
	dialog: boolean
	organization: Organization | null
	loading?: boolean
}

const props = defineProps<Props>()

interface Emits {
	(e: 'update:dialog', value: boolean): void
	(e: 'recover'): void
	(e: 'purge'): void
	(e: 'close'): void
}

const emit = defineEmits<Emits>()

const localDialog = computed({
	get: () => props.dialog,
	set: (value) => emit('update:dialog', value)
})

const emitRecover = () => emit('recover')
const emitPurge = () => emit('purge')
const handleClose = () => emit('close')
</script>
