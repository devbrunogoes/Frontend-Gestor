<template>
  <section class="content-area">
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;gap:1rem;">
      <h2 style="margin:0;">Sessões</h2>
      <div class="page-actions" style="display:flex;gap:.5rem;">
        <button class="btn btn-secondary" @click="load">Atualizar</button>
      </div>
    </div>

    <div v-if="errorMsg" style="color:#dc3545; margin-bottom:.5rem">{{ errorMsg }}</div>
    <div v-if="successMsg" style="color:#198754; margin-bottom:.5rem">{{ successMsg }}</div>

    <BaseError v-if="loadError" :message="loadError" :retry="load" />
    <BaseLoading v-else-if="loading" message="Carregando sessões…" />
    <div class="table-wrap" v-else>
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Usuário</th>
            <th>IP</th>
            <th>Início</th>
            <th>Último Acesso</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in sessions" :key="s.id">
            <td>{{ s.id }}</td>
            <td>{{ s.user?.nome || s.user?.name || s.user?.email || s.userId || '-' }}</td>
            <td>{{ s.ip || '-' }}</td>
            <td>{{ fmt(s.startedAt || s.start || s.createdAt) }}</td>
            <td>{{ fmt(s.lastSeen || s.updatedAt) }}</td>
            <td>{{ s.active === false ? 'Revogada' : 'Ativa' }}</td>
            <td>
              <button class="btn btn-sm btn-danger" :disabled="s.active===false" @click="revoke(s)">Revogar</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { listSessions, revokeSession } from '@/services/sessions'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseError from '@/components/ui/BaseError.vue'

const sessions = ref([])
const errorMsg = ref('')
const successMsg = ref('')
const loading = ref(false)
const loadError = ref('')

function fmt(iso){ try { return iso ? new Date(iso).toLocaleString() : '-' } catch { return '-' } }

async function load(){
  errorMsg.value=''; successMsg.value=''; loading.value = true; loadError.value=''
  try { sessions.value = await listSessions() } catch(e){ loadError.value = e?.message || 'Erro ao carregar sessões' } finally { loading.value = false }
}
async function revoke(s){ if (!confirm('Revogar a sessão #' + s.id + '?')) return; errorMsg.value=''; successMsg.value=''; try { await revokeSession(s.id); successMsg.value='Sessão revogada.'; await load() } catch(e){ errorMsg.value = e?.message || 'Erro ao revogar' } }

onMounted(async () => { await load() })
</script>
