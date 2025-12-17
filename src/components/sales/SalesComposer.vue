<template>
  <div class="sales-composer">
    <form class="composer-form" @submit.prevent="handleSubmit">
      <section class="composer-card">
        <header>
          <h4>Cliente</h4>
          <p>Selecione um cliente cadastrado ou informe rapidamente o nome.</p>
        </header>
        <div class="form-grid">
          <div class="form-group">
            <label for="cliente-select">Cliente</label>
            <select id="cliente-select" v-model="form.clienteId">
              <option value="">Selecionar cliente</option>
              <option value="__livre__">Não cadastrado</option>
              <option v-for="cliente in clients" :key="cliente.id" :value="String(cliente.id)">
                {{ cliente.nome || cliente.name || `Cliente #${cliente.id}` }}
              </option>
            </select>
          </div>
          <div class="form-group" v-if="form.clienteId === '__livre__'">
            <label for="cliente-livre">Nome do cliente</label>
            <input id="cliente-livre" v-model.trim="form.clienteLivre" type="text" placeholder="Nome para a nota" />
          </div>
          <div class="form-group" v-if="form.origem === 'rota'">
            <label for="execucao-select">Execução da rota</label>
            <select id="execucao-select" v-model="form.execucaoId">
              <option value="">Selecionar execução</option>
              <option v-for="execucao in execucoes" :key="execucao.id" :value="String(execucao.id)">
                {{ execucao.id }} · {{ execucao.rotaNome || 'Rota' }} ({{ formatDate(execucao.inicioReal) }})
              </option>
            </select>
          </div>
        </div>
      </section>

      <section class="composer-card">
        <header>
          <h4>Itens da venda</h4>
          <p>Liste os produtos como na rota: busque no catálogo, ajuste os detalhes e confirme.</p>
        </header>

        <div class="catalog-search">
          <i class="fa-solid fa-search" aria-hidden="true"></i>
          <input
            id="catalog-search"
            v-model.trim="productSearch"
            type="search"
            placeholder="Buscar produto no catálogo"
          />
        </div>

        <div v-if="!filteredCatalog.length" class="empty-catalog">
          Nenhum produto encontrado no catálogo.
        </div>
        <ul v-else class="catalog-list">
          <li v-for="produto in filteredCatalog" :key="getProductKey(produto)" class="catalog-item">
            <button type="button" class="catalog-main" @click="toggleProduct(produto)">
              <div class="catalog-info">
                <strong>{{ produto.nome || produto.name || 'Produto' }}</strong>
                <small>{{ formatCurrency(extractPrice(produto)) }}</small>
              </div>
              <i
                class="fa-solid"
                :class="expandedProductId === getProductKey(produto) ? 'fa-chevron-up' : 'fa-chevron-down'"
                aria-hidden="true"
              ></i>
            </button>
            <transition name="fade">
              <div
                v-if="expandedProductId === getProductKey(produto)"
                class="catalog-actions"
              >
                <div class="catalog-control">
                  <label>Qtd</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    v-model.number="catalogDraft(produto).qtd"
                    @change="catalogDraft(produto).qtd = clampQuantity(catalogDraft(produto).qtd)"
                  />
                </div>
                <div class="catalog-control">
                  <label>Preço</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    v-model.number="catalogDraft(produto).preco"
                    @change="catalogDraft(produto).preco = clampCurrency(catalogDraft(produto).preco)"
                  />
                </div>
                <div class="catalog-control">
                  <label>Desconto</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    v-model.number="catalogDraft(produto).desconto"
                    @change="catalogDraft(produto).desconto = clampCurrency(catalogDraft(produto).desconto)"
                  />
                </div>
                <label class="catalog-checkbox">
                  <input type="checkbox" v-model="catalogDraft(produto).brinde" />
                  <span>Brinde</span>
                </label>
                <button type="button" class="btn-add-inline" @click="adicionarDoCatalogo(produto)">
                  Adicionar
                </button>
              </div>
            </transition>
          </li>
        </ul>

        <button type="button" class="manual-toggle" @click="toggleManual()">
          <i class="fa-solid" :class="showManual ? 'fa-circle-minus' : 'fa-circle-plus'" aria-hidden="true"></i>
          <span>{{ showManual ? 'Ocultar item manual' : 'Adicionar item manual' }}</span>
        </button>

        <transition name="fade">
          <div v-if="showManual" class="manual-form">
            <div class="form-grid manual-grid">
              <div class="form-group span-6">
                <label for="manual-nome">Produto</label>
                <input id="manual-nome" v-model.trim="manualDraft.nome" type="text" placeholder="Nome do item" />
              </div>
              <div class="form-group span-3">
                <label for="manual-qtd">Quantidade</label>
                <input id="manual-qtd" v-model.number="manualDraft.qtd" type="number" min="1" step="1" />
              </div>
              <div class="form-group span-3">
                <label for="manual-preco">Preço</label>
                <input id="manual-preco" v-model.number="manualDraft.preco" type="number" min="0" step="0.01" />
              </div>
              <div class="form-group span-3">
                <label for="manual-desc">Desconto</label>
                <input id="manual-desc" v-model.number="manualDraft.desconto" type="number" min="0" step="0.01" />
              </div>
              <div class="form-group span-3 manual-checkbox">
                <label class="checkbox-inline">
                  <input type="checkbox" v-model="manualDraft.brinde" />
                  <span>Brinde</span>
                </label>
              </div>
              <div class="form-group span-12">
                <button type="button" class="btn-add" @click="adicionarItemManual">Adicionar item manual</button>
              </div>
            </div>
          </div>
        </transition>

        <div v-if="itens.length" class="items-list">
          <article v-for="(item, index) in itens" :key="index" class="item-card">
            <header class="item-header">
              <input
                class="item-name"
                type="text"
                v-model.trim="item.nome"
                placeholder="Nome do produto"
                @change="handleItemChange(index)"
              />
              <button type="button" class="btn-remove" @click="removerItem(index)" aria-label="Remover item">
                <i class="fa-solid fa-trash" aria-hidden="true"></i>
              </button>
            </header>
            <div class="item-body">
              <label>
                <span>Qtd</span>
                <input type="number" min="1" step="1" v-model.number="item.qtd" @change="handleItemChange(index)" />
              </label>
              <label>
                <span>Preço</span>
                <input type="number" min="0" step="0.01" v-model.number="item.preco" @change="handleItemChange(index)" />
              </label>
              <label>
                <span>Desconto</span>
                <input type="number" min="0" step="0.01" v-model.number="item.desconto" @change="handleItemChange(index)" />
              </label>
              <label class="item-checkbox">
                <input type="checkbox" v-model="item.brinde" />
                <span>Brinde</span>
              </label>
            </div>
            <footer class="item-footer">
              <span>Subtotal</span>
              <strong>{{ formatCurrency(itemSubtotal(item)) }}</strong>
            </footer>
          </article>
        </div>

        <div class="resume" v-if="itens.length">
          <span>Itens: <strong>{{ itens.length }}</strong></span>
          <span>Brindes: <strong>{{ brindes }}</strong></span>
          <span>Descontos: <strong>{{ formatCurrency(totalDescontos) }}</strong></span>
          <span>Total: <strong>{{ formatCurrency(totalVenda) }}</strong></span>
        </div>
      </section>

      <section class="composer-card">
        <header>
          <h4>Pagamento</h4>
          <p>Escolha rapidamente a forma de pagamento ideal para o cliente.</p>
        </header>
        <div class="form-grid payment-grid">
          <div class="form-group">
            <label for="status-select">Status de recebimento</label>
            <select id="status-select" v-model="form.statusPagamento">
              <option value="Pago">Pago</option>
              <option value="Pendente">Pendente</option>
            </select>
          </div>
        </div>
        <div class="quick-methods" role="group" aria-label="Seleção rápida de formas de pagamento">
          <button type="button" :class="{ active: form.formaPagamento === 'Pix' }" @click="setMethod('Pix')">
            <i class="fa-solid fa-qrcode" aria-hidden="true"></i>
            Pix
          </button>
          <button type="button" :class="{ active: form.formaPagamento === 'Cartão' }" @click="setMethod('Cartão')">
            <i class="fa-solid fa-credit-card" aria-hidden="true"></i>
            Cartão
          </button>
          <button type="button" :class="{ active: form.formaPagamento === 'Dinheiro' }" @click="setMethod('Dinheiro')">
            <i class="fa-solid fa-coins" aria-hidden="true"></i>
            Dinheiro
          </button>
        </div>
        <div class="form-group">
          <label for="observacoes-input">Observações</label>
          <textarea id="observacoes-input" v-model.trim="form.observacoes" rows="2" placeholder="Informações adicionais (opcional)"></textarea>
        </div>
      </section>

      <footer class="composer-footer">
        <div class="feedback" v-if="feedback.message" :class="feedback.type">{{ feedback.message }}</div>
        <button type="submit" class="btn-primary" :disabled="salvando">
          <span v-if="salvando">Salvando…</span>
          <span v-else>Registrar venda</span>
        </button>
      </footer>
    </form>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { createSale } from '@/services/sales'

