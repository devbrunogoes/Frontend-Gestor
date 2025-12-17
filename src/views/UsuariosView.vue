<template>
  <section class="content-area users-view">
    <header class="page-header users-header">
      <div class="header-copy">
        <h2>Usuários</h2>
        <p>Acompanhe os acessos ativos e mantenha perfis organizados por função.</p>
      </div>
      <button class="btn btn-primary header-action" type="button" @click="openNew">
        <i class="fa-solid fa-plus"></i>
        <span>Novo usuário</span>
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

    <BaseError v-if="loadError" :message="loadError" :retry="loadAll" />
    <BaseLoading v-else-if="loading" message="Carregando usuários…" />

    <template v-else>
      <section class="overview-grid" aria-label="Resumo dos usuários">
        <article class="metric-card">
          <span class="metric-label">Total cadastrados</span>
          <strong class="metric-value">{{ totalUsers }}</strong>
        </article>
        <article class="metric-card good">
          <span class="metric-label">Ativos</span>
          <strong class="metric-value">{{ activeUsers }}</strong>
        </article>
        <article class="metric-card accent">
          <span class="metric-label">Perfis</span>
          <strong class="metric-value">{{ roleCount }}</strong>
        </article>
      </section>

      <div class="toolbar">
        <div class="search-box">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input
            v-model.trim="searchTerm"
            type="search"
            placeholder="Buscar por nome ou e-mail…"
            aria-label="Buscar usuário"
          />
        </div>
        <div class="toolbar-right">
          <div class="filter-group" role="group" aria-label="Filtro de status">
            <button
              type="button"
              :class="['filter-chip', { active: statusFilter === 'all' }]"
              @click="setStatusFilter('all')"
            >
              Todos
            </button>
            <button
              type="button"
              :class="['filter-chip', { active: statusFilter === 'active' }]"
              @click="setStatusFilter('active')"
            >
              Ativos
            </button>
            <button
              type="button"
              :class="['filter-chip', { active: statusFilter === 'inactive' }]"
              @click="setStatusFilter('inactive')"
            >
              Inativos
            </button>
          </div>
          <label class="role-filter">
            <span>Função</span>
            <select v-model="roleFilter">
              <option value="all">Todas</option>
              <option v-for="option in roleOptions" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
          </label>
        </div>
      </div>

      <div v-if="!filteredUsers.length" class="empty-state" role="alert">
        <i class="fa-solid fa-user-group"></i>
        <h3>Nenhum usuário encontrado</h3>
        <p>Cadastre um novo usuário ou ajuste os filtros para visualizar resultados.</p>
        <button class="btn btn-primary" type="button" @click="openNew">
          <i class="fa-solid fa-plus"></i>
          <span>Adicionar usuário</span>
        </button>
      </div>

      <div v-else class="users-grid" role="list">
        <article
          v-for="user in filteredUsers"
          :key="user.id"
          class="user-card"
          :class="{ inactive: user.active === false }"
          role="listitem"
        >
          <header class="card-header">
            <div :class="['avatar', avatarClass(user)]">{{ userInitial(user) }}</div>
            <div class="card-title">
              <h3>{{ user.nome || user.email }}</h3>
              <p>{{ user.email }}</p>
            </div>
            <span :class="['status-pill', user.active !== false ? 'status-active' : 'status-inactive']">
              {{ user.active !== false ? 'Ativo' : 'Inativo' }}
            </span>
          </header>

          <dl class="card-meta">
            <div>
              <dt>Função</dt>
              <dd>{{ user.role || 'Não informada' }}</dd>
            </div>
            <div>
              <dt>ID interno</dt>
              <dd>#{{ user.id }}</dd>
            </div>
            <div>
              <dt>Último acesso</dt>
              <dd>{{ formatLastAccess(user.lastLogin) }}</dd>
            </div>
          </dl>

          <footer class="card-actions">
            <button type="button" class="btn btn-light" @click="openEdit(user)">
              <i class="fa-solid fa-pen"></i>
              <span>Editar</span>
            </button>
            <button type="button" class="btn btn-danger" @click="onDelete(user)">
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
              <h3>{{ editId ? 'Editar usuário' : 'Novo usuário' }}</h3>
              <p class="modal-subtitle">Defina os dados de acesso e a função do colaborador.</p>
            </div>
            <button type="button" class="btn-close" @click="close" aria-label="Fechar">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <form @submit.prevent="save">
            <div class="modal-body">
              <div class="form-grid">
                <label class="form-group form-group-large" for="nomeUsuario">
                  <span>Nome</span>
                  <input id="nomeUsuario" type="text" class="form-control" v-model.trim="form.nome" required />
                </label>
                <label class="form-group form-group-large" for="emailUsuario">
                  <span>E-mail</span>
                  <input id="emailUsuario" type="email" class="form-control" v-model.trim="form.email" required />
                </label>
                <label class="form-group" for="senhaUsuario">
                  <span>Senha</span>
                  <input
                    id="senhaUsuario"
                    type="password"
                    class="form-control"
                    :required="!editId"
                    v-model="form.password"
                    :placeholder="editId ? 'Deixe em branco para manter' : 'Crie uma senha segura'"
                  />
                  <small v-if="editId" class="input-hint">Deixe em branco para manter a senha atual.</small>
                </label>
                <label class="form-group" for="statusUsuario">
                  <span>Status</span>
                  <select id="statusUsuario" class="form-control" v-model="form.active">
                    <option :value="true">Ativo</option>
                    <option :value="false">Inativo</option>
                  </select>
                </label>
                <label class="form-group" for="roleUsuario">
                  <span>Função</span>
                  <select id="roleUsuario" class="form-control" v-model="form.role" required>
                    <option v-for="option in roleOptions" :key="option" :value="option">{{ option }}</option>
                  </select>
                </label>
              </div>
              <div v-if="errorMsg" class="alert alert-error">{{ errorMsg }}</div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="close">Cancelar</button>
              <button type="submit" class="btn btn-success">Salvar usuário</button>
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
import { listUsers, listRoles, createUser, updateUser, deleteUser } from '@/services/users'

