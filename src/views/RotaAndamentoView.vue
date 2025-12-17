<template>
  <section class="content-area">
    <div class="page-header">
      <h2>Rota em Andamento</h2>
      <div class="toolbar-actions" v-if="execution">
        <button class="btn btn-light" type="button" @click="refresh()">
          <i class="fa-solid fa-arrows-rotate"></i> Atualizar
        </button>
      </div>
    </div>

    <div v-if="errorMsg" class="feedback feedback-error">{{ errorMsg }}</div>
    <div v-if="successMsg" class="feedback feedback-success">{{ successMsg }}</div>

    <transition name="toast">
      <div v-if="toastVisible" class="toast-notification">
        <i class="fa-solid fa-circle-check"></i>
        <span>{{ toastMessage }}</span>
      </div>
    </transition>

    <BaseError v-if="loadError" :message="loadError" :retry="refresh" />
    <BaseLoading v-else-if="loading" message="Carregando execução…" />

    <div v-else-if="!execution" class="panel empty-state">
      <h3>Nenhuma rota em andamento</h3>
    <p>Inicie uma execução na página “Executar Rota” para acompanhar os clientes aqui.</p>
      <button class="btn btn-primary" type="button" @click="goBack">
        <i class="fa-solid fa-arrow-left"></i> Voltar
      </button>
    </div>

    <div v-else class="route-progress">
      <div class="overview panel">
        <div class="overview-header">
          <div>
            <span>Rota</span>
            <h3>{{ routeName(execution.routeId) }}</h3>
          </div>
          <div class="overview-status">
            <span class="status-chip" :class="inProgress ? 'status-active' : 'status-idle'">
              {{ executionStatusLabel(execution.status) }}
            </span>
            <span class="progress-chip">{{ progressPercent }}%</span>
          </div>
        </div>
        <div class="overview-counters">
          <div class="metric">
            <span>Atendidos</span>
            <strong>{{ visitedCount }}</strong>
          </div>
          <div class="metric">
            <span>Pendentes</span>
            <strong>{{ pendingCount }}</strong>
          </div>
          <div class="metric">
            <span>Pulados</span>
            <strong>{{ skippedCount }}</strong>
          </div>
          <div class="metric">
            <span>Início</span>
            <strong>{{ formatDate(execution.startedAt) }}</strong>
          </div>
          <div class="metric" v-if="executionLoadItems.length">
            <span>Carga restante</span>
            <strong>{{ formatQuantity(totalLoadQuantity) }}</strong>
            <small v-if="totalInitialLoadQuantity && totalInitialLoadQuantity !== totalLoadQuantity">
              de {{ formatQuantity(totalInitialLoadQuantity) }}
            </small>
          </div>
        </div>
      </div>

      <div class="route-grid">
        <div class="route-main">
          <div class="deliveries-list panel">
            <div class="panel-header deliveries-header">
              <div class="panel-title-block">
                <h3>Clientes da rota</h3>
                <span class="panel-subtitle">{{ visitedCount }} de {{ totalPoints }} visitados</span>
              </div>
              <div class="view-mode-toggle" role="tablist">
                <button
                  type="button"
                  class="toggle-btn"
                  :class="{ 'is-active': viewMode === 'list' }"
                  @click="setViewMode('list')"
                >
                  <i class="fa-solid fa-list" aria-hidden="true"></i>
                  <span>Lista</span>
                </button>
                <button
                  type="button"
                  class="toggle-btn"
                  :class="{ 'is-active': viewMode === 'step' }"
                  @click="setViewMode('step')"
                  :disabled="!points.length"
                >
                  <i class="fa-solid fa-person-walking" aria-hidden="true"></i>
                  <span>Passo a passo</span>
                </button>
              </div>
            </div>
            <div class="panel-body">
              <div v-if="!points.length" class="empty-points">
                Nenhum cliente cadastrado para esta rota.
              </div>
              <template v-else>
                <div v-if="viewMode === 'list'" class="points-list">
                  <div
                    v-for="(point, index) in points"
                    :key="point.id"
                    class="point-row clickable"
                    :class="[statusClass(pointStatus(point.id)), { 'active-click': clickedPointId === point.id }]"
                    @click="openDeliverModal(point)"
                  >
                    <div class="left">
                      <div class="order">{{ point.ordem || index + 1 }}</div>
                      <div class="title">{{ point.nome || point.name }}</div>
                      <div class="address">{{ pointCityLabel(point) }}</div>
                    </div>
                    <div class="right">
                      <span class="status-tag" :class="statusClass(pointStatus(point.id))">
                        {{ pointStatusLabel(pointStatus(point.id)) }}
                      </span>
                      
                      <button
                        class="btn btn-icon btn-skip"
                        type="button"
                        :disabled="!inProgress"
                        @click.stop="mark(point.id, 'skipped')"
                      >
                        <i class="fa-solid fa-forward-step"></i>
                      </button>
                    </div>
                  </div>
                </div>
                <div v-else class="point-stepper">
                  <div v-if="stepPoint && pendingCount > 0" class="stepper-card" :class="statusClass(stepPointStatus)">
                    <div class="stepper-head">
                      <div>
                        <span class="stepper-order">Ponto {{ stepIndex + 1 }} de {{ totalPoints }}</span>
                        <h4 class="stepper-title">{{ stepPoint.nome || stepPoint.name }}</h4>
                        <p class="stepper-address">{{ pointCityLabel(stepPoint) }}</p>
                      </div>
                      <span class="status-tag" :class="statusClass(stepPointStatus)">
                        {{ pointStatusLabel(stepPointStatus) }}
                      </span>
                    </div>
                    <div class="stepper-meta" v-if="stepPoint.endereco || stepPoint.address">
                      <i class="fa-solid fa-location-dot" aria-hidden="true"></i>
                      <span>{{ stepPoint.endereco || stepPoint.address }}</span>
                    </div>
                    <div class="stepper-actions">
                      <button
                        type="button"
                        class="btn btn-outline"
                        :disabled="!hasPrevPoint"
                        @click="goPrevPoint"
                      >
                        <i class="fa-solid fa-arrow-left"></i>
                        Anterior
                      </button>
                      <button
                        type="button"
                        class="btn btn-primary"
                        @click="openDeliverModal(stepPoint)"
                      >
                        <i class="fa-solid fa-clipboard-check"></i>
                        Registrar entrega
                      </button>
                      <button
                        type="button"
                        class="btn btn-warning"
                        :disabled="!inProgress"
                        @click="mark(stepPoint.id, 'skipped')"
                      >
                        <i class="fa-solid fa-forward-step"></i>
                        Pular ponto
                      </button>
                      <button
                        type="button"
                        class="btn btn-outline"
                        :disabled="!hasNextPoint"
                        @click="goNextPoint"
                      >
                        Avançar
                        <i class="fa-solid fa-arrow-right"></i>
                      </button>
                    </div>
                  </div>
                  <div v-else class="stepper-empty">
                    <i class="fa-solid fa-check-double" aria-hidden="true"></i>
                    <p>Todos os clientes foram atendidos. Excelente trabalho!</p>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>

        <aside class="route-sidebar">
          <div class="route-details panel">
            <div class="panel-header">
              <h3>Resumo</h3>
            </div>
            <div class="panel-body">
              <ul class="route-stats">
                <li class="route-stat route-progress">
                  <div class="progress-header">
                    <span>Progresso</span>
                    <strong>{{ visitedCount }} / {{ totalPoints }}</strong>
                  </div>
                  <div class="progress-bar">
                    <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
                  </div>
                  <small class="progress-percent">{{ progressPercent }}%</small>
                </li>
                <li class="route-stat">
                  <i class="fa-solid fa-user"></i>
                  <div>
                    <span>Motorista</span>
                    <strong>{{ execution.metadata?.motorista || '—' }}</strong>
                  </div>
                </li>
                <li class="route-stat">
                  <i class="fa-solid fa-truck"></i>
                  <div>
                    <span>Veículo</span>
                    <strong>{{ execution.metadata?.veiculo || '—' }}</strong>
                  </div>
                </li>
                <li class="route-stat">
                  <i class="fa-solid fa-list-check"></i>
                  <div>
                    <span>Clientes pendentes</span>
                    <strong>{{ pendingCount }}</strong>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <div class="panel standalone-card" v-if="executionLoadItems.length">
            <div class="panel-header">
              <h3>Carga separada</h3>
            </div>
            <div class="panel-body load-manifest-body">
              <ul class="load-manifest-list">
                <li v-for="item in executionLoadItems" :key="item.uid">
                  <div class="load-manifest-name">{{ item.productName || 'Produto' }}</div>
                  <div class="load-manifest-qty">
                    <span class="load-qty-remaining">{{ formatQuantity(item.remaining) }} un.</span>
                    <small v-if="item.delivered > 0" class="load-qty-delivered">Entregues: {{ formatQuantity(item.delivered) }}</small>
                    <small class="load-qty-original">Inicial: {{ formatQuantity(item.quantity) }}</small>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <div class="panel standalone-card">
            <div class="panel-header">
              <h3>Venda avulsa</h3>
            </div>
            <div class="panel-body standalone-card-body">
              <p>Registre uma venda fora dos clientes da rota atual.</p>
              <button
                class="btn btn-primary btn-standalone"
                type="button"
                @click="toggleStandaloneSale"
              >
                <i class="fa-solid" :class="showStandaloneSale ? 'fa-circle-minus' : 'fa-cart-plus'"></i>
                {{ showStandaloneSale ? 'Fechar venda avulsa' : 'Nova venda avulsa' }}
              </button>
            </div>
          </div>
        </aside>
      </div>

      <transition name="fade">
        <section v-if="showStandaloneSale" class="standalone-sale panel">
          <div class="panel-header standalone-header">
            <h3>Venda avulsa durante a rota</h3>
            <button class="btn btn-link btn-close-panel" type="button" @click="toggleStandaloneSale">
              <i class="fa-solid fa-xmark"></i>
              Fechar
            </button>
          </div>
          <div class="panel-body standalone-body">
            <SalesComposer
              :clients="clients"
              :execucoes="standaloneExecutions"
              :catalogo="products"
              :defaults="saleComposerDefaults"
              @saved="handleStandaloneSaleSaved"
            />
          </div>
        </section>
      </transition>

      <div class="finish-section" v-if="execution">
        <button
          class="btn btn-secondary btn-finish"
          type="button"
          @click="finish"
          :disabled="!canFinish || finishing"
        >
          <i class="fa-solid fa-flag-checkered"></i>
          Concluir Execução
        </button>
      </div>
    </div>

    <div v-show="showDeliverModal" class="modal">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Registrar entrega</h3>
            <button class="btn-close" type="button" @click="closeDeliverModal">
              <i class="fa-solid fa-times"></i>
            </button>
          </div>
          <form @submit.prevent="submitDeliver">
            <div class="modal-body">
              <div class="form-group">
                <label>Cliente da rota</label>
                <div>
                  <strong>{{ deliverPoint?.nome || deliverPoint?.name || '—' }}</strong>
                  <div v-if="routeClientName" class="form-hint">{{ routeClientName }}</div>
                  <div class="client-meta">
                    <div class="client-meta-item">
                      <span class="client-meta-label">Cidade</span>
                      <span class="client-meta-value">{{ deliverClientDetails.city }}</span>
                    </div>
                    <div class="client-meta-item">
                      <span class="client-meta-label">CNPJ/CPF</span>
                      <span class="client-meta-value">{{ deliverClientDetails.document }}</span>
                    </div>
                    <div class="client-meta-item">
                      <span class="client-meta-label">Telefone</span>
                      <span class="client-meta-value">{{ deliverClientDetails.phone }}</span>
                    </div>
                    <div class="client-meta-item">
                      <span class="client-meta-label">E-mail</span>
                      <span class="client-meta-value">{{ deliverClientDetails.email }}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="product-picker">
                <div class="form-group">
                  <label for="modal-search-produto">Buscar produto</label>
                  <input
                    id="modal-search-produto"
                    class="form-control"
                    type="search"
                    v-model="productSearch"
                    placeholder="Digite para filtrar produtos"
                  />
                </div>
                <div v-if="!hasDeliverableProducts" class="empty-products">
                  Nenhum produto separado para esta rota.
                </div>
                <div v-else-if="!filteredProducts.length" class="empty-products">
                  Nenhum produto encontrado para a busca.
                </div>
                <div v-else class="product-grid">
                  <div
                    v-for="product in filteredProducts"
                    :key="product.id"
                    class="product-card"
                    :class="{ expanded: expandedProductId === String(product.id) }"
                  >
                    <button
                      type="button"
                      class="product-card-header"
                      @click="toggleProductActions(product)"
                    >
                      <div class="product-info">
                        <strong>{{ product.nome || product.name }}</strong>
                        <small>{{ currencyFormatter.format(extractProductPrice(product) || 0) }}</small>
                      </div>
                      <i
                        class="fa-solid"
                        :class="expandedProductId === String(product.id) ? 'fa-chevron-up' : 'fa-chevron-down'"
                      ></i>
                    </button>
                    <transition name="fade">
                      <div
                        v-if="expandedProductId === String(product.id)"
                        class="product-card-actions"
                      >
                        <button type="button" class="action-btn action-sale" @click="handleProductAction(product, 'venda')">
                          <i class="fa-solid fa-hand-holding-dollar"></i>
                          Venda
                        </button>
                        <button type="button" class="action-btn action-gift" @click="handleProductAction(product, 'brinde')">
                          <i class="fa-solid fa-gift"></i>
                          Brinde
                        </button>
                        <button type="button" class="action-btn action-exchange" @click="handleProductAction(product, 'troca')">
                          <i class="fa-solid fa-rotate"></i>
                          Troca
                        </button>
                      </div>
                    </transition>
                  </div>
                </div>
              </div>

              <div v-if="saleItems.length" class="selected-items">
                <h4 class="selected-title">Itens selecionados</h4>
                <div
                  v-for="(item, index) in saleItemsWithMeta"
                  :key="item.id"
                  class="selected-card"
                >
                  <div class="selected-header">
                    <div class="selected-info">
                      <strong>{{ item.product?.nome || item.product?.name || 'Produto' }}</strong>
                      <small class="selected-price">{{ currencyFormatter.format(item.price || 0) }}</small>
                    </div>
                    <button
                      type="button"
                      class="btn btn-link btn-remove-item"
                      @click="removeSaleItem(index)"
                    >
                      <i class="fa-solid fa-trash-can"></i>
                      Remover
                    </button>
                  </div>
                  <div class="selected-body">
                    <label class="sr-only" :for="'qty-' + item.id">Quantidade</label>
                    <input
                      :id="'qty-' + item.id"
                      class="form-control qty-input"
                      type="number"
                      min="1"
                      step="1"
                      v-model.number="saleItems[index].quantity"
                    />
                    <div class="type-buttons">
                      <button
                        type="button"
                        class="type-btn"
                        :class="{ active: saleItems[index].type === 'venda' }"
                        @click="changeItemType(index, 'venda')"
                      >Venda</button>
                      <button
                        type="button"
                        class="type-btn"
                        :class="{ active: saleItems[index].type === 'brinde' }"
                        @click="changeItemType(index, 'brinde')"
                      >Brinde</button>
                      <button
                        type="button"
                        class="type-btn"
                        :class="{ active: saleItems[index].type === 'troca' }"
                        @click="changeItemType(index, 'troca')"
                      >Troca</button>
                    </div>
                    <div v-if="saleItems[index].type === 'venda'" class="discount-input">
                      <label>Desconto</label>
                      <input
                        class="form-control"
                        type="number"
                        min="0"
                        step="0.01"
                        v-model.number="saleItems[index].discount"
                      />
                    </div>
                    <div v-else class="discount-hint">
                      {{ saleItems[index].type === 'troca' ? 'Troca sem cobrança.' : 'Brinde sem cobrança.' }}
                    </div>
                    <div class="item-summary">
                      <span>Subtotal</span>
                      <strong>{{ currencyFormatter.format(item.subtotal || 0) }}</strong>
                    </div>
                  </div>
                </div>
              </div>
              <div class="sale-summary">
                <div class="summary-row">
                  <span>Total de itens</span>
                  <strong>{{ totalDeliveredQuantity }}</strong>
                </div>
                <div class="summary-row">
                  <span>Desconto total</span>
                  <strong>{{ currencyFormatter.format(totalDiscount || 0) }}</strong>
                </div>
                <div class="summary-row summary-total">
                  <span>Total da venda</span>
                  <strong>{{ saleTotalDisplay }}</strong>
                </div>
              </div>
              <div class="form-grid">
                <div class="form-group">
                  <label>Forma de pagamento</label>
                  <select class="form-control" v-model="salePaymentMethod">
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Pix">Pix</option>
                    <option value="Cartão">Cartão</option>
                    <option value="Boleto">Boleto</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Status do pagamento</label>
                  <select class="form-control" v-model="salePaymentStatus">
                    <option value="Pago">Pago</option>
                    <option value="Pendente">Pendente</option>
                    <option value="Parcial">Parcial</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label>Observações (opcional)</label>
                <textarea class="form-control" rows="2" v-model="deliverNotes"></textarea>
              </div>
              <div v-if="modalError" class="modal-error">{{ modalError }}</div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="closeDeliverModal">Cancelar</button>
              <button type="submit" class="btn btn-success">
                <i class="fa-solid fa-check"></i>
                Efetivar venda
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { listRoutes, getRoute } from '@/services/routes'
import { listExecutions, completeExecution, setPointStatus, getExecution } from '@/services/routeExecutions'
import { createSale } from '@/services/sales'
import { createExpense } from '@/services/expenses'
import { listClients } from '@/services/clients'
import { listProducts, createStockMovement } from '@/services/products'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseError from '@/components/ui/BaseError.vue'
import SalesComposer from '@/components/sales/SalesComposer.vue'
import { useRouteExecutionStore } from '@/stores/routeExecution'

