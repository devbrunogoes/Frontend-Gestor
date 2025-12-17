<template>
  <section class="content-area clients-view">
    <header class="page-header">
      <div class="page-title">
        <h2>Clientes</h2>
        <p>Cadastre, edite e acompanhe todos os clientes cadastrados na plataforma.</p>
      </div>
      <button type="button" class="btn btn-primary" @click="openCreate">
        <i class="fa-solid fa-plus" aria-hidden="true"></i>
        <span>Novo Cliente</span>
      </button>
    </header>

    <BaseError v-if="loadError" :message="loadError" :retry="loadClients" />
    <BaseLoading v-else-if="loading" message="Carregando clientes…" />
    <div v-else class="clients-content">
      <div v-if="clients.length" class="clients-toolbar">
        <label class="sr-only" for="clientes-busca">Buscar clientes</label>
        <div class="search-box">
          <i class="fa-solid fa-search" aria-hidden="true"></i>
          <input
            id="clientes-busca"
            v-model="searchTerm"
            type="search"
            placeholder="Pesquisar por nome, documento ou cidade"
          />
        </div>
      </div>

      <p v-if="!filteredClients.length" class="empty-state">Nenhum cliente encontrado.</p>

      <ul v-else class="clients-grid" aria-label="Lista de clientes">
        <li v-for="client in filteredClients" :key="client.id" class="client-card">
          <header class="client-card__header">
            <span class="client-card__id">#{{ client.id }}</span>
            <span class="client-card__badge" :class="{ 'client-card__badge--inactive': !isClientActive(client) }">
              {{ isClientActive(client) ? 'Ativo' : 'Inativo' }}
            </span>
          </header>
          <div class="client-card__body">
            <h3>{{ client.nome || 'Cliente sem nome' }}</h3>
            <p v-if="client.cpfcnpj" class="client-card__doc">{{ client.cpfcnpj }}</p>
            <dl>
              <div>
                <dt><i class="fa-solid fa-phone" aria-hidden="true"></i>Telefone</dt>
                <dd>{{ client.telefone || client.phone || 'Não informado' }}</dd>
              </div>
              <div>
                <dt><i class="fa-solid fa-envelope" aria-hidden="true"></i>E-mail</dt>
                <dd>{{ client.email || 'Não informado' }}</dd>
              </div>
              <div>
                <dt><i class="fa-solid fa-location-dot" aria-hidden="true"></i>Endereço</dt>
                <dd>{{ formatAddress(client) }}</dd>
              </div>
              <div>
                <dt><i class="fa-solid fa-map-pin" aria-hidden="true"></i>CEP</dt>
                <dd>{{ formatCep(client.cep) }}</dd>
              </div>
            </dl>
          </div>
          <footer class="client-card__actions">
            <button type="button" class="btn-card" @click="openEdit(client)">
              <i class="fa-solid fa-pen" aria-hidden="true"></i>
              <span>Editar</span>
            </button>
            <button type="button" class="btn-card btn-card--danger" @click="confirmDelete(client)">
              <i class="fa-solid fa-trash" aria-hidden="true"></i>
              <span>Excluir</span>
            </button>
          </footer>
        </li>
      </ul>
    </div>

    <div class="modal" role="dialog" :aria-hidden="(!isDialogOpen).toString()" :class="{ show: isDialogOpen }" @click.self="closeDialog">
      <div class="modal-dialog" role="document">
        <div class="modal-content">
          <header class="modal-header">
            <h3>{{ editingId ? 'Editar Cliente' : 'Novo Cliente' }}</h3>
            <button type="button" class="btn-close" @click="closeDialog" aria-label="Fechar modal">
              <i class="fa-solid fa-times" aria-hidden="true"></i>
            </button>
          </header>
          <form class="modal-form" @submit.prevent="saveClient">
            <div class="modal-body">
              <section class="form-section">
                <header>
                  <h4>Dados gerais</h4>
                </header>
                <div class="form-grid">
                  <div class="form-group span-6">
                    <label for="cliente-nome">Nome</label>
                    <input id="cliente-nome" v-model.trim="form.nome" type="text" required />
                  </div>
                  <div class="form-group span-3">
                    <label for="cliente-documento">CPF/CNPJ</label>
                    <input id="cliente-documento" v-model.trim="form.cpfcnpj" type="text" placeholder="Somente números" />
                  </div>
                  <div class="form-group span-3">
                    <label for="cliente-telefone">Telefone</label>
                    <input id="cliente-telefone" v-model.trim="form.telefone" type="tel" />
                  </div>
                  <div class="form-group span-6">
                    <label for="cliente-email">E-mail</label>
                    <input id="cliente-email" v-model.trim="form.email" type="email" />
                  </div>
                  <div class="form-group span-3">
                    <label for="cliente-status">Status</label>
                    <select id="cliente-status" v-model="form.active">
                      <option :value="true">Ativo</option>
                      <option :value="false">Inativo</option>
                    </select>
                  </div>
                </div>
              </section>

              <section class="form-section">
                <header>
                  <h4>Endereço</h4>
                  <p>Preencha o endereço completo. Utilize a busca por CEP para agilizar.</p>
                </header>
                <div class="form-grid">
                  <div class="form-group span-3">
                    <label for="cliente-cep">CEP</label>
                    <div class="cep-field">
                      <input
                        id="cliente-cep"
                        v-model.trim="form.cep"
                        type="text"
                        inputmode="numeric"
                        maxlength="9"
                        placeholder="00000-000"
                        @keyup.enter.prevent="lookupCep"
                      />
                      <button type="button" class="btn btn-lookup" :disabled="cepState.loading" @click="lookupCep">
                        <span v-if="cepState.loading">Buscando…</span>
                        <span v-else>Buscar</span>
                      </button>
                    </div>
                    <small v-if="cepState.error" class="field-error">{{ cepState.error }}</small>
                  </div>
                  <div class="form-group span-6">
                    <label for="cliente-endereco">Logradouro</label>
                    <input id="cliente-endereco" v-model.trim="form.endereco" type="text" />
                  </div>
                  <div class="form-group span-3">
                    <label for="cliente-numero">Número</label>
                    <input id="cliente-numero" v-model.trim="form.numero" type="text" />
                  </div>
                  <div class="form-group span-3">
                    <label for="cliente-complemento">Complemento</label>
                    <input id="cliente-complemento" v-model.trim="form.complemento" type="text" />
                  </div>
                  <div class="form-group span-3">
                    <label for="cliente-bairro">Bairro</label>
                    <input id="cliente-bairro" v-model.trim="form.bairro" type="text" />
                  </div>
                  <div class="form-group span-4">
                    <label for="cliente-cidade">Cidade</label>
                    <input id="cliente-cidade" v-model.trim="form.cidade" type="text" />
                  </div>
                  <div class="form-group span-2">
                    <label for="cliente-estado">UF</label>
                    <input id="cliente-estado" v-model.trim="form.estado" type="text" maxlength="2" />
                  </div>
                </div>
              </section>

              <p v-if="formError" class="form-error">{{ formError }}</p>
            </div>
            <footer class="modal-footer">
              <button type="button" class="btn btn-outline" @click="closeDialog">Cancelar</button>
              <button type="submit" class="btn btn-primary" :disabled="saving || !isFormValid">
                <span v-if="saving">Salvando…</span>
                <span v-else>Salvar</span>
              </button>
            </footer>
          </form>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import BaseError from '@/components/ui/BaseError.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import { createClient, deleteClient, listClients, updateClient } from '@/services/clients'