const props = defineProps({
  clients: { type: Array, default: () => [] },
  execucoes: { type: Array, default: () => [] },
  catalogo: { type: Array, default: () => [] },
  defaults: {
    type: Object,
    default: () => ({ origem: 'sistema', formaPagamento: 'Pix', statusPagamento: 'Pago', execucaoId: '' })
  }
})

const emit = defineEmits(['saved'])

const form = reactive({
  clienteId: '',
  clienteLivre: '',
  origem: props.defaults?.origem ?? 'sistema',
  execucaoId: props.defaults?.origem === 'rota' && props.defaults?.execucaoId
    ? String(props.defaults.execucaoId)
    : '',
  formaPagamento: props.defaults?.formaPagamento ?? 'Pix',
  statusPagamento: props.defaults?.statusPagamento ?? 'Pago',
  observacoes: ''
})

const itens = ref([])
const manualDraft = reactive({ nome: '', qtd: 1, preco: 0, desconto: 0, brinde: false })
const showManual = ref(false)
const productSearch = ref('')
const expandedProductId = ref('')
const catalogDrafts = reactive({})

const salvando = ref(false)
const feedback = reactive({ message: '', type: 'success' })

watch(
  () => props.defaults,
  (value) => {
    if (!value) return
    form.origem = value.origem ?? 'sistema'
    form.formaPagamento = value.formaPagamento ?? 'Pix'
    form.statusPagamento = value.statusPagamento ?? 'Pago'
    const defaultExec = value.execucaoId ? String(value.execucaoId) : ''
    form.execucaoId = form.origem === 'rota' ? defaultExec : ''
  },
  { immediate: true, deep: true }
)

