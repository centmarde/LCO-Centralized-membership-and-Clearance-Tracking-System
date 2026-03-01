<template>
  <v-dialog v-model="dialog" max-width="400px" persistent>
    <v-card>
      <v-card-title class="text-h6">
        <v-icon class="mr-2">mdi-calendar</v-icon>
        Select Membership Date
      </v-card-title>

      <v-card-text>
        <v-row>
          <v-col cols="4">
            <v-select
              v-model="selectedMonth"
              :items="monthOptions"
              label="Month"
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="4">
            <v-select
              v-model="selectedDay"
              :items="dayOptions"
              label="Day"
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="4">
            <v-select
              v-model="selectedYear"
              :items="yearOptions"
              label="Year"
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
        </v-row>

        <v-row class="mt-2">
          <v-col cols="12">
            <v-chip-group v-model="selectedRange" mandatory>
              <v-chip value="exact" size="small">Exact Date</v-chip>
              <v-chip value="month" size="small">Same Month</v-chip>
              <v-chip value="year" size="small">Same Year</v-chip>
            </v-chip-group>
          </v-col>
        </v-row>

        <v-divider class="my-3" />

        <div class="text-subtitle-2 mb-2">Quick Select:</div>
        <v-chip-group>
          <v-chip size="small" @click="setCurrentMonth">This Month</v-chip>
          <v-chip size="small" @click="setLastMonth">Last Month</v-chip>
          <v-chip size="small" @click="setCurrentYear">This Year</v-chip>
          <v-chip size="small" @click="clearDate">Clear</v-chip>
        </v-chip-group>

        <v-alert v-if="formattedDate" type="info" variant="tonal" class="mt-3">
          <template v-slot:text>
            <strong>Selected:</strong> {{ formattedDate }}
            <br>
            <strong>Search type:</strong> {{ selectedRange === 'exact' ? 'Exact date match' : selectedRange === 'month' ? 'Same month and year' : 'Same year' }}
          </template>
        </v-alert>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          @click="cancel"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :disabled="!isValidSelection"
          @click="confirm"
        >
          Search
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Props {
  modelValue: boolean
}

interface DateSelection {
  month?: number
  day?: number
  year?: number
  range: 'exact' | 'month' | 'year'
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'date-selected': [selection: DateSelection]
}>()

// Dialog state
const dialog = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Date selection state
const selectedMonth = ref<number | null>(null)
const selectedDay = ref<number | null>(null)
const selectedYear = ref<number | null>(null)
const selectedRange = ref<'exact' | 'month' | 'year'>('exact')

// Month options
const monthOptions = [
  { title: 'January', value: 1 },
  { title: 'February', value: 2 },
  { title: 'March', value: 3 },
  { title: 'April', value: 4 },
  { title: 'May', value: 5 },
  { title: 'June', value: 6 },
  { title: 'July', value: 7 },
  { title: 'August', value: 8 },
  { title: 'September', value: 9 },
  { title: 'October', value: 10 },
  { title: 'November', value: 11 },
  { title: 'December', value: 12 }
]

// Day options (1-31)
const dayOptions = computed(() => {
  const days = []
  const maxDays = selectedMonth.value ? getDaysInMonth(selectedMonth.value, selectedYear.value || new Date().getFullYear()) : 31
  for (let i = 1; i <= maxDays; i++) {
    days.push({ title: i.toString(), value: i })
  }
  return days
})

// Year options (current year - 10 to current year + 1)
const yearOptions = computed(() => {
  const currentYear = new Date().getFullYear()
  const years = []
  for (let i = currentYear - 10; i <= currentYear + 1; i++) {
    years.push({ title: i.toString(), value: i })
  }
  return years.reverse() // Most recent first
})

// Helper function to get days in month
const getDaysInMonth = (month: number, year: number): number => {
  return new Date(year, month, 0).getDate()
}

// Computed properties
const isValidSelection = computed(() => {
  switch (selectedRange.value) {
    case 'exact':
      return selectedMonth.value !== null && selectedDay.value !== null && selectedYear.value !== null
    case 'month':
      return selectedMonth.value !== null && selectedYear.value !== null
    case 'year':
      return selectedYear.value !== null
    default:
      return false
  }
})

const formattedDate = computed(() => {
  if (!isValidSelection.value) return ''

  const monthName = selectedMonth.value ? monthOptions.find(m => m.value === selectedMonth.value)?.title : ''

  switch (selectedRange.value) {
    case 'exact':
      return `${monthName} ${selectedDay.value}, ${selectedYear.value}`
    case 'month':
      return `${monthName} ${selectedYear.value}`
    case 'year':
      return selectedYear.value?.toString() || ''
    default:
      return ''
  }
})

// Watch for month/year changes to adjust day selection
watch([selectedMonth, selectedYear], () => {
  if (selectedMonth.value && selectedYear.value && selectedDay.value) {
    const maxDays = getDaysInMonth(selectedMonth.value, selectedYear.value)
    if (selectedDay.value > maxDays) {
      selectedDay.value = maxDays
    }
  }
})

// Watch range selection to adjust required fields
watch(selectedRange, (newRange) => {
  if (newRange === 'year') {
    // For year search, we don't need month/day
    selectedMonth.value = null
    selectedDay.value = null
  } else if (newRange === 'month') {
    // For month search, we don't need day
    selectedDay.value = null
  }
})

// Quick select methods
const setCurrentMonth = () => {
  const now = new Date()
  selectedMonth.value = now.getMonth() + 1
  selectedYear.value = now.getFullYear()
  selectedRange.value = 'month'
}

const setLastMonth = () => {
  const now = new Date()
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  selectedMonth.value = lastMonth.getMonth() + 1
  selectedYear.value = lastMonth.getFullYear()
  selectedRange.value = 'month'
}

const setCurrentYear = () => {
  selectedYear.value = new Date().getFullYear()
  selectedRange.value = 'year'
}

const clearDate = () => {
  selectedMonth.value = null
  selectedDay.value = null
  selectedYear.value = null
  selectedRange.value = 'exact'
}

// Dialog actions
const cancel = () => {
  dialog.value = false
  clearDate()
}

const confirm = () => {
  if (isValidSelection.value) {
    emit('date-selected', {
      month: selectedMonth.value || undefined,
      day: selectedDay.value || undefined,
      year: selectedYear.value || undefined,
      range: selectedRange.value
    })
    dialog.value = false
    clearDate()
  }
}
</script>
