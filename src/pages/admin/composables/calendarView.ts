import { ref, computed } from 'vue'
import { useTheme } from 'vuetify'
import type { Event } from '@/stores/eventsData'

// Calendar view options
export const calendarViews = [
  { title: 'Month', value: 'month', icon: 'mdi-calendar-month' },
  { title: 'Week', value: 'week', icon: 'mdi-calendar-week' }
]

// Date utility functions
export const dateUtils = {
  // Get today's date with time reset to midnight
  getToday: (): Date => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  },

  // Check if two dates are the same day
  isSameDay: (date1: Date, date2: Date): boolean => {
    const d1 = new Date(date1)
    const d2 = new Date(date2)
    d1.setHours(0, 0, 0, 0)
    d2.setHours(0, 0, 0, 0)
    return d1.getTime() === d2.getTime()
  },

  // Check if date is in the past
  isPastDate: (date: Date): boolean => {
    const eventDate = new Date(date)
    const today = dateUtils.getToday()
    eventDate.setHours(0, 0, 0, 0)
    return eventDate < today
  },

  // Check if date is today
  isToday: (date: Date): boolean => {
    const eventDate = new Date(date)
    const today = dateUtils.getToday()
    return dateUtils.isSameDay(eventDate, today)
  },

  // Check if date is in the future
  isFutureDate: (date: Date): boolean => {
    const eventDate = new Date(date)
    const today = dateUtils.getToday()
    eventDate.setHours(0, 0, 0, 0)
    return eventDate > today
  },

  // Format date for display
  formatDisplayDate: (date: string | Date, options?: Intl.DateTimeFormatOptions): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }
    return dateObj.toLocaleDateString('en-US', { ...defaultOptions, ...options })
  }
}

// Event classification helpers
export const eventClassifiers = {
  // Get event status based on date
  getEventStatus: (event: Event): 'past' | 'today' | 'upcoming' => {
    if (!event.date) return 'upcoming'

    const eventDate = new Date(event.date)

    if (dateUtils.isPastDate(eventDate)) return 'past'
    if (dateUtils.isToday(eventDate)) return 'today'
    return 'upcoming'
  },

  // Get CSS classes for event styling
  getEventClasses: (event: Event): string[] => {
    const classes = ['event-item']
    const status = eventClassifiers.getEventStatus(event)

    classes.push(`${status}-event`)
    return classes
  },

  // Get event color based on status and theme
  getEventColor: (event: Event, themeColors?: any): string => {
    const status = eventClassifiers.getEventStatus(event)

    if (!themeColors) return '#1976d2' // Default blue

    switch (status) {
      case 'past':
        return themeColors.grey || '#757575'
      case 'today':
        return themeColors.warning || '#ff9800'
      case 'upcoming':
        return themeColors.primary || '#1976d2'
      default:
        return themeColors.primary || '#1976d2'
    }
  }
}

// Events counting and statistics
export const eventStats = {
  // Count events by status
  getEventCounts: (events: Event[]) => {
    const counts = {
      total: events.length,
      past: 0,
      today: 0,
      upcoming: 0
    }

    events.forEach(event => {
      const status = eventClassifiers.getEventStatus(event)
      counts[status]++
    })

    return counts
  },

  // Filter events by status
  filterEventsByStatus: (events: Event[], status: 'past' | 'today' | 'upcoming'): Event[] => {
    return events.filter(event => eventClassifiers.getEventStatus(event) === status)
  }
}

// LocalStorage utilities
export const storageUtils = {
  // Save event to localStorage
  saveEvent: (event: Event, key: string = 'lastClickedEvent'): void => {
    try {
      localStorage.setItem(key, JSON.stringify({
        event,
        timestamp: new Date().toISOString()
      }))
    } catch (error) {
      console.error('Error saving event to localStorage:', error)
    }
  },

  // Load event from localStorage
  loadEvent: (key: string = 'lastClickedEvent'): Event | null => {
    try {
      const stored = localStorage.getItem(key)
      if (stored) {
        const { event } = JSON.parse(stored)
        return event
      }
    } catch (error) {
      console.error('Error loading event from localStorage:', error)
    }
    return null
  },

  // Save date to localStorage
  saveDate: (date: Date, key: string = 'lastClickedDate'): void => {
    try {
      localStorage.setItem(key, JSON.stringify({
        date: date.toISOString(),
        timestamp: new Date().toISOString()
      }))
    } catch (error) {
      console.error('Error saving date to localStorage:', error)
    }
  },

  // Load date from localStorage
  loadDate: (key: string = 'lastClickedDate'): Date | null => {
    try {
      const stored = localStorage.getItem(key)
      if (stored) {
        const { date } = JSON.parse(stored)
        return new Date(date)
      }
    } catch (error) {
      console.error('Error loading date from localStorage:', error)
    }
    return null
  },

  // Clear storage
  clear: (key?: string): void => {
    try {
      if (key) {
        localStorage.removeItem(key)
      } else {
        localStorage.removeItem('lastClickedEvent')
        localStorage.removeItem('lastClickedDate')
      }
    } catch (error) {
      console.error('Error clearing localStorage:', error)
    }
  }
}