const route = useRoute()
const router = useRouter()
const routeExecutionStore = useRouteExecutionStore()
const routes = ref([])
const points = ref([])
const clients = ref([])
const products = ref([])
const execution = ref(null)
const errorMsg = ref('')
const successMsg = ref('')
const loading = ref(false)
const loadError = ref('')
const pendingRefreshId = ref(null)
const finishing = ref(false)
let finishRedirectTimer = null
const toastMessage = ref('')
const toastVisible = ref(false)
let toastTimer = null

const showDeliverModal = ref(false)
const showStandaloneSale = ref(false)
const deliverPoint = ref(null)
const deliverNotes = ref('')
const customSaleClient = ref('')
const modalError = ref('')
const clickedPointId = ref(null)

const saleItems = ref([])
const salePaymentMethod = ref('Pix')
const salePaymentStatus = ref('Pago')
const productSearch = ref('')
const expandedProductId = ref('')
const loadRemaining = ref({})
const viewMode = ref('list')
const stepIndex = ref(0)

const orderedPoints = computed(() => points.value.slice())
const stepPoint = computed(() => orderedPoints.value[stepIndex.value] || null)
const stepPointStatus = computed(() => (stepPoint.value ? pointStatus(stepPoint.value.id) : 'pending'))
const hasNextPoint = computed(() => stepIndex.value < orderedPoints.value.length - 1)
const hasPrevPoint = computed(() => stepIndex.value > 0)

