<template>
  <section class="content-area payable-view">
    <header class="page-header payable-header">
      <div class="header-copy">
        <h2>Contas a Pagar</h2>
        <p>Planeje desembolsos, antecipe atrasos e mantenha o caixa em segurança.</p>
        <div class="header-summary">
          <div class="summary-card neutral">
            <span class="summary-label">Em aberto</span>
            <strong class="summary-value">{{ fmtBRL(totalOpen) }}</strong>
            <span class="summary-note">{{ openCount }} conta(s)</span>
          </div>
          <div class="summary-card info" :class="{ attention: upcomingAmount > 0 }">
            <span class="summary-label">Próx. 7 dias</span>
            <strong class="summary-value">{{ fmtBRL(upcomingAmount) }}</strong>
            <span class="summary-note">{{ upcomingCount }} a vencer</span>
          </div>
          <div class="summary-card warning" :class="{ critical: overdueAmount > 0 }">
            <span class="summary-label">Em atraso</span>
            <strong class="summary-value">{{ fmtBRL(overdueAmount) }}</strong>
            <span class="summary-note">{{ overdueCount }} pendente(s)</span>
          </div>
          <div class="summary-card positive">
            <span class="summary-label">Pagas no mês</span>
            <strong class="summary-value">{{ fmtBRL(totalPaidMonth) }}</strong>
            <span class="summary-note">{{ paidCount }} quitada(s)</span>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <button class="btn btn-success" type="button" @click="openNew">
          <i class="fa-solid fa-plus"></i>
          <span>Nova conta</span>
        </button>
        <button class="btn btn-ghost" type="button" @click="load">
          <i class="fa-solid fa-rotate"></i>
          <span>Atualizar</span>
        </button>
      </div>
    </header>

    <div class="status-chip-row">
      <button
        v-for="chip in chips"
        :key="chip.key"
        type="button"
        class="status-chip"
        :class="{ active: statusFilter === chip.key }"
        @click="statusFilter = chip.key"
      >
        <span>{{ chip.label }}</span>
        <span class="chip-count">{{ counts[chip.key] || 0 }}</span>
      </button>
    </div>

    <div class="filters-card">
      <div class="filter-group">
        <label for="search">Buscar</label>
        <input
          id="search"
          type="search"
          class="form-control"
          placeholder="Descrição, categoria ou fornecedor"
          v-model.trim="searchTerm"
        />
      </div>
      <div class="filter-group">
        <label for="category">Categoria</label>
        <select id="category" class="form-control" v-model="categoryFilter">
          <option value="all">Todas</option>
          <option v-for="option in categoryOptions" :key="option" :value="option">{{ option }}</option>
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
        <button class="btn btn-primary" type="button" @click="clearFilters" :disabled="!hasActiveFilters">
          Limpar filtros
        </button>
      </div>
    </div>

    <BaseError v-if="loadError" :message="loadError" :retry="load" />
    <BaseLoading v-else-if="loading" message="Carregando contas…" />
    <div v-else class="payable-content">
      <div class="table-card">
        <div class="table-header">
          <h3>Planilha de Contas a Pagar</h3>
          <span class="table-caption">
            {{ filteredExpenses.length }} registro(s)
            <span v-if="hasActiveFilters" class="filters-badge">
              <i class="fa-solid fa-filter"></i>
              Filtros ativos
            </span>
          </span>
        </div>
        <div class="table-responsive">
          <table class="data-table payable-table">
            <thead>
              <tr>
                <th>
                  <button type="button" class="sort-button" @click="toggleSort('descricao')">
                    <span>Descrição</span>
                    <i class="fa-solid" :class="sortIcon('descricao')"></i>
                  </button>
                </th>
                <th>
                  <button type="button" class="sort-button" @click="toggleSort('categoria')">
                    <span>Categoria</span>
                    <i class="fa-solid" :class="sortIcon('categoria')"></i>
                  </button>
                </th>
                <th class="text-end">
                  <button type="button" class="sort-button" @click="toggleSort('valor')">
                    <span>Valor</span>
                    <i class="fa-solid" :class="sortIcon('valor')"></i>
                  </button>
                </th>
                <th>
                  <button type="button" class="sort-button" @click="toggleSort('vencimento')">
                    <span>Vencimento</span>
                    <i class="fa-solid" :class="sortIcon('vencimento')"></i>
                  </button>
                </th>
                <th>
                  <button type="button" class="sort-button" @click="toggleSort('status')">
                    <span>Status</span>
                    <i class="fa-solid" :class="sortIcon('status')"></i>
                  </button>
                </th>
                <th class="actions-col">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!filteredExpenses.length">
                <td colspan="6" class="empty-row">
                  {{ hasActiveFilters ? 'Nenhuma conta encontrada para os filtros atuais.' : 'Cadastre suas primeiras contas a pagar.' }}
                </td>
              </tr>
              <tr
                v-for="item in filteredExpenses"
                :key="item.id || item.__dateISO || item.descricao"
                :class="rowClass(item)"
              >
                <td data-label="Descrição">
                  <div class="description-cell">
                    <strong>{{ item.descricao || 'Conta sem descrição' }}</strong>
                    <span v-if="item.observacao" class="description-note">{{ item.observacao }}</span>
                  </div>
                </td>
                <td data-label="Categoria">{{ item.categoria || 'Sem categoria' }}</td>
                <td data-label="Valor" class="text-end">{{ fmtBRL(item.__valor) }}</td>
                <td data-label="Vencimento">{{ fmtDate(item.__date) }}</td>
                <td data-label="Status">
                  <span class="status-pill" :class="statusClass(item)">{{ statusLabel(item) }}</span>
                </td>
                <td class="actions-col" data-label="Ações">
                  <button
                    class="btn-icon btn-success"
                    :title="item.pago ? 'Reabrir conta' : 'Marcar como paga'"
                    @click="togglePaid(item)"
                    :disabled="isRowBusy(item.id)"
                  >
                    <i class="fa-solid" :class="togglingId === item.id ? 'fa-spinner fa-spin' : item.pago ? 'fa-rotate-left' : 'fa-check'"></i>
                  </button>
                  <button
                    class="btn-icon btn-warning"
                    title="Editar"
                    @click="openEdit(item)"
                    :disabled="isRowBusy(item.id)"
                  >
                    <i class="fa-solid fa-pen"></i>
                  </button>
                  <button
                    class="btn-icon btn-danger"
                    title="Excluir"
                    @click="onDelete(item)"
                    :disabled="isRowBusy(item.id)"
                  >
                    <i class="fa-solid" :class="deletingId === item.id ? 'fa-spinner fa-spin' : 'fa-trash'"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <aside class="insights-card">
        <div class="insights-section">
          <h4>Próximos pagamentos</h4>
          <ul v-if="upcomingList.length" class="insights-list">
            <li v-for="item in upcomingList" :key="`soon-${item.id || item.__dateISO}`">
              <div>
                <span class="item-title">{{ item.descricao || 'Sem descrição' }}</span>
                <span class="item-sub">{{ item.categoria || 'Sem categoria' }}</span>
              </div>
              <div class="item-meta">
                <span class="item-value neg">{{ fmtBRL(item.__valor) }}</span>
                <span class="item-date">{{ fmtDate(item.__date) }}</span>
              </div>
            </li>
          </ul>
          <p v-else class="empty-note">Nenhum débito previsto para os próximos dias.</p>
        </div>

        <div class="insights-section">
          <h4>Em atraso</h4>
          <ul v-if="overdueList.length" class="insights-list overdue">
            <li v-for="item in overdueList" :key="`late-${item.id || item.__dateISO}`">
              <div>
                <span class="item-title">{{ item.descricao || 'Sem descrição' }}</span>
                <span class="item-sub">{{ fmtDate(item.__date) }}</span>
              </div>
              <div class="item-meta">
                <span class="item-value neg">{{ fmtBRL(item.__valor) }}</span>
              </div>
            </li>
          </ul>
          <p v-else class="empty-note">Nenhuma conta vencida por aqui. Ótimo trabalho!</p>
        </div>

        <div class="insights-section">
          <h4>Categorias relevantes</h4>
          <ul v-if="categoryHighlights.length" class="insights-list compact">
            <li v-for="item in categoryHighlights" :key="`cat-${item.categoria}`">
              <div>
                <span class="item-title">{{ item.categoria }}</span>
                <span class="item-sub">{{ item.count }} lançamento(s)</span>
              </div>
              <div class="item-meta">
                <span class="item-value neg">{{ fmtBRL(item.valor) }}</span>
                <span class="item-note">{{ fmtPercent(item.perc) }}</span>
              </div>
            </li>
          </ul>
          <p v-else class="empty-note">Cadastre despesas para visualizar tendências por categoria.</p>
        </div>
      </aside>
    </div>

    <div class="modal" role="dialog" aria-hidden="true" :class="{ show: showModal }" @click.self="close">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h3>{{ editId ? 'Editar conta' : 'Nova conta' }}</h3>
            <button type="button" class="btn-close" @click="close" aria-label="Fechar">
              <i class="fa-solid fa-times"></i>
            </button>
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
                  <input id="categoria" class="form-control" v-model.trim="form.categoria" placeholder="Ex: Fornecedor, Imposto" />
                </div>
                <div class="form-group">
                  <label for="valor">Valor (R$)</label>
                  <input id="valor" type="number" min="0" step="0.01" class="form-control" v-model.number="form.valor" />
                </div>
                <div class="form-group">
                  <label for="data">Vencimento</label>
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
              <button type="submit" class="btn btn-success" :disabled="savingEntry">
                <span v-if="savingEntry"><i class="fa-solid fa-spinner fa-spin"></i> Salvando…</span>
                <span v-else>Salvar</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
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
const sortState = reactive({ column: 'vencimento', direction: 'asc' })
const errorMsg = ref('')
const successMsg = ref('')
const togglingId = ref(null)
const deletingId = ref(null)
const savingEntry = ref(false)