const clients = ref([])
const loading = ref(false)
const loadError = ref('')
const isDialogOpen = ref(false)
const editingId = ref(null)
const saving = ref(false)
const formError = ref('')
const searchTermRaw = ref('')

const cepState = reactive({ loading: false, error: '' })

const DEFAULT_FORM = Object.freeze({
  nome: '',
  cpfcnpj: '',
  telefone: '',
  email: '',
  active: true,
  cep: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: ''
})

const form = reactive({ ...DEFAULT_FORM })

const searchTerm = computed({
  get: () => searchTermRaw.value,
  set: (value) => {
    searchTermRaw.value = (value || '').trimStart()
  }
})

const filteredClients = computed(() => {
  if (!searchTerm.value) return clients.value
  const query = searchTerm.value.toLowerCase()
  return clients.value.filter((client) => {
    const name = String(client.nome || '').toLowerCase()
    const doc = String(client.cpfcnpj || client.cpf || client.cnpj || '').toLowerCase()
    const city = String(client.cidade || client.city || '').toLowerCase()
    const status = isClientActive(client) ? 'ativo' : 'inativo'
    return name.includes(query) || doc.includes(query) || city.includes(query) || status.includes(query)
  })
})

const isFormValid = computed(() => !!form.nome)

function resetForm() {
  Object.assign(form, DEFAULT_FORM)
  editingId.value = null
  formError.value = ''
  cepState.loading = false
  cepState.error = ''
}

