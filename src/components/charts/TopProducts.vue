<template>
  <Bar :data="chartData" :options="options" />
  <div v-if="!hasData" style="opacity:.7;margin-top:.25rem;">Sem dados de produtos para exibir.</div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  BarElement, CategoryScale, LinearScale, Tooltip, Legend,
} from 'chart.js'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const props = defineProps({ topN: { type: Number, default: 5 } })

function getLS(key, fb = '[]'){ try { return JSON.parse(localStorage.getItem(key) || fb) } catch { return JSON.parse(fb) } }

const labels = ref([])
const values = ref([])
const hasData = computed(() => (values.value || []).some(v => Number(v) > 0))

const chartData = computed(() => ({ labels: labels.value, datasets: [{ label:'Preço', data: values.value, backgroundColor:'rgba(25,135,84,0.5)', borderColor:'#198754', borderWidth:1 }] }))
const options = { indexAxis: 'y', plugins: { legend: { display:false } }, scales: { x: { beginAtZero: true, ticks: { callback: (v) => (Number(v)||0).toLocaleString('pt-BR',{ style:'currency', currency:'BRL' }) } } } }

function getCatalogo(){
  const produtos = getLS('produtos')
  if (Array.isArray(produtos) && produtos.length) return produtos.map(p => ({ nome: p.nome || p.nomeProduto || 'Produto', preco: Number(p.preco)||Number(p.precoVenda)||0 }))
  const estoque = getLS('estoque')
  if (Array.isArray(estoque) && estoque.length) return estoque.map(e => ({ nome: e.nome || e.nomeProduto || 'Produto', preco: Number(e.preco)||Number(e.precoVenda)||0 }))
  return []
}

function calc(){
  const cat = getCatalogo()
  const sorted = cat.slice().sort((a,b)=>(b.preco||0)-(a.preco||0)).slice(0, props.topN)
  labels.value = sorted.map(x => x.nome)
  values.value = sorted.map(x => x.preco||0)
}

onMounted(calc)
</script>
