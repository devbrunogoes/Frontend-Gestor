<template>
  <section class="content-area products-view">
    <header class="page-header products-header">
      <div class="header-copy">
        <h2>Produtos</h2>
        <p>Gerencie catálogo, estoque e fornecedores com rapidez e clareza.</p>
      </div>
      <button class="btn btn-primary header-action" type="button" @click="openNew">
        <i class="fa-solid fa-box-open"></i>
        <span>Novo produto</span>
      </button>
    </header>

    <div class="summary-row" v-if="!loading && !loadError">
      <div class="summary-card">
        <span class="label">Produtos cadastrados</span>
        <strong class="value">{{ products.length }}</strong>
      </div>
      <div class="summary-card">
        <span class="label">Itens ativos</span>
        <strong class="value">{{ products.filter(p => p.active !== false).length }}</strong>
      </div>
      <div class="summary-card hint">
        Mantenha estoque mínimo atualizado para evitar rupturas nas vendas.
      </div>
    </div>

    <BaseError v-if="loadError" :message="loadError" :retry="load" />
    <BaseLoading v-else-if="loading" message="Carregando produtos…" />
    <div v-else class="products-area">
      <div v-if="!products.length" class="empty-state">
        <i class="fa-solid fa-box"></i>
        <h3>Comece adicionando seus produtos</h3>
        <p>Cadastre códigos e preços para abastecer as telas de venda e estoque.</p>
        <button class="btn btn-primary" type="button" @click="openNew">
          <i class="fa-solid fa-plus"></i>
          <span>Adicionar primeiro produto</span>
        </button>
      </div>
      <div v-else class="products-grid">
        <article
          v-for="p in products"
          :key="p.id"
          class="product-card"
          :class="{ 'is-inactive': p.active === false }"
        >
          <div class="product-card-header">
            <div class="product-overview">
              <div class="product-thumb" :class="{ 'has-image': buildImageSrc(p) }">
                <img v-if="buildImageSrc(p)" :src="buildImageSrc(p)" :alt="p.name || 'Imagem do produto'" />
                <i v-else class="fa-solid fa-image" aria-hidden="true"></i>
              </div>
              <div class="product-texts">
                <div class="product-title-row">
                  <h3>{{ p.name || 'Produto sem nome' }}</h3>
                  <span class="code-chip">{{ p.code || 'Sem código' }}</span>
                </div>
                <div class="product-meta-row">
                  <span class="meta-pill">#{{ p.id }}</span>
                  <span v-if="p.category?.name" class="meta-pill">{{ p.category.name }}</span>
                  <span v-if="p.supplier?.name" class="meta-pill light">{{ p.supplier.name }}</span>
                </div>
                <p v-if="p.description" class="product-description">{{ p.description }}</p>
              </div>
            </div>
            <div class="product-card-actions">
              <span :class="['status-pill', p.active !== false ? 'status-active' : 'status-inactive']">
                {{ p.active !== false ? 'Ativo' : 'Inativo' }}
              </span>
              <div class="action-buttons">
                <button class="btn-icon" type="button" @click="openEdit(p)" title="Editar produto">
                  <i class="fa-solid fa-pen"></i>
                </button>
                <button class="btn-icon danger" type="button" @click="onDelete(p)" title="Excluir produto">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
          <div class="product-card-body">
            <div class="product-stat">
              <span class="label">Preço</span>
              <strong>{{ formatPrice(p.price) }}</strong>
            </div>
            <div class="product-stat">
              <span class="label">Estoque</span>
              <div class="stat-stack">
                <span :class="['stock-pill', stockStatus(p)]">{{ p.stockQuantity ?? 0 }}</span>
                <small v-if="p.minStock" class="cell-muted">mín. {{ p.minStock }}</small>
              </div>
            </div>
            <div class="product-stat">
              <span class="label">Fornecedor</span>
              <strong>{{ p.supplier?.name || '—' }}</strong>
            </div>
          </div>
        </article>
      </div>
    </div>

    <div class="modal" role="dialog" aria-labelledby="produtoModalLabel" aria-hidden="true" :class="{ show: showModal }" @click.self="close">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <div>
              <h3 id="produtoModalLabel">{{ editId ? 'Editar produto' : 'Novo produto' }}</h3>
              <p class="modal-subtitle">Organize código, preço e estoque para manter o catálogo consistente.</p>
            </div>
            <button type="button" class="btn-close" @click="close" aria-label="Fechar">
              <i class="fa-solid fa-times"></i>
            </button>
          </div>
          <form @submit.prevent="save">
            <div class="modal-body">
              <div class="form-grid">
                <div class="form-group span-4 image-upload">
                  <label>Imagem</label>
                  <div class="image-picker">
                    <div class="image-preview" :class="{ 'has-image': imagePreview }">
                      <img v-if="imagePreview" :src="imagePreview" alt="Pré-visualização do produto" />
                      <i v-else class="fa-solid fa-image" aria-hidden="true"></i>
                    </div>
                    <div class="image-actions">
                      <button type="button" class="btn btn-outline" @click="triggerImageSelection">
                        <i class="fa-solid fa-upload"></i>
                        <span>Selecionar imagem</span>
                      </button>
                      <button v-if="form.imageData" type="button" class="btn btn-link" @click="clearImage">Remover imagem</button>
                      <small class="field-hint">Formatos JPG ou PNG até 2MB.</small>
                    </div>
                  </div>
                  <input ref="imageFileInput" type="file" accept="image/*" class="sr-only" @change="handleImageSelection" />
                </div>
                <div class="form-group span-4">
                  <label for="code">Código</label>
                  <input id="code" class="form-control" v-model.trim="form.code" required placeholder="SKU ou referência interna" />
                  <small class="field-hint">Use o identificador que sua equipe já utiliza no dia a dia.</small>
                </div>
                <div class="form-group span-8">
                  <label for="name">Nome</label>
                  <input id="name" class="form-control" v-model.trim="form.name" required placeholder="Nome comercial do produto" />
                  <small class="field-hint">Este nome aparece nas telas de venda, estoque e relatórios.</small>
                </div>
                <div class="form-group form-group-large">
                  <label for="description">Descrição</label>
                  <textarea id="description" class="form-control" rows="3" v-model.trim="form.description" placeholder="Detalhes importantes para a equipe ou vendedor"></textarea>
                  <small class="field-hint">Inclua observações para orientar a venda ou reposição.</small>
                </div>
                <div class="form-group span-3">
                  <label for="price">Preço</label>
                  <input id="price" type="number" min="0" step="0.01" class="form-control" v-model.number="form.price" placeholder="0,00" />
                  <small class="field-hint">Valor de venda exibido em Vendas e Relatórios.</small>
                </div>
                <div class="form-group span-3">
                  <label for="cost">Custo</label>
                  <input id="cost" type="number" min="0" step="0.01" class="form-control" v-model.number="form.cost" placeholder="0,00" />
                  <small class="field-hint">Ajuda a calcular margem e controlar gastos.</small>
                </div>
                <div class="form-group span-3">
                  <label for="stockQuantity">Qtd. Estoque</label>
                  <input id="stockQuantity" type="number" min="0" step="1" class="form-control" v-model.number="form.stockQuantity" placeholder="0" />
                  <small class="field-hint">Quantidade disponível para venda imediata.</small>
                </div>
                <div class="form-group span-3">
                  <label for="minStock">Estoque Mín.</label>
                  <input id="minStock" type="number" min="0" step="1" class="form-control" v-model.number="form.minStock" placeholder="0" />
                  <small class="field-hint">Quando atingido, sinaliza necessidade de reposição.</small>
                </div>
                <div class="form-group span-3 active-field">
                  <label>Status</label>
                  <div class="status-toggle">
                    <button type="button" :class="['toggle-pill', form.active ? 'is-active' : '']" @click="form.active = true">
                      <i class="fa-solid fa-check"></i>
                      <span>Ativo</span>
                    </button>
                    <button type="button" :class="['toggle-pill', !form.active ? 'is-active' : '']" @click="form.active = false">
                      <i class="fa-solid fa-pause"></i>
                      <span>Inativo</span>
                    </button>
                  </div>
                  <small class="field-hint">Produtos inativos não aparecem nas telas operacionais.</small>
                </div>
                <div class="form-actions">
                  <button type="button" class="btn btn-secondary" @click="close">Cancelar</button>
                  <button type="submit" class="btn btn-success">Salvar produto</button>
                </div>
              </div>
              <div v-if="errorMsg" class="alert alert-error">{{ errorMsg }}</div>
              <div v-if="successMsg" class="alert alert-success">{{ successMsg }}</div>
            </div>
          </form>
        </div>
      </div>
    </div>
  </section>
  
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { listProducts, createProduct, updateProduct, deleteProduct } from '@/services/products'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseError from '@/components/ui/BaseError.vue'

