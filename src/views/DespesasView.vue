<template>
  <section class="content-area expenses-view">
    <header class="page-header expenses-header">
      <div class="header-top">
        <div class="header-copy">
          <h2>Despesas Operacionais</h2>
          <p>Centralize pagamentos, acompanhe categorias e identifique os maiores gastos.</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-success" type="button" @click="openNew">
            <i class="fa-solid fa-plus"></i>
            <span>Nova despesa</span>
          </button>
          <button class="btn btn-ghost" type="button" @click="load">
            <i class="fa-solid fa-rotate"></i>
            <span>Atualizar</span>
          </button>
        </div>
      </div>
      <div class="header-summary">
        <div class="summary-card warning" :class="{ critical: overdueAmount > 0 }">
          <span class="summary-label">Total registrado</span>
          <strong class="summary-value">{{ fmtBRL(totalAmount) }}</strong>
          <span class="summary-note">{{ enrichedExpenses.length }} lançamento(s)</span>
        </div>
        <div class="summary-card positive">
          <span class="summary-label">Pagas</span>
          <strong class="summary-value">{{ fmtBRL(totalPaid) }}</strong>
          <span class="summary-note">{{ paidCount }} despesa(s)</span>
        </div>
        <div class="summary-card highlight">
          <span class="summary-label">Pendentes</span>
          <strong class="summary-value">{{ fmtBRL(totalPending) }}</strong>
          <span class="summary-note">{{ pendingCount }} em aberto</span>
        </div>
        <div class="summary-card neutral">
          <span class="summary-label">Média mensal</span>
          <strong class="summary-value">{{ fmtBRL(monthlyAverage) }}</strong>
          <span class="summary-note">{{ monthlySummaryLabel }}</span>
        </div>
      </div>
    </header>

    <div class="filters-card">
      <div class="filter-group">
        <label for="search">Buscar</label>
        <input id="search" type="search" class="form-control" placeholder="Descrição, categoria ou fornecedor" v-model.trim="searchTerm" />
      </div>
      <div class="filter-group">
        <label for="status">Status</label>
        <select id="status" class="form-control" v-model="statusFilter">
          <option value="all">Todos</option>
          <option value="open">Em aberto</option>
          <option value="soon">Próximos 7 dias</option>
          <option value="overdue">Atrasados</option>
          <option value="paid">Pagos</option>
        </select>
      </div>
      <div class="filter-group">
        <label for="category">Categoria</label>
        <select id="category" class="form-control" v-model="categoryFilter">
          <option value="all">Todas</option>
          <option v-for="cat in categoryOptions" :key="cat" :value="cat">{{ cat }}</option>
        </select>
      </div>
      <div class="filter-group">
        <label for="range">Período</label>
        <div class="range-inputs">
          <input id="range" type="date" class="form-control" v-model="dateStart" />
          <span>até</span>
          <input type="date" class="form-control" v-model="dateEnd" />
        </div>
      </div>
      <div class="filter-group">
        <label>&nbsp;</label>
        <button class="btn btn-primary" type="button" @click="clearFilters">
          Limpar filtros
        </button>
      </div>
    </div>

    <BaseError v-if="loadError" :message="loadError" :retry="load" />
    <BaseLoading v-else-if="loading" message="Carregando despesas…" />
    <div v-else class="expenses-content">
      <div class="table-card">
        <div class="table-header">
          <h3>Planilha de Despesas</h3>
          <span class="table-caption">{{ filteredExpenses.length }} registro(s)</span>
        </div>
        <div class="table-responsive">
          <table class="data-table expenses-table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Categoria</th>
                <th class="text-end">Valor</th>
                <th>Data</th>
                <th>Status</th>
                <th class="actions-col">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!filteredExpenses.length">
                <td colspan="6" class="empty-row">Nenhuma despesa encontrada para os filtros selecionados.</td>
              </tr>
              <tr v-for="item in filteredExpenses" :key="item.id || `${item.descricao}-${item.__dateISO}`" :class="rowClass(item)">
                <td data-label="Descrição">
                  <div class="description-cell">
                    <strong>{{ item.descricao || 'Despesa sem descrição' }}</strong>
                    <span v-if="item.observacao" class="description-note">{{ item.observacao }}</span>
                  </div>
                </td>
                <td data-label="Categoria">{{ item.categoria || 'Sem categoria' }}</td>
                <td data-label="Valor" class="text-end">{{ fmtBRL(item.__valor) }}</td>
                <td data-label="Data">{{ fmtDate(item.data || item.__dateISO) }}</td>
                <td data-label="Status">
                  <span class="status-pill" :class="statusClass(item)">{{ statusLabel(item) }}</span>
                </td>
                <td class="actions-col" data-label="Ações">
                  <button class="btn-icon btn-success" title="Marcar pago" @click="togglePaid(item)"><i class="fa-solid fa-check"></i></button>
                  <button class="btn-icon btn-warning" title="Editar" @click="openEdit(item)"><i class="fa-solid fa-pen"></i></button>
                  <button class="btn-icon btn-danger" title="Excluir" @click="onDelete(item)"><i class="fa-solid fa-trash"></i></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <aside class="insights-card">
        <div class="insights-section">
          <h4>Top categorias</h4>
          <ul v-if="categoryHighlights.length" class="insights-list">
            <li v-for="cat in categoryHighlights" :key="`cat-${cat.categoria}`">
              <div>
                <span class="item-title">{{ cat.categoria }}</span>
                <span class="item-sub">{{ fmtBRL(cat.valor) }}</span>
              </div>
              <div class="item-meta">
                <span class="item-note">{{ fmtPercent(cat.perc) }}</span>
              </div>
            </li>
          </ul>
          <p v-else class="empty-note">Cadastre despesas para visualizar categorias relevantes.</p>
        </div>

        <div class="insights-section">
          <h4>Maiores despesas</h4>
          <ul v-if="highestExpenses.length" class="insights-list">
            <li v-for="exp in highestExpenses" :key="`high-${exp.id || exp.__dateISO || exp.descricao}`">
              <div>
                <span class="item-title">{{ exp.descricao || 'Sem descrição' }}</span>
                <span class="item-sub">{{ fmtDate(exp.data || exp.__dateISO) }}</span>
              </div>
              <div class="item-meta">
                <span class="item-value neg">{{ fmtBRL(exp.__valor) }}</span>
              </div>
            </li>
          </ul>
          <p v-else class="empty-note">Nenhuma despesa registrada.</p>
        </div>

        <div class="insights-section">
          <h4>Resumo mensal</h4>
          <ul v-if="monthlyTrend.length" class="insights-list compact">
            <li v-for="item in monthlyTrend" :key="item.key">
              <div>
                <span class="item-title">{{ item.label }}</span>
                <span class="item-sub">{{ item.count }} lançamento(s)</span>
              </div>
              <div class="item-meta">
                <span class="item-value neg">{{ fmtBRL(item.valor) }}</span>
              </div>
            </li>
          </ul>
          <p v-else class="empty-note">Sem histórico suficiente para compor o gráfico mensal.</p>
        </div>
      </aside>
    </div>

    <div class="modal" role="dialog" aria-hidden="true" :class="{ show: showModal }" @click.self="close">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h3>{{ editId ? 'Editar despesa' : 'Nova despesa' }}</h3>
            <button type="button" class="btn-close" @click="close" aria-label="Fechar"><i class="fa-solid fa-times"></i></button>
          </div>
          <form @submit.prevent="save">
            <div class="modal-body">
              <div class="form-grid">
                <div class="form-group form-group-large">
                  <label for="descricao">Descrição</label>
                  <input id="descricao" class="form-control" v-model.trim="form.descricao" required />
                </div>
                <div class="form-group form-group-large">
                  <label for="categoria">Categoria</label>
                  <input id="categoria" class="form-control" v-model.trim="form.categoria" placeholder="Ex: Aluguel, Impostos" />
                </div>
                <div class="form-group">
                  <label for="valor">Valor (R$)</label>
                  <input id="valor" type="number" min="0" step="0.01" class="form-control" v-model.number="form.valor" />
                </div>
                <div class="form-group">
                  <label for="data">Data</label>
                  <input id="data" type="date" class="form-control" v-model="form.data" />
                </div>
                <div class="form-group">
                  <label for="pago">Pago</label>
                  <select id="pago" class="form-control" v-model="form.pago">
                    <option :value="false">Não</option>
                    <option :value="true">Sim</option>
                  </select>
                </div>
              </div>
              <p v-if="errorMsg" class="form-error">{{ errorMsg }}</p>
              <p v-if="successMsg" class="form-success">{{ successMsg }}</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="close">Cancelar</button>
              <button type="submit" class="btn btn-success">Salvar</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import BaseError from '@/components/ui/BaseError.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import { listExpenses, createExpense, updateExpense, deleteExpense } from '@/services/expenses'

