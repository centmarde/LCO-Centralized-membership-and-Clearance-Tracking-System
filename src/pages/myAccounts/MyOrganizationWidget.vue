<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useAuthUserStore } from '@/stores/authUser';
import { useOrganizationMembersStore, type OrganizationMember } from '@/stores/organizationMembersData';
import { supabase } from '@/lib/supabase';
import { getMemberStatusColor, getMemberRoleColor, formatMemberRoleName } from '@/utils/helpers';

const authStore = useAuthUserStore();
const organizationMembersStore = useOrganizationMembersStore();

const studentOrganizations = ref<OrganizationMember[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

// Computed property to check if user has any organization
const hasOrganization = computed(() => {
  return studentOrganizations.value.length > 0;
});

const loadStudentOrganizations = async () => {
  loading.value = true;
  error.value = null;

  try {
    const currentUserResult = await authStore.getCurrentUser();
    if (currentUserResult.user?.id) {
      // Get student record first
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', currentUserResult.user.id)
        .single();

      if (studentError || !studentData) {
        console.log('No student record found for current user');
        studentOrganizations.value = [];
        return;
      }

      // Fetch student's organizations using the store
      const organizations = await organizationMembersStore.fetchStudentOrganizations(studentData.id);
      studentOrganizations.value = organizations;
    }
  } catch (err: any) {
    console.error('Error loading student organizations:', err);
    error.value = err.message || 'Failed to load organization data.';
    studentOrganizations.value = [];
  } finally {
    loading.value = false;
  }
};

// Expose the refresh function to parent component
defineExpose({
  refresh: loadStudentOrganizations
});

onMounted(() => {
  loadStudentOrganizations();
});
</script>

<template>
  <!-- Minimal Organization Banner -->
  <v-alert
    v-if="!loading && hasOrganization"
    variant="tonal"
    :color="studentOrganizations.some(m => m.status === 'active') ? 'success' : 'warning'"
    rounded="lg"
    class="mb-4"
    border="start"
  >
    <template #prepend>
      <v-icon size="24">mdi-office-building</v-icon>
    </template>

    <div class="d-flex flex-column flex-sm-row align-start align-sm-center justify-space-between">
      <div class="flex-grow-1">
        <div class="text-body-2 font-weight-bold mb-1">
          Organization Member
        </div>
        <div class="text-caption text-sm-body-2 d-flex flex-wrap ga-2">
          <span v-for="(membership, index) in studentOrganizations.slice(0, 2)" :key="membership.id" class="d-flex align-center ga-1 mb-1">
            <v-chip
              :color="getMemberStatusColor(membership.status)"
              variant="elevated"
              size="x-small"
              class="text-capitalize"
            >
              {{ membership.organization?.title || 'Unknown' }}
            </v-chip>
            <v-chip
              :color="getMemberRoleColor(membership.member_role)"
              variant="tonal"
              size="x-small"
              class="text-capitalize"
            >
              <v-icon start size="12">mdi-account-star</v-icon>
              {{ formatMemberRoleName(membership.member_role) }}
            </v-chip>
          </span>
          <span v-if="studentOrganizations.length > 2" class="text-caption text-medium-emphasis align-self-center">
            +{{ studentOrganizations.length - 2 }} more
          </span>
        </div>
      </div>

      <div class="d-flex align-center ga-2 mt-2 mt-sm-0">
        <v-chip
          :color="studentOrganizations.filter(m => m.status === 'active').length > 0 ? 'success' : 'warning'"
          size="small"
          variant="elevated"
        >
          {{ studentOrganizations.filter(m => m.status === 'active').length }} Active
        </v-chip>

        <v-btn
          v-if="studentOrganizations.filter(m => m.status === 'pending').length > 0"
          :color="getMemberStatusColor('pending')"
          size="small"
          variant="outlined"
          disabled
        >
          {{ studentOrganizations.filter(m => m.status === 'pending').length }} Pending
        </v-btn>

        <v-btn
          icon="mdi-refresh"
          variant="text"
          size="small"
          :loading="loading"
          @click="loadStudentOrganizations"
          class="d-none d-sm-flex"
        />
      </div>
    </div>
  </v-alert>

  <!-- No Organizations Banner -->
  <v-alert
    v-else-if="!loading && !hasOrganization && !error"
    type="info"
    variant="tonal"
    rounded="lg"
    class="mb-4"
    border="start"
  >
    <template #prepend>
      <v-icon size="24">mdi-account-group-outline</v-icon>
    </template>
    <div class="d-flex flex-column flex-sm-row align-start align-sm-center justify-space-between">
      <div class="flex-grow-1">
        <div class="text-body-2 font-weight-bold mb-1">No Organization Membership</div>
        <div class="text-caption text-sm-body-2">
          Contact your organizational leader to request membership.
        </div>
      </div>
      <v-btn
        icon="mdi-refresh"
        variant="text"
        size="small"
        :loading="loading"
        @click="loadStudentOrganizations"
        class="mt-2 mt-sm-0"
      />
    </div>
  </v-alert>

  <!-- Loading Banner -->
  <v-alert
    v-else-if="loading"
    type="info"
    variant="tonal"
    rounded="lg"
    class="mb-4"
    border="start"
  >
    <template #prepend>
      <v-progress-circular
        indeterminate
        color="primary"
        size="20"
        width="2"
      />
    </template>
    <div class="text-body-2">Loading organization data...</div>
  </v-alert>

  <!-- Error Banner -->
  <v-alert
    v-else-if="error"
    type="error"
    variant="tonal"
    rounded="lg"
    class="mb-4"
    border="start"
  >
    <template #prepend>
      <v-icon size="24">mdi-alert-circle</v-icon>
    </template>
    <div class="d-flex flex-column flex-sm-row align-start align-sm-center justify-space-between">
      <div class="flex-grow-1">
        <div class="text-body-2 font-weight-bold mb-1">Failed to load organizations</div>
        <div class="text-caption">{{ error }}</div>
      </div>
      <v-btn
        color="error"
        variant="outlined"
        size="small"
        @click="loadStudentOrganizations"
        prepend-icon="mdi-refresh"
        class="mt-2 mt-sm-0"
      >
        Retry
      </v-btn>
    </div>
  </v-alert>
</template>
