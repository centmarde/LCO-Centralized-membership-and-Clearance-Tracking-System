import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
import { supabase } from '@/lib/supabase'
import { useAuthUserStore } from '@/stores/authUser'
import { getErrorMessage } from '@/utils/helpers'
import type { OrganizationCategory } from '@/utils/helpers'

// Organization types
export interface Organization {
  id: string
  title: string
  created_at?: string
  leader_id?: string | null
  membership_deadline?: string | null
  deleted_at?: string | null
  category?: OrganizationCategory | null
  leader?: {
    id: string
    email: string
    full_name?: string
  } | null
}

export interface OrganizationLeader {
  id: string
  email: string
  full_name?: string
  display_name: string
}

export type OrganizationStats = {
  count: number
}

export const useOrganizationDataStore = defineStore('organizationData', () => {
  const toast = useToast()
  
  // State
  const loading = ref(false)
  const saving = ref(false)
  const deleting = ref(false)
  const loadingLeaders = ref(false)
  
  const organizations = ref<Organization[]>([])
  const organizationLeaders = ref<OrganizationLeader[]>([])
  
  // Computed
  const organizationCount = computed(() => organizations.value.length)
  
  /**
   * Fetches all organizations with their leader information
   */
  const fetchOrganizations = async (): Promise<Organization[]> => {
    loading.value = true
    try {
      // Get all organizations with leader information
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select(`
          id, 
          title, 
          created_at, 
          leader_id,
          membership_deadline,
          category,
          deleted_at
        `)
        .order('created_at', { ascending: false })

      if (orgError) {
        toast.error('Failed to fetch organizations: ' + getErrorMessage(orgError))
        throw orgError
      }

      // Get all users first to match leaders
      const authStore = useAuthUserStore()
      const usersResult = await authStore.getAllUsers()
      const allUsers = usersResult.users || []

      // Map organizations with leader information
      const organizationsWithLeaders = orgData.map((org) => {
        let leader = null
        if (org.leader_id) {
          // Find the leader in the users list
          const leaderUser = allUsers.find((user: any) => user.id === org.leader_id)
          if (leaderUser) {
            leader = {
              id: leaderUser.id,
              email: leaderUser.email || '',
              full_name: leaderUser.full_name
            }
          }
        }

        return {
          id: org.id.toString(),
          title: org.title || 'Untitled Organization',
          created_at: org.created_at,
          leader_id: org.leader_id,
          membership_deadline: org.membership_deadline,
          category: org.category,
          deleted_at: org.deleted_at,
          leader
        }
      })

      organizations.value = organizationsWithLeaders
      return organizationsWithLeaders

    } catch (error: any) {
      toast.error('An unexpected error occurred while fetching organizations')
      console.error('Error:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetches available organization leaders (excluding already assigned ones)
   */
  const fetchOrganizationLeaders = async (excludeLeaderId?: string | null): Promise<OrganizationLeader[]> => {
    loadingLeaders.value = true
    try {
      // Use the auth store to get all users, then filter for Organization Leaders (role_id = 3)
      const authStore = useAuthUserStore()
      const result = await authStore.getAllUsers()
      
      if (result.error) {
        console.warn('Could not fetch users:', result.error)
        toast.error('Failed to fetch organization leaders')
        return []
      }

      // Get all organizations to find already assigned leaders
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('leader_id')
        .not('leader_id', 'is', null)

      if (orgError) {
        console.warn('Could not fetch existing organizations for leader filtering:', orgError)
      }

      // Get list of already assigned leader IDs (exclude current editing organization's leader)
      const assignedLeaderIds = orgData?.map(org => org.leader_id).filter(leaderId => {
        // If editing an organization, allow its current leader to be reselected
        return excludeLeaderId ? leaderId !== excludeLeaderId : true
      }) || []

      // Filter users with role_id 3 (Organization Leader) and exclude already assigned ones
      const allLeaders = result.users?.filter((user: any) => user.role_id === 3) || []
      const availableLeaders = allLeaders.filter((user: any) => !assignedLeaderIds.includes(user.id))
      
      const leaders = availableLeaders.map((user: any) => ({
        id: user.id,
        email: user.email || '',
        full_name: user.full_name,
        display_name: user.full_name || user.email || 'Unknown User'
      }))

      organizationLeaders.value = leaders
      console.log('Available organization leaders (excluding assigned):', leaders)
      return leaders

    } catch (error: any) {
      console.error('Error fetching organization leaders:', error)
      toast.error('An unexpected error occurred while fetching organization leaders')
      return []
    } finally {
      loadingLeaders.value = false
    }
  }

  /**
   * Creates a new organization
   */
  const createOrganization = async (organizationData: { title: string; leader_id?: string | null; membership_deadline?: string | null; category?: OrganizationCategory | null }): Promise<boolean> => {
    saving.value = true
    try {
      const { error } = await supabase
        .from('organizations')
        .insert([{
          title: organizationData.title,
          leader_id: organizationData.leader_id || null,
          membership_deadline: organizationData.membership_deadline || null,
          category: organizationData.category || null
        }])

      if (error) {
        toast.error('Failed to create organization: ' + getErrorMessage(error))
        return false
      }

      toast.success('Organization created successfully!')
      await fetchOrganizations()
      return true

    } catch (error: any) {
      toast.error('An unexpected error occurred')
      console.error('Error:', error)
      return false
    } finally {
      saving.value = false
    }
  }

  /**
   * Updates an existing organization
   */
  const updateOrganization = async (id: string, organizationData: { title: string; leader_id?: string | null; membership_deadline?: string | null; category?: OrganizationCategory | null }): Promise<boolean> => {
    saving.value = true
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          title: organizationData.title,
          leader_id: organizationData.leader_id || null,
          membership_deadline: organizationData.membership_deadline || null,
          category: organizationData.category || null
        })
        .eq('id', id)

      if (error) {
        toast.error('Failed to update organization: ' + getErrorMessage(error))
        return false
      }

      toast.success('Organization updated successfully!')
      await fetchOrganizations()
      return true

    } catch (error: any) {
      toast.error('An unexpected error occurred')
      console.error('Error:', error)
      return false
    } finally {
      saving.value = false
    }
  }

  /**
   * Soft-deletes an organization. Keeps the row for recovery, drops members, and demotes the leader to student.
   */
  const deleteOrganization = async (id: string): Promise<boolean> => {
    deleting.value = true
    try {
      // Fetch current organization to capture leader before demotion
      const existing = organizations.value.find(o => o.id === id)
      const leaderId = existing?.leader_id || null

      // Mark as deleted and clear leader_id
      const { error: updateErr } = await supabase
        .from('organizations')
        .update({
          deleted_at: new Date().toISOString(),
          leader_id: null
        })
        .eq('id', id)

      if (updateErr) {
        toast.error('Failed to delete organization: ' + getErrorMessage(updateErr))
        return false
      }

      // Remove all members tied to this organization
      const { error: membersErr } = await supabase
        .from('organization_members')
        .delete()
        .eq('organization_id', id)

      if (membersErr) {
        console.warn('Failed to remove organization members on delete:', membersErr)
      }

      // Demote leader to student (role_id = 2)
      if (leaderId) {
        try {
          const authStore = useAuthUserStore()
          await authStore.updateUser(leaderId, { role_id: 2 })
        } catch (demoteErr) {
          console.warn('Failed to demote organization leader to student:', demoteErr)
        }
      }

      toast.success('Organization moved to deleted and members cleared.')
      await fetchOrganizations()
      return true

    } catch (error: any) {
      toast.error('An unexpected error occurred while deleting organization')
      console.error('Error:', error)
      return false
    } finally {
      deleting.value = false
    }
  }

  /**
   * Restores a soft-deleted organization
   */
  const restoreOrganization = async (id: string): Promise<boolean> => {
    saving.value = true
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ deleted_at: null })
        .eq('id', id)

      if (error) {
        toast.error('Failed to restore organization: ' + getErrorMessage(error))
        return false
      }

      toast.success('Organization restored. Assign a leader and add members as needed.')
      await fetchOrganizations()
      return true
    } catch (error: any) {
      toast.error('An unexpected error occurred while restoring organization')
      console.error('Error:', error)
      return false
    } finally {
      saving.value = false
    }
  }

  /**
   * Permanently deletes an organization record
   */
  const hardDeleteOrganization = async (id: string): Promise<boolean> => {
    deleting.value = true
    try {
      // Clean up members first (idempotent if already cleared)
      const { error: membersErr } = await supabase
        .from('organization_members')
        .delete()
        .eq('organization_id', id)

      if (membersErr) {
        console.warn('Failed to remove organization members before hard delete:', membersErr)
      }

      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', id)

      if (error) {
        toast.error('Failed to permanently delete organization: ' + getErrorMessage(error))
        return false
      }

      toast.success('Organization permanently deleted.')
      await fetchOrganizations()
      return true
    } catch (error: any) {
      toast.error('An unexpected error occurred while permanently deleting organization')
      console.error('Error:', error)
      return false
    } finally {
      deleting.value = false
    }
  }

  /**
   * Get organization stats (count)
   */
  const fetchOrganizationStats = async (): Promise<number> => {
    try {
      const { count: orgCount, error } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })

      if (error) throw error
      return orgCount || 0
    } catch (error) {
      console.error('Error fetching organization stats:', error)
      return 0
    }
  }

  /**
   * Find organization by ID
   */
  const findOrganizationById = (id: string): Organization | undefined => {
    return organizations.value.find(org => org.id === id)
  }

  return {
    // State
    loading,
    saving,
    deleting,
    loadingLeaders,
    organizations,
    organizationLeaders,
    
    // Computed
    organizationCount,
    
    // Actions
    fetchOrganizations,
    fetchOrganizationLeaders,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    restoreOrganization,
    hardDeleteOrganization,
    fetchOrganizationStats,
    findOrganizationById
  }
})

// Legacy export functions for backward compatibility
export async function fetchOrganizations(): Promise<Organization[]> {
  const store = useOrganizationDataStore()
  return await store.fetchOrganizations()
}

export async function fetchOrganizationStats(): Promise<number> {
  const store = useOrganizationDataStore()
  return await store.fetchOrganizationStats()
}