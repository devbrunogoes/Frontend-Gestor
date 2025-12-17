<template>
  <section class="content-area sales-view">
    <header class="page-header">
      <div class="page-title">
        <h2>Vendas</h2>
        <p>Crie vendas em segundos com atalhos de pagamento integrados ao formulário.</p>
      </div>
      <button type="button" class="btn btn-primary" @click="handleComposerToggle">
        Vendas
      </button>
    </header>

    <BaseError v-if="loadError" :message="loadError" :retry="loadAll" />
    <BaseLoading v-else-if="loading" message="Carregando dados…" />
    <div v-else class="sales-layout">
      <p v-if="!showComposer" class="intro-hint">
        Toque em <strong>Vendas</strong> para abrir o formulário e usar os atalhos de Pix, Cartão ou Dinheiro.
      </p>
      <transition name="fade-slide">
        <div v-if="showComposer" ref="composerAnchor" class="composer-wrapper">
          <div v-if="successMessage" class="feedback-banner">
            {{ successMessage }}
          </div>
          <SalesComposer
            :clients="clientes"
            :execucoes="execucoes"
            :catalogo="catalogo"
            :defaults="defaults"
            @saved="handleSaved"
          />
        </div>
      </transition>

      <section class="sales-help">
        <h4>Dicas rápidas</h4>
        <p>Os relatórios completos continuam disponíveis em <router-link to="/relatorios/vendas">Relatórios &gt; Vendas</router-link>.</p>
        <ul>
          <li>Os botões Pix, Cartão e Dinheiro ficam dentro do formulário e trocam a forma de pagamento com um toque.</li>
          <li>Selecione clientes cadastrados ou informe um nome rápido sem sair da tela.</li>
          <li>Itens podem ser carregados do catálogo e ajustados rapidamente para uso no celular.</li>
        </ul>
      </section>
    </div>
  </section>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import SalesComposer from '@/components/sales/SalesComposer.vue'
import { listClients, listExecutions, listCatalog } from '@/services/sales'
import { getSettings } from '@/services/settings'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseError from '@/components/ui/BaseError.vue'

const clientes = ref([])
const execucoes = ref([])
const catalogo = ref([])
const loading = ref(false)
const loadError = ref('')

const defaults = reactive({
  origem: 'sistema',
  formaPagamento: 'Dinheiro',
  statusPagamento: 'Pago'
})

const showComposer = ref(false)
const successMessage = ref('')
const composerAnchor = ref(null)
let feedbackTimeout = null

function clearSuccessMessage() {
  if (feedbackTimeout) {
    clearTimeout(feedbackTimeout)
    feedbackTimeout = null
  }
  successMessage.value = ''
}

function handleComposerToggle() {
  showComposer.value = true
  nextTick(() => {
    composerAnchor.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

function handleSaved(resumo) {
  clearSuccessMessage()
  const total = resumo?.total ?? 0
  const metodo = resumo?.metodo ?? 'Pagamento'
  const totalLabel = total > 0 ? ` · ${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : ''
  successMessage.value = `Venda registrada (${metodo})${totalLabel}`
  feedbackTimeout = setTimeout(() => {
    clearSuccessMessage()
  }, 4000)
}

async function loadAll() {
  loading.value = true
  loadError.value = ''
  try {
    const [cls, exs, cat] = await Promise.all([listClients(), listExecutions(), listCatalog()])
    clientes.value = cls
    execucoes.value = exs
    catalogo.value = cat
  } catch (error) {
    loadError.value = error?.message || 'Erro ao carregar dados de apoio.'
  } finally {
    loading.value = false
  }
}

async function loadSettings() {
  try {
    const settings = await getSettings()
    defaults.origem = settings?.vendaOrigemPadrao || 'sistema'
    defaults.formaPagamento = settings?.formaPagamentoPadrao || 'Pix'
    defaults.statusPagamento = settings?.statusPagamentoPadrao || 'Pago'
  } catch (error) {
    console.warn('Não foi possível carregar configurações de venda:', error)
  }
}

onMounted(async () => {
  await Promise.all([loadAll(), loadSettings()])
  showComposer.value = true
})

onBeforeUnmount(() => {
  clearSuccessMessage()
})
</script>

<style scoped>
.sales-view {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
  background: transparent;
  color: #1f2933;
  padding: 0;
  box-shadow: none;
}

.page-title h2 {
  margin: 0;
  font-size: 1.85rem;
  font-weight: 700;
}

.page-title p {
  margin: 0.35rem 0 0;
  max-width: 540px;
  color: #6c757d;
}

.btn.btn-primary {
  min-width: 110px;
  border-radius: 999px;
  font-weight: 600;
  justify-content: center;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
}

.sales-layout {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.intro-hint {
  margin: 0;
  color: #6c757d;
  font-size: 0.95rem;
}

.intro-hint strong {
  color: #0d6efd;
}

.composer-wrapper {
  background: transparent;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.feedback-banner {
  align-self: stretch;
  background: linear-gradient(135deg, rgba(25, 135, 84, 0.15) 0%, rgba(32, 201, 151, 0.2) 60%, rgba(111, 207, 151, 0.25) 100%);
  border: 1px solid rgba(32, 201, 151, 0.35);
  border-radius: 16px;
  padding: 0.95rem 1.25rem;
  font-weight: 600;
  color: #0f5132;
}

.sales-help {
  background: #fff;
  border-radius: 16px;
  padding: 1.6rem 1.85rem;
  box-shadow: 0 20px 36px rgba(15, 30, 60, 0.1);
  color: #495057;
}

.sales-help h4 {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
  font-weight: 700;
}

.sales-help p {
  margin: 0 0 0.75rem;
}

.sales-help ul {
  margin: 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 0.45rem;
}

.sales-help li {
  font-size: 0.95rem;
  color: #6c757d;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

@media (max-width: 720px) {
  .page-header {
    align-items: stretch;
  }

  .btn.btn-primary {
    width: 100%;
    padding: 0.45rem 0.85rem;
    font-size: 0.85rem;
  }

  .sales-help {
    padding: 1.3rem 1.4rem;
  }
}
</style>
