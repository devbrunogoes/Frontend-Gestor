<template>
  <section class="finance-page">
    <section class="finance-content">
      <header class="finance-header">
        <div class="header-main">
          <div class="header-copy">
            <p class="eyebrow">Painel financeiro</p>
            <h1>Financeiro</h1>
            <p class="lede">Panorama consolidado de receitas, despesas e projecoes do caixa.</p>
            <div class="header-summary chip-grid">
              <div class="summary-card">
                <span class="summary-label">Receitas prev.</span>
                <strong class="summary-value">{{ fmtBRL(receitaPrevista) }}</strong>
              </div>
              <div class="summary-card warning">
                <span class="summary-label">Despesas prev.</span>
                <strong class="summary-value">{{ fmtBRL(despesasPrevistas) }}</strong>
              </div>
              <div class="summary-card accent">
                <span class="summary-label">Cobertura caixa</span>
                <strong class="summary-value">{{ coberturaCaixa <= 0 ? 'N/A' : `${coberturaCaixa.toFixed(1)}x`
                    }}</strong>
              </div>
            </div>
          </div>
        </div>
        <div class="toolbar-actions">
          <div class="header-links"><router-link to="/contas-pagar" class="btn btn-ghost">Contas a pagar</router-link>
            <router-link to="/contas-receber" class="btn btn-ghost">Contas a receber</router-link>
            <router-link to="/despesas" class="btn btn-ghost">Despesas</router-link>
            <router-link to="/fluxo-caixa" class="btn btn-ghost">Fluxo de caixa</router-link>
          </div>
          <div class="range-card">
            <div class="form-group">
              <label for="inicio">Inicio</label>
              <input id="inicio" v-model="filtros.inicio" type="date" class="form-control" />
            </div>
            <div class="form-group">
              <label for="fim">Fim</label>
              <input id="fim" v-model="filtros.fim" type="date" class="form-control" />
            </div>
            <button class="btn btn-primary btn-aplicar" type="button" @click="carregar">Aplicar</button>
          </div>
        </div>
      </header>

      <div class="panel-grid">
        <article class="panel">
          <div class="panel-header">
            <div>
              <p class="eyebrow">Receitas</p>
              <h3>Entradas por vencer</h3>
            </div>
            <span class="pill">{{ proximasReceitas.length }} itens</span>
          </div>
          <ul class="item-list" v-if="proximasReceitas.length">
            <li v-for="item in proximasReceitas" :key="item.id">
              <div>
                <p class="item-title">{{ item.cliente || item.customer || 'Receita' }}</p>
                <p class="item-sub">Vence em {{ fmtData(item.vencimento || item.data || item.dueDate) }}</p>
              </div>
              <div class="item-meta">
                <span class="amount">{{ fmtBRL(item.valor || item.value) }}</span>
                <span class="tag">{{ diasPara(item.vencimento || item.data || item.dueDate) }}</span>
              </div>
            </li>
          </ul>
          <p v-else class="empty">Nenhuma receita futura encontrada.</p>
        </article>

        <article class="panel">
          <div class="panel-header">
            <div>
              <p class="eyebrow">Despesas</p>
              <h3>Saidas por vencer</h3>
            </div>
            <span class="pill warning">{{ proximasDespesas.length }} itens</span>
          </div>
          <ul class="item-list" v-if="proximasDespesas.length">
            <li v-for="item in proximasDespesas" :key="item.id">
              <div>
                <p class="item-title">{{ item.fornecedor || item.supplier || 'Despesa' }}</p>
                <p class="item-sub">Vence em {{ fmtData(item.data || item.vencimento || item.dueDate) }}</p>
              </div>
              <div class="item-meta">
                <span class="amount neg">{{ fmtBRL(item.valor || item.value) }}</span>
                <span class="tag">{{ diasPara(item.data || item.vencimento || item.dueDate) }}</span>
              </div>
            </li>
          </ul>
          <p v-else class="empty">Nenhuma despesa futura encontrada.</p>
        </article>

        <article class="panel">
          <div class="panel-header">
            <div>
              <p class="eyebrow">Atrasos</p>
              <h3>Em atraso</h3>
            </div>
            <span class="pill accent">{{ atrasados.total }} itens</span>
          </div>
          <div class="dual">
            <div class="dual-col">
              <p class="item-sub">Receitas ({{ atrasados.receitas.length }})</p>
              <ul class="item-list" v-if="atrasados.receitas.length">
                <li v-for="item in atrasados.receitas" :key="`r-${item.id}`">
                  <div>
                    <p class="item-title">{{ item.cliente || 'Receita' }}</p>
                    <p class="item-sub">Venceu em {{ fmtData(item.vencimento || item.dueDate) }}</p>
                  </div>
                  <div class="item-meta">
                    <span class="amount">{{ fmtBRL(item.valor || item.value) }}</span>
                    <span class="tag danger">Atrasado</span>
                  </div>
                </li>
              </ul>
              <p v-else class="empty">Sem receitas atrasadas.</p>
            </div>
            <div class="dual-col">
              <p class="item-sub">Despesas ({{ atrasados.despesas.length }})</p>
              <ul class="item-list" v-if="atrasados.despesas.length">
                <li v-for="item in atrasados.despesas" :key="`d-${item.id}`">
                  <div>
                    <p class="item-title">{{ item.fornecedor || 'Despesa' }}</p>
                    <p class="item-sub">Venceu em {{ fmtData(item.data || item.vencimento || item.dueDate) }}</p>
                  </div>
                  <div class="item-meta">
                    <span class="amount neg">{{ fmtBRL(item.valor || item.value) }}</span>
                    <span class="tag danger">Atrasado</span>
                  </div>
                </li>
              </ul>
              <p v-else class="empty">Sem despesas atrasadas.</p>
            </div>
          </div>
        </article>
      </div>

      <div class="modal" :class="{ show: mostrarReceita }" @click.self="fecharModais">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h3>Nova receita</h3>
              <button type="button" class="btn-close" @click="fecharModais">×</button>
            </div>
            <form @submit.prevent="salvarReceita">
              <div class="modal-body">
                <div class="form-grid">
                  <label class="form-group">
                    <span>Descricao</span>
                    <input v-model="formReceita.descricao" class="form-control" required />
                  </label>
                  <label class="form-group">
                    <span>Cliente</span>
                    <input v-model="formReceita.cliente" class="form-control" />
                  </label>
                  <label class="form-group">
                    <span>Valor</span>
                    <input v-model.number="formReceita.valor" type="number" min="0" step="0.01" class="form-control"
                      required />
                  </label>
                  <label class="form-group">
                    <span>Vencimento</span>
                    <input v-model="formReceita.vencimento" type="date" class="form-control" required />
                  </label>
                </div>
                <p v-if="erroReceita" class="form-error">{{ erroReceita }}</p>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" @click="fecharModais">Cancelar</button>
                <button type="submit" class="btn btn-success" :disabled="carregando">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div class="modal" :class="{ show: mostrarDespesa }" @click.self="fecharModais">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h3>Nova despesa</h3>
              <button type="button" class="btn-close" @click="fecharModais">×</button>
            </div>
            <form @submit.prevent="salvarDespesa">
              <div class="modal-body">
                <div class="form-grid">
                  <label class="form-group">
                    <span>Descricao</span>
                    <input v-model="formDespesa.descricao" class="form-control" required />
                  </label>
                  <label class="form-group">
                    <span>Fornecedor</span>
                    <input v-model="formDespesa.fornecedor" class="form-control" />
                  </label>
                  <label class="form-group">
                    <span>Valor</span>
                    <input v-model.number="formDespesa.valor" type="number" min="0" step="0.01" class="form-control"
                      required />
                  </label>
                  <label class="form-group">
                    <span>Data</span>
                    <input v-model="formDespesa.data" type="date" class="form-control" required />
                  </label>
                  <label class="form-group">
                    <span>Pago?</span>
                    <select v-model="formDespesa.pago" class="form-control">
                      <option :value="true">Sim</option>
                      <option :value="false">Nao</option>
                    </select>
                  </label>
                </div>
                <p v-if="erroDespesa" class="form-error">{{ erroDespesa }}</p>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" @click="fecharModais">Cancelar</button>
                <button type="submit" class="btn btn-warning" :disabled="carregando">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import BaseError from '@/components/ui/BaseError.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import { listSales } from '@/services/sales'
