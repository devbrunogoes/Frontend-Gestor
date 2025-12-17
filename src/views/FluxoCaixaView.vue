<template>
	<section class="content-area cashflow-view">
		<header class="page-header cashflow-header">
			<div class="header-copy">
				<h2>Fluxo de Caixa</h2>
				<p>Monitore entradas, saídas e tendências do caixa no período selecionado.</p>
				<div class="header-summary">
					<div class="summary-card positive">
						<span class="summary-label">Entradas</span>
						<strong class="summary-value">{{ fmtBRL(totalIn) }}</strong>
						<span class="summary-note">{{ inflowDays }} dia(s) com recebimentos</span>
					</div>
					<div class="summary-card negative">
						<span class="summary-label">Saídas</span>
						<strong class="summary-value">{{ fmtBRL(totalOut) }}</strong>
						<span class="summary-note">{{ outflowDays }} dia(s) com pagamentos</span>
					</div>
					<div class="summary-card highlight">
						<span class="summary-label">Saldo do período</span>
						<strong class="summary-value">{{ fmtBRL(totalNet) }}</strong>
						<span v-if="netTrendText" class="summary-note" :class="netTrendClass">
							<i class="fa-solid" :class="netTrendIcon"></i>
							{{ netTrendText }}
						</span>
					</div>
					<div class="summary-card neutral">
						<span class="summary-label">Média diária</span>
						<strong class="summary-value">{{ fmtBRL(averageNet) }}</strong>
						<span class="summary-note">{{ dayCount }} dia(s) analisado(s)</span>
					</div>
				</div>
			</div>
			<div class="header-actions">
				<div class="quick-range-row">
					<button
						v-for="range in quickRanges"
						:key="range.key"
						type="button"
						class="quick-range-chip"
						:class="{ active: activeQuickRange === range.key }"
						@click="applyQuickRange(range.key)"
					>
						{{ range.label }}
					</button>
				</div>
				<div class="header-dates">
					<label>Período personalizado</label>
					<div class="date-inputs">
						<input type="date" class="form-control" v-model="ini" />
						<span>até</span>
						<input type="date" class="form-control" v-model="fim" />
					</div>
				</div>
				<button class="btn btn-ghost" type="button" @click="load">
					<i class="fa-solid fa-rotate"></i>
					<span>Atualizar dados</span>
				</button>
			</div>
		</header>

		<BaseError v-if="loadError" :message="loadError" :retry="load" />
		<BaseLoading v-else-if="loading" message="Carregando fluxo de caixa..." />
		<div v-else class="cashflow-body">
			<div class="main-column">
				<div class="chart-card">
					<div class="chart-card-header">
						<h3>Saldo acumulado</h3>
						<span class="chart-caption">Entradas, saídas e saldo diário</span>
					</div>
					<div class="chart-frame" v-if="dailyRows.length">
						<Line :data="chartData" :options="chartOpts" />
					</div>
					<p v-else class="empty-note">Cadastre vendas, recebimentos ou despesas para gerar o gráfico.</p>
				</div>

				<div class="table-card">
					<div class="table-header">
						<h3>Detalhamento diário</h3>
						<div class="table-tools">
							<div class="search-field">
								<i class="fa-solid fa-magnifying-glass"></i>
								<input
									type="search"
									class="form-control"
									placeholder="Buscar por data"
									v-model.trim="searchTerm"
								/>
							</div>
							<span class="table-caption">{{ filteredRows.length }} dia(s)</span>
						</div>
					</div>
					<div class="table-responsive">
						<table class="data-table cashflow-table">
							<thead>
								<tr>
									<th>
										<button type="button" class="sort-button" @click="toggleSort('date')">
											<span>Data</span>
											<i class="fa-solid" :class="sortIcon('date')"></i>
										</button>
									</th>
									<th class="text-end">
										<button type="button" class="sort-button" @click="toggleSort('inflow')">
											<span>Entradas</span>
											<i class="fa-solid" :class="sortIcon('inflow')"></i>
										</button>
									</th>
									<th class="text-end">
										<button type="button" class="sort-button" @click="toggleSort('outflow')">
											<span>Saídas</span>
											<i class="fa-solid" :class="sortIcon('outflow')"></i>
										</button>
									</th>
									<th class="text-end">
										<button type="button" class="sort-button" @click="toggleSort('net')">
											<span>Resultado</span>
											<i class="fa-solid" :class="sortIcon('net')"></i>
										</button>
									</th>
									<th class="text-end">
										<button type="button" class="sort-button" @click="toggleSort('cumulative')">
											<span>Saldo acumulado</span>
											<i class="fa-solid" :class="sortIcon('cumulative')"></i>
										</button>
									</th>
								</tr>
							</thead>
							<tbody>
								<tr v-if="!filteredRows.length">
									<td colspan="5" class="empty-row">Nenhuma movimentação registrada no período.</td>
								</tr>
								<tr
									v-for="row in filteredRows"
									:key="row.date"
									:class="rowClass(row)"
								>
									<td data-label="Data">{{ fmtDate(row.date) }}</td>
									<td data-label="Entradas" class="text-end">{{ fmtBRL(row.inflow) }}</td>
									<td data-label="Saídas" class="text-end">{{ fmtBRL(row.outflow) }}</td>
									<td data-label="Resultado" class="text-end">{{ fmtBRL(row.net) }}</td>
									<td data-label="Saldo acumulado" class="text-end">{{ fmtBRL(row.cumulative) }}</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</div>

			<aside class="insights-card">
				<div class="insights-section">
					<h4>Resumo do período</h4>
					<ul class="insights-list">
						<li v-if="bestDay">
							<div>
								<span class="item-title">Melhor dia</span>
								<span class="item-sub">{{ fmtDate(bestDay.date) }}</span>
							</div>
							<span class="item-value">{{ fmtBRL(bestDay.net) }}</span>
						</li>
						<li v-if="largestOutflow">
							<div>
								<span class="item-title">Maior saída</span>
								<span class="item-sub">{{ fmtDate(largestOutflow.date) }}</span>
							</div>
							<span class="item-value neg">{{ fmtBRL(largestOutflow.outflow) }}</span>
						</li>
						<li>
							<div>
								<span class="item-title">Dias positivos</span>
								<span class="item-sub">{{ positiveDays }} de {{ dayCount }}</span>
							</div>
							<span class="item-value">{{ negativeDays }} dia(s) negativos</span>
						</li>
					</ul>
				</div>

				<div class="insights-section">
					<h4>Próximos 7 dias</h4>
					<ul v-if="upcomingHighlights.length" class="insights-list">
						<li v-for="item in upcomingHighlights" :key="item.key">
							<div>
								<span class="item-title">{{ item.label }}</span>
								<span class="item-sub">{{ fmtDate(item.date) }}</span>
							</div>
							<span class="item-value" :class="{ neg: item.type === 'out' }">{{ fmtBRL(item.value) }}</span>
						</li>
					</ul>
					<p v-else class="empty-note">Nenhum vencimento relevante para os próximos dias.</p>
					<div class="projection" v-if="upcomingHighlights.length">
						<span>Projeção líquida</span>
						<strong :class="{ neg: projectedNet < 0 }">{{ fmtBRL(projectedNet) }}</strong>
					</div>
				</div>

				<div class="insights-section">
					<h4>Clientes em destaque</h4>
					<ul v-if="customerHighlights.length" class="insights-list compact">
						<li v-for="customer in customerHighlights" :key="customer.nome">
							<div>
								<span class="item-title">{{ customer.nome }}</span>
								<span class="item-sub">{{ customer.count }} venda(s)</span>
							</div>
							<span class="item-value">{{ fmtBRL(customer.valor) }}</span>
						</li>
					</ul>
					<p v-else class="empty-note">Nenhuma venda registrada no período selecionado.</p>
				</div>
			</aside>
		</div>
	</section>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseError from '@/components/ui/BaseError.vue'
