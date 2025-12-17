<template>
  <section class="content-area route-detail">
    <header class="detail-header">
      <div class="header-left">
        <button class="btn-back" type="button" @click="goBack">
          <i class="fa-solid fa-arrow-left"></i>
          <span>Voltar</span>
        </button>
        <div class="header-title">
          <h2>{{ form.nome || 'Rota' }}</h2>
          <span class="status-pill" :class="statusClass">{{ statusLabel }}</span>
        </div>
      </div>
      <button class="btn-delete" type="button" @click="deleteCurrentRoute" :disabled="saving || deleting">
        <i class="fa-solid fa-trash"></i>
        <span v-if="deleting">Excluindo…</span>
        <span v-else>Excluir rota</span>
      </button>
    </header>

    <BaseError v-if="loadError" :message="loadError" :retry="loadAll" />
    <BaseLoading v-else-if="initialLoading" message="Carregando dados da rota…" />

    <form v-else class="detail-form" @submit.prevent="saveAll">
      <div class="detail-grid">
        <section class="card route-card">
          <h3 class="section-title">Dados da rota</h3>
          <div class="form-grid">
            <div class="form-group form-group-large">
              <label for="nome">Nome</label>
              <input id="nome" class="form-control" v-model.trim="form.nome" required />
            </div>
            <div class="form-group">
              <label for="motorista">Motorista</label>
              <input id="motorista" class="form-control" v-model.trim="form.motorista" />
            </div>
            <div class="form-group">
              <label for="veiculo">Veículo</label>
              <input id="veiculo" class="form-control" v-model.trim="form.veiculo" />
            </div>
            <div class="form-group">
              <label for="status">Status</label>
              <select id="status" class="form-control" v-model="form.ativa">
                <option :value="true">Ativa</option>
                <option :value="false">Inativa</option>
              </select>
            </div>
          </div>
        </section>

        <section class="card points-card">
          <div class="points-card-header">
            <div>
              <h3 class="section-title">Clientes da rota</h3>
              <p class="section-hint">Organize os clientes como preferir e inclua novos quando necessário.</p>
            </div>
            <div class="add-point-group">
              <label class="sr-only" for="novo-cliente">Adicionar cliente</label>
              <select id="novo-cliente" class="form-control" v-model="addClientId" :disabled="loadingClients || !availableClientOptions.length">
                <option value="" disabled>Selecione um cliente</option>
                <option v-for="option in availableClientOptions" :key="option.id" :value="option.id">
                  {{ option.label }}
                </option>
              </select>
              <button class="btn-add" type="button" @click="addClient" :disabled="!addClientId || saving">
                <i class="fa-solid fa-plus"></i>
                Adicionar
              </button>
            </div>
            <small v-if="!loadingClients && !availableClientOptions.length" class="all-used-hint">Todos os clientes disponíveis já estão associados.</small>
          </div>

          <BaseLoading v-if="loadingClients" message="Carregando clientes…" />
          <ul v-else-if="routeClients.length" class="points-list">
            <li v-for="(client, index) in routeClients" :key="getClientIdentifier(client)" class="point-item">
              <span class="point-index">{{ index + 1 }}</span>
              <div class="point-info">
                <strong>{{ resolveClientName(client, index) }}</strong>
                <small v-if="resolveClientCity(client)">{{ resolveClientCity(client) }}</small>
              </div>
              <div class="point-actions">
                <div class="reorder-group">
                  <button class="btn-move" type="button" aria-label="Mover para cima" @click="moveClient(index, index - 1)" :disabled="index === 0">
                    <i class="fa-solid fa-arrow-up"></i>
                  </button>
                  <button class="btn-move" type="button" aria-label="Mover para baixo" @click="moveClient(index, index + 1)" :disabled="index === routeClients.length - 1">
                    <i class="fa-solid fa-arrow-down"></i>
                  </button>
                </div>
                <button class="btn-remove" type="button" @click="removeClient(client)" :disabled="saving">
                  <i class="fa-solid fa-trash"></i>
                  Remover
                </button>
              </div>
            </li>
          </ul>
          <div v-else class="empty-points">Nenhum cliente cadastrado nesta rota.</div>
        </section>
      </div>

      <div class="form-feedback">
        <p v-if="errorMsg" class="feedback feedback-error">{{ errorMsg }}</p>
        <p v-if="successMsg" class="feedback feedback-success">{{ successMsg }}</p>
      </div>

      <footer class="form-footer">
        <button class="btn-secondary" type="button" @click="goBack" :disabled="saving">Cancelar</button>
        <button class="btn-primary" type="submit" :disabled="saving">
          <span v-if="saving">Salvando…</span>
          <span v-else>Salvar alterações</span>
        </button>
      </footer>
    </form>
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseError from '@/components/ui/BaseError.vue'
import { getRoute, updateRoute, deleteRoute } from '@/services/routes'
import { listClients } from '@/services/clients'

