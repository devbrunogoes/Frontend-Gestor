<template>
  <section class="content-area inventory-view">
    <header class="page-header inventory-header">
      <div class="header-top">
        <div class="header-copy">
          <h2>Estoque</h2>
          <p>Mantenha o inventário saudável e reponha rapidamente os itens críticos.</p>
        </div>
        <div class="header-stats">
          <div class="stat-card">
            <span class="label">Produtos monitorados</span>
            <strong class="value">{{ totalProducts }}</strong>
          </div>
          <div class="stat-card">
            <span class="label">Itens críticos</span>
            <strong class="value" :class="{ highlight: lowStockCount > 0 }">{{ lowStockCount }}</strong>
          </div>
          <div class="stat-card">
            <span class="label">Itens ativos</span>
            <strong class="value">{{ totalActive }}</strong>
          </div>
          <div class="stat-card">
            <span class="label">Estoque total</span>
            <strong class="value">{{ formatQuantity(totalStockQuantity) }}</strong>
          </div>
        </div>
      </div>
      <div class="inventory-controls">
        <div class="search-wrapper">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input
            v-model.trim="searchTerm"
            type="search"
            placeholder="Buscar por nome, código ou categoria"
          />
        </div>
        <div class="filters">
          <button
            type="button"
            :class="['filter-pill', statusFilter === 'all' ? 'is-active' : '']"
            @click="statusFilter = 'all'"
          >
            Todos
          </button>
          <button
            type="button"
            :class="['filter-pill', statusFilter === 'active' ? 'is-active' : '']"
            @click="statusFilter = 'active'"
          >
            Ativos
          </button>
          <button
            type="button"
            :class="['filter-pill', statusFilter === 'critical' ? 'is-active' : '']"
            @click="statusFilter = 'critical'"
          >
            Críticos
          </button>
          <button
            type="button"
            :class="['filter-pill', statusFilter === 'inactive' ? 'is-active' : '']"
            @click="statusFilter = 'inactive'"
          >
            Inativos
          </button>
        </div>
      </div>
    </header>

    <div v-if="globalSuccess" class="feedback-banner success">
      <i class="fa-solid fa-circle-check"></i>
      <span>{{ globalSuccess }}</span>
    </div>

    <BaseError v-if="loadError" :message="loadError" :retry="loadProducts" />
    <BaseLoading v-else-if="loading" message="Carregando estoque…" />
    <template v-else>
      <div v-if="!filteredProducts.length" class="empty-state">
        <i class="fa-solid fa-box-open"></i>
        <h3>Nenhum produto encontrado</h3>
        <p>Cadastre novos itens ou ajuste os filtros para visualizar o estoque.</p>
      </div>
      <div v-else class="inventory-grid">
        <article
          v-for="product in filteredProducts"
          :key="product.id"
          class="inventory-card"
          :class="[{ 'is-expanded': quickProductId === product.id }, cardState(product)]"
        >
          <div class="card-top">
            <div class="card-title">
              <h3>{{ product.name || 'Produto sem nome' }}</h3>
              <span class="code-chip">{{ product.code || `#${product.id}` }}</span>
            </div>
            <span
              :class="[
                'status-pill',
                product.active !== false ? 'status-active' : 'status-inactive'
              ]"
            >
              {{ product.active !== false ? 'Ativo' : 'Inativo' }}
            </span>
          </div>

          <div class="meta-row">
            <span v-if="product.category?.name" class="meta-pill">{{ product.category.name }}</span>
            <span v-if="product.supplier?.name" class="meta-pill light">{{ product.supplier.name }}</span>
          </div>

          <p v-if="product.description" class="card-description">{{ product.description }}</p>

          <div class="stock-overview">
            <div class="stock-figure">
              <strong>{{ formatQuantity(product.stockQuantity) }}</strong>
              <span>em estoque</span>
            </div>
            <div class="stock-progress">
              <span class="stock-min">Mínimo {{ formatQuantity(product.minStock) }}</span>
              <div class="progress-track">
                <div
                  class="progress-bar"
                  :class="stockClass(product)"
                  :style="{ width: `${stockRatio(product)}%` }"
                ></div>
              </div>
            </div>
          </div>

          <div class="inventory-meta">
            <div>
              <span class="label">Preço</span>
              <strong>{{ formatCurrency(product.price) }}</strong>
            </div>
            <div>
              <span class="label">Custo</span>
              <strong>{{ formatCurrency(product.cost) }}</strong>
            </div>
            <div>
              <span class="label">Cobertura</span>
              <strong>{{ coverageLabel(product) }}</strong>
            </div>
          </div>

          <div class="card-actions">
            <button class="btn btn-primary" type="button" @click="toggleMovement(product)">
              <i class="fa-solid fa-boxes-packing"></i>
              <span>Movimentar estoque</span>
            </button>
          </div>

          <transition name="fade-slide">
            <div v-if="quickProductId === product.id" class="movement-panel">
              <div class="movement-header">
                <h4>Registrar movimentação</h4>
                <button type="button" class="btn-close" @click="closeMovement" aria-label="Fechar">
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>

              <div class="movement-type">
                <button
                  type="button"
                  :class="['movement-toggle', movementForm.type === 'ENTRADA' ? 'active' : '']"
                  @click="setMovementType('ENTRADA')"
                >
                  <i class="fa-solid fa-circle-arrow-up"></i>
                  <span>Entrada</span>
                </button>
                <button
                  type="button"
                  :class="['movement-toggle', movementForm.type === 'SAIDA' ? 'active' : '']"
                  @click="setMovementType('SAIDA')"
                >
                  <i class="fa-solid fa-circle-arrow-down"></i>
                  <span>Saída</span>
                </button>
                <button
                  type="button"
                  :class="['movement-toggle', movementForm.type === 'AJUSTE' ? 'active' : '']"
                  @click="setMovementType('AJUSTE')"
                >
                  <i class="fa-solid fa-scale-balanced"></i>
                  <span>Ajuste</span>
                </button>
              </div>

              <form class="movement-form" @submit.prevent="submitMovement(product)">
                <label>
                  Quantidade
                  <input
                    type="number"
                    :min="movementForm.type === 'AJUSTE' ? undefined : 0"
                    step="0.01"
                    v-model.number="movementForm.quantity"
                    placeholder="0,00"
                  />
                </label>
                <label>
                  Observação (opcional)
                  <input
                    type="text"
                    v-model.trim="movementForm.note"
                    placeholder="Motivo ou referência interna"
                  />
                </label>
                <div class="movement-actions">
                  <button type="button" class="btn btn-secondary" @click="closeMovement">Cancelar</button>
                  <button type="submit" class="btn btn-success" :disabled="movementLoading">
                    <span v-if="movementLoading">Registrando…</span>
                    <span v-else>Confirmar</span>
                  </button>
                </div>
              </form>

              <p class="movement-hint">
                Entradas e saídas usam valores positivos. Ajustes aceitam números negativos para reduzir o estoque.
              </p>
              <div v-if="movementFeedback.error" class="movement-alert error">{{ movementFeedback.error }}</div>
            </div>
          </transition>
        </article>
      </div>

      <section class="inventory-analytics" v-if="filteredProducts.length">
        <h3>Insights de estoque</h3>
        <div class="charts-grid">
          <div class="chart-card">
            <h4>Distribuição de preços</h4>
            <PriceBuckets />
          </div>
          <div class="chart-card">
            <h4>Top 10 por preço</h4>
            <TopProducts :topN="10" />
          </div>
        </div>
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import BaseError from '@/components/ui/BaseError.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import PriceBuckets from '@/components/charts/PriceBuckets.vue'
import TopProducts from '@/components/charts/TopProducts.vue'
import { listProducts, createStockMovement } from '@/services/products'

