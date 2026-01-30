
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import InnerLayoutWrapper from '@/layouts/InnerLayoutWrapper.vue';
import MyOrganizationWidget from './MyOrganizationWidget.vue';
import { useAuthUserStore } from '@/stores/authUser';
import { useOrganizationMembersStore } from '@/stores/organizationMembersData';
import { loadBlockedEvents } from '@/stores/eventsData';
import { fetchStudents } from '@/stores/studentsData';
import { formatDateShort } from '@/utils/helpers';

const authStore = useAuthUserStore();
const organizationMembersStore = useOrganizationMembersStore();

// Reference to the organization widget component
const organizationWidget = ref<InstanceType<typeof MyOrganizationWidget> | null>(null);

const blockedEvents = ref<{ name: string; date: string; status: string; showMore?: boolean; showDateMore?: boolean }[]>([]);
const studentOrganizations = ref<any[]>([]);
const loading = ref(false);
const loadingOrganizations = ref(false);
const error = ref<string | null>(null);

// Computed property to check if user has any organization
const hasOrganization = computed(() => {
  return studentOrganizations.value.length > 0;
});

const loadBlockedEventsUI = async () => {
  loading.value = true;
  error.value = null;
  try {
    const events = await loadBlockedEvents();
    // Initialize showMore and showDateMore properties
    blockedEvents.value = events.map(event => ({
      ...event,
      showMore: false,
      showDateMore: false
    }));
  } catch (err: any) {
    error.value = err.message || 'Failed to load clearance data.';
    blockedEvents.value = [];
  } finally {
    loading.value = false;
  }
};

const checkStudentOrganizations = async () => {
  loadingOrganizations.value = true;
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
    console.error('Error checking student organizations:', err);
    studentOrganizations.value = [];
  } finally {
    loadingOrganizations.value = false;
  }
};

const refreshAll = async () => {
  await Promise.all([
    loadBlockedEventsUI(),
    checkStudentOrganizations(),
    organizationWidget.value?.refresh()
  ]);
};

const toggleShowMore = (event: any) => {
  event.showMore = !event.showMore;
};

const toggleShowDateMore = (event: any) => {
  event.showDateMore = !event.showDateMore;
};

onMounted(async () => {
  await Promise.all([
    loadBlockedEventsUI(),
    checkStudentOrganizations()
  ]);
});
</script>