import { createExpense, listExpenses } from '@/services/expenses'
import { createReceivable, listReceivables } from '@/services/receivables'
import { getSettings } from '@/services/settings'

const hojeISO = () => new Date().toISOString().slice(0, 10)
const diasAtrasISO = (dias) => {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  return d.toISOString().slice(0, 10)
}

const filtros = ref({ inicio: diasAtrasISO(30), fim: hojeISO() })
const vendas = ref([])
const despesas = ref([])
const recebiveis = ref([])
const carregando = ref(false)
const erro = ref('')
const configuracoes = ref({ receberDiasPadrao: 0 })

const mostrarReceita = ref(false)
const mostrarDespesa = ref(false)
const erroReceita = ref('')
const erroDespesa = ref('')

const formReceita = ref({
  descricao: '',
  cliente: '',
  valor: 0,
  vencimento: hojeISO(),
})

const formDespesa = ref({
  descricao: '',
  fornecedor: '',
  valor: 0,
  data: hojeISO(),
  pago: false,
})

const fmtBRL = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtData = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('pt-BR')
}
const somenteData = (d) => {
  const dt = new Date(d)
  return Number.isNaN(dt.getTime()) ? '' : dt.toISOString().slice(0, 10)
}

const filtraPeriodo = (d) => {
  if (!d) return false
  const iso = somenteData(d)
  return iso >= filtros.value.inicio && iso <= filtros.value.fim
}

