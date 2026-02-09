<script setup lang="ts">
interface Props {
  search: string
  viewMode: 'all' | 'blocked'
  layoutMode: 'card' | 'list'
  allUsersCount: number
  blockedStudentsCount: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:search': [value: string]
  'update:viewMode': [value: 'all' | 'blocked']
  'update:layoutMode': [value: 'card' | 'list']
}>()
</script>

<template>
  <v-card class="mb-4" elevation="2">
    <v-card-text>
      <!-- Mobile Layout -->
      <div class="d-block d-md-none">
        <v-row>
          <v-col cols="12" class="pb-2">
            <v-text-field
              :model-value="search"
              @update:model-value="emit('update:search', $event)"
              prepend-inner-icon="mdi-magnify"
              :label="viewMode === 'blocked' ? 'Search blocked students...' : 'Search users...'"
              variant="outlined"
              hide-details
              clearable
              density="compact"
            />
          </v-col>
          <v-col cols="12" class="py-2">
            <v-btn-toggle
              :model-value="viewMode"
              @update:model-value="emit('update:viewMode', $event)"
              mandatory
              variant="outlined"
              density="compact"
              divided
              class="w-100"
            >
              <v-btn value="all" class="flex-grow-1" size="small">
                <div class="d-flex flex-column align-center">
                  <v-icon size="small" class="mb-1">mdi-account-group</v-icon>
                  <div class="text-caption">All ({{ allUsersCount }})</div>
                </div>
              </v-btn>
              <v-btn
                value="blocked"
                class="flex-grow-1"
                size="small"
                :color="blockedStudentsCount > 0 ? 'error' : 'default'"
              >
                <div class="d-flex flex-column align-center">
                  <v-icon size="small" class="mb-1">mdi-account-alert</v-icon>
                  <div class="text-caption">Blocked ({{ blockedStudentsCount }})</div>
                </div>
              </v-btn>
            </v-btn-toggle>
          </v-col>
          <v-col cols="12" class="pt-2">
            <div class="d-flex justify-center">
              <v-btn-toggle
                :model-value="layoutMode"
                @update:model-value="emit('update:layoutMode', $event)"
                mandatory
                variant="outlined"
                density="compact"
                divided
              >
                <v-btn value="card" size="small">
                  <v-icon>mdi-view-grid</v-icon>
                  <v-tooltip activator="parent" location="top">Card View</v-tooltip>
                </v-btn>
                <v-btn value="list" size="small">
                  <v-icon>mdi-view-list</v-icon>
                  <v-tooltip activator="parent" location="top">List View</v-tooltip>
                </v-btn>
              </v-btn-toggle>
            </div>
          </v-col>
        </v-row>
      </div>

      <!-- Desktop Layout -->
      <v-row class="d-none d-md-flex">
        <v-col cols="12" md="4">
          <v-text-field
            :model-value="search"
            @update:model-value="emit('update:search', $event)"
            prepend-inner-icon="mdi-magnify"
            :label="viewMode === 'blocked' ? 'Search blocked students...' : 'Search users...'"
            variant="outlined"
            hide-details
            clearable
            density="compact"
          />
        </v-col>
        <v-col cols="12" md="5" class="d-flex align-center justify-center">
          <v-btn-toggle
            :model-value="viewMode"
            @update:model-value="emit('update:viewMode', $event)"
            mandatory
            variant="outlined"
            density="compact"
            divided
          >
            <v-btn value="all" size="small">
              <v-icon start>mdi-account-group</v-icon>
              All Users ({{ allUsersCount }})
            </v-btn>
            <v-btn
              value="blocked"
              size="small"
              :color="blockedStudentsCount > 0 ? 'error' : 'default'"
            >
              <v-icon start>mdi-account-alert</v-icon>
              Blocked Students ({{ blockedStudentsCount }})
            </v-btn>
          </v-btn-toggle>
        </v-col>
        <v-col cols="12" md="3" class="d-flex align-center justify-end">
          <v-btn-toggle
            :model-value="layoutMode"
            @update:model-value="emit('update:layoutMode', $event)"
            mandatory
            variant="outlined"
            density="compact"
            divided
          >
            <v-btn value="card" size="small">
              <v-icon>mdi-view-grid</v-icon>
              <v-tooltip activator="parent" location="top">Card View</v-tooltip>
            </v-btn>
            <v-btn value="list" size="small">
              <v-icon>mdi-view-list</v-icon>
              <v-tooltip activator="parent" location="top">List View</v-tooltip>
            </v-btn>
          </v-btn-toggle>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>
