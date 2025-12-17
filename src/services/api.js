// Use relative base so Vite proxy forwards to backend in dev
import axios from 'axios'

const DEFAULT_API = '/api'

function normalizeHost(input) {
  try {
    if (!input || typeof input !== 'string') return DEFAULT_API
    let h = input.trim()
    if (!h) return DEFAULT_API

    // If only a port like ":8080" or "8080"
    if (/^:?\d{2,5}$/.test(h)) {
      const port = h.replace(/^:/, '')
      return `${location.protocol}//${location.hostname}:${port}/api`
    }

    // If missing protocol but has host (e.g., localhost:8080 or api.mydomain.com)
    if (!/^https?:\/\//i.test(h)) {
      if (h.startsWith('//')) {
        h = `${location.protocol}${h}`
      } else {
        if (h.startsWith(':')) {
          h = `${location.protocol}//${location.hostname}${h}`
        } else {
          h = `${location.protocol}//${h}`
        }
      }
    }

    h = h.replace(/\/$/, '')
    if (!/\/api$/i.test(h)) h = `${h}/api`
    return h
  } catch {
    return DEFAULT_API
  }
}

const API_BASE = (() => {
  // Allow runtime override via localStorage.app_settings.apiHost
  try {
    const raw = localStorage.getItem('app_settings')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed.apiHost === 'string' && parsed.apiHost.trim()) {
        return normalizeHost(parsed.apiHost)
      }
    }
  } catch {}
  return DEFAULT_API
})()

function getToken() {
  return localStorage.getItem('token')
}

// Create a dedicated axios instance
const http = axios.create({
  baseURL: API_BASE,
  withCredentials: false, // using Authorization: Bearer, not cookies
})

// Attach Authorization header unless explicitly skipped
http.interceptors.request.use((config) => {
  try {
    if (config && config.headers && config.headers['X-No-Auth']) {
      // Caller opted out
      const { ['X-No-Auth']: _omit, ...rest } = config.headers
      config.headers = rest
      return config
    }
  } catch {}

  const token = getToken()
  if (token) {
    config.headers = config.headers || {}
    if (!('Authorization' in config.headers)) {
      config.headers['Authorization'] = 'Bearer ' + token
    }
  }
  return config
})

// Unified error shape similar to previous apiFetch
http.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error && error.response) {
      const err = new Error(
        (error.response.data && (error.response.data.message || error.response.data.error)) ||
          error.message || 'Request failed'
      )
      err.status = error.response.status
      err.body = error.response.data
      throw err
    }
    throw error
  }
)

async function apiFetch(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase()
  const headers = { ...(options.headers || {}) }

  // Respect _noAuth flag by using a header the interceptor understands
  if (options._noAuth === true) headers['X-No-Auth'] = true

  const isForm = options.body instanceof FormData
  if (!headers['Content-Type'] && !isForm && method !== 'GET' && method !== 'HEAD') {
    headers['Content-Type'] = 'application/json'
  }

  const cfg = {
    url: path,
    method,
    headers,
  }

  if (method === 'GET' || method === 'HEAD') {
    // Optionally allow passing query via options.params
    if (options.params) cfg.params = options.params
  } else {
    // Body handling
    cfg.data = isForm ? options.body : (typeof options.body === 'string' ? options.body : options.body ? JSON.stringify(options.body) : undefined)
  }

  const res = await http.request(cfg)
  return res.data
}

export { API_BASE, apiFetch, getToken }
