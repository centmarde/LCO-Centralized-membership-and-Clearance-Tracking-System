
<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import InnerLayoutWrapper from '@/layouts/InnerLayoutWrapper.vue'
import { useAuthUserStore } from '@/stores/authUser'
import { useToast } from '@/composables/useToast'
import { supabaseAdmin } from '@/lib/supabase'
import { getRoleText, formatDate, getUserDisplayName, getStatusText, getEmailInitials, getRoleColor, getStatusColor } from '@/utils/helpers'


// Stores and composables
const authStore = useAuthUserStore()
const { toasts, success, error, remove: removeToast } = useToast()

// Reactive data
const isEditing = ref(false)
const loading = ref(false)
const formValid = ref(false)
const profileForm = ref()

// Profile data interface
interface ProfileData {
  full_name: string
  email: string
  student_number: string
  role_id: number | null
  status: string
  created_at: string
  user_id: string
}

// Profile data
const profileData = ref<ProfileData>({
  full_name: '',
  email: '',
  student_number: '',
  role_id: null,
  status: '',
  created_at: '',
  user_id: ''
})

const originalData = ref<ProfileData>({
  full_name: '',
  email: '',
  student_number: '',
  role_id: null,
  status: '',
  created_at: '',
  user_id: ''
})

// Computed properties
const isStudent = computed(() => profileData.value.role_id === 2)

const userInitials = computed(() => {
  // Try to get initials from full name first
  const fullName = profileData.value.full_name
  if (fullName && fullName.trim()) {
    const nameParts = fullName.split(' ').filter((part: string) => part.length > 0)
    if (nameParts.length >= 2) {
      return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
    } else if (nameParts.length === 1) {
      return nameParts[0].substring(0, 2).toUpperCase()
    }
  }

  // Fall back to email-based initials
  return getEmailInitials(profileData.value.email)
})

const avatarColor = computed(() => {
  return getRoleColor(profileData.value.role_id)
})

// Form validation rules
const rules = {
  required: (value: string) => !!value || 'This field is required'
}

// Methods
const getRoleName = (roleId: number | null) => {
  return getRoleText(roleId)
}

// Profile update function using Supabase Admin
const updateUserProfile = async (userId: string, profileUpdates: {
  full_name?: string
  student_number?: string
}) => {
  try {
    // Update auth user metadata
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        user_metadata: {
          ...authStore.userData?.user_metadata,
          full_name: profileUpdates.full_name
        }
      }
    )

    if (authError) {
      throw new Error(`Auth update failed: ${authError.message}`)
    }

    // Update students table if user is a student and we have student data
    if (isStudent.value && profileUpdates.student_number !== undefined) {
      const { error: studentError } = await supabaseAdmin
        .from("students")
        .update({
          full_name: profileUpdates.full_name,
          student_number: profileUpdates.student_number || null
        })
        .eq("user_id", userId)

      if (studentError) {
        throw new Error(`Student update failed: ${studentError.message}`)
      }
    }

    return { success: true }
  } catch (err) {
    console.error('Profile update error:', err)
    return { error: err }
  }
}

// Complete data refresh function
const refreshAllData = async () => {
  try {
    console.log('Refreshing all user data...')

    // Show loading state during refresh
    loading.value = true

    // Refresh auth store data
    await authStore.initializeAuth()

    // Small delay to ensure auth data is updated
    await new Promise(resolve => setTimeout(resolve, 500))

    // Reload user profile with fresh data
    await loadUserProfile()

    // Refresh user list in authStore to update cached data
    if (authStore.userData?.user_metadata?.role === 1) {
      // Only refresh all users if current user is admin
      await authStore.getAllUsers()
    }

    console.log('Data refresh completed')
  } catch (err) {
    console.error('Error refreshing data:', err)
    error('Error refreshing profile data')
  } finally {
    loading.value = false
  }
}

// Force component refresh
const forceComponentRefresh = () => {
  // Trigger reactivity by updating a key or forcing re-computation
  console.log('Forcing component refresh...')

  // Force computed properties to recalculate
  const tempData = { ...profileData.value }
  profileData.value = {} as ProfileData
  nextTick(() => {
    profileData.value = tempData
  })
}

