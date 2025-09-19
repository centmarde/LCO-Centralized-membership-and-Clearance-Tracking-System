
import { setupLayouts } from 'virtual:generated-layouts';
import { useToast } from 'vue-toastification';
import { createRouter, createWebHistory } from 'vue-router';
import type { RouteLocationNormalized, NavigationGuardNext } from 'vue-router';

import Hero from '@/pages/index.vue';
import Auth from '@/pages/Auth.vue';
import Home from '@/pages/Home.vue';
import NotFound from '@/pages/NotFound.vue';

const routes = setupLayouts([
  { path: '/', component: Hero },
  {
    path: '/auth',
    component: Auth,
  },
  {
    path: '/home',
    component: Home,
    meta: { requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFound,
  },
]);

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach((to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => {
  const isLoggedIn = localStorage.getItem("access_token") !== null;
  const publicPages = ["/", "/auth"];
  const protectedPages = ["/home", "/admin", "/profiles"];
  const toast = useToast();

  // If user is not authenticated and trying to access protected page
  if (to.meta.requiresAuth && !isLoggedIn) {
    /* toast.error("Authentication is required to access this page."); */
    return next("/auth");
  }

  // If user is authenticated and trying to access public/auth pages, redirect to home
  if (isLoggedIn && publicPages.includes(to.path)) {
   /*  toast.info("You are already logged in. Redirecting to home."); */
    return next("/home");
  }

  next();
});

router.onError((err: any, to: RouteLocationNormalized) => {
  if (err?.message?.includes?.("Failed to fetch dynamically imported module")) {
    if (!localStorage.getItem("vuetify:dynamic-reload")) {
      console.log("Reloading page to fix dynamic import error");
      localStorage.setItem("vuetify:dynamic-reload", "true");
      location.assign(to.fullPath);
    } else {
      console.error("Dynamic import error, reloading page did not fix it", err);
    }
  } else {
    console.error(err);
  }
});

router.isReady().then(() => {
  localStorage.removeItem("vuetify:dynamic-reload");
});

export default router;
