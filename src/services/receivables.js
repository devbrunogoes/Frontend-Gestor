import { apiFetch } from '@/services/api'

async function listReceivables(){
  return await apiFetch('/receivables')
}

async function getReceivable(id){
  return await apiFetch(`/receivables/${id}`)
}

async function createReceivable(payload){
  return await apiFetch('/receivables', { method:'POST', body: JSON.stringify(payload) })
}

async function updateReceivable(id, payload){
  return await apiFetch(`/receivables/${id}`, { method:'PUT', body: JSON.stringify(payload) })
}

async function deleteReceivable(id){
  await apiFetch(`/receivables/${id}`, { method:'DELETE' })
  return true
}

export { listReceivables, getReceivable, createReceivable, updateReceivable, deleteReceivable }
