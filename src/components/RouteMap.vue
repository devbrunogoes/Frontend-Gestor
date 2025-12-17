<template>
  <div class="route-map" ref="container" style="width:100%;height:100%;min-height:240px;border-radius:6px;overflow:hidden"></div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, watch, ref } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
})

const props = defineProps({
  points: { type: Array, default: () => [] },
  center: { type: Object, default: null }
})
const emit = defineEmits(['marker-click'])

const container = ref(null)
let map = null
let markersLayer = null

function buildMarkers(list){
  if (!markersLayer) markersLayer = L.layerGroup().addTo(map)
  markersLayer.clearLayers()
  list.forEach(p => {
    const lat = p.lat || p.latitude
    const lng = p.lng || p.longitude
    if (lat == null || lng == null) return
    const marker = L.marker([Number(lat), Number(lng)])
    marker.bindPopup(`<strong>${p.nome || p.name || 'Ponto'}</strong><br>${p.endereco || ''}`)
    marker.on('click', () => emit('marker-click', p.id))
    markersLayer.addLayer(marker)
  })
}

onMounted(() => {
  map = L.map(container.value, { scrollWheelZoom: false })
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map)
  markersLayer = L.layerGroup().addTo(map)
  if (props.center && props.center.lat && props.center.lng) {
    map.setView([Number(props.center.lat), Number(props.center.lng)], 13)
  } else if (props.points && props.points.length) {
    const first = props.points.find(p => p.lat || p.latitude || p.longitude || p.lng)
    if (first) map.setView([Number(first.lat || first.latitude), Number(first.lng || first.longitude)], 13)
  } else {
    map.setView([-15.7801, -47.9292], 5) // generic center (Brazil)
  }
  buildMarkers(props.points)
})

watch(() => props.points, (n) => {
  if (!map) return
  buildMarkers(n || [])
})

onBeforeUnmount(() => {
  if (map) { map.remove(); map = null }
})
</script>

<style scoped>
.route-map{background:#eef}
</style>
