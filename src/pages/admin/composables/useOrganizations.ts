import { ref, reactive } from 'vue'
import { storeToRefs } from 'pinia'
import { useOrganizationDataStore } from '@/stores/organizationData'
import type { Organization, OrganizationLeader } from '@/stores/organizationData'

export function useOrganizations() {
  const store = useOrganizationDataStore()
  
  // Get reactive state from store using storeToRefs for reactivity
  const {
    loading,
    saving,
    deleting,
    loadingLeaders,
    organizations,
    organizationLeaders,
    organizationCount
  } = storeToRefs(store)
  
  // Local component state for form management
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
    await store.fetchOrganizations()
  }

  /**
   * Fetches available organization leaders (excluding already assigned ones)
   */
  const fetchOrganizationLeaders = async () => {
    const excludeLeaderId = editingOrganization.value?.leader_id
    await store.fetchOrganizationLeaders(excludeLeaderId)
  }

  /**
   * Saves an organization (create or update)
   */
  const saveOrganization = async (): Promise<boolean> => {
    const organizationData = {
      title: organizationForm.title,
      leader_id: organizationForm.leader_id || null
    }

    let success = false
    if (editingOrganization.value) {
      // Update existing organization
      success = await store.updateOrganization(editingOrganization.value.id, organizationData)
    } else {
      // Create new organization
      success = await store.createOrganization(organizationData)
    }

    return success
  }

  /**
   * Deletes an organization
   */
  const deleteOrganization = async (organization: Organization): Promise<boolean> => {
    return await store.deleteOrganization(organization.id)
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
    // Store state (reactive refs)
    loading,
    saving,
    deleting,
    loadingLeaders,
    organizations,
    organizationLeaders,
    organizationCount,

    // Local state
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

// Re-export types for backward compatibility
export type { Organization, OrganizationLeader }