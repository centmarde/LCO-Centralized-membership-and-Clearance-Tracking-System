<template>
  <v-fade-transition>
    <v-alert
      v-if="showWarning"
      type="warning"
      variant="tonal"
      density="compact"
      class="mb-4"
      :class="alertClass"
    >
      <template #prepend>
        <v-icon>mdi-alert-circle-outline</v-icon>
      </template>

      <div class="d-flex flex-column">
        <span class="text-body-2 font-weight-medium">
          LCO Event Notice
        </span>
        <span class="text-caption">
          {{ warningMessage }}
        </span>
      </div>

      <template v-if="showDismiss" #append>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          @click="$emit('dismiss')"
        />
      </template>
    </v-alert>
  </v-fade-transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// Component name for ESLint multi-word rule
defineOptions({
  name: 'LcoEventWarning'
})

// Props
interface Props {
  isLcoEvent: boolean
  organizationHidden?: boolean
  showDismiss?: boolean
  customMessage?: string
  alertClass?: string | string[]
}

const props = withDefaults(defineProps<Props>(), {
  organizationHidden: false,
  showDismiss: false,
  customMessage: '',
  alertClass: ''
})

// Emits
const emit = defineEmits<{
  dismiss: []
}>()

// Computed properties
const showWarning = computed(() => {
  return props.isLcoEvent && props.organizationHidden
})

const warningMessage = computed(() => {
  if (props.customMessage) {
    return props.customMessage
  }

  return 'When LCO Event is enabled, this event may be sent to all users in the system. This overrides organization-specific targeting.'
})
</script>

<style scoped>
/* Add any component-specific styles here if needed */
</style>
