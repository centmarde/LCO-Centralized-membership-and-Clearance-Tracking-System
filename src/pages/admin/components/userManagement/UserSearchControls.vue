<script setup lang="ts">
import { computed, ref } from 'vue'
import MembershipDatePickerDialog from './MembershipDatePickerDialog.vue'

interface Props {
  search: string
  searchType: 'name' | 'role' | 'organization' | 'membership_date' | 'membership_affiliation'
  viewMode: 'all' | 'blocked'
  layoutMode: 'card' | 'list'
  allUsersCount: number
  blockedStudentsCount: number
  selectedOrganization?: string | null
  organizations: Array<{ id: string; title: string }>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:search': [value: string]
  'update:searchType': [value: 'name' | 'role' | 'organization' | 'membership_date' | 'membership_affiliation']
  'update:viewMode': [value: 'all' | 'blocked']
  'update:layoutMode': [value: 'card' | 'list']
  'update:selectedOrganization': [value: string | null]
  'export:pdf': []
  'export:docx': []
  'export:excel': []
}>()

// Dialog state
const showDatePickerDialog = ref(false)

// Search type options
const searchTypeOptions = [
  { title: 'Name', value: 'name', icon: 'mdi-account' },
  { title: 'Role', value: 'role', icon: 'mdi-account-cog' },
  { title: 'Organization', value: 'organization', icon: 'mdi-office-building' },
  { title: 'Membership Date', value: 'membership_date', icon: 'mdi-calendar' },
  { title: 'Membership Affiliation', value: 'membership_affiliation', icon: 'mdi-account-group' }
]

// Computed property for search placeholder text
const searchPlaceholder = computed(() => {
  const baseText = props.viewMode === 'blocked' ? 'Search blocked students' : 'Search users'
  switch (props.searchType) {
    case 'name':
      return `${baseText} by name...`
    case 'role':
      return `${baseText} by role...`
    case 'organization':
      return `${baseText} by organization...`
    case 'membership_date':
      return `${baseText} by membership date...`
    case 'membership_affiliation':
      return `${baseText} by membership affiliation...`
    default:
      return `${baseText}...`
  }
})

// Computed property for organization filter options
const organizationOptions = computed(() => {
  const uniqueOrgs = new Set()
  const options: Array<{ title: string; value: string }> = []

  props.organizations.forEach(org => {
    if (!uniqueOrgs.has(org.id)) {
      uniqueOrgs.add(org.id)
      options.push({
        title: org.title,
        value: org.id
      })
    }
  })

  return options.sort((a, b) => a.title.localeCompare(b.title))
})

// Date picker methods
const handleDateSelected = (selection: { month?: number; day?: number; year?: number; range: 'exact' | 'month' | 'year' }) => {
  let searchValue = ''

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December']

  switch (selection.range) {
    case 'exact':
      if (selection.month && selection.day && selection.year) {
        searchValue = `${monthNames[selection.month - 1]} ${selection.day}, ${selection.year}`
      }
      break
    case 'month':
      if (selection.month && selection.year) {
        searchValue = `${monthNames[selection.month - 1]} ${selection.year}`
      }
      break
    case 'year':
      if (selection.year) {
        searchValue = selection.year.toString()
      }
      break
  }

  // Set the search type to membership_date and update the search value
  emit('update:searchType', 'membership_date')
  emit('update:search', searchValue)
}