const requestedExecutionId = computed(() => {
  const raw = route.query.executionId
  return raw != null ? String(raw) : ''
})

const ACTIVE_EXECUTION_STATUSES = ['in_progress', 'started', 'active', 'running', 'em_andamento', 'em andamento']
const ACTIVE_EXECUTION_KEYWORDS = ['andamento', 'progress', 'ativo', 'running', 'start', 'execucao']
const COMPLETED_EXECUTION_STATUSES = ['completed', 'finished', 'finalizada', 'finalizado', 'encerrada', 'cancelled', 'canceled', 'concluida', 'concluido']
const COMPLETED_EXECUTION_KEYWORDS = ['finaliz', 'conclu', 'encerr', 'cancel']
const PENDING_EXECUTION_STATUSES = ['pending', 'aguardando', 'modelo', 'model', 'draft', 'planejada', 'planned', 'aguardando inicio']
const PENDING_EXECUTION_KEYWORDS = ['pend', 'aguard', 'planej', 'model']

function normalizeExecutionStatus(status) {
  if (status == null) return ''
  return status
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function isExecutionActive(exec) {
  if (!exec) return false
  const status = normalizeExecutionStatus(exec.status)
  if (COMPLETED_EXECUTION_STATUSES.includes(status) || COMPLETED_EXECUTION_KEYWORDS.some(keyword => status.includes(keyword))) return false
  if (PENDING_EXECUTION_STATUSES.includes(status) || PENDING_EXECUTION_KEYWORDS.some(keyword => status.includes(keyword))) return false
  if (ACTIVE_EXECUTION_STATUSES.includes(status) || ACTIVE_EXECUTION_KEYWORDS.some(keyword => status.includes(keyword))) return true
  if (!status) {
    if (exec.fimReal || exec.completedAt || exec.finishedAt) return false
    const inferredFlag = exec.inProgress ?? exec.emAndamento ?? exec.isActive ?? exec.ativo ?? null
    if (typeof inferredFlag === 'boolean') return inferredFlag
    return false
  }
  return false
}

function parseTimestamp(value) {
  if (!value && value !== 0) return NaN
  if (value instanceof Date) {
    const time = value.getTime()
    return Number.isFinite(time) ? time : NaN
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : NaN
  }
  const numeric = Number(value)
  if (Number.isFinite(numeric)) return numeric
  const parsed = Date.parse(String(value))
  return Number.isNaN(parsed) ? NaN : parsed
}

function executionSortValue(exec) {
  if (!exec) return -Infinity
  const candidates = [
    exec.startedAt,
    exec.started_at,
    exec.startDate,
    exec.start_date,
    exec.startedOn,
    exec.metadata?.startedAt,
    exec.metadata?.inicioPrevisto,
    exec.inicioPrevisto,
    exec.prevInicio,
    exec.createdAt,
    exec.created_at,
    exec.updatedAt,
    exec.updated_at
  ]
  for (const candidate of candidates) {
    const stamp = parseTimestamp(candidate)
    if (!Number.isNaN(stamp)) return stamp
  }
  const idStamp = parseTimestamp(exec.id)
  return Number.isNaN(idStamp) ? 0 : idStamp
}

const inProgress = computed(() => isExecutionActive(execution.value))

const canFinish = computed(() => inProgress.value)

const totalPoints = computed(() => points.value.length)
const visitedCount = computed(() => {
  if (!execution.value || !Array.isArray(execution.value.points)) return 0
  return execution.value.points.filter(p => normalizeStatus(p.status) === 'visited').length
})
const skippedCount = computed(() => {
  if (!execution.value || !Array.isArray(execution.value.points)) return 0
  return execution.value.points.filter(p => normalizeStatus(p.status) === 'skipped').length
})
const pendingCount = computed(() => Math.max(totalPoints.value - visitedCount.value - skippedCount.value, 0))
const progressPercent = computed(() => totalPoints.value ? Math.round((visitedCount.value / totalPoints.value) * 100) : 0)

const executionLoadItems = computed(() => {
  if (!execution.value || !Array.isArray(execution.value.loadItems)) return []
  const remainingMap = loadRemaining.value || {}
  return execution.value.loadItems
    .map((item, index) => {
      const rawId = item?.productId ?? item?.produtoId ?? item?.idProduto
      const productId = rawId != null ? String(rawId) : ''
      if (!productId) return null
      const productName = item?.productName || item?.nomeProduto || item?.nome || item?.name || `Produto ${index + 1}`
      const quantity = Math.max(0, Number(item?.quantity ?? item?.qtd ?? 0) || 0)
      const remaining = Math.max(0, Number(remainingMap[productId] ?? quantity))
      const delivered = Math.max(0, quantity - remaining)
      return {
        uid: `exec-load-${productId}-${index}`,
        productId,
        productName,
        quantity,
        remaining,
        delivered,
      }
    })
    .filter(Boolean)
})

const totalLoadQuantity = computed(() => executionLoadItems.value.reduce((sum, item) => sum + item.remaining, 0))
const totalInitialLoadQuantity = computed(() => executionLoadItems.value.reduce((sum, item) => sum + item.quantity, 0))

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function firstPendingIndex(list = orderedPoints.value) {
  return list.findIndex(point => pointStatus(point.id) !== 'visited')
}

function alignStepIndex(preferredId = null) {
  const list = orderedPoints.value
  if (!list.length) {
    stepIndex.value = 0
    return
  }

  if (preferredId != null) {
    const preferredIdx = list.findIndex(point => String(point.id) === String(preferredId))
    if (preferredIdx >= 0) {
      stepIndex.value = preferredIdx
      return
    }
  }

  if (stepIndex.value >= list.length) {
    stepIndex.value = list.length - 1
  }

  if (viewMode.value === 'step') {
    const current = list[stepIndex.value]
    if (!current || pointStatus(current.id) === 'visited') {
      const pendingIdx = firstPendingIndex(list)
      if (pendingIdx >= 0) {
        stepIndex.value = pendingIdx
      }
    }
  }
}

function setViewMode(mode) {
  viewMode.value = mode
  if (mode === 'step') {
    alignStepIndex()
  }
}

function goToPoint(pointId) {
  if (pointId == null) return
  const idx = orderedPoints.value.findIndex(point => String(point.id) === String(pointId))
  if (idx >= 0) {
    stepIndex.value = idx
  }
}

function goNextPoint() {
  const list = orderedPoints.value
  if (!list.length) return
  if (stepIndex.value < list.length - 1) {
    stepIndex.value += 1
  }
}

function goPrevPoint() {
  if (stepIndex.value > 0) {
    stepIndex.value -= 1
  }
}

function focusNextPoint(currentId = null) {
  if (viewMode.value !== 'step') return
  const list = orderedPoints.value
  if (!list.length) return

  if (currentId != null) {
    const currentIdx = list.findIndex(point => String(point.id) === String(currentId))
    if (currentIdx >= 0 && currentIdx < list.length - 1) {
      stepIndex.value = currentIdx + 1
    }
  }

  const pendingIdx = firstPendingIndex(list)
  if (pendingIdx >= 0) {
    stepIndex.value = pendingIdx
  } else if (stepIndex.value >= list.length) {
    stepIndex.value = list.length - 1
  }
}

function getSaleItemMeta(index) {
  return saleItemsWithMeta.value[index] || { price: 0, subtotal: 0 }
}

function resolveProduct(productId) {
  if (!productId) return null
  const catalogMatch = products.value.find(p => String(p.id) === String(productId))
  if (catalogMatch) return catalogMatch
  const loadItem = executionLoadItems.value.find(item => String(item.productId) === String(productId))
  if (!loadItem) return null
  return {
    id: loadItem.productId,
    nome: loadItem.productName || `Produto ${loadItem.productId}`,
    name: loadItem.productName || `Produto ${loadItem.productId}`,
    quantity: loadItem.quantity,
  }
}

function extractProductPrice(product) {
  if (!product) return 0
  return Number(product.preco ?? product.valor ?? product.price ?? product.unitPrice ?? 0) || 0
}

function extractProductCost(product) {
  if (!product) return 0
  const candidates = [
    product.custo,
    product.cost,
    product.precoCusto,
    product.unitCost,
    product.custoUnitario,
    product.custoMedio
  ]
  for (const candidate of candidates) {
    if (candidate == null || candidate === '') continue
    const numeric = Number(candidate)
    if (Number.isFinite(numeric) && numeric > 0) return numeric
  }
  const fallback = Number(product.preco ?? product.valor ?? product.price ?? product.unitPrice ?? 0)
  return Number.isFinite(fallback) ? fallback : 0
}

const saleItemsWithMeta = computed(() => {
  return saleItems.value.map(item => {
    const product = resolveProduct(item.productId)
    const price = extractProductPrice(product)
    const quantity = Math.max(0, Number(item.quantity) || 0)
    const type = (item.type || 'venda').toLowerCase()
    const maxDiscount = quantity * price
    let discount = Math.max(0, Number(item.discount) || 0)
    if (type === 'brinde' || type === 'troca') {
      discount = maxDiscount
    } else if (discount > maxDiscount) {
      discount = maxDiscount
    }
    const subtotal = Math.max(0, quantity * price - discount)
    return {
      ...item,
      product,
      price,
      type,
      quantity,
      discount,
      subtotal
    }
  })
})

const deliverableProducts = computed(() => {
  const loadItems = executionLoadItems.value
  if (!loadItems.length) return []
  const allowedIds = new Set(loadItems.map(item => String(item.productId)))
  const catalog = Array.isArray(products.value)
    ? products.value.filter(product => allowedIds.has(String(product.id)))
    : []

  if (catalog.length === allowedIds.size) return catalog

  const existingIds = new Set(catalog.map(product => String(product.id)))
  const fallbacks = loadItems
    .filter(item => !existingIds.has(String(item.productId)))
    .map(item => ({
      id: item.productId,
      nome: item.productName || `Produto ${item.productId}`,
      name: item.productName || `Produto ${item.productId}`,
    }))

  return [...catalog, ...fallbacks]
})

const hasDeliverableProducts = computed(() => deliverableProducts.value.length > 0)

const filteredProducts = computed(() => {
  const list = deliverableProducts.value
  if (!list.length) return []
  const term = productSearch.value.trim().toLowerCase()
  if (!term) return list
  return list.filter((product) => {
    const name = (product?.nome || product?.name || '').toString().toLowerCase()
    const code = (product?.codigo || product?.sku || '').toString().toLowerCase()
    return name.includes(term) || code.includes(term)
  })
})

const saleTotal = computed(() => {
  return saleItemsWithMeta.value.reduce((sum, item) => sum + item.subtotal, 0)
})

const saleTotalDisplay = computed(() => currencyFormatter.format(saleTotal.value || 0))
const totalDeliveredQuantity = computed(() => saleItemsWithMeta.value.reduce((sum, item) => sum + item.quantity, 0))
const totalDiscount = computed(() => saleItemsWithMeta.value.reduce((sum, item) => sum + item.discount, 0))

function normalizeProductKey(value) {
  if (value == null) return null
  const numeric = Number(value)
  if (Number.isFinite(numeric)) return String(numeric)
  return String(value)
}

function normalizeSaleRecord(item) {
  if (!item || typeof item !== 'object') return null
  const productId = normalizeProductKey(item.productId ?? item.produtoId ?? item.idProduto ?? item.id)
  if (!productId) return null
  const quantity = Number(item.quantity ?? item.qtd ?? item.quantidade ?? item.amount ?? item.qty ?? 0) || 0
  if (quantity <= 0) return null
  const type = (item.type ?? item.tipo ?? '').toString().toLowerCase()
  const productName = item.productName || item.nome || item.name || null
  return { productId, quantity, type, productName }
}

function extractSaleItemsFromCheckpoint(checkpoint) {
  if (!checkpoint || typeof checkpoint !== 'object') return []
  const sources = []
  const seen = new Set()
  const pushIfNew = (value) => {
    if (!Array.isArray(value) || seen.has(value)) return
    seen.add(value)
    sources.push(value)
  }
  const ARRAY_KEYS = ['saleItems', 'sale_items', 'saleitems', 'items', 'itens', 'produtos', 'products', 'payloadItems']
  ARRAY_KEYS.forEach((key) => {
    pushIfNew(checkpoint[key])
  })
  const nestedKeys = ['meta', 'metadata', 'dados', 'data', 'extra', 'info', 'sale', 'venda', 'registro', 'payload']
  nestedKeys.forEach((key) => {
    const nested = checkpoint[key]
    if (!nested || typeof nested !== 'object') return
    ARRAY_KEYS.forEach((subKey) => pushIfNew(nested[subKey]))
  })
  return sources.flat().map(normalizeSaleRecord).filter(Boolean)
}

function aggregateDeliveredFromCheckpoints(checkpoints) {
  const totals = {}
  if (!Array.isArray(checkpoints)) return totals
  checkpoints.forEach((checkpoint) => {
    extractSaleItemsFromCheckpoint(checkpoint).forEach((record) => {
      const qty = Number(record.quantity) || 0
      if (!record.productId || qty <= 0) return
      totals[record.productId] = (totals[record.productId] || 0) + qty
    })
  })
  return totals
}

function updateLoadStateFromExecution(exec) {
  if (!exec) {
    loadRemaining.value = {}
    return
  }
  const manifest = Array.isArray(exec.loadItems) ? exec.loadItems : []
  if (!manifest.length) {
    loadRemaining.value = {}
    return
  }
  const deliveredTotals = aggregateDeliveredFromCheckpoints(exec.checkpoints)
  const next = {}
  manifest.forEach((entry) => {
    const productId = normalizeProductKey(entry?.productId ?? entry?.produtoId ?? entry?.idProduto)
    if (!productId) return
    const quantity = Math.max(0, Number(entry?.quantity ?? entry?.qtd ?? 0) || 0)
    const delivered = Math.max(0, Number(deliveredTotals[productId] ?? 0))
    const remaining = Math.max(0, quantity - delivered)
    next[productId] = remaining
  })
  loadRemaining.value = next
}

function consumeLoad(itemsMeta) {
  if (!Array.isArray(itemsMeta) || !itemsMeta.length) return
  const current = { ...loadRemaining.value }
  let changed = false
  itemsMeta.forEach((item) => {
    const productId = normalizeProductKey(item.productId ?? item?.product?.id ?? item?.produtoId)
    if (!productId) return
    if (!(productId in current)) return
    const qty = Math.max(0, Number(item.quantity) || 0)
    if (!qty) return
    const nextValue = Math.max(0, Number(current[productId] ?? 0) - qty)
    if (nextValue !== current[productId]) {
      current[productId] = nextValue
      changed = true
    }
  })
  if (changed) {
    loadRemaining.value = { ...current }
  }
}

function restoreConsumedLoad(itemsMeta) {
  if (!Array.isArray(itemsMeta) || !itemsMeta.length) return
  const current = { ...loadRemaining.value }
  let changed = false
  itemsMeta.forEach((item) => {
    const productId = normalizeProductKey(item.productId ?? item?.product?.id ?? item?.produtoId)
    if (!productId) return
    if (!(productId in current)) return
    const qty = Math.max(0, Number(item.quantity) || 0)
    if (!qty) return
    current[productId] = Number(current[productId] ?? 0) + qty
    changed = true
  })
  if (changed) {
    loadRemaining.value = { ...current }
  }
}

async function returnLoadToStock(items, routeLabel) {
  if (!Array.isArray(items) || !items.length) return
  const noteBase = routeLabel ? `Devolução rota ${routeLabel}` : 'Devolução de carga de rota'
  const failures = []
  for (const item of items) {
    const productId = item?.productId != null ? Number(item.productId) : null
    const quantity = Number(item?.remaining ?? 0) || 0
    if (!productId || quantity <= 0) continue
    try {
      await createStockMovement(productId, {
        type: 'DEVOLUCAO',
        quantity,
        note: noteBase,
      })
    } catch (err) {
      failures.push(err)
    }
  }
  if (failures.length) {
    throw failures[0]
  }
}

function formatQuantity(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return '0'
  return numeric.toLocaleString('pt-BR')
}

const standaloneExecutions = computed(() => {
  if (!execution.value) return []
  const label = routeName(execution.value.routeId)
  const inicio = execution.value?.startedAt || execution.value?.startDate || execution.value?.start_date || execution.value?.createdAt
  return [{
    id: execution.value.id,
    rotaNome: label,
    inicioReal: inicio
  }]
})

const saleComposerDefaults = computed(() => ({
  origem: 'rota',
  formaPagamento: 'Pix',
  statusPagamento: 'Pago',
  execucaoId: execution.value?.id ? String(execution.value.id) : ''
}))

const deliverClient = computed(() => {
  if (!deliverPoint.value) return null
  const point = deliverPoint.value
  if (point.clientId != null) {
    const match = clients.value.find(c => String(c.id) === String(point.clientId))
    if (match) return match
  }
  return point
})

const routeClientName = computed(() => {
  const point = deliverPoint.value
  if (!point) return ''
  const fallback = point.cliente || point.clientName || point.nome || point.name || ''
  const client = deliverClient.value
  if (client && client !== point) {
    return client.nome || client.name || fallback
  }
  return fallback
})

const saleClientName = computed(() => {
  const custom = customSaleClient.value.trim()
  if (custom) return custom
  return routeClientName.value
})

const deliverClientDetails = computed(() => {
  const fallback = { city: '—', document: '—', phone: '—', email: '—' }
  if (!deliverPoint.value) return fallback
  const point = deliverPoint.value
  const client = deliverClient.value

  const primaryCity = pointCityLabel(point)
  const secondaryCity = client && client !== point ? pointCityLabel(client) : ''
  const city = primaryCity && primaryCity !== '—' ? primaryCity : (secondaryCity && secondaryCity !== '—' ? secondaryCity : '—')

  const document = extractClientDocument(point) || (client && client !== point ? extractClientDocument(client) : '')
  const phone = extractClientPhone(point) || (client && client !== point ? extractClientPhone(client) : '')
  const email = extractClientEmail(point) || (client && client !== point ? extractClientEmail(client) : '')

  return {
    city,
    document: document || '—',
    phone: phone || '—',
    email: email || '—'
  }
})

function normalizeToText(value) {
  if (value == null) return ''
  const text = String(value).trim()
  return text
}

const DOCUMENT_KEYS = [
  'cnpj',
  'cpf',
  'cnpjCpf',
  'cnpj_cpf',
  'cnpjOuCpf',
  'documento',
  'document',
  'taxId',
  'tax_id',
  'inscricaoEstadual',
  'ie',
  'registrationNumber'
]

const PHONE_KEYS = [
  'telefone',
  'telefone1',
  'telefone2',
  'telefonePrincipal',
  'telefoneCelular',
  'phone',
  'phoneNumber',
  'mobile',
  'celular',
  'whatsapp',
  'whatsApp',
  'contactPhone',
  ['contato', 'telefone'],
  ['contato', 'celular'],
  ['contact', 'phone'],
  ['contact', 'mobile']
]

const EMAIL_KEYS = [
  'email',
  'emailPrincipal',
  'mail',
  'contatoEmail',
  'contactEmail',
  ['contato', 'email'],
  ['contact', 'email']
]

function getNestedValue(source, path) {
  if (!source) return undefined
  if (Array.isArray(path)) {
    return path.reduce((acc, key) => (acc && acc[key] != null ? acc[key] : undefined), source)
  }
  if (typeof path === 'string' && path.includes('.')) {
    return path.split('.').reduce((acc, key) => (acc && acc[key] != null ? acc[key] : undefined), source)
  }
  return source[path]
}

function extractFromKeys(source, keys) {
  if (!source) return ''
  for (const key of keys) {
    const raw = getNestedValue(source, key)
    const text = normalizeToText(raw)
    if (text) return text
  }
  return ''
}

function extractClientDocument(source) {
  return extractFromKeys(source, DOCUMENT_KEYS)
}

function extractClientPhone(source) {
  return extractFromKeys(source, PHONE_KEYS)
}

function extractClientEmail(source) {
  return extractFromKeys(source, EMAIL_KEYS)
}

function pointCityLabel(point) {
  if (!point) return '—'
  const candidates = [
    point.cidade,
    point.city,
    point.municipio,
    point.municipality,
    point.localidade,
    point.cityName,
    point.companyCity,
    point.addressCity,
    point.enderecoCidade,
    point?.endereco?.cidade,
    point?.endereco?.cidadeNome,
    point?.address?.city,
    point?.address?.cityName
  ]
  for (const candidate of candidates) {
    const text = normalizeToText(candidate)
    if (text) return text
  }
  return '—'
}

function normalizeStatus(status) {
  const normalized = (status || '').toString().toLowerCase()
  if (['pendente', 'pending', 'aguardando'].includes(normalized)) return 'pending'
  if (['visitado', 'visited', 'entregue', 'concluido', 'concluida'].includes(normalized)) return 'visited'
  if (['pulado', 'skipped', 'ignorado'].includes(normalized)) return 'skipped'
  if (['in_place', 'in place', 'em_andamento', 'em andamento'].includes(normalized)) return 'in_place'
  return normalized || 'pending'
}

function pointStatus(pointId) {
  const ex = execution.value
  if (!ex || !Array.isArray(ex.points)) return 'pending'
  const point = ex.points.find(item => String(item.pointId) === String(pointId))
  return point ? normalizeStatus(point.status) : 'pending'
}

function statusClass(status) {
  const normalized = normalizeStatus(status)
  if (normalized === 'visited') return 'visited'
  if (normalized === 'skipped') return 'skipped'
  return 'pending'
}

function pointStatusLabel(status) {
  const normalized = normalizeStatus(status)
  const labels = {
    visited: 'Entregue',
    skipped: 'Pulado',
    pending: 'Pendente'
  }
  return labels[normalized] || 'Pendente'
}

function executionStatusLabel(status) {
  const normalized = (status || '').toString().toLowerCase()
  if (normalized === 'in_progress') return 'Em andamento'
  if (normalized === 'completed' || normalized === 'finished') return 'Concluída'
  if (normalized === 'pending') return 'Aguardando'
  return status || '—'
}

function routeName(id) {
  const r = routes.value.find(r => String(r.id) === String(id))
  return r ? (r.nome || r.name) : '-'
}

function formatDate(iso) {
  try { return iso ? new Date(iso).toLocaleString() : '—' }
  catch { return iso || '—' }
}

function goBack() {
  window.history.back()
}

let saleItemCounter = 0

function createSaleItem(overrides = {}) {
  saleItemCounter += 1
  return {
    id: `${Date.now()}-${saleItemCounter}`,
    productId: '',
    quantity: 1,
    discount: 0,
    type: 'venda',
    ...overrides
  }
}

function toggleProductActions(product) {
  const id = product?.id
  if (id == null) return
  const normalized = String(id)
  expandedProductId.value = expandedProductId.value === normalized ? '' : normalized
}

function handleProductAction(product, type) {
  if (!product) return
  const quantity = askQuantity(type)
  if (quantity == null) return
  addProductToSale(product, type, quantity)
  expandedProductId.value = ''
}

function addProductToSale(product, type = 'venda', quantity = 1) {
  if (!product) return
  const rawId = product.id ?? product.produtoId ?? product.codigoId
  if (rawId == null) return
  const productId = String(rawId)
  const normalizedType = (type || 'venda').toLowerCase()
  const existing = saleItems.value.find(item => String(item.productId) === productId && (item.type || 'venda') === normalizedType)
  if (existing) {
    const currentQty = Math.max(1, Number(existing.quantity) || 0)
    existing.quantity = currentQty + Math.max(1, quantity)
    return
  }
  const basePrice = extractProductPrice(product)
  const overrides = {
    productId,
    quantity: Math.max(1, quantity),
    type: normalizedType,
  }
  if (normalizedType === 'brinde' || normalizedType === 'troca') {
    overrides.discount = overrides.quantity * basePrice
  }
  saleItems.value = [...saleItems.value, createSaleItem(overrides)]
}

function changeItemType(index, type) {
  const item = saleItems.value[index]
  if (!item) return
  const previousType = (item.type || 'venda').toLowerCase()
  const normalizedType = (type || 'venda').toLowerCase()
  item.type = normalizedType
  const product = resolveProduct(item.productId)
  const price = extractProductPrice(product)
  const maxDiscount = Math.max(0, Number(item.quantity) || 0) * price
  if (normalizedType === 'brinde' || normalizedType === 'troca') {
    item.discount = maxDiscount
  } else {
    item.discount = Math.max(0, Number(item.discount) || 0)
    if (previousType === 'brinde' || previousType === 'troca') {
      item.discount = 0
    }
    if (item.discount > maxDiscount) item.discount = maxDiscount
  }
}

function askQuantity(type) {
  const label = type === 'brinde' ? 'brinde' : type === 'troca' ? 'troca' : 'venda'
  const promptMessage = `Informe a quantidade para ${label}`
  const value = window.prompt(promptMessage, '1')
  if (value === null) return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    window.alert('Quantidade inválida. Operação cancelada.')
    return null
  }
  return Math.round(parsed)
}

