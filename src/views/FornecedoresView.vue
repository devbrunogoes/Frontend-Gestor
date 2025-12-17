<template>
  <section class="content-area suppliers-view">
    <header class="page-header suppliers-header">
      <div class="header-copy">
        <h2>Fornecedores</h2>
        <p>Mantenha dados de contato sempre à mão para agilizar negociações e compras.</p>
      </div>
      <button class="btn btn-primary header-action" type="button" @click="openNew">
        <i class="fa-solid fa-plus"></i>
        <span>Novo fornecedor</span>
      </button>
    </header>

    <div class="summary-banner" v-if="!loading && !loadError">
      <div class="summary-item">
        <span class="summary-label">Total de fornecedores</span>
        <strong class="summary-value">{{ suppliers.length }}</strong>
      </div>
      <div class="summary-hint">
        Atualize contatos sempre que algum dado mudar para evitar atrasos em pedidos.
      </div>
    </div>

    <BaseError v-if="loadError" :message="loadError" :retry="load" />
    <BaseLoading v-else-if="loading" message="Carregando fornecedores…" />
    <div v-else class="table-card">
      <div v-if="!suppliers.length" class="empty-state">
        <i class="fa-solid fa-truck"></i>
        <h3>Nenhum fornecedor cadastrado</h3>
        <p>Clique em “Novo fornecedor” para adicionar seus parceiros comerciais.</p>
        <button class="btn btn-primary" type="button" @click="openNew">
          <i class="fa-solid fa-plus"></i>
          <span>Adicionar primeiro fornecedor</span>
        </button>
      </div>
      <table v-else class="data-table suppliers-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nome</th>
            <th>CNPJ</th>
            <th>Contato</th>
            <th>Telefone</th>
            <th>E-mail</th>
            <th>Status</th>
            <th class="table-actions">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in suppliers" :key="s.id">
            <td data-label="ID">#{{ s.id }}</td>
            <td data-label="Nome">
              <div class="cell-main">
                <strong>{{ s.nome }}</strong>
                <small v-if="s.contato" class="cell-muted">Contato principal: {{ s.contato }}</small>
              </div>
            </td>
            <td data-label="CNPJ">{{ s.cnpj || '—' }}</td>
            <td data-label="Contato">{{ s.contato || '—' }}</td>
            <td data-label="Telefone">{{ s.telefone || '—' }}</td>
            <td data-label="E-mail" class="cell-email">
              <a v-if="s.email" :href="`mailto:${s.email}`">{{ s.email }}</a>
              <span v-else>—</span>
            </td>
            <td data-label="Status">
              <span :class="['status-pill', s.active !== false ? 'status-active' : 'status-inactive']">
                {{ s.active !== false ? 'Ativo' : 'Inativo' }}
              </span>
            </td>
            <td data-label="Ações" class="table-actions">
              <div class="action-buttons">
                <button class="btn-icon" type="button" @click="openEdit(s)" title="Editar fornecedor">
                  <i class="fa-solid fa-pen"></i>
                </button>
                <button class="btn-icon danger" type="button" @click="onDelete(s)" title="Excluir fornecedor">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="modal" role="dialog" aria-hidden="true" :class="{ show: showModal }" @click.self="close">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <div>
              <h3>{{ editId ? 'Editar fornecedor' : 'Novo fornecedor' }}</h3>
              <p class="modal-subtitle">
                Preencha os dados básicos para manter o histórico de compras organizado.
              </p>
            </div>
            <button type="button" class="btn-close" @click="close" aria-label="Fechar">
              <i class="fa-solid fa-times"></i>
            </button>
          </div>
          <form @submit.prevent="save">
            <div class="modal-body">
              <div class="form-grid">
                <div class="form-group form-group-large">
                  <label for="nome">Nome</label>
                  <input id="nome" class="form-control" v-model.trim="form.nome" required />
                </div>
                <div class="form-group">
                  <label for="cnpj">CNPJ</label>
                  <input id="cnpj" class="form-control" v-model.trim="form.cnpj" />
                </div>
                <div class="form-group">
                  <label for="contato">Contato</label>
                  <input id="contato" class="form-control" v-model.trim="form.contato" />
                </div>
                <div class="form-group">
                  <label for="telefone">Telefone</label>
                  <input id="telefone" class="form-control" v-model.trim="form.telefone" />
                </div>
                <div class="form-group form-group-large">
                  <label for="email">E-mail</label>
                  <input id="email" type="email" class="form-control" v-model.trim="form.email" />
                </div>
                <div class="form-group">
                  <label for="ativo">Status</label>
                  <select id="ativo" class="form-control" v-model="form.active">
                    <option :value="true">Ativo</option>
                    <option :value="false">Inativo</option>
                  </select>
                </div>
              </div>
              <div v-if="errorMsg" class="alert alert-error">{{ errorMsg }}</div>
              <div v-if="successMsg" class="alert alert-success">{{ successMsg }}</div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="close">Cancelar</button>
              <button type="submit" class="btn btn-success">Salvar fornecedor</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { listSuppliers, createSupplier, updateSupplier, deleteSupplier } from '@/services/suppliers'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseError from '@/components/ui/BaseError.vue'