const products = ref([])
const loading = ref(false)
const loadError = ref('')
const showModal = ref(false)
const editId = ref(null)
const form = reactive({
  code: '',
  name: '',
  description: '',
  price: 0,
  cost: 0,
  stockQuantity: 0,
  minStock: 0,
  active: true,
  imageData: null,
  imageContentType: null
})
const errorMsg = ref('')
const successMsg = ref('')
const imagePreview = ref('')
const imageFileInput = ref(null)

const stockStatus = (product) => {
  const qty = Number(product?.stockQuantity ?? 0)
  const min = Number(product?.minStock ?? 0)
  if (qty <= 0) return 'stock-empty'
  if (min > 0 && qty <= min) return 'stock-low'
  return 'stock-ok'
}

function formatPrice(v){ const n = Number(v||0); return n.toLocaleString('pt-BR',{ style:'currency', currency:'BRL' }) }

function resetForm(){
  form.code=''; form.name=''; form.description=''; form.price=0; form.cost=0; form.stockQuantity=0; form.minStock=0; form.active=true
  form.imageData = null; form.imageContentType = null; imagePreview.value = ''
  resetFileInput()
  editId.value = null; errorMsg.value=''; successMsg.value=''
}
function openNew(){ resetForm(); showModal.value = true }
function openEdit(p){
  editId.value = p.id
  form.code = p.code || ''
  form.name = p.name || ''
  form.description = p.description || ''
  form.price = Number(p.price || 0)
  form.cost = Number(p.cost || 0)
  form.stockQuantity = Number(p.stockQuantity || 0)
  form.minStock = Number(p.minStock || 0)
  form.active = !!p.active
  form.imageData = p.imageData || null
  form.imageContentType = p.imageContentType || null
  imagePreview.value = buildImageSrc(p)
  errorMsg.value=''; successMsg.value=''
  showModal.value = true
}
function close(){ showModal.value = false }