function removeSaleItem(index) {
  const updated = saleItems.value.slice()
  updated.splice(index, 1)
  saleItems.value = updated
}

function extractPointDefaults(point) {
  const name = point?.produto || point?.productName || point?.nome || point?.name || 'Entrega'
  const price = Number(point?.precoSugerido || point?.preco || point?.valor || 0) || 0
  return { name, price }
}

async function resolveRouteClients(routeId) {
  if (!routeId) return []
  if (!clients.value.length) {
    try {
      await loadClientsRef()
    } catch (err) {
      console.warn('Falha ao carregar clientes antes de mapear rota', err)
      return []
    }
  }
  try {
    const route = await getRoute(routeId)
    const ids = Array.isArray(route?.pontos) ? route.pontos : []
    if (!ids.length) return []
    const map = new Map(clients.value.map(client => [String(client.id), client]))
    return ids.map((rawId, index) => {
      const id = String(rawId)
      const client = map.get(id) || {}
      const city = client.cidade || client.city || client.municipio || client.localidade || client.cityName || client.addressCity || client.companyCity || ''
      return {
        id: client.id ?? rawId,
        ordem: index + 1,
        clientId: client.id ?? rawId,
        nome: client.nome || client.name || client.razaoSocial || `Cliente ${index + 1}`,
        endereco: client.endereco || client.address || client.companyAddress || client.logradouro || '',
        cidade: city,
        ...client
      }
    })
  } catch (err) {
    console.warn('Falha ao carregar rota para mapear clientes', err)
    return []
  }
}

