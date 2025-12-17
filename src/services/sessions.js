import { apiFetch } from '@/services/api'

async function listSessions() {
  const items = await apiFetch('/sessions')
  return Array.isArray(items) ? items : []
}

async function revokeSession(id) {
  await apiFetch(`/sessions/${id}/terminate`, { method: 'POST' })
  return true
}

export { listSessions, revokeSession }
