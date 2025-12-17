<template>
  <section class="content-area receivable-view">
    <header class="page-header receivable-header">
      <div class="header-copy">
        <h2>Contas a Receber</h2>
        <p>Acompanhe títulos em aberto, vencimentos críticos e performance de recebimentos.</p>
        <div class="header-summary">
          <div class="summary-card positive">
            <span class="summary-label">Total pago</span>
            <strong class="summary-value">{{ fmtBRL(totalPaid) }}</strong>
          </div>
          <div class="summary-card neutral">
            <span class="summary-label">Em aberto</span>
            <strong class="summary-value">{{ fmtBRL(totalOpen) }}</strong>
            <span class="summary-note">{{ openCount }} título(s)</span>
          </div>
          <div class="summary-card warning" :class="{ critical: overdueAmount > 0 }">
            <span class="summary-label">Em atraso</span>
            <strong class="summary-value">{{ fmtBRL(overdueAmount) }}</strong>
            <span class="summary-note">{{ overdueCount }} vencido(s)</span>
          </div>
          <div class="summary-card info" :class="{ attention: upcomingAmount > 0 }">
            <span class="summary-label">Próx. 7 dias</span>
            <strong class="summary-value">{{ fmtBRL(upcomingAmount) }}</strong>
            <span class="summary-note">{{ upcomingCount }} previsto(s)</span>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <button class="btn btn-success" type="button" @click="openNew">
          <i class="fa-solid fa-plus"></i>
          <span>Novo título</span>
        </button>
        <button class="btn btn-ghost" type="button" @click="load">
          <i class="fa-solid fa-rotate"></i>
          <span>Atualizar</span>
        </button>
      </div>
    </header>

    <div class="status-chip-row">
      <button
        v-for="chip in statusChips"
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
          placeholder="Cliente, descrição ou ID"
          v-model.trim="searchTerm"
        />
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
    <BaseLoading v-else-if="loading" message="Carregando títulos…" />
    <div v-else class="receivable-content">
      <div class="table-card">
        <div class="table-header">
          <h3>Planilha de Contas a Receber</h3>
          <span class="table-caption">
            {{ filteredReceivables.length }} registro(s)
            <span v-if="hasActiveFilters" class="filters-badge"><i class="fa-solid fa-filter"></i> Filtros ativos</span>
          </span>
        </div>
        <div class="table-responsive">
          <table class="data-table receivable-table">
            <thead>
              <tr>
                <th>
                  <button type="button" class="sort-button" @click="toggleSort('id')">
                    <span>ID</span>
                    <i class="fa-solid" :class="sortIcon('id')"></i>
                  </button>
                </th>
                <th>
                  <button type="button" class="sort-button" @click="toggleSort('cliente')">
                    <span>Cliente</span>
                    <i class="fa-solid" :class="sortIcon('cliente')"></i>
                  </button>
                </th>
                <th>
                  <button type="button" class="sort-button" @click="toggleSort('descricao')">
                    <span>Descrição</span>
                    <i class="fa-solid" :class="sortIcon('descricao')"></i>
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
              <tr v-if="!filteredReceivables.length">
                <td colspan="7" class="empty-row">
                  {{ hasActiveFilters ? 'Nenhum título encontrado com os filtros atuais.' : 'Cadastre seus primeiros títulos para acompanhar recebimentos.' }}
                </td>
              </tr>
              <tr
                v-for="item in filteredReceivables"
                :key="item.id || item.__dateISO || item.descricao"
                :class="rowClass(item)"
              >
                <td data-label="ID">#{{ item.id || '—' }}</td>
                <td data-label="Cliente">
                  <div class="description-cell">
                    <strong>{{ item.cliente || item.nomeCliente || 'Cliente não informado' }}</strong>
                    <span v-if="item.titulo" class="description-note">{{ item.titulo }}</span>
                  </div>
                </td>
                <td data-label="Descrição">{{ item.descricao || 'Recebimento sem descrição' }}</td>
                <td data-label="Valor" class="text-end">{{ fmtBRL(item.__valor) }}</td>
                <td data-label="Vencimento">{{ fmtDate(item.__date) }}</td>
                <td data-label="Status">
                  <span class="status-pill" :class="statusClass(item)">{{ statusLabel(item) }}</span>
                </td>
                <td class="actions-col" data-label="Ações">
                  <button
                    class="btn-icon btn-success"
                    :title="item.pago ? 'Reabrir título' : 'Marcar como pago'"
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
          <h4>Próximos vencimentos</h4>
          <ul v-if="upcomingList.length" class="insights-list">
            <li v-for="item in upcomingList" :key="`up-${item.id || item.__dateISO}`">
              <div>
                <span class="item-title">{{ item.descricao || 'Sem descrição' }}</span>
                <span class="item-sub">{{ item.cliente || 'Cliente não informado' }}</span>
              </div>
              <div class="item-meta">
                <span class="item-value">{{ fmtBRL(item.__valor) }}</span>
                <span class="item-date">{{ fmtDate(item.__date) }}</span>
              </div>
            </li>
          </ul>
          <p v-else class="empty-note">Nenhum recebimento previsto para os próximos dias.</p>
        </div>

        <div class="insights-section">
          <h4>Em atraso</h4>
          <ul v-if="overdueList.length" class="insights-list overdue">
            <li v-for="item in overdueList" :key="`od-${item.id || item.__dateISO}`">
              <div>
                <span class="item-title">{{ item.descricao || 'Sem descrição' }}</span>
                <span class="item-sub">{{ item.cliente || 'Cliente não informado' }}</span>
              </div>
              <div class="item-meta">
                <span class="item-value neg">{{ fmtBRL(item.__valor) }}</span>
                <span class="item-date">{{ fmtDate(item.__date) }}</span>
              </div>
            </li>
          </ul>
          <p v-else class="empty-note">Nenhum título em atraso. Excelente!</p>
        </div>

        <div class="insights-section">
          <h4>Clientes em destaque</h4>
          <ul v-if="clientHighlights.length" class="insights-list compact">
            <li v-for="cliente in clientHighlights" :key="`client-${cliente.nome}`">
              <div>
                <span class="item-title">{{ cliente.nome }}</span>
                <span class="item-sub">{{ cliente.count }} título(s)</span>
              </div>
              <div class="item-meta">
                <span class="item-value">{{ fmtBRL(cliente.valor) }}</span>
              </div>
            </li>
          </ul>
          <p v-else class="empty-note">Cadastre recebíveis para acompanhar os principais clientes.</p>
        </div>
      </aside>
    </div>

    <div class="modal" role="dialog" aria-hidden="true" :class="{ show: showModal }" @click.self="close">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h3>{{ editId ? 'Editar título' : 'Novo título' }}</h3>
            <button type="button" class="btn-close" @click="close" aria-label="Fechar"><i class="fa-solid fa-times"></i></button>
          </div>
          <form @submit.prevent="save">
            <div class="modal-body">
              <div class="form-grid">
                <div class="form-group form-group-large">
                  <label for="cliente">Cliente</label>
                  <input id="cliente" class="form-control" v-model.trim="form.cliente" />
                </div>
                <div class="form-group form-group-large">
                  <label for="descricao">Descrição</label>
                  <input id="descricao" class="form-control" v-model.trim="form.descricao" required />
                </div>
                <div class="form-group">
                  <label for="valor">Valor (R$)</label>
                  <input id="valor" type="number" step="0.01" min="0" class="form-control" v-model.number="form.valor" />
                </div>
                <div class="form-group">
                  <label for="vencimento">Vencimento</label>
                  <input id="vencimento" type="date" class="form-control" v-model="form.vencimento" />
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
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseError from '@/components/ui/BaseError.vue'
import { listReceivables, createReceivable, updateReceivable, deleteReceivable } from '@/services/receivables'

