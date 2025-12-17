<template>
  <Bar :data="chartData" :options="options" />
  <div v-if="!hasData" style="opacity:.7;margin-top:.25rem;">Sem dados de vendas nos últimos 7 dias.</div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  BarElement, CategoryScale, LinearScale, Tooltip, Legend,
} from 'chart.js'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const vendas = ref([])

function getLS(key, fb = '[]'){ try { return JSON.parse(localStorage.getItem(key) || fb) } catch { return JSON.parse(fb) } }
function lastNDays(n){ const days=[]; const now=new Date(); for(let i=n-1;i>=0;i--){const d=new Date(now); d.setDate(now.getDate()-i); days.push(d)} return days }
function fmtBRL(n){ return (Number(n)||0).toLocaleString('pt-BR',{ style:'currency', currency:'BRL' }) }

const labels = ref([])
const values = ref([])

const hasData = computed(() => (values.value || []).some(v => Number(v) > 0))

const chartData = computed(() => ({
  labels: labels.value,
  datasets: [{ label: 'Total de vendas', data: values.value, backgroundColor: 'rgba(13,110,253,0.5)', borderColor:'#0d6efd', borderWidth:1 }]
}))

const options = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true, ticks: { callback: (v) => fmtBRL(v) } } }
}

function calc(){
  vendas.value = Array.isArray(getLS('vendas')) ? getLS('vendas') : []
  const days = lastNDays(7)
  labels.value = days.map(d => d.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' }))
  values.value = days.map(d => {
    const dStr = d.toDateString()
    return vendas.value.filter(v => {
      const t = new Date(v.date || v.data || v.createdAt)
      return t.toDateString() === dStr
    }).reduce((s, v) => s + (typeof v.total==='number' ? v.total : Number(v.total)||0), 0)
  })
}

onMounted(calc)
</script>