const products = ref([])
const loading = ref(false)
const loadError = ref('')
const searchTerm = ref('')
const statusFilter = ref('all')
const quickProductId = ref(null)
const movementForm = reactive({ type: 'ENTRADA', quantity: null, note: '' })
const movementLoading = ref(false)
const movementFeedback = reactive({ error: '' })
const globalSuccess = ref('')
let successTimeout = null

const totalProducts = computed(() => products.value.length)
const totalActive = computed(() => products.value.filter(p => p.active !== false).length)
const lowStockCount = computed(() => products.value.filter(isLowStock).length)
const totalStockQuantity = computed(() => products.value.reduce((sum, p) => sum + toNumber(p.stockQuantity), 0))

const filteredProducts = computed(() => {
  const term = searchTerm.value.trim().toLowerCase()
  const base = products.value
    .filter(applyStatusFilter)
    .filter(p => {
      if (!term) return true
      const tokens = [p.name, p.code, p.category?.name, p.supplier?.name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return tokens.includes(term)
    })

  return base
    .slice()
    .sort((a, b) => stockHealth(a) - stockHealth(b))
})

function toNumber(value) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function stockHealth(product) {
  return toNumber(product.stockQuantity) - toNumber(product.minStock)
}

function isLowStock(product) {
  const min = toNumber(product.minStock)
  if (min <= 0) return false
  return toNumber(product.stockQuantity) <= min
}

function applyStatusFilter(product) {
  switch (statusFilter.value) {
    case 'active':
      return product.active !== false
    case 'inactive':
      return product.active === false
    case 'critical':
      return isLowStock(product)
    default:
      return true
  }
}

function stockRatio(product) {
  const stock = toNumber(product.stockQuantity)
  const min = Math.max(0, toNumber(product.minStock))
  if (min === 0) return Math.min(100, stock > 0 ? 100 : 0)
  const ratio = (stock / min) * 100
  return Math.max(0, Math.min(120, ratio))
}

function stockClass(product) {
  if (product.active === false) return 'inactive'
  if (isLowStock(product)) return 'danger'
  if (stockRatio(product) < 130) return 'warning'
  return 'ok'
}

function cardState(product) {
  return {
    'is-inactive': product.active === false,
    'is-critical': isLowStock(product)
  }
}

function coverageLabel(product) {
  const min = toNumber(product.minStock)
  if (min <= 0) return '—'
  const stock = toNumber(product.stockQuantity)
  const coverage = min === 0 ? Infinity : stock / min
  if (!Number.isFinite(coverage)) return '—'
  if (coverage >= 3) return 'Confortável'
  if (coverage >= 1) return 'Adequada'
  return 'Crítica'
}

function formatQuantity(value) {
  return toNumber(value).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function formatCurrency(value) {
  return Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function resetMovementForm() {
  movementForm.type = 'ENTRADA'
  movementForm.quantity = null
  movementForm.note = ''
  movementFeedback.error = ''
}

function toggleMovement(product) {
  if (quickProductId.value === product.id) {
    closeMovement()
    return
  }
  quickProductId.value = product.id
  resetMovementForm()
}

function closeMovement() {
  quickProductId.value = null
  movementLoading.value = false
  movementFeedback.error = ''
}

function setMovementType(type) {
  movementForm.type = type
  if (type !== 'AJUSTE' && movementForm.quantity < 0) {
    movementForm.quantity = Math.abs(movementForm.quantity)
  }
}

async function submitMovement(product) {
  movementFeedback.error = ''
  const quantity = Number(movementForm.quantity)
  if (!Number.isFinite(quantity) || quantity === 0) {
    movementFeedback.error = 'Informe uma quantidade diferente de zero.'
    return
  }
  if (movementForm.type !== 'AJUSTE' && quantity <= 0) {
    movementFeedback.error = 'Para entradas e saídas use valores positivos.'
    return
  }
  movementLoading.value = true
  try {
    await createStockMovement(product.id, {
      type: movementForm.type,
      quantity,
      note: movementForm.note?.trim() || undefined
    })
    triggerSuccessMessage(movementForm.type)
    await loadProducts()
    closeMovement()
  } catch (error) {
    movementFeedback.error = error?.message || 'Erro ao registrar movimentação.'
  } finally {
    movementLoading.value = false
  }
}

function triggerSuccessMessage(type) {
  const messageMap = {
    ENTRADA: 'Entrada registrada e estoque atualizado.',
    SAIDA: 'Saída registrada com sucesso.',
    AJUSTE: 'Ajuste de estoque aplicado.'
  }
  globalSuccess.value = messageMap[type] || 'Movimentação registrada.'
  if (successTimeout) clearTimeout(successTimeout)
  successTimeout = setTimeout(() => {
    globalSuccess.value = ''
  }, 4000)
}

async function loadProducts() {
  loading.value = true
  loadError.value = ''
  try {
    const result = await listProducts()
    products.value = Array.isArray(result) ? result : []
  } catch (error) {
    loadError.value = error?.message || 'Não foi possível carregar os produtos.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadProducts()
})

onUnmounted(() => {
  if (successTimeout) {
    clearTimeout(successTimeout)
    successTimeout = null
  }
})
</script>

<style scoped>
.inventory-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.inventory-header {
  display: flex;
  flex-direction: column;
  gap: 1.45rem;
  padding: 1.85rem 2rem;
  background: linear-gradient(135deg, #ffffff 0%, #f4f8ff 100%);
  border-radius: 24px;
  border: 1px solid rgba(15, 30, 60, 0.08);
  box-shadow: 0 24px 46px rgba(15, 30, 60, 0.12);
}

.header-top {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.4rem;
}

.header-copy {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  flex: 1 1 260px;
  min-width: 200px;
  max-width: 420px;
}

.header-copy h2 {
  margin: 0;
  font-size: 1.85rem;
  font-weight: 700;
  color: #0f172a;
}

.header-copy p {
  margin: 0.3rem 0 0;
  color: #6b7280;
  max-width: 100%;
  font-size: 0.95rem;
}

.header-stats {
  flex: 2 1 360px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.85rem;
  align-items: stretch;
}

.header-stats::-webkit-scrollbar {
  height: 0.35rem;
}

.header-stats::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.3);
  border-radius: 999px;
}

.stat-card {
  padding: 0.65rem 0.85rem;
  border-radius: 16px;
  background: rgba(15, 30, 60, 0.05);
  border: 1px solid rgba(15, 30, 60, 0.08);
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 34px rgba(15, 30, 60, 0.18);
}

.stat-card .label {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #6b7280;
}

.stat-card .value {
  font-size: 1.2rem;
  font-weight: 700;
  color: #111827;
}

.stat-card .value.highlight {
  color: #dc2626;
}

.inventory-controls {
  display: grid;
  gap: 0.85rem;
  grid-template-columns: minmax(280px, 1fr) auto;
  align-items: stretch;
  padding: 0.9rem 1.1rem;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  box-shadow: 0 18px 34px rgba(15, 30, 60, 0.08);
}

.search-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 0.75rem;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: #ffffff;
  box-shadow: 0 12px 24px rgba(15, 30, 60, 0.08);
}

.search-wrapper i {
  color: #64748b;
}

.search-wrapper input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 0.9rem;
  color: #0f172a;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  justify-content: flex-end;
  align-items: center;
  min-width: 220px;
}

