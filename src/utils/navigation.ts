export interface NavigationItem {
  title: string
  icon: string
  route: string
  selected?: boolean
  permission?: string // Optional permission key for role-based access
}

export interface NavigationGroup {
  title: string
  icon: string
  permission?: string // Optional permission key for the entire group
  children: NavigationItem[]
}

export const navigationConfig: NavigationGroup[] = [
  {
    title: 'My Organization',
    icon: 'mdi-office-building',
    permission: 'organization.access',
    children: [
      {
        title: 'Members',
        icon: 'mdi-account-group',
        route: '/organization/members',
        permission: 'organization.members.view'
      }
    ]
  },
  {
    title: 'Admin Controls',
    icon: 'mdi-cog',
    permission: 'admin.access',
    children: [
      {
        title: 'Dashboard',
        icon: 'mdi-view-dashboard-outline',
        route: '/dashboard',
        permission: 'admin.dashboard.view'
      },
      {
        title: 'User Management',
        icon: 'mdi-account-multiple',
        route: '/admin/user-management',
        permission: 'admin.users.manage'
      },
      {
        title: 'User Roles',
        icon: 'mdi-account-key',
        route: '/admin/user-roles',
        permission: 'admin.roles.manage'
      },
      {
        title: 'Events',
        icon: 'mdi-calendar-multiple',
        route: '/admin/events',
        permission: 'admin.events.manage'
      }
    ]
  }
]

// Helper function to get all permissions from navigation config
export const getAllPermissions = (): string[] => {
  const permissions: string[] = []

  navigationConfig.forEach(group => {
    if (group.permission) {
      permissions.push(group.permission)
    }

    group.children.forEach(item => {
      if (item.permission) {
        permissions.push(item.permission)
      }
    })
  })

  return [...new Set(permissions)] // Remove duplicates
}

// Helper function to get navigation items with selected state
export const getNavigationWithSelection = (selectedPermissions: string[] = []): NavigationGroup[] => {
  return navigationConfig.map(group => ({
    ...group,
    children: group.children.map(item => ({
      ...item,
      selected: item.permission ? selectedPermissions.includes(item.permission) : false
    }))
  }))
}
