import { apiFetch } from '@/services/api'

async function listCategories(){
  return await apiFetch('/products/categories')
}

async function getCategory(id){
  return await apiFetch(`/products/categories/${id}`)
}

async function createCategory(payload){
  return await apiFetch('/products/categories', { method:'POST', body: JSON.stringify(payload) })
}

async function updateCategory(id, payload){
  return await apiFetch(`/products/categories/${id}`, { method:'PUT', body: JSON.stringify(payload) })
}

async function deleteCategory(id){
  await apiFetch(`/products/categories/${id}`, { method:'DELETE' })
  return true
}

export { listCategories, getCategory, createCategory, updateCategory, deleteCategory }