const vendasPagas = computed(() =>
  vendas.value
    .filter((v) => (v.paymentStatus || '').toLowerCase() === 'pago' && filtraPeriodo(v.date || v.data || v.createdAt))
    .reduce((s, v) => s + Number(v.total || 0), 0)
)

const vendasPendentes = computed(() =>
  vendas.value
    .filter((v) => (v.paymentStatus || '').toLowerCase() !== 'pago' && filtraPeriodo(v.date || v.data || v.createdAt))
    .reduce((s, v) => s + Number(v.total || 0), 0)
)

const despesasPagas = computed(() =>
  despesas.value.filter((e) => !!e.pago && filtraPeriodo(e.data)).reduce((s, e) => s + Number(e.valor || 0), 0)
)

const despesasPendentes = computed(() =>
  despesas.value.filter((e) => !e.pago && filtraPeriodo(e.data)).reduce((s, e) => s + Number(e.valor || 0), 0)
)

const receberAberto = computed(() =>
  recebiveis.value
    .filter((r) => !r.pago && filtraPeriodo(r.vencimento || r.data || r.dueDate))
    .reduce((s, r) => s + Number(r.valor || r.value || 0), 0)
)

const saldoReal = computed(() => vendasPagas.value - despesasPagas.value)
const saldoProjetado = computed(() => vendasPagas.value + receberAberto.value - (despesasPagas.value + despesasPendentes.value))
const receitaPrevista = computed(() => vendasPagas.value + vendasPendentes.value + receberAberto.value)
const despesasPrevistas = computed(() => despesasPagas.value + despesasPendentes.value)
const coberturaCaixa = computed(() => (despesasPrevistas.value ? saldoProjetado.value / despesasPrevistas.value : 0))

const proximasReceitas = computed(() =>
  recebiveis.value
    .filter((r) => !r.pago && !estaAtrasado(r.vencimento || r.dueDate) && filtraPeriodo(r.vencimento || r.dueDate || r.data))
    .sort((a, b) => (somenteData(a.vencimento || a.dueDate) > somenteData(b.vencimento || b.dueDate) ? 1 : -1))
)

const proximasDespesas = computed(() =>
  despesas.value
    .filter((d) => !d.pago && !estaAtrasado(d.data || d.vencimento || d.dueDate) && filtraPeriodo(d.data || d.vencimento || d.dueDate))
    .sort((a, b) => (somenteData(a.data || a.vencimento || a.dueDate) > somenteData(b.data || b.vencimento || b.dueDate) ? 1 : -1))
)

const atrasados = computed(() => {
  const hoje = hojeISO()
  const receitas = recebiveis.value.filter((r) => !r.pago && somenteData(r.vencimento || r.dueDate) && somenteData(r.vencimento || r.dueDate) < hoje)
  const desp = despesas.value.filter((d) => !d.pago && somenteData(d.data || d.vencimento || d.dueDate) && somenteData(d.data || d.vencimento || d.dueDate) < hoje)
  return { receitas, despesas: desp, total: receitas.length + desp.length }
})

function diasPara(data) {
  const iso = somenteData(data)
  if (!iso) return '—'
  const delta = Math.ceil((new Date(iso) - new Date()) / (1000 * 60 * 60 * 24))
  if (delta < 0) return `${Math.abs(delta)}d em atraso`
  if (delta === 0) return 'Hoje'
  return `Em ${delta}d`
}

function estaAtrasado(data) {
  const iso = somenteData(data)
  return iso && iso < hojeISO()
}

