import { ref } from 'vue'

interface ToastMessage {
  id: number
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  timeout?: number
}

const toasts = ref<ToastMessage[]>([])
let toastIdCounter = 0

export const useToast = () => {
  const show = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', timeout = 3000) => {
    const id = ++toastIdCounter
    const toast: ToastMessage = { id, message, type, timeout }

    toasts.value.push(toast)

    if (timeout > 0) {
      setTimeout(() => {
        remove(id)
      }, timeout)
    }

    return id
  }

  const remove = (id: number) => {
    const index = toasts.value.findIndex(toast => toast.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  const clear = () => {
    toasts.value = []
  }

  const success = (message: string, timeout?: number) => show(message, 'success', timeout)
  const error = (message: string, timeout?: number) => show(message, 'error', timeout)
  const warning = (message: string, timeout?: number) => show(message, 'warning', timeout)
  const info = (message: string, timeout?: number) => show(message, 'info', timeout)

  return {
    toasts: toasts,
    show,
    remove,
    clear,
    success,
    error,
    warning,
    info
  }
}