async function load(){
  loading.value = true; loadError.value = ''
  try { products.value = await listProducts() } catch (e) { loadError.value = e?.message || 'Erro ao carregar produtos' }
  finally { loading.value = false }
}

async function save(){
  errorMsg.value=''; successMsg.value=''
  if (!form.code || !form.name) { errorMsg.value='Código e Nome são obrigatórios.'; return }
  const payload = {
    code: form.code, name: form.name, description: form.description,
    price: Number(form.price||0), cost: Number(form.cost||0),
    stockQuantity: Number(form.stockQuantity||0), minStock: Number(form.minStock||0),
    active: !!form.active,
    imageData: form.imageData,
    imageContentType: form.imageContentType
  }
  try {
    if (editId.value) await updateProduct(editId.value, payload); else await createProduct(payload)
    successMsg.value = 'Produto salvo.'
    close(); resetForm(); await load()
  } catch (e) { errorMsg.value = e?.message || 'Erro ao salvar' }
}

async function onDelete(p){ if (!confirm('Confirma excluir o produto #' + p.id + '?')) return; try { await deleteProduct(p.id); await load() } catch(e){ errorMsg.value = e?.message || 'Erro ao excluir' } }

onMounted(async () => { await load() })

function buildImageSrc(product){
  if (!product || !product.imageData) return ''
  const type = product.imageContentType || 'image/png'
  return `data:${type};base64,${product.imageData}`
}

