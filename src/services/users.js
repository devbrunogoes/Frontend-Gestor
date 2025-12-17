import { apiFetch } from '@/services/api'

async function listUsers() {
  const users = await apiFetch('/users')
  return Array.isArray(users) ? users : []
}

async function getUser(id) {
  return await apiFetch(`/users/${id}`)
}

async function createUser(payload) {
  return await apiFetch('/users', { method: 'POST', body: JSON.stringify(payload) })
}

async function updateUser(id, payload) {
  return await apiFetch(`/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

async function deleteUser(id) {
  await apiFetch(`/users/${id}`, { method: 'DELETE' })
  return true
}

async function listRoles() {
  const roles = await apiFetch('/users/roles')
  return Array.isArray(roles) ? roles : []
}

export { listUsers, getUser, createUser, updateUser, deleteUser, listRoles }