const loadUserProfile = async () => {
  if (loading.value) return // Prevent multiple concurrent loads

  loading.value = true
  try {
    console.log('Loading user profile...')

    // Get current user data
    const result = await authStore.getCurrentUser()

    if (result.error || !result.user) {
      error('Failed to load user profile')
      return
    }

    const user = result.user
    console.log('Current user loaded:', user.id)

    // If user is a student, get additional student data
    if (user.user_metadata?.role === 2) {
      console.log('Loading student data...')
      // Get all users to find student data
      const usersResult = await authStore.getAllUsers()
      if (usersResult.users) {
        const currentUserData = usersResult.users.find(u => u.id === user.id)
        if (currentUserData) {
          profileData.value = {
            full_name: currentUserData.full_name || user.user_metadata?.full_name || '',
            email: user.email || '',
            student_number: currentUserData.student_number || '',
            role_id: user.user_metadata?.role || currentUserData.role_id,
            status: currentUserData.status || '',
            created_at: user.created_at || '',
            user_id: user.id
          }
          console.log('Student profile loaded:', profileData.value)
        }
      }
    } else {
      // For non-students, just use auth data
      profileData.value = {
        full_name: user.user_metadata?.full_name || '',
        email: user.email || '',
        student_number: '',
        role_id: user.user_metadata?.role,
        status: '',
        created_at: user.created_at || '',
        user_id: user.id
      }
      console.log('Non-student profile loaded:', profileData.value)
    }

    // Store original data for cancel functionality
    originalData.value = { ...profileData.value }

    console.log('Profile data loaded successfully')

  } catch (err) {
    console.error('Error loading profile data:', err)
    error('Error loading profile data')
  } finally {
    loading.value = false
  }
}

const toggleEdit = () => {
  console.log('Toggling edit mode from:', isEditing.value, 'to:', !isEditing.value)
  isEditing.value = !isEditing.value
  if (isEditing.value) {
    // Store original data when starting to edit
    originalData.value = { ...profileData.value }
    console.log('Edit mode enabled, original data stored:', originalData.value)
  }
}

const cancelEdit = () => {
  // Restore original data
  console.log('Canceling edit, restoring original data:', originalData.value)
  profileData.value = { ...originalData.value }
  isEditing.value = false
}

const saveProfile = async () => {
  if (!profileForm.value) return

  const { valid } = await profileForm.value.validate()
  if (!valid) {
    error('Please fill in all required fields')
    return
  }

  loading.value = true
  try {
    console.log('Saving profile for user:', profileData.value.user_id)
    console.log('Profile data:', profileData.value)

    // Use the new updateUserProfile function
    const updateResult = await updateUserProfile(profileData.value.user_id, {
      full_name: profileData.value.full_name,
      student_number: profileData.value.student_number
    })

    if (updateResult.error) {
      const errorMsg = updateResult.error instanceof Error ? updateResult.error.message : 'Unknown error'
      error('Failed to update profile: ' + errorMsg)
      return
    }

    // Update the current user data in store
    if (authStore.userData) {
      authStore.userData.user_metadata = {
        ...authStore.userData.user_metadata,
        full_name: profileData.value.full_name
      }
    }

    success('Profile updated successfully')
    isEditing.value = false

    // Store new original data
    originalData.value = { ...profileData.value }

    // Comprehensive data refresh
    await refreshAllData()

    // Force reactivity update
    await nextTick()
    forceComponentRefresh()

    console.log('Profile save completed with full data refresh')

  } catch (err) {
    console.error('Profile update error:', err)
    error('Error updating profile')
  } finally {
    loading.value = false
  }
}

// Watch for auth store changes
watch(() => authStore.userData, (newData) => {
  if (newData && !isEditing.value) {
    loadUserProfile()
  }
}, { immediate: true })

// Lifecycle
onMounted(() => {
  loadUserProfile()
})
</script>