import { listSales } from '@/services/sales'
import { listExpenses } from '@/services/expenses'
import { listReceivables } from '@/services/receivables'
import { Line } from 'vue-chartjs'
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	Title,
	Tooltip,
	Legend,
	Filler
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const MS_PER_DAY = 86400000

const today = new Date()
today.setHours(0, 0, 0, 0)

const ini = ref(toISODate(new Date(today.getTime() - 14 * MS_PER_DAY)))
const fim = ref(toISODate(today))

const searchTerm = ref('')
const vendas = ref([])
const despesas = ref([])
const receber = ref([])
const loading = ref(false)
const loadError = ref('')
const sortState = reactive({ column: 'date', direction: 'desc' })
const activeQuickRange = ref('15')
const suppressRangeWatcher = ref(false)

const quickRanges = [
	{ key: '7', label: 'Últimos 7 dias', resolve: () => rangeLastNDays(7) },
	{ key: '15', label: 'Últimos 15 dias', resolve: () => rangeLastNDays(15) },
	{ key: '30', label: 'Últimos 30 dias', resolve: () => rangeLastNDays(30) },
	{ key: 'mtd', label: 'Mês atual', resolve: () => rangeMonthToDate() },
	{ key: 'ytd', label: 'Ano atual', resolve: () => rangeYearToDate() }
]