const receivables = ref([])
const loading = ref(false)
const loadError = ref('')
const showModal = ref(false)
const editId = ref(null)
const searchTerm = ref('')
const statusFilter = ref('all')
const dateStart = ref('')
const dateEnd = ref('')
const sortState = reactive({ column: 'vencimento', direction: 'asc' })
const errorMsg = ref('')
const successMsg = ref('')
const togglingId = ref(null)
const deletingId = ref(null)
const savingEntry = ref(false)

const form = reactive({ cliente: '', descricao: '', valor: 0, vencimento: new Date().toISOString().slice(0, 10), pago: false })

const statusChips = [
  { key: 'all', label: 'Todos' },
  { key: 'open', label: 'Em aberto' },
  { key: 'soon', label: 'Próx. 7 dias' },
  { key: 'overdue', label: 'Em atraso' },
  { key: 'paid', label: 'Pagos' }
]

const SORTABLE_COLUMNS = ['id', 'cliente', 'descricao', 'valor', 'vencimento', 'status']

function today() {
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  return base
}

function startOfDay(value) {
  if (!value) return null
  const dt = new Date(value)
  if (Number.isNaN(dt)) return null
  dt.setHours(0, 0, 0, 0)
  return dt
}

function fmtBRL(value) {
  return (Number(value) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(value) {
  if (!value) return 'Sem data'
  const dt = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(dt)) return 'Sem data'
  return dt.toLocaleDateString('pt-BR')
}

const enrichedReceivables = computed(() => {
  const todayDate = today()
  return receivables.value.map(item => {
    const valor = Number(item.valor || 0)
    const rawDate = item.vencimento || item.data || ''
    const dueDate = startOfDay(rawDate)
    let status = 'open'
    if (item.pago) status = 'paid'
    else if (dueDate) {
      const diff = Math.ceil((dueDate - todayDate) / 86400000)
      if (diff < 0) status = 'overdue'
      else if (diff === 0) status = 'today'
      else if (diff <= 7) status = 'soon'
    }
    return {
      ...item,
      __valor: valor,
      __date: dueDate,
      __dateISO: dueDate ? dueDate.toISOString().slice(0, 10) : '',
      __status: status
    }
  })
})

const counts = computed(() => {
  const base = { all: enrichedReceivables.value.length, open: 0, soon: 0, overdue: 0, paid: 0 }
  enrichedReceivables.value.forEach(item => {
    if (item.__status === 'paid') base.paid += 1
    else if (item.__status === 'overdue') base.overdue += 1
    else if (item.__status === 'soon' || item.__status === 'today') base.soon += 1
    else base.open += 1
  })
  return base
})

const filteredReceivables = computed(() => {
  const term = searchTerm.value.trim().toLowerCase()
  const start = dateStart.value ? startOfDay(dateStart.value) : null
  const end = dateEnd.value ? startOfDay(dateEnd.value) : null
  if (end) end.setHours(23, 59, 59, 999)

  const result = enrichedReceivables.value.filter(item => {
    if (term) {
      const haystack = `${item.id || ''} ${item.cliente || ''} ${item.nomeCliente || ''} ${item.descricao || ''}`.toLowerCase()
      if (!haystack.includes(term)) return false
    }

    if (start && (!item.__date || item.__date < start)) return false
    if (end && (!item.__date || item.__date > end)) return false

    if (statusFilter.value === 'open' && item.__status !== 'open') return false
    if (statusFilter.value === 'soon' && !(item.__status === 'soon' || item.__status === 'today')) return false
    if (statusFilter.value === 'overdue' && item.__status !== 'overdue') return false
    if (statusFilter.value === 'paid' && item.__status !== 'paid') return false

    return true
  })

  return sortReceivables(result)
})

const hasActiveFilters = computed(() => Boolean(searchTerm.value || (statusFilter.value && statusFilter.value !== 'all') || dateStart.value || dateEnd.value))

const openItems = computed(() => enrichedReceivables.value.filter(item => item.__status !== 'paid'))
const paidItems = computed(() => enrichedReceivables.value.filter(item => item.__status === 'paid'))

const totalOpen = computed(() => openItems.value.reduce((sum, item) => sum + item.__valor, 0))
const totalPaid = computed(() => paidItems.value.reduce((sum, item) => sum + item.__valor, 0))

const overdueList = computed(() => openItems.value.filter(item => item.__status === 'overdue').sort((a, b) => (a.__date || 0) - (b.__date || 0)))
const overdueAmount = computed(() => overdueList.value.reduce((sum, item) => sum + item.__valor, 0))
const overdueCount = computed(() => overdueList.value.length)

const upcomingList = computed(() => {
  const limit = new Date(today())
  limit.setDate(limit.getDate() + 7)
  return openItems.value
    .filter(item => item.__status === 'soon' || item.__status === 'today')
    .sort((a, b) => (a.__date || 0) - (b.__date || 0))
    .filter(item => item.__date && item.__date <= limit)
    .slice(0, 5)
})
const upcomingAmount = computed(() => upcomingList.value.reduce((sum, item) => sum + item.__valor, 0))
const upcomingCount = computed(() => upcomingList.value.length)

const openCount = computed(() => openItems.value.length)

const clientHighlights = computed(() => {
  const map = new Map()
  enrichedReceivables.value.forEach(item => {
    if (!item.cliente && !item.nomeCliente) return
    const name = item.cliente || item.nomeCliente
    const record = map.get(name) || { nome: name, count: 0, valor: 0 }
    record.count += 1
    record.valor += item.__valor
    map.set(name, record)
  })
  return Array.from(map.values()).sort((a, b) => b.valor - a.valor).slice(0, 5)
})

function sortReceivables(list) {
  const direction = sortState.direction === 'desc' ? -1 : 1
  const column = SORTABLE_COLUMNS.includes(sortState.column) ? sortState.column : 'vencimento'
  const compare = buildComparator(column)
  return [...list].sort((a, b) => compare(a, b) * direction)
}

function buildComparator(column) {
  switch (column) {
    case 'id':
      return (a, b) => (Number(a.id) || 0) - (Number(b.id) || 0)
    case 'cliente':
      return (a, b) => (a.cliente || a.nomeCliente || '').localeCompare(b.cliente || b.nomeCliente || '', 'pt-BR', { sensitivity: 'base' })
    case 'descricao':
      return (a, b) => (a.descricao || '').localeCompare(b.descricao || '', 'pt-BR', { sensitivity: 'base' })
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
        return (Number(a.id) || 0) - (Number(b.id) || 0)
      }
  }
}

