<template>
  <section class="content-area">
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;gap:1rem;">
      <h2 style="margin:0;">Rotas</h2>
      <div class="page-actions" style="display:flex;gap:.5rem;">
  <button class="btn btn-primary" @click="openNew">Nova Rota</button>
      </div>
    </div>

    <BaseError v-if="loadError" :message="loadError" :retry="load" />
    <BaseLoading v-else-if="loading" message="Carregando rotas…" />
    <div class="routes-container" v-else>
      <div class="routes-toolbar" v-if="routes.length">
        <label class="sr-only" for="buscar-rota">Buscar rota</label>
        <div class="search-box">
          <i class="fa-solid fa-search"></i>
          <input
            id="buscar-rota"
            v-model.trim="routeSearch"
            type="search"
            placeholder="Pesquisar rota pelo nome ou motorista"
          />
        </div>
      </div>
      <div v-if="!filteredRoutes.length" class="empty-routes">
        Nenhuma rota encontrada.
      </div>
      <ul v-else class="routes-list" aria-label="Lista de rotas">
        <li v-for="r in filteredRoutes" :key="r.id" class="route-card" role="button" tabindex="0" @click="openDetails(r)" @keyup.enter.space="openDetails(r)">
          <div class="route-name">
            <span>{{ r.nome || r.name || `Rota ${r.id}` }}</span>
            <small v-if="r.motorista || r.veiculo">
              {{ r.motorista || 'Motorista indefinido' }}
              <template v-if="r.veiculo"> · {{ r.veiculo }}</template>
            </small>
          </div>
          <i class="fa-solid fa-chevron-right route-chevron" aria-hidden="true"></i>
        </li>
      </ul>
    </div>

    <div class="modal" role="dialog" aria-hidden="true" :class="{ show: showModal }" @click.self="close">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h3>{{ editId ? 'Editar Rota' : 'Nova Rota' }}</h3>
            <button type="button" class="btn-close" @click="close" aria-label="Fechar"><i class="fa-solid fa-times"></i></button>
          </div>
          <form @submit.prevent="save">
            <div class="modal-body">
              <div class="form-grid">
                <div class="form-group form-group-large">
                  <label for="nome">Nome da rota</label>
                  <input id="nome" class="form-control" v-model.trim="form.nome" required />
                </div>
                <div class="form-group">
                  <label for="ativa">Status</label>
                  <select id="ativa" class="form-control" v-model="form.ativa">
                    <option :value="true">Ativa</option>
                    <option :value="false">Inativa</option>
                  </select>
                </div>
              </div>
              <section class="clients-section">
                <header>
                  <h4>Clientes da rota</h4>
                  <p>Selecione os clientes que farão parte dessa rota.</p>
                </header>
                <div class="clients-toolbar" v-if="!clientsLoading && !clientsError && clients.length">
                  <label class="sr-only" for="buscar-cliente">Buscar cliente</label>
                  <div class="search-box">
                    <i class="fa-solid fa-search"></i>
                    <input
                      id="buscar-cliente"
                      v-model.trim="clientSearch"
                      type="search"
                      placeholder="Pesquisar cliente por nome, razão social ou documento"
                    />
                  </div>
                </div>
                <BaseLoading v-if="clientsLoading" message="Carregando clientes…" />
                <BaseError
                  v-else-if="clientsError"
                  :message="clientsError"
                  :retry="ensureClientsLoaded"
                />
                <div v-else-if="!clients.length" class="empty-clients">Nenhum cliente cadastrado.</div>
                <div v-else-if="clients.length && !filteredClients.length" class="empty-clients">Nenhum cliente encontrado para a busca.</div>
                <ul v-else class="clients-list">
                  <li v-for="client in filteredClients" :key="client.id" class="client-option">
                    <label>
                      <input
                        type="checkbox"
                        v-model="selectedClients"
                        :value="String(client.id)"
                      />
                      <span>
                        <strong>{{ client.nome || client.name || `Cliente ${client.id}` }}</strong>
                        <small v-if="client.razaoSocial || client.cnpj">{{ client.razaoSocial || client.cnpj }}</small>
                      </span>
                    </label>
                  </li>
                </ul>
              </section>
              <div v-if="errorMsg" class="modal-error">{{ errorMsg }}</div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline" @click="close">Cancelar</button>
              <button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? 'Salvando…' : 'Salvar rota' }}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </section>
  
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { listRoutes, createRoute, updateRoute } from '@/services/routes'
import { listClients } from '@/services/clients'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseError from '@/components/ui/BaseError.vue'

