import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import { useToast } from 'vue-toastification'
import { supabase } from '@/lib/supabase'
import { getErrorMessage } from '@/utils/helpers'

export interface OrganizationMember {
  id: string
  created_at: string
  updated_at: string
  student_id: string
  organization_id: string
  status: 'active' | 'inactive' | 'pending' | 'suspended'
  member_role: 'member' | 'officer' | 'secretary' | 'treasurer' | 'vice_president' 
  joined_at: string
  left_at?: string | null
  notes?: string | null
  // Joined data
  student?: {
    id: string
    user_id: string
    full_name: string | null
    student_number: string | null
    email: string | null
  }
  organization?: {
    id: string
    title: string
  }
}

export interface StudentWithOrganizations {
  id: string
  user_id: string
  full_name: string | null
  student_number: string | null
  email: string | null
  organization_memberships?: OrganizationMember[]
}

export interface OrganizationWithMembers {
  id: string
  title: string
  created_at: string
  leader_id?: string | null
  members?: OrganizationMember[]
  member_count?: number
}

export const useOrganizationMembersStore = defineStore('organizationMembers', () => {
  const toast = useToast()
  
  // Reactive state
  const loading = ref(false)
  const saving = ref(false)
  const deleting = ref(false)
  
  const members = ref<OrganizationMember[]>([])
  const availableStudents = ref<any[]>([])
  const currentOrganizationId = ref<string | null>(null)
  
  // Form data
  const memberForm = reactive({
    student_id: null as string | null,
    organization_id: null as string | null,
    status: 'active' as OrganizationMember['status'],
    member_role: 'member' as OrganizationMember['member_role'],
    notes: null as string | null
  })

  /**
   * Fetches all members for a specific organization
   */
  const fetchOrganizationMembers = async (organizationId: string): Promise<OrganizationMember[]> => {
    loading.value = true
    
    // Always set the current organization ID and clear old data
    currentOrganizationId.value = organizationId
    members.value = [] // Clear to show loading state
    
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          *,
          student:students!organization_members_student_id_fkey (
            id,
            user_id,
            full_name,
            student_number,
            email
          )
        `)
        .eq('organization_id', organizationId)
        .order('joined_at', { ascending: false })

      if (error) {
        console.error('Error fetching organization members:', error)
        toast.error(getErrorMessage(error))
        members.value = [] // Ensure it's empty on error
        return []
      }

      const formattedMembers = data?.map(member => ({
        ...member,
        student: member.student
      })) || []

      console.log(`Fetched ${formattedMembers.length} members for organization ${organizationId}:`, formattedMembers)
      members.value = formattedMembers
      return formattedMembers
    } catch (error) {
      console.error('Error fetching organization members:', error)
      toast.error(getErrorMessage(error))
      members.value = [] // Ensure it's empty on error
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetches all organizations for a specific student
   */
  const fetchStudentOrganizations = async (studentId: string): Promise<OrganizationMember[]> => {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          *,
          organization:organizations!organization_members_organization_id_fkey (
            id,
            title
          )
        `)
        .eq('student_id', studentId)
        .order('joined_at', { ascending: false })

      if (error) {
        console.error('Error fetching student organizations:', error)
        toast.error(getErrorMessage(error))
        return []
      }

      return data?.map(membership => ({
        ...membership,
        organization: membership.organization
      })) || []
    } catch (error) {
      console.error('Error fetching student organizations:', error)
      toast.error(getErrorMessage(error))
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetches students who are not members of the specified organization
   */
  const fetchAvailableStudents = async (organizationId: string) => {
    loading.value = true
    
    try {
      // First, get all student IDs who are already members of this organization
      const { data: existingMembers, error: memberError } = await supabase
        .from('organization_members')
        .select('student_id')
        .eq('organization_id', organizationId)

      if (memberError) {
        console.error('Error fetching existing members:', memberError)
        toast.error(getErrorMessage(memberError))
        return
      }

      // Extract the student IDs
      const existingMemberIds = existingMembers?.map(member => member.student_id) || []

      // Get all students, then filter out the ones who are already members
      const { data: allStudents, error: studentsError } = await supabase
        .from('students')
        .select('id, user_id, full_name, student_number, email')
        .order('full_name', { ascending: true })

      if (studentsError) {
        console.error('Error fetching students:', studentsError)
        toast.error(getErrorMessage(studentsError))
        return
      }

      // Filter out students who are already members and add display_name
      const availableStudentsData = allStudents?.filter(student => 
        !existingMemberIds.includes(student.id)
      ).map(student => ({
        ...student,
        display_name: student.full_name || student.email || 'Unknown Student'
      })) || []

      availableStudents.value = availableStudentsData
    } catch (error) {
      console.error('Error fetching available students:', error)
      toast.error(getErrorMessage(error))
    } finally {
      loading.value = false
    }
  }

  /**
   * Adds a student to an organization
   */
  const addMemberToOrganization = async (): Promise<boolean> => {
    if (!memberForm.student_id || !memberForm.organization_id) {
      toast.error('Student and organization are required')
      return false
    }

    saving.value = true
    try {
      const { error } = await supabase
        .from('organization_members')
        .insert([{
          student_id: memberForm.student_id,
          organization_id: memberForm.organization_id,
          status: memberForm.status,
          member_role: memberForm.member_role,
          notes: memberForm.notes
        }])

      if (error) {
        console.error('Error adding member to organization:', error)
        toast.error(getErrorMessage(error))
        return false
      }

      toast.success('Member added successfully!')
      return true
    } catch (error) {
      console.error('Error adding member to organization:', error)
      toast.error(getErrorMessage(error))
      return false
    } finally {
      saving.value = false
    }
  }

  /**
   * Updates a member's status or role in an organization
   */
  const updateOrganizationMember = async (memberId: string, updates: Partial<OrganizationMember>): Promise<boolean> => {
    saving.value = true
    try {
      const { error } = await supabase
        .from('organization_members')
        .update(updates)
        .eq('id', memberId)

      if (error) {
        console.error('Error updating organization member:', error)
        toast.error(getErrorMessage(error))
        return false
      }

      toast.success('Member updated successfully!')
      return true
    } catch (error) {
      console.error('Error updating organization member:', error)
      toast.error(getErrorMessage(error))
      return false
    } finally {
      saving.value = false
    }
  }

  /**
   * Removes a student from an organization (permanently deletes the record)
   */
  const removeMemberFromOrganization = async (memberId: string): Promise<boolean> => {
    deleting.value = true
    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId)

      if (error) {
        console.error('Error removing member from organization:', error)
        toast.error(getErrorMessage(error))
        return false
      }

      toast.success('Member removed successfully!')
      return true
    } catch (error) {
      console.error('Error removing member from organization:', error)
      toast.error(getErrorMessage(error))
      return false
    } finally {
      deleting.value = false
    }
  }

  /**
   * Permanently deletes a membership record
   */
  const deleteMembershipRecord = async (memberId: string): Promise<boolean> => {
    deleting.value = true
    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId)

      if (error) {
        console.error('Error deleting membership record:', error)
        toast.error(getErrorMessage(error))
        return false
      }

      toast.success('Membership record deleted successfully!')
      return true
    } catch (error) {
      console.error('Error deleting membership record:', error)
      toast.error(getErrorMessage(error))
      return false
    } finally {
      deleting.value = false
    }
  }

  /**
   * Gets member statistics for an organization
   */
  const getOrganizationMemberStats = async (organizationId: string) => {
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select('status, member_role')
        .eq('organization_id', organizationId)

      if (error) {
        console.error('Error fetching organization member stats:', error)
        return null
      }

      const stats = {
        total: data?.length || 0,
        active: data?.filter(m => m.status === 'active').length || 0,
        pending: data?.filter(m => m.status === 'pending').length || 0,
        inactive: data?.filter(m => m.status === 'inactive').length || 0,
        suspended: data?.filter(m => m.status === 'suspended').length || 0,
        roles: {
          member: data?.filter(m => m.member_role === 'member').length || 0,
          officer: data?.filter(m => m.member_role === 'officer').length || 0,
          secretary: data?.filter(m => m.member_role === 'secretary').length || 0,
          treasurer: data?.filter(m => m.member_role === 'treasurer').length || 0,
          vice_president: data?.filter(m => m.member_role === 'vice_president').length || 0
        }
      }

      return stats
    } catch (error) {
      console.error('Error getting organization member stats:', error)
      return null
    }
  }

  /**
   * Resets the member form
   */
  const resetMemberForm = () => {
    memberForm.student_id = null
    memberForm.organization_id = null
    memberForm.status = 'active'
    memberForm.member_role = 'member'
    memberForm.notes = null
  }

  /**
   * Clears all members and students data (useful when closing dialogs)
   */
  const clearMembersData = () => {
    members.value = []
    availableStudents.value = []
    currentOrganizationId.value = null
    resetMemberForm()
  }

  return {
    // State
    loading,
    saving,
    deleting,
    members,
    availableStudents,
    memberForm,
    
    // Actions
    fetchOrganizationMembers,
    fetchStudentOrganizations,
    fetchAvailableStudents,
    addMemberToOrganization,
    updateOrganizationMember,
    removeMemberFromOrganization,
    deleteMembershipRecord,
    getOrganizationMemberStats,
    resetMemberForm,
    clearMembersData
  }
})
