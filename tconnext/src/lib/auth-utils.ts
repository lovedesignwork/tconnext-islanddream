import type { UserPermissions } from '@/types'

export function getDefaultPermissions(role: 'master_admin' | 'staff'): UserPermissions {
  if (role === 'master_admin') {
    return {
      dashboard: { view: true, manage: true },
      programs: { view: true, manage: true, setup: true },
      agents: { view: true, manage: true, setup: true },
      drivers: { view: true, manage: true, setup: true },
      boats: { view: true, manage: true, setup: true },
      invoices: { view: true, manage: true },
      finance: { view: true, manage: true },
      reports: { view: true },
    }
  }

  // Default staff permissions
  return {
    dashboard: { view: true, manage: true },
    programs: { view: true, manage: false, setup: false },
    agents: { view: true, manage: false, setup: false },
    drivers: { view: true, manage: false, setup: false },
    boats: { view: true, manage: false, setup: false },
    invoices: { view: true, manage: false },
    finance: { view: true, manage: false },
    reports: { view: false },
  }
}

export function hasPermission(
  permissions: UserPermissions | undefined,
  panel: keyof UserPermissions,
  action: 'view' | 'manage' | 'setup'
): boolean {
  if (!permissions) return false
  const panelPerms = permissions[panel] as Record<string, boolean | undefined> | undefined
  if (!panelPerms) return false
  return panelPerms[action] === true
}

