import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { useAuthUserStore } from '@/stores/authUser'
import { fetchBlockedEventsByUserId } from '@/stores/studentsData'

// Re-export types for external use
export type { Event, StudentEvent } from './studentsData'

// Event specific types
export type CreateEventRequest = {
  title: string
  date?: string
  is_lco?: boolean
}

export type UpdateEventRequest = Partial<CreateEventRequest> & {
  id: number
}

export type EventStats = {
  total: number
  upcoming: number
  completed: number
  cancelled: number
}

// Extended Event type with is_lco property
export type EventWithLCO = {
  id: number
  created_at: string
  title: string
  date: string
  is_lco: boolean
}

// Register all students for an LCO event
export async function registerAllStudentsForLcoEvent(eventId: number): Promise<{ success: boolean; registeredCount: number }> {
  try {
    console.log(`Attempting to register all students for LCO event ${eventId}`)

    // First, get all students (not just active ones) to see what we have
    const { data: allStudents, error: allStudentsError } = await supabaseAdmin
      .from('students')
      .select('id, status')

    if (allStudentsError) {
      console.error('Error fetching all students:', allStudentsError)
      throw allStudentsError
    }

    console.log('All students found:', allStudents)

    // Filter for active students (case-insensitive check)
    const activeStudents = allStudents?.filter(student =>
      student.status?.toLowerCase() === 'active'
    ) || []

    console.log(`Found ${activeStudents.length} active students out of ${allStudents?.length || 0} total students`)

    if (activeStudents.length === 0) {
      console.log('No active students found')
      // Let's try to get all students regardless of status for LCO events
      const students = allStudents || []
      if (students.length === 0) {
        return { success: true, registeredCount: 0 }
      }

      console.log('Using all students for LCO event since no active students found')
    }

    const studentsToUse = activeStudents.length > 0 ? activeStudents : (allStudents || [])

    // Check which students are already registered for this event using supabaseAdmin
    const { data: existingRegistrations, error: existingError } = await supabaseAdmin
      .from('student_events')
      .select('student_id')
      .eq('event_id', eventId)

    if (existingError) {
      console.error('Error checking existing registrations:', existingError)
      throw existingError
    }

    const existingStudentIds = new Set(existingRegistrations?.map(reg => reg.student_id) || [])
    console.log(`Found ${existingStudentIds.size} existing registrations for this event`)

    // Filter out students who are already registered
    const studentsToRegister = studentsToUse.filter(student => !existingStudentIds.has(student.id))

    console.log(`${studentsToRegister.length} students need to be registered`)

    if (studentsToRegister.length === 0) {
      console.log('All students are already registered for this event')
      return { success: true, registeredCount: 0 }
    }

    // Prepare bulk insert data
    const registrations = studentsToRegister.map(student => ({
      student_id: student.id,
      event_id: eventId,
      status: 'pending' // Default status for LCO events
    }))

    console.log('Preparing to insert registrations:', registrations)

    // Bulk insert registrations using supabaseAdmin to bypass RLS
    const { data: insertedData, error: insertError } = await supabaseAdmin
      .from('student_events')
      .insert(registrations)
      .select()

    if (insertError) {
      console.error('Error registering students for LCO event:', insertError)
      throw insertError
    }

    console.log(`Successfully registered ${studentsToRegister.length} students for LCO event`)
    console.log('Inserted data:', insertedData)
    return { success: true, registeredCount: studentsToRegister.length }
  } catch (error) {
    console.error('Failed to register all students for LCO event:', error)
    throw error
  }
}