async function registerFreeItemCosts(itemsMeta, executionContext, pointContext) {
  const relevantItems = itemsMeta.filter(item => {
    const type = (item.type || '').toLowerCase()
    return type === 'brinde' || type === 'troca'
  })
  if (!relevantItems.length) return

  const isoDate = new Date().toISOString().slice(0, 10)
  const routeLabel = executionContext?.routeId ? routeName(executionContext.routeId) : ''
  const pointLabel = pointContext?.nome || pointContext?.name || ''

  const tasks = relevantItems.map(item => {
    const unitCost = extractProductCost(item.product) || item.price || 0
    const totalCost = Number.isFinite(unitCost) ? Number((unitCost * item.quantity).toFixed(2)) : 0
    if (!totalCost) return null
    const typeLabel = (item.type || '').toLowerCase() === 'troca' ? 'Troca' : 'Brinde'
    const productName = item.product?.nome || item.product?.name || item.nome || item.name || 'Produto'
    const parts = [`${typeLabel} - ${productName}`]
  if (pointLabel) parts.push(`Cliente: ${pointLabel}`)
    if (routeLabel) parts.push(`Rota: ${routeLabel}`)
    return createExpense({
      descricao: parts.join(' | '),
      categoria: typeLabel,
      valor: totalCost,
      data: isoDate,
      pago: true
    })
  }).filter(Boolean)

  if (!tasks.length) return

  const results = await Promise.allSettled(tasks)
  const failed = results.find(result => result.status === 'rejected')
  if (failed) {
    throw failed.reason || new Error('Falha ao registrar custos de brindes/trocas')
  }
}

