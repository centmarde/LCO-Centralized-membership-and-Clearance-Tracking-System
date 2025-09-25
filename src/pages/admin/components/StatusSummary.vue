<script setup lang="ts">
import { computed } from 'vue'

interface User {
  id: string
  status?: string
  role_id?: number
}

interface Props {
  users: User[]
}

const props = defineProps<Props>()

// Computed properties for status counts
const clearedCount = computed(() =>
  props.users.filter(user => user.status?.toLowerCase() === 'cleared').length
)

const blockedCount = computed(() =>
  props.users.filter(user => user.status?.toLowerCase() === 'blocked').length
)

const totalCount = computed(() => props.users.length)
</script>

<template>
  <!-- Status Summary -->
  <v-card-subtitle>
    <v-row class="ma-0">
      <v-col cols="auto" class="pa-1">
        <v-chip color="green" variant="tonal" size="small">
          <v-icon left size="small">mdi-check-circle</v-icon>
          Cleared: {{ clearedCount }}
        </v-chip>
      </v-col>
      <v-col cols="auto" class="pa-1">
        <v-chip color="red" variant="tonal" size="small">
          <v-icon left size="small">mdi-block-helper</v-icon>
          Blocked: {{ blockedCount }}
        </v-chip>
      </v-col>
      <v-col cols="auto" class="pa-1">
        <v-chip color="blue" variant="tonal" size="small">
          <v-icon left size="small">mdi-account-group</v-icon>
          Total: {{ totalCount }}
        </v-chip>
      </v-col>
    </v-row>
  </v-card-subtitle>
</template>
