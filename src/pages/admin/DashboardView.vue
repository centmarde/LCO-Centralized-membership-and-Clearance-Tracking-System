<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import InnerLayoutWrapper from "@/layouts/InnerLayoutWrapper.vue"
import { fetchStudents, fetchStudentStats, updateStudentStatus } from "@/stores/studentsData"
import { fetchOrganizations, fetchOrganizationStats } from "@/stores/organizationData"

// Stats
const stats = ref([
  { title: "Total Students", value: 0 },
  { title: "Active Students", value: 0 },
  { title: "Blocked Students", value: 0 },
  { title: "Organizations", value: 0 },
])

// Search and Filter
const searchQuery = ref("")
const filterStatus = ref("All")

// Student Data
const students = ref<any[]>([])

// Table Headers
const headers = [
  { text: "Name", value: "full_name" },
  { text: "ID", value: "student_number" },
  { text: "Email", value: "email" },
  { text: "Organization", value: "organization" },
  { text: "Status", value: "status" },
  { text: "Actions", value: "actions", sortable: false },
]

// Recent Activity
const recentActivity = ref<{ student: string; action: string; date: Date }[]>([])
const organizations = ref<any[]>([])

// Load Data from Supabase
onMounted(async () => {
  try {
    students.value = await fetchStudents()
    organizations.value = await fetchOrganizations()
    const statData = await fetchStudentStats()
    const orgCount = await fetchOrganizationStats()
    stats.value = [
      { title: "Total Students", value: statData.total },
      { title: "Active Students", value: statData.active },
      { title: "Blocked Students", value: statData.blocked },
      { title: "Organizations", value: orgCount },
    ]
  } catch (err) {
    console.error("Error loading dashboard:", err)
  }
})

// Filtered Students
const filteredStudents = computed(() => {
  return students.value.filter((s) => {
    const query = searchQuery.value.toLowerCase()
    const matchesSearch =
      s.full_name?.toLowerCase().includes(query) ||
      s.student_number?.toLowerCase().includes(query) ||
      s.email?.toLowerCase().includes(query) ||
      s.organization?.toLowerCase().includes(query) // 👈 added
    const matchesStatus =
      filterStatus.value === "All" || s.status === filterStatus.value
    return matchesSearch && matchesStatus
  })
})


// Toggle Status (Block/Unblock)
const toggleStatus = async (student: any) => {
  const newStatus = student.status === "Active" ? "Blocked" : "Active"

  try {
    // Update in Supabase using the studentsData function
    await updateStudentStatus(student.id, newStatus)

    // Update local state
    student.status = newStatus
    recentActivity.value.unshift({
      student: student.full_name,
      action: newStatus === "Active" ? "Unblocked" : "Blocked",
      date: new Date(),
    })

    // Update stats immediately
    // Recalculate from current students list
    const total = students.value.length
    const active = students.value.filter((s) => s.status === "Active").length
    const blocked = students.value.filter((s) => s.status === "Blocked").length
    stats.value = [
      { title: "Total Students", value: total },
      { title: "Active Students", value: active },
      { title: "Blocked Students", value: blocked },
      { title: "Organizations", value: organizations.value.length },
    ]
  } catch (error) {
    console.error("Failed to update status:", error)
  }
}

// Format Date
const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}
</script>

<template>
  <InnerLayoutWrapper>
    <template #content>
      <div class="py-5">
      </div>
      <v-container fluid class="py-6 px-4" >
        <!-- Top Stats -->
        <v-row>
          <v-col cols="12" md="3" v-for="stat in stats" :key="stat.title">
            <v-card rounded="lg" elevation="7" class="pa-4 text-center" >
              <h3 class="text-h6 font-weight-medium mb-2">{{ stat.title }}</h3>
              <p class="text-h4 font-weight-bold">{{ stat.value }}</p>
            </v-card>
          </v-col>
        </v-row>

        <!-- Search + Filter -->
        <v-row class="my-6" align="center">
          <v-col cols="12" md="8">
            <v-text-field
              v-model="searchQuery"
              label="Search by name, ID, or organization"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              rounded="lg"
              clearable
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="filterStatus"
              :items="['All', 'Active', 'Blocked']"
              label="Filter by status"
              variant="outlined"
              rounded="lg"
              clearable
            />
          </v-col>
        </v-row>

        <!-- Student Table + Activity Panel -->
        <v-row>
          <!-- Student Table -->
          <v-col cols="12" md="8">
            <v-card rounded="lg" elevation="7" >
              <v-card-title class="text-h6 font-weight-bold">
                All Students
              </v-card-title>
              <v-data-table
                :headers="headers"
                :items="filteredStudents"
                class="elevation-1"
                rounded="lg"
              >
                <template #item.status="{ item }">
                  <v-chip
                    :color="item.status === 'Active' ? 'green' : 'red'"
                    size="small"
                    class="ma-1"
                  >
                    <v-avatar start size="6" :color="item.status === 'Active' ? 'green' : 'red'"></v-avatar>
                    {{ item.status }}
                  </v-chip>
                </template>

                <template #item.actions="{ item }">
                  <v-btn
                    :color="item.status === 'Active' ? 'error' : 'success'"
                    variant="tonal"
                    size="small"
                    @click="toggleStatus(item)"
                  >
                    {{ item.status === 'Active' ? 'Block' : 'Unblock' }}
                  </v-btn>
                </template>
              </v-data-table>
            </v-card>
          </v-col>

          <!-- Recent Activity -->
          <v-col cols="12" md="4">
            <v-card rounded="lg" elevation="7" >
              <v-card-title class="text-h6 font-weight-bold">
                Recent Activity
              </v-card-title>
              <v-list>
                <v-list-item
                  v-for="(log, index) in recentActivity"
                  :key="index"
                >
                  <v-list-item-content>
                    <v-list-item-title>
                      <strong>{{ log.action }}</strong> - {{ log.student }}
                    </v-list-item-title>
                    <v-list-item-subtitle>
                      {{ formatDate(log.date) }}
                    </v-list-item-subtitle>
                  </v-list-item-content>
                </v-list-item>
              </v-list>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </template>
  </InnerLayoutWrapper>
</template>