watch(
  () => form.origem,
  (value) => {
    if (value !== 'rota') {
      form.execucaoId = ''
    } else if (!form.execucaoId && props.defaults?.execucaoId) {
      form.execucaoId = String(props.defaults.execucaoId)
    }
  }
)

const filteredCatalog = computed(() => {
  if (!Array.isArray(props.catalogo) || !props.catalogo.length) return []
  if (!productSearch.value) return props.catalogo
  const query = productSearch.value.toLowerCase()
  return props.catalogo.filter((item) => {
    const name = String(item?.nome || item?.name || '').toLowerCase()
    const description = String(item?.descricao || item?.description || '').toLowerCase()
    const sku = String(item?.sku || item?.codigo || '').toLowerCase()
    return name.includes(query) || description.includes(query) || sku.includes(query)
  })
})

const brindes = computed(() => itens.value.filter((item) => item.brinde).length)
const totalDescontos = computed(() =>
  itens.value.reduce((total, item) => total + (Number(item.desconto) || 0), 0)
)
const totalVenda = computed(() =>
  itens.value.reduce((total, item) => total + itemSubtotal(item), 0)
)

function setMethod(method) {
  form.formaPagamento = method
}

function clampQuantity(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 1
  return Math.max(1, Math.floor(numeric))
}

function clampCurrency(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < 0) return 0
  return Math.round(numeric * 100) / 100
}

