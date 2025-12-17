import { apiFetch } from '@/services/api'

async function listCommissions() {
  return await apiFetch('/commissions')
}

async function getCommission(id) {
  return await apiFetch(`/commissions/${id}`)
}

async function createCommission(payload) {
  return await apiFetch('/commissions', { method: 'POST', body: JSON.stringify(payload) })
}

async function updateCommission(id, payload) {
  return await apiFetch(`/commissions/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

async function deleteCommission(id) {
  await apiFetch(`/commissions/${id}`, { method: 'DELETE' })
  return true
}

export { listCommissions, getCommission, createCommission, updateCommission, deleteCommission }
