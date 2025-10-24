import { supabase } from '@/lib/supabase'
// Fetch blocked events for a specific student (by user_id)
export async function fetchBlockedEventsByUserId(userId: string): Promise<{ name: string; date: string; status: string }[]> {
  const students = await fetchStudents();
  const student = students.find(s => s.user_id === userId);
  if (!student) throw new Error('No student record found for current user');
  const studentId = student.id;

  const { data, error: seError } = await supabase
    .from('student_events')
    .select('status, events:events!student_events_event_id_fkey(title, date)')
    .eq('student_id', studentId)
    .ilike('status', 'blocked');

  if (seError) throw seError;

  return (data || [])
    .filter(ev => ev.status)
    .map(ev => {
      const eventObj = Array.isArray(ev.events) ? ev.events[0] : ev.events;
      return {
        name: eventObj?.title || 'Event not found',
        date: eventObj?.date || '-',
        status: ev.status
      };
    });
}


// Student types
export type StudentStatus = {
  status: 'Active' | 'Blocked' | 'Inactive'
}

export type StudentBase = {
  id: string
  user_id: string
  full_name: string
  student_number: string
  email: string
  status: StudentStatus['status']
  organization_id: string
}

export type StudentWithOrganization = StudentBase & {
  organization: string
  organizations?: { title: string } | { title: string }[]
}

export type StudentStats = {
  total: number
  active: number
  blocked: number
}

export type UpdateStatusResponse = {
  success: boolean
}

// Event types for many-to-many relationship
export type Event = {
  id: number
  created_at: string
  title: string
  date: string
}

export type StudentEvent = {
  id: number
  created_at: string
  student_id: number
  event_id: number
  status: string
  present?: boolean
}

export type StudentWithEvents = StudentWithOrganization & {
  student_events: StudentEvent[]
}

export type EventWithStudents = Event & {
  students: StudentWithOrganization[]
  student_count: number
}

// Fetch students with organization title
export async function fetchStudents(): Promise<StudentWithOrganization[]> {
  const { data, error } = await supabase
    .from('students')
    .select(`
      id,
      user_id,
      full_name,
      student_number,
      email,
      status,
      organization_id,
      organizations(title)
    `)

  if (error) {
    console.error('Error fetching students:', error)
    throw error
  }

  return data.map((student): StudentWithOrganization => {
    let orgTitle = 'N/A'
    if (student.organizations) {
      if (Array.isArray(student.organizations)) {
        if (student.organizations.length > 0 && student.organizations[0]?.title) {
          orgTitle = student.organizations[0].title
        }
      } else if (
        typeof student.organizations === 'object' &&
        student.organizations !== null &&
        'title' in student.organizations &&
        (student.organizations as any).title
      ) {
        orgTitle = (student.organizations as any).title
      }
    }
      return {
        ...student,
        user_id: student.user_id,
        organization: orgTitle,
      }
  })
}

// Student stats
export async function fetchStudentStats(): Promise<StudentStats> {
  const { data: students, error: studentError } = await supabase
    .from('students')
    .select('status')

  if (studentError) throw studentError

  const total = students.length
  const active = students.filter((s) => s.status === 'Active').length
  const blocked = students.filter((s) => s.status === 'Blocked').length

  return {
    total,
    active,
    blocked,
  }
}

// Update student status
export async function updateStudentStatus(
  studentId: string,
  newStatus: StudentStatus['status']
): Promise<UpdateStatusResponse> {
  const { error } = await supabase
    .from('students')
    .update({ status: newStatus })
    .eq('id', studentId)

  if (error) {
    console.error('Failed to update student status:', error)
    throw error
  }

  return { success: true }
}

// Fetch students with their events
export async function fetchStudentsWithEvents(): Promise<StudentWithEvents[]> {
  const { data, error } = await supabase
    .from('students')
    .select(`
      id,
      user_id,
      full_name,
      student_number,
      email,
      status,
      organization_id,
      organizations(title),
      student_events:student_events!student_events_student_id_fkey(
        id,
        event_id,
        status,
        created_at
      )
    `)

  if (error) {
    console.error('Error fetching students with events:', error)
    throw error
  }

  return data.map((student): StudentWithEvents => {
    let orgTitle = 'N/A'
    if (student.organizations) {
      if (Array.isArray(student.organizations)) {
        if (student.organizations.length > 0 && student.organizations[0]?.title) {
          orgTitle = student.organizations[0].title
        }
      } else if (
        typeof student.organizations === 'object' &&
        student.organizations !== null &&
        'title' in student.organizations &&
        (student.organizations as any).title
      ) {
        orgTitle = (student.organizations as any).title
      }
    }

    const student_events = student.student_events?.map((se: any) => ({
      id: se.id,
      created_at: se.created_at,
      student_id: student.id,
      event_id: se.event_id,
      status: se.status
    })) || []

      return {
        ...student,
        user_id: student.user_id,
        organization: orgTitle,
        student_events,
      }
  })
}

