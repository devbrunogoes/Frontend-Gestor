<template>
  <section class="content-area">
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;gap:1rem;">
      <h2 style="margin:0;">Relatório de Rotas</h2>
      <div class="page-actions" style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;">
        <select class="form-control" v-model="routeId" style="min-width:200px">
          <option value="">Todas as Rotas</option>
          <option v-for="r in routes" :key="r.id" :value="String(r.id)">{{ r.nome || r.name }}</option>
        </select>
        <input class="form-control" type="date" v-model="dateFrom" />
        <input class="form-control" type="date" v-model="dateTo" />
        <select class="form-control" v-model="status">
          <option value="">Todos status</option>
          <option value="in_progress">Em Andamento</option>
          <option value="completed">Concluída</option>
        </select>
        <button class="btn btn-secondary" @click="load" :disabled="loading">Atualizar</button>
        <button class="btn btn-outline" @click="exportCsv" :disabled="!rows.length">Exportar CSV</button>
      </div>
    </div>

    <BaseError v-if="loadError" :message="loadError" :retry="load" />
    <BaseLoading v-else-if="loading" message="Carregando execuções de rota…" />
    <div class="card" v-else style="margin-bottom:1rem;display:flex;gap:1rem;flex-wrap:wrap;">
      <div><strong>Execuções:</strong> {{ rows.length }}</div>
      <div><strong>Concluídas:</strong> {{ rows.filter(r=>r.status==='completed').length }}</div>
      <div><strong>Visitas:</strong> {{ rows.reduce((s,r)=>s + r.visited,0) }} / {{ rows.reduce((s,r)=>s + r.total,0) }}</div>
    </div>

    <div class="table-wrap" v-if="!loading && !loadError">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Rota</th>
            <th>Início</th>
            <th>Fim</th>
            <th>Status</th>
            <th>Progresso</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td>{{ r.id }}</td>
            <td>{{ r.rota }}</td>
            <td>{{ fmt(r.startedAt) }}</td>
            <td>{{ fmt(r.finishedAt) }}</td>
            <td>{{ r.status }}</td>
            <td>{{ r.visited }} / {{ r.total }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { listRoutes } from '@/services/routes'
import { listExecutions } from '@/services/routeExecutions'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseError from '@/components/ui/BaseError.vue'

const routes = ref([])
const executions = ref([])
const loading = ref(false)
const loadError = ref('')
const routeId = ref('')
const dateFrom = ref('')
const dateTo = ref('')
const status = ref('')

function fmt(iso){ try { return iso ? new Date(iso).toLocaleString() : '-' } catch { return '-' } }
function parseDate(d){ try { const x = new Date(d); if (isNaN(x)) return null; return x } catch { return null } }
function insideRange(dstr){
  const d = parseDate(dstr)
  if (!d) return true
  if (dateFrom.value) { const a = parseDate(dateFrom.value); if (a && d < new Date(a.getFullYear(), a.getMonth(), a.getDate())) return false }
  if (dateTo.value) { const b = parseDate(dateTo.value); if (b && d > new Date(b.getFullYear(), b.getMonth(), b.getDate(), 23,59,59,999)) return false }
  return true
}

const routeName = (id) => { const r = routes.value.find(x => String(x.id) === String(id)); return r ? (r.nome || r.name) : '-' }

const rows = computed(() => {
  let arr = (executions.value || []).map(e => {
    const visited = Array.isArray(e.points) ? e.points.filter(p => p.status==='visited').length : 0
    const total = Array.isArray(e.points) ? e.points.length : 0
    return { id: e.id, rotaId: e.routeId, rota: routeName(e.routeId), startedAt: e.startedAt, finishedAt: e.finishedAt, status: e.status, visited, total }
  })
  if (routeId.value) arr = arr.filter(r => String(r.rotaId) === String(routeId.value))
  if (status.value) arr = arr.filter(r => r.status === status.value)
  arr = arr.filter(r => insideRange(r.startedAt))
  arr.sort((a,b) => new Date(b.startedAt||0) - new Date(a.startedAt||0))
  return arr
})

async function load(){
  loading.value = true; loadError.value=''
  try {
    routes.value = await listRoutes()
    executions.value = await listExecutions(routeId.value || null, status.value || null)
  } catch(e){ loadError.value = e?.message || 'Erro ao carregar relatório de rotas' }
  finally { loading.value = false }
}

function exportCsv(){
  const headers = ['ID','Rota','Inicio','Fim','Status','Visitados','Total']
  const data = rows.value.map(r => [r.id, r.rota, fmt(r.startedAt), fmt(r.finishedAt), r.status, r.visited, r.total])
  const csv = [headers.join(','), ...data.map(r => r.map(s => '"'+String(s).replace(/"/g,'""')+'"').join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `relatorio-rotas.csv`; a.click(); URL.revokeObjectURL(url)
}

onMounted(load)
</script>
