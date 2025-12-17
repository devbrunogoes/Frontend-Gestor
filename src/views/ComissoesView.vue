<template>
  <section class="content-area">
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;gap:1rem;">
      <h2 style="margin:0;">Comissões</h2>
      <div class="page-actions" style="display:flex;gap:.5rem;">
        <button class="btn btn-primary" @click="openNew">Nova Comissão</button>
      </div>
    </div>
      <BaseError v-if="loadError" :message="loadError" :retry="load" />
      <BaseLoading v-else-if="loading" message="Carregando comissões…" />
      <div class="table-wrap" v-else>
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Descrição</th>
            <th>Tipo</th>
            <th>Valor</th>
            <th>Status</th>
            <th class="actions">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in commissions" :key="c.id">
            <td>{{ c.id }}</td>
            <td>{{ c.descricao || c.description }}</td>
            <td>
              <span class="badge badge-info">{{ (c.tipo || 'percentual') === 'percentual' ? 'Percentual' : 'Fixo' }}</span>
            </td>
            <td>
              <template v-if="(c.tipo || 'percentual') === 'percentual'">{{ Number(c.valor||0).toFixed(2) }}%</template>
              <template v-else>R$ {{ Number(c.valor||0).toFixed(2) }}</template>
            </td>
            <td>
              <span class="badge status-badge" :class="c.ativo !== false ? 'badge-success' : 'badge-secondary'">
                {{ c.ativo !== false ? 'Ativo' : 'Inativo' }}
              </span>
            </td>
            <td>
              <button class="btn-icon btn-warning" @click="openEdit(c)" title="Editar"><i class="fa-solid fa-pen"></i></button>
              <button class="btn-icon btn-danger" @click="onDelete(c)" title="Excluir"><i class="fa-solid fa-trash"></i></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="modal" role="dialog" aria-hidden="true" :class="{ show: showModal }" @click.self="close">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h3>{{ editId ? 'Editar Comissão' : 'Nova Comissão' }}</h3>
            <button type="button" class="btn-close" @click="close" aria-label="Fechar"><i class="fa-solid fa-times"></i></button>
          </div>
          <form @submit.prevent="save">
            <div class="modal-body">
              <div class="form-grid">
                <div class="form-group form-group-large">
                  <label for="descricao">Descrição</label>
                  <input id="descricao" class="form-control" v-model.trim="form.descricao" required />
                </div>
                <div class="form-group">
                  <label for="tipo">Tipo</label>
                  <select id="tipo" class="form-control" v-model="form.tipo">
                    <option value="percentual">Percentual</option>
                    <option value="fixo">Fixo</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="valor">Valor</label>
                  <input id="valor" class="form-control" type="number" step="0.01" v-model.number="form.valor" />
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
import { ref, reactive, onMounted } from 'vue'
import { listCommissions, createCommission, updateCommission, deleteCommission } from '@/services/commissions'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseError from '@/components/ui/BaseError.vue'

const commissions = ref([])
const loading = ref(false)
const loadError = ref('')
const showModal = ref(false)
const editId = ref(null)
const form = reactive({ descricao:'', tipo:'percentual', valor:0, ativo:true })
const errorMsg = ref('')
const successMsg = ref('')

function resetForm(){ form.descricao=''; form.tipo='percentual'; form.valor=0; form.ativo=true; editId.value=null; errorMsg.value=''; successMsg.value='' }
function openNew(){ resetForm(); showModal.value = true }
function openEdit(c){ editId.value = c.id; form.descricao=c.descricao||c.description||''; form.tipo=c.tipo||'percentual'; form.valor=Number(c.valor||0); form.ativo = c.ativo !== false; errorMsg.value=''; successMsg.value=''; showModal.value=true }
function close(){ showModal.value = false }

async function load(){
  loading.value = true; loadError.value=''
  try { commissions.value = await listCommissions() }
  catch(e){ loadError.value = e?.message || 'Erro ao carregar comissões' }
  finally { loading.value = false }
}

async function save(){
  errorMsg.value=''; successMsg.value=''
  if (!form.descricao) { errorMsg.value='Descrição é obrigatória.'; return }
  const payload = { descricao: form.descricao, tipo: form.tipo, valor: Number(form.valor||0), ativo: !!form.ativo }
  try {
    if (editId.value) await updateCommission(editId.value, payload); else await createCommission(payload)
    successMsg.value = 'Comissão salva.'
    close(); resetForm(); await load()
  } catch (e) { errorMsg.value = e?.message || 'Erro ao salvar' }
}

async function onDelete(c){ if (!confirm('Confirma excluir a comissão #' + c.id + '?')) return; try { await deleteCommission(c.id); await load() } catch(e){ errorMsg.value = e?.message || 'Erro ao excluir' } }

onMounted(async () => { await load() })
</script>
