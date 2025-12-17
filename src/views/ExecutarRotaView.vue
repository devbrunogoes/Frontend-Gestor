<template>
  <section class="content-area">
    <div class="page-header">
      <h2>Execução de Rota</h2>
      <div class="toolbar-actions">
        <button class="btn btn-light" @click="goBack"><i class="fa-solid fa-arrow-left"></i> Voltar</button>
      </div>
    </div>

    <div v-if="errorMsg" style="color:#dc3545; margin-bottom:.5rem">{{ errorMsg }}</div>
    <div v-if="successMsg" style="color:#198754; margin-bottom:.5rem">{{ successMsg }}</div>

    <BaseError v-if="loadError" :message="loadError" :retry="reloadAll" />
    <BaseLoading v-else-if="loading" message="Carregando rotas e clientes…" />

    <!-- Compact execution bar (always visible) -->
    <div v-else>
      <div class="execution-bar panel" role="region" aria-label="Configuração da execução">
        <div class="form-group">
          <label for="execRota">Rota</label>
          <select id="execRota" class="form-control" v-model="routeId" aria-label="Selecionar rota">
            <option value="" disabled>Selecione a Rota…</option>
            <option v-for="r in routes" :key="r.id" :value="String(r.id)">{{ r.nome || r.name }}</option>
          </select>
        </div>

        <div class="form-group">
          <label for="execMotorista">Motorista</label>
          <input id="execMotorista" class="form-control" v-model="motorista" placeholder="Nome do motorista">
        </div>

        <div class="form-group">
          <label for="execVeiculo">Veículo</label>
          <input id="execVeiculo" class="form-control" v-model="veiculo" placeholder="Ex.: Van ABC-1234">
        </div>

        <div class="form-group">
          <label for="execPrevInicio">Início (prev.)</label>
          <input id="execPrevInicio" class="form-control" type="datetime-local" v-model="prevInicio">
        </div>

        <!-- points load automatically when a route is selected -->
        <div class="actions">
          <button id="btnIniciarRota" class="btn btn-success" :disabled="!canStartExecution" @click="beginExecution"><i
              class="fa-solid fa-play"></i>
            Iniciar Rota</button>
        </div>
        <div class="actions">
          <button id="btnFinalizarRota" class="btn btn-danger" :disabled="!execution" @click="finish"><i
              class="fa-solid fa-stop"></i> Finalizar
            Rota</button>
        </div>
      </div>

      <div class="load-panel panel" role="region" aria-label="Carga separada para a rota">
        <div class="panel-header load-header">
          <div class="load-header-text">
            <h3>Carga da rota</h3>
            <p class="panel-subtitle">Informe os pacotes que estão saindo para essa execução.</p>
          </div>
          <div class="load-actions">
            <span v-if="hasLoadManifest" class="load-total">Total: {{ formatQuantityDisplay(totalLoadQuantity) }}
              pacote(s)</span>
            <button v-if="!hasExecution && routeLoadItems.length" class="btn btn-light" type="button" @click="clearLoadItems">
              <i class="fa-solid fa-eraser"></i>
              Limpar carga
            </button>
            <button v-if="!hasExecution" class="btn btn-light" type="button" @click="addLoadItem">
              <i class="fa-solid fa-box-open"></i>
              Adicionar produto
            </button>
          </div>
        </div>

        <div class="panel-body load-body" v-if="!hasExecution">
          <div v-if="!routeLoadItems.length" class="empty-load">
            Nenhum item adicionado. Clique em “Adicionar produto” para montar a carga.
          </div>
          <div v-for="(item, index) in loadItemsDetailed" :key="item.uid" class="load-row">
            <label class="load-field">
              <span>Produto</span>
              <select class="form-control" v-model="routeLoadItems[index].productId">
                <option value="" disabled>Selecione o produto</option>
                <option v-for="product in products" :key="product.id" :value="String(product.id)">
                  {{ product.nome || product.name }}
                </option>
              </select>
            </label>
            <label class="load-field load-qty">
              <span>Quantidade</span>
              <input class="form-control" type="number" min="1" step="1"
                v-model.number="routeLoadItems[index].quantity" />
            </label>
            <div class="load-availability" v-if="item.product">
              Disponível: <strong>{{ formatQuantityDisplay(item.available) }}</strong>
            </div>
            <button class="btn btn-icon btn-danger" type="button" @click="removeLoadItem(index)" title="Remover item">
              <i class="fa-solid fa-times"></i>
            </button>
          </div>
        </div>

        <div class="panel-body load-body" v-else>
          <div v-if="!executionLoadItems.length" class="empty-load">
            Nenhuma carga registrada para esta execução.
          </div>
          <ul v-else class="load-summary">
            <li v-for="item in executionLoadItems" :key="item.uid">
              <strong>{{ item.productName }}</strong>
              <span>{{ formatQuantityDisplay(item.quantity) }} unidade(s)</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Main grid: points list left, summary right -->
      <div class="route-grid">
        <div class="route-main">
          <div class="deliveries-list panel">
            <div class="panel-header">
              <h3>Clientes da Rota</h3>
            </div>
            <div class="panel-body">
              <div class="points-list">
                <div v-for="(p, idx) in filteredPoints" :key="p.id" class="point-row">
                  <div class="order">{{ p.ordem || idx + 1 }}</div>
                  <div class="point-info">
                    <div class="title">{{ p.nome || p.name }}</div>
                    <div class="address">{{ formatPointCity(p) }}</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="panel-footer delivery-footer">
              <button id="btnPrevCheckpoint" class="btn btn-light" style="display:none;">Cliente Anterior</button>
              <button id="btnNextCheckpoint" class="btn btn-primary" style="display:none;">Ir para Próximo
                Cliente</button>
            </div>
          </div>
        </div>

        <aside class="route-sidebar">
          <div class="route-details panel">
            <div class="panel-header">
              <h3>Resumo da Rota</h3>
              <span class="status-chip" :class="executionStatusClass">
                {{ executionStatusLabel }}
              </span>
            </div>
            <div class="panel-body">
              <ul class="route-stats">
                <li class="route-stat route-progress">
                  <div class="progress-header">
                    <span>Progresso</span>
                    <strong>{{ summaryVisited }} / {{ totalPoints }}</strong>
                  </div>
                  <div class="progress-bar" aria-label="Progresso da rota">
                    <div class="progress-fill" :style="{ width: summaryProgressPercent + '%' }"></div>
                  </div>
                  <small class="progress-percent">{{ summaryProgressPercent }}%</small>
                </li>
                <li class="route-stat">
                  <i class="fa-solid fa-route"></i>
                  <div><span>Rota</span><strong id="infoRota">{{ currentRouteName }}</strong></div>
                </li>
                <li class="route-stat">
                  <i class="fa-solid fa-user"></i>
                  <div><span>Motorista</span><strong id="infoMotorista">{{ motorista || '—' }}</strong></div>
                </li>
                <li class="route-stat">
                  <i class="fa-solid fa-truck"></i>
                  <div><span>Veículo</span><strong id="infoVeiculo">{{ veiculo || '—' }}</strong></div>
                </li>
                <li class="route-stat">
                  <i class="fa-solid fa-clock"></i>
                  <div><span>Início (previsto)</span><strong id="infoPrevInicio">{{ prevInicioDisplay }}</strong></div>
                </li>
                <li class="route-stat" v-if="hasLoadManifest">
                  <i class="fa-solid fa-boxes-stacked"></i>
                  <div>
                    <span>Carga separada</span>
                    <strong>{{ formatQuantityDisplay(totalLoadQuantity) }} pacote(s)</strong>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
    <div v-if="showConfirmModal" class="modal-backdrop" role="presentation">
    <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="confirmExecutionTitle">
      <div class="modal-content">
        <header class="modal-header">
          <h3 id="confirmExecutionTitle">Confirmar início da rota</h3>
          <button type="button" class="btn btn-icon" aria-label="Fechar confirmação" @click="cancelExecutionStart">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </header>
        <div class="modal-body">
          <p class="modal-text">Revise os dados antes de iniciar a execução.</p>
          <ul class="confirm-summary">
            <li><span>Rota</span><strong>{{ currentRouteName }}</strong></li>
            <li><span>Motorista</span><strong>{{ motorista || '—' }}</strong></li>
            <li><span>Veículo</span><strong>{{ veiculo || '—' }}</strong></li>
            <li><span>Início (prev.)</span><strong>{{ prevInicioDisplay }}</strong></li>
            <li><span>Total de pacotes</span><strong>{{ formatQuantityDisplay(totalLoadQuantity) }}</strong></li>
          </ul>
          <div class="confirm-load">
            <h4>Carga separada</h4>
            <div v-if="!confirmationLoadItems.length" class="empty-confirm-load">
              Nenhum item informado.
            </div>
            <ul v-else class="confirm-load-list">
              <li v-for="item in confirmationLoadItems" :key="item.uid">
                <strong>{{ item.productName || 'Produto' }}</strong>
                <span>{{ formatQuantityDisplay(item.quantity) }} unidade(s)</span>
              </li>
            </ul>
          </div>
        </div>
        <footer class="modal-footer">
          <button type="button" class="btn btn-light" @click="cancelExecutionStart">Cancelar</button>
          <button type="button" class="btn btn-success" @click="confirmExecutionStart">
            <i class="fa-solid fa-play"></i>
            Confirmar início
          </button>
        </footer>
      </div>
    </div>
  </div>
  </section>

  
