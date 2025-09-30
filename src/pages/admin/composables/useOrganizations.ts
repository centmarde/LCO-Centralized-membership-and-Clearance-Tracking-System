import { ref, reactive } from 'vue'
import { useToast } from 'vue-toastification'
import { supabase } from '@/lib/supabase'
import { useAuthUserStore } from '@/stores/authUser'
import { getErrorMessage } from '@/utils/helpers'

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

export function useOrganizations() {
  const toast = useToast()
  
  // Reactive state
  const loading = ref(false)
  const saving = ref(false)
  const deleting = ref(false)
  const loadingLeaders = ref(false)
  
  const organizations = ref<Organization[]>([])
  const organizationLeaders = ref<OrganizationLeader[]>([])
  const editingOrganization = ref<Organization | null>(null)
  const organizationToDelete = ref<Organization | null>(null)
  
  // Form data
  const organizationForm = reactive({
    title: '',
    leader_id: null as string | null
  })

  /**
   * Fetches all organizations with their leader information
   */
  const fetchOrganizations = async () => {
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
        return
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

    } catch (error) {
      toast.error('An unexpected error occurred while fetching organizations')
      console.error('Error:', error)
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetches available organization leaders (excluding already assigned ones)
   */
  const fetchOrganizationLeaders = async () => {
    loadingLeaders.value = true
    try {
      // Use the auth store to get all users, then filter for Organization Leaders (role_id = 3)
      const authStore = useAuthUserStore()
      const result = await authStore.getAllUsers()
      
      if (result.error) {
        console.warn('Could not fetch users:', result.error)
        toast.error('Failed to fetch organization leaders')
        return
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
        return editingOrganization.value ? leaderId !== editingOrganization.value.leader_id : true
      }) || []

      // Filter users with role_id 3 (Organization Leader) and exclude already assigned ones
      const allLeaders = result.users?.filter((user: any) => user.role_id === 3) || []
      const availableLeaders = allLeaders.filter((user: any) => !assignedLeaderIds.includes(user.id))
      
      organizationLeaders.value = availableLeaders.map((user: any) => ({
        id: user.id,
        email: user.email || '',
        full_name: user.full_name,
        display_name: user.full_name || user.email || 'Unknown User'
      }))

      console.log('Available organization leaders (excluding assigned):', organizationLeaders.value)

    } catch (error) {
      console.error('Error fetching organization leaders:', error)
      toast.error('An unexpected error occurred while fetching organization leaders')
    } finally {
      loadingLeaders.value = false
    }
  }

  /**
   * Saves an organization (create or update)
   */
  const saveOrganization = async () => {
    saving.value = true
    try {
      const organizationData = {
        title: organizationForm.title,
        leader_id: organizationForm.leader_id || null
      }

      let result
      if (editingOrganization.value) {
        // Update existing organization
        result = await supabase
          .from('organizations')
          .update(organizationData)
          .eq('id', editingOrganization.value.id)
      } else {
        // Create new organization
        result = await supabase
          .from('organizations')
          .insert([organizationData])
      }

      if (result.error) {
        toast.error(`Failed to ${editingOrganization.value ? 'update' : 'create'} organization: ` + getErrorMessage(result.error))
        return false
      }

      toast.success(`Organization ${editingOrganization.value ? 'updated' : 'created'} successfully!`)
      await fetchOrganizations()
      return true

    } catch (error) {
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
  const deleteOrganization = async (organization: Organization) => {
    deleting.value = true
    try {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', organization.id)

      if (error) {
        toast.error('Failed to delete organization: ' + getErrorMessage(error))
        return false
      }

      toast.success('Organization deleted successfully!')
      await fetchOrganizations()
      return true

    } catch (error) {
      toast.error('An unexpected error occurred while deleting organization')
      console.error('Error:', error)
      return false
    } finally {
      deleting.value = false
    }
  }

  /**
   * Prepares the form for creating a new organization
   */
  const prepareCreateOrganization = () => {
    editingOrganization.value = null
    organizationForm.title = ''
    organizationForm.leader_id = null
    fetchOrganizationLeaders()
  }

  /**
   * Prepares the form for editing an existing organization
   */
  const prepareEditOrganization = (organization: Organization) => {
    editingOrganization.value = organization
    organizationForm.title = organization.title
    organizationForm.leader_id = organization.leader_id || null
    fetchOrganizationLeaders()
  }

  /**
   * Prepares an organization for deletion
   */
  const prepareDeleteOrganization = (organization: Organization) => {
    organizationToDelete.value = organization
  }

  /**
   * Resets the form and editing state
   */
  const resetForm = () => {
    editingOrganization.value = null
    organizationForm.title = ''
    organizationForm.leader_id = null
  }

  return {
    // State
    loading,
    saving,
    deleting,
    loadingLeaders,
    organizations,
    organizationLeaders,
    editingOrganization,
    organizationToDelete,
    organizationForm,

    // Actions
    fetchOrganizations,
    fetchOrganizationLeaders,
    saveOrganization,
    deleteOrganization,
    prepareCreateOrganization,
    prepareEditOrganization,
    prepareDeleteOrganization,
    resetForm
  }
}