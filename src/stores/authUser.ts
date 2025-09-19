import { computed, ref } from "vue";
import type { Ref } from "vue";
import { defineStore } from "pinia";
import { useRouter } from "vue-router";
import { supabase } from "@/lib/supabase";
interface UserData {
  id?: string;
  email?: string;
  created_at?: string;
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
}

interface SessionUser {
  id: string;
  email?: string;
  user_metadata: Record<string, any>;
}

export const useAuthUserStore = defineStore("authUser", () => {
  // States
  const userData: Ref<UserData | null> = ref(null);
  const authPages: Ref<string[]> = ref([]);
  const authBranchIds: Ref<number[]> = ref([]);
  const loading = ref(false);
  const router = useRouter();

  // Computed properties
  const isAuthenticated = computed(() => userData.value !== null);
  const userEmail = computed(() => userData.value?.email || null);
  const userName = computed(() => userData.value?.user_metadata?.full_name || userData.value?.email || null);

  async function registerUser(
    email: string,
    password: string,
    username: string
  ) {
    loading.value = true;
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp(
        {
          email,
          password,
          options: {
            data: {
              full_name: username,
            }
          }
        }
      );

      if (signUpError) {
        return { error: signUpError };
      }

      if (!signUpData.user) {
        return { error: new Error("Signup failed") };
      }

      return { data: { id: signUpData.user.id, email } };
    } finally {
      loading.value = false;
    }
  }

  async function signIn(email: string, password: string, rememberMe = false) {
    loading.value = true;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      if (!data.session) {
        return { error: new Error("No session") };
      }

      const user = data.user;
      localStorage.setItem("access_token", data.session.access_token);
      localStorage.setItem("refresh_token", data.session.refresh_token);
      localStorage.setItem("auth_id", user.id);

      // Update the store's userData with Supabase user data only
      userData.value = {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        user_metadata: user.user_metadata,
        app_metadata: user.app_metadata,
      };

      return { user };
    } finally {
      loading.value = false;
    }
  }

  async function signOut() {
    loading.value = true;
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return { error };
      }

      // Clear local storage
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("auth_id");

      // Clear user data
      userData.value = null;

      // Redirect to home or login page
      router.push("/");

      return { success: true };
    } finally {
      loading.value = false;
    }
  }

  // Initialize auth state on store creation
  async function initializeAuth() {
    loading.value = true;
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        userData.value = null;
        return;
      }

      // Set user data from Supabase auth user only
      userData.value = {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        user_metadata: user.user_metadata,
        app_metadata: user.app_metadata,
      };
    } catch (error) {
      console.error("Error initializing auth:", error);
      userData.value = null;
    } finally {
      loading.value = false;
    }
  }

  // Call initialize on store creation
  initializeAuth();

  return {
    // State
    userData,
    authPages,
    authBranchIds,
    loading,

    // Computed
    isAuthenticated,
    userEmail,
    userName,

    // Actions
    registerUser,
    signIn,
    signOut,
    initializeAuth,
  };
});

// Utility function for logout (can be used independently)
export async function doLogout() {
  const authStore = useAuthUserStore();
  return await authStore.signOut();
}
