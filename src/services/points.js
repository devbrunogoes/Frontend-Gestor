import { apiFetch } from '@/services/api'

async function listPoints(routeId = null) {
  if (!routeId) return []
  const route = await apiFetch(`/routes/${routeId}`)
  const ids = Array.isArray(route?.pontos) ? route.pontos : []
  if (!ids.length) return []
  const all = await apiFetch('/delivery-points')
  const map = new Map((Array.isArray(all) ? all : []).map(p => [String(p.id), p]))
  return ids.map((pid, i) => {
    const p = map.get(String(pid)) || { id: pid, name: `Ponto ${pid}` }
    return {
      id: pid,
      ordem: i + 1,
      nome: p.name || p.nome,
      endereco: p.address || p.endereco || p.companyAddress || '',
      ...p,
    }
  })
}

async function getPoint(id) {
  // ponto é um DeliveryPoint
  return await apiFetch(`/delivery-points/${id}`)
}

async function createPoint({ routeId, pointId }) {
  if (!routeId || !pointId) throw new Error('routeId e pointId são obrigatórios')
  const route = await apiFetch(`/routes/${routeId}`)
  const ids = Array.isArray(route?.pontos) ? route.pontos.slice() : []
  if (!ids.includes(Number(pointId))) ids.push(Number(pointId))
  await apiFetch(`/routes/${routeId}`, { method: 'PUT', body: JSON.stringify({ pontos: ids }) })
  // retornar o ponto criado (delivery-point)
  return await apiFetch(`/delivery-points/${pointId}`)
}

async function updatePoint(id, payload) {
  // Atualização de ponto (DeliveryPoint) em si
  return await apiFetch(`/delivery-points/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

async function deletePoint({ routeId, pointId }) {
  if (!routeId || !pointId) throw new Error('routeId e pointId são obrigatórios')
  const route = await apiFetch(`/routes/${routeId}`)
  const ids = Array.isArray(route?.pontos) ? route.pontos.slice() : []
  const next = ids.filter(pid => String(pid) !== String(pointId))
  await apiFetch(`/routes/${routeId}`, { method: 'PUT', body: JSON.stringify({ pontos: next }) })
  return true
}

export { listPoints, getPoint, createPoint, updatePoint, deletePoint }
