import { useToast } from 'vue-toastification';
import type { RouteLocationNormalized, NavigationGuardNext, Router } from 'vue-router';

/**
 * Authentication guard that checks if user is logged in and redirects accordingly
 */
export const authGuard = (to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => {
  const isLoggedIn = localStorage.getItem("access_token") !== null;
  const publicPages = ["/", "/auth"];
  const toast = useToast();

  // If user is not authenticated and trying to access protected page
  if (to.meta.requiresAuth && !isLoggedIn) {
    /* toast.error("Authentication is required to access this page."); */
    return next("/auth");
  }

  // If user is authenticated and trying to access public/auth pages, redirect to dashboard
  if (isLoggedIn && publicPages.includes(to.path)) {
    /*  toast.info("You are already logged in. Redirecting to home."); */
    return next("/dashboard");
  }

  next();
};

/**
 * Error handler for router errors, particularly dynamic import failures
 */
export const errorHandler = (err: any, to: RouteLocationNormalized) => {
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
};

/**
 * Setup guards for the router instance
 */
export const setupGuards = (router: Router) => {
  // Setup navigation guard
  router.beforeEach(authGuard);

  // Setup error handler
  router.onError(errorHandler);

  // Setup ready handler to clean up dynamic reload flag
  router.isReady().then(() => {
    localStorage.removeItem("vuetify:dynamic-reload");
  });
};