function toISODate(date) {
	const clone = new Date(date)
	clone.setHours(0, 0, 0, 0)
	return clone.toISOString().slice(0, 10)
}

function rangeLastNDays(days) {
	const end = new Date()
	end.setHours(0, 0, 0, 0)
	const start = new Date(end)
	start.setDate(start.getDate() - (days - 1))
	return { start: toISODate(start), end: toISODate(end) }
}

function rangeMonthToDate() {
	const end = new Date()
	end.setHours(0, 0, 0, 0)
	const start = new Date(end.getFullYear(), end.getMonth(), 1)
	return { start: toISODate(start), end: toISODate(end) }
}

function rangeYearToDate() {
	const end = new Date()
	end.setHours(0, 0, 0, 0)
	const start = new Date(end.getFullYear(), 0, 1)
	return { start: toISODate(start), end: toISODate(end) }
}

function applyQuickRange(key) {
	const option = quickRanges.find(item => item.key === key)
	if (!option) return
	const { start, end } = option.resolve()
	if (!start || !end) return
	suppressRangeWatcher.value = true
	ini.value = start
	fim.value = end
	activeQuickRange.value = key
	nextTick(() => {
		suppressRangeWatcher.value = false
	})
}

watch(ini, value => {
	if (!value) return
	const start = parseISODate(value)
	const end = parseISODate(fim.value)
	if (start && end && start > end) {
		fim.value = value
	}
	if (!suppressRangeWatcher.value) {
		activeQuickRange.value = 'custom'
	}
})

watch(fim, value => {
	if (!value) return
	const end = parseISODate(value)
	const start = parseISODate(ini.value)
	if (start && end && end < start) {
		ini.value = value
	}
	if (!suppressRangeWatcher.value) {
		activeQuickRange.value = 'custom'
	}
})

function parseISODate(iso) {
	if (!iso) return null
	const dt = new Date(`${iso}T00:00:00`)
	if (Number.isNaN(dt.getTime())) return null
	return dt
}

function parseFlexibleDate(value) {
	if (!value) return null
	if (value instanceof Date) {
		const clone = new Date(value)
		clone.setHours(0, 0, 0, 0)
		return clone
	}
	if (typeof value === 'number') {
		const dt = new Date(value)
		if (Number.isNaN(dt.getTime())) return null
		dt.setHours(0, 0, 0, 0)
		return dt
	}
	if (typeof value === 'string') {
		if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
			const dt = new Date(`${value}T00:00:00`)
			if (!Number.isNaN(dt.getTime())) return dt
		}
		const dt = new Date(value)
		if (!Number.isNaN(dt.getTime())) {
			dt.setHours(0, 0, 0, 0)
			return dt
		}
	}
	return null
}

function createRangeDays(startISO, endISO) {
	const start = parseISODate(startISO)
	const end = parseISODate(endISO)
	if (!start || !end || end < start) return []
	const result = []
	const cursor = new Date(start)
	while (cursor <= end) {
		result.push(toISODate(cursor))
		cursor.setDate(cursor.getDate() + 1)
	}
	return result
}

function isWithinRange(date, start, end) {
	return date instanceof Date && date >= start && date <= end
}

function safeNumber(value) {
	const number = Number(value)
	return Number.isFinite(number) ? number : 0
}

function isSalePaid(sale) {
	if (sale == null) return false
	if (Boolean(sale.pago)) return true
	const status = (sale.paymentStatus ?? sale.status ?? '').toString().toLowerCase()
	return status.includes('pago') || status.includes('paid')
}

function isReceivablePaid(item) {
	if (item == null) return false
	if (Boolean(item.pago)) return true
	const status = (item.status ?? '').toString().toLowerCase()
	return status.includes('pago') || status.includes('liquidado') || status.includes('received')
}

function isExpensePaid(expense) {
	if (expense == null) return false
	if (Boolean(expense.pago)) return true
	const status = (expense.status ?? '').toString().toLowerCase()
	return status.includes('pago') || status.includes('paga') || status.includes('quitado')
}