const expenses = ref([])
const loading = ref(false)
const loadError = ref('')
const showModal = ref(false)
const editId = ref(null)
const searchTerm = ref('')
const statusFilter = ref('all')
const categoryFilter = ref('all')
const dateStart = ref('')
const dateEnd = ref('')
const form = reactive({
  descricao: '',
  categoria: '',
  valor: 0,
  data: new Date().toISOString().slice(0, 10),
  pago: false
})
const errorMsg = ref('')
const successMsg = ref('')

const today = () => {
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  return base
}

function fmtBRL(value) {
  return (Number(value) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(date) {
  if (!date) return 'Sem data'
  const dt = new Date(date)
  if (Number.isNaN(dt)) return 'Sem data'
  return dt.toLocaleDateString('pt-BR')
}

function fmtPercent(value) {
  if (!Number.isFinite(value)) return '0%'
  return `${(value * 100).toFixed(1)}%`
}

function monthKey(date) {
  const dt = new Date(date)
  if (Number.isNaN(dt)) return null
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
}

function fmtMonthLabel(key) {
  if (!key) return '--'
  const [y, m] = key.split('-')
  const dt = new Date(Number(y), Number(m) - 1, 1)
  if (Number.isNaN(dt)) return '--'
  return dt.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
}

function startOfDay(value) {
  if (!value) return null
  const dt = new Date(value)
  if (Number.isNaN(dt)) return null
  dt.setHours(0, 0, 0, 0)
  return dt
}

const enrichedExpenses = computed(() => expenses.value.map(expense => {
  const valor = Number(expense.valor || expense.amount || 0)
  const rawDate = expense.data || expense.pagamentoEm || ''
  const date = startOfDay(rawDate)
  let status = 'open'
  if (expense.pago) {
    status = 'paid'
  } else if (date) {
    const diff = Math.ceil((date - today()) / 86400000)
    if (diff < 0) status = 'overdue'
    else if (diff === 0) status = 'today'
    else if (diff <= 7) status = 'soon'
  }
  return {
    ...expense,
    __valor: valor,
    __date: date,
    __dateISO: date ? date.toISOString().slice(0, 10) : '',
    __status: status,
    __categoryLabel: expense.categoria || 'Sem categoria',
    __monthKey: date ? monthKey(date) : null
  }
}))

const categoryOptions = computed(() => {
  const set = new Set()
  enrichedExpenses.value.forEach(item => set.add(item.__categoryLabel))
  return Array.from(set).sort((a, b) => a.localeCompare(b))
})

const filteredExpenses = computed(() => {
  const term = searchTerm.value.trim().toLowerCase()
  const status = statusFilter.value
  const category = categoryFilter.value
  const start = dateStart.value ? startOfDay(dateStart.value) : null
  const end = dateEnd.value ? startOfDay(dateEnd.value) : null
  if (end) end.setHours(23, 59, 59, 999)

  return enrichedExpenses.value.filter(item => {
    if (term) {
      const haystack = `${item.descricao || ''} ${item.categoria || ''} ${item.fornecedor || ''}`.toLowerCase()
      if (!haystack.includes(term)) return false
    }

    if (category !== 'all' && item.__categoryLabel !== category) return false
    if (start && (!item.__date || item.__date < start)) return false
    if (end && (!item.__date || item.__date > end)) return false

    if (status === 'paid' && !item.pago) return false
    if (status === 'open' && (item.pago || item.__status === 'overdue' || item.__status === 'soon' || item.__status === 'today')) return false
    if (status === 'overdue' && item.__status !== 'overdue') return false
    if (status === 'soon' && item.__status !== 'soon' && item.__status !== 'today') return false

    return true
  }).sort((a, b) => {
    if (a.__date && b.__date) return b.__date - a.__date
    if (a.__date) return -1
    if (b.__date) return 1
    return String(b.descricao || '').localeCompare(String(a.descricao || ''))
  })
})

const totalAmount = computed(() => enrichedExpenses.value.reduce((sum, item) => sum + item.__valor, 0))
const totalPaid = computed(() => enrichedExpenses.value.filter(item => item.pago).reduce((sum, item) => sum + item.__valor, 0))
const totalPending = computed(() => enrichedExpenses.value.filter(item => !item.pago).reduce((sum, item) => sum + item.__valor, 0))
const paidCount = computed(() => enrichedExpenses.value.filter(item => item.pago).length)
const pendingCount = computed(() => enrichedExpenses.value.filter(item => !item.pago).length)
const overdueAmount = computed(() => enrichedExpenses.value.filter(item => item.__status === 'overdue').reduce((sum, item) => sum + item.__valor, 0))

const categoryHighlights = computed(() => {
  const total = totalAmount.value
  const map = new Map()
  enrichedExpenses.value.forEach(item => {
    const data = map.get(item.__categoryLabel) || { categoria: item.__categoryLabel, valor: 0 }
    data.valor += item.__valor
    map.set(item.__categoryLabel, data)
  })
  return Array.from(map.values())
    .map(entry => ({ ...entry, perc: total ? entry.valor / total : 0 }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5)
})

const highestExpenses = computed(() => enrichedExpenses.value
  .filter(item => item.__valor > 0)
  .sort((a, b) => b.__valor - a.__valor)
  .slice(0, 5)
)

const monthlyTrend = computed(() => {
  const map = new Map()
  enrichedExpenses.value.forEach(item => {
    if (!item.__monthKey) return
    const current = map.get(item.__monthKey) || { key: item.__monthKey, valor: 0, count: 0 }
    current.valor += item.__valor
    current.count += 1
    map.set(item.__monthKey, current)
  })
  return Array.from(map.values())
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(-6)
    .map(entry => ({ ...entry, label: fmtMonthLabel(entry.key) }))
})

const monthlyAverage = computed(() => {
  if (!monthlyTrend.value.length) return 0
  const total = monthlyTrend.value.reduce((sum, item) => sum + item.valor, 0)
  return total / monthlyTrend.value.length
})

const monthlySummaryLabel = computed(() => {
  if (!monthlyTrend.value.length) return 'Sem histórico mensal'
  return `Últimos ${monthlyTrend.value.length} meses`
})

function statusClass(item) {
  if (item.pago) return 'status-paid'
  if (item.__status === 'overdue') return 'status-overdue'
  if (item.__status === 'today') return 'status-today'
  if (item.__status === 'soon') return 'status-soon'
  return 'status-open'
}

function statusLabel(item) {
  if (item.pago) return 'Pago'
  if (item.__status === 'overdue') return 'Em atraso'
  if (item.__status === 'today') return 'Vence hoje'
  if (item.__status === 'soon') return 'Em breve'
  return 'Em aberto'
}

function rowClass(item) {
  if (item.pago) return 'row-paid'
  if (item.__status === 'overdue') return 'row-overdue'
  if (item.__status === 'today') return 'row-today'
  return ''
}

function resetForm() {
  form.descricao = ''
  form.categoria = ''
  form.valor = 0
  form.data = new Date().toISOString().slice(0, 10)
  form.pago = false
  editId.value = null
  errorMsg.value = ''
  successMsg.value = ''
}

function openNew() {
  resetForm()
  showModal.value = true
}

function openEdit(item) {
  editId.value = item.id
  form.descricao = item.descricao || ''
  form.categoria = item.categoria || ''
  form.valor = Number(item.valor || item.__valor || 0)
  form.data = item.data || item.__dateISO || new Date().toISOString().slice(0, 10)
  form.pago = !!item.pago
  errorMsg.value = ''
  successMsg.value = ''
  showModal.value = true
}

function close() {
  showModal.value = false
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    expenses.value = await listExpenses()
  } catch (error) {
    loadError.value = error?.message || 'Erro ao carregar despesas'
  } finally {
    loading.value = false
  }
}

async function save() {
  errorMsg.value = ''
  successMsg.value = ''

  if (!form.descricao) {
    errorMsg.value = 'Descrição é obrigatória.'
    return
  }

  const payload = {
    descricao: form.descricao,
    categoria: form.categoria,
    valor: Number(form.valor || 0),
    data: form.data,
    pago: !!form.pago
  }

  try {
    if (editId.value) await updateExpense(editId.value, payload)
    else await createExpense(payload)

    successMsg.value = 'Despesa salva com sucesso.'
    close()
    resetForm()
    await load()
  } catch (error) {
    errorMsg.value = error?.message || 'Erro ao salvar despesa.'
  }
}

async function togglePaid(item) {
  try {
    if (!item?.id) return
    await updateExpense(item.id, { pago: !item.pago })
    await load()
  } catch (error) {
    errorMsg.value = error?.message || 'Erro ao atualizar status.'
  }
}

async function onDelete(item) {
  if (!item?.id) return
  if (!confirm(`Confirma excluir a despesa "${item.descricao}"?`)) return
  try {
    await deleteExpense(item.id)
    await load()
  } catch (error) {
    errorMsg.value = error?.message || 'Erro ao excluir despesa.'
  }
}

function clearFilters() {
  searchTerm.value = ''
  statusFilter.value = 'all'
  categoryFilter.value = 'all'
  dateStart.value = ''
  dateEnd.value = ''
}

onMounted(async () => {
  await load()
})
</script>

<style scoped>
.expenses-view {
  display: flex;
  flex-direction: column;
  gap: 1.7rem;
}

.expenses-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
  padding: 1.75rem;
  border-radius: 18px;
  background: linear-gradient(135deg, #0f172a 0%, #2563eb 100%);
  color: #fff;
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.28);
}

.header-top {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex: 1 1 440px;
}

@media (max-width: 820px) {
  .header-top {
    flex-direction: column;
    align-items: flex-start;
  }
}

.header-copy {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  flex: 1 1 320px;
}

.header-copy h2 {
  margin: 0;
  font-size: 1.9rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.01em;
}

.header-copy p {
  margin: 0;
  color: rgba(255, 255, 255, 0.86);
  max-width: 520px;
  line-height: 1.5;
}

.header-summary {
  width: 60%;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
}

.summary-card {
  padding: 1rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.14);
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.summary-card.warning {
  background: rgba(248, 113, 113, 0.32);
}

.summary-card.warning.critical {
  background: rgba(239, 68, 68, 0.42);
}

.summary-card.positive {
  background: rgba(34, 197, 94, 0.34);
}

.summary-card.highlight {
  background: rgba(56, 189, 248, 0.3);
}

.summary-card.neutral {
  background: rgba(148, 163, 184, 0.32);
}

.summary-label {
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.85;
}

.summary-value {
  font-size: 1.4rem;
  font-weight: 700;
}

.summary-note {
  font-size: 0.85rem;
  opacity: 0.85;
}

.header-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: flex-start;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border-radius: 999px;
  border: none;
  padding: 0.55rem 1.2rem;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.btn i {
  font-size: 0.9rem;
}

.btn-success {
  background: linear-gradient(135deg, #16a34a, #22c55e);
  color: #fff;
  box-shadow: 0 12px 22px rgba(22, 163, 74, 0.25);
}

.btn-success:hover {
  transform: translateY(-1px);
}

.btn-primary {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #fff;
  box-shadow: 0 12px 22px rgba(37, 99, 235, 0.22);
}

.btn-primary:hover {
  transform: translateY(-1px);
}

.btn-ghost {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.35);
}

.btn-ghost:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.28);
}

