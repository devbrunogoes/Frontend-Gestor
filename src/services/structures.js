import { apiFetch } from '@/services/api'

async function listStructures() {
  const items = await apiFetch('/structures')
  return Array.isArray(items) ? items : []
}

async function getStructure(id) {
  return await apiFetch(`/structures/${id}`)
}

async function createStructure(payload) {
  return await apiFetch('/structures', { method: 'POST', body: JSON.stringify(payload) })
}

async function updateStructure(id, payload) {
  return await apiFetch(`/structures/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

async function deleteStructure(id) {
  await apiFetch(`/structures/${id}`, { method: 'DELETE' })
  return true
}

export { listStructures, getStructure, createStructure, updateStructure, deleteStructure }