// Calendar formatting helpers
export const calendarFormatters = {
  // Format events for vue-simple-calendar
  formatEventsForCalendar: (events: Event[]): any[] => {
    return events.map(event => ({
      id: event.id.toString(),
      title: event.title,
      startDate: new Date(event.date || new Date()),
      endDate: new Date(event.date || new Date()),
      classes: eventClassifiers.getEventClasses(event),
      originalEvent: event
    }))
  },

  // Get display period label
  getDisplayPeriodLabel: (currentPeriodStart: Date, currentView: string): string => {
    if (!currentPeriodStart) return ''

    const start = currentPeriodStart
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long'
    }

    if (currentView === 'week') {
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    }

    return start.toLocaleDateString('en-US', options)
  }
}

// Event click resolution utilities
export const eventClickUtils = {
  // Resolve event data from calendar click
  resolveEventFromClick: (clickEvent: any, allEvents: Event[]): Event | null => {
    console.log('Full event object:', clickEvent)
    console.log('Event originalEvent:', clickEvent.originalEvent)
    console.log('Event properties:', Object.keys(clickEvent))

    // Try different ways to access the event data
    let actualEvent = null

    if (clickEvent.originalEvent) {
      actualEvent = clickEvent.originalEvent
    } else if (clickEvent.item) {
      actualEvent = clickEvent.item.originalEvent || clickEvent.item
    } else if (clickEvent.event) {
      actualEvent = clickEvent.event
    } else {
      // If no originalEvent, try to find the event by id
      const eventId = clickEvent.id || clickEvent.itemId
      if (eventId) {
        actualEvent = allEvents.find(e => e.id.toString() === eventId.toString())
      }
    }

    console.log('Resolved actual event:', actualEvent)
    return actualEvent
  }
}

// Color utilities
export const colorUtils = {
  // Helper function to determine text color based on background
  getContrastYIQ: (hexcolor: string): string => {
    if (!hexcolor) return '#000000'

    const r = parseInt(hexcolor.substr(1,2),16)
    const g = parseInt(hexcolor.substr(3,2),16)
    const b = parseInt(hexcolor.substr(5,2),16)
    const yiq = ((r*299)+(g*587)+(b*114))/1000
    return (yiq >= 128) ? '#000000' : '#FFFFFF'
  }
}

// Main calendar view composable
export function useCalendarView() {
  const theme = useTheme()

  // Calendar configuration
  const currentView = ref('month')
  const currentPeriodStart = ref(new Date())
  const showDate = ref(new Date())
  const displayPeriodUom = ref('month')
  const displayPeriodCount = ref(1)
  const startingDayOfWeek = ref(0) // Sunday = 0

  // Computed properties
  const isDarkMode = computed(() => theme.global.current.value.dark)
  const currentThemeColors = computed(() => theme.global.current.value.colors)

  const displayPeriodLabel = computed(() =>
    calendarFormatters.getDisplayPeriodLabel(currentPeriodStart.value, currentView.value)
  )

  // Navigation methods
  const changeView = (view: string) => {
    currentView.value = view

    switch (view) {
      case 'month':
        displayPeriodUom.value = 'month'
        displayPeriodCount.value = 1
        break
      case 'week':
        displayPeriodUom.value = 'week'
        displayPeriodCount.value = 1
        break
    }
  }

  const goToToday = () => {
    currentPeriodStart.value = new Date()
    showDate.value = new Date()
  }

  const goToPreviousPeriod = () => {
    const current = new Date(currentPeriodStart.value)

    switch (currentView.value) {
      case 'month':
        current.setMonth(current.getMonth() - 1)
        break
      case 'week':
        current.setDate(current.getDate() - 7)
        break
    }

    currentPeriodStart.value = current
    showDate.value = current
  }

  const goToNextPeriod = () => {
    const current = new Date(currentPeriodStart.value)

    switch (currentView.value) {
      case 'month':
        current.setMonth(current.getMonth() + 1)
        break
      case 'week':
        current.setDate(current.getDate() + 7)
        break
    }

    currentPeriodStart.value = current
    showDate.value = current
  }

  // Format events for calendar display
  const formatEventsForCalendar = (events: Event[]) => {
    return calendarFormatters.formatEventsForCalendar(events)
  }

  // Get event counts
  const getEventCounts = (events: Event[]) => {
    return eventStats.getEventCounts(events)
  }

  return {
    // State
    currentView,
    currentPeriodStart,
    showDate,
    displayPeriodUom,
    displayPeriodCount,
    startingDayOfWeek,

    // Computed
    isDarkMode,
    currentThemeColors,
    displayPeriodLabel,

    // Methods
    changeView,
    goToToday,
    goToPreviousPeriod,
    goToNextPeriod,
    formatEventsForCalendar,
    getEventCounts,

    // Utilities (exposed for direct use)
    dateUtils,
    eventClassifiers,
    eventStats,
    storageUtils,
    calendarFormatters,
    eventClickUtils,
    colorUtils
  }
}