</template>

<script setup>
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { listRoutes, getRoute } from '@/services/routes'
import { listClients } from '@/services/clients'
import { listProducts, createStockMovement } from '@/services/products'
import { startExecution, completeExecution, listExecutions } from '@/services/routeExecutions'
import { useRouteExecutionStore } from '@/stores/routeExecution'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseError from '@/components/ui/BaseError.vue'

const routes = ref([])
const clients = ref([])
const products = ref([])
const points = ref([])
const routeId = ref('')
const execution = ref(null)
const errorMsg = ref('')
const successMsg = ref('')
const loading = ref(false)
const loadError = ref('')
const loadDrafts = ref({})
const showConfirmModal = ref(false)
const pendingExecutionPayload = ref(null)

let suppressDraftSync = false

// execution bar fields (bound to inputs)
const motorista = ref('')
const veiculo = ref('')
const prevInicio = ref('')
const startedHere = ref(false)
const routeLoadItems = ref([])

const hasExecution = computed(() => isExecutionActive(execution.value))

const router = useRouter()
const routeExecutionStore = useRouteExecutionStore()

let loadItemCounter = 0

const ACTIVE_EXECUTION_STATUSES = ['in_progress', 'started', 'running', 'active', 'em_andamento', 'em andamento', 'ativo']
const ACTIVE_EXECUTION_KEYWORDS = ['andamento', 'progress', 'ativo', 'running', 'start', 'execucao']
const COMPLETED_EXECUTION_STATUSES = ['completed', 'finished', 'finalizada', 'finalizado', 'encerrada', 'encerrado', 'cancelled', 'canceled', 'concluida', 'concluido']
const COMPLETED_EXECUTION_KEYWORDS = ['finaliz', 'conclu', 'encerr', 'cancel']
const INACTIVE_EXECUTION_STATUSES = ['pending', 'aguardando', 'modelo', 'model', 'draft', 'planejada', 'planned', 'aguardando inicio']
const INACTIVE_EXECUTION_KEYWORDS = ['pend', 'aguard', 'planej', 'model']

