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
  organization_id?: string | number | null
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

// Block all organization members (including leaders) for an LCO event
export async function blockAllOrganizationMembersForLcoEvent(eventId: number): Promise<{ success: boolean; affected: number }> {
  try {
    // Get all organization members (leaders are included in this table)
    const { data: members, error: membersError } = await supabaseAdmin
      .from('organization_members')
      .select('student_id')

    if (membersError) {
      console.error('Error fetching organization members:', membersError)
      throw membersError
    }

    const memberIds = Array.from(new Set((members || []).map(m => m.student_id).filter(Boolean)))
    if (memberIds.length === 0) {
      return { success: true, affected: 0 }
    }

    // Update all member rows to blocked (idempotent; rows already created by student auto-registration)
    const { error: updateError } = await supabaseAdmin
      .from('student_events')
      .update({ status: 'blocked' })
      .eq('event_id', eventId)
      .in('student_id', memberIds as any)

    if (updateError) {
      console.error('Error updating member registrations to blocked:', updateError)
      throw updateError
    }

    return { success: true, affected: memberIds.length }
  } catch (error) {
    console.error('Failed to block all organization members for LCO event:', error)
    throw error
  }
}

// Remove duplicate student_events rows for a given event, keeping the earliest per student
export async function dedupeStudentEventsForEvent(eventId: number): Promise<{ removed: number }> {
  const { data, error } = await supabaseAdmin
    .from('student_events')
    .select('id, student_id, created_at')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching student_events for dedupe:', error)
    throw error
  }

  const seen = new Set<string | number>()
  const duplicates: number[] = []

  for (const row of data || []) {
    if (seen.has(row.student_id)) {
      duplicates.push(row.id)
    } else {
      seen.add(row.student_id)
    }
  }

  if (duplicates.length === 0) return { removed: 0 }

  const { error: delErr } = await supabaseAdmin
    .from('student_events')
    .delete()
    .in('id', duplicates)

  if (delErr) {
    console.error('Error deleting duplicate student_events rows:', delErr)
    throw delErr
  }

  return { removed: duplicates.length }
}

