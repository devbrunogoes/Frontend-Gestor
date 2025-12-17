import { apiFetch } from '@/services/api'

async function listOrders() {
  const items = await apiFetch('/production-orders')
  return Array.isArray(items) ? items : []
}

async function getOrder(id) {
  return await apiFetch(`/production-orders/${id}`)
}

async function createOrder(payload) {
  return await apiFetch('/production-orders', { method: 'POST', body: JSON.stringify(payload) })
}

async function updateOrder(id, payload) {
  return await apiFetch(`/production-orders/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

async function deleteOrder(id) {
  await apiFetch(`/production-orders/${id}`, { method: 'DELETE' })
  return true
}

export { listOrders, getOrder, createOrder, updateOrder, deleteOrder }