const suppliers = ref([])
const loading = ref(false)
const loadError = ref('')
const showModal = ref(false)
const editId = ref(null)
const form = reactive({ nome:'', cnpj:'', contato:'', telefone:'', email:'', active:true })
const errorMsg = ref('')
const successMsg = ref('')

function resetForm(){ form.nome=''; form.cnpj=''; form.contato=''; form.telefone=''; form.email=''; form.active=true; editId.value=null; errorMsg.value=''; successMsg.value='' }
function openNew(){ resetForm(); showModal.value = true }
function openEdit(s){ editId.value = s.id; form.nome=s.nome||''; form.cnpj=s.cnpj||''; form.contato=s.contato||''; form.telefone=s.telefone||''; form.email=s.email||''; form.active = s.active !== false; errorMsg.value=''; successMsg.value=''; showModal.value=true }
function close(){ showModal.value = false }

async function load(){
  loading.value = true; loadError.value = ''
  try { suppliers.value = await listSuppliers() } catch (e) { loadError.value = e?.message || 'Erro ao carregar fornecedores' }
  finally { loading.value = false }
}

async function save(){
  errorMsg.value=''; successMsg.value=''
  if (!form.nome) { errorMsg.value='Nome é obrigatório.'; return }
  const payload = { nome: form.nome, cnpj: form.cnpj, contato: form.contato, telefone: form.telefone, email: form.email, active: !!form.active }
  try {
    if (editId.value) await updateSupplier(editId.value, payload); else await createSupplier(payload)
    successMsg.value = 'Fornecedor salvo.'
    close(); resetForm(); await load()
  } catch (e) { errorMsg.value = e?.message || 'Erro ao salvar' }
}

async function onDelete(s){ if (!confirm('Confirma excluir o fornecedor #' + s.id + '?')) return; try { await deleteSupplier(s.id); await load() } catch(e){ errorMsg.value = e?.message || 'Erro ao excluir' } }

onMounted(async () => { await load() })
</script>

<style scoped>
.suppliers-view {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.suppliers-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1.8rem 2rem;
  background: linear-gradient(135deg, #ffffff 0%, #f4f8ff 100%);
  border-radius: 22px;
  box-shadow: 0 24px 46px rgba(15, 30, 60, 0.12);
}

.header-copy h2 {
  margin: 0;
  font-size: 1.85rem;
  font-weight: 700;
  color: #101828;
}

.header-copy p {
  margin: 0.35rem 0 0;
  color: #667085;
  max-width: 480px;
}

.header-action {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border-radius: 999px;
  padding: 0.7rem 1.6rem;
  font-weight: 600;
}

.summary-banner {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.35rem;
  border-radius: 16px;
  background: rgba(13, 110, 253, 0.06);
  border: 1px solid rgba(13, 110, 253, 0.15);
  color: #0f172a;
}

.summary-item {
  display: flex;
  flex-direction: column;
}

.summary-label {
  font-size: 0.85rem;
  color: rgba(15, 23, 42, 0.68);
}

.summary-value {
  font-size: 1.35rem;
  font-weight: 700;
}

.summary-hint {
  font-size: 0.9rem;
  color: #475569;
}

.table-card {
  background: #fff;
  border-radius: 20px;
  padding: 1.6rem;
  box-shadow: 0 22px 40px rgba(15, 30, 60, 0.1);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 3rem 1.5rem;
  text-align: center;
  color: #475569;
}

.empty-state i {
  font-size: 2rem;
  color: #0d6efd;
}

.empty-state h3 {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
  color: #0f172a;
}

.empty-state p {
  margin: 0;
  max-width: 360px;
}

.empty-state .btn {
  margin-top: 0.5rem;
  gap: 0.45rem;
  border-radius: 999px;
}

.suppliers-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
}