function showToast(message, duration = 4000) {
  if (!message) return
  if (toastTimer) {
    clearTimeout(toastTimer)
    toastTimer = null
  }
  toastMessage.value = message
  toastVisible.value = true
  toastTimer = setTimeout(() => {
    toastVisible.value = false
    toastMessage.value = ''
    toastTimer = null
  }, duration)
}

async function toggleStandaloneSale() {
  showStandaloneSale.value = !showStandaloneSale.value
  if (showStandaloneSale.value) {
    if (showDeliverModal.value) {
      closeDeliverModal()
    }
    if (!products.value.length) {
      try {
        await loadProductsRef()
      } catch (err) {
        console.warn('Falha ao carregar produtos para venda avulsa', err)
      }
    }
  }
}

function handleStandaloneSaleSaved(resumo = null) {
  const method = resumo?.metodo ? ` (${resumo.metodo})` : ''
  successMsg.value = `Venda avulsa registrada${method}.`
  showToast('Venda avulsa registrada com sucesso.')
  showStandaloneSale.value = false
}

async function loadClientsRef() {
  try {
    const data = await listClients()
    if (Array.isArray(data)) clients.value = data
  } catch (e) {
    console.warn('Falha ao carregar clientes', e)
  }
}

async function loadProductsRef() {
  try {
    const data = await listProducts()
    if (Array.isArray(data)) products.value = data
  } catch (e) {
    console.warn('Falha ao carregar produtos', e)
  }
}

async function refresh(explicitId = null) {
  const targetId = explicitId != null ? String(explicitId) : requestedExecutionId.value
  if (loading.value) {
    pendingRefreshId.value = targetId
    return
  }
  loading.value = true
  loadError.value = ''
  errorMsg.value = ''
  try {
    if (!clients.value.length) await loadClientsRef()
    if (!products.value.length) await loadProductsRef()
    routes.value = await listRoutes()

    const allExecutions = await listExecutions(null, 'in_progress')
    const normalizedExecutions = Array.isArray(allExecutions) ? allExecutions : []
    const activeExecutions = normalizedExecutions.filter(item => {
      const status = normalizeExecutionStatus(item.status)
      return !COMPLETED_EXECUTION_STATUSES.includes(status)
    })

    let selected = null
    if (targetId) {
      selected = activeExecutions.find(item => String(item.id) === targetId) || null
      if (!selected) {
        try {
          const fetched = await getExecution(targetId)
          if (fetched) selected = fetched
        } catch (err) {
          console.warn('Execução informada não encontrada ou indisponível', err)
        }
      }
    }

    if (!selected && activeExecutions.length) {
      const sorted = [...activeExecutions].sort((a, b) => executionSortValue(b) - executionSortValue(a))
      selected = sorted[0]
    }

    if (selected && selected.id) {
      const detailed = await getExecution(selected.id)
      if (isExecutionActive(detailed)) {
        execution.value = detailed
        points.value = detailed?.routeId ? await resolveRouteClients(detailed.routeId) : []
        updateLoadStateFromExecution(execution.value)
        routeExecutionStore.setActive({
          ...execution.value,
          routeName: routeName(execution.value.routeId),
        })
        alignStepIndex()
      } else {
        execution.value = null
        points.value = []
        loadRemaining.value = {}
        routeExecutionStore.clearActive()
      }
    } else {
      execution.value = null
      points.value = []
      loadRemaining.value = {}
      routeExecutionStore.clearActive()
    }

    if (!execution.value) {
      closeDeliverModal()
      showStandaloneSale.value = false
    } else if (deliverPoint.value) {
      const exists = points.value.some(point => String(point.id) === String(deliverPoint.value?.id))
      if (!exists) {
        closeDeliverModal()
      }
    }
  } catch (e) {
    loadError.value = e?.message || 'Erro ao carregar execução'
  } finally {
    loading.value = false
    if (pendingRefreshId.value !== null) {
      const nextId = pendingRefreshId.value
      pendingRefreshId.value = null
      await refresh(nextId)
    }
  }
}

async function finish() {
  if (!execution.value || finishing.value) return
  const confirmed = window.confirm('Deseja concluir a rota em andamento?')
  if (!confirmed) return
  finishing.value = true
  errorMsg.value = ''
  successMsg.value = ''
  const remainingItems = executionLoadItems.value
    .filter(item => item.remaining > 0)
    .map(item => ({ productId: item.productId, remaining: item.remaining }))
  const routeLabel = routeName(execution.value.routeId)
  let returnWarning = ''
  try {
    const completed = await completeExecution(execution.value.id)
    execution.value = completed
    routeExecutionStore.clearActive()
    if (remainingItems.length) {
      try {
        await returnLoadToStock(remainingItems, routeLabel)
      } catch (returnErr) {
        console.warn('Falha ao devolver carga restante ao estoque', returnErr)
        returnWarning = ' Não foi possível devolver parte da carga restante ao estoque.'
      }
    }
    if (!returnWarning) {
      const cleared = {}
      const manifestAfterCompletion = Array.isArray(execution.value?.loadItems) ? execution.value.loadItems : []
      manifestAfterCompletion.forEach((entry) => {
        const productId = normalizeProductKey(entry?.productId ?? entry?.produtoId ?? entry?.idProduto)
        if (!productId) return
        cleared[productId] = 0
      })
      loadRemaining.value = cleared
    }
    const toastText = returnWarning ? 'Rota concluída com aviso.' : 'Rota concluída com sucesso.'
    showToast(toastText)
    successMsg.value = returnWarning ? `Execução concluída.${returnWarning}` : 'Execução concluída.'
    if (finishRedirectTimer) {
      clearTimeout(finishRedirectTimer)
      finishRedirectTimer = null
    }
    finishRedirectTimer = setTimeout(() => {
      router.push('/executar-rota')
      finishing.value = false
      finishRedirectTimer = null
    }, 3000)
  } catch (e) {
    errorMsg.value = e?.message || 'Erro ao concluir execução'
    finishing.value = false
  }
}

function resetSaleFields() {
  saleItems.value = []
  salePaymentMethod.value = 'Pix'
  salePaymentStatus.value = 'Pago'
  productSearch.value = ''
  expandedProductId.value = ''
  customSaleClient.value = ''
  modalError.value = ''
}

async function openDeliverModal(point) {
  if (!execution.value) return
  const status = String(execution.value.status || '').toLowerCase()
  if (status === 'completed' || status === 'finished') return
  clickedPointId.value = point.id
  setTimeout(() => { clickedPointId.value = null }, 600)
  if (viewMode.value === 'step') {
    goToPoint(point.id)
  }
  deliverPoint.value = point
  deliverNotes.value = ''
  modalError.value = ''
  resetSaleFields()
  const defaults = extractPointDefaults(point)
  const suggestedProductId = point?.productId || point?.produtoId || point?.idProduto || null
  if (!products.value.length) await loadProductsRef()
  const productList = Array.isArray(products.value) ? products.value : []
  const resolvedQuantity = Math.max(1, Number(point?.quantidadeSugerida || point?.quantidade || 1) || 1)
  let defaultProduct = null
  if (suggestedProductId) {
    defaultProduct = productList.find(p => String(p.id) === String(suggestedProductId)) || null
  }
  if (!defaultProduct && defaults.name) {
    const byName = defaults.name.toString().toLowerCase()
    defaultProduct = productList.find(p => (p?.nome || p?.name || '').toString().toLowerCase() === byName) || null
  }
  if (defaultProduct) {
    addProductToSale(defaultProduct, 'venda', resolvedQuantity)
  }
  salePaymentMethod.value = 'Pix'
  salePaymentStatus.value = 'Pago'
  showDeliverModal.value = true
}

function closeDeliverModal() {
  showDeliverModal.value = false
  deliverPoint.value = null
  deliverNotes.value = ''
  resetSaleFields()
}