function normalizeExecutionState(status) {
  if (status == null) return ''
  return status
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function isExecutionActive(executionRecord) {
  if (!executionRecord) return false
  const status = normalizeExecutionState(executionRecord.status)
  if (COMPLETED_EXECUTION_STATUSES.includes(status) || COMPLETED_EXECUTION_KEYWORDS.some(keyword => status.includes(keyword))) return false
  if (INACTIVE_EXECUTION_STATUSES.includes(status) || INACTIVE_EXECUTION_KEYWORDS.some(keyword => status.includes(keyword))) return false
  if (ACTIVE_EXECUTION_STATUSES.includes(status) || ACTIVE_EXECUTION_KEYWORDS.some(keyword => status.includes(keyword))) return true
  if (!status) {
    if (executionRecord.fimReal || executionRecord.completedAt || executionRecord.finishedAt) return false
    const inferredFlag = executionRecord.inProgress ?? executionRecord.emAndamento ?? executionRecord.isActive ?? executionRecord.ativo ?? null
    if (typeof inferredFlag === 'boolean') return inferredFlag
    return false
  }
  return false
}

function cloneLoadItems(items) {
  return (Array.isArray(items) ? items : []).map(item => ({
    uid: item?.uid || `load-${Date.now()}-${++loadItemCounter}`,
    productId: item?.productId != null && item.productId !== '' ? String(item.productId) : '',
    quantity: item?.quantity === '' || item?.quantity == null ? '' : Number(item.quantity) || 0,
  }))
}

function replaceRouteLoadItems(nextItems) {
  suppressDraftSync = true
  routeLoadItems.value = nextItems
  nextTick(() => { suppressDraftSync = false })
}

function storeDraftForRoute(routeKey, items) {
  if (!routeKey) return
  loadDrafts.value = {
    ...loadDrafts.value,
    [routeKey]: cloneLoadItems(items),
  }
}

function clearDraftForRoute(routeKey) {
  if (!routeKey || !loadDrafts.value[routeKey]) return
  const { [routeKey]: removed, ...rest } = loadDrafts.value
  loadDrafts.value = rest
}

function restoreDraftForRoute(routeKey) {
  if (!routeKey) {
    replaceRouteLoadItems(routeLoadItems.value.length ? cloneLoadItems(routeLoadItems.value) : [newLoadItem()])
    return
  }
  const draft = loadDrafts.value[routeKey]
  if (draft && draft.length) {
    replaceRouteLoadItems(cloneLoadItems(draft))
  } else {
    replaceRouteLoadItems([newLoadItem()])
  }
}

const loadItemsDetailed = computed(() => routeLoadItems.value.map((item) => {
  const productId = item?.productId != null ? String(item.productId) : ''
  const product = products.value.find(p => String(p.id) === productId) || null
  const quantity = Math.max(0, Number(item?.quantity) || 0)
  const productName = product?.nome || product?.name || ''
  const available = Number(product?.stockQuantity ?? product?.estoque ?? product?.stock ?? 0) || 0
  return {
    uid: item?.uid || `load-${productId || 'novo'}-${quantity}`,
    productId,
    quantity,
    product,
    productName,
    available,
  }
}))

const executionLoadItems = computed(() => {
  if (!execution.value || !Array.isArray(execution.value.loadItems)) return []
  return execution.value.loadItems.map((item, index) => {
    const productId = item?.productId != null ? String(item.productId) : ''
    const product = products.value.find(p => String(p.id) === productId) || null
    const quantity = Math.max(0, Number(item?.quantity) || 0)
    const productName = item?.productName || product?.nome || product?.name || `Produto ${index + 1}`
    return {
      uid: `exec-${productId || index}`,
      productId,
      quantity,
      product,
      productName,
      available: Number(product?.stockQuantity ?? product?.estoque ?? product?.stock ?? 0) || 0,
    }
  })
})
const confirmationLoadItems = computed(() => loadItemsDetailed.value.filter(item => item.productId && item.quantity > 0))

const validLoadItems = computed(() => routeLoadItems.value
  .map(item => ({
    productId: item?.productId ? String(item.productId) : '',
    quantity: Number(item?.quantity) || 0,
  }))
  .filter(item => item.productId && item.quantity > 0)
)
const totalLoadQuantity = computed(() => {
  const source = hasExecution.value ? executionLoadItems.value : validLoadItems.value
  return source.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
})
const hasLoadManifest = computed(() => {
  if (hasExecution.value) return executionLoadItems.value.length > 0
  return validLoadItems.value.length > 0
})
const canStartExecution = computed(() => {
  if (!routeId.value) return false
  if (hasExecution.value) return false
  return validLoadItems.value.length > 0
})

function newLoadItem(overrides = {}) {
  loadItemCounter += 1
  return {
    uid: `load-${Date.now()}-${loadItemCounter}`,
    productId: '',
    quantity: '',
    ...overrides,
  }
}

function addLoadItem() {
  routeLoadItems.value = [...routeLoadItems.value, newLoadItem()]
}

function removeLoadItem(index) {
  const next = [...routeLoadItems.value]
  next.splice(index, 1)
  routeLoadItems.value = next
}

function clearLoadItems() {
  if (hasExecution.value) return
  replaceRouteLoadItems([newLoadItem()])
  if (routeId.value) clearDraftForRoute(String(routeId.value))
}

function formatQuantityDisplay(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '0'
  return number.toLocaleString('pt-BR')
}

async function loadRoutes() { routes.value = await listRoutes() }
async function loadClientsRef() { clients.value = await listClients() }
async function loadProductsRef() { products.value = await listProducts() }
async function loadPoints() {
  points.value = routeId.value ? await resolveRouteClients(routeId.value) : []
}
async function reloadAll() {
  loading.value = true; loadError.value = ''
  startedHere.value = false
  try {
    await Promise.all([loadRoutes(), loadClientsRef(), loadProductsRef()])
    await loadPoints()
    await refreshCurrent()
    if (hasExecution.value) {
      replaceRouteLoadItems([])
    } else {
      if (routeId.value) {
        clearDraftForRoute(String(routeId.value))
      }
      replaceRouteLoadItems([newLoadItem()])
    }
  }
  catch (e) { loadError.value = e?.message || 'Erro ao carregar dados da execução' }
  finally { loading.value = false }
}

const currentRouteName = computed(() => {
  const r = routes.value.find(r => String(r.id) === String(routeId.value))
  return r ? (r.nome || r.name) : 'Rota selecionada'
})

const filteredPoints = computed(() => Array.isArray(points.value) ? points.value : [])
const totalPoints = computed(() => filteredPoints.value.length)
const visitedPoints = computed(() => {
  if (!execution.value || !Array.isArray(execution.value.points)) return 0
  return execution.value.points.filter(p => normalizeStatus(p.status) === 'visited').length
})
const progressPercent = computed(() => {
  if (!totalPoints.value) return 0
  const percent = (visitedPoints.value / totalPoints.value) * 100
  return Math.min(100, Math.round(percent))
})

const showExecutionSummary = computed(() => hasExecution.value && startedHere.value)

const summaryVisited = computed(() => showExecutionSummary.value ? visitedPoints.value : 0)
const summaryProgressPercent = computed(() => showExecutionSummary.value ? progressPercent.value : 0)

const executionStatusKey = computed(() => {
  if (!showExecutionSummary.value) return 'modelo'
  const raw = (execution.value.status || '').toString().toLowerCase()
  if (['completed', 'finished', 'finalizada', 'finalizado', 'encerrada', 'encerrado'].includes(raw)) return 'completed'
  if (['in_progress', 'in-progress', 'em_andamento', 'em andamento', 'started', 'running', 'ativo', 'active'].includes(raw)) return 'in_progress'
  if (['pending', 'aguardando', 'pendente'].includes(raw)) return 'pending'
  return raw || 'modelo'
})

const executionStatusLabel = computed(() => {
  const key = executionStatusKey.value
  if (key === 'in_progress') return 'Em andamento'
  if (key === 'completed') return 'Concluída'
  if (key === 'pending') return 'Aguardando início'
  return 'Modelo'
})

const executionStatusClass = computed(() => {
  const key = executionStatusKey.value
  if (key === 'in_progress') return 'status-active'
  return 'status-idle'
})

const prevInicioDisplay = computed(() => prevInicio.value ? new Date(prevInicio.value).toLocaleString() : '—')

function normalizeStatus(status) {
  const normalized = (status || '').toString().toLowerCase()
  if (['visitado', 'visited', 'entregue', 'concluido', 'concluida'].includes(normalized)) return 'visited'
  if (['pulado', 'skipped', 'ignorado'].includes(normalized)) return 'skipped'
  if (['in_place', 'em_andamento', 'em andamento'].includes(normalized)) return 'in_place'
  if (['pendente', 'pending', 'aguardando'].includes(normalized)) return 'pending'
  if (['modelo', 'model'].includes(normalized)) return 'modelo'
  return normalized || 'pending'
}

async function resolveRouteClients(routeIdParam) {
  if (!routeIdParam) return []
  if (!clients.value.length) {
    try {
      clients.value = await listClients()
    } catch (err) {
      console.warn('Falha ao carregar clientes para a rota', err)
      return []
    }
  }

  try {
    const route = await getRoute(routeIdParam)
    const ids = Array.isArray(route?.clientes) ? route.clientes : (Array.isArray(route?.pontos) ? route.pontos : [])
    if (!ids.length) return []
    const map = new Map(clients.value.map(client => [String(client.id), client]))
    return ids.map((rawId, index) => {
      const id = String(rawId)
      const client = map.get(id) || {}
      return {
        id: client.id ?? rawId,
        ordem: index + 1,
        nome: client.nome || client.name || client.razaoSocial || `Cliente ${index + 1}`,
        endereco: client.endereco || client.address || client.companyAddress || client.logradouro || '',
        ...client
      }
    })
  } catch (err) {
    console.warn('Falha ao carregar rota para mapear clientes', err)
    return []
  }
}

async function refreshCurrent() {
  if (!routeId.value) {
    execution.value = null
    routeExecutionStore.clearActive()
    return
  }
  const list = await listExecutions(routeId.value, 'in_progress')
  const activeExecutions = Array.isArray(list) ? list.filter(isExecutionActive) : []
  execution.value = activeExecutions.length ? activeExecutions[activeExecutions.length - 1] : null
  if (execution.value) {
    routeExecutionStore.setActive({
      ...execution.value,
      routeName: currentRouteName.value,
    })
  } else {
    routeExecutionStore.clearActive()
  }
}

function formatPointCity(point) {
  const city = point?.cidade || point?.city || ''
  const state = point?.estado || point?.uf || ''
  if (!city && !state) return '—'
  if (city && state) return `${city} - ${state}`
  return city || state || '—'
}

function buildExecutionPayload() {
  if (!routeId.value) {
    errorMsg.value = 'Selecione uma rota antes de iniciar a execução.'
    return null
  }

  if (!validLoadItems.value.length) {
    errorMsg.value = 'Informe ao menos um produto e quantidade para a carga da rota.'
    return null
  }

  const plannedStart = prevInicio.value ? new Date(prevInicio.value) : null
  const startedAt = plannedStart && !Number.isNaN(plannedStart.valueOf()) ? plannedStart.toISOString() : null

  return {
    routeId: routeId.value,
    driver: motorista.value || null,
    vehicle: veiculo.value || null,
    startedAt,
    loadItems: validLoadItems.value.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
    })),
  }
}