const DEFAULT_ROLE = 'Usuário Comum'

const users = ref([])
const roles = ref([])
const loading = ref(false)
const loadError = ref('')
const showModal = ref(false)
const editId = ref(null)
const form = reactive({ nome: '', email: '', password: '', active: true, role: '' })
const errorMsg = ref('')
const searchTerm = ref('')
const statusFilter = ref('all')
const roleFilter = ref('all')
const globalFeedback = reactive({ type: '', message: '' })
let feedbackTimeout = null

const avatarPalette = ['avatar-teal', 'avatar-indigo', 'avatar-amber', 'avatar-rose', 'avatar-sky']

const totalUsers = computed(() => users.value.length)
const activeUsers = computed(() => users.value.filter(user => user.active !== false).length)
const roleOptions = computed(() => {
  const base = roles.value.length ? roles.value : [DEFAULT_ROLE]
  return [...new Set(base)].sort((a, b) => a.localeCompare(b, 'pt-BR'))
})
const roleCount = computed(() => roleOptions.value.length)

const filteredUsers = computed(() => {
  const term = searchTerm.value.trim().toLowerCase()
  return users.value
    .filter(user => {
      switch (statusFilter.value) {
        case 'active':
          return user.active !== false
        case 'inactive':
          return user.active === false
        default:
          return true
      }
    })
    .filter(user => {
      if (roleFilter.value === 'all') return true
      return (user.role || '').toLowerCase() === roleFilter.value.toLowerCase()
    })
    .filter(user => {
      if (!term) return true
      const haystack = [user.nome, user.email]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(term)
    })
    .sort((a, b) => {
      const left = (a.nome || a.email || '').toLowerCase()
      const right = (b.nome || b.email || '').toLowerCase()
      return left.localeCompare(right, 'pt-BR')
    })
})

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
  form.email = ''
  form.password = ''
  form.active = true
  form.role = roleOptions.value[0] || DEFAULT_ROLE
  editId.value = null
  errorMsg.value = ''
}

function openNew() {
  resetForm()
  showModal.value = true
}

function openEdit(user) {
  editId.value = user.id
  form.nome = user.nome || ''
  form.email = user.email || ''
  form.password = ''
  form.active = user.active !== false
  form.role = user.role || roleOptions.value[0] || DEFAULT_ROLE
  errorMsg.value = ''
  showModal.value = true
}

function close() {
  showModal.value = false
}

function setStatusFilter(filter) {
  statusFilter.value = filter
}

function userInitial(user) {
  const base = (user.nome || user.email || '').trim()
  return base ? base.charAt(0).toUpperCase() : 'U'
}

