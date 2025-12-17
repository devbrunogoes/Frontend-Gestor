<template>
  <section class="content-area">
    <h2>Dashboard</h2>

    <div class="dashboard-cards metrics-grid">
      <div class="card metric-card">
        <i class="fa-solid fa-users card-icon"></i>
        <div class="card-content">
          <h3>Clientes</h3>
          <p class="card-value">{{ clientesCount.toLocaleString('pt-BR') }}</p>
        </div>
      </div>
      <div class="card metric-card">
        <i class="fa-solid fa-dolly card-icon"></i>
        <div class="card-content">
          <h3>Produtos</h3>
          <p class="card-value">{{ produtosCount.toLocaleString('pt-BR') }}</p>
        </div>
      </div>
      <div class="card metric-card">
        <i class="fa-solid fa-cash-register card-icon"></i>
        <div class="card-content">
          <h3>Vendas Hoje</h3>
          <p class="card-value">{{ formatBRL(vendasHojeTotal) }}</p>
        </div>
      </div>
    </div>

    <div class="alerts-routes-grid">
      <div class="card alerts-card" :class="{ 'alerts-card--empty': !alerts.length }">
        <div class="alerts-card__header">
          <div class="alerts-card__title">
            <i class="fa-solid fa-bell-exclamation"></i>
            <div>
              <h3>Alertas de Estoque</h3>
              <p class="helper" v-if="alerts.length">{{ alerts.length }} produto{{ alerts.length > 1 ? 's' : '' }} precisa{{ alerts.length > 1 ? 'm' : '' }} de atenção</p>
              <p class="helper muted" v-else>Estoque sob controle no momento</p>
            </div>
          </div>
          <button class="btn btn-light" @click="refreshDashboard" :disabled="loading">{{ loading ? 'Atualizando…' : 'Atualizar' }}</button>
        </div>
        <div class="alerts-card__body" v-if="alerts.length">
          <div class="alerts-list">
            <article v-for="(a, idx) in alerts" :key="idx" class="alert-pill">
              <span class="alert-pill__index">#{{ idx + 1 }}</span>
              <p class="alert-pill__message">{{ a }}</p>
            </article>
          </div>
        </div>
        <div class="alerts-card__body" v-else>
          <div class="alerts-card__empty">
            <i class="fa-regular fa-circle-check"></i>
            <p>Nenhum alerta no momento.</p>
          </div>
        </div>
      </div>

      <div class="card routes-card">
        <div class="routes-card__header">
          <div class="routes-card__title">
            <i class="fa-solid fa-route"></i>
            <div>
              <h3>Rotas em andamento</h3>
              <p class="helper">{{ openExecutions.length }} em aberto</p>
            </div>
          </div>
          <button class="btn btn-primary" @click="goToOpenRoutes" :disabled="loading">
            <i class="fa-solid fa-list"></i>
            Ver rotas
          </button>
        </div>
      </div>
    </div>

    <div class="charts-grid">
      <div class="chart-card">
        <h3>Vendas - últimos 7 dias</h3>
        <SalesByDay />
      </div>
      <div class="chart-card">
        <h3>Vendas por origem</h3>
        <SalesByOrigin />
      </div>
      <div class="chart-card">
        <h3>Top 5 produtos por preço</h3>
        <TopProducts :topN="5" />
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import SalesByDay from '@/components/charts/SalesByDay.vue'
import SalesByOrigin from '@/components/charts/SalesByOrigin.vue'
import TopProducts from '@/components/charts/TopProducts.vue'
import { listClients } from '@/services/clients'
import { listProducts } from '@/services/products'
import { listSales } from '@/services/sales'
import { listExecutions, completeExecution } from '@/services/routeExecutions'
import { useRouter } from 'vue-router'

const loading = ref(false)
const clientesCount = ref(0)
const produtosCount = ref(0)
const vendasHojeTotal = ref(0)
const alerts = ref([])
const openExecutions = ref([])
const finishingId = ref('')
const routeMessage = ref('')
const router = useRouter()

function isSameDay(a, b){
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate()
}

function parseDate(d){
  try { return new Date(d) } catch { return null }
}

function saleTotal(s){
  const direct = Number(s.total || s.valorTotal || s.amount || 0)
  if (!isNaN(direct) && direct > 0) return direct
  const items = s.items || s.itens || []
  if (Array.isArray(items) && items.length){
    return items.reduce((sum, it) => {
      const q = Number(it.qtd || it.quantidade || it.quantity || 0)
      const p = Number(it.preco || it.price || it.valor || 0)
      return sum + (q * p)
    }, 0)
  }
  return 0
}