const handleSearchTypeClick = (searchType: string) => {
  if (searchType === 'membership_date') {
    showDatePickerDialog.value = true
  } else {
    emit('update:searchType', searchType as 'name' | 'role' | 'organization' | 'membership_date' | 'membership_affiliation')
  }
}
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
              :placeholder="searchPlaceholder"
              variant="outlined"
              hide-details
              clearable
              density="compact"
            >
              <template v-slot:prepend-inner>
                <v-menu>
                  <template v-slot:activator="{ props: menuProps }">
                    <v-btn
                      v-bind="menuProps"
                      :icon="searchTypeOptions.find(opt => opt.value === searchType)?.icon || 'mdi-magnify'"
                      size="small"
                      variant="text"
                      density="compact"
                      class="mr-1"
                    />
                  </template>
                  <v-list density="compact" min-width="150">
                    <v-list-item
                      v-for="option in searchTypeOptions"
                      :key="option.value"
                      :value="option.value"
                      @click="handleSearchTypeClick(option.value)"
                      :class="{ 'v-list-item--active': props.searchType === option.value }"
                    >
                      <template v-slot:prepend>
                        <v-icon :icon="option.icon" size="small" />
                      </template>
                      <v-list-item-title>{{ option.title }}</v-list-item-title>
                      <template v-slot:append v-if="searchType === option.value">
                        <v-icon icon="mdi-check" size="small" color="primary" />
                      </template>
                    </v-list-item>
                  </v-list>
                </v-menu>
                <v-divider vertical class="mx-2" />
                <v-icon icon="mdi-magnify" size="small" />
              </template>
            </v-text-field>
          </v-col>
          <v-col cols="12" class="pb-2">
            <v-select
              :model-value="props.selectedOrganization"
              @update:model-value="emit('update:selectedOrganization', $event)"
              :items="organizationOptions"
              label="Filter by Organization"
              variant="outlined"
              hide-details
              clearable
              density="compact"
              prepend-inner-icon="mdi-office-building"
            />
          </v-col>
          <v-col cols="12" class="py-2">
            <v-btn-toggle
              :model-value="props.viewMode"
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
                  <div class="text-caption">All ({{ props.allUsersCount }})</div>
                </div>
              </v-btn>
              <v-btn
                value="blocked"
                class="flex-grow-1"
                size="small"
                :color="props.blockedStudentsCount > 0 ? 'error' : 'default'"
              >
                <div class="d-flex flex-column align-center">
                  <v-icon size="small" class="mb-1">mdi-account-alert</v-icon>
                  <div class="text-caption">Blocked ({{ props.blockedStudentsCount }})</div>
                </div>
              </v-btn>
            </v-btn-toggle>
          </v-col>
          <v-col cols="12" class="pt-2">
            <div class="d-flex justify-center align-center gap-2">
              <v-btn-toggle
                :model-value="props.layoutMode"
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

              <!-- Export menu for blocked students -->
              <v-menu v-if="props.viewMode === 'blocked' && props.blockedStudentsCount > 0">
                <template v-slot:activator="{ props }">
                  <v-btn
                    v-bind="props"
                    variant="outlined"
                    size="small"
										class="mx-2"
                    density="compact"
                    icon
                  >
                    <v-icon>mdi-dots-vertical</v-icon>
                    <v-tooltip activator="parent" location="top">Export Options</v-tooltip>
                  </v-btn>
                </template>
                <v-list density="compact" min-width="120">
                  <v-list-item @click="emit('export:pdf')">
                    <template v-slot:prepend>
                      <v-icon color="error">mdi-file-pdf-box</v-icon>
                    </template>
                    <v-list-item-title>Export to PDF</v-list-item-title>
                  </v-list-item>
                  <v-list-item @click="emit('export:docx')">
                    <template v-slot:prepend>
                      <v-icon color="primary">mdi-file-document</v-icon>
                    </template>
                    <v-list-item-title>Export to DOCX</v-list-item-title>
                  </v-list-item>
                  <v-list-item @click="emit('export:excel')">
                    <template v-slot:prepend>
                      <v-icon color="success">mdi-file-excel</v-icon>
                    </template>
                    <v-list-item-title>Export to Excel</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </div>
          </v-col>
        </v-row>
      </div>


      <v-row class="d-none d-md-flex">
        <v-col cols="12" md="4">
          <v-text-field
            :model-value="search"
            @update:model-value="emit('update:search', $event)"
            :placeholder="searchPlaceholder"
            variant="outlined"
            hide-details
            clearable
            density="compact"
          >
            <template v-slot:prepend-inner>
              <v-menu>
                <template v-slot:activator="{ props: menuProps }">
                  <v-btn
                    v-bind="menuProps"
                    :icon="searchTypeOptions.find(opt => opt.value === props.searchType)?.icon || 'mdi-magnify'"
                    size="small"
                    variant="text"
                    density="compact"
                    class="mr-1"
                  />
                </template>
                <v-list density="compact" min-width="150">
                  <v-list-item
                    v-for="option in searchTypeOptions"
                    :key="option.value"
                    :value="option.value"
                    @click="handleSearchTypeClick(option.value)"
                    :class="{ 'v-list-item--active': props.searchType === option.value }"
                  >
                    <template v-slot:prepend>
                      <v-icon :icon="option.icon" size="small" />
                    </template>
                    <v-list-item-title>{{ option.title }}</v-list-item-title>
                    <template v-slot:append v-if="props.searchType === option.value">
                      <v-icon icon="mdi-check" size="small" color="primary" />
                    </template>
                  </v-list-item>
                </v-list>
              </v-menu>
              <v-divider vertical class="mx-2" />
              <v-icon icon="mdi-magnify" size="small" />
            </template>
          </v-text-field>
        </v-col>
        <v-col cols="12" md="3">
          <v-select
            :model-value="props.selectedOrganization"
            @update:model-value="emit('update:selectedOrganization', $event)"
            :items="organizationOptions"
            label="Filter by Organization"
            variant="outlined"
            hide-details
            clearable
            density="compact"
            prepend-inner-icon="mdi-office-building"
          />
        </v-col>
        <v-col cols="12" md="5" class="d-flex align-center justify-end">
          <!-- Merged button group with view mode and layout mode -->
          <div class="d-flex gap-2">
            <v-btn-toggle
              :model-value="props.viewMode"
              @update:model-value="emit('update:viewMode', $event)"
              mandatory
              variant="outlined"
              density="compact"
              divided
            >
              <v-btn value="all" size="small">
                <v-icon start size="small">mdi-account-group</v-icon>
                 ({{ props.allUsersCount }})
                <v-tooltip activator="parent" location="top">All Users</v-tooltip>
              </v-btn>
              <v-btn
                value="blocked"
                size="small"
                :color="props.blockedStudentsCount > 0 ? 'error' : 'default'"
              >
                <v-icon start size="small">mdi-account-alert</v-icon>
                ({{ props.blockedStudentsCount }})
                <v-tooltip activator="parent" location="top">Blocked Students</v-tooltip>
              </v-btn>
            </v-btn-toggle>

            <v-btn-toggle
              :model-value="props.layoutMode"
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

            <!-- Export menu for blocked students -->
            <v-menu v-if="props.viewMode === 'blocked' && props.blockedStudentsCount > 0">
              <template v-slot:activator="{ props }">
                <v-btn
                  v-bind="props"
                  variant="outlined"
                  size="small"
                  density="compact"
                  icon
                  class="ml-2"
                >
                  <v-icon>mdi-dots-vertical</v-icon>
                  <v-tooltip activator="parent" location="top">Export Options</v-tooltip>
                </v-btn>
              </template>
              <v-list density="compact" min-width="120">
                <v-list-item @click="emit('export:pdf')">
                  <template v-slot:prepend>
                    <v-icon color="error">mdi-file-pdf-box</v-icon>
                  </template>
                  <v-list-item-title>Export to PDF</v-list-item-title>
                </v-list-item>
                <v-list-item @click="emit('export:docx')">
                  <template v-slot:prepend>
                    <v-icon color="primary">mdi-file-document</v-icon>
                  </template>
                  <v-list-item-title>Export to DOCX</v-list-item-title>
                </v-list-item>
                <v-list-item @click="emit('export:excel')">
                  <template v-slot:prepend>
                    <v-icon color="success">mdi-file-excel</v-icon>
                  </template>
                  <v-list-item-title>Export to Excel</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </div>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>

  <!-- Date Picker Dialog -->
  <MembershipDatePickerDialog
    v-model="showDatePickerDialog"
    @date-selected="handleDateSelected"
  />
</template>
