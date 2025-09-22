import { supabase } from '@/lib/supabase'

// Student types
export type StudentStatus = {
  status: 'Active' | 'Blocked' | 'Inactive'
}

export type StudentBase = {
  id: string
  user_id: string | null
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
      student_events(
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
      user_id: student.user_id ?? null,
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
      student_events(
        student_id,
        status,
        students(
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
      events(
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
export async function fetchEventStudents(eventId: number): Promise<StudentWithOrganization[]> {
  const { data, error } = await supabase
    .from('student_events')
    .select(`
      students(
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

  if (error) {
    console.error('Error fetching event students:', error)
    throw error
  }

  return data.map((se: any) => {
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
  }).filter(Boolean)
}
