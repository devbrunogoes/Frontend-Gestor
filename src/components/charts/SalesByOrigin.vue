<template>
  <Doughnut :data="chartData" :options="options" />
  <div v-if="!hasData" style="opacity:.7;margin-top:.25rem;">Sem dados de origem de vendas.</div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

function getLS(key, fb = '[]'){ try { return JSON.parse(localStorage.getItem(key) || fb) } catch { return JSON.parse(fb) } }

const labels = ref([])
const values = ref([])

const colors = ['#0d6efd','#ffc107','#20c997','#6f42c1','#dc3545','#6c757d']
const chartData = computed(() => ({ labels: labels.value, datasets: [{ data: values.value, backgroundColor: colors.slice(0, Math.max(3, labels.value.length)) }] }))
const options = { plugins: { legend: { position: 'bottom' } } }
const hasData = computed(() => (values.value || []).some(v => Number(v) > 0))

function calc(){
  const vendas = Array.isArray(getLS('vendas')) ? getLS('vendas') : []
  const counts = vendas.reduce((acc, v) => { const o = (v.origem||'sistema').toLowerCase(); acc[o]=(acc[o]||0)+1; return acc }, {})
  const base = Object.keys(counts).length ? Object.keys(counts) : ['sistema','rota']
  labels.value = base
  values.value = base.map(l => counts[l] || 0)
}

onMounted(calc)
</script>