async function performStart(payload) {
  errorMsg.value = ''
  successMsg.value = ''
  const manifest = Array.isArray(payload.loadItems) ? payload.loadItems : []
  const processedMovements = []
  const routeLabel = currentRouteName.value
  const stockNote = routeLabel ? `Separação rota ${routeLabel}` : 'Separação de carga de rota'
  const revertNote = routeLabel ? `Reversão separação rota ${routeLabel}` : 'Reversão de separação de rota'
  try {
    if (manifest.length) {
      for (const entry of manifest) {
        const rawId = entry?.productId ?? entry?.id ?? entry?.produtoId
        const productId = rawId != null ? Number(rawId) : null
        const quantity = Number(entry?.quantity ?? 0) || 0
        if (!productId || quantity <= 0) continue
        await createStockMovement(productId, {
          type: 'SAIDA',
          quantity,
          note: stockNote,
        })
        processedMovements.push({ productId, quantity })
      }
    }

    execution.value = await startExecution(payload)
  } catch (e) {
    if (processedMovements.length) {
      for (const movement of processedMovements) {
        try {
          await createStockMovement(movement.productId, {
            type: 'DEVOLUCAO',
            quantity: movement.quantity,
            note: revertNote,
          })
        } catch (restoreError) {
          console.warn('Falha ao reverter estoque após erro ao iniciar rota', restoreError)
        }
      }
    }
    errorMsg.value = e?.message || 'Erro ao iniciar'
    return null
  }

  routeExecutionStore.setActive({
    ...execution.value,
    routeName: currentRouteName.value,
  })
  startedHere.value = true
  successMsg.value = 'Execução iniciada.'
  try {
    points.value = await resolveRouteClients(routeId.value)
  } catch (loadErr) {
    console.warn('Falha ao carregar pontos após início da rota', loadErr)
  }
  clearDraftForRoute(String(routeId.value || ''))
  replaceRouteLoadItems([])
  return execution.value
}