const form = reactive({
  descricao: '',
  categoria: '',
  valor: 0,
  data: new Date().toISOString().slice(0, 10),
  pago: false
})

const chips = [
  { key: 'all', label: 'Todas' },
  { key: 'open', label: 'Em aberto' },
  { key: 'soon', label: 'Próx. 7 dias' },
  { key: 'overdue', label: 'Atrasadas' },
  { key: 'paid', label: 'Pagas' }
]

const SORTABLE_COLUMNS = ['descricao', 'categoria', 'valor', 'vencimento', 'status']

function startOfDay(source) {
  if (!source) return null
  const date = new Date(source)
  if (Number.isNaN(date)) return null
  date.setHours(0, 0, 0, 0)
  return date
}

function fmtBRL(value) {
  return (Number(value) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(value) {
  if (!value) return 'Sem data'
  const date = new Date(value)
  if (Number.isNaN(date)) return 'Sem data'
  return date.toLocaleDateString('pt-BR')
}

function fmtPercent(value) {
  if (!Number.isFinite(value)) return '0%'
  return `${(value * 100).toFixed(1)}%`
}

const enrichedExpenses = computed(() => {
  const today = startOfDay(new Date())
  return expenses.value.map(expense => {
    const valor = Number(expense.valor || expense.amount || 0)
    const dueDate = expense.data ? startOfDay(expense.data) : null
    let status = 'open'
    if (expense.pago) {
      status = 'paid'
    } else if (dueDate) {
      const diff = Math.ceil((dueDate - today) / 86400000)
      if (diff < 0) status = 'overdue'
      else if (diff === 0) status = 'today'
      else if (diff <= 7) status = 'soon'
    }
    return {
      ...expense,
      __valor: valor,
      __date: dueDate,
      __dateISO: dueDate ? dueDate.toISOString().slice(0, 10) : '',
      __status: status
    }
  })
})

const categoryOptions = computed(() => {
  const set = new Set()
  let hasUncategorized = false
  enrichedExpenses.value.forEach(item => {
    if (item.categoria) set.add(item.categoria)
    else hasUncategorized = true
  })
  const options = Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
  if (hasUncategorized) options.push('Sem categoria')
  return options
})

const counts = computed(() => {
  const base = { all: enrichedExpenses.value.length, open: 0, soon: 0, overdue: 0, paid: 0 }
  enrichedExpenses.value.forEach(item => {
    switch (item.__status) {
      case 'paid':
        base.paid += 1
        break
      case 'overdue':
        base.overdue += 1
        break
      case 'soon':
      case 'today':
        base.soon += 1
        break
      default:
        base.open += 1
    }
  })
  return base
})

const filteredExpenses = computed(() => {
  const term = searchTerm.value.trim().toLowerCase()
  const start = dateStart.value ? startOfDay(dateStart.value) : null
  const end = dateEnd.value ? startOfDay(dateEnd.value) : null
  if (end) end.setHours(23, 59, 59, 999)

  const filtered = enrichedExpenses.value.filter(item => {
    if (term) {
      const haystack = `${item.descricao || ''} ${item.categoria || ''} ${item.fornecedor || ''} ${item.observacao || ''}`.toLowerCase()
      if (!haystack.includes(term)) return false
    }

    if (categoryFilter.value !== 'all') {
      if ((item.categoria || 'Sem categoria') !== categoryFilter.value) return false
    }

    if (start && (!item.__date || item.__date < start)) return false
    if (end && (!item.__date || item.__date > end)) return false

    if (statusFilter.value === 'paid' && !item.pago) return false
    if (statusFilter.value === 'overdue' && item.__status !== 'overdue') return false
    if (statusFilter.value === 'soon' && !(item.__status === 'soon' || item.__status === 'today')) return false
    if (statusFilter.value === 'open') {
      if (item.pago) return false
      if (['overdue', 'soon', 'today'].includes(item.__status)) return false
    }

    return true
  })

  return sortExpenses(filtered)
})

const hasActiveFilters = computed(() => {
  return Boolean(
    searchTerm.value ||
    dateStart.value ||
    dateEnd.value ||
    categoryFilter.value !== 'all' ||
    statusFilter.value !== 'all'
  )
})

function buildComparator(column) {
  switch (column) {
    case 'descricao':
      return (a, b) => (a.descricao || '').localeCompare(b.descricao || '', 'pt-BR', { sensitivity: 'base' })
    case 'categoria':
      return (a, b) => (a.categoria || '').localeCompare(b.categoria || '', 'pt-BR', { sensitivity: 'base' })
    case 'valor':
      return (a, b) => (a.__valor || 0) - (b.__valor || 0)
    case 'status':
      return (a, b) => statusLabel(a).localeCompare(statusLabel(b), 'pt-BR', { sensitivity: 'base' })
    case 'vencimento':
    default:
      return (a, b) => {
        if (a.__date && b.__date) return a.__date - b.__date
        if (a.__date) return -1
        if (b.__date) return 1
        return (a.descricao || '').localeCompare(b.descricao || '', 'pt-BR', { sensitivity: 'base' })
      }
  }
}

function sortExpenses(list) {
  const column = SORTABLE_COLUMNS.includes(sortState.column) ? sortState.column : 'vencimento'
  const direction = sortState.direction === 'desc' ? -1 : 1
  const compare = buildComparator(column)
  return [...list].sort((a, b) => compare(a, b) * direction)
}

function toggleSort(column) {
  if (!SORTABLE_COLUMNS.includes(column)) return
  if (sortState.column === column) {
    sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc'
  } else {
    sortState.column = column
    sortState.direction = 'asc'
  }
}

function sortIcon(column) {
  if (sortState.column !== column) return 'fa-sort'
  return sortState.direction === 'asc' ? 'fa-sort-up' : 'fa-sort-down'
}

const openItems = computed(() => enrichedExpenses.value.filter(item => !item.pago))
const paidItems = computed(() => enrichedExpenses.value.filter(item => !!item.pago))

const totalOpen = computed(() => openItems.value.reduce((sum, item) => sum + item.__valor, 0))
const totalPaidMonth = computed(() => {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()
  return paidItems.value.reduce((sum, item) => {
    if (item.__date && item.__date.getMonth() === month && item.__date.getFullYear() === year) {
      return sum + item.__valor
    }
    return sum
  }, 0)
})
const paidCount = computed(() => paidItems.value.length)

const overdueList = computed(() =>
  openItems.value
    .filter(item => item.__status === 'overdue')
    .sort((a, b) => (a.__date || 0) - (b.__date || 0))
    .slice(0, 5)
)
const overdueAmount = computed(() => overdueList.value.reduce((sum, item) => sum + item.__valor, 0))
const overdueCount = computed(() => overdueList.value.length)

const upcomingList = computed(() =>
  openItems.value
    .filter(item => item.__status === 'soon' || item.__status === 'today')
    .sort((a, b) => (a.__date || 0) - (b.__date || 0))
    .slice(0, 5)
)
const upcomingAmount = computed(() => upcomingList.value.reduce((sum, item) => sum + item.__valor, 0))
const upcomingCount = computed(() => upcomingList.value.length)

const openCount = computed(() => openItems.value.length)

const categoryHighlights = computed(() => {
  const map = new Map()
  const total = openItems.value.reduce((sum, item) => sum + item.__valor, 0)
  openItems.value.forEach(item => {
    const key = item.categoria || 'Sem categoria'
    const current = map.get(key) || { categoria: key, valor: 0, count: 0 }
    current.valor += item.__valor
    current.count += 1
    map.set(key, current)
  })
  return Array.from(map.values())
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5)
    .map(entry => ({ ...entry, perc: total ? entry.valor / total : 0 }))
})

function statusLabel(item) {
  if (item.pago) return 'Pago'
  switch (item.__status) {
    case 'overdue':
      return 'Atrasada'
    case 'today':
      return 'Vence hoje'
    case 'soon':
      return 'Em breve'
    default:
      return 'Em aberto'
  }
}

function statusClass(item) {
  if (item.pago) return 'status-paid'
  if (item.__status === 'overdue') return 'status-overdue'
  if (item.__status === 'soon' || item.__status === 'today') return 'status-soon'
  return 'status-open'
}

function rowClass(item) {
  if (item.pago) return 'row-paid'
  if (item.__status === 'overdue') return 'row-overdue'
  if (item.__status === 'soon' || item.__status === 'today') return 'row-soon'
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
  } catch (err) {
    loadError.value = err?.message || 'Erro ao carregar contas'
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
    savingEntry.value = true
    if (editId.value) await updateExpense(editId.value, payload)
    else await createExpense(payload)

    successMsg.value = 'Conta salva com sucesso.'
    close()
    resetForm()
    await load()
  } catch (err) {
    errorMsg.value = err?.message || 'Erro ao salvar conta.'
  } finally {
    savingEntry.value = false
  }
}