.filters-card {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  padding: 1.25rem;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.12);
  align-items: end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.filter-group label {
  font-size: 0.84rem;
  font-weight: 600;
  color: #475569;
}

.form-control {
  border-radius: 10px;
  padding: 0.55rem 0.75rem;
  border: 1px solid #d7dde5;
  background: #f8f9fc;
  color: #1f2937;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-control:focus-visible {
  outline: 2px solid rgba(37, 99, 235, 0.35);
}

.range-inputs {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.range-inputs span {
  font-size: 0.82rem;
  color: #6b7280;
}

.expenses-content {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 1.5rem;
  align-items: start;
}

.table-card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.12);
  overflow: hidden;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding: 1.2rem 1.5rem;
  border-bottom: 1px solid #eef2f7;
}

.table-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #1f2937;
}

.table-caption {
  font-size: 0.9rem;
  color: #6b7280;
}

.table-responsive {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table thead th {
  text-align: left;
  font-size: 0.85rem;
  color: #6b7280;
  padding: 0.95rem 1.5rem;
  border-bottom: 1px solid #eef2f7;
  background: #fbfcff;
}

.data-table tbody td {
  padding: 0.95rem 1.5rem;
  border-bottom: 1px solid #f1f5f9;
  font-size: 0.92rem;
  color: #1f2937;
}

.data-table tbody tr:last-child td {
  border-bottom: none;
}

.text-end {
  text-align: right;
}

.description-cell {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.description-note {
  font-size: 0.8rem;
  color: #64748b;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-open {
  background: rgba(37, 99, 235, 0.12);
  color: #2563eb;
}

.status-soon {
  background: rgba(251, 191, 36, 0.18);
  color: #b45309;
}

.status-today {
  background: rgba(129, 140, 248, 0.2);
  color: #4338ca;
}

.status-overdue {
  background: rgba(248, 113, 113, 0.2);
  color: #b91c1c;
}

.status-paid {
  background: rgba(34, 197, 94, 0.18);
  color: #15803d;
}

.actions-col {
  display: flex;
  gap: 0.45rem;
  justify-content: flex-end;
}

.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.1rem;
  height: 2.1rem;
  border-radius: 10px;
  border: none;
  color: #fff;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.btn-icon:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 20px rgba(15, 23, 42, 0.16);
}

.btn-icon.btn-success {
  background: linear-gradient(135deg, #16a34a, #22c55e);
}

.btn-icon.btn-warning {
  background: linear-gradient(135deg, #f97316, #fb923c);
}

.btn-icon.btn-danger {
  background: linear-gradient(135deg, #ef4444, #f87171);
}

.row-overdue {
  background: rgba(248, 113, 113, 0.08);
}

.row-today {
  background: rgba(129, 140, 248, 0.12);
}

.row-paid {
  background: rgba(134, 239, 172, 0.14);
}

.empty-row {
  text-align: center;
  padding: 2rem 1.5rem;
  color: #64748b;
  font-size: 0.95rem;
}

.insights-card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.12);
  padding: 1.35rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
}

.insights-section h4 {
  margin: 0 0 0.75rem;
  font-size: 1rem;
  color: #1f2937;
}

.insights-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.insights-list.compact {
  gap: 0.55rem;
}

.insights-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 12px;
  background: #f8fafc;
}

.item-title {
  font-weight: 600;
  color: #111827;
}

.item-sub {
  font-size: 0.8rem;
  color: #6b7280;
}

.item-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
  font-size: 0.85rem;
}