function beginExecution() {
  errorMsg.value = ''
  successMsg.value = ''
  const payload = buildExecutionPayload()
  if (!payload) return
  pendingExecutionPayload.value = payload
  showConfirmModal.value = true
}

function cancelExecutionStart() {
  showConfirmModal.value = false
  pendingExecutionPayload.value = null
}

async function confirmExecutionStart() {
  if (!pendingExecutionPayload.value) {
    showConfirmModal.value = false
    return
  }

  const payload = { ...pendingExecutionPayload.value }
  showConfirmModal.value = false
  pendingExecutionPayload.value = null

  const exec = await performStart(payload)
  if (!exec) return

  const executionId = exec?.id != null ? String(exec.id) : ''
  try {
    if (executionId) {
      router.push({ path: '/rota-andamento', query: { executionId } })
    } else {
      router.push({ path: '/rota-andamento' })
    }
  } catch (e) {
    console.warn('Navigation failed', e)
  }
}

function goBack() { window.history.back() }

async function finish() {
  if (!execution.value) return
  errorMsg.value = ''; successMsg.value = ''
  try {
    await completeExecution(execution.value.id)
    routeExecutionStore.clearActive()
    successMsg.value = 'Execução concluída.'
    await refreshCurrent()
  } catch (e) { errorMsg.value = e?.message || 'Erro ao concluir' }
}