function toggleSort(column) {
  if (!SORTABLE_COLUMNS.includes(column)) return
  if (sortState.column === column) sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc'
  else {
    sortState.column = column
    sortState.direction = 'asc'
  }
}

function sortIcon(column) {
  if (sortState.column !== column) return 'fa-sort'
  return sortState.direction === 'asc' ? 'fa-sort-up' : 'fa-sort-down'
}

function statusLabel(item) {
  if (item.__status === 'paid') return 'Pago'
  if (item.__status === 'overdue') return 'Em atraso'
  if (item.__status === 'today') return 'Vence hoje'
  if (item.__status === 'soon') return 'Próx. 7 dias'
  return 'Em aberto'
}

function statusClass(item) {
  if (item.__status === 'paid') return 'status-paid'
  if (item.__status === 'overdue') return 'status-overdue'
  if (item.__status === 'today') return 'status-today'
  if (item.__status === 'soon') return 'status-soon'
  return 'status-open'
}

function rowClass(item) {
  if (item.__status === 'paid') return 'row-paid'
  if (item.__status === 'overdue') return 'row-overdue'
  if (item.__status === 'today') return 'row-today'
  if (item.__status === 'soon') return 'row-soon'
  return ''
}

function resetForm() {
  form.cliente = ''
  form.descricao = ''
  form.valor = 0
  form.vencimento = new Date().toISOString().slice(0, 10)
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
  form.cliente = item.cliente || item.nomeCliente || ''
  form.descricao = item.descricao || ''
  form.valor = Number(item.valor || 0)
  form.vencimento = item.__dateISO || item.vencimento || new Date().toISOString().slice(0, 10)
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
    receivables.value = await listReceivables()
  } catch (err) {
    loadError.value = err?.message || 'Erro ao carregar títulos.'
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
    cliente: form.cliente,
    descricao: form.descricao,
    valor: Number(form.valor || 0),
    vencimento: form.vencimento,
    pago: !!form.pago
  }

  try {
    savingEntry.value = true
    if (editId.value) await updateReceivable(editId.value, payload)
    else await createReceivable(payload)
    successMsg.value = 'Título salvo com sucesso.'
    close()
    resetForm()
    await load()
  } catch (err) {
    errorMsg.value = err?.message || 'Erro ao salvar título.'
  } finally {
    savingEntry.value = false
  }
}

