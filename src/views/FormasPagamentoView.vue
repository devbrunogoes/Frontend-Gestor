<template>
  <section class="content-area payments-view">
    <header class="page-header payments-header">
      <div class="header-copy">
        <h2>Formas de Pagamento</h2>
        <p>Controle os meios de recebimento e taxas aplicadas em cada transação.</p>
      </div>
      <button class="btn btn-primary header-action" type="button" @click="openNew">
        <i class="fa-solid fa-plus"></i>
        <span>Nova forma</span>
      </button>
    </header>

    <transition name="fade-slide">
      <div v-if="globalFeedback.message" :class="['feedback-banner', globalFeedback.type]">
        <i v-if="globalFeedback.type === 'success'" class="fa-solid fa-circle-check"></i>
        <i v-else-if="globalFeedback.type === 'error'" class="fa-solid fa-circle-exclamation"></i>
        <span>{{ globalFeedback.message }}</span>
        <button type="button" class="close-banner" @click="clearFeedback" aria-label="Fechar aviso">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    </transition>

    <BaseError v-if="loadError" :message="loadError" :retry="load" />
    <BaseLoading v-else-if="loading" message="Carregando formas de pagamento…" />

    <template v-else>
      <section class="overview-grid" aria-label="Resumo das formas de pagamento">
        <article class="metric-card">
          <span class="metric-label">Total cadastradas</span>
          <strong class="metric-value">{{ totalMethods }}</strong>
        </article>
        <article class="metric-card good">
          <span class="metric-label">Ativas</span>
          <strong class="metric-value">{{ activeMethods }}</strong>
        </article>
        <article class="metric-card accent">
          <span class="metric-label">Taxa média</span>
          <strong class="metric-value">{{ formatPercentage(averageFee) }}</strong>
        </article>
      </section>

      <div class="toolbar">
        <div class="search-box">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input
            v-model.trim="searchTerm"
            type="search"
            placeholder="Buscar por nome ou tipo…"
            aria-label="Buscar formas de pagamento"
          />
        </div>
        <div class="toolbar-right">
          <div class="filter-group" role="group" aria-label="Filtro de status">
            <button
              type="button"
              :class="['filter-chip', { active: statusFilter === 'all' }]"
              @click="setStatusFilter('all')"
            >
              Todas
            </button>
            <button
              type="button"
              :class="['filter-chip', { active: statusFilter === 'active' }]"
              @click="setStatusFilter('active')"
            >
              Ativas
            </button>
            <button
              type="button"
              :class="['filter-chip', { active: statusFilter === 'inactive' }]"
              @click="setStatusFilter('inactive')"
            >
              Inativas
            </button>
          </div>
          <label class="type-filter">
            <span>Tipo</span>
            <select v-model="typeFilter">
              <option value="all">Todos</option>
              <option v-for="option in typeOptions" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
          </label>
        </div>
      </div>

      <div v-if="!filteredMethods.length" class="empty-state" role="alert">
        <i class="fa-solid fa-wallet"></i>
        <h3>Nenhuma forma encontrada</h3>
        <p>Cadastre uma nova forma de pagamento ou ajuste os filtros para visualizar resultados.</p>
        <button class="btn btn-primary" type="button" @click="openNew">
          <i class="fa-solid fa-plus"></i>
          <span>Adicionar forma</span>
        </button>
      </div>

      <div v-else class="methods-grid" role="list">
        <article
          v-for="method in filteredMethods"
          :key="method.id"
          class="method-card"
          :class="{ inactive: method.active === false }"
          role="listitem"
        >
          <header class="card-header">
            <div class="card-title">
              <h3>{{ method.nome }}</h3>
              <span :class="['type-pill', typePillClass(method.tipo)]">{{ method.tipo || 'Sem tipo' }}</span>
            </div>
            <span :class="['status-pill', method.active !== false ? 'status-active' : 'status-inactive']">
              {{ method.active !== false ? 'Ativa' : 'Inativa' }}
            </span>
          </header>

          <div class="fee-highlight">
            <span>Taxa padrão</span>
            <strong>{{ formatPercentage(method.taxa) }}</strong>
          </div>

          <dl class="card-meta">
            <div>
              <dt>ID interno</dt>
              <dd>#{{ method.id }}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{{ method.active !== false ? 'Disponível' : 'Desabilitada' }}</dd>
            </div>
            <div>
              <dt>Última atualização</dt>
              <dd>{{ formatUpdatedAt(method.updatedAt) }}</dd>
            </div>
          </dl>

          <footer class="card-actions">
            <button type="button" class="btn btn-light" @click="openEdit(method)">
              <i class="fa-solid fa-pen"></i>
              <span>Editar</span>
            </button>
            <button type="button" class="btn btn-danger" @click="onDelete(method)">
              <i class="fa-solid fa-trash"></i>
              <span>Excluir</span>
            </button>
          </footer>
        </article>
      </div>
    </template>

    <div class="modal" role="dialog" aria-hidden="true" :class="{ show: showModal }" @click.self="close">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <div>
              <h3>{{ editId ? 'Editar forma de pagamento' : 'Nova forma de pagamento' }}</h3>
              <p class="modal-subtitle">Defina as condições gerais e mantenha taxas sempre atualizadas.</p>
            </div>
            <button type="button" class="btn-close" @click="close" aria-label="Fechar">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <form @submit.prevent="save">
            <div class="modal-body">
              <div class="form-grid">
                <label class="form-group form-group-large" for="nome">
                  <span>Nome</span>
                  <input id="nome" class="form-control" v-model.trim="form.nome" required />
                </label>
                <label class="form-group" for="tipo">
                  <span>Tipo</span>
                  <select id="tipo" class="form-control" v-model="form.tipo">
                    <option>Dinheiro</option>
                    <option>Cartão Débito</option>
                    <option>Cartão Crédito</option>
                    <option>PIX</option>
                    <option>Boleto</option>
                    <option>Transferência</option>
                  </select>
                </label>
                <label class="form-group" for="taxa">
                  <span>Taxa (%)</span>
                  <input
                    id="taxa"
                    type="number"
                    step="0.01"
                    min="0"
                    class="form-control"
                    v-model.number="form.taxa"
                  />
                </label>
                <label class="form-group" for="ativo">
                  <span>Status</span>
                  <select id="ativo" class="form-control" v-model="form.active">
                    <option :value="true">Ativa</option>
                    <option :value="false">Inativa</option>
                  </select>
                </label>
              </div>
              <div v-if="errorMsg" class="alert alert-error">{{ errorMsg }}</div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="close">Cancelar</button>
              <button type="submit" class="btn btn-success">Salvar forma</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseError from '@/components/ui/BaseError.vue'