<template>
  <InnerLayoutWrapper>
    <template #content>
      <v-container fluid class="pa-6 mt-5" >
        <v-row>
          <v-col cols="12">
            <!-- My Organizations Widget -->
            <MyOrganizationWidget ref="organizationWidget" />

            <!-- My Clearance Card -->
            <v-card elevation="2" rounded="lg">
              <v-card-title class="d-flex align-center justify-space-between pa-4 pa-sm-6 bg-primary text-white">
                <div class="d-flex align-center">
                  <v-icon :size="$vuetify.display.xs ? '24' : '32'" class="me-2 me-sm-3">mdi-shield-check</v-icon>
                  <div>
                    <h2 class="text-h6 text-sm-h5 font-weight-bold mb-1">My Clearance</h2>
                    <p class="text-caption text-sm-body-2 mb-0 opacity-90 d-none d-sm-block">Blocked Events & Clearance Status</p>
                    <p class="text-caption mb-0 opacity-90 d-block d-sm-none">Status</p>
                  </div>
                </div>
                <div class="d-none d-sm-block">
                  <v-btn color="white" variant="elevated" size="default" @click="refreshAll" :loading="loading || loadingOrganizations" prepend-icon="mdi-refresh">
                    Refresh
                  </v-btn>
                </div>
                <div class="d-block d-sm-none">
                  <v-btn color="white" variant="elevated" size="small" @click="refreshAll" :loading="loading || loadingOrganizations" icon>
                    <v-icon>mdi-refresh</v-icon>
                  </v-btn>
                </div>
              </v-card-title>

              <!-- Organization Membership Banner -->
              <v-alert
                v-if="!loadingOrganizations && !hasOrganization"
                type="warning"
                variant="tonal"
                class="ma-0 rounded-0 my-2"
                border="start"
              >
                <template #prepend>
                  <v-icon size="24">mdi-account-group-outline</v-icon>
                </template>
                <div class="d-flex flex-column flex-sm-row align-start align-sm-center">
                  <div class="flex-grow-1 mb-2 mb-sm-0">
                    <div class="text-body-2 font-weight-bold mb-1">No Organization Membership</div>
                    <div class="text-caption text-sm-body-2">
                      You are not a member of any organization yet. Contact your organizational leader to request membership and access event clearances.
                    </div>
                  </div>
                </div>
              </v-alert>

              <v-divider></v-divider>
              <div class="pa-4 pa-sm-6">
                <div v-if="loading" class="text-center">
                  <v-progress-circular indeterminate color="primary" :size="$vuetify.display.xs ? '32' : '40'" class="mb-3 mb-sm-4" />
                  <div class="text-body-2 text-sm-body-1">Loading clearance data...</div>
                </div>
               <!--  <div v-else-if="error" class="text-center text-error">
                  {{ error }}
                </div> -->
                <div v-else-if="blockedEvents.length === 0" class="text-center text-success">
                  <v-img
                    src="/images/cleared.png"
                    alt="Cleared"
                    :max-width="$vuetify.display.xs ? '200' : '300'"
                    class="mx-auto mb-3 mb-sm-4"
                  />
                  <v-icon color="success" :size="$vuetify.display.xs ? '36' : '48'" class="mb-2">mdi-check-circle</v-icon>
                  <div class="text-body-1 text-sm-h6">You have no blocked events. You are clear!</div>
                </div>
                <div v-else>
                  <v-row>
                    <v-col
                      v-for="event in blockedEvents"
                      :key="event.name + event.date"
                      cols="12"
                      sm="6"
                      md="4"
                    >
                      <v-card elevation="2" rounded="lg" class="fill-height">
                        <v-card-text class="pa-3 pa-sm-4">
                          <div class="d-flex align-center justify-space-between mb-2">
                            <v-chip color="error" variant="elevated" :size="$vuetify.display.xs ? 'x-small' : 'small'">{{ event.status }}</v-chip>
                            <v-icon color="error" :size="$vuetify.display.xs ? '24' : '32'">mdi-alert-circle-outline</v-icon>
                          </div>
                          <div class="flex-grow-1">
                            <h3 class="text-body-1 text-sm-h6 font-weight-bold mb-1" style="line-height: 1.3;">
                              <span v-if="event.name.length <= 40">{{ event.name }}</span>
                              <span v-else>
                                <span v-if="!event.showMore">{{ event.name.substring(0, 40) }}...</span>
                                <span v-else>{{ event.name }}</span>
                                <br>
                                <v-btn
                                  variant="text"
                                  size="x-small"
                                  color="primary"
                                  @click="toggleShowMore(event)"
                                  class="pa-0 mt-1"
                                  style="height: auto; min-height: auto;"
                                >
                                  {{ event.showMore ? 'Show less' : 'See more' }}
                                </v-btn>
                              </span>
                            </h3>
                            <p class="text-caption text-sm-body-2 text-medium-emphasis mb-0" style="line-height: 1.2;">
                              <span v-if="formatDateShort(event.date).length <= 30">{{ formatDateShort(event.date) }}</span>
                              <span v-else>
                                <span v-if="!event.showDateMore">{{ formatDateShort(event.date).substring(0, 30) }}...</span>
                                <span v-else>{{ formatDateShort(event.date) }}</span>
                                <br>
                                <v-btn
                                  variant="text"
                                  size="x-small"
                                  color="primary"
                                  @click="toggleShowDateMore(event)"
                                  class="pa-0 mt-1"
                                  style="height: auto; min-height: auto;"
                                >
                                  {{ event.showDateMore ? 'Show less' : 'See more' }}
                                </v-btn>
                              </span>
                            </p>
                          </div>
                        </v-card-text>
                      </v-card>
                    </v-col>
                  </v-row>
                </div>
              </div>
            </v-card>

          </v-col>
        </v-row>
      </v-container>
    </template>
  </InnerLayoutWrapper>
</template>
