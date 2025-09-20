import { supabase } from '@/lib/supabase'

// Student types
export type StudentStatus = {
  status: 'Active' | 'Blocked' | 'Inactive'
}

export type StudentBase = {
  id: string
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

// Fetch students with organization title
export async function fetchStudents(): Promise<StudentWithOrganization[]> {
  const { data, error } = await supabase
    .from('students')
    .select(`
      id,
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