async function carregar() {
  carregando.value = true
  erro.value = ''
  try {
    const [vs, ds, rs] = await Promise.all([listSales(), listExpenses(), listReceivables()])
    vendas.value = vs || []
    despesas.value = ds || []
    recebiveis.value = rs || []
  } catch (e) {
    erro.value = e?.message || 'Erro ao carregar dados financeiros.'
  } finally {
    carregando.value = false
  }
}

function abrirReceita() {
  const dias = Number(configuracoes.value?.receberDiasPadrao || 0)
  const base = new Date()
  if (dias > 0) base.setDate(base.getDate() + dias)
  formReceita.value = {
    descricao: '',
    cliente: '',
    valor: 0,
    vencimento: base.toISOString().slice(0, 10),
  }
  erroReceita.value = ''
  mostrarReceita.value = true
}

function abrirDespesa() {
  formDespesa.value = { descricao: '', fornecedor: '', valor: 0, data: hojeISO(), pago: false }
  erroDespesa.value = ''
  mostrarDespesa.value = true
}

function fecharModais() {
  mostrarReceita.value = false
  mostrarDespesa.value = false
}

async function salvarReceita() {
  try {
    await createReceivable({
      descricao: formReceita.value.descricao,
      cliente: formReceita.value.cliente,
      valor: formReceita.value.valor,
      vencimento: formReceita.value.vencimento,
      pago: false,
    })
    mostrarReceita.value = false
    await carregar()
  } catch (e) {
    erroReceita.value = e?.message || 'Erro ao salvar receita.'
  }
}

async function salvarDespesa() {
  try {
    await createExpense({
      descricao: formDespesa.value.descricao,
      fornecedor: formDespesa.value.fornecedor,
      valor: formDespesa.value.valor,
      data: formDespesa.value.data,
      pago: formDespesa.value.pago,
    })
    mostrarDespesa.value = false
    await carregar()
  } catch (e) {
    erroDespesa.value = e?.message || 'Erro ao salvar despesa.'
  }
}

onMounted(async () => {
  configuracoes.value = await getSettings().catch(() => ({ receberDiasPadrao: 0 }))
  await carregar()
})
</script>

<style scoped>
.finance-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.finance-content{
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
  padding: 32px;
}
.finance-header {
  background: linear-gradient(135deg, #0f172a, #1d4ed8);
  color: #fff;
  padding: 1.55rem;
  border-radius: 18px;
  box-shadow: 0 16px 32px rgba(16, 24, 40, 0.24);
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  position: relative;
  overflow: hidden;
}

.finance-header::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 15% 20%, rgba(255, 255, 255, 0.08), transparent 32%),
    radial-gradient(circle at 82% 18%, rgba(59, 130, 246, 0.22), transparent 40%);
  opacity: 0.9;
  pointer-events: none;
}

.header-main {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(360px, 1fr) minmax(300px, 360px);
  align-items: flex-start;
  gap: 1.05rem 1.2rem;
}

.header-copy {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.eyebrow {
  margin: 0;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 700;
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.75);
}

.finance-header h1 {
  margin: 0.2rem 0;
  font-size: 2rem;
  letter-spacing: -0.02em;
  color: #fff;
}

.lede {
  margin: 0;
  color: rgba(255, 255, 255, 0.84);
  max-width: 560px;
}

.header-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 0.9rem;
}

.summary-card {
  padding: 0.95rem 1rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.22);
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.1);
}

.summary-card.warning {
  background: rgba(248, 113, 113, 0.16);
  border-color: rgba(248, 113, 113, 0.3);
}

.summary-card.accent {
  background: rgba(94, 234, 212, 0.16);
  border-color: rgba(94, 234, 212, 0.28);
}

.summary-label {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.8);
}

.summary-value {
  font-size: 1.22rem;
  font-weight: 700;
}


.chip {
  padding: 0.7rem 0.9rem;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  background: rgba(255, 255, 255, 0.14);
  min-width: 170px;
}

.chip.warning {
  background: rgba(248, 113, 113, 0.16);
  border-color: rgba(248, 113, 113, 0.28);
}

.chip.accent {
  background: rgba(94, 234, 212, 0.18);
  border-color: rgba(94, 234, 212, 0.32);
}

.chip-label {
  display: block;
  font-size: 0.82rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.76);
}

.chip-value {
  font-size: 1.1rem;
}


.range-card {
  width: 100%;
  display: flex;
  flex-direction: row;
  gap: 0.65rem;
  align-content: end;
}

.range-card button {
  border-radius: 20px;
  height: 30px;
  bottom: 0;
}

