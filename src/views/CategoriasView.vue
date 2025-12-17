<template>
  <section class="content-area categories-view">
    <header class="page-header categories-header">
      <div class="header-copy">
        <h2>Categorias</h2>
        <p>Organize seus produtos por segmentos claros e facilite a gestão diária.</p>
      </div>
      <button class="btn btn-primary header-action" type="button" @click="openNew">
        <i class="fa-solid fa-plus"></i>
        <span>Nova categoria</span>
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
    <BaseLoading v-else-if="loading" message="Carregando categorias…" />

    <template v-else>
      <section class="overview-grid" aria-label="Resumo das categorias">
        <article class="metric-card">
          <span class="metric-label">Total cadastradas</span>
          <strong class="metric-value">{{ totalCategories }}</strong>
        </article>
        <article class="metric-card good">
          <span class="metric-label">Ativas</span>
          <strong class="metric-value">{{ activeCategories }}</strong>
        </article>
        <article class="metric-card neutral">
          <span class="metric-label">Inativas</span>
          <strong class="metric-value">{{ inactiveCategories }}</strong>
        </article>
      </section>

      <div class="toolbar">
        <div class="search-box">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input
            v-model.trim="searchTerm"
            type="search"
            placeholder="Buscar por nome, descrição…"
            aria-label="Buscar categorias"
          />
        </div>
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
      </div>

      <div v-if="!filteredCategories.length" class="empty-state" role="alert">
        <i class="fa-solid fa-folder-open"></i>
        <h3>Nenhuma categoria encontrada</h3>
        <p>Cadastre uma nova categoria ou ajuste a busca para visualizar resultados.</p>
        <button class="btn btn-primary" type="button" @click="openNew">
          <i class="fa-solid fa-plus"></i>
          <span>Adicionar categoria</span>
        </button>
      </div>

      <div v-else class="categories-grid" role="list">
        <article
          v-for="category in filteredCategories"
          :key="category.id"
          class="category-card"
          :class="{ inactive: category.active === false }"
          role="listitem"
        >
          <header class="card-header">
            <h3>{{ category.nome }}</h3>
            <span :class="['status-pill', category.active !== false ? 'status-active' : 'status-inactive']">
              {{ category.active !== false ? 'Ativa' : 'Inativa' }}
            </span>
          </header>
          <p class="card-description">{{ category.descricao || 'Sem descrição cadastrada.' }}</p>
          <dl class="card-meta">
            <div>
              <dt>ID interno</dt>
              <dd>#{{ category.id }}</dd>
            </div>
            <div>
              <dt>Produtos relacionados</dt>
              <dd>{{ category.productsCount ?? '—' }}</dd>
            </div>
          </dl>
          <footer class="card-actions">
            <button type="button" class="btn btn-light" @click="openEdit(category)">
              <i class="fa-solid fa-pen"></i>
              <span>Editar</span>
            </button>
            <button type="button" class="btn btn-danger" @click="onDelete(category)">
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
              <h3>{{ editId ? 'Editar categoria' : 'Nova categoria' }}</h3>
              <p class="modal-subtitle">Defina um nome objetivo e uma descrição curta para facilitar a busca.</p>
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
                <label class="form-group form-group-large" for="descricao">
                  <span>Descrição</span>
                  <textarea
                    id="descricao"
                    class="form-control"
                    rows="3"
                    v-model.trim="form.descricao"
                    placeholder="Resumo para identificar a categoria"
                  ></textarea>
                </label>
                <label class="form-group" for="status">
                  <span>Status</span>
                  <select id="status" class="form-control" v-model="form.active">
                    <option :value="true">Ativa</option>
                    <option :value="false">Inativa</option>
                  </select>
                </label>
              </div>
              <div v-if="errorMsg" class="alert alert-error">{{ errorMsg }}</div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="close">Cancelar</button>
              <button type="submit" class="btn btn-success">Salvar categoria</button>
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
import { listCategories, createCategory, updateCategory, deleteCategory } from '@/services/categories'

const categories = ref([])
const loading = ref(false)
const loadError = ref('')
const showModal = ref(false)
const editId = ref(null)
const form = reactive({ nome: '', descricao: '', active: true })
const errorMsg = ref('')
const searchTerm = ref('')
const statusFilter = ref('all')
const globalFeedback = reactive({ type: '', message: '' })
let feedbackTimeout = null

const totalCategories = computed(() => categories.value.length)
const activeCategories = computed(() => categories.value.filter(category => category.active !== false).length)
const inactiveCategories = computed(() => categories.value.filter(category => category.active === false).length)

const filteredCategories = computed(() => {
  const term = searchTerm.value.trim().toLowerCase()
  return categories.value
    .filter(applyStatusFilter)
    .filter(category => {
      if (!term) return true
      const haystack = [category.nome, category.descricao]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(term)
    })
})

function applyStatusFilter(category) {
  switch (statusFilter.value) {
    case 'active':
      return category.active !== false
    case 'inactive':
      return category.active === false
    default:
      return true
  }
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
  form.descricao = ''
  form.active = true
  editId.value = null
  errorMsg.value = ''
}

function openNew() {
  resetForm()
  showModal.value = true
}

function openEdit(category) {
  editId.value = category.id
  form.nome = category.nome || ''
  form.descricao = category.descricao || ''
  form.active = category.active !== false
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
    const result = await listCategories()
    categories.value = Array.isArray(result) ? result : []
  } catch (error) {
    loadError.value = error?.message || 'Erro ao carregar categorias.'
  } finally {
    loading.value = false
  }
}

async function save() {
  errorMsg.value = ''
  if (!form.nome) {
    errorMsg.value = 'Informe o nome da categoria.'
    return
  }

  const payload = {
    nome: form.nome,
    descricao: form.descricao,
    active: !!form.active
  }

  try {
    if (editId.value) {
      await updateCategory(editId.value, payload)
      triggerFeedback('success', 'Categoria atualizada com sucesso.')
    } else {
      await createCategory(payload)
      triggerFeedback('success', 'Categoria criada com sucesso.')
    }
    close()
    resetForm()
    await load()
  } catch (error) {
    errorMsg.value = error?.message || 'Erro ao salvar categoria.'
  }
}

async function onDelete(category) {
  if (!confirm(`Confirma excluir a categoria #${category.id}?`)) return
  try {
    await deleteCategory(category.id)
    triggerFeedback('success', 'Categoria excluída.')
    await load()
  } catch (error) {
    triggerFeedback('error', error?.message || 'Erro ao excluir categoria.')
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
.categories-view {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.categories-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1.8rem 2rem;
  background: linear-gradient(135deg, #ffffff 0%, #f5f9ff 100%);
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
  border-color: rgba(34, 197, 94, 0.2);
}

.metric-card.neutral {
  border-color: rgba(148, 163, 184, 0.4);
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
  background: #2563eb;
  color: #ffffff;
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.22);
}

.filter-chip:hover {
  background: rgba(37, 99, 235, 0.12);
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.4rem;
}

.category-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.3rem;
  border-radius: 20px;
  background: linear-gradient(155deg, #ffffff 0%, #f7f9ff 100%);
  border: 1px solid rgba(15, 23, 42, 0.06);
  box-shadow: 0 16px 30px rgba(15, 30, 60, 0.08);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.category-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(15, 30, 60, 0.12);
}

.category-card.inactive {
  background: linear-gradient(155deg, #f8fafc 0%, #eef2ff 100%);
  opacity: 0.9;
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.card-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #0f172a;
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

.card-description {
  margin: 0;
  color: #475569;
  line-height: 1.4;
  min-height: 40px;
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
  color: #2563eb;
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

  .card-actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