async function togglePaid(item) {
  if (!item?.id || togglingId.value) return
  errorMsg.value = ''
  try {
    togglingId.value = item.id
    await updateExpense(item.id, {
      descricao: item.descricao,
      categoria: item.categoria,
      valor: Number(item.valor || item.__valor || 0),
      data: item.data || item.__dateISO,
      pago: !item.pago
    })
    await load()
  } catch (err) {
    errorMsg.value = err?.message || 'Erro ao atualizar status.'
  } finally {
    togglingId.value = null
  }
}

async function onDelete(item) {
  if (!item?.id || deletingId.value) return
  if (!confirm(`Confirma excluir a conta "${item.descricao || item.id}"?`)) return
  try {
    deletingId.value = item.id
    errorMsg.value = ''
    await deleteExpense(item.id)
    await load()
  } catch (err) {
    errorMsg.value = err?.message || 'Erro ao excluir conta.'
  } finally {
    deletingId.value = null
  }
}

function clearFilters() {
  searchTerm.value = ''
  categoryFilter.value = 'all'
  dateStart.value = ''
  dateEnd.value = ''
  statusFilter.value = 'all'
  sortState.column = 'vencimento'
  sortState.direction = 'asc'
}

function isRowBusy(id) {
  if (id == null) return false
  return togglingId.value === id || deletingId.value === id
}