<template>
  <InnerLayoutWrapper>
		 <template #content>
  <div class="profiles-view">
    <v-container>
      <v-row>
        <v-col cols="12">
          <v-card class="profile-card my-5">
            <v-card-title class="d-flex align-center">
              <v-icon left class="mr-2">mdi-account-circle</v-icon>
              My Profile
              <v-spacer />

              <!-- Refresh Button -->
              <v-btn
                v-if="!isEditing"
                icon
                @click="refreshAllData"
                :loading="loading"
                class="mr-2"
                title="Refresh profile data"
              >
                <v-icon>mdi-refresh</v-icon>
              </v-btn>

              <!-- Edit Button -->
              <v-btn
                v-if="!isEditing"
                color="primary"
                @click="toggleEdit"
                :disabled="loading"
              >
                <v-icon left>mdi-pencil</v-icon>
                Edit Profile
              </v-btn>

              <!-- Save/Cancel Buttons when editing -->
              <div v-else class="d-flex gap-2">
                <v-btn
                  color="success"
                  @click="saveProfile"
                  :loading="loading"
                >
                  <v-icon left>mdi-check</v-icon>
                  Save
                </v-btn>
                <v-btn
                  color="grey"
                  variant="outlined"
                  @click="cancelEdit"
                  :disabled="loading"
                >
                  <v-icon left>mdi-close</v-icon>
                  Cancel
                </v-btn>
              </div>
            </v-card-title>

            <v-card-text>
              <v-row>
                <!-- Left Column: Profile Avatar and Info -->
                <v-col cols="12" md="4" lg="3" class="profile-info-section">
                  <div class="text-center position-relative">
                    <!-- Loading overlay for profile section -->
                    <v-overlay
                      v-model="loading"
                      contained
                      class="d-flex align-center justify-center"
                    >
                      <v-progress-circular
                        color="primary"
                        indeterminate
                        size="40"
                      />
                    </v-overlay>

                    <v-avatar
                      size="120"
                      :color="avatarColor"
                      class="mb-4"
                    >
                      <span class="text-white font-weight-bold text-h4">
                        {{ userInitials }}
                      </span>
                    </v-avatar>
                    <h2 class="text-h6 mb-2">{{ profileData.full_name || profileData.email }}</h2>
                    <p class="text-subtitle-2 text-grey-600 mb-2">{{ getRoleName(profileData.role_id) }}</p>
                    <v-chip
                      v-if="isStudent && profileData.status"
                      :color="getStatusColor(profileData.status)"
                      size="small"
                      variant="flat"
                      class="mb-3"
                    >
                      {{ getStatusText(profileData.status) }}
                    </v-chip>

                    <!-- Quick Info Cards -->
                    <div class="mt-4">
                      <v-card variant="outlined" class="mb-2 pa-2 info-card">
                        <div class="text-caption text-grey-600">Member Since</div>
                        <div class="text-body-2 font-weight-medium">{{ formatDate(profileData.created_at) }}</div>
                      </v-card>


                    </div>
                  </div>
                </v-col>

                <!-- Right Column: Form Fields -->
                <v-col cols="12" md="8" lg="9" class="form-section">
                  <v-form ref="profileForm" v-model="formValid">
                    <v-row>
                      <!-- Full Name -->
                      <v-col cols="12">
                        <v-text-field
                          v-model="profileData.full_name"
                          label="Full Name"
                          :readonly="!isEditing"
                          :rules="[rules.required]"
                          prepend-inner-icon="mdi-account"
                          variant="outlined"
                        />
                      </v-col>

                      <!-- Email -->
                      <v-col cols="12">
                        <v-text-field
                          v-model="profileData.email"
                          label="Email"
                          readonly
                          prepend-inner-icon="mdi-email"
                          hint="Email cannot be changed"
                          persistent-hint
                          variant="outlined"
                        />
                      </v-col>

                      <!-- Student Number (if user is a student) -->
                      <v-col v-if="isStudent" cols="12">
                        <v-text-field
                          v-model="profileData.student_number"
                          label="Student Number"
                          :readonly="!isEditing"
                          prepend-inner-icon="mdi-school"
                          variant="outlined"
                        />
                      </v-col>

                      <!-- Role -->
                      <v-col cols="12" md="6">
                        <v-text-field
                          :value="getRoleName(profileData.role_id)"
                          label="Role"
                          readonly
                          prepend-inner-icon="mdi-account-key"
                          hint="Role cannot be changed"
                          persistent-hint
                          variant="outlined"
                        />
                      </v-col>

                      <!-- Status (if user is a student) -->
                      <v-col v-if="isStudent" cols="12" md="6">
                        <v-text-field
                          :value="getStatusText(profileData.status)"
                          label="Status"
                          readonly
                          prepend-inner-icon="mdi-information"
                          hint="Status is managed by administrators"
                          persistent-hint
                          variant="outlined"
                        />
                      </v-col>
                    </v-row>
                  </v-form>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Toast notifications -->
      <div class="toast-container">
        <v-alert
          v-for="toast in toasts"
          :key="toast.id"
          :type="toast.type"
          closable
          class="toast-alert"
          @click:close="removeToast(toast.id)"
        >
          {{ toast.message }}
        </v-alert>
      </div>
    </v-container>
  </div>
	</template>
	</InnerLayoutWrapper>
</template>


<style scoped>
.profiles-view {
  min-height: 100vh;
  padding: 20px;
}

.profile-card {
  max-width: 1000px;
  margin: 0 auto;
  overflow: hidden;
}

.profile-card .v-avatar {
  border: 4px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

/* Left column styling */
.profile-info-section {
  position: sticky;
  top: 20px;
}

.position-relative {
  position: relative;
  min-height: 200px;
}

@media (min-width: 960px) {
  .profile-card .v-col:first-child {
    border-right: 1px solid rgba(0, 0, 0, 0.12);
    padding-right: 24px;
  }
}

/* Info cards styling */
.info-card {
  background: rgba(var(--v-theme-surface-variant), 0.1);
}

/* Form section styling */
.form-section {
  padding-left: 0;
}

@media (min-width: 960px) {
  .form-section {
    padding-left: 24px;
  }
}

/* Responsive adjustments */
@media (max-width: 959px) {
  .profile-card .v-col:first-child {
    border-bottom: 1px solid rgba(0, 0, 0, 0.12);
    padding-bottom: 24px;
    margin-bottom: 24px;
  }
}

.toast-container {
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 9999;
  max-width: 400px;
}

.toast-alert {
  margin-bottom: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.gap-2 {
  gap: 8px;
}
</style>
