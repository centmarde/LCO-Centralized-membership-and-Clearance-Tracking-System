import { setupLayouts } from 'virtual:generated-layouts';
import { createRouter, createWebHistory } from 'vue-router';

import Hero from '@/pages/index.vue';
import Auth from '@/pages/Auth.vue';
import Dashboard from '@/pages/admin/DashboardView.vue';
import NotFound from '@/pages/NotFound.vue';
import AdminUserRolesView from '@/pages/admin/AdminUserRolesView.vue';
import AdminUserPagesView from '@/pages/admin/AdminUserPagesView.vue';

/**
 * Route definitions for the application
 */
const routes = setupLayouts([
  {
    path: '/',
    component: Hero
  },
  {
    path: '/auth',
    component: Auth,
  },
  {
    path: '/dashboard',
    component: Dashboard,
    meta: { requiresAuth: true }
  },
  {
    path: '/admin/user-roles',
    component: AdminUserRolesView,
    meta: { requiresAuth: true }
  },
  {
    path: '/admin/user-pages',
    component: AdminUserPagesView,
    meta: { requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFound,
  },
]);

/**
 * Create and configure the router instance
 */
export const createAppRouter = () => {
  return createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
  });
};
