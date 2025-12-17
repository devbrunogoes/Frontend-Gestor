import { apiFetch } from '@/services/api'

async function getSettings() {
  const s = await apiFetch('/settings')
  return s && typeof s === 'object' ? s : {}
}

async function saveSettings(payload) {
  return await apiFetch('/settings', { method: 'PUT', body: JSON.stringify(payload) })
}

export { getSettings, saveSettings }
