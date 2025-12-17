<template>
  <section class="content-area">
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;gap:1rem;">
      <h2 style="margin:0;">Relatório de Clientes</h2>
      <div class="page-actions" style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;">
        <input class="form-control" style="min-width:260px" placeholder="Buscar por nome/email/cpf…" v-model.trim="q" />
        <select class="form-control" v-model="status">
          <option value="">Todos</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
        </select>
        <button class="btn btn-secondary" @click="load" :disabled="loading">Atualizar</button>
        <button class="btn btn-outline" @click="exportCsv" :disabled="!filtered.length">Exportar CSV</button>
      </div>
    </div>

    <BaseError v-if="loadError" :message="loadError" :retry="load" />
    <BaseLoading v-else-if="loading" message="Carregando clientes…" />
    <div class="card" v-else style="margin-bottom:1rem;display:flex;gap:1rem;flex-wrap:wrap;">
      <div><strong>Total:</strong> {{ filtered.length }}</div>
      <div><strong>Ativos:</strong> {{ filtered.filter(c => c.active !== false).length }}</div>
      <div><strong>Inativos:</strong> {{ filtered.filter(c => c.active === false).length }}</div>
    </div>

    <div class="table-wrap" v-if="!loading && !loadError">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nome</th>
            <th>CPF/CNPJ</th>
            <th>Telefone</th>
            <th>E-mail</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in filtered" :key="c.id">
            <td>{{ c.id }}</td>
            <td>{{ c.nome || c.name }}</td>
            <td>{{ c.cpfcnpj || '-' }}</td>
            <td>{{ c.telefone || '-' }}</td>
            <td>{{ c.email || '-' }}</td>
            <td>{{ c.active !== false ? 'Ativo' : 'Inativo' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { listClients } from '@/services/clients'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseError from '@/components/ui/BaseError.vue'

const clients = ref([])
const loading = ref(false)
const loadError = ref('')
const q = ref('')
const status = ref('')

const filtered = computed(() => {
  const t = (q.value || '').toLowerCase()
  return clients.value.filter(c => {
    if (status.value === 'ativo' && c.active === false) return false
    if (status.value === 'inativo' && c.active !== false) return false
    if (!t) return true
    const parts = [c.nome||c.name||'', c.email||'', c.cpfcnpj||'', c.telefone||'', String(c.id||'')]
    return parts.join(' ').toLowerCase().includes(t)
  })
})

async function load(){ loading.value = true; loadError.value=''; try { clients.value = await listClients() } catch(e){ loadError.value = e?.message || 'Erro ao carregar clientes' } finally { loading.value = false } }

function exportCsv(){
  const headers = ['ID','Nome','CPF/CNPJ','Telefone','E-mail','Status']
  const rows = filtered.value.map(c => [c.id, (c.nome||c.name||''), (c.cpfcnpj||''), (c.telefone||''), (c.email||''), (c.active!==false?'Ativo':'Inativo')])
  const csv = [headers.join(','), ...rows.map(r => r.map(s => '"'+String(s).replace(/"/g,'""')+'"').join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `relatorio-clientes.csv`; a.click(); URL.revokeObjectURL(url)
}

onMounted(load)
</script>
