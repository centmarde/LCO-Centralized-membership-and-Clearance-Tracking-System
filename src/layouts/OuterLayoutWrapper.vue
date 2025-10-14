<template>
  <v-app>
    <!-- Dynamic Navbar Selection -->
    <OuterNavbar
      v-if="data?.ui?.navbarComponent === '1'"
      :config="data?.ui"
    />
    <OuterNavbar2
      v-else-if="data?.ui?.navbarComponent === '2'"
      :config="data?.ui"
    />
    <OuterNavbar3
      v-else-if="data?.ui?.navbarComponent === '3'"
      :config="data?.ui"
    />
    <OuterNavbar4
      v-else-if="data?.ui?.navbarComponent === '4'"
      :config="data?.ui"
    />

    <v-main class="main-content">
      <div
        class="background-overlay"
        :class="{ 'dark-overlay': isDarkTheme, 'light-overlay': !isDarkTheme }"
      ></div>
      <div class="content-wrapper">
        <slot name="content"></slot>
      </div>
    </v-main>

    <!-- Dynamic Footer Selection -->
    <OuterFooter
      v-if="data?.ui?.footerComponent === '1'"
      :config="data?.ui"
    />
    <OuterFooter2
      v-else-if="data?.ui?.footerComponent === '2'"
      :config="data?.ui"
    />
  </v-app>
</template>

<script lang="ts" setup>
  import { onMounted } from 'vue'
  import OuterFooter from '@/components/common/outerFooters/OuterFooter.vue'
  import OuterFooter2 from '@/components/common/outerFooters/OuterFooter2.vue'
  import OuterNavbar from '@/components/common/outerNavbars/OuterNavbar1.vue'
  import OuterNavbar2 from '@/components/common/outerNavbars/OuterNavbar2.vue'
  import OuterNavbar3 from '@/components/common/outerNavbars/OuterNavbar3.vue'
  import OuterNavbar4 from '@/components/common/outerNavbars/OuterNavbar4.vue'
  import { useLandingController } from '@/controller/landingController'
  import { useTheme } from '@/composables/useTheme'

  const { data, fetchLandingData } = useLandingController()
  const { isDarkTheme } = useTheme()

  onMounted(async () => {
    await fetchLandingData()
  })
</script>

<style scoped>
  .main-content {
    position: relative;
    min-height: 100vh;
  }

  .main-content::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: url('/images/background.jpg');
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    background-attachment: fixed;
    z-index: 0;
  }

  .background-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
    transition: background-color 0.3s ease;
    pointer-events: none;
  }

  /* Light theme overlay - subtle white overlay */
  .background-overlay.light-overlay {
    background-color:  rgba(227, 255, 230, 0.664);
  }

  /* Dark theme overlay - darker overlay for better readability */
  .background-overlay.dark-overlay {
    background-color: rgba(2, 27, 5, 0.685);
  }

  .content-wrapper {
    position: relative;
    z-index: 2;
    min-height: 100vh;
  }
</style>