async function submitDeliver() {
  modalError.value = ''
  successMsg.value = ''
  const handledPointId = deliverPoint.value?.id
  let expenseWarning = ''
  let loadAdjusted = false
  if (!execution.value || !deliverPoint.value) {
    modalError.value = 'Execução ou cliente inválido.'
    return
  }
  const itemsMeta = saleItemsWithMeta.value.filter(item => item.product)
  if (!itemsMeta.length) {
    modalError.value = 'Adicione ao menos um produto.'
    return
  }
  const invalidItem = itemsMeta.find(item => item.quantity <= 0)
  if (invalidItem) {
    modalError.value = 'Informe uma quantidade válida para os produtos selecionados.'
    return
  }
  const totalQuantity = totalDeliveredQuantity.value
  if (!totalQuantity) {
    modalError.value = 'Informe ao menos uma unidade entregue.'
    return
  }
  const total = saleTotal.value
  const freeOnly = itemsMeta.every(item => {
    const tipo = (item.type || '').toLowerCase()
    return tipo === 'brinde' || tipo === 'troca'
  })
  if (total <= 0 && !freeOnly) {
    modalError.value = 'O total da venda deve ser maior que zero quando houver itens de venda.'
    return
  }
  try {
  const customName = customSaleClient.value.trim()
  const hasCustomClient = !!customName
  const clientId = hasCustomClient ? null : (deliverPoint.value?.clientId ? Number(deliverPoint.value.clientId) : null)
  const fallbackName = saleClientName.value && saleClientName.value !== '—' ? saleClientName.value : null
  const clientName = hasCustomClient ? customName : (!clientId ? fallbackName : null)
    const payloadItems = itemsMeta.map((item, index) => {
      const tipo = (item.type || 'venda').toLowerCase()
      const isBrinde = tipo === 'brinde'
      return {
        produtoId: item.product?.id ?? null,
        nome: item.product?.nome || item.product?.name || `Produto ${index + 1}`,
        qtd: item.quantity,
        preco: item.price,
        desconto: item.discount,
        brinde: isBrinde,
        tipo
      }
    })
    const payload = {
      clientId,
      clientName: clientId ? null : clientName,
      origem: 'rota',
      execucaoId: execution.value?.id ?? null,
      paymentMethod: salePaymentMethod.value,
      paymentStatus: salePaymentStatus.value,
      items: payloadItems,
      total,
      observacoes: deliverNotes.value || '',
      pontoId: deliverPoint.value?.id ?? null,
      rotaId: execution.value?.routeId ?? null
    }

    const sale = await createSale(payload)

    consumeLoad(itemsMeta)
    loadAdjusted = true

    try {
      await registerFreeItemCosts(itemsMeta, execution.value, deliverPoint.value)
    } catch (expenseError) {
      console.warn('Falha ao registrar custos de brindes/trocas', expenseError)
      expenseWarning = ' Não foi possível registrar os custos de brindes/trocas. Verifique em Despesas.'
    }

    execution.value = await setPointStatus(
      execution.value.id,
      deliverPoint.value.id,
      'visited',
      {
        quantity: totalQuantity,
        notes: deliverNotes.value,
        saleId: sale?.id ?? null,
        saleTotal: total,
        paymentMethod: salePaymentMethod.value,
        saleItem: payloadItems.map(item => item.nome).join(', '),
        productIds: payloadItems.map(item => item.produtoId).filter(Boolean),
        unitPrice: totalQuantity ? total / totalQuantity : null,
        discount: totalDiscount.value,
        saleItems: payloadItems
      }
    )
    points.value = await resolveRouteClients(execution.value.routeId)
    execution.value = await getExecution(execution.value.id)
    updateLoadStateFromExecution(execution.value)
    focusNextPoint(handledPointId)
    closeDeliverModal()
    successMsg.value = `Entrega registrada e venda salva.${expenseWarning}`
  } catch (e) {
    if (loadAdjusted) {
      restoreConsumedLoad(itemsMeta)
    }
    modalError.value = e?.message || 'Erro ao registrar venda'
  }
}

async function mark(pointId, status) {
  if (!execution.value || !inProgress.value) return
  errorMsg.value = ''
  successMsg.value = ''
  try {
    execution.value = await setPointStatus(execution.value.id, pointId, status)
    points.value = await resolveRouteClients(execution.value.routeId)
    execution.value = await getExecution(execution.value.id)
    focusNextPoint(pointId)
    successMsg.value = 'Status atualizado.'
  } catch (e) {
    errorMsg.value = e?.message || 'Erro ao atualizar cliente'
  }
}

watch(points, (list) => {
  if (!Array.isArray(list) || !list.length) {
    stepIndex.value = 0
    return
  }

  if (stepIndex.value >= list.length) {
    stepIndex.value = list.length - 1
  }

  if (viewMode.value === 'step') {
    const current = list[stepIndex.value]
    if (!current || pointStatus(current.id) === 'visited') {
      const pendingIdx = firstPendingIndex(list)
      if (pendingIdx >= 0) {
        stepIndex.value = pendingIdx
      }
    }
  }
})

watch(requestedExecutionId, (next, prev) => {
  if (next === prev) return
  refresh(next)
})

watch(execution, (value) => {
  if (value) {
    routeExecutionStore.setActive({
      ...value,
      routeName: routeName(value.routeId),
    })
    updateLoadStateFromExecution(value)
  } else {
    routeExecutionStore.clearActive()
    loadRemaining.value = {}
  }
})

watch(saleItems, (items) => {
  items.forEach(item => {
    item.quantity = Math.max(1, Number(item.quantity) || 0)
    item.type = (item.type || 'venda').toLowerCase()
    const product = resolveProduct(item.productId)
    const price = extractProductPrice(product)
    const maxDiscount = item.quantity * price
    if (item.type === 'brinde' || item.type === 'troca') {
      item.discount = maxDiscount
    } else {
      item.discount = Math.max(0, Number(item.discount) || 0)
      if (item.discount > maxDiscount) {
        item.discount = maxDiscount
      }
    }
  })
}, { deep: true })

resetSaleFields()

onMounted(async () => {
  await loadClientsRef()
  await loadProductsRef()
  await refresh()
})

