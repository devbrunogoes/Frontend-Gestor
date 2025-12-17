import { apiFetch } from '@/services/api'

async function listGoals(){
  return await apiFetch('/goals')
}

async function getGoal(id){
  return await apiFetch(`/goals/${id}`)
}

async function createGoal(payload){
  return await apiFetch('/goals', { method:'POST', body: JSON.stringify(payload) })
}

async function updateGoal(id, payload){
  return await apiFetch(`/goals/${id}`, { method:'PUT', body: JSON.stringify(payload) })
}

async function deleteGoal(id){
  await apiFetch(`/goals/${id}`, { method:'DELETE' })
  return true
}

export { listGoals, getGoal, createGoal, updateGoal, deleteGoal }