onMounted(async () => {
  await load()
})

watch(dateStart, value => {
  if (!value || !dateEnd.value) return
  const start = new Date(value)
  const end = new Date(dateEnd.value)
  if (end < start) dateEnd.value = ''
})

watch(dateEnd, value => {
  if (!value || !dateStart.value) return
  const end = new Date(value)
  const start = new Date(dateStart.value)
  if (end < start) dateStart.value = ''
})
</script>

<style scoped>
.payable-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.payable-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
  padding: 1.75rem;
  border-radius: 18px;
  background: linear-gradient(135deg, #0f172a 0%, #2563eb 100%);
  color: #fff;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.28);
}

.header-copy {
  flex: 1 1 440px;
  min-width: 280px;
}

.header-copy h2 {
  margin: 0 0 0.45rem;
  font-size: 1.9rem;
  font-weight: 700;
}

.header-copy p {
  margin: 0 0 1.2rem;
  color: rgba(255, 255, 255, 0.8);
  max-width: 520px;
}

.header-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
}

.summary-card {
  padding: 1rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.18);
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.summary-card.neutral {
  background: rgba(148, 163, 184, 0.28);
}

.summary-card.info {
  background: rgba(13, 110, 253, 0.28);
}

.summary-card.warning {
  background: rgba(248, 113, 113, 0.3);
}