// map interaction removed

onMounted(async () => { await reloadAll() })

// load points automatically when user selects a route
watch(routeLoadItems, (items) => {
  items.forEach((item) => {
    if (item.productId != null && item.productId !== '') {
      item.productId = String(item.productId)
    }
    if (item.quantity === '' || item.quantity === null || item.quantity === undefined) return
    const numeric = Number(item.quantity)
    if (!Number.isFinite(numeric)) {
      item.quantity = ''
      return
    }
    if (numeric < 0) {
      item.quantity = Math.abs(numeric)
    }
  })
  if (suppressDraftSync) return
  if (routeId.value && !hasExecution.value) {
    storeDraftForRoute(String(routeId.value), items)
  }
}, { deep: true })

watch(execution, (current) => {
  if (isExecutionActive(current)) {
    replaceRouteLoadItems([])
    return
  }
  if (routeId.value) {
    restoreDraftForRoute(String(routeId.value))
  } else if (!routeLoadItems.value.length) {
    replaceRouteLoadItems([newLoadItem()])
  }
})

watch(routeId, async (val, oldVal) => {
  try {
    startedHere.value = false

    if (!val) {
      points.value = []
      execution.value = null
      routeExecutionStore.clearActive()
      replaceRouteLoadItems([])
      return
    }

    if (!products.value.length) {
      await loadProductsRef()
    }

    await loadPoints()
    await refreshCurrent()

    if (hasExecution.value) {
      replaceRouteLoadItems([])
    } else {
      clearDraftForRoute(String(val))
      replaceRouteLoadItems([newLoadItem()])
    }
  } catch (e) {
    console.error('Erro ao carregar clientes ao trocar rota', e)
  }
})
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.execution-bar {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(220px, 2fr) repeat(2, minmax(180px, 1fr)) minmax(200px, 1fr) auto auto;
  gap: 0.75rem;
  padding: 0.9rem;
  background: #fff;
  border: 1px solid #e9ecef;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(15, 30, 60, 0.06);
}