const router = useRouter()

const routes = ref([])
const loading = ref(false)
const loadError = ref('')
const showModal = ref(false)
const editId = ref(null)
const form = reactive({ nome:'', ativa:true })
const errorMsg = ref('')
const successMsg = ref('')
const clients = ref([])
const clientsLoading = ref(false)
const clientsError = ref('')
const selectedClients = ref([])
const saving = ref(false)
const clientSearch = ref('')
const routeSearch = ref('')

const filteredClients = computed(() => {
  if (!clientSearch.value) return clients.value
  const query = clientSearch.value.toLowerCase()
  return clients.value.filter(client => {
    const name = String(client.nome || client.name || '').toLowerCase()
    const razao = String(client.razaoSocial || '').toLowerCase()
    const doc = String(client.cnpj || client.cpf || '').toLowerCase()
    return name.includes(query) || razao.includes(query) || doc.includes(query)
  })
})

function resetForm(){
  form.nome=''
  form.ativa=true
  editId.value=null
  errorMsg.value=''
  selectedClients.value=[]
  clientSearch.value=''
}

async function ensureClientsLoaded(){
  if (clients.value.length || clientsLoading.value) return
  clientsLoading.value = true
  clientsError.value = ''
  try {
    const data = await listClients()
    clients.value = Array.isArray(data) ? data : []
  } catch (e) {
    clientsError.value = e?.message || 'Erro ao carregar clientes'
  } finally {
    clientsLoading.value = false
  }
}

async function openNew(){
  resetForm()
  showModal.value = true
  await ensureClientsLoaded()
}
function close(){ showModal.value = false }

function openDetails(route) {
  if (!route?.id) return
  router.push({ name: 'rota-detalhe', params: { id: route.id } })
}

async function load(){
  loading.value = true; loadError.value = ''
  try { routes.value = await listRoutes() }
  catch(e){ loadError.value = e?.message || 'Erro ao carregar rotas' }
  finally { loading.value = false }
}

const filteredRoutes = computed(() => {
  if (!routeSearch.value) return routes.value
  const query = routeSearch.value.toLowerCase()
  return routes.value.filter(route => {
    const name = String(route.nome || route.name || '').toLowerCase()
    const driver = String(route.motorista || '').toLowerCase()
    const clients = Array.isArray(route.clientes)
      ? route.clientes.map(client => (client?.nome || client?.name || '')).join(' ').toLowerCase()
      : ''
    return name.includes(query) || driver.includes(query) || clients.includes(query)
  })
})

async function save(){
  errorMsg.value=''; successMsg.value=''
  if (!form.nome) { errorMsg.value='Nome é obrigatório.'; return }
  // backend expects `name` and `modelo` (DTO uses `pontos` as alias for clientes)
  const payload = {
    name: form.nome,
    modelo: !!form.ativa,
    pontos: selectedClients.value.map(id => {
      const numeric = Number(id)
      return Number.isNaN(numeric) ? id : numeric
    })
  }
  try {
    saving.value = true
    const response = editId.value
      ? await updateRoute(editId.value, payload)
      : await createRoute(payload)
    if (!editId.value && response?.id) {
      routes.value.push(response)
    } else {
      await load()
    }
    close()
    resetForm()
  } catch (e) {
    errorMsg.value = e?.message || 'Erro ao salvar'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await Promise.all([load(), ensureClientsLoaded()])
})

