import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
import { supabase } from '@/lib/supabase'
import { useAuthUserStore } from '@/stores/authUser'
import { getErrorMessage } from '@/utils/helpers'

// Organization types
export interface Organization {
  id: string
  title: string
  created_at?: string
  leader_id?: string | null
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
          leader_id
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
  const createOrganization = async (organizationData: { title: string; leader_id?: string | null }): Promise<boolean> => {
    saving.value = true
    try {
      const { error } = await supabase
        .from('organizations')
        .insert([{
          title: organizationData.title,
          leader_id: organizationData.leader_id || null
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
  const updateOrganization = async (id: string, organizationData: { title: string; leader_id?: string | null }): Promise<boolean> => {
    saving.value = true
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          title: organizationData.title,
          leader_id: organizationData.leader_id || null
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
   * Deletes an organization
   */
  const deleteOrganization = async (id: string): Promise<boolean> => {
    deleting.value = true
    try {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', id)

      if (error) {
        toast.error('Failed to delete organization: ' + getErrorMessage(error))
        return false
      }

      toast.success('Organization deleted successfully!')
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