function normalizeClientPayload() {
  const cep = sanitizeCep(form.cep)
  return {
    nome: form.nome,
    cpfcnpj: sanitizeDigits(form.cpfcnpj),
    telefone: form.telefone,
    email: form.email,
  active: form.active !== false,
  ativo: form.active !== false,
    cep: cep || undefined,
    endereco: form.endereco,
    logradouro: form.endereco,
    numero: form.numero,
    numeroEndereco: form.numero,
    complemento: form.complemento,
    bairro: form.bairro,
    cidade: form.cidade,
    estado: (form.estado || '').toUpperCase(),
    uf: (form.estado || '').toUpperCase()
  }
}

async function loadClients() {
  loading.value = true
  loadError.value = ''
  try {
    const data = await listClients()
    clients.value = Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Erro ao carregar clientes', error)
    loadError.value = error?.message || 'Não foi possível carregar os clientes.'
  } finally {
    loading.value = false
  }
}

function openCreate() {
  resetForm()
  isDialogOpen.value = true
}

function openEdit(client) {
  if (!client) return
  editingId.value = client.id
  Object.assign(form, {
    nome: client.nome || '',
    cpfcnpj: sanitizeDigits(client.cpfcnpj || client.cpf || client.cnpj || ''),
    telefone: client.telefone || client.phone || '',
    email: client.email || '',
    active: isClientActive(client),
    cep: sanitizeCep(client.cep || client.CEP || ''),
    endereco: client.endereco || client.logradouro || '',
    numero: client.numero || client.numeroEndereco || '',
    complemento: client.complemento || '',
    bairro: client.bairro || '',
    cidade: client.cidade || client.city || '',
    estado: (client.estado || client.uf || '').toUpperCase()
  })
  isDialogOpen.value = true
}

function closeDialog() {
  if (saving.value) return
  isDialogOpen.value = false
}

async function saveClient() {
  if (!isFormValid.value) {
    formError.value = 'Preencha pelo menos o nome do cliente.'
    return
  }

  formError.value = ''
  saving.value = true

  try {
    const payload = normalizeClientPayload()
    if (editingId.value) {
      await updateClient(editingId.value, payload)
    } else {
      await createClient(payload)
    }
    await loadClients()
    isDialogOpen.value = false
    resetForm()
  } catch (error) {
    console.error('Erro ao salvar cliente', error)
    formError.value = extractValidationMessage(error) || error?.message || 'Não foi possível salvar o cliente.'
  } finally {
    saving.value = false
  }
}

async function confirmDelete(client) {
  if (!client?.id) return
  const shouldDelete = window.confirm(`Deseja realmente excluir o cliente ${client.nome || '#' + client.id}?`)
  if (!shouldDelete) return

  try {
    await deleteClient(client.id)
    clients.value = clients.value.filter((item) => item.id !== client.id)
  } catch (error) {
    console.error('Erro ao excluir cliente', error)
    formError.value = extractValidationMessage(error) || error?.message || 'Não foi possível excluir o cliente.'
  }
}

async function lookupCep() {
  const digits = sanitizeCep(form.cep)
  if (digits.length !== 8) {
    cepState.error = 'Informe um CEP válido com 8 dígitos.'
    return
  }

  cepState.loading = true
  cepState.error = ''

  try {
    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
    if (!response.ok) throw new Error('Falha ao consultar o CEP.')
    const data = await response.json()
    if (data?.erro) {
      cepState.error = 'CEP não encontrado.'
      return
    }

    form.cep = sanitizeCep(data.cep) || digits
    form.endereco = data.logradouro || form.endereco
    form.bairro = data.bairro || form.bairro
    form.cidade = data.localidade || form.cidade
    form.estado = (data.uf || form.estado || '').toUpperCase()
  } catch (error) {
    console.error('Erro ao consultar CEP', error)
    cepState.error = error?.message || 'Não foi possível buscar o CEP.'
  } finally {
    cepState.loading = false
  }
}

