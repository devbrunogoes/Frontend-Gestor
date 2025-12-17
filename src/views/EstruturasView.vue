<template>
  <section class="content-area">
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;gap:1rem;">
      <h2 style="margin:0;">Estruturas</h2>
      <div class="page-actions" style="display:flex;gap:.5rem;">
        <button class="btn btn-primary" @click="openNew">Nova Estrutura</button>
      </div>
    </div>

    <BaseError v-if="loadError" :message="loadError" :retry="load" />
    <BaseLoading v-else-if="loading" message="Carregando estruturas…" />
    <div class="table-wrap" v-else>
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nome</th>
            <th>Descrição</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in structures" :key="s.id">
            <td>{{ s.id }}</td>
            <td>{{ s.nome || s.name }}</td>
            <td>{{ s.descricao || s.description || '-' }}</td>
            <td>{{ s.ativo !== false ? 'Ativo' : 'Inativo' }}</td>
            <td>
              <button class="btn-icon btn-warning" @click="openEdit(s)" title="Editar"><i class="fa-solid fa-pen"></i></button>
              <button class="btn-icon btn-danger" @click="onDelete(s)" title="Excluir"><i class="fa-solid fa-trash"></i></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="modal" role="dialog" aria-hidden="true" :class="{ show: showModal }" @click.self="close">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h3>{{ editId ? 'Editar Estrutura' : 'Nova Estrutura' }}</h3>
            <button type="button" class="btn-close" @click="close" aria-label="Fechar"><i class="fa-solid fa-times"></i></button>
          </div>
          <form @submit.prevent="save">
            <div class="modal-body">
              <div class="form-grid">
                <div class="form-group form-group-large">
                  <label for="nome">Nome</label>
                  <input id="nome" class="form-control" v-model.trim="form.nome" required />
                </div>
                <div class="form-group form-group-large">
                  <label for="descricao">Descrição</label>
                  <textarea id="descricao" class="form-control" rows="3" v-model.trim="form.descricao"></textarea>
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
import { listStructures, createStructure, updateStructure, deleteStructure } from '@/services/structures'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseError from '@/components/ui/BaseError.vue'

const structures = ref([])
const loading = ref(false)
const loadError = ref('')
const showModal = ref(false)
const editId = ref(null)
const form = reactive({ nome:'', descricao:'', ativo:true })
const errorMsg = ref('')
const successMsg = ref('')

function resetForm(){ form.nome=''; form.descricao=''; form.ativo=true; editId.value=null; errorMsg.value=''; successMsg.value='' }
function openNew(){ resetForm(); showModal.value = true }
function openEdit(s){ editId.value = s.id; form.nome=s.nome||s.name||''; form.descricao=s.descricao||s.description||''; form.ativo = s.ativo !== false; errorMsg.value=''; successMsg.value=''; showModal.value=true }
function close(){ showModal.value = false }

async function load(){
  loading.value = true; loadError.value = ''
  try { structures.value = await listStructures() }
  catch(e){ loadError.value = e?.message || 'Erro ao carregar estruturas' }
  finally { loading.value = false }
}

async function save(){
  errorMsg.value=''; successMsg.value=''
  if (!form.nome) { errorMsg.value='Nome é obrigatório.'; return }
  const payload = { nome: form.nome, descricao: form.descricao, ativo: !!form.ativo }
  try {
    if (editId.value) await updateStructure(editId.value, payload); else await createStructure(payload)
    successMsg.value = 'Estrutura salva.'
    close(); resetForm(); await load()
  } catch (e) { errorMsg.value = e?.message || 'Erro ao salvar' }
}

async function onDelete(s){ if (!confirm('Confirma excluir a estrutura #' + s.id + '?')) return; try { await deleteStructure(s.id); await load() } catch(e){ errorMsg.value = e?.message || 'Erro ao excluir' } }

onMounted(async () => { await load() })
</script>
