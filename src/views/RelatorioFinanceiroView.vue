<template>
  <section class="content-area">
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;gap:1rem;">
      <h2 style="margin:0;">Relatório Financeiro</h2>
      <div class="page-actions" style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;">
        <input class="form-control" type="date" v-model="dateFrom" />
        <input class="form-control" type="date" v-model="dateTo" />
        <select class="form-control" v-model="paid">
          <option value="">Todos</option>
          <option value="true">Pagos</option>
          <option value="false">Pendentes</option>
        </select>
        <button class="btn btn-secondary" @click="load" :disabled="loading">Atualizar</button>
        <button class="btn btn-outline" @click="exportCsv" :disabled="!rows.length">Exportar CSV</button>
      </div>
    </div>

    <BaseError v-if="loadError" :message="loadError" :retry="load" />
    <BaseLoading v-else-if="loading" message="Carregando financeiro…" />
    <div class="card" v-else style="margin-bottom:1rem;display:flex;gap:1rem;flex-wrap:wrap;">
      <div><strong>Receitas:</strong> R$ {{ totalReceitas.toFixed(2) }}</div>
      <div><strong>Despesas:</strong> R$ {{ totalDespesas.toFixed(2) }}</div>
      <div><strong>Saldo:</strong> R$ {{ (totalReceitas - totalDespesas).toFixed(2) }}</div>
    </div>

    <div class="table-wrap" v-if="!loading && !loadError">
      <table class="data-table">
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Data</th>
            <th>Descrição</th>
            <th>Valor</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r._key">
            <td>{{ r.tipo }}</td>
            <td>{{ fmt(r.data) }}</td>
            <td>{{ r.descricao }}</td>
            <td :style="{color: r.tipo==='Despesa'?'#dc3545':'inherit'}">{{ r.tipo==='Despesa' ? '-' : '' }}R$ {{ Number(r.valor||0).toFixed(2) }}</td>
            <td>{{ r.pago ? 'Pago' : 'Pendente' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { listReceivables } from '@/services/receivables'
import { listExpenses } from '@/services/expenses'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseError from '@/components/ui/BaseError.vue'

const receivables = ref([])
const expenses = ref([])
const loading = ref(false)
const loadError = ref('')
const dateFrom = ref('')
const dateTo = ref('')
const paid = ref('')

function fmt(iso){ try { return iso ? new Date(iso).toLocaleDateString() : '-' } catch { return '-' } }
function parseDate(d){ try { const x = new Date(d); if (isNaN(x)) return null; return x } catch { return null } }
function insideRange(dstr){
  const d = parseDate(dstr)
  if (!d) return true
  if (dateFrom.value) { const a = parseDate(dateFrom.value); if (a && d < new Date(a.getFullYear(), a.getMonth(), a.getDate())) return false }
  if (dateTo.value) { const b = parseDate(dateTo.value); if (b && d > new Date(b.getFullYear(), b.getMonth(), b.getDate(), 23,59,59,999)) return false }
  return true
}

const rows = computed(() => {
  const rec = (receivables.value||[]).map(r => ({
    _key: 'rec-'+(r.id||Math.random()),
    tipo: 'Receita',
    data: r.data || r.vencimento || r.venceEm || r.createdAt,
    descricao: r.descricao || r.description || r.cliente || r.clienteNome || '-',
    valor: Number(r.valor || r.amount || 0),
    pago: !!(r.pago || r.paid || false),
  }))
  const des = (expenses.value||[]).map(d => ({
    _key: 'des-'+(d.id||Math.random()),
    tipo: 'Despesa',
    data: d.data || d.pagamentoEm || d.createdAt,
    descricao: d.descricao || d.description || '-',
    valor: Number(d.valor || d.amount || 0),
    pago: !!(d.pago || d.paid || false),
  }))
  let arr = [...rec, ...des]
  arr = arr.filter(r => insideRange(r.data))
  if (paid.value === 'true') arr = arr.filter(r => r.pago)
  if (paid.value === 'false') arr = arr.filter(r => !r.pago)
  // sort by date desc
  arr.sort((a,b) => new Date(b.data||0) - new Date(a.data||0))
  return arr
})

const totalReceitas = computed(() => rows.value.filter(r => r.tipo==='Receita').reduce((s,r) => s + Number(r.valor||0), 0))
const totalDespesas = computed(() => rows.value.filter(r => r.tipo==='Despesa').reduce((s,r) => s + Number(r.valor||0), 0))

async function load(){
  loading.value = true; loadError.value=''
  try {
    receivables.value = await listReceivables()
    expenses.value = await listExpenses()
  } catch(e){ loadError.value = e?.message || 'Erro ao carregar dados financeiros' }
  finally { loading.value = false }
}

function exportCsv(){
  const headers = ['Tipo','Data','Descrição','Valor','Status']
  const data = rows.value.map(r => [r.tipo, fmt(r.data), r.descricao, Number(r.valor||0).toFixed(2), (r.pago?'Pago':'Pendente')])
  const csv = [headers.join(','), ...data.map(r => r.map(s => '"'+String(s).replace(/"/g,'""')+'"').join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `relatorio-financeiro.csv`; a.click(); URL.revokeObjectURL(url)
}

onMounted(load)
</script>
