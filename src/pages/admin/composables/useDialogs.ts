import { ref } from 'vue'

export function useDialogs() {
  // Dialog states
  const dialog = ref(false)
  const deleteDialog = ref(false)
  const formValid = ref(false)
  const formRef = ref()
  const search = ref('')

  /**
   * Opens the create/edit dialog
   */
  const openDialog = () => {
    dialog.value = true
  }

  /**
   * Closes the create/edit dialog and resets validation
   */
  const closeDialog = () => {
    dialog.value = false
    formRef.value?.resetValidation()
  }

  /**
   * Opens the delete confirmation dialog
   */
  const openDeleteDialog = () => {
    deleteDialog.value = true
  }

  /**
   * Closes the delete confirmation dialog
   */
  const closeDeleteDialog = () => {
    deleteDialog.value = false
  }

  return {
    // State
    dialog,
    deleteDialog,
    formValid,
    formRef,
    search,

    // Actions
    openDialog,
    closeDialog,
    openDeleteDialog,
    closeDeleteDialog
  }
}