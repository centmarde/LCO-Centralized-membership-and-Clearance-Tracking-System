<script setup lang="ts">
interface Props {
  currentPage: number
  totalPages: number
  itemsPerPage: number
  totalItems: number
  viewMode: 'all' | 'blocked'
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:currentPage': [value: number]
}>()

const startItem = (props.currentPage - 1) * props.itemsPerPage + 1
const endItem = Math.min(props.currentPage * props.itemsPerPage, props.totalItems)
const itemType = props.viewMode === 'blocked' ? 'blocked students' : 'users'
</script>

<template>
  <v-row class="mt-4">
    <v-col cols="12" class="d-flex justify-center align-center">
      <v-pagination
        :model-value="currentPage"
        @update:model-value="emit('update:currentPage', $event)"
        :length="totalPages"
        :total-visible="5"
        rounded="circle"
        show-first-last-page
      ></v-pagination>
    </v-col>
    <v-col cols="12" class="text-center">
      <span class="text-body-2 text-grey">
        Showing {{ startItem }} - {{ endItem }} of {{ totalItems }} {{ itemType }}
      </span>
    </v-col>
  </v-row>
</template>