const route = useRoute()
const router = useRouter()

const initialLoading = ref(true)
const loadingClients = ref(false)
const loadError = ref('')
const errorMsg = ref('')
const successMsg = ref('')
const saving = ref(false)
const deleting = ref(false)
const routeRecord = ref(null)
const routeClients = ref([])
const allClients = ref([])
const addClientId = ref('')

const form = reactive({ nome: '', motorista: '', veiculo: '', ativa: true })

const currentId = computed(() => route.params.id)

const availableClientOptions = computed(() => {
  const used = new Set(routeClients.value.map(item => getClientIdentifier(item)))
  return allClients.value
    .filter(client => client && !used.has(getClientIdentifier(client)))
    .map(client => {
      const identifier = getClientIdentifier(client)
      const fallback = identifier ? `Cliente ${identifier}` : 'Cliente'
      return {
        id: identifier,
        label: client.nome || client.name || client.razaoSocial || fallback,
      }
    })
})

const statusLabel = computed(() => (form.ativa ? 'Ativa' : 'Inativa'))
const statusClass = computed(() => (form.ativa ? 'pill-active' : 'pill-inactive'))

function resetAddClientInput() {
  addClientId.value = ''
}

async function loadAll() {
  if (!currentId.value) {
    loadError.value = 'Rota não encontrada.'
    return
  }
  initialLoading.value = true
  loadError.value = ''
  errorMsg.value = ''
  successMsg.value = ''
  resetAddClientInput()
  try {
    const [routeData, clientsData] = await Promise.all([
      getRoute(currentId.value),
      listClients(),
    ])
    if (!routeData || !routeData.id) {
      loadError.value = 'Rota não encontrada.'
      return
    }
    routeRecord.value = routeData
    form.nome = routeData.nome || routeData.name || ''
    form.motorista = routeData.motorista || ''
    form.veiculo = routeData.veiculo || ''
    form.ativa = routeData.ativa !== false
    allClients.value = Array.isArray(clientsData) ? clientsData : []
    routeClients.value = mapRouteClients(routeData, allClients.value)
  } catch (e) {
    loadError.value = e?.message || 'Erro ao carregar dados da rota'
  } finally {
    initialLoading.value = false
    loadingClients.value = false
  }
}

function mapRouteClients(routeData, clientsList) {
  const rawEntries = Array.isArray(routeData?.clientes)
    ? routeData.clientes
    : Array.isArray(routeData?.pontos)
      ? routeData.pontos
      : []
  if (!rawEntries.length) return []
  const clientMap = new Map(clientsList.map(client => [getClientIdentifier(client), client]))
  return rawEntries.map((entry, index) => {
    if (entry && typeof entry === 'object') {
      return normalizeClient(entry, index)
    }
    const idKey = entry != null ? String(entry) : ''
    const client = idKey ? clientMap.get(idKey) : undefined
    return normalizeClient(client ?? { id: entry }, index)
  })
}

function moveClient(oldIndex, newIndex) {
  if (newIndex < 0 || newIndex >= routeClients.value.length || oldIndex === newIndex) return
  const updated = routeClients.value.slice()
  const [moved] = updated.splice(oldIndex, 1)
  updated.splice(newIndex, 0, moved)
  routeClients.value = updated.map((item, index) => ({ ...item, ordem: index + 1 }))
}

function removeClient(client) {
  const targetId = getClientIdentifier(client)
  if (!targetId) return
  routeClients.value = routeClients.value
    .filter(item => getClientIdentifier(item) !== targetId)
    .map((item, index) => ({ ...item, ordem: index + 1 }))
}