function buildDailyRows(startISO, endISO) {
	const startDate = parseISODate(startISO)
	const endDate = parseISODate(endISO)
	if (!startDate || !endDate || endDate < startDate) return []
	const rangeDays = createRangeDays(startISO, endISO)
	if (!rangeDays.length) return []
	const dayMap = new Map()
	rangeDays.forEach(day => {
		dayMap.set(day, { inflow: 0, outflow: 0 })
	})
	const rangeStart = new Date(startDate)
	const rangeEnd = new Date(endDate)
	rangeStart.setHours(0, 0, 0, 0)
	rangeEnd.setHours(23, 59, 59, 999)

	vendas.value.forEach(sale => {
		if (!isSalePaid(sale)) return
		const amount = safeNumber(sale.total ?? sale.valorTotal ?? sale.valor ?? 0)
		if (!amount) return
		const paymentDate = parseFlexibleDate(
			sale.paymentDate ?? sale.dataPagamento ?? sale.dataRecebimento ?? sale.date ?? sale.data ?? sale.createdAt
		)
		if (!paymentDate || !isWithinRange(paymentDate, rangeStart, rangeEnd)) return
		const key = toISODate(paymentDate)
		if (!dayMap.has(key)) return
		const record = dayMap.get(key)
		record.inflow += amount
	})

	receber.value.forEach(item => {
		if (!isReceivablePaid(item)) return
		const amount = safeNumber(item.valor ?? item.total ?? item.amount ?? 0)
		if (!amount) return
		const paymentDate = parseFlexibleDate(
			item.dataPagamento ?? item.dataRecebimento ?? item.dataLiquidacao ?? item.vencimento ?? item.data
		)
		if (!paymentDate || !isWithinRange(paymentDate, rangeStart, rangeEnd)) return
		const key = toISODate(paymentDate)
		if (!dayMap.has(key)) return
		const record = dayMap.get(key)
		record.inflow += amount
	})

	despesas.value.forEach(expense => {
		if (!isExpensePaid(expense)) return
		const amount = safeNumber(expense.valor ?? expense.total ?? expense.amount ?? 0)
		if (!amount) return
		const paymentDate = parseFlexibleDate(
			expense.dataPagamento ?? expense.dataBaixa ?? expense.data ?? expense.vencimento ?? expense.createdAt
		)
		if (!paymentDate || !isWithinRange(paymentDate, rangeStart, rangeEnd)) return
		const key = toISODate(paymentDate)
		if (!dayMap.has(key)) return
		const record = dayMap.get(key)
		record.outflow += amount
	})

	const rows = []
	let cumulative = 0
	rangeDays.forEach(day => {
		const record = dayMap.get(day) ?? { inflow: 0, outflow: 0 }
		const inflow = record.inflow
		const outflow = record.outflow
		const net = inflow - outflow
		cumulative += net
		rows.push({
			date: day,
			inflow,
			outflow,
			net,
			cumulative
		})
	})
	return rows
}

const dailyRows = computed(() => buildDailyRows(ini.value, fim.value))
const dayCount = computed(() => dailyRows.value.length)
const totalIn = computed(() => dailyRows.value.reduce((sum, row) => sum + row.inflow, 0))
const totalOut = computed(() => dailyRows.value.reduce((sum, row) => sum + row.outflow, 0))
const totalNet = computed(() => dailyRows.value.reduce((sum, row) => sum + row.net, 0))
const averageNet = computed(() => (dayCount.value ? totalNet.value / dayCount.value : 0))
const inflowDays = computed(() => dailyRows.value.filter(row => row.inflow > 0).length)
const outflowDays = computed(() => dailyRows.value.filter(row => row.outflow > 0).length)
const positiveDays = computed(() => dailyRows.value.filter(row => row.net > 0).length)
const negativeDays = computed(() => dailyRows.value.filter(row => row.net < 0).length)

const previousRange = computed(() => {
	if (!dayCount.value) return { start: '', end: '' }
	const startDate = parseISODate(ini.value)
	if (!startDate) return { start: '', end: '' }
	const previousEnd = new Date(startDate.getTime() - MS_PER_DAY)
	const previousStart = new Date(previousEnd)
	previousStart.setDate(previousStart.getDate() - (dayCount.value - 1))
	return { start: toISODate(previousStart), end: toISODate(previousEnd) }
})

const previousRows = computed(() => {
	const { start, end } = previousRange.value
	if (!start || !end) return []
	return buildDailyRows(start, end)
})

