<template>
  <section class="content-area">
    <div class="page-header">
      <div>
        <p class="eyebrow">Operações · Rotas</p>
        <h2>Rotas em andamento</h2>
        <p class="muted">Veja e conclua todas as execuções abertas.</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-light" @click="reload" :disabled="loading">
          <i class="fa-solid fa-rotate"></i>
          {{ loading ? 'Atualizando…' : 'Atualizar' }}
        </button>
      </div>
    </div>

    <div class="summary-panel">
      <div class="chip chip-primary">
        <i class="fa-solid fa-route"></i>
        {{ openExecutions.length }} em aberto
      </div>
      <div class="chip" v-if="lastUpdated">
        <i class="fa-regular fa-clock"></i>
        Atualizado: {{ lastUpdated }}
      </div>
      <div class="spacer"></div>
      <button class="btn btn-ghost" @click="reload" :disabled="loading">
        <i class="fa-solid fa-rotate"></i>
        {{ loading ? 'Atualizando…' : 'Atualizar' }}
      </button>
    </div>

    <div v-if="errorMsg" class="alert alert-danger">{{ errorMsg }}</div>
    <div v-if="successMsg" class="alert alert-success">{{ successMsg }}</div>

    <div class="card" v-if="loading">
      <div class="card-body loading">Carregando rotas em andamento…</div>
    </div>

    <div class="card" v-else>
      
      <div class="card-body" v-if="openExecutions.length">
        <div class="routes-grid">
          <article v-for="exec in openExecutions" :key="exec.id" class="route-card">
            <header class="route-card__header">
              <div>
                <p class="eyebrow">Rota</p>
                <h3 class="route-name">{{ exec.routeName || exec.nome || exec.name || 'Rota' }}</h3>
              </div>
              <span class="status-pill">
                <i class="fa-solid fa-play"></i>
                Em andamento
              </span>
            </header>

            <dl class="route-meta">
              <div>
                <dt>Motorista</dt>
                <dd>{{ exec.driver || exec.motorista || '—' }}</dd>
              </div>
              <div>
                <dt>Veículo</dt>
                <dd>{{ exec.vehicle || exec.veiculo || '—' }}</dd>
              </div>
              <div>
                <dt>Início</dt>
                <dd>{{ formatDateTime(exec.startedAt || exec.inicioPrevisto || exec.createdAt) }}</dd>
              </div>
            </dl>

            <footer class="route-actions">
              <button class="btn btn-light" :disabled="finishingId === String(exec.id) || loading" @click="finish(exec)">
                <i class="fa-solid" :class="finishingId === String(exec.id) ? 'fa-spinner fa-spin' : 'fa-check'"></i>
                {{ finishingId === String(exec.id) ? 'Concluindo…' : 'Concluir' }}
              </button>
            </footer>
          </article>
        </div>
      </div>
      <div class="card-body empty" v-else>
        <i class="fa-regular fa-circle-check"></i>
        <p>Nenhuma rota em andamento.</p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { listExecutions, completeExecution } from '@/services/routeExecutions'

const loading = ref(false)
const openExecutions = ref([])
const finishingId = ref('')
const errorMsg = ref('')
const successMsg = ref('')
const lastUpdated = ref('')

function formatDateTime(value){
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.valueOf()) ? '—' : d.toLocaleString('pt-BR')
}

async function reload(){
  loading.value = true
  errorMsg.value = ''
  successMsg.value = ''
  try {
    const executions = await listExecutions(null, 'in_progress')
    const filtered = (Array.isArray(executions) ? executions : []).filter((e) => !e.completedAt && !e.fimReal)
    const sorted = filtered.sort((a, b) => {
      const da = new Date(a.startedAt || a.inicioPrevisto || a.createdAt || 0).valueOf()
      const db = new Date(b.startedAt || b.inicioPrevisto || b.createdAt || 0).valueOf()
      return db - da
    })
    openExecutions.value = sorted
    lastUpdated.value = new Date().toLocaleString('pt-BR')
  } catch (err) {
    errorMsg.value = err?.message || 'Falha ao carregar rotas em andamento.'
  } finally {
    loading.value = false
  }
}

async function finish(exec){
  if (!exec || !exec.id) return
  finishingId.value = String(exec.id)
  errorMsg.value = ''
  successMsg.value = ''
  try {
    await completeExecution(exec.id)
    successMsg.value = 'Rota concluída com sucesso.'
    await reload()
  } catch (err) {
    errorMsg.value = err?.message || 'Falha ao concluir rota.'
  } finally {
    finishingId.value = ''
  }
}

onMounted(() => reload())
</script>

<style scoped>
.content-area {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: clamp(1.25rem, 4vw, 2.75rem) clamp(1rem, 3vw, 2.5rem);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.page-header h2 {
  margin: 0;
}

.page-header .eyebrow {
  margin: 0 0 0.15rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.72rem;
  color: #6c757d;
}

.page-header .muted {
  margin: 0;
  color: #6c757d;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.summary-panel {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin: 0.25rem 0 0.85rem;
  padding: 0.65rem 0.85rem;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 12px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.75rem;
  border-radius: 999px;
  background: #f1f3f5;
  color: #495057;
  font-weight: 600;
  border: 1px solid #e9ecef;
}

.spacer {
  flex: 1;
  min-width: 0;
}

.chip i {
  color: #198754;
}

.chip-primary {
  background: #e7f5ff;
  color: #0c4a6e;
  border-color: #a5d8ff;
}

.card {
    width: 100%;
  background: #fff;
  border: 1px solid #e9ecef;
  border-radius: 14px;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
}



.card-body {
  padding: 1rem 1.2rem;
    width: 100%;
}

.card-body.empty {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #6c757d;
}

.card-body.loading {
  color: #6c757d;
}
.routes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.1rem;
  align-items: stretch;
}

.route-card {
  border: 1px solid #e9ecef;
  border-radius: 14px;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(13, 110, 253, 0.05), rgba(13, 110, 253, 0.015));
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.route-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.route-name {
  margin: 0;
  font-size: 1.05rem;
  color: #0b2742;
}

.eyebrow {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.7rem;
  color: #6c757d;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.65rem;
  border-radius: 999px;
  background: #d1e7dd;
  color: #0f5132;
  font-weight: 700;
  font-size: 0.82rem;
  border: 1px solid rgba(15, 81, 50, 0.18);
}

.route-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.35rem 0.75rem;
  margin: 0;
}

.route-meta dt {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6c757d;
  margin: 0;
}

.route-meta dd {
  margin: 0;
  font-weight: 700;
  color: #102a43;
}

.route-actions {
  display: flex;
  justify-content: flex-end;
}

.alert {
  padding: 0.75rem 1rem;
  border-radius: 10px;
  margin: 0;
}

.alert-danger {
  background: #f8d7da;
  color: #842029;
  border: 1px solid #f1aeb5;
}

.alert-success {
  background: #d1e7dd;
  color: #0f5132;
  border: 1px solid #a3cfbb;
}

@media (max-width: 640px) {
  .route-card {
    padding: 0.85rem;
  }

  .route-actions {
    justify-content: flex-start;
  }
}
</style>