async function togglePaid(item) {
  if (togglingId.value || !item?.id) return
  try {
    togglingId.value = item.id
    await updateReceivable(item.id, { pago: !item.pago })
    await load()
  } catch (err) {
    errorMsg.value = err?.message || 'Erro ao atualizar status.'
  } finally {
    togglingId.value = null
  }
}

async function onDelete(item) {
  if (deletingId.value || !item?.id) return
  if (!confirm(`Confirma excluir o título #${item.id}?`)) return
  try {
    deletingId.value = item.id
    errorMsg.value = ''
    await deleteReceivable(item.id)
    await load()
  } catch (err) {
    errorMsg.value = err?.message || 'Erro ao excluir título.'
  } finally {
    deletingId.value = null
  }
}

function clearFilters() {
  searchTerm.value = ''
  statusFilter.value = 'all'
  dateStart.value = ''
  dateEnd.value = ''
}

function isRowBusy(id) {
  if (id == null) return false
  return togglingId.value === id || deletingId.value === id
}

onMounted(load)

watch(dateStart, val => {
  if (!val || !dateEnd.value) return
  const start = new Date(val)
  const end = new Date(dateEnd.value)
  if (end < start) dateEnd.value = ''
})

watch(dateEnd, val => {
  if (!val || !dateStart.value) return
  const end = new Date(val)
  const start = new Date(dateStart.value)
  if (end < start) dateStart.value = ''
})
</script>