function formatCurrency(value) {
  return (Number(value) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR')
}

function extractPrice(product) {
  return Number(product?.preco ?? product?.price ?? product?.valor ?? 0)
}

function getProductKey(product) {
  if (!product) return ''
  if (product.id !== undefined && product.id !== null) return String(product.id)
  if (product.codigo !== undefined && product.codigo !== null) return String(product.codigo)
  if (product.sku !== undefined && product.sku !== null) return String(product.sku)
  const base = String(product.nome || product.name || 'produto').toLowerCase().replace(/\s+/g, '-')
  return `${base}-${extractPrice(product)}`
}

function catalogDraft(product) {
  const key = getProductKey(product)
  if (!catalogDrafts[key]) {
    catalogDrafts[key] = {
      key,
      qtd: 1,
      preco: clampCurrency(extractPrice(product)),
      desconto: 0,
      brinde: false
    }
  }
  return catalogDrafts[key]
}

function toggleProduct(product) {
  const key = getProductKey(product)
  if (!key) return
  if (expandedProductId.value === key) {
    expandedProductId.value = ''
  } else {
    expandedProductId.value = key
    catalogDraft(product)
  }
}

function toggleManual() {
  showManual.value = !showManual.value
}

function adicionarDoCatalogo(product) {
  const draft = catalogDraft(product)
  const nome = product?.nome || product?.name
  if (!nome) {
    feedback.type = 'error'
    feedback.message = 'Produto sem nome no catálogo.'
    return
  }
  itens.value.push({
    nome,
    qtd: clampQuantity(draft.qtd),
    preco: clampCurrency(draft.preco),
    desconto: clampCurrency(draft.desconto),
    brinde: !!draft.brinde,
    catalogId: product?.id ?? null,
    catalogKey: draft.key
  })
  expandedProductId.value = ''
  draft.qtd = 1
  draft.desconto = 0
  draft.brinde = false
  feedback.message = ''
}

function resetManualDraft() {
  manualDraft.nome = ''
  manualDraft.qtd = 1
  manualDraft.preco = 0
  manualDraft.desconto = 0
  manualDraft.brinde = false
}

function adicionarItemManual() {
  if (!manualDraft.nome.trim()) {
    feedback.type = 'error'
    feedback.message = 'Informe o nome do item manual.'
    return
  }
  itens.value.push({
    nome: manualDraft.nome.trim(),
    qtd: clampQuantity(manualDraft.qtd),
    preco: clampCurrency(manualDraft.preco),
    desconto: clampCurrency(manualDraft.desconto),
    brinde: !!manualDraft.brinde,
    catalogId: null,
    catalogKey: null
  })
  resetManualDraft()
  showManual.value = false
  feedback.message = ''
}

function handleItemChange(index) {
  const item = itens.value[index]
  if (!item) return
  item.qtd = clampQuantity(item.qtd)
  item.preco = clampCurrency(item.preco)
  item.desconto = clampCurrency(item.desconto)
  if (!item.nome) {
    item.nome = 'Produto'
  }
}

function removerItem(index) {
  itens.value.splice(index, 1)
}

function itemSubtotal(item) {
  const subtotal = (Number(item.qtd) || 0) * (Number(item.preco) || 0) - (Number(item.desconto) || 0)
  return Math.max(subtotal, 0)
}

function validarFormulario() {
  const livre = form.clienteId === '__livre__'
  if (!livre && !form.clienteId) {
    feedback.type = 'error'
    feedback.message = 'Selecione um cliente ou use a opção "Não cadastrado".'
    return false
  }
  if (livre && !form.clienteLivre) {
    feedback.type = 'error'
    feedback.message = 'Informe o nome do cliente para finalizar sem cadastro.'
    return false
  }
  if (!itens.value.length) {
    feedback.type = 'error'
    feedback.message = 'Adicione pelo menos um item à venda.'
    return false
  }
  return true
}

function montarPayload() {
  const livre = form.clienteId === '__livre__'
  const clientId = !livre && form.clienteId ? Number(form.clienteId) : null
  const origem = form.origem || props.defaults?.origem || 'sistema'
  return {
    clientId,
    clientName: livre ? form.clienteLivre : null,
    origem,
    execucaoId: origem === 'rota' && form.execucaoId ? Number(form.execucaoId) : null,
    paymentMethod: form.formaPagamento,
    paymentStatus: form.statusPagamento,
    items: itens.value.map((item) => ({
      nome: item.nome,
      qtd: Number(item.qtd) || 0,
      preco: Number(item.preco) || 0,
      desconto: Number(item.desconto) || 0,
      brinde: !!item.brinde,
      catalogId: item.catalogId ?? undefined
    })),
    total: totalVenda.value,
    observacoes: form.observacoes
  }
}

function resetForm() {
  form.clienteId = ''
  form.clienteLivre = ''
  form.origem = props.defaults?.origem ?? 'sistema'
  form.execucaoId = form.origem === 'rota' && props.defaults?.execucaoId
    ? String(props.defaults.execucaoId)
    : ''
  form.formaPagamento = props.defaults?.formaPagamento ?? 'Pix'
  form.statusPagamento = props.defaults?.statusPagamento ?? 'Pago'
  form.observacoes = ''
  itens.value = []
  productSearch.value = ''
  expandedProductId.value = ''
  showManual.value = false
  Object.keys(catalogDrafts).forEach((key) => {
    delete catalogDrafts[key]
  })
  resetManualDraft()
}

async function handleSubmit() {
  if (!validarFormulario()) return
  salvando.value = true
  feedback.message = ''
  try {
    const payload = montarPayload()
    const resumo = {
      total: totalVenda.value,
      metodo: form.formaPagamento
    }
    await createSale(payload)
    resetForm()
    feedback.type = 'success'
    feedback.message = 'Venda registrada com sucesso.'
    emit('saved', resumo)
  } catch (error) {
    feedback.type = 'error'
    feedback.message = error?.message || 'Não foi possível salvar a venda.'
  } finally {
    salvando.value = false
  }
}
</script>

<style scoped>
.sales-composer {
  width: 100%;
}

.composer-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.composer-card {
  background: #fff;
  border-radius: 18px;
  padding: 1.75rem;
  box-shadow: 0 20px 40px rgba(15, 30, 60, 0.1);
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.composer-card header {
  background: transparent;
  color: #1f2933;
  padding: 0;
  box-shadow: none;
}

.composer-card header h4 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
}

.composer-card header p {
  margin: 0.35rem 0 0;
  color: #6c757d;
  font-size: 0.95rem;
}

.form-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(12, 1fr);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  grid-column: span 6;
}

