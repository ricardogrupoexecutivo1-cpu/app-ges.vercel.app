export type Role = 'admin' | 'ops' | 'finance' | 'member' | string | null | undefined

export function isAdmin(role: Role) {
  return role === 'admin'
}

export function isOps(role: Role) {
  return role === 'ops'
}

export function isFinance(role: Role) {
  return role === 'finance'
}

export function canAccessOps(role: Role) {
  return role === 'admin' || role === 'ops'
}

export function canAccessFinance(role: Role) {
  return role === 'admin' || role === 'finance'
}