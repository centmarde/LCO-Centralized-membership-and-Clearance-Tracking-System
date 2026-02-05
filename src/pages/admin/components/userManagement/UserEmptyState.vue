<script setup lang="ts">
interface Props {
  viewMode: 'all' | 'blocked'
  hasSearch: boolean
}

defineProps<Props>()
</script>

<template>
  <div class="text-center pa-8">
    <template v-if="viewMode === 'blocked'">
      <v-icon size="64" color="success">mdi-check-circle</v-icon>
      <p class="text-h6 mt-4 text-success">
        {{ hasSearch ? 'No blocked students found' : 'No blocked students!' }}
      </p>
      <p class="text-body-2 text-grey">
        {{ hasSearch
          ? 'No blocked students match your search criteria.'
          : 'All students have cleared their requirements or have no pending clearances.'
        }}
      </p>
    </template>
    <template v-else>
      <v-icon size="64" color="grey">mdi-account-off</v-icon>
      <p class="text-h6 mt-4">No users found</p>
      <p class="text-body-2 text-grey">
        {{ hasSearch ? 'No users match your search criteria.' : 'There are no users in the system yet.' }}
      </p>
    </template>
  </div>
</template>
