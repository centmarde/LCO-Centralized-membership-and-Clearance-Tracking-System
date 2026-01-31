<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useAuthUserStore } from '@/stores/authUser';
import { useOrganizationMembersStore, type OrganizationMember } from '@/stores/organizationMembersData';
import { fetchStudents } from '@/stores/studentsData';
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

const activeCount = computed(() => studentOrganizations.value.filter(m => m.status === 'active').length);
const pendingCount = computed(() => studentOrganizations.value.filter(m => m.status === 'pending').length);
const totalCount = computed(() => studentOrganizations.value.length);

const loadStudentOrganizations = async () => {
  loading.value = true;
  error.value = null;

  try {
    const currentUserResult = await authStore.getCurrentUser();
    if (currentUserResult.user?.id) {
      // Get student record using studentsData.ts function
      const students = await fetchStudents();
      const studentData = students.find(s => s.user_id === currentUserResult.user.id);

      if (!studentData) {
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
    color="success"
    rounded="xl"
    class="mb-4"
    border="start"
  >
    <div class="pa-4 pb-2">
      <v-row class="g-4" align="center">
        <v-col cols="12" md="7">
          <div class="d-flex align-center ga-3">
            <v-avatar color="success" variant="elevated" size="44">
              <v-icon size="22">mdi-office-building</v-icon>
            </v-avatar>
            <div>
              <div class="text-subtitle-1 font-weight-bold">Organization Member</div>
              <div class="text-body-2 text-medium-emphasis">Your active memberships and roles</div>
            </div>
          </div>
        </v-col>
        <v-col cols="12" md="5">
          <div class="d-flex flex-wrap align-center ga-3 justify-start justify-md-end">
            <v-chip color="success" variant="elevated" size="large" class="font-weight-bold">
              <v-icon start size="18">mdi-check-circle</v-icon>
              {{ activeCount }} Active
            </v-chip>
            <v-chip v-if="pendingCount" :color="getMemberStatusColor('pending')" variant="tonal" size="large">
              <v-icon start size="18">mdi-clock-outline</v-icon>
              {{ pendingCount }} Pending
            </v-chip>
            <v-chip color="primary" variant="tonal" size="large">
              <v-icon start size="18">mdi-format-list-bulleted</v-icon>
              {{ totalCount }} Total
            </v-chip>
            <v-btn
              icon="mdi-refresh"
              variant="text"
              size="small"
              :loading="loading"
              @click="loadStudentOrganizations"
            />
          </div>
        </v-col>
      </v-row>

      <v-divider class="my-2" />

      <v-row class="g-3">
        <v-col
          v-for="membership in studentOrganizations.slice(0, 3)"
          :key="membership.id"
          cols="12"
          md="4"
        >
          <v-sheet
            :color="membership.status === 'active' ? 'success-lighten-4' : 'surface-variant'"
            variant="flat"
            rounded="lg"
            elevation="1"
            class="pa-4 h-100"
          >
            <div class="d-flex align-center justify-space-between ga-3">
              <div class="d-flex align-center ga-2 flex-wrap">
                <v-chip
                  :color="getMemberStatusColor(membership.status)"
                  variant="elevated"
                  size="small"
                  class="text-capitalize font-weight-bold"
                >
                  {{ membership.organization?.title || 'Unknown' }}
                </v-chip>
                <v-chip
                  :color="getMemberRoleColor(membership.member_role)"
                  variant="tonal"
                  size="small"
                  class="text-capitalize"
                >
                  <v-icon start size="16">mdi-account-star</v-icon>
                  {{ formatMemberRoleName(membership.member_role) }}
                </v-chip>
              </div>
              <v-chip
                size="x-small"
                :color="membership.status === 'active' ? 'success-darken-1' : 'grey-lighten-3'"
                variant="tonal"
                class="text-uppercase"
              >
                {{ membership.status }}
              </v-chip>
            </div>
          </v-sheet>
        </v-col>
        <v-col v-if="studentOrganizations.length > 3" cols="12" md="4">
          <v-sheet color="surface-variant" variant="tonal" rounded="lg" elevation="1" class="pa-4 h-100">
            <div class="text-body-2 font-weight-medium text-medium-emphasis">
              +{{ studentOrganizations.length - 3 }} more organizations
            </div>
          </v-sheet>
        </v-col>
      </v-row>
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