onUnmounted(() => {
  if (finishRedirectTimer) {
    clearTimeout(finishRedirectTimer)
    finishRedirectTimer = null
  }
  if (toastTimer) {
    clearTimeout(toastTimer)
    toastTimer = null
  }
  if (!execution.value) {
    routeExecutionStore.clearActive()
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

.page-header h2,
.panel-header h3,
.standalone-header h3 {
  color: #212529;
}

.panel-header,
.standalone-header {
  background: transparent;
}

.deliveries-header {
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.panel-title-block {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.view-mode-toggle {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.85rem;
  border-radius: 999px;
  border: 1px solid rgba(13, 110, 253, 0.18);
  background: #fff;
  color: #0d6efd;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
}

.toggle-btn:hover:not(:disabled) {
  background: rgba(13, 110, 253, 0.08);
  border-color: rgba(13, 110, 253, 0.3);
  box-shadow: 0 6px 16px rgba(13, 110, 253, 0.18);
}

.toggle-btn.is-active {
  background: linear-gradient(135deg, #0d6efd, #3d8bfd);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 10px 24px rgba(13, 110, 253, 0.28);
}

.toggle-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.toolbar-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.feedback {
  margin-bottom: 0.75rem;
  padding: 0.7rem 0.85rem;
  border-radius: 10px;
  font-size: 0.9rem;
}

.feedback-error {
  background: #f8d7da;
  color: #842029;
  border: 1px solid #f1aeb5;
}

.feedback-success {
  background: #d1e7dd;
  color: #0f5132;
  border: 1px solid #a3cfbb;
}

.empty-state {
  text-align: center;
  padding: 2rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.route-progress {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.finish-section {
  margin-top: 0.5rem;
  display: flex;
  justify-content: flex-end;
}

.btn-finish {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 220px;
}

.overview {
  padding: 1.25rem;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(15, 30, 60, 0.08);
}

.overview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.overview-header span {
  display: block;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.overview-header h3 {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
  color: #212529;
}

.overview-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.32rem 0.7rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.status-active {
  background: #d1e7dd;
  color: #0f5132;
}

.status-idle {
  background: #e2e3e5;
  color: #343a40;
}

.progress-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 54px;
  padding: 0.3rem 0.55rem;
  border-radius: 999px;
  background: #0d6efd;
  color: #fff;
  font-weight: 600;
  font-size: 0.78rem;
}

.overview-counters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.85rem;
}

.metric {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 10px;
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.metric span {
  font-size: 0.8rem;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.metric strong {
  font-size: 1.25rem;
  color: #212529;
}

.metric small {
  font-size: 0.75rem;
  color: #6c757d;
}

.route-grid {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(260px, 1.2fr);
  gap: 1.25rem;
}

.route-main,
.route-sidebar {
  min-width: 0;
}

.panel-subtitle {
  font-size: 0.85rem;
  color: #6c757d;
}

.panel-body {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.load-manifest-body {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.load-manifest-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.load-manifest-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.6rem 0.75rem;
  border: 1px solid #e9ecef;
  border-radius: 10px;
  background: #f8f9fa;
}

.load-manifest-name {
  font-weight: 600;
  color: #212529;
}

.load-manifest-qty {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.15rem;
}

.load-qty-remaining {
  font-weight: 600;
  color: #0d6efd;
}

.load-qty-delivered {
  font-size: 0.75rem;
  color: #dc3545;
}

.load-qty-original {
  font-size: 0.75rem;
  color: #6c757d;
}

.empty-points {
  padding: 1rem;
  text-align: center;
  font-size: 0.92rem;
  color: #6c757d;
  border: 1px dashed #ced4da;
  border-radius: 10px;
}

.points-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.point-stepper {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.stepper-card {
  padding: 1.25rem 1.35rem;
  border-radius: 14px;
  border: 1px solid #e9ecef;
  background: #fff;
  box-shadow: 0 12px 28px rgba(15, 30, 60, 0.12);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.stepper-card.visited {
  border-color: #b8ebc7;
  background: #e9f7ef;
}

.stepper-card.skipped {
  border-color: #ffe69c;
  background: #fff8e1;
}

.stepper-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.stepper-order {
  display: inline-block;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6c757d;
  margin-bottom: 0.35rem;
}

.stepper-title {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
  color: #212529;
}

.stepper-address {
  margin: 0;
  font-size: 0.92rem;
  color: #6c757d;
}

.stepper-meta {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.9rem;
  color: #495057;
}

.stepper-meta i {
  color: #0d6efd;
}

.stepper-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.65rem;
}

.btn-outline {
  border: 1px solid #ced4da;
  background: #fff;
  color: #495057;
  border-radius: 999px;
  padding: 0.55rem 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
}

.btn-outline:hover:not(:disabled) {
  border-color: #0d6efd;
  color: #0d6efd;
  box-shadow: 0 10px 24px rgba(13, 110, 253, 0.18);
}

.btn-outline:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.point-stepper .btn-warning {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border-radius: 999px;
  padding: 0.55rem 1.1rem;
}

.point-stepper .btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border-radius: 999px;
  padding: 0.6rem 1.2rem;
}

.stepper-empty {
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px dashed #ced4da;
  background: #f8f9fa;
  color: #495057;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: center;
}

.stepper-empty i {
  font-size: 1.8rem;
  color: #0d6efd;
}

.point-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.7rem 0.85rem;
  border: 1px solid #e9ecef;
  border-radius: 10px;
  background: #fff;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}

.point-row.clickable {
  cursor: pointer;
}

.point-row.clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 18px rgba(13, 110, 253, 0.12);
  border-color: #b6d6ff;
}

.point-row.active-click {
  box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.25);
  border-color: #0d6efd;
}

.point-row.visited {
  background: #e9f7ef;
  border-color: #b8ebc7;
}

.point-row.skipped {
  background: #fff3cd;
  border-color: #ffe69c;
}

.point-row.pending {
  background: #fff;
}

.point-row .left {
  flex: 1 1 auto;
  min-width: 0;
}

.point-row .order {
  font-weight: 700;
  color: #0d6efd;
  margin-bottom: 0.25rem;
}

.point-row .title {
  font-weight: 600;
  color: #212529;
}

.point-row .address {
  font-size: 0.85rem;
  color: #6c757d;
}

.point-row .right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-tag {
  padding: 0.25rem 0.55rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: #e9ecef;
  color: #495057;
}

.status-tag.visited {
  background: #d1e7dd;
  color: #0f5132;
}

.status-tag.skipped {
  background: #ffe69c;
  color: #664d03;
}

.btn-icon {
  border: none;
  background: transparent;
  padding: 0.35rem;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.btn-compact {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.6rem;
  font-size: 0.78rem;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: background 0.2s ease, box-shadow 0.2s ease;
}

.btn-compact i {
  font-size: 0.78rem;
}

.btn-compact.btn-primary {
  background: #0d6efd;
  color: #fff;
}

.btn-compact.btn-primary:hover {
  background: #0b5ed7;
  box-shadow: 0 6px 16px rgba(13, 110, 253, 0.28);
}

.btn-compact:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-icon:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-skip {
  color: #0d6efd;
}

.btn-skip:not(:disabled):hover {
  background: rgba(13, 110, 253, 0.12);
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

.route-stat.route-progress {
  flex-direction: column;
  align-items: stretch;
  gap: 0.6rem;
}

.route-stat.route-progress .progress-header {
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

.modal {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 30, 60, 0.45);
  z-index: 2147483000;
}

.modal-dialog {
  max-width: 720px;
  width: min(720px, 94%);
  max-height: 92vh;
  display: flex;
}

.modal-content {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 45px rgba(15, 30, 60, 0.25);
  display: flex;
  flex-direction: column;
  max-height: 92vh;
  width: 100%;
}

.modal-header,
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-color: #e9ecef;
  flex-shrink: 0;
}

.modal-body {
  padding: 1.1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  flex: 1 1 auto;
  overflow-y: auto;
}

.modal-error {
  color: #d6334c;
  font-weight: 600;
}

.btn-close {
  background: transparent;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  color: #6c757d;
}


.btn-close-panel {
  border: none;
  background: transparent;
  color: #6c757d;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.35rem 0.45rem;
}

.btn-close-panel:hover {
  color: #d6334c;
}

.btn-close-panel i {
  font-size: 1rem;
}

.standalone-card-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  font-size: 0.92rem;
  color: #495057;
}

.btn-standalone {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  border-radius: 999px;
}

.standalone-sale {
  margin-top: 1.25rem;
}

.standalone-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.standalone-body {
  padding-top: 0.75rem;
}

.standalone-body :deep(.sales-composer) {
  margin-top: 0.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-group label {
  font-weight: 600;
  font-size: 0.85rem;
  color: #343a40;
}

.form-control {
  width: 100%;
  padding: 0.55rem 0.65rem;
  border: 1px solid #ced4da;
  border-radius: 8px;
  font-size: 0.92rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-control:focus {
  outline: none;
  border-color: #0d6efd;
  box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.18);
}

.form-control[readonly] {
  background: #f8f9fa;
  color: #495057;
  cursor: not-allowed;
}

.form-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.form-hint {
  margin-top: 0.2rem;
  font-size: 0.78rem;
  color: #6c757d;
}

.client-meta {
  margin-top: 0.6rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.45rem 1rem;
}

.client-meta-item {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.client-meta-label {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6c757d;
}

.client-meta-value {
  font-size: 0.85rem;
  color: #212529;
  word-break: break-word;
}

.modal-body textarea.form-control {
  resize: vertical;
}

.product-picker {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.empty-products {
  padding: 0.85rem;
  border: 1px dashed #ced4da;
  border-radius: 10px;
  text-align: center;
  font-size: 0.9rem;
  color: #6c757d;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 0.75rem;
  margin: 0;
  padding: 0 0.15rem 0 0;
  max-height: 260px;
  overflow-y: auto;
}

.product-card {
  border: 1px solid #e9ecef;
  border-radius: 12px;
  background: #f8f9fa;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.product-card.expanded {
  border-color: rgba(13, 110, 253, 0.35);
  box-shadow: 0 4px 12px rgba(13, 110, 253, 0.12);
}

.product-card-header {
  width: 100%;
  border: none;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.7rem 0.9rem;
  cursor: pointer;
  text-align: left;
}

.product-card-header:hover {
  background: rgba(13, 110, 253, 0.08);
}

.product-card-header:focus-visible {
  outline: 2px solid rgba(13, 110, 253, 0.4);
}

.product-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.product-info strong {
  font-size: 0.96rem;
  color: #212529;
}

.product-info small {
  font-size: 0.82rem;
  color: #6c757d;
}

.product-card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.7rem 0.9rem 0.9rem;
  background: #fff;
  border-top: 1px solid #e9ecef;
}

@media (max-width: 540px) {
  .product-grid {
    grid-template-columns: 1fr;
  }
}

.action-btn {
  border: none;
  border-radius: 999px;
  padding: 0.45rem 0.9rem;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.action-btn i {
  font-size: 0.85rem;
}

.action-btn:active {
  transform: scale(0.97);
}

.action-sale {
  background: rgba(13, 110, 253, 0.12);
  color: #0d6efd;
}

.action-gift {
  background: rgba(25, 135, 84, 0.12);
  color: #198754;
}

.action-exchange {
  background: rgba(255, 193, 7, 0.18);
  color: #a07902;
}

.btn-remove-item {
  border: none;
  background: transparent;
  color: #dc3545;
  font-size: 0.85rem;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  cursor: pointer;
  transition: color 0.2s ease;
}

.btn-remove-item:hover {
  color: #bb2d3b;
}

.selected-items {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.selected-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #212529;
}

.selected-card {
  border: 1px solid #e9ecef;
  border-radius: 10px;
  background: #f8f9fa;
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.selected-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.selected-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.selected-price {
  font-size: 0.82rem;
  color: #6c757d;
}

.selected-body {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.qty-input {
  max-width: 140px;
}

.type-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.type-btn {
  border: 1px solid #ced4da;
  background: #fff;
  color: #495057;
  border-radius: 999px;
  padding: 0.35rem 0.85rem;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.type-btn.active {
  background: #0d6efd;
  border-color: #0d6efd;
  color: #fff;
}

.discount-input {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.discount-hint {
  font-size: 0.82rem;
  color: #6c757d;
}

.item-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  border: 1px solid #e9ecef;
  font-size: 0.88rem;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.sale-summary {
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid #e9ecef;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.92rem;
  color: #495057;
}

.summary-row strong {
  font-weight: 600;
  color: #212529;
}

.summary-total strong {
  color: #0d6efd;
  font-size: 1.05rem;
}

.toast-notification {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  background: #198754;
  color: #fff;
  font-size: 0.95rem;
  box-shadow: 0 18px 36px rgba(25, 135, 84, 0.35);
  z-index: 2147483646;
}

.toast-notification i {
  font-size: 1rem;
}

:deep(.toast-enter-active),
:deep(.toast-leave-active) {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

:deep(.toast-enter-from),
:deep(.toast-leave-to) {
  opacity: 0;
  transform: translateY(12px);
}

@media (max-width: 1100px) {
  .route-grid {
    grid-template-columns: 1fr;
  }
  .view-mode-toggle {
    width: 100%;
    justify-content: flex-start;
  }
  .stepper-actions {
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  }
}

@media (max-width: 720px) {
  .overview {
    padding: 1rem;
  }

  .toolbar-actions {
    width: 100%;
  }

  .toolbar-actions .btn {
    flex: 1 1 45%;
  }

  .finish-section {
    justify-content: center;
  }

  .btn-finish {
    width: 100%;
    justify-content: center;
  }

  .view-mode-toggle {
    justify-content: center;
  }

  .stepper-actions {
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  }

  .toast-notification {
    left: 1rem;
    right: 1rem;
    bottom: 1rem;
    justify-content: center;
  }
}
</style>