import { listPaymentMethods, createPaymentMethod, updatePaymentMethod, deletePaymentMethod } from '@/services/paymentMethods'

const methods = ref([])
const loading = ref(true)
const loadError = ref('')
const showModal = ref(false)
const editId = ref(null)
const form = reactive({ nome: '', tipo: 'Dinheiro', taxa: 0, active: true })
const errorMsg = ref('')
const searchTerm = ref('')
const statusFilter = ref('all')
const typeFilter = ref('all')
const globalFeedback = reactive({ type: '', message: '' })
let feedbackTimeout = null

const typeColorMap = {
  Dinheiro: 'type-cash',
  'Cartão Débito': 'type-debit',
  'Cartão Crédito': 'type-credit',
  PIX: 'type-pix',
  Boleto: 'type-boleto',
  Transferência: 'type-transfer'
}

const totalMethods = computed(() => methods.value.length)
const activeMethods = computed(() => methods.value.filter(method => method.active !== false).length)
const averageFee = computed(() => {
  if (!methods.value.length) return 0
  const values = methods.value.map(method => Math.max(0, toNumber(method.taxa)))
  const total = values.reduce((sum, value) => sum + value, 0)
  return values.length ? total / values.length : 0
})

const typeOptions = computed(() => {
  const unique = new Set()
  methods.value.forEach(method => {
    if (method.tipo) unique.add(method.tipo)
  })
  return Array.from(unique).sort((a, b) => a.localeCompare(b, 'pt-BR'))
})

const filteredMethods = computed(() => {
  const term = searchTerm.value.trim().toLowerCase()
  return methods.value
    .filter(method => {
      switch (statusFilter.value) {
        case 'active':
          return method.active !== false
        case 'inactive':
          return method.active === false
        default:
          return true
      }
    })
    .filter(method => {
      if (typeFilter.value === 'all') return true
      return (method.tipo || '').toLowerCase() === typeFilter.value.toLowerCase()
    })
    .filter(method => {
      if (!term) return true
      const haystack = [method.nome, method.tipo]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(term)
    })
    .sort((a, b) => {
      const left = (a.nome || '').toLowerCase()
      const right = (b.nome || '').toLowerCase()
      return left.localeCompare(right, 'pt-BR')
    })
})

