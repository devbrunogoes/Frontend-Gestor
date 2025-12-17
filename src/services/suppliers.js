import { apiFetch } from '@/services/api'

async function listSuppliers(){
  return await apiFetch('/products/suppliers')
}

async function getSupplier(id){
  return await apiFetch(`/products/suppliers/${id}`)
}

async function createSupplier(payload){
  return await apiFetch('/products/suppliers', { method:'POST', body: JSON.stringify(payload) })
}

async function updateSupplier(id, payload){
  return await apiFetch(`/products/suppliers/${id}`, { method:'PUT', body: JSON.stringify(payload) })
}

async function deleteSupplier(id){
  await apiFetch(`/products/suppliers/${id}`, { method:'DELETE' })
  return true
}

export { listSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier }
