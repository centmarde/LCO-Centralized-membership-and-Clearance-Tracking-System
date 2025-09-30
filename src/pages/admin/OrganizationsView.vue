<template>
  <div class="organizations-container">
    <!-- Page Header -->
    <v-card class="mb-6" elevation="2">
      <v-card-title class="d-flex justify-space-between align-center pa-6">
        <div>
          <h1 class="text-h4 font-weight-bold primary--text mb-2">
            <v-icon class="mr-3" size="large" color="primary">mdi-domain</v-icon>
            Organization Management
          </h1>
          <p class="text-subtitle-1 text-grey mb-0">
            Manage organizations and their settings
          </p>
        </div>
        <v-chip color="warning" variant="elevated" size="large">
          <v-icon start>mdi-clock-outline</v-icon>
          Coming Soon
        </v-chip>
      </v-card-title>
    </v-card>

    <!-- Coming Soon Content -->
    <v-row justify="center">
      <v-col cols="12" md="8" lg="6">
        <v-card class="text-center pa-8" elevation="3">
          <v-avatar size="120" color="primary" class="mb-6">
            <v-icon size="60" color="white">mdi-office-building-cog</v-icon>
          </v-avatar>
          
          <h2 class="text-h4 font-weight-bold mb-4">Organizations CRUD</h2>
          <p class="text-h6 text-grey mb-6">
            This feature is currently under development
          </p>
          
          <v-divider class="my-6"></v-divider>
          
          <div class="text-left">
            <h3 class="text-h6 font-weight-medium mb-4">Planned Features:</h3>
            <v-list class="bg-transparent">
              <v-list-item class="pa-2">
                <template #prepend>
                  <v-icon color="success">mdi-check-circle</v-icon>
                </template>
                <v-list-item-title>Create new organizations</v-list-item-title>
              </v-list-item>
              
              <v-list-item class="pa-2">
                <template #prepend>
                  <v-icon color="success">mdi-check-circle</v-icon>
                </template>
                <v-list-item-title>Edit organization details</v-list-item-title>
              </v-list-item>
              
              <v-list-item class="pa-2">
                <template #prepend>
                  <v-icon color="success">mdi-check-circle</v-icon>
                </template>
                <v-list-item-title>View organization members</v-list-item-title>
              </v-list-item>
              
              <v-list-item class="pa-2">
                <template #prepend>
                  <v-icon color="success">mdi-check-circle</v-icon>
                </template>
                <v-list-item-title>Manage organization settings</v-list-item-title>
              </v-list-item>
              
              <v-list-item class="pa-2">
                <template #prepend>
                  <v-icon color="success">mdi-check-circle</v-icon>
                </template>
                <v-list-item-title>Delete organizations</v-list-item-title>
              </v-list-item>
            </v-list>
          </div>
          
          <v-divider class="my-6"></v-divider>
          
          <v-btn
            color="primary"
            variant="tonal"
            size="large"
            class="mb-4"
            @click="goBack"
          >
            <v-icon start>mdi-arrow-left</v-icon>
            Go Back to Dashboard
          </v-btn>
          
          <p class="text-caption text-grey">
            This page will be available in a future update
          </p>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goBack = () => {
  router.push('/admin/user-management')
}
</script>

<style scoped>
.organizations-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.v-card {
  border-radius: 12px !important;
}

.v-list-item {
  border-radius: 8px;
  margin-bottom: 4px;
}

.v-avatar {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}
</style>