export const useEventsStore = defineStore('events', () => {
  // State
  const events = ref<EventWithLCO[]>([])
  const currentEvent = ref<EventWithLCO | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const lcoEvents = computed(() => events.value.filter(event => event.is_lco))
  const nonLcoEvents = computed(() => events.value.filter(event => !event.is_lco))
  const upcomingEvents = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    return events.value.filter(event => event.date && event.date >= today)
  })
  const completedEvents = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    return events.value.filter(event => event.date && event.date < today)
  })

  // Actions
  async function loadBlockedEvents(): Promise<{ name: string; date: string; status: string }[]> {
    const authUserStore = useAuthUserStore()
    const userId = authUserStore.userData?.id
    if (!userId) throw new Error('User not authenticated')
    return await fetchBlockedEventsByUserId(userId)
  }

  // Fetch all events
  async function fetchEvents(): Promise<EventWithLCO[]> {
    loading.value = true
    error.value = null

    try {
      const { data, error: supabaseError } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })

      if (supabaseError) {
        console.error('Error fetching events:', supabaseError)
        throw supabaseError
      }

      const eventsWithLCO: EventWithLCO[] = (data || []).map(event => ({
        ...event,
        is_lco: event.is_lco ?? false
      }))

      events.value = eventsWithLCO
      return eventsWithLCO
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch events'
      throw err
    } finally {
      loading.value = false
    }
  }

  // Fetch a single event by ID
  async function fetchEventById(eventId: number): Promise<EventWithLCO | null> {
    loading.value = true
    error.value = null

    try {
      const { data, error: supabaseError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()

      if (supabaseError) {
        if (supabaseError.code === 'PGRST116') {
          return null // No rows returned
        }
        console.error('Error fetching event:', supabaseError)
        throw supabaseError
      }

      const eventWithLCO: EventWithLCO = {
        ...data,
        is_lco: data.is_lco ?? false
      }

      currentEvent.value = eventWithLCO
      return eventWithLCO
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch event'
      throw err
    } finally {
      loading.value = false
    }
  }

  // Create a new event
  async function createEvent(eventData: CreateEventRequest): Promise<EventWithLCO> {
    loading.value = true
    error.value = null

    try {
      const insertData = {
        ...eventData,
        is_lco: eventData.is_lco ?? false
      }

      const { data, error: supabaseError } = await supabase
        .from('events')
        .insert(insertData)
        .select()
        .single()

      if (supabaseError) {
        console.error('Error creating event:', supabaseError)
        throw supabaseError
      }

      const newEvent: EventWithLCO = {
        ...data,
        is_lco: data.is_lco ?? false
      }

      // If this is an LCO event, register all students
      if (newEvent.is_lco) {
        try {
          const { registeredCount } = await registerAllStudentsForLcoEvent(newEvent.id)
          console.log(`LCO Event created: Registered ${registeredCount} students for event "${newEvent.title}"`)
        } catch (registrationError) {
          console.error('Failed to register students for LCO event:', registrationError)
          // Don't throw here - the event was created successfully, just log the registration error
        }
      }

      events.value.unshift(newEvent) // Add to beginning of array
      return newEvent
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create event'
      throw err
    } finally {
      loading.value = false
    }
  }

  // Update an event
  async function updateEvent(eventData: UpdateEventRequest): Promise<EventWithLCO> {
    loading.value = true
    error.value = null

    try {
      const { id, ...updateData } = eventData

      // First, get the current event state to check if LCO is being toggled on
      let wasLcoEvent = false
      if ('is_lco' in updateData) {
        const { data: currentEventData, error: fetchError } = await supabase
          .from('events')
          .select('is_lco')
          .eq('id', id)
          .single()

        if (fetchError) {
          console.error('Error fetching current event state:', fetchError)
        } else {
          wasLcoEvent = currentEventData?.is_lco ?? false
        }
      }

      const { data, error: supabaseError } = await supabase
        .from('events')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (supabaseError) {
        console.error('Error updating event:', supabaseError)
        throw supabaseError
      }

      const updatedEvent: EventWithLCO = {
        ...data,
        is_lco: data.is_lco ?? false
      }

      // If LCO was toggled on (wasn't LCO before, but is now), register all students
      if (!wasLcoEvent && updatedEvent.is_lco) {
        try {
          const { registeredCount } = await registerAllStudentsForLcoEvent(updatedEvent.id)
          console.log(`LCO Event toggled on: Registered ${registeredCount} students for event "${updatedEvent.title}"`)
        } catch (registrationError) {
          console.error('Failed to register students when toggling LCO on:', registrationError)
          // Don't throw here - the event was updated successfully, just log the registration error
        }
      }

      // Update in local state
      const index = events.value.findIndex(event => event.id === id)
      if (index !== -1) {
        events.value[index] = updatedEvent
      }

      if (currentEvent.value?.id === id) {
        currentEvent.value = updatedEvent
      }

      return updatedEvent
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update event'
      throw err
    } finally {
      loading.value = false
    }
  }

  // Delete an event
  async function deleteEvent(eventId: number): Promise<{ success: boolean }> {
    loading.value = true
    error.value = null

    try {
      const { error: supabaseError } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)

      if (supabaseError) {
        console.error('Error deleting event:', supabaseError)
        throw supabaseError
      }

      // Remove from local state
      events.value = events.value.filter(event => event.id !== eventId)

      if (currentEvent.value?.id === eventId) {
        currentEvent.value = null
      }

      return { success: true }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete event'
      throw err
    } finally {
      loading.value = false
    }
  }

  // Get event statistics
  async function fetchEventStats(): Promise<EventStats> {
    loading.value = true
    error.value = null

    try {
      const { data: eventData, error: supabaseError } = await supabase
        .from('events')
        .select(`
          id,
          date,
          is_lco,
          student_events:student_events!student_events_event_id_fkey(status)
        `)

      if (supabaseError) {
        console.error('Error fetching event stats:', supabaseError)
        throw supabaseError
      }

      const total = eventData.length
      const today = new Date().toISOString().split('T')[0]

      let upcoming = 0
      let completed = 0
      let cancelled = 0

      eventData.forEach((event) => {
        const hasActiveRegistrations = event.student_events?.some((se: any) =>
          se.status && se.status !== 'cancelled'
        )

        const hasCancelledRegistrations = event.student_events?.every((se: any) =>
          se.status === 'cancelled'
        )

        if (hasCancelledRegistrations && event.student_events?.length > 0) {
          cancelled++
        } else if (event.date && event.date < today) {
          completed++
        } else if (event.date && event.date >= today) {
          upcoming++
        }
      })

      return {
        total,
        upcoming,
        completed,
        cancelled,
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch event stats'
      throw err
    } finally {
      loading.value = false
    }
  }

  // Return store API
  return {
    // State
    events,
    currentEvent,
    loading,
    error,

    // Getters
    lcoEvents,
    nonLcoEvents,
    upcomingEvents,
    completedEvents,

    // Actions
    loadBlockedEvents,
    fetchEvents,
    fetchEventById,
    createEvent,
    updateEvent,
    deleteEvent,
    fetchEventStats,
  }
})