function handleImageSelection(event){
  const inputEl = event?.target || imageFileInput.value
  const file = inputEl?.files?.[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) {
    errorMsg.value = 'A imagem deve ter no máximo 2MB.'
    if (inputEl) inputEl.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = (e) => {
    const result = e.target?.result
    if (typeof result !== 'string') return
    const [meta, data] = result.split(',')
    if (!data) return
    const mimeMatch = meta.match(/data:(.*);base64/)
    form.imageData = data
    form.imageContentType = mimeMatch?.[1] || file.type || 'image/png'
    imagePreview.value = result
    errorMsg.value = ''
  if (imageFileInput.value) imageFileInput.value.value = ''
  }
  reader.readAsDataURL(file)
}

function clearImage(){
  form.imageData = null
  form.imageContentType = null
  imagePreview.value = ''
  resetFileInput()
}

function resetFileInput(){
  if (imageFileInput.value) imageFileInput.value.value = ''
}

function triggerImageSelection(){
  errorMsg.value = ''
  imageFileInput.value?.click?.()
}
</script>

<style scoped>
.products-view {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.products-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1.8rem 2rem;
  background: linear-gradient(135deg, #ffffff 0%, #f5f8ff 100%);
  border-radius: 22px;
  box-shadow: 0 24px 44px rgba(15, 30, 60, 0.12);
}

.header-copy h2 {
  margin: 0;
  font-size: 1.85rem;
  font-weight: 700;
  color: #101828;
}

.header-copy p {
  margin: 0.4rem 0 0;
  color: #667085;
  max-width: 520px;
}

.header-action {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.7rem 1.6rem;
  border-radius: 999px;
  font-weight: 600;
}

.summary-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.summary-card {
  padding: 1.1rem 1.35rem;
  border-radius: 18px;
  background: linear-gradient(145deg, #ffffff 0%, #f1f5ff 100%);
  border: 1px solid rgba(13, 110, 253, 0.12);
  box-shadow: 0 20px 40px rgba(15, 30, 60, 0.1);
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.summary-card.hint {
  justify-content: center;
  color: #475569;
  font-size: 0.95rem;
  text-align: center;
}

.products-area {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.products-grid {
  display: grid;
  gap: 1.4rem;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

.product-card {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.5rem 1.4rem;
  border-radius: 24px;
  background: linear-gradient(180deg, #ffffff 0%, #f7f9ff 65%, #eef2ff 100%);
  border: 1px solid rgba(13, 110, 253, 0.08);
  box-shadow: 0 18px 36px rgba(15, 30, 60, 0.12);
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}

.product-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 28px 56px rgba(15, 30, 60, 0.16);
  border-color: rgba(13, 110, 253, 0.18);
}

.product-card.is-inactive {
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 65%, #f1f5f9 100%);
  border-color: rgba(148, 163, 184, 0.35);
  box-shadow: 0 18px 30px rgba(15, 23, 42, 0.08);
  opacity: 0.88;
}

.product-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.2rem;
}

.product-overview {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.product-thumb {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(13, 110, 253, 0.18) 0%, rgba(13, 110, 253, 0.05) 100%);
  border: 1px solid rgba(13, 110, 253, 0.18);
  color: #0d6efd;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  overflow: hidden;
  position: relative;
}

.product-thumb.has-image {
  background: transparent;
  border: none;
}

.product-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.product-texts {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.product-title-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  align-items: center;
}

.product-title-row h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
}

.code-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.65rem;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-radius: 999px;
  background: rgba(15, 118, 218, 0.12);
  color: #0f6fda;
}

.product-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.meta-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.28rem 0.6rem;
  border-radius: 12px;
  font-size: 0.78rem;
  font-weight: 600;
  color: #475569;
  background: rgba(226, 232, 240, 0.85);
}

.meta-pill.light {
  background: rgba(125, 211, 252, 0.12);
  color: #0f172a;
}

.product-description {
  margin: 0.1rem 0 0;
  color: #55627a;
  font-size: 0.88rem;
  line-height: 1.45;
  max-width: 520px;
}

.product-card-actions {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  align-items: flex-end;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.32rem 0.65rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.status-active {
  background: rgba(34, 197, 94, 0.18);
  color: #15803d;
}

.status-inactive {
  background: rgba(220, 38, 38, 0.18);
  color: #b91c1c;
}

.product-card-body {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  padding: 1rem;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(13, 110, 253, 0.08);
}

.product-stat {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.product-stat .label {
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
}

.product-stat strong {
  font-size: 1.15rem;
  color: #0f172a;
}

.stat-stack {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.modal {
  position: fixed;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  background: rgba(10, 20, 40, 0.45);
  padding: 2rem 1.5rem;
  z-index: 1100;
}

.modal.show {
  display: flex;
}

.modal-dialog {
  width: min(1200px, 94vw);
  max-width: none;
  max-height: 94vh;
  display: flex;
}

.modal-content {
  border: none;
  border-radius: 20px;
  box-shadow: 0 28px 56px rgba(15, 30, 60, 0.22);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  flex: 1;
  max-height: 94vh;
}

.footer-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 1rem;
  align-items: center;
}

.footer-spacer {
  grid-column: span 9;
}

.footer-actions {
  grid-column: span 3;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
  padding: 3rem 1.5rem;
  text-align: center;
  color: #475569;
}

.empty-state i {
  font-size: 2.1rem;
  color: #0d6efd;
}

.empty-state h3 {
  margin: 0;
  font-size: 1.45rem;
  font-weight: 700;
  color: #0f172a;
}

.empty-state p {
  margin: 0;
  max-width: 360px;
}

.empty-state .btn {
  gap: 0.45rem;
  border-radius: 999px;
}

.products-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
}

.products-table thead {
  background: rgba(13, 110, 253, 0.08);
  color: #0f172a;
}

.products-table th,
.products-table td {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
}

.products-table tbody tr:hover {
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

.status-tag {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-tag.inactive {
  background: rgba(220, 38, 38, 0.15);
  color: #b91c1c;
}

.stock-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 60px;
  padding: 0.32rem 0.75rem;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.88rem;
}

.stock-ok {
  background: rgba(16, 185, 129, 0.18);
  color: #047857;
}

.stock-low {
  background: rgba(234, 179, 8, 0.2);
  color: #92400e;
}

.stock-empty {
  background: rgba(220, 38, 38, 0.22);
  color: #b91c1c;
}

.action-buttons {
  display: inline-flex;
  gap: 0.45rem;
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
  overflow-y: auto;
  flex: 1;
  max-height: calc(94vh - 180px);
}

.form-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  grid-auto-flow: row dense;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  grid-column: span 6;
}

.image-upload {
  grid-column: span 4;
}

.image-picker {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.image-preview {
  width: 96px;
  height: 96px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(13, 110, 253, 0.14) 0%, rgba(13, 110, 253, 0.04) 100%);
  border: 1px dashed rgba(13, 110, 253, 0.3);
  color: #0d6efd;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  overflow: hidden;
}

.image-preview.has-image {
  border-style: solid;
  border-color: rgba(13, 110, 253, 0.2);
  background: #ffffff;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-actions {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  align-items: flex-start;
}

.btn-link {
  border: none;
  background: transparent;
  color: #0d6efd;
  font-weight: 600;
  padding: 0;
  text-align: left;
  cursor: pointer;
}

.btn-link:hover {
  color: #0b5ed7;
  text-decoration: underline;
}

.span-4 {
  grid-column: span 4;
}

.span-3 {
  grid-column: span 3;
}

.span-8 {
  grid-column: span 8;
}

.span-12 {
  grid-column: span 12;
}

.active-field {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.status-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.28rem;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.12);
  border: 1px solid rgba(148, 163, 184, 0.28);
}

.toggle-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 1rem;
  border-radius: 999px;
  border: none;
  background: transparent;
  color: #475569;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.toggle-pill i {
  font-size: 0.85rem;
}

.toggle-pill:hover {
  color: #0f172a;
}

.toggle-pill.is-active {
  background: #0d6efd;
  color: #ffffff;
  box-shadow: 0 12px 24px rgba(13, 110, 253, 0.2);
}

.toggle-pill.is-active:hover {
  transform: translateY(-1px);
}

.form-group-large {
  grid-column: span 12;
}

.form-group label {
  font-weight: 600;
  color: #475569;
}

.form-actions {
  grid-column: span 12;
  margin-top: 0.35rem;
  padding-top: 1rem;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.9rem;
  border-top: 1px solid #e2e8f0;
}

.form-actions .btn {
  min-width: 140px;
  padding: 0.65rem 1.5rem;
  border-radius: 999px;
  font-weight: 600;
}

.field-hint {
  font-size: 0.8rem;
  color: #64748b;
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

textarea.form-control {
  resize: vertical;
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
}

.modal-footer .btn {
  padding: 0.65rem 1.35rem;
  border-radius: 999px;
  font-weight: 600;
}

.btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.2rem;
  border-radius: 999px;
  border: 1px dashed rgba(13, 110, 253, 0.45);
  background: rgba(13, 110, 253, 0.08);
  color: #0d6efd;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}

.btn-outline:hover {
  background: rgba(13, 110, 253, 0.16);
  border-style: solid;
  border-color: rgba(13, 110, 253, 0.55);
  transform: translateY(-1px);
}

.btn-outline:focus-visible {
  outline: 3px solid rgba(13, 110, 253, 0.35);
  outline-offset: 2px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

@media (min-width: 1440px) {
  .modal-dialog {
    width: min(1350px, 95vw);
  }
}

@media (max-width: 960px) {
  .products-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-action {
    justify-content: center;
  }
}

@media (max-width: 720px) {
  .summary-row {
    grid-template-columns: 1fr;
  }

  .products-grid {
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }

  .span-4 {
    grid-column: span 12;
  }

  .span-8 {
    grid-column: span 12;
  }

  .span-3 {
    grid-column: span 12;
  }

  .span-12 {
    grid-column: span 12;
  }

  .image-upload {
    grid-column: span 12;
  }

  .image-picker {
    flex-direction: column;
    align-items: flex-start;
  }

  .image-preview {
    width: 100%;
    max-width: 280px;
  }

  .active-field {
    grid-column: span 12;
  }

  .status-toggle {
    width: 100%;
    justify-content: space-between;
  }

  .status-toggle .toggle-pill {
    flex: 1;
    justify-content: center;
  }

  .form-actions {
    flex-direction: column-reverse;
    align-items: stretch;
    gap: 0.6rem;
    border-top: 1px solid rgba(226, 232, 240, 0.8);
  }

  .form-actions .btn {
    width: 100%;
  }

  .footer-grid {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .modal {
    padding: 1.5rem 0.75rem;
  }

  .modal-dialog {
    width: 100%;
  }

  .product-card {
    padding: 1.25rem 1.1rem;
  }

  .product-card-body {
    grid-template-columns: 1fr;
  }
}
</style>
