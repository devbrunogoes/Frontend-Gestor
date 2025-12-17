import { apiFetch } from '@/services/api'

async function listExpenses(){
  return await apiFetch('/expenses')
}

async function getExpense(id){
  return await apiFetch(`/expenses/${id}`)
}

async function createExpense(payload){
  return await apiFetch('/expenses', { method:'POST', body: JSON.stringify(payload) })
}

async function updateExpense(id, payload){
  return await apiFetch(`/expenses/${id}`, { method:'PUT', body: JSON.stringify(payload) })
}

async function deleteExpense(id){
  await apiFetch(`/expenses/${id}`, { method:'DELETE' })
  return true
}

export { listExpenses, getExpense, createExpense, updateExpense, deleteExpense }