.summary-card.warning.critical {
  background: rgba(239, 68, 68, 0.42);
}

.summary-card.positive {
  background: rgba(34, 197, 94, 0.32);
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
  gap: 0.9rem;
  align-items: flex-start;
}

.header-actions .btn {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.6rem 1.15rem;
  border-radius: 999px;
}

.btn-ghost {
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.32);
}

.btn-ghost:hover {
  background: rgba(255, 255, 255, 0.28);
}

.status-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.9rem;
  border-radius: 999px;
  background: #f1f4f9;
  border: 1px solid transparent;
  color: #1f2937;
  font-weight: 600;
  transition: all 0.2s ease;
}

.status-chip .chip-count {
  background: rgba(13, 110, 253, 0.15);
  color: #0d6efd;
  border-radius: 999px;
  padding: 0.15rem 0.55rem;
  font-size: 0.78rem;
}

.status-chip:hover {
  background: #e4ebf7;
}

.status-chip.active {
  background: #2563eb;
  color: #fff;
}

.status-chip.active .chip-count {
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
}

.filters-card {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  padding: 1.25rem;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
  align-items: end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.filter-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #4a5568;
}

.range-inputs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.form-control {
  padding: 0.55rem 0.75rem;
  border-radius: 10px;
  border: 1px solid #d7dde5;
  background: #f8f9fc;
  color: #1f2937;
}