.filter-pill {
  padding: 0.4rem 1rem;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: #ffffff;
  color: #475569;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.filter-pill:hover {
  color: #0f172a;
  border-color: rgba(13, 110, 253, 0.45);
  transform: translateY(-1px);
}

.filter-pill.is-active {
  background: rgba(13, 110, 253, 0.12);
  border-color: rgba(13, 110, 253, 0.4);
  color: #0d6efd;
}

.inventory-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.1rem;
}

.inventory-card {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  padding: 1.1rem 1.15rem;
  border-radius: 20px;
  background: linear-gradient(180deg, #ffffff 0%, #f5f8ff 65%, #edf2ff 100%);
  border: 1px solid rgba(13, 110, 253, 0.1);
  box-shadow: 0 24px 40px rgba(15, 30, 60, 0.14);
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}

.inventory-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 32px 56px rgba(15, 30, 60, 0.18);
}

.inventory-card.is-inactive {
  background: linear-gradient(180deg, #f8fafc 0%, #eef2f6 100%);
  border-color: rgba(148, 163, 184, 0.4);
  opacity: 0.9;
}

.inventory-card.is-critical {
  border-color: rgba(220, 38, 38, 0.35);
  box-shadow: 0 26px 48px rgba(220, 38, 38, 0.16);
}
.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.8rem;
}

