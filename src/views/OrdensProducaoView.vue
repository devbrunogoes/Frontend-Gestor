<template>
  <section class="content-area">
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;gap:1rem;">
      <h2 style="margin:0;">Ordens de Produção</h2>
      <div class="page-actions" style="display:flex;gap:.5rem;">
        <button class="btn btn-primary" @click="openNew">Nova Ordem</button>
      </div>
    </div>

    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Produto</th>
            <th>Quantidade</th>
            <th>Status</th>
            <th>Início</th>
            <th>Fim</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="o in orders" :key="o.id">
            <td>{{ o.id }}</td>
            <td>{{ o.produto || o.product }}</td>
            <td>{{ o.quantidade || o.quantity }}</td>
            <td>{{ o.status }}</td>
            <td>{{ fmt(o.dataInicio || o.startedAt) }}</td>
            <td>{{ fmt(o.dataFim || o.finishedAt) }}</td>
            <td>
              <button class="btn-icon btn-warning" @click="openEdit(o)" title="Editar"><i class="fa-solid fa-pen"></i></button>
              <button class="btn-icon btn-danger" @click="onDelete(o)" title="Excluir"><i class="fa-solid fa-trash"></i></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="modal" role="dialog" aria-hidden="true" :class="{ show: showModal }" @click.self="close">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h3>{{ editId ? 'Editar Ordem' : 'Nova Ordem' }}</h3>
            <button type="button" class="btn-close" @click="close" aria-label="Fechar"><i class="fa-solid fa-times"></i></button>
          </div>
          <form @submit.prevent="save">
            <div class="modal-body">
              <div class="form-grid">
                <div class="form-group form-group-large">
                  <label for="produto">Produto</label>
                  <input id="produto" class="form-control" v-model.trim="form.produto" required />
                </div>
                <div class="form-group">
                  <label for="quantidade">Quantidade</label>
                  <input id="quantidade" class="form-control" type="number" min="1" v-model.number="form.quantidade" />
                </div>
                <div class="form-group">
                  <label for="status">Status</label>
                  <select id="status" class="form-control" v-model="form.status">
                    <option value="aberta">Aberta</option>
                    <option value="em_producao">Em Produção</option>
                    <option value="concluida">Concluída</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>
                <div class="form-group form-group-large">
                  <label for="obs">Observações</label>
                  <textarea id="obs" class="form-control" rows="3" v-model.trim="form.observacoes"></textarea>
                </div>
                <div class="form-group">
                  <label for="inicio">Início</label>
                  <input id="inicio" class="form-control" type="datetime-local" v-model="form.dataInicio" />
                </div>
                <div class="form-group">
                  <label for="fim">Fim</label>
                  <input id="fim" class="form-control" type="datetime-local" v-model="form.dataFim" />
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
import { listOrders, createOrder, updateOrder, deleteOrder } from '@/services/productionOrders'

const orders = ref([])
const showModal = ref(false)
const editId = ref(null)
const form = reactive({ produto:'', quantidade:1, status:'aberta', observacoes:'', dataInicio:'', dataFim:'' })
const errorMsg = ref('')
const successMsg = ref('')

function fmt(iso){ try { return iso ? new Date(iso).toLocaleString() : '-' } catch { return '-' } }

function resetForm(){ Object.assign(form, { produto:'', quantidade:1, status:'aberta', observacoes:'', dataInicio:'', dataFim:'' }); editId.value=null; errorMsg.value=''; successMsg.value='' }
function openNew(){ resetForm(); showModal.value = true }
function openEdit(o){ editId.value = o.id; form.produto=o.produto||o.product||''; form.quantidade=o.quantidade||o.quantity||1; form.status=o.status||'aberta'; form.observacoes=o.observacoes||o.notes||''; form.dataInicio=(o.dataInicio||o.startedAt||''); form.dataFim=(o.dataFim||o.finishedAt||''); errorMsg.value=''; successMsg.value=''; showModal.value=true }
function close(){ showModal.value = false }

async function load(){ orders.value = await listOrders() }

function normalizeDate(dt){ if (!dt) return null; try { const d = new Date(dt); if (isNaN(d)) return dt; return d.toISOString() } catch { return dt } }

async function save(){
  errorMsg.value=''; successMsg.value=''
  if (!form.produto) { errorMsg.value='Produto é obrigatório.'; return }
  if (!form.quantidade || form.quantidade < 1) { errorMsg.value='Quantidade deve ser >= 1.'; return }
  const payload = { produto: form.produto, quantidade: Number(form.quantidade||1), status: form.status, observacoes: form.observacoes, dataInicio: normalizeDate(form.dataInicio), dataFim: normalizeDate(form.dataFim) }
  try {
    if (editId.value) await updateOrder(editId.value, payload); else await createOrder(payload)
    successMsg.value = 'Ordem salva.'
    close(); resetForm(); await load()
  } catch (e) { errorMsg.value = e?.message || 'Erro ao salvar' }
}

async function onDelete(o){ if (!confirm('Confirma excluir a ordem #' + o.id + '?')) return; try { await deleteOrder(o.id); await load() } catch(e){ errorMsg.value = e?.message || 'Erro ao excluir' } }

onMounted(async () => { await load() })
</script>