function formatBRL(n){
  try { return n.toLocaleString('pt-BR', { style:'currency', currency:'BRL' }) } catch { return `R$ ${Number(n||0).toFixed(2)}` }
}

async function finishExecution(exec){
  if (!exec || !exec.id) return
  finishingId.value = String(exec.id)
  routeMessage.value = ''
  try {
    await completeExecution(exec.id)
    routeMessage.value = 'Rota concluída com sucesso.'
    await refreshDashboard()
  } catch (err) {
    routeMessage.value = err?.message || 'Falha ao concluir rota.'
  } finally {
    finishingId.value = ''
  }
}

function goToOpenRoutes(){
  router.push({ name: 'rotas-em-andamento' })
}

async function refreshDashboard(){
  loading.value = true
  routeMessage.value = ''
  try {
    const [clients, products, sales, executions] = await Promise.all([
      listClients().catch(() => []),
      listProducts().catch(() => []),
      listSales().catch(() => []),
      listExecutions(null, 'in_progress').catch(() => []),
    ])
    clientesCount.value = Array.isArray(clients) ? clients.length : 0
    produtosCount.value = Array.isArray(products) ? products.length : 0

    const hoje = new Date()
    const vendasHoje = (Array.isArray(sales) ? sales : []).filter(s => {
      const d = parseDate(s.date || s.data || s.createdAt || s.dataVenda)
      return d ? isSameDay(d, hoje) : false
    })
    vendasHojeTotal.value = vendasHoje.reduce((sum, s) => sum + saleTotal(s), 0)

    // Alerts from products: below minimum stock
    const alertsList = []
    for (const p of (Array.isArray(products) ? products : [])){
      const nome = p.name || p.nome || p.nomeProduto || 'Produto'
      const qtd = Number(p.stockQuantity ?? p.estoque ?? p.quantidadeEstoque ?? p.qtdEstoque ?? 0)
      const min = Number(p.minStock ?? p.estoqueMinimo ?? p.minimo ?? 0)
      if (min > 0 && qtd <= min){
        alertsList.push(`Produto "${nome}" abaixo do estoque mínimo (${qtd} ≤ ${min}).`)
      }
    }
    alerts.value = alertsList

    const filtered = (Array.isArray(executions) ? executions : []).filter((e) => !e.completedAt && !e.fimReal)
    const sorted = filtered.sort((a, b) => {
      const da = new Date(a.startedAt || a.inicioPrevisto || a.createdAt || 0).valueOf()
      const db = new Date(b.startedAt || b.inicioPrevisto || b.createdAt || 0).valueOf()
      return db - da
    })
    openExecutions.value = sorted
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  refreshDashboard()
})

function formatDateTime(value){
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.valueOf()) ? '—' : d.toLocaleString('pt-BR')
}
</script>

<style scoped>
.content-area {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: clamp(1.25rem, 4vw, 2.75rem) clamp(1rem, 3vw, 2.5rem);
  display: flex;
  flex-direction: column;
  gap: clamp(1.5rem, 3vw, 2.5rem);
}