// Block all organization leaders for an Org Leaders event
// Sources:
// 1) students.role_id = 3
// 2) organization_members where member_role != 'member'
// 3) organizations.leader_id mapped to students.user_id
export async function blockAllOrgLeadersForOrgLeaderEvent(eventId: number): Promise<{ success: boolean; affected: number }> {
  try {
    // 1) students.role_id = 3
    const { data: roleLeaders, error: roleErr } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('role_id', 3)

    if (roleErr) {
      console.error('Error fetching students with role_id=3:', roleErr)
      throw roleErr
    }

    // 2) organization_members (non-member roles)
    const { data: memberLeaders, error: memberErr } = await supabaseAdmin
      .from('organization_members')
      .select('student_id')
      .neq('member_role', 'member')

    if (memberErr) {
      console.error('Error fetching organization leaders from members:', memberErr)
      throw memberErr
    }

    // 3) organizations.leader_id -> map to students.user_id
    const { data: orgLeaders, error: orgErr } = await supabaseAdmin
      .from('organizations')
      .select('leader_id')
      .not('leader_id', 'is', null)

    if (orgErr) {
      console.error('Error fetching organization leader IDs:', orgErr)
      throw orgErr
    }

    const leaderUserIdsFromOrgs = (orgLeaders || []).map(o => o.leader_id).filter(Boolean) as string[]
    let leaderStudentsFromOrgLeaders: { id: string | number }[] = []
    if (leaderUserIdsFromOrgs.length > 0) {
      const { data: leaderStudentRows, error: studentErr } = await supabaseAdmin
        .from('students')
        .select('id, user_id')
        .in('user_id', leaderUserIdsFromOrgs as any)

      if (studentErr) {
        console.error('Error mapping leader users to students:', studentErr)
        throw studentErr
      }
      leaderStudentsFromOrgLeaders = leaderStudentRows || []
    }

    const leaderIds = Array.from(new Set([
      ...(roleLeaders || []).map(l => l.id).filter(Boolean),
      ...(memberLeaders || []).map(l => l.student_id).filter(Boolean),
      ...leaderStudentsFromOrgLeaders.map(s => s.id)
    ]))

    if (leaderIds.length === 0) {
      return { success: true, affected: 0 }
    }

    // Find existing rows for these leaders for this event
    const { data: existing, error: existingErr } = await supabaseAdmin
      .from('student_events')
      .select('student_id')
      .eq('event_id', eventId)
      .in('student_id', leaderIds as any)

    if (existingErr) {
      console.error('Error fetching existing leader registrations:', existingErr)
      throw existingErr
    }

    const existingIds = new Set((existing || []).map(r => r.student_id))
    const toInsert = leaderIds
      .filter(id => !existingIds.has(id))
      .map(id => ({ student_id: id, event_id: eventId, status: 'blocked' }))

    if (toInsert.length > 0) {
      const { error: insErr } = await supabaseAdmin
        .from('student_events')
        .insert(toInsert)

      if (insErr) {
        console.error('Error inserting org leader blocks:', insErr)
        throw insErr
      }
    }

    // Ensure all leader rows are set to blocked
    const { error: updErr } = await supabaseAdmin
      .from('student_events')
      .update({ status: 'blocked' })
      .eq('event_id', eventId)
      .in('student_id', leaderIds as any)

    if (updErr) {
      console.error('Error updating org leader blocks:', updErr)
      throw updErr
    }

    return { success: true, affected: leaderIds.length }
  } catch (error) {
    console.error('Failed to block organization leaders for Org Leaders event:', error)
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

  // Fetch events scoped to a specific organization (by explicit column or junction table)
  async function fetchEventsForOrganization(organizationId: string | number): Promise<EventWithLCO[]> {
    loading.value = true
    error.value = null

    // Normalize org id for comparisons
    const orgId = isNaN(Number(organizationId)) ? organizationId : Number(organizationId)

    try {
      // First, try junction table event_organizations to get event IDs
      let eventIds: number[] = []
      try {
        const { data: eoRows, error: eoError } = await supabase
          .from('event_organizations')
          .select('event_id')
          .eq('organization_id', orgId)

        if (!eoError && eoRows) {
          eventIds = Array.from(new Set((eoRows || []).map(row => Number(row.event_id)).filter(Boolean)))
        }
      } catch (_) {
        // Table might not exist; fall back silently
      }

      // If we have event IDs from the junction table, fetch those events
      if (eventIds.length > 0) {
        const { data, error: eventsError } = await supabase
          .from('events')
          .select('*')
          .in('id', eventIds)
          .order('created_at', { ascending: false })

        if (eventsError) {
          console.error('Error fetching organization events by event IDs:', eventsError)
          throw eventsError
        }

        const eventsWithLCO: EventWithLCO[] = (data || []).map(event => ({
          ...event,
          is_lco: event.is_lco ?? false
        }))

        events.value = eventsWithLCO
        return eventsWithLCO
      }

      // Fallback: use explicit organization_id column if present
      const { data, error: columnError } = await supabase
        .from('events')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

      if (columnError) {
        console.warn('Fallback fetch events by organization_id failed (column may not exist):', columnError.message)
      }

      const eventsWithLCO: EventWithLCO[] = (data || []).map(event => ({
        ...event,
        is_lco: event.is_lco ?? false
      }))

      events.value = eventsWithLCO
      return eventsWithLCO
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch organization events'
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

      // If this is an LCO event, register all students then block all org members (including leaders), then dedupe rows
      if (newEvent.is_lco) {
        try {
          const { registeredCount } = await registerAllStudentsForLcoEvent(newEvent.id)
          const { affected } = await blockAllOrganizationMembersForLcoEvent(newEvent.id)
          const { removed } = await dedupeStudentEventsForEvent(newEvent.id)
          console.log(`LCO Event created: Registered ${registeredCount} students, blocked ${affected} org members, removed ${removed} duplicate rows for event "${newEvent.title}"`)
        } catch (registrationError) {
          console.error('Failed to register students or block members for LCO event:', registrationError)
          // Don't throw here - the event was created successfully, just log the registration error
        }
      }

      // If this is an Org Leaders event (non-LCO, no organization_id), block all organization leaders
      if (!newEvent.is_lco && !newEvent.organization_id) {
        try {
          const { affected } = await blockAllOrgLeadersForOrgLeaderEvent(newEvent.id)
          const { removed } = await dedupeStudentEventsForEvent(newEvent.id)
          console.log(`Org Leaders Event created: Blocked ${affected} org leaders, removed ${removed} duplicate rows for event "${newEvent.title}"`)
        } catch (err) {
          console.error('Failed to block org leaders for Org Leaders event:', err)
          // Do not throw; event creation already succeeded
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

      // If LCO was toggled on (wasn't LCO before, but is now), register all students then block org members, then dedupe rows
      if (!wasLcoEvent && updatedEvent.is_lco) {
        try {
          const { registeredCount } = await registerAllStudentsForLcoEvent(updatedEvent.id)
          const { affected } = await blockAllOrganizationMembersForLcoEvent(updatedEvent.id)
          const { removed } = await dedupeStudentEventsForEvent(updatedEvent.id)
          console.log(`LCO Event toggled on: Registered ${registeredCount} students, blocked ${affected} org members, removed ${removed} duplicate rows for event "${updatedEvent.title}"`)
        } catch (registrationError) {
          console.error('Failed to register students or block members when toggling LCO on:', registrationError)
          // Don't throw here - the event was updated successfully, just log the registration error
        }
      }

      // If event remains non-LCO without organization_id (Org Leaders event), ensure leaders are blocked
      if (!updatedEvent.is_lco && !updatedEvent.organization_id) {
        try {
          const { affected } = await blockAllOrgLeadersForOrgLeaderEvent(updatedEvent.id)
          const { removed } = await dedupeStudentEventsForEvent(updatedEvent.id)
          console.log(`Org Leaders Event updated: Blocked ${affected} org leaders, removed ${removed} duplicate rows for event "${updatedEvent.title}"`)
        } catch (err) {
          console.error('Failed to block org leaders for Org Leaders event update:', err)
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
    fetchEventsForOrganization,
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