watch(routeSearch, (value) => {
  routeSearch.value = value.trimStart()
})
</script>

<style scoped>
.routes-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.routes-toolbar {
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
  padding: 0.6rem 0.75rem 0.6rem 2.35rem;
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

.empty-routes {
  padding: 1.25rem;
  border: 1px dashed #ced4da;
  border-radius: 12px;
  text-align: center;
  color: #6c757d;
  background: #fff;
}

.routes-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  margin: 0;
  padding: 0;
}

.route-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1rem;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 6px 16px rgba(15, 30, 60, 0.06);
}

.route-name {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  color: inherit;
  padding: 0;
}

.route-name span {
  font-size: 1.1rem;
  font-weight: 600;
  color: #212529;
}

.route-name small {
  font-size: 0.85rem;
  color: #6c757d;
}

.route-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.route-actions .btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.9rem;
}

.clients-section {
  margin-top: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.clients-toolbar {
  display: flex;
  align-items: center;
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
  padding: 0.6rem 0.75rem 0.6rem 2.35rem;
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

.clients-section header h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.clients-section header p {
  margin: 0.15rem 0 0;
  color: #6c757d;
  font-size: 0.9rem;
}

.clients-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 420px;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 0.65rem;
}

.client-option label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.75rem;
  border: 1px solid #e9ecef;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.client-option label:hover {
  border-color: #3d8bfd;
  box-shadow: 0 6px 16px rgba(30, 60, 120, 0.08);
}

.client-option input[type='checkbox'] {
  width: 18px;
  height: 18px;
}

.client-option span {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.client-option strong {
  font-size: 0.95rem;
  color: #212529;
}

.client-option small {
  font-size: 0.8rem;
  color: #6c757d;
}

.empty-clients {
  border: 1px dashed #ced4da;
  border-radius: 10px;
  padding: 1rem;
  text-align: center;
  color: #6c757d;
}

.modal.show .modal-dialog {
  transform: translateY(0);
}

.modal-dialog {
  width: min(1240px, 95vw);
  margin: 4rem auto;
  transition: transform 0.25s ease;
  transform: translateY(20px);
}

.modal-content {
  border-radius: 18px;
  border: none;
  box-shadow: 0 28px 60px rgba(15, 30, 60, 0.2);
  overflow: hidden;
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid #edf2f7;
  background: linear-gradient(135deg, #0d6efd 0%, #3d8bfd 60%, #70a1ff 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
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

.modal-body {
  padding: 1.75rem;
  background: #f8f9fb;
}

.modal-footer {
  padding: 1.35rem 1.75rem;
  border-top: 1px solid #edf2f7;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  background: #fff;
}

.modal-error {
  margin-top: 1.1rem;
  color: #d6334c;
  font-weight: 500;
}

.modal-footer .btn {
  min-width: 130px;
}

.btn-outline {
  border: 1px solid #ced4da;
  background: #fff;
  color: #495057;
  border-radius: 999px;
  padding: 0.6rem 1.4rem;
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
  padding: 0.65rem 1.6rem;
  font-weight: 600;
  cursor: pointer;
  background: linear-gradient(135deg, #198754 0%, #21a366 60%, #3ecf8e 100%);
  color: #fff;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.btn-primary:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.btn-primary:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 18px 32px rgba(33, 163, 102, 0.28);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

@media (max-width: 640px) {
  .modal-dialog {
    margin: 2rem auto;
  }

  .modal-header,
  .modal-body,
  .modal-footer {
    padding: 1.25rem;
  }

  .modal-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .modal-footer .btn {
    width: 100%;
  }

  .clients-toolbar {
    justify-content: stretch;
  }

  .search-box {
    width: 100%;
  }

  .clients-list {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    max-height: 320px;
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