// Fetch events with their registered students
export async function fetchEventsWithStudents(): Promise<EventWithStudents[]> {
  const { data, error } = await supabase
    .from('events')
    .select(`
      id,
      title,
      date,
      created_at,
      student_events:student_events!student_events_event_id_fkey(
        student_id,
        status,
        students:students!student_events_student_id_fkey(
          id,
          full_name,
          student_number,
          email,
          status,
          organization_id,
          organizations(title)
        )
      )
    `)

  if (error) {
    console.error('Error fetching events with students:', error)
    throw error
  }

  return data.map((event): EventWithStudents => {
    const students = event.student_events?.map((se: any) => {
      const student = se.students
      let orgTitle = 'N/A'
      if (student.organizations) {
        if (Array.isArray(student.organizations)) {
          if (student.organizations.length > 0 && student.organizations[0]?.title) {
            orgTitle = student.organizations[0].title
          }
        } else if (
          typeof student.organizations === 'object' &&
          student.organizations !== null &&
          'title' in student.organizations &&
          (student.organizations as any).title
        ) {
          orgTitle = (student.organizations as any).title
        }
      }
      return {
        ...student,
        organization: orgTitle,
      }
    }).filter(Boolean) || []

    return {
      ...event,
      students,
      student_count: students.length,
    }
  })
}



// Fetch events for a specific student
export async function fetchStudentEvents(studentId: number): Promise<Event[]> {
  const { data, error } = await supabase
    .from('student_events')
    .select(`
      status,
      events:events!student_events_event_id_fkey(
        id,
        title,
        date,
        created_at
      )
    `)
    .eq('student_id', studentId)

  if (error) {
    console.error('Error fetching student events:', error)
    throw error
  }

  return data.map((se: any) => se.events).filter(Boolean)
}

// Fetch students for a specific event
export async function fetchEventStudents(eventId: number): Promise<(StudentWithOrganization & { event_status?: string; event_present?: boolean })[]> {
  // Try selecting presence; if the column doesn't exist, fall back gracefully
  let data: any[] | null = null
  let error: any = null
  try {
    const res = await supabase
      .from('student_events')
      .select(`
        status,
        present,
        students:students!student_events_student_id_fkey(
          id,
          full_name,
          student_number,
          email,
          status,
          organization_id,
          organizations(title)
        )
      `)
      .eq('event_id', eventId)
    data = res.data as any[]
    error = res.error
  } catch (e) {
    error = e
  }

  if (error) {
    // Fall back without present
    const { data: data2, error: error2 } = await supabase
      .from('student_events')
      .select(`
        status,
        students:students!student_events_student_id_fkey(
          id,
          full_name,
          student_number,
          email,
          status,
          organization_id,
          organizations(title)
        )
      `)
      .eq('event_id', eventId)
    if (error2) {
      console.error('Error fetching event students:', error2)
      throw error2
    }
    data = data2 as any[]
  }

  return (data || []).map((se: any) => {
    const student = se.students
    let orgTitle = 'N/A'
    if (student.organizations) {
      if (Array.isArray(student.organizations)) {
        if (student.organizations.length > 0 && student.organizations[0]?.title) {
          orgTitle = student.organizations[0].title
        }
      } else if (
        typeof student.organizations === 'object' &&
        student.organizations !== null &&
        'title' in student.organizations &&
        (student.organizations as any).title
      ) {
        orgTitle = (student.organizations as any).title
      }
    }
    return {
      ...student,
      organization: orgTitle,
      // include the event-specific registration status from student_events
      event_status: se.status,
      event_present: (se as any).present ?? false,
    }
  }).filter(Boolean)
}

// Fetch student event details by user ID
export async function fetchStudentEventDetailsByUserId(userId: string): Promise<any[]> {
  // First get the student record to get the numeric student_id
  const { data: studentData, error: studentError } = await supabase
    .from('students')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (studentError || !studentData) {
    // Only log if it's an actual error, not just "no record found"
    if (studentError && studentError.code !== 'PGRST116') {
      console.error('Error fetching student record:', studentError);
    }
    // Return empty array for users without student records (admins, faculty, etc.)
    return [];
  }

  // Try select with present; fall back without if needed
  try {
    const { data, error } = await supabase
      .from('student_events')
      .select(`
        id,
        event_id,
        status,
        present,
        events:events!student_events_event_id_fkey (
          id,
          title,
          date,
          created_at
        )
      `)
      .eq('student_id', studentData.id)
      .order('created_at', { ascending: false });

    if (error) throw error
    return data || []
  } catch (e) {
    // Fallback without present
    const { data, error } = await supabase
      .from('student_events')
      .select(`
        id,
        event_id,
        status,
        events:events!student_events_event_id_fkey (
          id,
          title,
          date,
          created_at
        )
      `)
      .eq('student_id', studentData.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching student event details:', error)
      return []
    }
    return data || []
  }
}

// Leader marks student presence for an event
export async function setStudentEventPresence(
  studentId: string | number,
  eventId: number,
  present: boolean
): Promise<boolean> {
  try {
    // Check if a registration row exists
    const { data: existing, error: selErr } = await supabase
      .from('student_events')
      .select('id')
      .eq('student_id', studentId as any)
      .eq('event_id', eventId)
      .limit(1)
      .maybeSingle()

    if (selErr) {
      console.error('Error checking presence row:', selErr)
      return false
    }

    if (existing?.id) {
      // Update presence on existing row
      const { error: updErr } = await supabase
        .from('student_events')
        .update({ present })
        .eq('id', existing.id)
      if (updErr) {
        console.error('Error updating presence:', updErr)
        return false
      }
      return true
    } else {
      // Insert a new registration row (default to blocked) with presence
      const { error: insErr } = await supabase
        .from('student_events')
        .insert([{ student_id: studentId as any, event_id: eventId, status: 'blocked', present }])
      if (insErr) {
        console.error('Error inserting presence row:', insErr)
        return false
      }
      return true
    }
  } catch (e) {
    console.error('Presence toggle failed:', e)
    return false
  }
}
