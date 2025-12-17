import { apiFetch } from '@/services/api'
import router from '@/router'
import { useAuthStore } from '@/stores/auth'

export function useAuth() {
  const store = useAuthStore()

  async function login(email, password) {
    // Call backend-auth: POST /api/auth/login with JSON body
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      _noAuth: true, // ensure api client does not attach Authorization
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const token = data.token || ''
    const expiresAt = data.expiresAt || ''

    // Build basic user from response (if available)
    const userObj = {
      id: data.userId || data.id || null,
      nome: data.nome || data.name || email,
      email: data.email || email,
      role: data.role || 'Usuário',
    }

    // Persist initial session
    store.setSession({ token, user: userObj, expiresAt })

    // Enrich from /auth/me when token is present
    if (token) {
      try {
        const me = await apiFetch('/auth/me', { headers: { Authorization: 'Bearer ' + token } })
        if (me && typeof me === 'object') {
          const merged = {
            ...userObj,
            id: me.id ?? userObj.id,
            nome: me.nome || me.name || userObj.nome,
            email: me.email || userObj.email,
            role: me.role || me.papel || userObj.role,
            permissions: me.permissions || me.permissoes || userObj.permissions,
          }
          store.setSession({ token, user: merged, expiresAt })
        }
      } catch {}
    }

    return store.user
  }

  function getCurrentUser() {
    return store.user
  }
  function isLoggedIn() {
    return store.isLoggedIn
  }
  function logout(options = {}) {
    const { redirect = { name: 'login' }, forceReload = false } = options
    store.clearSession()

    if (forceReload) {
      try { window.location.href = '/#/login' } catch {}
      return
    }

    try {
      const target = typeof redirect === 'string' ? { name: redirect } : redirect || { name: 'login' }
      const current = router.currentRoute.value
      if (current.name === target.name && (!target.fullPath || current.fullPath === target.fullPath)) return
      router.replace(target).catch(() => {})
    } catch {}
  }

  function normalizePermissions(input) {
    if (!input) return []
    const list = Array.isArray(input) ? input : [input]
    return list
      .map((item) => {
        if (!item) return ''
        if (typeof item === 'string') return item.trim().toUpperCase()
        if (typeof item === 'object') {
          if (item.code) return String(item.code).trim().toUpperCase()
          if (item.name) return String(item.name).trim().toUpperCase()
        }
        return String(item || '').trim().toUpperCase()
      })
      .filter(Boolean)
  }

  function hasPermission(required, options = {}) {
    const normalizedRequired = normalizePermissions(required)
    if (!normalizedRequired.length) return true

    const user = getCurrentUser()
    if (!user) return false

    const role = String(user.role || user.cargo || user.perfil || '').toUpperCase()
    if (role === 'ADMINISTRADOR') return true

    const userPermissions = normalizePermissions(user.permissions || user.permissoes)
    if (!userPermissions.length) return false

    const mode = options.mode === 'all' ? 'all' : 'any'
    if (mode === 'all') return normalizedRequired.every((perm) => userPermissions.includes(perm))
    return normalizedRequired.some((perm) => userPermissions.includes(perm))
  }

  function hasRole(role) {
    if (!role) return true
    const roles = Array.isArray(role) ? role : [role]
    const userRole = String(getCurrentUser()?.role || '').toUpperCase()
    return roles.some((item) => String(item || '').toUpperCase() === userRole)
  }

  return { login, logout, getCurrentUser, isLoggedIn, hasPermission, hasRole }
}
