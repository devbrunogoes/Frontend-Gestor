import { apiFetch } from '@/services/api'

async function listPaymentMethods(){
  return await apiFetch('/payment-methods')
}

async function getPaymentMethod(id){
  return await apiFetch(`/payment-methods/${id}`)
}

async function createPaymentMethod(payload){
  return await apiFetch('/payment-methods', { method:'POST', body: JSON.stringify(payload) })
}

async function updatePaymentMethod(id, payload){
  return await apiFetch(`/payment-methods/${id}`, { method:'PUT', body: JSON.stringify(payload) })
}

async function deletePaymentMethod(id){
  await apiFetch(`/payment-methods/${id}`, { method:'DELETE' })
  return true
}

export { listPaymentMethods, getPaymentMethod, createPaymentMethod, updatePaymentMethod, deletePaymentMethod }