const previousNet = computed(() => previousRows.value.reduce((sum, row) => sum + row.net, 0))
const netDelta = computed(() => totalNet.value - previousNet.value)
const netDeltaPct = computed(() => {
	if (!previousNet.value) return null
	if (!Number.isFinite(previousNet.value) || previousNet.value === 0) return null
	return (netDelta.value / Math.abs(previousNet.value)) * 100
})

const netTrendIcon = computed(() => {
	if (netDelta.value > 0) return 'fa-arrow-trend-up'
	if (netDelta.value < 0) return 'fa-arrow-trend-down'
	return 'fa-minus'
})

const netTrendClass = computed(() => {
	if (netDelta.value > 0) return 'note-positive'
	if (netDelta.value < 0) return 'note-negative'
	return 'note-neutral'
})

const netTrendText = computed(() => {
	if (netDeltaPct.value == null) {
		return dayCount.value ? 'Sem histórico comparável' : ''
	}
	const pct = netDeltaPct.value
	if (!Number.isFinite(pct)) return ''
	if (pct === 0) return 'Igual ao período anterior'
	const prefix = pct > 0 ? '+' : ''
	return `${prefix}${pct.toFixed(1)}% vs período anterior`
})

const bestDay = computed(() => {
	return (
		dailyRows.value
			.filter(row => row.net > 0)
			.sort((a, b) => b.net - a.net)[0] || null
	)
})

const largestOutflow = computed(() => {
	return (
		dailyRows.value
			.filter(row => row.outflow > 0)
			.sort((a, b) => b.outflow - a.outflow)[0] || null
	)
})

const upcomingReceivables = computed(() => {
	const start = new Date()
	start.setHours(0, 0, 0, 0)
	const limit = new Date(start)
	limit.setDate(limit.getDate() + 7)
	return receber.value
		.filter(item => !isReceivablePaid(item))
		.map(item => {
			const dueDate = parseFlexibleDate(item.vencimento ?? item.dataPrevista ?? item.data ?? item.createdAt)
			return {
				id: item.id ?? item.codigo ?? item.identificador ?? Math.random(),
				date: dueDate,
				valor: safeNumber(item.valor ?? item.total ?? item.amount ?? 0),
				label: item.descricao ?? item.titulo ?? item.nomeCliente ?? 'Recebimento'
			}
		})
		.filter(entry => entry.date && isWithinRange(entry.date, start, limit))
		.sort((a, b) => a.date - b.date)
})

const upcomingExpenses = computed(() => {
	const start = new Date()
	start.setHours(0, 0, 0, 0)
	const limit = new Date(start)
	limit.setDate(limit.getDate() + 7)
	return despesas.value
		.filter(item => !isExpensePaid(item))
		.map(item => {
			const dueDate = parseFlexibleDate(item.vencimento ?? item.dataPrevista ?? item.data ?? item.createdAt)
			return {
				id: item.id ?? item.codigo ?? item.identificador ?? Math.random(),
				date: dueDate,
				valor: safeNumber(item.valor ?? item.total ?? item.amount ?? 0),
				label: item.descricao ?? item.categoria ?? item.fornecedor ?? 'Despesa'
			}
		})
		.filter(entry => entry.date && isWithinRange(entry.date, start, limit))
		.sort((a, b) => a.date - b.date)
})

const upcomingHighlights = computed(() => {
	const receivables = upcomingReceivables.value.map((item, index) => ({
		key: `in-${item.id}-${index}`,
		label: item.label,
		date: toISODate(item.date),
		value: item.valor,
		type: 'in'
	}))
	const expenses = upcomingExpenses.value.map((item, index) => ({
		key: `out-${item.id}-${index}`,
		label: item.label,
		date: toISODate(item.date),
		value: item.valor,
		type: 'out'
	}))
	return [...receivables, ...expenses].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6)
})

const projectedNet = computed(() => {
	const incoming = upcomingHighlights.value
		.filter(item => item.type === 'in')
		.reduce((sum, item) => sum + item.value, 0)
	const outgoing = upcomingHighlights.value
		.filter(item => item.type === 'out')
		.reduce((sum, item) => sum + item.value, 0)
	return incoming - outgoing
})

