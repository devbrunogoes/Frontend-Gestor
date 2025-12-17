<template>
  <section class="content-area">
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;gap:1rem;">
      <h2 style="margin:0;">Pontos</h2>
      <div class="page-actions" style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;">
        <select class="form-control" v-model="routeFilter" style="min-width:220px">
          <option :value="''">Todas as Rotas</option>
          <option value="__none__">Sem rota</option>
          <option v-for="r in routes" :key="r.id" :value="String(r.id)">{{ r.nome || r.name }}</option>
        </select>
        <button class="btn btn-primary" @click="openNew">Novo Ponto</button>
      </div>
    </div>

    <BaseError v-if="loadError" :message="loadError" :retry="load" />
    <BaseLoading v-else-if="loading" message="Carregando pontos…" />
    <div class="table-wrap" v-else>
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Rota</th>
            <th>Nome</th>
            <th>Cliente</th>
            <th>Endereço</th>
            <th>Lat</th>
            <th>Lng</th>
            <th>Ordem</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in filteredPoints" :key="p.id">
            <td>{{ p.id }}</td>
            <td>{{ routeName(p.routeId) }}</td>
            <td>{{ p.nome || p.name }}</td>
            <td>{{ clientName(p.clientId) }}</td>
            <td>{{ p.endereco || '-' }}</td>
            <td>{{ p.lat || p.latitude || '-' }}</td>
            <td>{{ p.lng || p.longitude || '-' }}</td>
            <td>{{ p.ordem || '-' }}</td>
            <td>{{ p.ativo !== false ? 'Ativo' : 'Inativo' }}</td>
            <td>
              <button class="btn-icon btn-warning" @click="openEdit(p)" title="Editar"><i class="fa-solid fa-pen"></i></button>
              <button class="btn-icon btn-danger" @click="onDelete(p)" title="Excluir"><i class="fa-solid fa-trash"></i></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="modal" role="dialog" aria-hidden="true" :class="{ show: showModal }" @click.self="close">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h3>{{ editId ? 'Editar Ponto' : 'Novo Ponto' }}</h3>
            <button type="button" class="btn-close" @click="close" aria-label="Fechar"><i class="fa-solid fa-times"></i></button>
          </div>
          <form @submit.prevent="save">
            <div class="modal-body">
              <div class="form-grid">
                <div class="form-group">
                  <label for="rota">Rota (opcional)</label>
                  <select id="rota" class="form-control" v-model="form.routeId">
                    <option :value="''">Sem rota</option>
                    <option v-for="r in routes" :key="r.id" :value="String(r.id)">{{ r.nome || r.name }}</option>
                  </select>
                </div>
                <div class="form-group form-group-large">
                  <label for="nome">Nome</label>
                  <input id="nome" class="form-control" v-model.trim="form.nome" required />
                </div>
                <div class="form-group form-group-large">
                  <label for="cliente">Cliente (opcional)</label>
                  <select id="cliente" class="form-control" v-model="form.clientId" @change="onClientChange">
                    <option :value="''">Sem cliente</option>
                    <option v-for="c in clients" :key="c.id" :value="String(c.id)">{{ c.nome || c.name }}</option>
                  </select>
                </div>
                <div class="form-group form-group-large">
                  <label for="endereco">Endereço</label>
                  <input id="endereco" class="form-control" v-model.trim="form.endereco" />
                </div>
                <div class="form-group">
                  <label for="lat">Latitude</label>
                  <input id="lat" class="form-control" v-model.number="form.lat" />
                </div>
                <div class="form-group">
                  <label for="lng">Longitude</label>
                  <input id="lng" class="form-control" v-model.number="form.lng" />
                </div>
                <div class="form-group">
                  <label for="ordem">Ordem</label>
                  <input id="ordem" class="form-control" type="number" min="1" v-model.number="form.ordem" />
                </div>
                <div class="form-group">
                  <label for="ativo">Status</label>
                  <select id="ativo" class="form-control" v-model="form.ativo">
                    <option :value="true">Ativo</option>
                    <option :value="false">Inativo</option>
                  </select>
                </div>
              </div>
              <div v-if="errorMsg" style="color:#dc3545">{{ errorMsg }}</div>
              <div v-if="successMsg" style="color:#198754">{{ successMsg }}</div>
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
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { listRoutes } from '@/services/routes'
import { listPoints, createPoint, updatePoint, deletePoint } from '@/services/points'
import { listClients } from '@/services/clients'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseError from '@/components/ui/BaseError.vue'