.btn-aplicar {
  align-self: flex-end;
  margin-bottom: 12px;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 150px;
}

.form-group label span,
.form-group span,
.form-group label {
  color: rgba(255, 255, 255, 0.88);
}

.form-control {
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 0.55rem 0.75rem;
  font-size: 0.95rem;
  background: #f8fafc;
}

.form-control:focus-visible {
  outline: 2px solid rgba(37, 99, 235, 0.35);
}

.toolbar-actions {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(140px, auto);
  gap: 0.5rem;
  justify-content: space-between;
  width: 100%;
}

.header-links {
  display: grid;
  grid-auto-flow: column;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  width: 100%;
  margin-top: 0.25rem;
  gap: 0.5rem;
}

@media (max-width: 960px) {
  .header-main {
    grid-template-columns: 1fr;
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }



  .toolbar-actions {
    grid-auto-flow: row;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    justify-items: stretch;
  }

  .header-links {
    justify-content: center;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  }
}

.btn {
  border: none;
  border-radius: 999px;
  padding: 0.65rem 1.3rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-primary {
  background: #0ea5e9;
  color: #fff;
}

.btn-success {
  background: #16a34a;
  color: #fff;
}

.btn-warning {
  background: #f59e0b;
  color: #111827;
}

.btn-secondary {
  background: #e2e8f0;
  color: #111827;
}

.btn-ghost {
  background: transparent;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.35);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.btn:hover {
  transform: translateY(-1px);
}

.btn-ghost:hover {
  background: #fff;
  color: #0f172a;
  border-color: #fff;
  box-shadow: 0 8px 16px rgba(15, 23, 42, 0.18);
}

.finance-content {
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.kpi {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 1rem 1.2rem;
  box-shadow: 0 18px 30px rgba(15, 23, 42, 0.08);
}

.kpi-label {
  margin: 0;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 0.82rem;
}

.kpi-value {
  margin: 0.25rem 0 0;
  font-size: 1.35rem;
  font-weight: 700;
}

.kpi-value.neg {
  color: #b91c1c;
}

.panel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.1rem;
}

.panel {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 1.1rem 1.2rem;
  box-shadow: 0 20px 34px rgba(15, 23, 42, 0.1);
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
}

.panel h3 {
  margin: 0.1rem 0 0;
}

.pill {
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.12);
  color: #1d4ed8;
  font-weight: 700;
}

.pill.warning {
  background: rgba(251, 146, 60, 0.18);
  color: #c2410c;
}

.pill.accent {
  background: rgba(59, 130, 246, 0.18);
  color: #1d4ed8;
}

.item-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.item-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.6rem;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 0.65rem;
}

.item-title {
  margin: 0;
  font-weight: 700;
  color: #0f172a;
}

.item-sub {
  margin: 0.1rem 0 0;
  color: #64748b;
  font-size: 0.92rem;
}

.item-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
  min-width: 140px;
}

.amount {
  font-weight: 700;
  color: #0f172a;
}

.amount.neg {
  color: #b91c1c;
}

.tag {
  display: inline-flex;
  padding: 0.3rem 0.65rem;
  border-radius: 999px;
  font-weight: 600;
  background: #e0f2fe;
  color: #0ea5e9;
}

.tag.danger {
  background: #fee2e2;
  color: #b91c1c;
}

.empty {
  margin: 0;
  color: #94a3b8;
}

.dual {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 0.9rem;
}

.modal {
  position: fixed;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.55);
  padding: 1.2rem;
  z-index: 1000;
}

.modal.show {
  display: flex;
}

.modal-dialog {
  width: min(540px, 100%);
}

.modal-content {
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 28px 46px rgba(15, 23, 42, 0.18);
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.2rem;
  border-bottom: 1px solid #e2e8f0;
}

.modal-body {
  padding: 1rem 1.2rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  padding: 0.9rem 1.2rem;
  border-top: 1px solid #e2e8f0;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
}

.form-error {
  margin: 0.5rem 0 0;
  color: #b91c1c;
}

.btn-close {
  border: none;
  background: transparent;
  font-size: 1.2rem;
  cursor: pointer;
}

@media (max-width: 960px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }
}

@media (max-width: 640px) {
  .finance-header {
    padding: 1.35rem;
  }

  .chips {
    width: 100%;
  }

  .toolbar-actions {
    flex-direction: column;
  }

  .toolbar-actions .btn,
  .toolbar-actions .btn-ghost {
    width: 100%;
    text-align: center;
  }
}
</style>
