import { supabase } from '@/lib/supabase'
import type { Event, StudentEvent } from './studentsData'

// Event specific types
export type CreateEventRequest = {
  title: string
  date?: string
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

// Basic CRUD operations for events

// Fetch all events
export async function fetchEvents(): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching events:', error)
    throw error
  }

  return data || []
}

// Fetch a single event by ID
export async function fetchEventById(eventId: number): Promise<Event | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // No rows returned
    }
    console.error('Error fetching event:', error)
    throw error
  }

  return data
}

// Create a new event
export async function createEvent(eventData: CreateEventRequest): Promise<Event> {
  const { data, error } = await supabase
    .from('events')
    .insert(eventData)
    .select()
    .single()

  if (error) {
    console.error('Error creating event:', error)
    throw error
  }

  return data
}

// Update an event
export async function updateEvent(eventData: UpdateEventRequest): Promise<Event> {
  const { id, ...updateData } = eventData

  const { data, error } = await supabase
    .from('events')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating event:', error)
    throw error
  }

  return data
}

// Delete an event
export async function deleteEvent(eventId: number): Promise<{ success: boolean }> {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId)

  if (error) {
    console.error('Error deleting event:', error)
    throw error
  }

  return { success: true }
}

// Get event statistics
export async function fetchEventStats(): Promise<EventStats> {
  const { data: events, error } = await supabase
    .from('events')
    .select(`
      id,
      date,
      student_events(status)
    `)

  if (error) {
    console.error('Error fetching event stats:', error)
    throw error
  }

  const total = events.length
  const today = new Date().toISOString().split('T')[0]

  let upcoming = 0
  let completed = 0
  let cancelled = 0

  events.forEach((event) => {
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
}// Student-Event relationship functions

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
export async function fetchEventsWithRegistrationCounts(): Promise<(Event & { registration_count: number })[]> {
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      student_events(count)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching events with registration counts:', error)
    throw error
  }

  return data?.map(event => ({
    ...event,
    registration_count: event.student_events?.[0]?.count || 0
  })) || []
}