const routes = ref([])
const points = ref([])
const clients = ref([])
const routeFilter = ref('')
const loading = ref(false)
const loadError = ref('')

const showModal = ref(false)
const editId = ref(null)
const form = reactive({ routeId:'', clientId:'', nome:'', endereco:'', lat:'', lng:'', ordem:1, ativo:true })
const errorMsg = ref('')
const successMsg = ref('')

const filteredPoints = computed(() => {
  if (!routeFilter.value) return points.value
  if (routeFilter.value === '__none__') return points.value.filter(p => !p.routeId)
  return points.value.filter(p => String(p.routeId) === String(routeFilter.value))
})

function routeName(id){ const r = routes.value.find(r => String(r.id) === String(id)); return r ? (r.nome || r.name) : '-' }
function clientName(id){ if (!id) return '-'; const c = clients.value.find(c => String(c.id) === String(id)); return c ? (c.nome || c.name) : '-' }

function resetForm(){ form.routeId = routeFilter.value && routeFilter.value !== '__none__' ? routeFilter.value : ''; form.clientId=''; form.nome=''; form.endereco=''; form.lat=''; form.lng=''; form.ordem=1; form.ativo=true; editId.value=null; errorMsg.value=''; successMsg.value='' }
function openNew(){ resetForm(); showModal.value = true }
function openEdit(p){ editId.value = p.id; form.routeId=String(p.routeId||''); form.clientId=String(p.clientId||''); form.nome=p.nome||p.name||''; form.endereco=p.endereco||''; form.lat=p.lat||p.latitude||''; form.lng=p.lng||p.longitude||''; form.ordem=p.ordem||1; form.ativo = p.ativo !== false; errorMsg.value=''; successMsg.value=''; showModal.value=true }
function close(){ showModal.value = false }

function onClientChange(){
  const id = form.clientId
  const c = clients.value.find(c => String(c.id) === String(id))
  if (!c) return
  if (!form.nome) form.nome = c.nome || c.name || ''
  if (!form.endereco) form.endereco = c.endereco || c.address || ''
}

async function load(){
  loading.value = true; loadError.value = ''
  try {
    const [rs, pts, cls] = await Promise.all([
      listRoutes(),
      listPoints(routeFilter.value && routeFilter.value !== '__none__' ? routeFilter.value : null),
      listClients()
    ])
    routes.value = rs
    points.value = pts
    clients.value = Array.isArray(cls) ? cls : []
  } catch(e){ loadError.value = e?.message || 'Erro ao carregar pontos' }
  finally { loading.value = false }
}

async function loadPoints(){
  loading.value = true; loadError.value = ''
  try { points.value = await listPoints(routeFilter.value && routeFilter.value !== '__none__' ? routeFilter.value : null) }
  catch(e){ loadError.value = e?.message || 'Erro ao carregar pontos' }
  finally { loading.value = false }
}

async function save(){
  errorMsg.value=''; successMsg.value=''
  if (!form.nome) { errorMsg.value='Nome é obrigatório.'; return }
  const payload = {
    routeId: form.routeId ? form.routeId : null,
    clientId: form.clientId ? form.clientId : null,
    nome: form.nome,
    endereco: form.endereco,
    lat: form.lat,
    lng: form.lng,
    ordem: form.ordem,
    ativo: !!form.ativo
  }
  try {
    if (editId.value) await updatePoint(editId.value, payload); else await createPoint(payload)
    successMsg.value = 'Ponto salvo.'
    close(); resetForm(); await load()
  } catch (e) { errorMsg.value = e?.message || 'Erro ao salvar' }
}

async function onDelete(p){ if (!confirm('Confirma excluir o ponto #' + p.id + '?')) return; try { await deletePoint(p.id); await load() } catch(e){ errorMsg.value = e?.message || 'Erro ao excluir' } }

onMounted(async () => { await load() })

watch(routeFilter, async () => { await loadPoints() })

</script>
