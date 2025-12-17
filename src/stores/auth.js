import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    user: (() => { try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null } })(),
    expiresAt: localStorage.getItem('expiresAt') || '',
  }),
  getters: {
    isLoggedIn: (s) => {
      if (!s.token) return false
      if (s.expiresAt) {
        const exp = new Date(s.expiresAt)
        if (!isNaN(exp) && exp < new Date()) return false
      }
      return true
    },
    name: (s) => (s.user && (s.user.nome || s.user.name || s.user.email)) || '',
  },
  actions: {
    setSession({ token, user, expiresAt }) {
      this.token = token || ''
      this.user = user || null
      this.expiresAt = expiresAt || ''
      try {
        if (token) localStorage.setItem('token', token); else localStorage.removeItem('token')
        if (user) localStorage.setItem('user', JSON.stringify(user)); else localStorage.removeItem('user')
        if (expiresAt) localStorage.setItem('expiresAt', expiresAt); else localStorage.removeItem('expiresAt')
      } catch {}
    },
    clearSession() {
      this.setSession({ token: '', user: null, expiresAt: '' })
      // Remove only auth-related keys to preserve app settings and cached data
      try {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        localStorage.removeItem('expiresAt')
      } catch {}
      try { sessionStorage.clear() } catch {}
    },
  },
})
