import { storeToRefs } from 'pinia'
import { useOrganizationMembersStore } from '@/stores/organizationMembersData'
import type { OrganizationMember, StudentWithOrganizations, OrganizationWithMembers } from '@/stores/organizationMembersData'

export { type OrganizationMember, type StudentWithOrganizations, type OrganizationWithMembers }

/**
 * Composable wrapper for the organization members store
 * This provides the same API as before but uses the centralized store
 */
export function useOrganizationMembers() {
  const store = useOrganizationMembersStore()
  
  // Use storeToRefs to maintain reactivity when destructuring
  const {
    loading,
    saving,
    deleting,
    members,
    availableStudents,
    memberForm,
    organizationEvents
  } = storeToRefs(store)

  return {
    // State - with proper reactivity
    loading,
    saving,
    deleting,
    members,
    availableStudents,
  memberForm,
  organizationEvents,
    
    // Actions - directly from store
    fetchOrganizationMembers: store.fetchOrganizationMembers,
    fetchStudentOrganizations: store.fetchStudentOrganizations,
    fetchAvailableStudents: store.fetchAvailableStudents,
  fetchOrganizationEvents: store.fetchOrganizationEvents,
    addMemberToOrganization: store.addMemberToOrganization,
    updateOrganizationMember: store.updateOrganizationMember,
    removeMemberFromOrganization: store.removeMemberFromOrganization,
    deleteMembershipRecord: store.deleteMembershipRecord,
    getOrganizationMemberStats: store.getOrganizationMemberStats,
    resetMemberForm: store.resetMemberForm,
    clearMembersData: store.clearMembersData
    ,
    // New helpers for member event management
    fetchMemberEventsByUserId: store.fetchMemberEventsByUserId,
    setMemberEventStatus: store.setMemberEventStatus,
    blockAllMembersForEvent: store.blockAllMembersForEvent
  }
}