.content-area > h2 {
  margin: 0;
  font-size: clamp(1.4rem, 2.4vw, 2.1rem);
  font-weight: 600;
  color: var(--text-primary, #212529);
}

.metrics-grid {
  display: grid;
  gap: clamp(0.75rem, 3vw, 1.6rem);
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.metric-card {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  padding: clamp(0.55rem, 2.3vw, 0.95rem);
  gap: clamp(0.45rem, 2vw, 0.85rem);
  border-radius: 16px;
  background: var(--bg-white, #fff);
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  min-height: 0;
}

.metric-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.1);
}

.metric-card .card-icon {
  font-size: clamp(1.2rem, 4.5vw, 1.8rem);
  color: var(--primary, #0d6efd);
}

.metric-card .card-content h3 {
  margin: 0 0 0.15rem;
  font-size: clamp(0.7rem, 2.2vw, 0.85rem);
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--text-secondary, #6c757d);
}

.metric-card .card-value {
  margin: 0;
  font-size: clamp(0.95rem, 3.6vw, 1.35rem);
  font-weight: 700;
  color: var(--text-primary, #212529);
}

.alerts-card {
  padding: clamp(1rem, 3vw, 1.75rem);
  border-radius: 20px;
  background: var(--bg-white, #fff);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
  gap: clamp(0.8rem, 2.8vw, 1.2rem);
  border: 1px solid rgba(13, 110, 253, 0.08);
}

.alerts-routes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: clamp(1rem, 3vw, 1.5rem);
}

.routes-card {
  margin-top: clamp(0.25rem, 2vw, 0.75rem);
  padding: clamp(1rem, 3vw, 1.75rem);
  border-radius: 20px;
  background: var(--bg-white, #fff);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
  gap: clamp(0.8rem, 2.8vw, 1.2rem);
  border: 1px solid rgba(25, 135, 84, 0.12);
}

.routes-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.routes-card__title {
  display: flex;
  align-items: center;
  gap: clamp(0.75rem, 2.2vw, 1.25rem);
}

.routes-card__title i {
  font-size: clamp(1.3rem, 3.8vw, 1.8rem);
  color: #198754;
  background: rgba(25, 135, 84, 0.14);
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.routes-card__body {
  background: rgba(25, 135, 84, 0.02);
  border: 1px dashed rgba(25, 135, 84, 0.18);
  border-radius: 14px;
  padding: clamp(0.75rem, 2.5vw, 1.2rem);
}

.routes-list {
  display: grid;
  gap: 0.75rem;
}

.route-pill {
  background: #fff;
  border: 1px solid rgba(25, 135, 84, 0.18);
  border-radius: 12px;
  padding: 0.75rem 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
}

.route-pill__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.route-pill__actions {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.route-pill__name {
  font-weight: 700;
  color: var(--text-primary, #212529);
}

.route-pill__meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.35rem 0.75rem;
  margin: 0;
}

.route-pill__meta dt {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #6c757d;
  margin: 0;
}

.route-pill__meta dd {
  margin: 0;
  font-weight: 600;
  color: #1f2a3d;
}

.routes-card__empty {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #6c757d;
}

.routes-card--empty .routes-card__body {
  background: #fff;
  border-style: dashed;
}

.routes-card__message {
  margin: 0.4rem 0 0;
  color: #0f5132;
  font-weight: 600;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.status-chip--active {
  background: #d1e7dd;
  color: #0f5132;
  border: 1px solid rgba(15, 81, 50, 0.16);

  position: relative;
}

.alerts-card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.08);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.alerts-card:hover::after {
  opacity: 1;
}

.alerts-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.alerts-card__title {
  display: flex;
  align-items: center;
  gap: clamp(0.75rem, 2.2vw, 1.25rem);
}

.alerts-card__title i {
  font-size: clamp(1.4rem, 4vw, 1.9rem);
  color: #f59f00;
  background: rgba(245, 159, 0, 0.14);
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.alerts-card__title h3 {
  margin: 0;
  font-size: clamp(1.05rem, 2.4vw, 1.35rem);
  color: var(--text-primary, #212529);
}

.alerts-card__header h3 {
  margin: 0;
}

.alerts-card__body {
  width: 100%;
  overflow-x: auto;
}

.alerts-card__body .alerts-list {
  display: grid;
  gap: clamp(0.65rem, 2.4vw, 0.95rem);
}

.alert-pill {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: clamp(0.5rem, 2vw, 0.85rem);
  padding: clamp(0.65rem, 2.4vw, 0.9rem) clamp(0.75rem, 2.5vw, 1.1rem);
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(13, 110, 253, 0.08), rgba(13, 110, 253, 0.02));
  border: 1px solid rgba(13, 110, 253, 0.14);
  box-shadow: 0 12px 22px rgba(13, 110, 253, 0.08);
}

.alert-pill__index {
  font-weight: 700;
  color: var(--primary, #0d6efd);
  letter-spacing: 0.04em;
}

.alert-pill__message {
  margin: 0;
  font-size: clamp(0.85rem, 2.3vw, 1rem);
  line-height: 1.45;
  color: var(--text-primary, #212529);
}

.alerts-card__empty {
  display: grid;
  place-items: center;
  gap: 0.4rem;
  padding: clamp(0.9rem, 3vw, 1.2rem);
  border-radius: 16px;
  border: 1px dashed rgba(13, 110, 253, 0.25);
  color: var(--primary, #0d6efd);
  background: rgba(13, 110, 253, 0.05);
}

.alerts-card__empty i {
  font-size: clamp(1.35rem, 3.4vw, 1.8rem);
}

.alerts-card__empty p {
  margin: 0;
  font-size: 0.95rem;
}

.alerts-card--empty {
  border-color: rgba(18, 184, 134, 0.35);
  background: linear-gradient(135deg, rgba(18, 184, 134, 0.05), rgba(18, 184, 134, 0.02));
}

.alerts-card--empty .alerts-card__title i {
  color: #12b886;
  background: rgba(18, 184, 134, 0.14);
}

.alerts-card__body .data-table {
  min-width: 320px;
}

.alerts-card__body .data-table th,
.alerts-card__body .data-table td {
  padding: clamp(0.55rem, 2vw, 0.85rem) clamp(0.65rem, 2.5vw, 1.2rem);
  font-size: clamp(0.82rem, 2.4vw, 0.95rem);
}

.charts-grid {
  display: grid;
  gap: clamp(0.85rem, 3vw, 1.8rem);
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.chart-card {
  padding: clamp(1rem, 3vw, 1.7rem);
  border-radius: 20px;
  background: var(--bg-white, #fff);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
}

.chart-card h3 {
  margin: 0 0 0.85rem;
  font-size: clamp(1rem, 2.3vw, 1.35rem);
  color: var(--text-primary, #212529);
}

@media (max-width: 1024px) {
  .content-area {
    padding: clamp(1.1rem, 4vw, 2.2rem) clamp(1rem, 4vw, 2rem);
  }

  .charts-grid {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }
}

@media (max-width: 720px) {
  .content-area {
    padding: max(0.85rem, var(--safe-top)) clamp(0.6rem, 4vw, 1.1rem) max(1rem, var(--safe-bottom));
  }

  .metrics-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: clamp(0.45rem, 3.5vw, 0.85rem);
  }

  .metric-card {
    padding: clamp(0.45rem, 3.5vw, 0.75rem);
    border-radius: 14px;
    justify-self: stretch;
  }

  .metric-card .card-icon {
    font-size: clamp(1rem, 3.8vw, 1.45rem);
  }

  .metric-card .card-value {
    font-size: clamp(0.85rem, 3.3vw, 1.05rem);
  }

  .charts-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 520px) {
  .metrics-grid {
    display: flex;
    gap: clamp(0.45rem, 4vw, 0.75rem);
    overflow-x: auto;
    padding-bottom: 0.4rem;
    scroll-snap-type: x mandatory;
  }

  .metrics-grid::-webkit-scrollbar {
    height: 4px;
  }

  .metrics-grid::-webkit-scrollbar-thumb {
    background: rgba(13, 110, 253, 0.35);
    border-radius: 999px;
  }

  .metric-card {
    flex: 0 0 clamp(120px, 32vw, 160px);
    grid-template-columns: 1fr;
    text-align: center;
    justify-items: center;
    padding: clamp(0.4rem, 4vw, 0.6rem);
    scroll-snap-align: center;
  }

  .alerts-card__header {
    flex-direction: column;
    align-items: stretch;
  }

  .alerts-card__header .btn {
    width: 100%;
  }
}

@media (max-width: 400px) {
  .content-area {
    padding: max(0.75rem, var(--safe-top)) clamp(0.45rem, 5vw, 0.95rem) max(0.95rem, var(--safe-bottom));
  }

  .metrics-grid {
    gap: clamp(0.35rem, 4vw, 0.6rem);
  }

  .metric-card {
    flex: 0 0 clamp(110px, 34vw, 145px);
    padding: clamp(0.35rem, 4vw, 0.5rem);
    border-radius: 12px;
  }

  .metric-card .card-icon {
    font-size: clamp(0.95rem, 4.5vw, 1.35rem);
  }

  .metric-card .card-value {
    font-size: clamp(0.85rem, 4vw, 1.1rem);
  }

  .alerts-card,
  .chart-card {
    border-radius: 16px;
    padding: clamp(0.85rem, 5vw, 1.2rem);
  }
}

@media (max-width: 360px) {
  .metrics-grid {
    gap: clamp(0.3rem, 4vw, 0.5rem);
  }

  .metric-card {
    flex: 0 0 clamp(105px, 36vw, 135px);
    padding: clamp(0.3rem, 4vw, 0.45rem);
  }

  .content-area {
    padding: max(0.65rem, var(--safe-top)) clamp(0.35rem, 5vw, 0.75rem) max(0.85rem, var(--safe-bottom));
  }
}
</style>