function toNumber(value) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatPercentage(value) {
  const number = toNumber(value)
  return `${number.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
}

function formatUpdatedAt(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function typePillClass(type) {
  return typeColorMap[type] || 'type-default'
}

function setStatusFilter(filter) {
  statusFilter.value = filter
}

function triggerFeedback(type, message) {
  globalFeedback.type = type
  globalFeedback.message = message
  if (feedbackTimeout) clearTimeout(feedbackTimeout)
  feedbackTimeout = setTimeout(() => {
    globalFeedback.type = ''
    globalFeedback.message = ''
  }, 3500)
}

function clearFeedback() {
  if (feedbackTimeout) clearTimeout(feedbackTimeout)
  globalFeedback.type = ''
  globalFeedback.message = ''
}

function resetForm() {
  form.nome = ''
  form.tipo = 'Dinheiro'
  form.taxa = 0
  form.active = true
  editId.value = null
  errorMsg.value = ''
}

function openNew() {
  resetForm()
  showModal.value = true
}

function openEdit(method) {
  editId.value = method.id
  form.nome = method.nome || ''
  form.tipo = method.tipo || 'Dinheiro'
  form.taxa = toNumber(method.taxa)
  form.active = method.active !== false
  errorMsg.value = ''
  showModal.value = true
}

function close() {
  showModal.value = false
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const result = await listPaymentMethods()
    methods.value = Array.isArray(result) ? result : []
  } catch (error) {
    loadError.value = error?.message || 'Erro ao carregar formas de pagamento.'
  } finally {
    loading.value = false
  }
}

async function save() {
  errorMsg.value = ''

  if (!form.nome) {
    errorMsg.value = 'Informe o nome da forma de pagamento.'
    return
  }

  const fee = toNumber(form.taxa)
  if (fee < 0) {
    errorMsg.value = 'A taxa não pode ser negativa.'
    return
  }

  const payload = {
    nome: form.nome,
    tipo: form.tipo,
    taxa: fee,
    active: !!form.active
  }

  try {
    if (editId.value) {
      await updatePaymentMethod(editId.value, payload)
      triggerFeedback('success', 'Forma de pagamento atualizada.')
    } else {
      await createPaymentMethod(payload)
      triggerFeedback('success', 'Forma de pagamento criada.')
    }
    close()
    resetForm()
    await load()
  } catch (error) {
    errorMsg.value = error?.message || 'Erro ao salvar forma de pagamento.'
  }
}

async function onDelete(method) {
  if (!confirm(`Confirma excluir a forma #${method.id}?`)) return
  try {
    await deletePaymentMethod(method.id)
    triggerFeedback('success', 'Forma de pagamento excluída.')
    await load()
  } catch (error) {
    triggerFeedback('error', error?.message || 'Erro ao excluir forma de pagamento.')
  }
}

onMounted(() => {
  load()
})

onUnmounted(() => {
  if (feedbackTimeout) {
    clearTimeout(feedbackTimeout)
  }
})
</script>

<style scoped>
.payments-view {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.payments-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1.8rem 2rem;
  background: linear-gradient(135deg, #ffffff 0%, #f4f9ff 100%);
  border-radius: 22px;
  box-shadow: 0 24px 46px rgba(15, 30, 60, 0.12);
}

.header-copy h2 {
  margin: 0;
  font-size: 1.85rem;
  font-weight: 700;
  color: #101828;
}

.header-copy p {
  margin: 0.45rem 0 0;
  color: #667085;
  max-width: 480px;
}

.header-action {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
}

.feedback-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 1.2rem;
  border-radius: 14px;
  font-size: 0.95rem;
}

.feedback-banner.success {
  background: rgba(34, 197, 94, 0.12);
  color: #047857;
}

.feedback-banner.error {
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
}

.feedback-banner i {
  font-size: 1.1rem;
}

