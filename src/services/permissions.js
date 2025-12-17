import { apiFetch } from '@/services/api'

const DEFAULT_PERMISSIONS = [
  'view_dashboard',
  'view_sales', 'create_sales', 'return_sales',
  'view_products', 'manage_products',
  'view_clients', 'manage_clients',
  'view_suppliers', 'manage_suppliers',
  'view_categories', 'manage_categories',
  'view_stock', 'alerts_stock',
  'view_finance', 'manage_expenses', 'manage_receivables', 'view_cashflow',
  'manage_roles', 'manage_users'
]

let roleMapCache = null
let listRolePermsInFlight = null
let lastErrorAt = 0

async function listAllPermissions(){
  return DEFAULT_PERMISSIONS
}

async function listRolePermissions(){
  if (roleMapCache && typeof roleMapCache === 'object') return roleMapCache

  const now = Date.now()
  if (now - lastErrorAt < 5000 && roleMapCache) return roleMapCache

  if (listRolePermsInFlight) return listRolePermsInFlight

  listRolePermsInFlight = (async () => {
    try {
      const roles = await apiFetch('/users/roles')
      if (Array.isArray(roles)) {
        const basePerms = ['view_dashboard','view_sales','view_products','view_clients','view_finance','view_cashflow']
        const out = {}
        for (const r of roles) {
          out[r] = (r === 'ADMINISTRADOR' || r === 'Administrador') ? DEFAULT_PERMISSIONS : basePerms
        }
        roleMapCache = out
      } else if (roles && typeof roles === 'object') {
        roleMapCache = roles
      } else {
        // fallback em memória
        roleMapCache = { 'Administrador': DEFAULT_PERMISSIONS }
      }
      return roleMapCache
    } catch (e) {
      lastErrorAt = Date.now()
      // fallback mínimo em memória sem localStorage
      if (!roleMapCache) {
        const fallbackRoles = ['Administrador','Gestor','Financeiro','Motorista','Vendedor','Usuário Comum']
        const base = {}
        for (const r of fallbackRoles) base[r] = ['view_dashboard','view_sales','view_products','view_clients','view_finance','view_cashflow']
        base['Administrador'] = DEFAULT_PERMISSIONS
        roleMapCache = base
      }
      return roleMapCache
    } finally {
      listRolePermsInFlight = null
    }
  })()

  return listRolePermsInFlight
}

async function updateRolePermissions(role, permissions){
  // Não há endpoint de backend definido para persistir mapeamentos; evitar persistência local
  // Caso exista no futuro, trocar por: await apiFetch('/permissions/roles', { method:'PUT', body: JSON.stringify({ role, permissions }) })
  throw new Error('Persistência de permissões por papel não disponível no backend. Evitado uso de localStorage.')
}

export { listAllPermissions, listRolePermissions, updateRolePermissions }
