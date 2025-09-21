import { computed, ref } from "vue";
import type { Ref } from "vue";
import { defineStore } from "pinia";
import { useRouter } from "vue-router";
import { supabase, supabaseAdmin } from "@/lib/supabase";
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
  const userRole = computed(() => userData.value?.user_metadata?.role || null);

  async function registerUser(
    email: string,
    password: string,
    username: string,
    roleId: number,
    full_name?: string,
    student_number?: string,
    organization_id?: number
  ) {
    loading.value = true;
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: username,
            role: roleId,
          }
        }
      });

      if (signUpError) {
        return { error: signUpError };
      }

      if (!signUpData.user) {
        return { error: new Error("Signup failed") };
      }

      // Only insert into students if roleId is 2 (student)
      if (roleId === 2) {
        const { error: insertError } = await supabase
          .from("students")
          .insert([
            {
              user_id: signUpData.user.id,
              role_id: roleId,
              full_name: full_name || username,
              student_number: student_number || null,
              email,
              status: "blocked",
              organization_id: organization_id || null
            }
          ]);
        if (insertError) {
          return { error: insertError };
        }
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

      // Log successful login with current user role ID
      console.log('Successful login - Current user role ID:', user.user_metadata?.role);

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

  // Initialize auth state on store creation using getCurrentUser
  async function initializeAuth() {
    try {
      const result = await getCurrentUser();

      if (result.error || !result.user) {
        userData.value = null;
        console.log("No authenticated user found on initialization");
        return;
      }

      // Set user data from getCurrentUser result
      userData.value = result.user;

      // Log user role ID from metadata on mount
      const roleId = result.user.user_metadata?.role;
      console.log('User initialized on mount - Role ID:', roleId);
      console.log('User metadata:', result.user.user_metadata);

    } catch (error) {
      console.error("Error initializing auth:", error);
      userData.value = null;
    }
  }

  // Get user data by ID using Supabase API
  async function getUser(userId?: string) {
    loading.value = true;
    try {
      // Use the current user's ID if no userId is provided
      const targetUserId = userId || userData.value?.id;

      if (!targetUserId) {
        return { error: new Error("No user ID provided") };
      }

      const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(targetUserId);

      if (error) {
        return { error };
      }

      if (!user) {
        return { error: new Error("User not found") };
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          user_metadata: user.user_metadata,
          app_metadata: user.app_metadata,
        }
      };
    } catch (error) {
      console.error("Error fetching user:", error);
      return { error };
    } finally {
      loading.value = false;
    }
  }

  // Get current authenticated user
  async function getCurrentUser() {
    loading.value = true;
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) {
        return { error };
      }

      if (!user) {
        return { error: new Error("No authenticated user") };
      }

      const userData = {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        user_metadata: user.user_metadata,
        app_metadata: user.app_metadata,
      };

      // Log user role ID from metadata
      const roleId = user.user_metadata?.role;
      console.log('getCurrentUser - User Role ID from metadata:', roleId);
      console.log('getCurrentUser - Full user metadata:', user.user_metadata);

      return { user: userData };
    } catch (error) {
      console.error("Error fetching current user:", error);
      return { error };
    } finally {
      loading.value = false;
    }
  }

  // Get all users (admin function)
  async function getAllUsers() {
    loading.value = true;
    try {
      // First, get all users from Supabase Auth using service role
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();

      if (authError) {
        return { error: authError };
      }

      // Get all students from the students table to merge additional info
      const { data: studentsData, error: studentsError } = await supabaseAdmin
        .from("students")
        .select("*");

      if (studentsError) {
        console.warn("Could not fetch students data:", studentsError);
      }

      // Merge auth users with student data
      const allUsers = authData.users.map(user => {
        const studentInfo = studentsData?.find(student => student.user_id === user.id);

        return {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          user_metadata: user.user_metadata,
          app_metadata: user.app_metadata,
          // Additional student info if available
          full_name: studentInfo?.full_name || user.user_metadata?.full_name || user.email,
          student_number: studentInfo?.student_number || null,
          status: studentInfo?.status || 'blocked',
          organization_id: studentInfo?.organization_id || null,
          role_id: user.user_metadata?.role || studentInfo?.role_id || null
        };
      });

      return { users: allUsers };
    } catch (error) {
      console.error("Error fetching all users:", error);
      return { error };
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
    userRole,

    // Actions
    registerUser,
    signIn,
    signOut,
    initializeAuth,
    getUser,
    getCurrentUser,
    getAllUsers,
  };
});

// Utility function for logout (can be used independently)
export async function doLogout() {
  const authStore = useAuthUserStore();
  return await authStore.signOut();
}