.card-title {
  display: flex;
  flex-direction: column;
  gap: 0.32rem;
}

.card-title h3 {
  margin: 0;
  font-size: 1.08rem;
  font-weight: 700;
  color: #0f172a;
}

.code-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.22rem 0.55rem;
  border-radius: 999px;
  background: rgba(13, 110, 253, 0.12);
  color: #0d6efd;
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.26rem 0.6rem;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.status-active {
  background: rgba(34, 197, 94, 0.18);
  color: #15803d;
}

.status-inactive {
  background: rgba(148, 163, 184, 0.2);
  color: #475569;
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.meta-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.24rem 0.55rem;
  border-radius: 11px;
  font-size: 0.74rem;
  font-weight: 600;
  color: #475569;
  background: rgba(226, 232, 240, 0.85);
}

.meta-pill.light {
  background: rgba(125, 211, 252, 0.16);
  color: #0f172a;
}

.card-description {
  margin: 0;
  color: #55627a;
  font-size: 0.86rem;
  line-height: 1.45;
}

.stock-overview {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  align-items: center;
}

.stock-figure {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stock-figure strong {
  font-size: 1.05rem;
  color: #0f172a;
}

.stock-figure span {
  color: #64748b;
  font-size: 0.74rem;
}

.stock-progress {
  display: flex;
  flex-direction: column;
  gap: 0.32rem;
}

.stock-min {
  font-size: 0.66rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.progress-track {
  position: relative;
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.25);
  overflow: hidden;
}

.progress-bar {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  transform-origin: left center;
}

.progress-bar.ok {
  background: linear-gradient(90deg, #16a34a, #22c55e);
}

.progress-bar.warning {
  background: linear-gradient(90deg, #f59e0b, #f97316);
}

.progress-bar.danger {
  background: linear-gradient(90deg, #dc2626, #f87171);
}

.progress-bar.inactive {
  background: linear-gradient(90deg, #94a3b8, #cbd5f5);
}

.inventory-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
}

.inventory-meta .label {
  display: block;
  font-size: 0.64rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #94a3b8;
  margin-bottom: 0.25rem;
}

.inventory-meta strong {
  font-size: 0.9rem;
  color: #0f172a;
}

.card-actions {
  display: flex;
  justify-content: flex-end;
}

.card-actions .btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border-radius: 999px;
  padding: 0.55rem 1.15rem;
  font-size: 0.85rem;
}

.movement-panel {
  margin: 0.45rem -0.15rem -0.15rem;
  padding: 0.9rem 1.05rem 1.05rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(13, 110, 253, 0.12);
  box-shadow: 0 14px 28px rgba(15, 30, 60, 0.11);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.movement-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.movement-header h4 {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 700;
  color: #0f172a;
}

.btn-close {
  border: none;
  background: transparent;
  color: #475569;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  transition: background 0.2s ease;
  cursor: pointer;
}

.btn-close:hover {
  background: rgba(148, 163, 184, 0.2);
}

.movement-type {
  display: inline-flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.movement-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: #fff;
  color: #475569;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.movement-toggle i {
  font-size: 0.8rem;
}

.movement-toggle.active {
  background: rgba(13, 110, 253, 0.14);
  color: #0d6efd;
  border-color: rgba(13, 110, 253, 0.4);
}

.movement-form {
  display: grid;
  gap: 0.65rem;
}

.movement-form label {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-weight: 600;
  color: #475569;
}

.movement-form input {
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 11px;
  padding: 0.5rem 0.7rem;
  font-size: 0.9rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.movement-form input:focus {
  outline: none;
  border-color: #0d6efd;
  box-shadow: 0 0 0 4px rgba(13, 110, 253, 0.18);
}

.movement-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
}

.movement-hint {
  margin: 0;
  font-size: 0.76rem;
  color: #64748b;
}

.movement-alert {
  padding: 0.6rem 0.7rem;
  border-radius: 11px;
  font-weight: 600;
  font-size: 0.8rem;
}

.movement-alert.error {
  background: rgba(220, 38, 38, 0.1);
  color: #b91c1c;
  border: 1px solid rgba(220, 38, 38, 0.2);
}

.inventory-analytics {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 0.5rem;
}

.inventory-analytics h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: #0f172a;
}

.charts-grid {
  display: grid;
  gap: 1.2rem;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.chart-card {
  background: #ffffff;
  border-radius: 20px;
  padding: 1.4rem;
  box-shadow: 0 18px 36px rgba(15, 30, 60, 0.1);
  border: 1px solid rgba(226, 232, 240, 0.7);
}

.chart-card h4 {
  margin: 0 0 0.85rem;
  font-size: 1rem;
  color: #0f172a;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.9rem;
  padding: 3rem 1.4rem;
  border-radius: 22px;
  background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
  border: 1px dashed rgba(148, 163, 184, 0.4);
  text-align: center;
  color: #475569;
}

.empty-state i {
  font-size: 2rem;
  color: #0d6efd;
}

.empty-state h3 {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
  color: #0f172a;
}

.feedback-banner {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 1.1rem;
  border-radius: 16px;
  font-weight: 600;
  box-shadow: 0 18px 32px rgba(15, 23, 42, 0.08);
}

.feedback-banner.success {
  background: rgba(34, 197, 94, 0.12);
  color: #15803d;
  border: 1px solid rgba(34, 197, 94, 0.25);
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (max-width: 960px) {
  .inventory-header {
    padding: 1.55rem 1.6rem;
    gap: 1.25rem;
  }

  .header-top {
    flex-direction: column;
    align-items: stretch;
    gap: 1.1rem;
  }

  .inventory-controls {
    grid-template-columns: 1fr;
  }

  .filters {
    justify-content: flex-start;
  }

  .movement-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .movement-actions .btn {
    width: 100%;
  }
}

@media (max-width: 720px) {
  .inventory-header {
    padding: 1.35rem 1.3rem;
    gap: 1.1rem;
  }

  .header-copy h2 {
    font-size: 1.5rem;
  }

  .header-stats {
    grid-template-columns: repeat(2, minmax(160px, 1fr));
  }

  .inventory-controls {
    grid-template-columns: 1fr;
  }

  .filters {
    width: 100%;
    justify-content: flex-start;
  }

  .inventory-meta {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }

  .stock-overview {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .inventory-header {
    gap: 0.9rem;
    padding: 1.1rem 1rem;
  }

  .header-copy {
    align-items: flex-start;
  }

  .header-copy h2 {
    font-size: 1.38rem;
  }

  .header-copy p {
    font-size: 0.88rem;
    max-width: none;
  }

  .header-stats {
    grid-auto-flow: column;
    grid-auto-columns: minmax(160px, 1fr);
    overflow-x: auto;
    gap: 0.6rem;
    padding-bottom: 0.3rem;
    margin: 0 -0.2rem;
    padding-left: 0.2rem;
  }

  .stat-card {
    min-width: 145px;
    flex: 0 0 auto;
    padding: 0.48rem 0.56rem;
  }

  .stat-card .label {
    font-size: 0.6rem;
  }

  .stat-card .value {
    font-size: 0.92rem;
  }

  .inventory-controls {
    padding: 0.8rem 0.85rem;
    gap: 0.6rem;
  }

  .search-wrapper {
    padding: 0.45rem 0.6rem;
    gap: 0.35rem;
    box-shadow: 0 8px 18px rgba(15, 30, 60, 0.09);
  }

  .filters {
    flex: 1 1 100%;
    justify-content: flex-start;
    gap: 0.4rem;
  }

  .inventory-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .inventory-view {
    gap: 1rem;
  }

  .inventory-header {
    padding: calc(0.75rem + var(--safe-top, 0px)) 0.8rem 0.9rem;
    border-radius: 18px;
    gap: 0.75rem;
    box-shadow: 0 16px 32px rgba(15, 30, 60, 0.12);
  }

  .header-copy {
    gap: 0.2rem;
  }

  .header-copy h2 {
    font-size: 1.18rem;
  }

  .header-copy p {
    font-size: 0.82rem;
    line-height: 1.4;
  }

  .header-stats {
    grid-auto-flow: column;
    grid-auto-columns: minmax(140px, 1fr);
    gap: 0.4rem;
    padding: 0 0.1rem 0.25rem;
  }

  .stat-card {
    padding: 0.4rem 0.5rem;
    border-radius: 12px;
  }

  .stat-card .label {
    font-size: 0.55rem;
  }

  .stat-card .value {
    font-size: 0.88rem;
  }

  .inventory-controls {
    grid-template-columns: 1fr;
    padding: 0.65rem 0.7rem;
    gap: 0.5rem;
    border-radius: 14px;
    box-shadow: 0 12px 24px rgba(15, 30, 60, 0.12);
  }

  .search-wrapper {
    padding: 0.35rem 0.45rem;
    gap: 0.28rem;
    border-radius: 10px;
    box-shadow: none;
  }

  .search-wrapper i {
    font-size: 0.82rem;
  }

  .search-wrapper input {
    font-size: 0.8rem;
  }

  .filters {
    gap: 0.35rem;
    width: 100%;
  }

  .filter-pill {
    flex: 1 1 calc(50% - 0.35rem);
    font-size: 0.78rem;
    padding: 0.32rem 0.5rem;
  }

  .inventory-grid {
    grid-template-columns: 1fr;
    gap: 0.7rem;
  }

  .inventory-card {
    padding: 0.75rem 0.8rem;
    gap: 0.6rem;
    border-radius: 16px;
    box-shadow: 0 18px 28px rgba(15, 30, 60, 0.14);
  }

  .card-title h3 {
    font-size: 0.96rem;
  }

  .code-chip {
    font-size: 0.62rem;
    padding: 0.18rem 0.4rem;
  }

  .status-pill {
    font-size: 0.64rem;
    padding: 0.22rem 0.5rem;
  }

  .inventory-meta {
    grid-template-columns: 1fr;
    gap: 0.45rem;
  }

  .card-actions .btn {
    width: 100%;
    justify-content: center;
  }

  .movement-panel {
    margin: 0.5rem 0 0;
    padding: 0.7rem 0.75rem 0.85rem;
    border-radius: 14px;
  }

  .movement-actions {
    gap: 0.4rem;
  }

  .movement-actions .btn {
    width: 100%;
  }
}

@media (max-width: 380px) {
  .inventory-header {
    padding: calc(0.65rem + var(--safe-top, 0px)) 0.6rem 0.7rem;
    border-radius: 16px;
    gap: 0.55rem;
  }

  .header-copy h2 {
    font-size: 1.04rem;
  }

  .header-copy p {
    font-size: 0.72rem;
  }

  .header-stats {
    grid-auto-columns: minmax(130px, 1fr);
    gap: 0.35rem;
  }

  .stat-card {
    min-width: 0;
    padding: 0.35rem 0.45rem;
  }

  .stat-card .label {
    font-size: 0.52rem;
  }

  .stat-card .value {
    font-size: 0.78rem;
  }

  .search-wrapper {
    padding: 0.3rem 0.38rem;
    border-radius: 9px;
    gap: 0.2rem;
  }

  .search-wrapper i {
    font-size: 0.78rem;
  }

  .search-wrapper input {
    font-size: 0.72rem;
  }

  .filter-pill {
    flex: 1 1 100%;
    font-size: 0.72rem;
    padding: 0.28rem 0.45rem;
  }

  .inventory-card {
    padding: 0.65rem 0.7rem;
    border-radius: 14px;
    box-shadow: 0 14px 22px rgba(15, 30, 60, 0.12);
  }

  .inventory-card.is-expanded {
    grid-column: 1 / -1;
  }

  .card-title h3 {
    font-size: 0.9rem;
  }

  .code-chip {
    font-size: 0.6rem;
  }

  .status-pill {
    font-size: 0.58rem;
  }

  .meta-pill {
    font-size: 0.58rem;
  }

  .inventory-meta strong {
    font-size: 0.68rem;
  }

  .card-actions .btn {
    padding: 0.3rem 0.5rem;
    font-size: 0.72rem;
  }

  .movement-toggle {
    width: 100%;
    justify-content: center;
  }

  .movement-actions {
    flex-direction: column;
  }
}

@media (max-height: 560px) and (orientation: landscape) {
  .inventory-view {
    padding-bottom: calc(3rem + var(--safe-bottom));
  }

  .inventory-header {
    position: sticky;
    z-index: 12;
    background: var(--bg-body);
    border-radius: 20px;
    top: calc(var(--safe-top) + 0.75rem);
    box-shadow: 0 8px 24px rgba(15, 30, 60, 0.08);
  }

  .inventory-grid {
    padding-bottom: calc(2rem + var(--safe-bottom));
  }
}
</style>