.item-value {
  font-weight: 700;
  color: #0f172a;
}

.item-value.neg {
  color: #b91c1c;
}

.item-note {
  font-size: 0.78rem;
  color: #94a3b8;
}

.empty-note {
  margin: 0;
  font-size: 0.85rem;
  color: #94a3b8;
}

.modal {
  position: fixed;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.45);
  padding: 1.5rem;
  z-index: 1000;
}

.modal.show {
  display: flex;
}

.modal-dialog {
  width: min(560px, 100%);
}

.modal-content {
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 24px 40px rgba(15, 23, 42, 0.24);
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.2rem 1.5rem;
  border-bottom: 1px solid #eef2f7;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.08rem;
}

.btn-close {
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 1.1rem;
  cursor: pointer;
}

.modal-body {
  padding: 1.4rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
}

.form-group-large {
  grid-column: span 2;
}

.form-error {
  margin: 0;
  font-size: 0.85rem;
  color: #b91c1c;
  font-weight: 600;
}

.form-success {
  margin: 0;
  font-size: 0.85rem;
  color: #16a34a;
  font-weight: 600;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #eef2f7;
}

.btn-secondary {
  background: #e2e8f0;
  color: #1f2937;
}

.btn[disabled],
.btn-icon[disabled] {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 1080px) {
  .expenses-content {
    grid-template-columns: 1fr;
  }

  .insights-card {
    order: -1;
  }
}

@media (max-width: 780px) {
  .expenses-header {
    padding: 1.4rem;
  }

  .table-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .data-table thead {
    display: none;
  }

  .data-table tbody tr {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem 0.5rem;
    padding: 1rem 1.2rem;
  }

  .data-table tbody td {
    border: none;
    padding: 0;
  }

  .data-table tbody td[data-label]::before {
    content: attr(data-label);
    display: block;
    font-size: 0.75rem;
    text-transform: uppercase;
    color: #94a3b8;
    margin-bottom: 0.25rem;
  }

  .actions-col {
    justify-content: flex-start;
  }
}

@media (max-width: 520px) {
  .range-inputs {
    flex-direction: column;
    align-items: stretch;
  }

  .range-inputs span {
    display: none;
  }
}
</style>