const customerHighlights = computed(() => {
	const startDate = parseISODate(ini.value)
	const endDate = parseISODate(fim.value)
	if (!startDate || !endDate || endDate < startDate) return []
	const rangeStart = new Date(startDate)
	const rangeEnd = new Date(endDate)
	rangeEnd.setHours(23, 59, 59, 999)
	const accumulator = new Map()
	vendas.value.forEach(sale => {
		if (!isSalePaid(sale)) return
		const paymentDate = parseFlexibleDate(
			sale.paymentDate ?? sale.dataPagamento ?? sale.dataRecebimento ?? sale.date ?? sale.data ?? sale.createdAt
		)
		if (!paymentDate || !isWithinRange(paymentDate, rangeStart, rangeEnd)) return
		const name = sale.cliente ?? sale.nomeCliente ?? sale.customerName ?? 'Cliente não informado'
		const amount = safeNumber(sale.total ?? sale.valorTotal ?? sale.valor ?? 0)
		const record = accumulator.get(name) ?? { nome: name, count: 0, valor: 0 }
		record.count += 1
		record.valor += amount
		accumulator.set(name, record)
	})
	return Array.from(accumulator.values())
		.sort((a, b) => b.valor - a.valor)
		.slice(0, 5)
})

const filteredRows = computed(() => {
	const term = searchTerm.value.trim().toLowerCase()
	let rows = dailyRows.value
	if (term) {
		rows = rows.filter(row => {
			const label = fmtDate(row.date).toLowerCase()
			return row.date.includes(term) || label.includes(term)
		})
	}
	return sortRows(rows)
})

function sortRows(rows) {
	const column = sortState.column
	const direction = sortState.direction === 'desc' ? -1 : 1
	return [...rows].sort((a, b) => {
		switch (column) {
			case 'inflow':
				return (a.inflow - b.inflow) * direction
			case 'outflow':
				return (a.outflow - b.outflow) * direction
			case 'net':
				return (a.net - b.net) * direction
			case 'cumulative':
				return (a.cumulative - b.cumulative) * direction
			case 'date':
			default:
				return a.date.localeCompare(b.date) * direction
		}
	})
}

function toggleSort(column) {
	if (!['date', 'inflow', 'outflow', 'net', 'cumulative'].includes(column)) return
	if (sortState.column === column) {
		sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc'
	} else {
		sortState.column = column
		sortState.direction = column === 'date' ? 'desc' : 'asc'
	}
}

function sortIcon(column) {
	if (sortState.column !== column) return 'fa-sort'
	return sortState.direction === 'asc' ? 'fa-sort-up' : 'fa-sort-down'
}

function rowClass(row) {
	if (row.net > 0) return 'row-positive'
	if (row.net < 0) return 'row-negative'
	return ''
}

function fmtBRL(value) {
	return (Number(value) || 0).toLocaleString('pt-BR', {
		style: 'currency',
		currency: 'BRL'
	})
}