.form-group label {
  font-weight: 600;
  color: #495057;
}

.form-group select,
.form-group input,
.form-group textarea {
  border: 1px solid #ced4da;
  border-radius: 10px;
  padding: 0.65rem 0.75rem;
  font-size: 0.95rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-group select:focus,
.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #3d8bfd;
  box-shadow: 0 0 0 4px rgba(61, 139, 253, 0.15);
}

.form-group textarea {
  resize: vertical;
}

.payment-grid {
  grid-template-columns: repeat(6, 1fr);
}

.quick-methods {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.quick-methods button {
  flex: 1;
  min-width: 120px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 999px;
  padding: 0.55rem 1.1rem;
  background: #f8f9fb;
  color: #495057;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.quick-methods button i {
  font-size: 1rem;
  color: inherit;
}

.quick-methods button.active {
  border-color: #0d6efd;
  background: #e7f1ff;
  color: #0d6efd;
  box-shadow: 0 12px 24px rgba(13, 110, 253, 0.18);
}

.quick-methods button:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(15, 30, 60, 0.1);
}

.catalog-search {
  position: relative;
}

.catalog-search i {
  position: absolute;
  top: 50%;
  left: 0.85rem;
  transform: translateY(-50%);
  color: #6c757d;
  font-size: 0.95rem;
}

.catalog-search input {
  width: 100%;
  border: 1px solid #ced4da;
  border-radius: 12px;
  padding: 0.65rem 0.75rem 0.65rem 2.4rem;
  font-size: 0.95rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.catalog-search input:focus {
  outline: none;
  border-color: #3d8bfd;
  box-shadow: 0 0 0 4px rgba(61, 139, 253, 0.15);
}

.empty-catalog {
  padding: 1rem;
  border: 1px dashed #ced4da;
  border-radius: 14px;
  text-align: center;
  color: #6c757d;
}

.catalog-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  margin: 0;
  padding: 0;
}

.catalog-item {
  border: 1px solid #e9ecef;
  border-radius: 14px;
  background: #f8f9fb;
  box-shadow: 0 8px 18px rgba(15, 30, 60, 0.08);
}

.catalog-main {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.95rem 1.1rem;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  color: inherit;
}

.catalog-info strong {
  display: block;
  font-size: 1rem;
  font-weight: 600;
  color: #212529;
}

