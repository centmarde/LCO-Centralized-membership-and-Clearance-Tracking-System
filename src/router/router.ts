import { setupLayouts } from 'virtual:generated-layouts';
import { createRouter, createWebHistory } from 'vue-router';

import Hero from '@/pages/index.vue';
import Auth from '@/pages/Auth.vue';
import Dashboard from '@/pages/admin/DashboardView.vue';
import NotFound from '@/pages/NotFound.vue';
import ForbiddenView from '@/pages/ForbiddenView.vue';
import AdminUserRolesView from '@/pages/admin/AdminUserRolesView.vue';
import AdminUserPagesView from '@/pages/admin/AdminUserPagesView.vue';
import EventsView from '@/pages/admin/EventsView.vue';
import UserManagementView from '@/pages/admin/UserManagementView.vue';

import MembersView from '@/pages/myOrganization/MembersView.vue';
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
    path: '/admin/dashboard',
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
    path: '/admin/events',
    component: EventsView,
    meta: { requiresAuth: true }
  },
  {
    path: '/admin/user-management',
    component: UserManagementView,
    meta: { requiresAuth: true }
  },
  {
    path: '/organization/members',
    component: MembersView,
    meta: { requiresAuth: true }
  },
  {
    path: '/forbidden',
    component: ForbiddenView,
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