function addClient() {
  if (!addClientId.value) return
  const client = allClients.value.find(item => getClientIdentifier(item) === String(addClientId.value))
  if (!client) return
  routeClients.value = routeClients.value
    .concat(normalizeClient(client, routeClients.value.length))
    .map((item, index) => ({ ...item, ordem: index + 1 }))
  resetAddClientInput()
}

function getClientIdentifier(client) {
  if (!client) return ''
  const raw = client.id ?? client.clientId ?? client.pid
  return raw != null ? String(raw) : ''
}

function normalizeClient(client, index = 0) {
  const rawId = client?.id ?? client?.clientId ?? client?.pid
  const numericId = Number(rawId)
  const id = Number.isNaN(numericId) ? rawId : numericId
  return {
    ...client,
    id,
    clientId: client?.clientId ?? id,
    nome: client?.nome || client?.name || client?.razaoSocial || '',
  endereco: client?.endereco || client?.address || client?.companyAddress || '',
  cidade: client?.cidade || client?.city || client?.municipio || client?.localidade || client?.cityName || '',
  estado: client?.estado || client?.uf || client?.state || client?.province || '',
    ordem: (typeof client?.ordem === 'number' && client.ordem > 0) ? client.ordem : index + 1,
  }
}

function resolveClientName(client, index = 0) {
  const name = client?.nome || client?.name || client?.razaoSocial
  if (name) return name
  const identifier = getClientIdentifier(client)
  return identifier ? `Cliente ${identifier}` : `Cliente ${index + 1}`
}

function resolveClientCity(client) {
  if (!client) return ''
  const city = (client.cidade || client.city || client.municipio || client.localidade || client.cityName || '').toString().trim()
  const state = (client.estado || client.uf || client.state || client.province || '').toString().trim().toUpperCase()
  if (city && state) return `${city} - ${state}`
  return city || state || ''
}

async function saveAll() {
  if (!routeRecord.value || !routeRecord.value.id) return
  if (!form.nome) {
    errorMsg.value = 'Nome é obrigatório.'
    return
  }
  errorMsg.value = ''
  successMsg.value = ''
  saving.value = true
  try {
    const orderedIds = routeClients.value.map(client => {
      const raw = client.id ?? client.clientId ?? client.pid
      const numeric = Number(raw)
      return Number.isNaN(numeric) ? raw : numeric
    })
    const payload = {
      nome: form.nome,
      motorista: form.motorista,
      veiculo: form.veiculo,
      ativa: form.ativa !== false,
      clientes: orderedIds,
    }
    await updateRoute(routeRecord.value.id, payload)
    successMsg.value = 'Rota atualizada com sucesso.'
    await refreshClients()
  } catch (e) {
    errorMsg.value = e?.message || 'Erro ao salvar rota'
  } finally {
    saving.value = false
  }
}

async function refreshClients() {
  if (!routeRecord.value?.id) return
  loadingClients.value = true
  try {
    const updated = await getRoute(routeRecord.value.id)
    if (updated) {
      routeRecord.value = { ...routeRecord.value, ...updated }
      routeClients.value = mapRouteClients(updated, allClients.value)
    }
    resetAddClientInput()
  } catch (e) {
    errorMsg.value = e?.message || 'Erro ao atualizar clientes'
  } finally {
    loadingClients.value = false
  }
}

function goBack() {
  router.push({ name: 'rotas' })
}

async function deleteCurrentRoute() {
  if (!routeRecord.value?.id || deleting.value) return
  const confirmed = window.confirm('Tem certeza que deseja excluir esta rota? Essa ação não pode ser desfeita.')
  if (!confirmed) return
  errorMsg.value = ''
  successMsg.value = ''
  deleting.value = true
  try {
    await deleteRoute(routeRecord.value.id)
    router.push({ name: 'rotas' })
  } catch (e) {
    errorMsg.value = e?.message || 'Erro ao excluir rota'
  } finally {
    deleting.value = false
  }
}

onMounted(loadAll)

watch(() => route.params.id, (next, prev) => {
  if (next !== prev) loadAll()
})
</script>

