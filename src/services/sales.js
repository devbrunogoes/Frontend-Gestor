import { apiFetch } from '@/services/api'

async function listSales() {
  return await apiFetch('/sales')
}

async function createSale(payload) {
  return await apiFetch('/sales', { method: 'POST', body: JSON.stringify(payload) })
}

async function registerReturn(saleId, ret) {
  return await apiFetch(`/sales/${saleId}/returns`, { method: 'POST', body: JSON.stringify(ret) })
}

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

const CLIENT_ENDPOINTS = ['/clients', '/clientes', '/delivery-points', '/pontos', '/pontos-entrega']
async function listClients() {
  const bases = ['/clients', '/clientes', '/delivery-points']
  let lastErr
  for (const base of bases) {
    try {
      const arr = await apiFetch(base)
      return (Array.isArray(arr) ? arr : []).map(normalizeClient)
    } catch (err) {
      lastErr = err
    }
  }
  throw lastErr
}

async function listExecutions() {
  const arr = await apiFetch('/route-executions')
  return Array.isArray(arr) ? arr : []
}

async function listCatalog() {
  const arr = await apiFetch('/products')
  return Array.isArray(arr) ? arr.map(p => ({ nome: p.name || p.nome || 'Produto', preco: Number(p.price || p.preco || 0) })) : []
}

export { listSales, createSale, registerReturn, listClients, listExecutions, listCatalog }