.form-control:focus-visible {
  outline: 2px solid rgba(37, 99, 235, 0.35);
}

.payable-content {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 1.5rem;
  align-items: start;
}

.table-card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
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
  color: #6b7280;
  font-size: 0.9rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.filters-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.12);
  color: #2563eb;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.filters-badge .fa-filter {
  font-size: 0.7rem;
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

.sort-button {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
  padding: 0;
}

.sort-button .fa-solid {
  color: #94a3b8;
  transition: transform 0.2s ease, color 0.2s ease;
}

.sort-button:hover .fa-solid {
  transform: translateY(-1px);
  color: #475569;
}

.sort-button:focus-visible {
  outline: 2px solid rgba(37, 99, 235, 0.45);
  border-radius: 4px;
}

.data-table tbody td {
  padding: 0.9rem 1.5rem;
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
  gap: 0.4rem;
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
  background: rgba(255, 193, 7, 0.18);
  color: #b08901;
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
}

.btn-success {
  background: linear-gradient(135deg, #16a34a, #22c55e);
}

.btn-warning {
  background: linear-gradient(135deg, #f97316, #fb923c);
}

.btn-danger {
  background: linear-gradient(135deg, #ef4444, #f87171);
}

.empty-row {
  text-align: center;
  padding: 2rem 1.5rem;
  color: #64748b;
  font-size: 0.95rem;
}

.row-overdue {
  background: rgba(248, 113, 113, 0.08);
}

.row-soon {
  background: rgba(125, 211, 252, 0.08);
}

.row-paid {
  background: rgba(134, 239, 172, 0.12);
}

.insights-card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
  padding: 1.4rem 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
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
  gap: 0.6rem;
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

.insights-list li.overdue {
  background: rgba(248, 113, 113, 0.12);
}

.item-title {
  font-weight: 600;
  color: #111827;
}

.item-sub {
  display: block;
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

.item-date,
.item-note {
  font-size: 0.78rem;
  color: #94a3b8;
}

.empty-note {
  margin: 0;
  color: #64748b;
  font-size: 0.85rem;
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
  width: min(540px, 100%);
}

.modal-content {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 24px 40px rgba(15, 23, 42, 0.22);
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
  font-size: 1.1rem;
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
  color: #b91c1c;
  font-weight: 600;
}

.form-success {
  margin: 0;
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
  .payable-content {
    grid-template-columns: 1fr;
  }

  .insights-card {
    order: -1;
  }
}

@media (max-width: 780px) {
  .payable-header {
    padding: 1.4rem;
  }

  .header-summary {
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  }

  .table-header {
    flex-direction: column;
    align-items: flex-start;
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
    padding: 0;
    border: none;
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
</style>