<style scoped>
.route-detail {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-height: 100vh;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border: none;
  background: #f1f3f5;
  color: #495057;
  padding: 0.55rem 1.1rem;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
}

.btn-back:hover {
  background: #e9ecef;
  transform: translateY(-1px);
}

.btn-delete {
  border: none;
  background: rgba(220, 53, 69, 0.12);
  color: #b02a37;
  padding: 0.55rem 1.4rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
}

.btn-delete:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-delete:not(:disabled):hover {
  background: rgba(220, 53, 69, 0.2);
  transform: translateY(-1px);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-title h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
}

.status-pill {
  padding: 0.35rem 0.9rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
}

.pill-active {
  background: rgba(25, 135, 84, 0.12);
  color: #198754;
}

.pill-inactive {
  background: rgba(220, 53, 69, 0.12);
  color: #d6334c;
}

.detail-form {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 360px) minmax(0, 1fr);
  gap: 1.5rem;
  align-items: stretch;
}

.card {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #e9ecef;
  box-shadow: 0 16px 30px rgba(12, 24, 48, 0.08);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.section-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #212529;
}

.section-hint {
  margin: 0.35rem 0 0;
  font-size: 0.9rem;
  color: #6c757d;
}

.points-card {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
  min-height: 100vh;
}
.points-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.add-point-group {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.add-point-group .form-control {
  min-width: 220px;
}

.btn-add {
  border: none;
  background: linear-gradient(135deg, #0d6efd 0%, #3d8bfd 100%);
  color: #fff;
  padding: 0.55rem 1.4rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.btn-add:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-add:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 16px rgba(13, 110, 253, 0.25);
}

.all-used-hint {
  margin-top: 0.35rem;
  font-size: 0.85rem;
  color: #6c757d;
}

.points-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  flex: 1;
  overflow-y: auto;
  width: 100%;
}

.point-item {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.85rem 1rem;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 8px 18px rgba(15, 30, 60, 0.05);
  width: 100%;
}

.point-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #edf2ff;
  color: #2643ff;
  font-weight: 700;
}

.point-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
  
}

.point-info strong {
  font-size: 1rem;
  color: #212529;
}

.point-info small {
  font-size: 0.85rem;
  color: #6c757d;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.point-actions {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.reorder-group {
  display: inline-flex;
  flex-direction: column;
  gap: 0.4rem;
}

.btn-move {
  border: none;
  background: #f1f5ff;
  color: #1b4fe0;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
}

.btn-move:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-move:not(:disabled):hover {
  background: #dbe6ff;
  transform: translateY(-1px);
}

.btn-remove {
  border: none;
  background: rgba(220, 53, 69, 0.12);
  color: #d6334c;
  padding: 0.45rem 1rem;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
}

.btn-remove:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-remove:not(:disabled):hover {
  background: rgba(220, 53, 69, 0.2);
  transform: translateY(-1px);
}

.empty-points {
  padding: 1rem;
  border: 1px dashed #ced4da;
  border-radius: 12px;
  text-align: center;
  color: #6c757d;
}

.form-feedback {
  min-height: 1.2rem;
}

.feedback {
  margin: 0;
  font-size: 0.9rem;
}

.feedback-error {
  color: #d6334c;
}

.feedback-success {
  color: #198754;
}

.form-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.btn-secondary,
.btn-primary {
  border: none;
  border-radius: 999px;
  padding: 0.6rem 1.6rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.btn-secondary {
  background: #f1f3f5;
  color: #495057;
}

.btn-secondary:hover:not(:disabled) {
  background: #e9ecef;
  transform: translateY(-1px);
}

.btn-primary {
  background: linear-gradient(135deg, #198754 0%, #21a366 60%, #3ecf8e 100%);
  color: #fff;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 22px rgba(33, 163, 102, 0.25);
}

@media (max-width: 960px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .detail-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-left {
    width: 100%;
    justify-content: space-between;
  }

  .btn-delete {
    width: 100%;
    justify-content: center;
  }

  .form-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .btn-secondary,
  .btn-primary,
  .btn-add {
    width: 100%;
    justify-content: center;
  }

  .reorder-group {
    flex-direction: row;
  }
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
</style>
