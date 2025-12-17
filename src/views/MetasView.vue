<template>
  <section class="content-area">
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;gap:1rem;">
      <h2 style="margin:0;">Metas</h2>
      <div class="page-actions" style="display:flex;gap:.5rem;">
        <button class="btn btn-primary" @click="openNew">Nova Meta</button>
      </div>
    </div>

    <BaseError v-if="loadError" :message="loadError" :retry="load" />
    <BaseLoading v-else-if="loading" message="Carregando metas…" />
    <div class="table-wrap" v-else>
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nome</th>
            <th>Período</th>
            <th>Início</th>
            <th>Fim</th>
            <th>Tipo</th>
            <th>Alvo</th>
            <th>Responsável</th>
            <th>Ativo</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="g in metas" :key="g.id">
            <td>{{ g.id }}</td>
            <td>{{ g.nome }}</td>
            <td>{{ showPeriodo(g.periodo) }}</td>
            <td>{{ g.inicio || '-' }}</td>
            <td>{{ g.fim || '-' }}</td>
            <td>{{ showTipo(g.tipo) }}</td>
            <td>{{ g.tipo==='faturamento' ? fmtBRL(g.alvo) : Number(g.alvo||0) }}</td>
            <td>{{ g.responsavel || '-' }}</td>
            <td>{{ g.active !== false ? 'Sim' : 'Não' }}</td>
            <td>
              <button class="btn-icon btn-warning" @click="openEdit(g)" title="Editar"><i class="fa-solid fa-pen"></i></button>
              <button class="btn-icon btn-danger" @click="onDelete(g)" title="Excluir"><i class="fa-solid fa-trash"></i></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="modal" role="dialog" aria-hidden="true" :class="{ show: showModal }" @click.self="close">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h3>{{ editId ? 'Editar Meta' : 'Nova Meta' }}</h3>
            <button type="button" class="btn-close" @click="close" aria-label="Fechar"><i class="fa-solid fa-times"></i></button>
          </div>
          <form @submit.prevent="save">
            <div class="modal-body">
              <div class="form-grid">
                <div class="form-group form-group-large">
                  <label for="nome">Nome</label>
                  <input id="nome" class="form-control" v-model.trim="form.nome" required />
                </div>
                <div class="form-group">
                  <label for="periodo">Período</label>
                  <select id="periodo" class="form-control" v-model="form.periodo">
                    <option value="semanal">Semanal</option>
                    <option value="mensal">Mensal</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="inicio">Início</label>
                  <input id="inicio" type="date" class="form-control" v-model="form.inicio" />
                </div>
                <div class="form-group">
                  <label for="fim">Fim</label>
                  <input id="fim" type="date" class="form-control" v-model="form.fim" />
                </div>
                <div class="form-group">
                  <label for="tipo">Tipo</label>
                  <select id="tipo" class="form-control" v-model="form.tipo">
                    <option value="faturamento">Faturamento (R$)</option>
                    <option value="quantidade">Quantidade (itens)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="alvo">Alvo</label>
                  <input id="alvo" :type="form.tipo==='faturamento' ? 'number' : 'number'" step="0.01" min="0" class="form-control" v-model.number="form.alvo" />
                </div>
                <div class="form-group form-group-large">
                  <label for="resp">Responsável</label>
                  <input id="resp" class="form-control" v-model.trim="form.responsavel" placeholder="Usuário ou papel" />
                </div>
                <div class="form-group">
                  <label for="ativo">Ativo</label>
                  <select id="ativo" class="form-control" v-model="form.active">
                    <option :value="true">Sim</option>
                    <option :value="false">Não</option>
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
import { listGoals, createGoal, updateGoal, deleteGoal } from '@/services/metas'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseError from '@/components/ui/BaseError.vue'

const metas = ref([])
const loading = ref(false)
const loadError = ref('')
const showModal = ref(false)
const editId = ref(null)
const form = reactive({ nome:'', periodo:'mensal', inicio:'', fim:'', tipo:'faturamento', alvo:0, responsavel:'', active:true })
const errorMsg = ref('')
const successMsg = ref('')

function fmtBRL(v){ return (Number(v)||0).toLocaleString('pt-BR',{ style:'currency', currency:'BRL' }) }
function showPeriodo(p){ return ({semanal:'Semanal', mensal:'Mensal', trimestral:'Trimestral', anual:'Anual'})[p] || p }
function showTipo(t){ return ({faturamento:'Faturamento', quantidade:'Quantidade'})[t] || t }

function resetForm(){ form.nome=''; form.periodo='mensal'; form.inicio=''; form.fim=''; form.tipo='faturamento'; form.alvo=0; form.responsavel=''; form.active=true; editId.value=null; errorMsg.value=''; successMsg.value='' }
function openNew(){ resetForm(); showModal.value = true }
function openEdit(g){ editId.value = g.id; form.nome=g.nome||''; form.periodo=g.periodo||'mensal'; form.inicio=g.inicio||''; form.fim=g.fim||''; form.tipo=g.tipo||'faturamento'; form.alvo=Number(g.alvo||0); form.responsavel=g.responsavel||''; form.active = g.active !== false; errorMsg.value=''; successMsg.value=''; showModal.value=true }
function close(){ showModal.value = false }

async function load(){
  loading.value = true; loadError.value=''
  try { metas.value = await listGoals() }
  catch(e){ loadError.value = e?.message || 'Erro ao carregar metas' }
  finally { loading.value = false }
}

async function save(){
  errorMsg.value=''; successMsg.value=''
  if (!form.nome) { errorMsg.value='Nome é obrigatório.'; return }
  if (!!form.inicio && !!form.fim && form.inicio > form.fim) { errorMsg.value='Início não pode ser após o fim.'; return }
  const payload = { nome: form.nome, periodo: form.periodo, inicio: form.inicio||null, fim: form.fim||null, tipo: form.tipo, alvo: Number(form.alvo||0), responsavel: form.responsavel, active: !!form.active }
  try {
    if (editId.value) await updateGoal(editId.value, payload); else await createGoal(payload)
    successMsg.value = 'Meta salva.'
    close(); resetForm(); await load()
  } catch (e) { errorMsg.value = e?.message || 'Erro ao salvar' }
}

async function onDelete(g){ if (!confirm('Confirma excluir a meta #' + g.id + '?')) return; try { await deleteGoal(g.id); await load() } catch(err){ errorMsg.value = err?.message || 'Erro ao excluir' } }

onMounted(async () => { await load() })
</script>
