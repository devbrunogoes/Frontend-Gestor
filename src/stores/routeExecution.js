import { defineStore } from 'pinia'

const STORAGE_KEY = 'active_route_execution'
const FINISHED_STATUSES = ['completed', 'finished', 'finalizada', 'finalizado', 'encerrada', 'encerrado', 'cancelled', 'canceled']
const NOT_STARTED_STATUSES = ['pending', 'aguardando', 'modelo', 'model']
const ACTIVE_STATUSES = ['in_progress', 'in-progress', 'em andamento', 'em_andamento', 'started', 'running', 'ativo', 'active']

function safeParse(json) {
  try {
    const parsed = JSON.parse(json)
    if (parsed && typeof parsed === 'object') return parsed
  } catch {}
  return null
}

function normalizeExecutionData(execution) {
  if (!execution || !execution.id) return null

  const status = (execution.status || '').toString().toLowerCase()
  if (FINISHED_STATUSES.includes(status)) return null
  if (!execution.startedAt && NOT_STARTED_STATUSES.includes(status)) return null

  return {
    id: execution.id,
    routeId: execution.routeId ?? null,
    routeName: execution.routeName || execution.nome || execution.name || null,
    driver: execution.driver || execution.motorista || null,
    vehicle: execution.vehicle || execution.veiculo || null,
    startedAt: execution.startedAt || execution.inicioPrevisto || execution.createdAt || null,
    completedAt: execution.completedAt || execution.finishedAt || execution.fimReal || execution.endAt || null,
    status: status || null,
  }
}

export const useRouteExecutionStore = defineStore('routeExecution', {
  state: () => ({
    activeExecution: (() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return null
        return normalizeExecutionData(safeParse(raw))
      } catch {
        return null
      }
    })(),
  }),
  getters: {
    hasPending(state) {
      if (!state.activeExecution || state.activeExecution.completedAt) return false
      const status = (state.activeExecution.status || '').toString().toLowerCase()
      if (NOT_STARTED_STATUSES.includes(status)) return false
      const hasStart = Boolean(state.activeExecution.startedAt)
      return hasStart || ACTIVE_STATUSES.includes(status)
    },
  },
  actions: {
    setActive(execution) {
      if (!execution || !execution.id) {
        this.clearActive()
        return
      }

      const normalized = normalizeExecutionData(execution)
      if (!normalized) {
        this.clearActive()
        return
      }

      this.activeExecution = normalized
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
      } catch {}
    },
    clearActive() {
      this.activeExecution = null
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {}
    },
  },
})
