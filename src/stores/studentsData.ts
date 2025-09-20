import { supabase } from '@/lib/supabase'

// Fetch students with organization title
export async function fetchStudents() {
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

  return data.map((student) => {
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
export async function fetchStudentStats() {
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
export async function updateStudentStatus(studentId: string, newStatus: string) {
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