function fmtDate(iso) {
	const date = parseFlexibleDate(iso)
	if (!date) return 'Sem data'
	return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

const chartData = computed(() => {
	const labels = dailyRows.value.map(row => fmtDate(row.date))
	return {
		labels,
		datasets: [
			{
				label: 'Saldo acumulado',
				data: dailyRows.value.map(row => row.cumulative),
				borderColor: '#0d6efd',
				backgroundColor: 'rgba(13, 110, 253, 0.18)',
				tension: 0.25,
				fill: true,
				borderWidth: 2
			},
			{
				label: 'Entradas',
				data: dailyRows.value.map(row => row.inflow),
				borderColor: '#16a34a',
				backgroundColor: 'rgba(34, 197, 94, 0.2)',
				tension: 0.2,
				pointRadius: 0,
				borderWidth: 1.5
			},
			{
				label: 'Saídas',
				data: dailyRows.value.map(row => row.outflow * -1),
				borderColor: '#ef4444',
				backgroundColor: 'rgba(239, 68, 68, 0.18)',
				tension: 0.2,
				pointRadius: 0,
				borderWidth: 1.5
			}
		]
	}
})

const chartOpts = computed(() => ({
	responsive: true,
	maintainAspectRatio: false,
	interaction: {
		mode: 'index',
		intersect: false
	},
	plugins: {
		legend: {
			display: true,
			position: 'top'
		},
		tooltip: {
			callbacks: {
				label(context) {
					const label = context.dataset.label ?? ''
					const value = context.parsed.y ?? 0
					return `${label}: ${fmtBRL(value)}`
				}
			}
		}
	},
	scales: {
		x: {
			grid: {
				display: false
			}
		},
		y: {
			ticks: {
				callback(value) {
					return fmtBRL(value)
				}
			}
		}
	}
}))

async function load() {
	loading.value = true
	loadError.value = ''
	try {
		const [sales, expenses, receivables] = await Promise.all([
			listSales(),
			listExpenses(),
			listReceivables()
		])
		vendas.value = Array.isArray(sales) ? sales : []
		despesas.value = Array.isArray(expenses) ? expenses : []
		receber.value = Array.isArray(receivables) ? receivables : []
	} catch (error) {
		loadError.value = error?.message || 'Erro ao carregar fluxo de caixa.'
	} finally {
		loading.value = false
	}
}

onMounted(load)
</script>

<style scoped>
.cashflow-view {
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
}

.cashflow-header {
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
	align-items: flex-start;
	gap: 1.5rem;
	padding: 1.75rem;
	border-radius: 18px;
	background: linear-gradient(135deg, #0f172a 0%, #2563eb 100%);
	color: #fff;
	box-shadow: 0 16px 32px rgba(15, 23, 42, 0.3);
}

.header-copy {
	flex: 1 1 440px;
	min-width: 280px;
}

.header-copy h2 {
	margin: 0 0 0.45rem;
	font-size: 1.9rem;
	font-weight: 700;
}

.header-copy p {
	margin: 0 0 1.2rem;
	color: rgba(255, 255, 255, 0.78);
	max-width: 520px;
}

.header-summary {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
	gap: 1rem;
}

.summary-card {
	padding: 1rem;
	border-radius: 14px;
	background: rgba(255, 255, 255, 0.18);
	display: flex;
	flex-direction: column;
	gap: 0.35rem;
}

.summary-card.positive {
	background: rgba(34, 197, 94, 0.24);
}

.summary-card.negative {
	background: rgba(248, 113, 113, 0.26);
}

.summary-card.highlight {
	background: rgba(14, 165, 233, 0.26);
}

.summary-card.neutral {
	background: rgba(255, 255, 255, 0.18);
}

.summary-label {
	font-size: 0.78rem;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	opacity: 0.85;
}

.summary-value {
	font-size: 1.4rem;
	font-weight: 700;
}

.summary-note {
	font-size: 0.85rem;
	opacity: 0.85;
	display: inline-flex;
	align-items: center;
	gap: 0.4rem;
}

.note-positive {
	color: #bbf7d0;
}

.note-negative {
	color: #fecaca;
}

.note-neutral {
	color: rgba(255, 255, 255, 0.78);
}

.header-actions {
	display: flex;
	flex-direction: column;
	gap: 0.9rem;
	align-items: flex-start;
}

.quick-range-row {
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
}

.quick-range-chip {
	display: inline-flex;
	align-items: center;
	gap: 0.35rem;
	padding: 0.45rem 0.85rem;
	border-radius: 999px;
	border: 1px solid rgba(255, 255, 255, 0.35);
	background: rgba(15, 23, 42, 0.2);
	color: #fff;
	font-weight: 600;
	transition: background 0.2s ease, transform 0.2s ease;
}

.quick-range-chip:hover {
	background: rgba(255, 255, 255, 0.2);
	transform: translateY(-1px);
}

.quick-range-chip.active {
	background: #fff;
	color: #1f2937;
}

.header-dates {
	display: flex;
	flex-direction: column;
	gap: 0.4rem;
}

.header-dates label {
	font-size: 0.78rem;
	text-transform: uppercase;
	letter-spacing: 0.08em;
	opacity: 0.85;
}

.date-inputs {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.form-control {
	padding: 0.55rem 0.75rem;
	border-radius: 10px;
	border: 1px solid rgba(255, 255, 255, 0.45);
	background: rgba(255, 255, 255, 0.2);
	color: inherit;
}

.form-control:focus-visible {
	outline: 2px solid rgba(255, 255, 255, 0.6);
}

.btn-ghost {
	display: inline-flex;
	align-items: center;
	gap: 0.55rem;
	padding: 0.6rem 1.1rem;
	border-radius: 999px;
	border: 1px solid rgba(255, 255, 255, 0.4);
	background: rgba(255, 255, 255, 0.15);
	color: #fff;
}

.btn-ghost:hover {
	background: rgba(255, 255, 255, 0.25);
}

.cashflow-body {
	display: grid;
	grid-template-columns: minmax(0, 1fr) 320px;
	gap: 1.5rem;
	align-items: start;
}

.main-column {
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
}

.chart-card,
.table-card {
	background: #fff;
	border-radius: 16px;
	box-shadow: 0 12px 24px rgba(15, 23, 42, 0.12);
	overflow: hidden;
}

.chart-card-header,
.table-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 1rem;
	padding: 1.2rem 1.5rem;
	border-bottom: 1px solid #eef2f7;
}

.chart-caption {
	color: #6b7280;
	font-size: 0.9rem;
}

.chart-frame {
	height: 320px;
	padding: 1rem 1.5rem 1.5rem;
}

.table-tools {
	display: flex;
	align-items: center;
	gap: 1rem;
}

.search-field {
	display: flex;
	align-items: center;
	gap: 0.4rem;
	padding: 0.45rem 0.75rem;
	border: 1px solid #dbe1ea;
	border-radius: 999px;
	background: #f8fafc;
	color: #475569;
}

.search-field .form-control {
	border: none;
	background: transparent;
	padding: 0;
	color: #1f2937;
}

.search-field .form-control:focus-visible {
	outline: none;
}

.table-caption {
	font-size: 0.85rem;
	color: #6b7280;
}

.table-responsive {
	overflow-x: auto;
}

.data-table {
	width: 100%;
	border-collapse: collapse;
}

.data-table thead th {
	text-align: left;
	padding: 0.9rem 1.5rem;
	font-size: 0.82rem;
	color: #6b7280;
	border-bottom: 1px solid #eef2f7;
	background: #f9fbff;
}

.sort-button {
	display: inline-flex;
	align-items: center;
	gap: 0.3rem;
	background: transparent;
	border: none;
	color: inherit;
	font: inherit;
	cursor: pointer;
}

.sort-button .fa-solid {
	color: #94a3b8;
}

.data-table tbody td {
	padding: 0.9rem 1.5rem;
	border-bottom: 1px solid #f1f5f9;
	font-size: 0.92rem;
	color: #1f2937;
}

.data-table tbody tr:last-child td {
	border-bottom: none;
}

.text-end {
	text-align: right;
}

.empty-row {
	text-align: center;
	padding: 2rem 1.5rem;
	color: #64748b;
}

.row-positive {
	background: rgba(134, 239, 172, 0.15);
}

.row-negative {
	background: rgba(248, 113, 113, 0.14);
}

.insights-card {
	background: #fff;
	border-radius: 16px;
	box-shadow: 0 12px 24px rgba(15, 23, 42, 0.12);
	padding: 1.4rem 1.2rem;
	display: flex;
	flex-direction: column;
	gap: 1.3rem;
}

.insights-section h4 {
	margin: 0 0 0.75rem;
	font-size: 1rem;
	color: #1f2937;
}

.insights-list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 0.75rem;
}

.insights-list.compact {
	gap: 0.6rem;
}

.insights-list li {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 0.8rem;
	padding: 0.8rem;
	border-radius: 12px;
	background: #f8fafc;
}

.item-title {
	font-weight: 600;
	color: #111827;
}

.item-sub {
	display: block;
	font-size: 0.8rem;
	color: #6b7280;
}

.item-value {
	font-weight: 700;
	color: #0f172a;
}

.item-value.neg {
	color: #b91c1c;
}

.empty-note {
	margin: 0;
	font-size: 0.85rem;
	color: #6b7280;
}

.projection {
	margin-top: 0.9rem;
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 0.75rem;
	border-radius: 12px;
	background: rgba(13, 110, 253, 0.08);
	color: #0f172a;
}

.projection strong {
	font-size: 1.05rem;
}

.projection strong.neg {
	color: #b91c1c;
}

@media (max-width: 1080px) {
	.cashflow-body {
		grid-template-columns: 1fr;
	}

	.insights-card {
		order: -1;
	}
}

@media (max-width: 820px) {
	.cashflow-header {
		padding: 1.4rem;
	}

	.header-summary {
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
	}

	.chart-frame {
		height: 280px;
	}
}

@media (max-width: 640px) {
	.chart-card-header,
	.table-header {
		flex-direction: column;
		align-items: flex-start;
	}

	.table-tools {
		width: 100%;
		justify-content: space-between;
	}

	.data-table thead {
		display: none;
	}

	.data-table tbody tr {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem 0.5rem;
		padding: 1rem 1.2rem;
	}

	.data-table tbody td {
		padding: 0;
		border: none;
	}

	.data-table tbody td[data-label]::before {
		content: attr(data-label);
		display: block;
		font-size: 0.75rem;
		text-transform: uppercase;
		color: #94a3b8;
		margin-bottom: 0.3rem;
	}
}
</style>

