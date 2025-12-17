import { apiFetch } from '@/services/api'

async function listProducts() {
  // Ler sempre do backend; em caso de erro, propagar para a UI tratar
  return await apiFetch('/products')
}

async function getProduct(id) {
  return await apiFetch(`/products/${id}`)
}

async function createProduct(payload) {
  // Persistir no backend obrigatoriamente
  return await apiFetch('/products', { method: 'POST', body: JSON.stringify(payload) })
}

async function updateProduct(id, payload) {
  return await apiFetch(`/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

async function deleteProduct(id) {
  await apiFetch(`/products/${id}`, { method: 'DELETE' })
  return true
}

async function createStockMovement(productId, payload) {
  return await apiFetch(`/products/${productId}/movements`, {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export { listProducts, getProduct, createProduct, updateProduct, deleteProduct, createStockMovement }
