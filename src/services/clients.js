import { apiFetch } from '@/services/api'

const BASES_READ = ['/clients', '/clientes', '/delivery-points']
const BASES_WRITE = ['/clients', '/clientes', '/delivery-points']

function normalizeClient(o = {}) {
  return {
    id: o.id,
    nome: o.nome ?? o.name ?? '',
    cpfcnpj: o.cpfcnpj ?? o.cpf ?? o.cnpj ?? '',
    telefone: o.telefone ?? '',
    email: o.email ?? '',
    active: o.active !== false,
    cep: o.cep ?? o.CEP ?? '',
    endereco: o.endereco ?? o.address ?? '',
    numero: o.numero ?? o.number ?? '',
    complemento: o.complemento ?? o.description ?? '',
    bairro: o.bairro ?? o.neighborhood ?? '',
    cidade: o.cidade ?? o.city ?? '',
    estado: o.estado ?? o.state ?? o.uf ?? '',
  }
}

async function tryFetch(path, options, bases = BASES_READ) {
  let lastErr
  for (const base of bases) {
    try {
      const res = await apiFetch(`${base}${path}`, options)
      return res
    } catch (err) {
      lastErr = err
      continue
    }
  }
  throw lastErr
}

async function listClients() {
  const arr = await tryFetch('', {}, BASES_READ)
  const list = Array.isArray(arr) ? arr : []
  return list.map(normalizeClient)
}

async function getClient(id) {
  const res = await tryFetch(`/${id}`, {}, BASES_READ)
  return normalizeClient(res)
}

function toLegacyPayload(payload) {
  return {
    name: payload.nome,
    cep: payload.cep,
    address: payload.endereco,
    number: payload.numero,
    neighborhood: payload.bairro,
    city: payload.cidade,
    state: payload.estado,
    description: payload.complemento ?? '',
    active: payload.active !== false,
  }
}

async function createClient(payload) {
  // Try modern endpoints first
  try {
    return await apiFetch('/clients', { method: 'POST', body: JSON.stringify(payload) })
  } catch (err1) {
    try {
      return await apiFetch('/clientes', { method: 'POST', body: JSON.stringify(payload) })
    } catch (err2) {
      // Fallback to legacy delivery-points shape
      const legacy = toLegacyPayload(payload)
      return await apiFetch('/delivery-points', { method: 'POST', body: JSON.stringify(legacy) })
    }
  }
}

async function updateClient(id, payload) {
  try {
    return await apiFetch(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
  } catch (err1) {
    try {
      return await apiFetch(`/clientes/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
    } catch (err2) {
      const legacy = toLegacyPayload(payload)
      return await apiFetch(`/delivery-points/${id}`, { method: 'PUT', body: JSON.stringify(legacy) })
    }
  }
}

async function deleteClient(id) {
  try {
    await apiFetch(`/clients/${id}`, { method: 'DELETE' })
    return true
  } catch (err1) {
    try {
      await apiFetch(`/clientes/${id}`, { method: 'DELETE' })
      return true
    } catch (err2) {
      await apiFetch(`/delivery-points/${id}`, { method: 'DELETE' })
      return true
    }
  }
}

export { listClients, getClient, createClient, updateClient, deleteClient }
