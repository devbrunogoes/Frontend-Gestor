import { apiFetch } from '@/services/api'

async function listRoutes() {
  const items = await apiFetch('/routes')
  return Array.isArray(items) ? items : []
}

async function getRoute(id) {
  return await apiFetch(`/routes/${id}`)
}

async function createRoute(payload) {
  return await apiFetch('/routes', { method: 'POST', body: JSON.stringify(payload) })
}

async function updateRoute(id, payload) {
  return await apiFetch(`/routes/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

async function deleteRoute(id) {
  await apiFetch(`/routes/${id}`, { method: 'DELETE' })
  return true
}

export { listRoutes, getRoute, createRoute, updateRoute, deleteRoute }
