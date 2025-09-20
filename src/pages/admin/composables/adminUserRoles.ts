import { ref, computed, onMounted } from 'vue'
import { useUserRolesStore, type Role, type CreateRoleData, type UpdateRoleData } from '@/stores/userRoles'

export function useAdminUserRoles() {
  const userRolesStore = useUserRolesStore()

  // Local state for UI
  const isDialogOpen = ref(false)
  const isDeleteDialogOpen = ref(false)
  const isEditing = ref(false)
  const selectedRole = ref<Role | null>(null)
  const searchQuery = ref('')

  // Form data
  const formData = ref<CreateRoleData>({
    title: ''
  })

  // Computed properties
  const filteredRoles = computed(() => {
    if (!searchQuery.value) return userRolesStore.roles

    return userRolesStore.roles.filter(role =>
      role.title?.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  })

  const isFormValid = computed(() => {
    return formData.value.title.trim().length > 0
  })

  // Actions
  const openCreateDialog = () => {
    isEditing.value = false
    selectedRole.value = null
    formData.value = { title: '' }
    isDialogOpen.value = true
  }

  const openEditDialog = (role: Role) => {
    isEditing.value = true
    selectedRole.value = role
    formData.value = { title: role.title || '' }
    isDialogOpen.value = true
  }

  const openDeleteDialog = (role: Role) => {
    selectedRole.value = role
    isDeleteDialogOpen.value = true
  }

  const closeDialog = () => {
    isDialogOpen.value = false
    isDeleteDialogOpen.value = false
    selectedRole.value = null
    formData.value = { title: '' }
    userRolesStore.clearError()
  }

  const handleSubmit = async () => {
    if (!isFormValid.value) return

    let success = false

    if (isEditing.value && selectedRole.value) {
      const updateData: UpdateRoleData = { title: formData.value.title }
      const result = await userRolesStore.updateRole(selectedRole.value.id, updateData)
      success = !!result
    } else {
      const result = await userRolesStore.createRole(formData.value)
      success = !!result
    }

    if (success) {
      closeDialog()
    }
  }

  const handleDelete = async () => {
    if (!selectedRole.value) return

    const success = await userRolesStore.deleteRole(selectedRole.value.id)

    if (success) {
      closeDialog()
    }
  }

  const refreshRoles = async () => {
    await userRolesStore.fetchRoles()
  }

  // Initialize data on mount
  onMounted(() => {
    refreshRoles()
  })

  return {
    // Store state
    roles: userRolesStore.roles,
    loading: userRolesStore.loading,
    error: userRolesStore.error,

    // Local state
    isDialogOpen,
    isDeleteDialogOpen,
    isEditing,
    selectedRole,
    searchQuery,
    formData,

    // Computed
    filteredRoles,
    isFormValid,

    // Actions
    openCreateDialog,
    openEditDialog,
    openDeleteDialog,
    closeDialog,
    handleSubmit,
    handleDelete,
    refreshRoles,
    clearError: userRolesStore.clearError
  }
}
