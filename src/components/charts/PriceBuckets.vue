<template>
  <Pie :data="chartData" :options="options" />
  <div v-if="!hasData" style="opacity:.7;margin-top:.25rem;">Sem dados de preços.</div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Pie } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

function getLS(key, fb='[]'){ try { return JSON.parse(localStorage.getItem(key) || fb) } catch { return JSON.parse(fb) } }

const labels = ref(['Até 10','10-50','50-100','100+'])
const values = ref([0,0,0,0])
const colors = ['#0d6efd','#20c997','#ffc107','#dc3545']
const chartData = computed(() => ({ labels: labels.value, datasets: [{ data: values.value, backgroundColor: colors }] }))
const options = { plugins: { legend: { position: 'bottom' } } }
const hasData = computed(() => (values.value || []).some(v => Number(v) > 0))

function getCatalogo(){
  const produtos = getLS('produtos')
  if (Array.isArray(produtos) && produtos.length) return produtos.map(p => ({ preco: Number(p.preco)||Number(p.precoVenda)||0 }))
  const estoque = getLS('estoque')
  if (Array.isArray(estoque) && estoque.length) return estoque.map(e => ({ preco: Number(e.preco)||Number(e.precoVenda)||0 }))
  return []
}

function calc(){
  const cat = getCatalogo()
  const buckets = { 'Até 10':0, '10-50':0, '50-100':0, '100+':0 }
  cat.forEach(p => {
    const v = Number(p.preco)||0
    if (v <= 10) buckets['Até 10'] += 1
    else if (v <= 50) buckets['10-50'] += 1
    else if (v <= 100) buckets['50-100'] += 1
    else buckets['100+'] += 1
  })
  labels.value = Object.keys(buckets)
  values.value = labels.value.map(k => buckets[k])
}

onMounted(calc)
</script>