// Student-Event relationship functions (keeping as standalone functions for now)
import type { StudentEvent } from './studentsData'

// Get all student registrations for an event
export async function fetchEventRegistrations(eventId: number): Promise<StudentEvent[]> {
  const { data, error } = await supabase
    .from('student_events')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching event registrations:', error)
    throw error
  }

  return data || []
}

// Register a student for an event
export async function registerStudentForEvent(
  studentId: number,
  eventId: number
): Promise<StudentEvent> {
  const { data, error } = await supabase
    .from('student_events')
    .insert({
      student_id: studentId,
      event_id: eventId
    })
    .select()
    .single()

  if (error) {
    console.error('Error registering student for event:', error)
    throw error
  }

  return data
}

// Remove a student registration from an event
export async function unregisterStudentFromEvent(
  studentId: number,
  eventId: number
): Promise<{ success: boolean }> {
  const { error } = await supabase
    .from('student_events')
    .delete()
    .eq('student_id', studentId)
    .eq('event_id', eventId)

  if (error) {
    console.error('Error unregistering student from event:', error)
    throw error
  }

  return { success: true }
}

// Update student event status
export async function updateStudentEventStatus(
  studentId: number,
  eventId: number,
  status: string
): Promise<StudentEvent> {
  const { data, error } = await supabase
    .from('student_events')
    .update({ status })
    .eq('student_id', studentId)
    .eq('event_id', eventId)
    .select()
    .single()

  if (error) {
    console.error('Error updating student event status:', error)
    throw error
  }

  return data
}

// Check if a student is registered for an event
export async function isStudentRegisteredForEvent(
  studentId: number,
  eventId: number
): Promise<boolean> {
  const { data, error } = await supabase
    .from('student_events')
    .select('id')
    .eq('student_id', studentId)
    .eq('event_id', eventId)
    .maybeSingle()

  if (error) {
    console.error('Error checking student registration:', error)
    throw error
  }

  return data !== null
}

// Bulk register multiple students for an event
export async function bulkRegisterStudentsForEvent(
  studentIds: number[],
  eventId: number
): Promise<StudentEvent[]> {
  const registrations = studentIds.map(studentId => ({
    student_id: studentId,
    event_id: eventId
  }))

  const { data, error } = await supabase
    .from('student_events')
    .insert(registrations)
    .select()

  if (error) {
    console.error('Error bulk registering students:', error)
    throw error
  }

  return data || []
}

// Get events with registration counts
export async function fetchEventsWithRegistrationCounts(): Promise<(EventWithLCO & { registration_count: number })[]> {
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      student_events:student_events!student_events_event_id_fkey(count)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching events with registration counts:', error)
    throw error
  }

  return data?.map(event => ({
    ...event,
    is_lco: event.is_lco ?? false,
    registration_count: event.student_events?.[0]?.count || 0
  })) || []
}

// Get events with registration counts and status counts
export async function fetchEventsWithStats(): Promise<(EventWithLCO & {
  registration_count: number
  status_counts: {
    blocked: number
    cleared: number
    pending: number
  }
})[]> {
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      student_events:student_events!student_events_event_id_fkey(status)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching events with stats:', error)
    throw error
  }

  return data?.map(event => {
    const statusCounts = { blocked: 0, cleared: 0, pending: 0 }
    const registrationCount = event.student_events?.length || 0

    // Count statuses
    event.student_events?.forEach((se: any) => {
      const status = se.status?.toLowerCase()
      if (status === 'blocked') statusCounts.blocked++
      else if (status === 'cleared') statusCounts.cleared++
      else if (status === 'pending' || !status) statusCounts.pending++
    })

    return {
      ...event,
      is_lco: event.is_lco ?? false,
      registration_count: registrationCount,
      status_counts: statusCounts
    }
  }) || []
}