.catalog-info small {
  display: block;
  font-size: 0.85rem;
  color: #6c757d;
}

.catalog-actions {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.75rem;
  padding: 0.95rem 1.1rem 1.35rem;
  border-top: 1px solid #dee2e6;
  background: #fff;
  border-radius: 0 0 14px 14px;
}

.catalog-control {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.catalog-control label {
  font-weight: 600;
  font-size: 0.85rem;
  color: #495057;
}

.catalog-control input {
  border: 1px solid #ced4da;
  border-radius: 10px;
  padding: 0.55rem 0.65rem;
  font-size: 0.9rem;
}

.catalog-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #495057;
}

.btn-add-inline {
  border: none;
  border-radius: 10px;
  padding: 0.6rem 1rem;
  background: linear-gradient(135deg, #198754 0%, #21a366 60%, #3ecf8e 100%);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.btn-add-inline:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(33, 163, 102, 0.25);
}

.manual-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  border: none;
  background: transparent;
  color: #0d6efd;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.manual-grid {
  grid-template-columns: repeat(12, 1fr);
}

.manual-checkbox {
  display: flex;
  align-items: flex-end;
}

.checkbox-inline {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #495057;
}

.btn-add {
  border: none;
  border-radius: 12px;
  padding: 0.65rem 1.1rem;
  background: linear-gradient(135deg, #198754 0%, #21a366 60%, #3ecf8e 100%);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.btn-add:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgba(33, 163, 102, 0.25);
}

.items-list {
  display: grid;
  gap: 1rem;
}

.item-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem 1.1rem;
  border-radius: 16px;
  background: #f8f9fb;
  box-shadow: 0 12px 24px rgba(15, 30, 60, 0.08);
}

.item-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: transparent;
  color: #1f2933;
  padding: 0;
}

.item-name {
  flex: 1;
  border: 1px solid #ced4da;
  border-radius: 10px;
  padding: 0.55rem 0.7rem;
  font-weight: 600;
  font-size: 0.95rem;
}

.item-body {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
}

.item-body label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: #495057;
  font-weight: 600;
}

.item-body input {
  border: 1px solid #ced4da;
  border-radius: 10px;
  padding: 0.55rem 0.65rem;
  font-size: 0.9rem;
}

.item-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
}

.item-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  color: #495057;
}

.item-footer strong {
  font-size: 1rem;
  color: #212529;
}

.btn-remove {
  border: none;
  background: transparent;
  color: #d6334c;
  cursor: pointer;
  font-size: 1rem;
}

.resume {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.95rem;
  color: #495057;
}

.resume strong {
  color: #212529;
}

.composer-footer {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: flex-start;
}

.btn-primary {
  border: none;
  border-radius: 999px;
  padding: 0.75rem 1.8rem;
  background: linear-gradient(135deg, #0d6efd 0%, #3d8bfd 60%, #70a1ff 100%);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-primary:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 18px 32px rgba(61, 139, 253, 0.3);
}

.feedback {
  font-size: 0.95rem;
  font-weight: 600;
}

.feedback.success {
  color: #198754;
}

.feedback.error {
  color: #d6334c;
}

.span-12 {
  grid-column: span 12;
}

.span-6 {
  grid-column: span 6;
}

.span-3 {
  grid-column: span 3;
}

@media (max-width: 960px) {
  .form-grid {
    grid-template-columns: repeat(6, 1fr);
  }

  .form-group {
    grid-column: span 6;
  }

  .payment-grid {
    grid-template-columns: repeat(6, 1fr);
  }

  .manual-grid {
    grid-template-columns: repeat(6, 1fr);
  }

  .span-12 {
    grid-column: span 6;
  }

  .span-6 {
    grid-column: span 6;
  }

  .span-3 {
    grid-column: span 3;
  }

  .catalog-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .item-body {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .composer-card {
    padding: 1.35rem;
  }

  .catalog-actions {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }

  .manual-grid {
    grid-template-columns: repeat(4, 1fr);
  }

  .form-grid {
    grid-template-columns: repeat(4, 1fr);
  }

  .form-group {
    grid-column: span 4;
  }

  .span-12 {
    grid-column: span 4;
  }

  .span-6 {
    grid-column: span 4;
  }

  .span-3 {
    grid-column: span 2;
  }

  .item-body {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