function avatarClass(user) {
  const source = Number(user.id) || (user.nome ? user.nome.charCodeAt(0) : 0)
  const index = Math.abs(source) % avatarPalette.length
  return avatarPalette[index]
}

function formatLastAccess(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

async function loadUsers() {
  const result = await listUsers()
  users.value = Array.isArray(result) ? result : []
}

async function loadRolesList() {
  const result = await listRoles()
  roles.value = Array.isArray(result) && result.length ? result : [DEFAULT_ROLE]
  if (!form.role) form.role = roleOptions.value[0] || DEFAULT_ROLE
}

async function loadAll() {
  loading.value = true
  loadError.value = ''
  try {
    await Promise.all([loadRolesList(), loadUsers()])
  } catch (error) {
    loadError.value = error?.message || 'Erro ao carregar usuários.'
  } finally {
    loading.value = false
  }
}

async function save() {
  errorMsg.value = ''
  if (!form.nome || !form.email || (!editId.value && !form.password)) {
    errorMsg.value = 'Nome, e-mail e senha são obrigatórios (senha apenas ao criar).'
    return
  }

  const payload = {
    nome: form.nome,
    email: form.email,
    password: form.password || undefined,
    active: !!form.active,
    role: form.role || roleOptions.value[0] || DEFAULT_ROLE
  }

  try {
    if (editId.value) {
      await updateUser(editId.value, payload)
      triggerFeedback('success', 'Usuário atualizado com sucesso.')
    } else {
      await createUser(payload)
      triggerFeedback('success', 'Usuário criado com sucesso.')
    }
    close()
    resetForm()
    await loadUsers()
  } catch (error) {
    errorMsg.value = error?.message || 'Erro ao salvar usuário.'
  }
}

async function onDelete(user) {
  if (!confirm(`Confirmar exclusão do usuário #${user.id}?`)) return
  try {
    await deleteUser(user.id)
    triggerFeedback('success', 'Usuário excluído.')
    await loadUsers()
  } catch (error) {
    triggerFeedback('error', error?.message || 'Erro ao excluir usuário.')
  }
}

onMounted(() => {
  loadAll()
})

onUnmounted(() => {
  if (feedbackTimeout) {
    clearTimeout(feedbackTimeout)
  }
})
</script>

<style scoped>
.users-view {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.users-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1.8rem 2rem;
  background: linear-gradient(135deg, #ffffff 0%, #f6f4ff 100%);
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
  border-color: rgba(167, 139, 250, 0.3);
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
  background: #8b5cf6;
  color: #ffffff;
  box-shadow: 0 12px 24px rgba(139, 92, 246, 0.22);
}

.filter-chip:hover {
  background: rgba(139, 92, 246, 0.12);
}

.role-filter {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.8rem;
  color: #64748b;
}

.role-filter select {
  min-width: 170px;
  padding: 0.4rem 0.6rem;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.6);
  font-size: 0.95rem;
  color: #0f172a;
  background: #ffffff;
}

.users-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.4rem;
}

.user-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.3rem;
  border-radius: 20px;
  background: linear-gradient(155deg, #ffffff 0%, #f8f9ff 100%);
  border: 1px solid rgba(15, 23, 42, 0.06);
  box-shadow: 0 16px 30px rgba(15, 30, 60, 0.08);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.user-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(15, 30, 60, 0.12);
}

.user-card.inactive {
  background: linear-gradient(155deg, #f8fafc 0%, #eef2ff 100%);
  opacity: 0.9;
}

.card-header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 1rem;
}

.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  font-weight: 600;
  color: #fff;
}

.avatar-teal {
  background: linear-gradient(135deg, #0f766e, #14b8a6);
}

.avatar-indigo {
  background: linear-gradient(135deg, #3730a3, #6366f1);
}

.avatar-amber {
  background: linear-gradient(135deg, #b45309, #f59e0b);
}

.avatar-rose {
  background: linear-gradient(135deg, #be123c, #f43f5e);
}

.avatar-sky {
  background: linear-gradient(135deg, #0369a1, #0ea5e9);
}

.card-title h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #0f172a;
}

.card-title p {
  margin: 0.25rem 0 0;
  font-size: 0.9rem;
  color: #475569;
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
  color: #8b5cf6;
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

.input-hint {
  font-size: 0.75rem;
  color: #94a3b8;
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