function sanitizeCep(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 8)
}

function sanitizeDigits(value) {
  return String(value || '').replace(/\D/g, '')
}

function formatCep(value) {
  const digits = sanitizeCep(value)
  if (digits.length !== 8) return digits || '-'
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

function isClientActive(client) {
  if (!client) return true
  const value = client.active
  const legacy = client.ativo
  if (typeof value === 'boolean') return value !== false
  if (typeof legacy === 'boolean') return legacy !== false
  if (value === 0 || legacy === 0) return false
  return !(value === 'false' || legacy === 'false')
}

function formatAddress(client) {
  if (!client) return '-'
  const parts = [
    client.endereco || client.logradouro,
    client.numero || client.numeroEndereco,
    client.bairro,
    client.cidade,
    (client.estado || client.uf)
  ].filter(Boolean)
  return parts.length ? parts.join(', ') : '-'
}

function extractValidationMessage(error) {
  if (!error) return ''
  const body = error.body || error.data || error.response?.data
  if (!body) return ''

  if (Array.isArray(body.errors) && body.errors.length) {
    const first = body.errors[0]
    if (typeof first === 'string') return first
    if (first?.defaultMessage) return first.defaultMessage
    if (first?.message) return first.message
    if (first?.field && first?.code) return `${first.field}: ${first.code}`
  }

  if (typeof body.message === 'string' && body.message.trim()) {
    return body.message
  }

  if (typeof body.error === 'string' && body.error.trim()) {
    return body.error
  }

  return ''
}

watch(
  () => form.cep,
  (value) => {
    if (!value) {
      cepState.error = ''
      return
    }
    const sanitized = sanitizeCep(value)
    if (sanitized !== value) form.cep = sanitized
    if (cepState.error) cepState.error = ''
  }
)

watch(
  () => form.estado,
  (value) => {
    if (!value) return
    const normalized = value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2)
    if (normalized !== value) form.estado = normalized
  }
)

onMounted(loadClients)
</script>

<style scoped>
.clients-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.page-title h2 {
  margin: 0;
  font-size: 1.85rem;
  font-weight: 700;
}

.page-title p {
  margin: 0.35rem 0 0;
  color: #6c757d;
  max-width: 520px;
}

.clients-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.clients-toolbar {
  display: flex;
  justify-content: flex-end;
}

.search-box {
  position: relative;
  width: min(360px, 100%);
}

.search-box i {
  position: absolute;
  top: 50%;
  left: 0.85rem;
  transform: translateY(-50%);
  color: #6c757d;
  font-size: 0.9rem;
}

.search-box input {
  width: 100%;
  padding: 0.6rem 0.85rem 0.6rem 2.35rem;
  border: 1px solid #ced4da;
  border-radius: 999px;
  background: #fff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.search-box input:focus {
  outline: none;
  border-color: #3d8bfd;
  box-shadow: 0 0 0 4px rgba(61, 139, 253, 0.15);
}

.empty-state {
  padding: 1.25rem;
  text-align: center;
  border: 1px dashed #ced4da;
  border-radius: 12px;
  color: #6c757d;
  background: #fff;
}

.clients-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.25rem;
  list-style: none;
  padding: 0;
  margin: 0;
}

.client-card {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 1.35rem;
  border: 1px solid #e9ecef;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 16px 30px rgba(12, 24, 48, 0.08);
}

.client-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.client-card__id {
  font-weight: 600;
  color: #3d8bfd;
}

.client-card__badge {
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: rgba(25, 135, 84, 0.12);
  color: #198754;
}

.client-card__badge--inactive {
  background: rgba(220, 53, 69, 0.12);
  color: #d6334c;
}

.client-card__body h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
}

.client-card__doc {
  margin: 0.15rem 0 0;
  color: #495057;
  font-weight: 500;
}

.client-card dl {
  margin: 0.85rem 0 0;
  display: grid;
  gap: 0.65rem;
}

.client-card dl div {
  display: grid;
  gap: 0.25rem;
}