.load-panel {
  margin-top: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.load-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.load-header-text h3 {
  margin: 0;
}

.load-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.load-total {
  font-weight: 600;
  color: #0d6efd;
}

.load-body {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.load-row {
  display: grid;
  grid-template-columns: minmax(200px, 2.2fr) minmax(120px, 1fr) auto auto;
  gap: 0.75rem;
  align-items: end;
  padding: 0.85rem 0.95rem;
  border: 1px solid #e9ecef;
  border-radius: 10px;
  background: #f8f9fa;
}

.load-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.load-qty input {
  text-align: right;
}

.load-availability {
  font-size: 0.85rem;
  color: #6c757d;
  align-self: center;
}

.empty-load {
  padding: 1rem;
  text-align: center;
  border: 1px dashed #ced4da;
  border-radius: 10px;
  color: #6c757d;
}

.load-summary {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin: 0;
  padding: 0;
}

.load-summary li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.6rem 0.75rem;
  border: 1px solid #e9ecef;
  border-radius: 10px;
  background: #f8f9fa;
}

.execution-bar .form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
}

.execution-bar .form-group label {
  font-size: 0.82rem;
  color: #6c757d;
  letter-spacing: 0.01em;
}

.execution-bar .form-control {
  height: 38px;
  padding: 6px 10px;
}

