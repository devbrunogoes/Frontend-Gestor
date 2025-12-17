<template>
  <section class="content-area">
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;gap:1rem;">
      <h2 style="margin:0;">Relatório de Estoque</h2>
      <div class="page-actions" style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;">
        <input class="form-control" style="min-width:260px" placeholder="Buscar produto…" v-model.trim="q" />
        <label style="display:flex;align-items:center;gap:.35rem;">
          <input type="checkbox" v-model="onlyBelowMin" />
          <span>Apenas abaixo do mínimo</span>
        </label>
        <button class="btn btn-secondary" @click="load" :disabled="loading">Atualizar</button>
        <button class="btn btn-outline" @click="exportCsv" :disabled="!filtered.length">Exportar CSV</button>
      </div>
    </div>

    <BaseError v-if="loadError" :message="loadError" :retry="load" />
    <BaseLoading v-else-if="loading" message="Carregando produtos…" />
    <div class="card" v-else style="margin-bottom:1rem;display:flex;gap:1rem;flex-wrap:wrap;">
      <div><strong>Itens:</strong> {{ filtered.length }}</div>
      <div><strong>Qtd total:</strong> {{ filtered.reduce((s,p)=>s+Number(p.stockQuantity||p.qtdEstoque||0),0) }}</div>
      <div><strong>Valor total (preço):</strong> R$ {{ filtered.reduce((s,p)=>s+Number(p.price||p.preco||0)*Number(p.stockQuantity||p.qtdEstoque||0),0).toFixed(2) }}</div>
    </div>

    <div class="table-wrap" v-if="!loading && !loadError">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Produto</th>
            <th>Estoque</th>
            <th>Mínimo</th>
            <th>Preço</th>
            <th>Custo</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in filtered" :key="p.id">
            <td>{{ p.id }}</td>
            <td>{{ p.name || p.nome || p.nomeProduto }}</td>
            <td>{{ p.stockQuantity || p.qtdEstoque || 0 }}</td>
            <td>{{ p.minStock || p.estoqueMin || 0 }}</td>
            <td>R$ {{ Number(p.price || p.preco || 0).toFixed(2) }}</td>
            <td>R$ {{ Number(p.cost || p.custo || 0).toFixed(2) }}</td>
            <td>
              <span v-if="Number(p.stockQuantity||p.qtdEstoque||0) <= Number(p.minStock||p.estoqueMin||0)" style="color:#dc3545">Abaixo do mínimo</span>
              <span v-else>OK</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { listProducts } from '@/services/products'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseError from '@/components/ui/BaseError.vue'

const produtos = ref([])
const loading = ref(false)
const loadError = ref('')
const q = ref('')
const onlyBelowMin = ref(false)

const filtered = computed(() => {
  const t = (q.value || '').toLowerCase()
  return produtos.value.filter(p => {
    const est = Number(p.stockQuantity||p.qtdEstoque||0)
    const min = Number(p.minStock||p.estoqueMin||0)
    if (onlyBelowMin.value && est > min) return false
    if (!t) return true
    const name = (p.name||p.nome||p.nomeProduto||'').toLowerCase()
    return name.includes(t)
  })
})

async function load(){ loading.value = true; loadError.value=''; try { produtos.value = await listProducts() } catch(e){ loadError.value = e?.message || 'Erro ao carregar produtos' } finally { loading.value = false } }

function exportCsv(){
  const headers = ['ID','Produto','Estoque','Mínimo','Preço','Custo','Status']
  const rows = filtered.value.map(p => [
    p.id,
    (p.name||p.nome||p.nomeProduto||''),
    (p.stockQuantity||p.qtdEstoque||0),
    (p.minStock||p.estoqueMin||0),
    Number(p.price||p.preco||0).toFixed(2),
    Number(p.cost||p.custo||0).toFixed(2),
    (Number(p.stockQuantity||p.qtdEstoque||0) <= Number(p.minStock||p.estoqueMin||0) ? 'Abaixo do mínimo' : 'OK')
  ])
  const csv = [headers.join(','), ...rows.map(r => r.map(s => '"'+String(s).replace(/"/g,'""')+'"').join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `relatorio-estoque.csv`; a.click(); URL.revokeObjectURL(url)
}

onMounted(load)
</script>
