<template>
  <section class="content-area">
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;gap:1rem;">
      <h2 style="margin:0;">Relatório de Vendas</h2>
      <div class="page-actions" style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;">
        <input class="form-control" type="date" v-model="dateFrom" />
        <input class="form-control" type="date" v-model="dateTo" />
        <input class="form-control" style="min-width:220px" placeholder="Cliente ou texto…" v-model.trim="q" />
        <button class="btn btn-secondary" @click="load" :disabled="loading">Atualizar</button>
        <button class="btn btn-outline" @click="exportCsv" :disabled="!filtered.length">Exportar CSV</button>
      </div>
    </div>

    <BaseError v-if="loadError" :message="loadError" :retry="load" />
    <BaseLoading v-else-if="loading" message="Carregando vendas…" />
    <div class="card" v-else style="margin-bottom:1rem;display:flex;gap:1rem;flex-wrap:wrap;">
      <div><strong>Vendas:</strong> {{ filtered.length }}</div>
      <div><strong>Total:</strong> R$ {{ totalAmount.toFixed(2) }}</div>
    </div>

    <div class="table-wrap" v-if="!loading && !loadError">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Data</th>
            <th>Cliente</th>
            <th>Itens</th>
            <th>Total (R$)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="v in filtered" :key="v.id">
            <td>{{ v.id }}</td>
            <td>{{ fmt(v.date || v.data || v.dataVenda || v.createdAt) }}</td>
            <td>{{ clienteNome(v) }}</td>
            <td>{{ (v.itens || v.items || []).length }}</td>
            <td>{{ valorTotal(v).toFixed(2) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { listSales } from '@/services/sales'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseError from '@/components/ui/BaseError.vue'

const vendas = ref([])
const loading = ref(false)
const loadError = ref('')
const q = ref('')
const dateFrom = ref('')
const dateTo = ref('')

function fmt(iso){ try { return iso ? new Date(iso).toLocaleString() : '-' } catch { return '-' } }
function parseDate(d){ try { const x = new Date(d); if (isNaN(x)) return null; return x } catch { return null } }
function insideRange(v){
  const d = parseDate(v.date || v.data || v.dataVenda || v.createdAt)
  if (!d) return true
  if (dateFrom.value) { const a = parseDate(dateFrom.value); if (a && d < new Date(a.getFullYear(), a.getMonth(), a.getDate())) return false }
  if (dateTo.value) { const b = parseDate(dateTo.value); if (b && d > new Date(b.getFullYear(), b.getMonth(), b.getDate(), 23,59,59,999)) return false }
  return true
}

function clienteNome(v){
  if (v.cliente && (v.cliente.nome || v.cliente.name)) return v.cliente.nome || v.cliente.name
  return v.clienteNome || v.clientName || v.customer || '-'
}

function valorItem(it){
  const qtd = Number(it.qtd || it.quantity || it.quantidade || 1)
  const preco = Number(it.preco || it.precoUnit || it.price || it.valor || 0)
  return qtd * preco
}

function valorTotal(v){
  if (typeof v.total === 'number') return v.total
  if (typeof v.valorTotal === 'number') return v.valorTotal
  const itens = v.itens || v.items || []
  return itens.reduce((acc, it) => acc + valorItem(it), 0)
}

const filtered = computed(() => {
  const t = (q.value || '').toLowerCase()
  return vendas.value.filter(v => {
    if (!insideRange(v)) return false
    if (!t) return true
    const parts = [String(v.id||''), clienteNome(v)||'', (v.observacoes||v.notes||'')]
    return parts.join(' ').toLowerCase().includes(t)
  })
})

const totalAmount = computed(() => filtered.value.reduce((sum, v) => sum + valorTotal(v), 0))

async function load(){ loading.value = true; loadError.value=''; try { vendas.value = await listSales() } catch(e){ loadError.value = e?.message || 'Erro ao carregar vendas' } finally { loading.value = false } }

function exportCsv(){
  const headers = ['ID','Data','Cliente','Itens','Total']
  const rows = filtered.value.map(v => [
    v.id,
    fmt(v.date || v.data || v.dataVenda || v.createdAt),
    clienteNome(v),
    (v.itens || v.items || []).length,
    valorTotal(v).toFixed(2)
  ])
  const csv = [headers.join(','), ...rows.map(r => r.map(s => '"'+String(s).replace(/"/g,'""')+'"').join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `relatorio-vendas.csv`; a.click(); URL.revokeObjectURL(url)
}

onMounted(load)
</script>