.close-banner {
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 0.1rem;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.metric-card {
  padding: 1rem 1.2rem;
  border-radius: 18px;
  background: linear-gradient(145deg, #ffffff 0%, #f1f5ff 100%);
  border: 1px solid rgba(13, 110, 253, 0.12);
  box-shadow: 0 18px 36px rgba(15, 30, 60, 0.08);
}

.metric-card.good {
  border-color: rgba(34, 197, 94, 0.25);
}

.metric-card.accent {
  border-color: rgba(14, 165, 233, 0.3);
}

.metric-label {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
}

.metric-value {
  display: block;
  margin-top: 0.35rem;
  font-size: 1.4rem;
  font-weight: 600;
  color: #0f172a;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
  padding: 1.1rem;
  background: #ffffff;
  border-radius: 18px;
  box-shadow: 0 14px 30px rgba(15, 30, 60, 0.08);
}

.search-box {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.65rem 0.9rem;
  border-radius: 14px;
  border: 1px solid rgba(99, 102, 241, 0.25);
  background: #f8fafc;
  flex: 1 1 260px;
}

.search-box input {
  border: none;
  background: transparent;
  width: 100%;
  font-size: 0.95rem;
  color: #0f172a;
}

.search-box input:focus {
  outline: none;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}

.filter-group {
  display: inline-flex;
  gap: 0.4rem;
  padding: 0.35rem;
  border-radius: 14px;
  background: #f1f5f9;
}

.filter-chip {
  padding: 0.45rem 0.9rem;
  border-radius: 10px;
  border: none;
  background: transparent;
  color: #475569;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-chip.active {
  background: #0ea5e9;
  color: #ffffff;
  box-shadow: 0 12px 24px rgba(14, 165, 233, 0.22);
}

.filter-chip:hover {
  background: rgba(14, 165, 233, 0.12);
}

.type-filter {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.8rem;
  color: #64748b;
}

.type-filter select {
  min-width: 150px;
  padding: 0.4rem 0.6rem;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.6);
  font-size: 0.95rem;
  color: #0f172a;
  background: #ffffff;
}

.methods-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
  gap: 1.4rem;
}

.method-card {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  padding: 1.3rem;
  border-radius: 20px;
  background: linear-gradient(155deg, #ffffff 0%, #f7faff 100%);
  border: 1px solid rgba(15, 23, 42, 0.06);
  box-shadow: 0 16px 30px rgba(15, 30, 60, 0.08);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.method-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(15, 30, 60, 0.12);
}

.method-card.inactive {
  background: linear-gradient(155deg, #f8fafc 0%, #eef2ff 100%);
  opacity: 0.9;
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.card-title {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.card-title h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #0f172a;
}

.type-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.type-default {
  background: rgba(148, 163, 184, 0.2);
  color: #475569;
}

.type-cash {
  background: rgba(34, 197, 94, 0.18);
  color: #047857;
}

.type-debit {
  background: rgba(59, 130, 246, 0.18);
  color: #1d4ed8;
}

.type-credit {
  background: rgba(129, 140, 248, 0.2);
  color: #4338ca;
}

.type-pix {
  background: rgba(16, 185, 129, 0.18);
  color: #0f766e;
}

.type-boleto {
  background: rgba(251, 191, 36, 0.22);
  color: #b45309;
}

.type-transfer {
  background: rgba(14, 165, 233, 0.22);
  color: #0369a1;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-active {
  background: rgba(34, 197, 94, 0.16);
  color: #047857;
}

.status-inactive {
  background: rgba(148, 163, 184, 0.22);
  color: #475569;
}

.fee-highlight {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 0.85rem 1rem;
  border-radius: 14px;
  background: rgba(14, 165, 233, 0.12);
  color: #0f172a;
}

.fee-highlight span {
  font-size: 0.8rem;
  color: #0f172a;
  opacity: 0.75;
}

.fee-highlight strong {
  font-size: 1.25rem;
  font-weight: 700;
}

.card-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.8rem;
  margin: 0;
}

.card-meta dt {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #94a3b8;
  margin-bottom: 0.25rem;
}

.card-meta dd {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #1e293b;
}

.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
}

.card-actions .btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.empty-state {
  margin-top: 1.2rem;
  padding: 2.4rem 2rem;
  text-align: center;
  background: linear-gradient(160deg, #ffffff 0%, #f4f7ff 100%);
  border-radius: 22px;
  box-shadow: 0 18px 36px rgba(15, 30, 60, 0.1);
  display: grid;
  gap: 0.75rem;
  justify-items: center;
  color: #475569;
}

.empty-state i {
  font-size: 2rem;
  color: #0ea5e9;
}

.modal-content {
  border-radius: 18px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.2rem;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.4rem;
  color: #0f172a;
}

.modal-subtitle {
  margin: 0.4rem 0 0;
  color: #64748b;
  font-size: 0.95rem;
}

.btn-close {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 1.2rem;
  cursor: pointer;
}

.form-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-group-large {
  grid-column: 1 / -1;
}

.alert {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  font-size: 0.9rem;
}

.alert-error {
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.2s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 720px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-right {
    width: 100%;
    justify-content: space-between;
  }

  .card-actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
