import { apiFetch } from '@/services/api'

function normalizeCheckpoint(raw, idx = 0) {
  const base = raw && typeof raw === 'object' ? { ...raw } : {}
  const rawPid = base.pid ?? base.pointId ?? base.id ?? raw
  const pid = rawPid != null ? Number(rawPid) : null

  const delivered = Boolean(base.entregue ?? base.delivered ?? base.visited ?? false)
  const arrival = base.chegada ?? base.arrival ?? base.arrivedAt ?? null
  const departure = base.saida ?? base.departure ?? base.leftAt ?? null
  const rawStatus = (base.status || '').toString().toLowerCase()

  let status = null
  if (rawStatus) {
    if (['visitado', 'visited', 'concluido', 'concluida', 'finalizado', 'finalizada', 'feito', 'entregue'].includes(rawStatus)) {
      status = 'visited'
    } else if (['pulado', 'skipped', 'ignorado'].includes(rawStatus)) {
      status = 'skipped'
    } else if (['in_place', 'em_andamento', 'em_progresso', 'chegada'].includes(rawStatus)) {
      status = 'in_place'
    } else if (['pendente', 'pending', 'aguardando'].includes(rawStatus)) {
      status = 'pending'
    }
  }

  if (!status) {
    if (delivered) status = 'visited'
    else if (arrival && !departure) status = 'in_place'
    else if (arrival && departure) status = 'skipped'
    else status = 'pending'
  }

  return {
    ...base,
    pid,
    pointId: pid,
    chegada: arrival,
    saida: departure,
    entregue: delivered,
    status,
    idx,
  }
}

function mapExec(e) {
  if (!e) return e
  const rawCheckpoints = Array.isArray(e.checkpoints)
    ? e.checkpoints
    : Array.isArray(e.checkPoints)
      ? e.checkPoints
      : []

  const checkpoints = rawCheckpoints.map((cp, idx) => normalizeCheckpoint(cp, idx))

  const points = checkpoints.map(cp => ({
    pointId: cp.pointId,
    status: cp.status,
    idx: cp.idx,
  }))

  const loadItems = Array.isArray(e.loadItems)
    ? e.loadItems.map(item => ({
        productId: item?.productId ?? item?.produtoId ?? item?.idProduto ?? null,
        productName: item?.productName ?? item?.nomeProduto ?? item?.nome ?? null,
        quantity: Number(item?.quantity ?? item?.qtd ?? 0) || 0,
      })).filter(item => item.productId != null && item.quantity > 0)
    : []

  const normalizedStatus = (() => {
    const raw = (e.status || '').toString().toLowerCase()
    if (raw) return raw
    if (e.fimReal || e.finishedAt || e.completedAt) return 'completed'
    return 'in_progress'
  })()

  return {
    ...e,
    checkpoints,
    points,
    loadItems,
    status: normalizedStatus,
  }
}

async function listExecutions(routeId = null, status = null) {
  const items = await apiFetch('/route-executions')
  const arr = (Array.isArray(items) ? items : []).map(mapExec)
  return arr.filter(e => (
    (!routeId || String(e.routeId) === String(routeId)) &&
    (!status || (status === 'in_progress' ? !e.fimReal : status === 'completed' ? !!e.fimReal : true))
  ))
}

async function getExecution(id) {
  const e = await apiFetch(`/route-executions/${id}`)
  return mapExec(e)
}

function resolveNumericId(value) {
  if (value == null) return null
  if (typeof value === 'object') {
    const inner = value.id ?? value.pointId ?? value.pid ?? value.value ?? value.codigo ?? value.codigoId
    return resolveNumericId(inner)
  }
  const coerced = Number(value)
  if (Number.isFinite(coerced)) return coerced
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function buildCheckpointIds(checkpointsInput) {
  if (!Array.isArray(checkpointsInput)) return []
  const ids = []
  checkpointsInput.forEach((item) => {
    const numeric = resolveNumericId(item)
    if (numeric != null) ids.push(numeric)
  })
  return ids
}

async function startExecution({ routeId, driver = null, vehicle = null, startedAt = null, loadItems = [] }) {
  if (!routeId) throw new Error('routeId é obrigatório para iniciar uma execução')
  const route = await apiFetch(`/routes/${routeId}`)
  const rawCheckpoints = Array.isArray(route?.clientes)
    ? route.clientes
    : Array.isArray(route?.pontos)
      ? route.pontos
      : []
  const checkpointIds = buildCheckpointIds(rawCheckpoints)

  const metadata = {
    motorista: driver || null,
    veiculo: vehicle || null,
    inicioPrevisto: startedAt || null,
  }

  const manifest = Array.isArray(loadItems)
    ? loadItems
        .map(item => ({
          productId: resolveNumericId(item?.productId ?? item?.id ?? item?.produtoId),
          quantity: Number(item?.quantity ?? 0) || 0,
        }))
        .filter(item => item.productId != null && item.quantity > 0)
    : []

  const numericRouteId = resolveNumericId(routeId) ?? resolveNumericId(route?.id) ?? routeId

  const payload = {
    routeId: numericRouteId,
    driver,
    vehicle,
    prevInicio: startedAt,
    checkpoints: checkpointIds,
    metadata,
    loadItems: manifest,
  }

  const created = await apiFetch('/route-executions', { method: 'POST', body: JSON.stringify(payload) })
  return mapExec(created)
}

async function completeExecution(id) {
  const e = await apiFetch(`/route-executions/${id}/finish`, { method: 'POST' })
  return mapExec(e)
}

async function setPointStatus(executionId, pointId, status, meta = null) {
  const exec = await getExecution(executionId)
  const cps = Array.isArray(exec?.checkpoints) ? exec.checkpoints : []
  const idx = cps.findIndex(cp => String(cp.pid ?? cp.pointId) === String(pointId))
  if (idx < 0) throw new Error('Ponto não encontrado na execução')

  let updated
  if (status === 'visited') {
    await apiFetch(`/route-executions/${executionId}/arrival/${idx}`, { method: 'POST' })
    // allow sending additional data (e.g. delivered quantity) in the deliver endpoint
    const body = meta && typeof meta === 'object' ? JSON.stringify(meta) : JSON.stringify({})
    updated = await apiFetch(`/route-executions/${executionId}/deliver/${idx}`, { method: 'POST', body })
  } else if (status === 'skipped') {
    await apiFetch(`/route-executions/${executionId}/arrival/${idx}`, { method: 'POST' })
    updated = await apiFetch(`/route-executions/${executionId}/departure/${idx}`, { method: 'POST' })
  } else {
    updated = exec
  }
  return mapExec(updated)
}

export { listExecutions, getExecution, startExecution, completeExecution, setPointStatus }
