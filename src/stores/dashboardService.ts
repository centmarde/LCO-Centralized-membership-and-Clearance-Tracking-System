import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useToast } from 'vue-toastification'

// ✅ Fix: alias the relation
export async function fetchStudents() {
  const { data, error } = await supabase
    .from("students")
    .select(`
      id,
      full_name,
      student_number,
      email,
      status,
      organization_id,
      organizations( title)
    `)

  if (error) {
    console.error("Error fetching students:", error)
    throw error
  }

  return data.map((student) => {
    let orgTitle = "N/A";
    if (student.organizations) {
      if (Array.isArray(student.organizations)) {
        if (student.organizations.length > 0 && student.organizations[0]?.title) {
          orgTitle = student.organizations[0].title;
        }
      } else if (
        typeof student.organizations === 'object' &&
        student.organizations !== null &&
        'title' in student.organizations &&
        (student.organizations as any).title
      ) {
        orgTitle = (student.organizations as any).title;
      }
    }
    return {
      ...student,
      organization: orgTitle,
    };
  })
}

// Fetch all organizations
export async function fetchOrganizations() {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, title")

  if (error) throw error
  return data || []
}

// Stats
export async function fetchStats() {
  const { data: students, error: studentError } = await supabase
    .from("students")
    .select("status")

  if (studentError) throw studentError

  const { count: orgCount, error: orgError } = await supabase
    .from("organizations")
    .select("*", { count: "exact", head: true })

  if (orgError) throw orgError

  const total = students.length
  const active = students.filter((s) => s.status === "Active").length
  const blocked = students.filter((s) => s.status === "Blocked").length

  return {
    total,
    active,
    blocked,
    organizations: orgCount || 0,
  }
}