.client-card dt {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.85rem;
  color: #6c757d;
}

.client-card dd {
  margin: 0;
  font-size: 0.95rem;
  color: #212529;
}

.client-card__actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn-card {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border: none;
  border-radius: 999px;
  padding: 0.55rem 1rem;
  font-weight: 600;
  cursor: pointer;
  background: #f1f3f5;
  color: #495057;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.btn-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 18px rgba(15, 30, 60, 0.08);
}

.btn-card--danger {
  background: rgba(220, 53, 69, 0.15);
  color: #d6334c;
}

.modal {
  position: fixed;
  inset: 0;
  background: rgba(10, 20, 40, 0.45);
  display: none;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  z-index: 1000;
}

.modal.show {
  display: flex;
}

.modal-dialog {
  width: min(1100px, 100%);
  max-height: 90vh;
}

.modal-content {
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 40px 80px rgba(15, 30, 60, 0.25);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #0d6efd 0%, #3d8bfd 60%, #70a1ff 100%);
  color: #fff;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.35rem;
}

.btn-close {
  border: none;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
}

.btn-close:hover {
  background: rgba(255, 255, 255, 0.26);
  transform: translateY(-1px);
}

.modal-form {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.modal-body {
  padding: 1.75rem;
  background: #f8f9fb;
  overflow-y: auto;
  max-height: calc(90vh - 160px);
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.form-section header h4 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
}

.form-section header p {
  margin: 0.4rem 0 0;
  font-size: 0.9rem;
  color: #6c757d;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 1rem;
  margin-top: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-group label {
  font-weight: 600;
  color: #495057;
}

.form-group input,
.form-group select {
  border: 1px solid #ced4da;
  border-radius: 10px;
  padding: 0.65rem 0.75rem;
  background: #fff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #3d8bfd;
  box-shadow: 0 0 0 4px rgba(61, 139, 253, 0.15);
}

.span-6 { grid-column: span 6; }
.span-4 { grid-column: span 4; }
.span-3 { grid-column: span 3; }
.span-2 { grid-column: span 2; }

.cep-field {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.cep-field input {
  flex: 1;
}

.btn-lookup {
  border: none;
  border-radius: 999px;
  padding: 0.55rem 1.2rem;
  font-weight: 600;
  cursor: pointer;
  background: linear-gradient(135deg, #0d6efd 0%, #3d8bfd 60%, #70a1ff 100%);
  color: #fff;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.btn-lookup:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.btn-lookup:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 24px rgba(61, 139, 253, 0.25);
}

.field-error {
  color: #d6334c;
  font-size: 0.8rem;
}

.form-error {
  margin: 0;
  color: #d6334c;
  font-weight: 600;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.35rem 1.75rem;
  background: #fff;
  border-top: 1px solid #edf2f7;
}

.btn-outline {
  border: 1px solid #ced4da;
  background: #fff;
  color: #495057;
  border-radius: 999px;
  padding: 0.65rem 1.4rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-outline:hover {
  border-color: #3d8bfd;
  color: #3d8bfd;
  transform: translateY(-1px);
  box-shadow: 0 10px 20px rgba(61, 139, 253, 0.15);
}

.btn-primary {
  border: none;
  border-radius: 999px;
  padding: 0.7rem 1.6rem;
  font-weight: 600;
  cursor: pointer;
  background: linear-gradient(135deg, #198754 0%, #21a366 60%, #3ecf8e 100%);
  color: #fff;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.btn-primary:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 18px 32px rgba(33, 163, 102, 0.28);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

@media (max-width: 960px) {
  .form-grid {
    grid-template-columns: repeat(6, 1fr);
  }

  .span-6 { grid-column: span 6; }
  .span-4 { grid-column: span 6; }
  .span-3 { grid-column: span 3; }
  .span-2 { grid-column: span 3; }
}

@media (max-width: 720px) {
  .page-header {
    align-items: stretch;
  }

  .form-grid {
    grid-template-columns: repeat(4, 1fr);
  }

  .span-6,
  .span-4,
  .span-3,
  .span-2 {
    grid-column: span 4;
  }
}

@media (max-width: 560px) {
  .clients-grid {
    grid-template-columns: 1fr;
  }

  .modal-body {
    padding: 1.25rem;
  }
}
</style>
