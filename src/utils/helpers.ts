/**
 * Utility functions for the application
 */

/**
 * Generates initials from an email address for avatar display
 * @param email - The email address to extract initials from
 * @returns A string of 1-2 uppercase letters representing the user's initials
 */
export function getEmailInitials(email: string | null | undefined): string {
  if (!email) return 'U'; // Default to 'U' for User if no email

  // Extract the local part (before @) from email
  const localPart = email.split('@')[0];

  // Split by common separators (dots, underscores, hyphens, numbers)
  const parts = localPart.split(/[\._\-\d]+/).filter(part => part.length > 0);

  if (parts.length >= 2) {
    // Take first letter of first two parts
    return (parts[0][0] + parts[1][0]).toUpperCase();
  } else if (parts.length === 1 && parts[0].length >= 2) {
    // Take first two letters of single part
    return (parts[0][0] + parts[0][1]).toUpperCase();
  } else if (parts.length === 1 && parts[0].length === 1) {
    // Single letter part
    return parts[0][0].toUpperCase();
  }

  // Fallback: take first letter of email
  return email[0].toUpperCase();
}

/**
 * Generates a display name from user data
 * @param userData - User data object containing name/email information
 * @returns A formatted display name
 */
export function getUserDisplayName(userData: {
  user_metadata?: { full_name?: string };
  email?: string
} | null): string {
  if (!userData) return 'User';

  const fullName = userData.user_metadata?.full_name;
  if (fullName) return fullName;

  if (userData.email) {
    // Extract name from email (part before @)
    const emailLocal = userData.email.split('@')[0];
    // Replace dots/underscores with spaces and capitalize
    return emailLocal.replace(/[\._]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  return 'User';
}

/**
 * Gets the color associated with a role ID
 * @param roleId - The role ID to get color for
 * @returns A color string for Vuetify components
 */
export function getRoleColor(roleId: number | null | undefined): string {
  switch (roleId) {
    case 1: return 'red' // Admin
    case 2: return 'blue' // Student
    case 3: return 'green' // Teacher/Faculty
    default: return 'grey'
  }
}

/**
 * Gets the text representation of a role ID
 * @param roleId - The role ID to get text for
 * @returns A human-readable role name
 */
export function getRoleText(roleId: number | null | undefined): string {
  switch (roleId) {
    case 1: return 'Admin'
    case 2: return 'Student'
    case 3: return 'Organization Leader'
    default: return 'Unknown'
  }
}

/**
 * Gets the color associated with a user status
 * @param status - The status string to get color for
 * @returns A color string for Vuetify components
 */
export function getStatusColor(status: string | undefined): string {
  switch (status?.toLowerCase()) {
    case 'cleared': return 'green'
    case 'blocked': return 'red'
    case 'active': return 'blue'
    case 'inactive': return 'orange'
    case 'suspended': return 'red'
    default: return 'red' // Default to blocked color
  }
}

/**
 * Gets the text representation of a user status
 * @param status - The status string to format
 * @returns A human-readable status text
 */
export function getStatusText(status: string | undefined): string {
  const statusLower = status?.toLowerCase()
  switch (statusLower) {
    case 'cleared': return 'Cleared'
    case 'blocked': return 'Blocked'
    case 'active': return 'Active'
    case 'inactive': return 'Inactive'
    case 'suspended': return 'Suspended'
    default: return status || 'Unknown'
  }
}

/**
 * Formats a date string into a human-readable format
 * @param dateString - The date string to format
 * @returns A formatted date string or 'N/A' if no date provided
 */
export function formatDate(dateString: string | undefined): string {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Interface for user status display information
 */
export interface UserStatusDisplay {
  text: string
  color: string
  showCount: boolean
  blockedCount: number
}

/**
 * Gets the user status display with blocked events count for students
 * @param user - The user object to get status display for
 * @param userEvents - Array of events for the user (for students)
 * @returns UserStatusDisplay object with text, color, and count information
 */
export function getUserStatusDisplay(
  user: { id: string; role_id?: number; status?: string }, 
  userEvents: any[] = []
): UserStatusDisplay {
  if (user.role_id !== 2) {
    // For non-students, use the original status
    return {
      text: getStatusText(user.status),
      color: getStatusColor(user.status),
      showCount: false,
      blockedCount: 0
    }
  }
  
  // For students, check their event statuses
  const blockedEvents = userEvents.filter(event => event.status?.toLowerCase() === 'blocked')
  const clearedEvents = userEvents.filter(event => event.status?.toLowerCase() === 'cleared')
  
  if (blockedEvents.length > 0) {
    return {
      text: blockedEvents.length === 1 ? 'Blocked (1 event)' : `Blocked (${blockedEvents.length} events)`,
      color: 'red',
      showCount: true,
      blockedCount: blockedEvents.length
    }
  } else if (clearedEvents.length > 0) {
    return {
      text: 'Cleared',
      color: 'green',
      showCount: false,
      blockedCount: 0
    }
  } else {
    // No events or unknown status
    return {
      text: getStatusText(user.status),
      color: getStatusColor(user.status),
      showCount: false,
      blockedCount: 0
    }
  }
}