.suppliers-table thead {
  background: rgba(13, 110, 253, 0.08);
  color: #0f172a;
}

.suppliers-table th,
.suppliers-table td {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
}

.suppliers-table tbody tr:hover {
  background: rgba(148, 163, 184, 0.1);
}

.cell-main {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.cell-muted {
  color: #64748b;
  font-size: 0.85rem;
}

.cell-email a {
  color: #0d6efd;
  text-decoration: none;
}

.cell-email a:hover {
  text-decoration: underline;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 90px;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
}

.status-active {
  background: rgba(25, 199, 100, 0.18);
  color: #198754;
}

.status-inactive {
  background: rgba(220, 38, 38, 0.15);
  color: #b91c1c;
}

.table-actions {
  text-align: right;
}

.action-buttons {
  display: inline-flex;
  gap: 0.4rem;
}

.btn-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: #fff;
  color: #0f172a;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}

.btn-icon:hover {
  background: rgba(13, 110, 253, 0.12);
  border-color: rgba(13, 110, 253, 0.35);
  transform: translateY(-1px);
}

.btn-icon.danger {
  color: #dc2626;
  border-color: rgba(220, 38, 38, 0.2);
}

.btn-icon.danger:hover {
  background: rgba(220, 38, 38, 0.12);
  border-color: rgba(220, 38, 38, 0.4);
}

.modal-content {
  border: none;
  border-radius: 20px;
  box-shadow: 0 28px 56px rgba(15, 30, 60, 0.22);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.25rem;
  padding: 1.4rem 1.6rem;
  background: linear-gradient(135deg, rgba(13, 110, 253, 0.1) 0%, rgba(13, 110, 253, 0.03) 100%);
  border-bottom: 1px solid rgba(13, 110, 253, 0.1);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
  color: #0f172a;
}

.modal-subtitle {
  margin: 0.45rem 0 0;
  font-size: 0.9rem;
  color: #475569;
}

.btn-close {
  border: none;
  background: transparent;
  color: #0f172a;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  transition: background 0.2s ease, transform 0.2s ease;
}

.btn-close:hover {
  background: rgba(15, 23, 42, 0.08);
  transform: scale(1.05);
}

.modal-body {
  padding: 1.35rem 1.6rem;
  background: #fff;
}

.form-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(12, minmax(0, 1fr));
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  grid-column: span 6;
}

.form-group-large {
  grid-column: span 12;
}

.form-group label {
  font-weight: 600;
  color: #475569;
}

.form-control {
  border: 1px solid #cbd5f5;
  border-radius: 10px;
  padding: 0.6rem 0.75rem;
  font-size: 0.95rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-control:focus {
  outline: none;
  border-color: #0d6efd;
  box-shadow: 0 0 0 4px rgba(13, 110, 253, 0.18);
}

.alert {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  font-weight: 600;
}

.alert-error {
  background: rgba(220, 38, 38, 0.1);
  color: #b91c1c;
  border: 1px solid rgba(220, 38, 38, 0.2);
}

.alert-success {
  background: rgba(34, 197, 94, 0.12);
  color: #15803d;
  border: 1px solid rgba(34, 197, 94, 0.24);
}

.modal-footer {
  padding: 1.1rem 1.6rem;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.modal-footer .btn {
  padding: 0.65rem 1.35rem;
  border-radius: 999px;
  font-weight: 600;
}

@media (max-width: 960px) {
  .suppliers-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-action {
    justify-content: center;
  }

  .table-card {
    padding: 1.25rem;
  }

  .suppliers-table th,
  .suppliers-table td {
    padding: 0.75rem;
  }
}

@media (max-width: 720px) {
  .suppliers-table {
    display: block;
  }

  .suppliers-table thead {
    display: none;
  }

  .suppliers-table tbody {
    display: grid;
    gap: 1rem;
  }

  .suppliers-table tr {
    display: grid;
    gap: 0.6rem;
    padding: 1rem;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    background: rgba(241, 245, 249, 0.8);
  }

  .suppliers-table td {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border: none;
    padding: 0;
  }

  .suppliers-table td::before {
    content: attr(data-label);
    font-weight: 600;
    color: #475569;
  }

  .table-actions {
    justify-content: flex-end;
  }
}
</style>