<style scoped>
.receivable-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.receivable-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
  padding: 1.75rem;
  border-radius: 18px;
  background: linear-gradient(135deg, #152540 0%, #0d6efd 100%);
  color: #fff;
  box-shadow: 0 12px 24px rgba(13, 110, 253, 0.25);
}

.header-copy {
  flex: 1 1 440px;
  min-width: 280px;
}

.header-copy h2 {
  margin: 0 0 0.5rem;
  font-size: 1.85rem;
  font-weight: 700;
}

.header-copy p {
  margin: 0 0 1.25rem;
  color: rgba(255, 255, 255, 0.82);
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
  background: rgba(255, 255, 255, 0.15);
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.summary-card .summary-label {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.9;
}

.summary-card .summary-value {
  font-size: 1.35rem;
  font-weight: 700;
}

.summary-card .summary-note {
  font-size: 0.85rem;
  opacity: 0.75;
}

.summary-card.warning.critical {
  background: rgba(255, 81, 110, 0.25);
}

.summary-card.info.attention {
  background: rgba(0, 212, 255, 0.35);
}

.header-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.header-actions .btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.2rem;
  border-radius: 999px;
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
  color: #273142;
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
  background: #0d6efd;
  color: #fff;
  border-color: transparent;
}

.status-chip.active .chip-count {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.filters-card {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 1rem;
  padding: 1.25rem;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
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
}

.form-control:focus-visible {
  outline: 2px solid rgba(13, 110, 253, 0.35);
}

.receivable-content {
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
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filters-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  background: rgba(13, 110, 253, 0.12);
  color: #0d6efd;
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
  outline: 2px solid rgba(13, 110, 253, 0.45);
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
  background: rgba(13, 110, 253, 0.12);
  color: #0d6efd;
}

.status-soon {
  background: rgba(255, 193, 7, 0.15);
  color: #b08901;
}

.status-today {
  background: rgba(251, 146, 60, 0.18);
  color: #b45309;
}

.status-overdue {
  background: rgba(248, 113, 113, 0.2);
  color: #b91c1c;
}

.status-paid {
  background: rgba(16, 185, 129, 0.18);
  color: #0f766e;
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

.btn-ghost {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.25);
}

.btn-ghost:hover {
  background: rgba(255, 255, 255, 0.25);
}

.empty-row {
  text-align: center;
  padding: 2.5rem 1.5rem;
  color: #64748b;
  font-size: 0.95rem;
}

.row-overdue {
  background: rgba(248, 113, 113, 0.08);
}

.row-today {
  background: rgba(251, 191, 36, 0.08);
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

.insights-list.overdue li {
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
  gap: 0.3rem;
  font-size: 0.85rem;
}

.item-value {
  font-weight: 700;
  color: #0f172a;
}

.item-value.neg {
  color: #b91c1c;
}

.item-date {
  font-size: 0.78rem;
  color: #64748b;
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
  z-index: 1000;
  padding: 1.5rem;
}

.modal.show {
  display: flex;
}

.modal-dialog {
  width: min(640px, 100%);
}

.modal-content {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 24px 40px rgba(15, 23, 42, 0.2);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.2rem 1.5rem;
  border-bottom: 1px solid #eef2f7;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.15rem;
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
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.form-group-large {
  grid-column: span 2;
}

.form-error {
  margin: 1rem 0 0;
  color: #b91c1c;
  font-weight: 600;
}

.form-success {
  margin: 1rem 0 0;
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

.btn[disabled] {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 1080px) {
  .receivable-content {
    grid-template-columns: 1fr;
  }

  .insights-card {
    order: -1;
  }
}

@media (max-width: 720px) {
  .receivable-header {
    padding: 1.25rem;
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
    padding: 1rem;
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