.execution-bar .actions {
  align-self: end;
}

.execution-bar .actions .btn {
  min-width: 140px;
}

.route-grid {
  margin-top: 1.25rem;
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(260px, 1.2fr);
  gap: 1.25rem;
  width: 100%;
}

.route-main,
.route-sidebar {
  min-width: 0;
}

.deliveries-list .panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.deliveries-list h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.points-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.point-row {
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: 0.75rem;
  padding: 0.65rem 0.75rem;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  background: #fff;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}

.point-row .order {
  font-weight: 700;
  color: #0d6efd;
  margin-bottom: 0.2rem;
}

.point-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.point-row .title {
  font-weight: 600;
}

.point-row .address {
  font-size: 0.87rem;
  color: #6c757d;
}

.delivery-footer {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
}

.route-details .panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid #e9ecef;
}

.route-details .panel-header h3 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.3rem 0.65rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.status-active {
  background: #d1e7dd;
  color: #0f5132;
}

.status-idle {
  background: #e2e3e5;
  color: #343a40;
}

.route-stats {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  margin: 0;
  padding: 0;
}

.route-stat {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem;
  border: 1px solid #e9ecef;
  border-radius: 10px;
  background: #f8f9fa;
}

.route-stat i {
  font-size: 1.45rem;
  color: #0d6efd;
}

.route-stat span {
  display: block;
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6c757d;
  margin-bottom: 0.2rem;
}

.route-stat strong {
  display: block;
  font-size: 1.05rem;
  color: #212529;
}

.route-progress {
  flex-direction: column;
  align-items: stretch;
  gap: 0.6rem;
}

.progress-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
}

.progress-bar {
  position: relative;
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: #e9ecef;
  overflow: hidden;
}

.progress-fill {
  position: absolute;
  inset: 0;
  width: 0;
  background: linear-gradient(90deg, #0d6efd, #6610f2);
  transition: width 0.3s ease;
}

.progress-percent {
  font-size: 0.76rem;
  font-weight: 600;
  color: #495057;
  text-align: right;
}

@media (max-width: 1100px) {
  .execution-bar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .load-row {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
}

@media (max-width: 720px) {
  .execution-bar {
    grid-template-columns: 1fr;
  }

  .execution-bar .actions {
    width: 100%;
  }

  .execution-bar .actions .btn {
    width: 100%;
  }

  .route-grid {
    grid-template-columns: 1fr;
  }

  .load-row {
    grid-template-columns: 1fr;
  }

  .load-availability {
    justify-self: flex-start;
  }

  .load-row .btn {
    justify-self: flex-end;
  }

  .delivery-footer {
    flex-direction: column;
  }
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  z-index: 1050;
}

.modal-dialog {
  width: min(560px, 92vw);
}

.modal-content {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 18px 36px rgba(15, 30, 60, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header,
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
}

.modal-header {
  border-bottom: 1px solid #e9ecef;
}

.modal-footer {
  border-top: 1px solid #e9ecef;
}

.modal-header .btn-icon {
  border: none;
  background: transparent;
  color: #6c757d;
  padding: 0.25rem;
  cursor: pointer;
}

.modal-header .btn-icon:hover {
  color: #212529;
}

.modal-body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.modal-text {
  margin: 0;
  color: #6c757d;
  font-size: 0.92rem;
}

.confirm-summary {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.65rem 1rem;
  margin: 0;
  padding: 0;
}

.confirm-summary span {
  display: block;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6c757d;
}

.confirm-summary strong {
  font-size: 1.02rem;
  color: #212529;
}

.confirm-load {
  border-top: 1px solid #e9ecef;
  padding-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.confirm-load h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.confirm-load-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
}

.confirm-load-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.55rem 0.75rem;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  background: #f8f9fa;
}

.confirm-load-list span {
  font-size: 0.92rem;
  color: #495057;
}

.empty-confirm-load {
  padding: 0.75rem;
  border: 1px dashed #ced4da;
  border-radius: 10px;
  text-align: center;
  color: #6c757d;
  font-size: 0.9rem;
}
</style>
