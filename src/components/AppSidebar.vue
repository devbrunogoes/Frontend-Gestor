<template>
  <aside
    class="app-sidebar"
    :class="[
      { 'app-sidebar--collapsed': collapsed },
      isMobile ? 'app-sidebar--mobile' : null
    ]"
    aria-label="Menu lateral"
  >
    <header
      class="sidebar-header"
      :class="{ 'is-collapsed': collapsed }"
      aria-label="Perfil do usuário autenticado"
    >
      <div class="profile-avatar">
        <img v-if="hasProfileImage" :src="profileImage" :alt="avatarAlt" />
        <span v-else class="profile-initials" aria-hidden="true">{{ initials }}</span>
      </div>
      <div class="profile-info" v-if="!collapsed">
        <span class="profile-name">{{ displayName }}</span>
        <span class="profile-role">{{ displayRole }}</span>
      </div>
      <button
        class="sidebar-toggle"
        type="button"
        @click="toggleCollapse"
        :title="toggleLabel"
        :aria-label="toggleLabel"
        :aria-expanded="!collapsed"
      >
        <i :class="collapsed ? 'fa-solid fa-angles-right' : 'fa-solid fa-angles-left'" aria-hidden="true"></i>
      </button>
    </header>

    <nav class="sidebar-nav" aria-label="Navegação principal">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="sidebar-link"
        :class="{
          'sidebar-link--action': item.variant === 'action',
          'sidebar-link--pending': item.variant === 'pending'
        }"
        active-class="is-active"
        :id="item.id || null"
        :aria-label="collapsed ? item.label : null"
        :title="item.label"
      >
        <i :class="item.icon" aria-hidden="true"></i>
        <span v-if="!collapsed">{{ item.label }}</span>
      </RouterLink>
    </nav>

    <footer class="sidebar-footer" aria-label="Ações do usuário">
      <button
        class="sidebar-logout"
        type="button"
        @click="onLogout"
        :aria-label="collapsed ? 'Sair' : null"
        :title="collapsed ? 'Sair' : null"
      >
        <i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i>
        <span v-if="!collapsed">Sair</span>
      </button>
    </footer>
  </aside>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAuth } from '@/composables/useAuth'
import { useRouteExecutionStore } from '@/stores/routeExecution'
import { listExecutions } from '@/services/routeExecutions'

const props = defineProps({
  collapsed: {
    type: Boolean,
    default: false
  },
  isMobile: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggle-collapse'])

const store = useAuthStore()
const { logout, hasPermission } = useAuth()
const routeExecutionStore = useRouteExecutionStore()
const { hasPending: hasPendingExecution, activeExecution } = storeToRefs(routeExecutionStore)
const route = useRoute()

const collapsed = computed(() => props.collapsed)
const isMobile = computed(() => props.isMobile)

const displayName = computed(() => store.user?.nome || store.user?.name || store.user?.email || 'Usuário')
const rawRole = computed(() => store.user?.cargo || store.user?.role || store.user?.perfil || store.user?.position || '')
const displayRole = computed(() => rawRole.value || 'Cargo não informado')
const profileImage = computed(() => store.user?.avatarUrl || store.user?.foto || store.user?.image || store.user?.profileImage || '')
const hasProfileImage = computed(() => Boolean(profileImage.value))
const initials = computed(() => {
  const parts = (displayName.value || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'U'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
})
const avatarAlt = computed(() => `Foto de perfil de ${displayName.value}`)

const rawNavItems = [
  { to: '/', icon: 'fa-solid fa-house', label: 'Dashboard' },
  { to: '/vendas', icon: 'fa-solid fa-cash-register', label: 'Vendas', permissions: 'VENDAS' },
  { to: '/financeiro', icon: 'fa-solid fa-sack-dollar', label: 'Financeiro', permissions: 'FINANCEIRO' },
  {
    to: '/executar-rota',
    icon: 'fa-solid fa-route',
    label: 'Execução de Rota',
    variant: 'action',
    id: 'link-executar-rota',
    permissions: 'ROTAS'
  },
  { to: '/estoque', icon: 'fa-solid fa-warehouse', label: 'Estoque', permissions: ['ESTOQUE'] },
  { to: '/relatorios', icon: 'fa-solid fa-chart-line', label: 'Relatórios', permissions: 'RELATORIOS' },
  {
    to: '/cadastros',
    icon: 'fa-solid fa-pen-to-square',
    label: 'Cadastros',
    permissions: ['CLIENTES', 'ESTOQUE', 'VENDAS', 'ROTAS', 'FINANCEIRO']
  },
  { to: '/configuracoes', icon: 'fa-solid fa-gear', label: 'Configurações' }
]

const navItems = computed(() => {
  const filtered = rawNavItems.filter((item) => {
    if (!item.permissions) return true
    return hasPermission(item.permissions)
  })

  const currentPath = route?.path || ''
  const hidePendingForPaths = ['/rota-andamento', '/executar-rota']

  const canShowPending = hasPendingExecution.value && matchesCurrentUser(activeExecution.value)

  if (canShowPending && hasPermission('ROTAS') && !hidePendingForPaths.includes(currentPath)) {
    const routeName = activeExecution.value?.routeName?.toString().trim()
    const displayName = (() => {
      if (!routeName) return null
      return routeName.length > 30 ? `${routeName.slice(0, 27)}...` : routeName
    })()
    const pendingItem = {
      to: '/rota-andamento',
      icon: 'fa-solid fa-triangle-exclamation',
      label: displayName ? `Rota pendente: ${displayName}` : 'Rota pendente',
      variant: 'pending',
      id: 'link-rota-pendente'
    }

    const executionIndex = filtered.findIndex((item) => item.to === '/executar-rota')
    if (executionIndex >= 0) {
      filtered.splice(executionIndex + 1, 0, pendingItem)
    } else {
      filtered.unshift(pendingItem)
    }
  }

  return filtered
})

const toggleLabel = computed(() => (collapsed.value ? 'Expandir menu lateral' : 'Recolher menu lateral'))

async function syncPendingExecution() {
  try {
    const executions = await listExecutions(null, 'in_progress')
    const mine = Array.isArray(executions) ? executions.filter(matchesCurrentUser) : []
    const latest = mine.length ? mine[mine.length - 1] : null
    if (latest) {
      routeExecutionStore.setActive({
        ...latest,
        routeName: latest.routeName || latest.nome || latest.name || null,
      })
    } else {
      routeExecutionStore.clearActive()
    }
  } catch (err) {
    console.warn('Falha ao verificar rota pendente', err)
  }
}

function matchesCurrentUser(execution) {
  if (!execution) return false
  const user = store.user || {}
  const userId = user.id ?? user.userId ?? user.usuarioId ?? user.codigo ?? null
  const execUserId = execution.userId ?? execution.usuarioId ?? execution.criadoPorId ?? execution.executadoPorId ?? execution.ownerId ?? null
  if (userId && execUserId && String(userId) === String(execUserId)) return true

  const userEmail = (user.email || user.login || '').toString().trim().toLowerCase()
  const execEmail = (execution.userEmail || execution.email || '').toString().trim().toLowerCase()
  if (userEmail && execEmail && userEmail === execEmail) return true

  const userName = (user.nome || user.name || '').toString().trim().toLowerCase()
  const execDriver = (execution.driver || execution.motorista || '').toString().trim().toLowerCase()
  if (userName && execDriver && userName === execDriver) return true

  return false
}

function toggleCollapse() {
  emit('toggle-collapse')
}

function onLogout() {
  logout()
}

onMounted(() => {
  syncPendingExecution()
})
</script>

<style scoped>
.app-sidebar {
  flex: 0 0 280px;
  width: 280px;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
  min-height: 100vh;
  position: sticky;
  top: 0;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(15, 30, 60, 0.08);
  transition: width 0.25s ease, flex-basis 0.25s ease, padding 0.25s ease, transform 0.25s ease;
  z-index: 1200;
}

.app-sidebar--collapsed {
  flex: 0 0 88px;
  width: 88px;
  padding: var(--spacing-lg) var(--spacing-sm);
  gap: var(--spacing-md);
}

.app-sidebar--mobile {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  height: 100vh;
  flex: 0 0 auto;
  max-width: min(280px, 80vw);
  width: min(280px, 80vw);
  border-right: none;
  box-shadow: 0 24px 48px rgba(15, 30, 60, 0.28);
  transform: translateX(0);
  padding: calc(var(--spacing-lg) + 0.5rem) var(--spacing-lg) var(--spacing-xl);
  border-radius: 0 24px 24px 0;
  z-index: 1500;
}

.app-sidebar--mobile.app-sidebar--collapsed {
  transform: translateX(-100%);
}

.app-sidebar--mobile .sidebar-header {
  border-radius: 18px;
}

.app-sidebar--mobile.app-sidebar--collapsed .sidebar-toggle {
  margin-left: 0;
}

.app-sidebar--mobile .sidebar-nav,
.app-sidebar--mobile .sidebar-footer {
  overflow-y: auto;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  background: var(--primary);
  border-radius: var(--border-radius);
  padding: var(--spacing-md);
  color: #fff;
  box-shadow: 0 8px 18px rgba(13, 110, 253, 0.18);
  position: relative;
}

.sidebar-header.is-collapsed {
  flex-direction: column;
  gap: var(--spacing-sm);
}

.profile-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  transition: width 0.2s ease, height 0.2s ease;
}

.app-sidebar--collapsed .profile-avatar {
  width: 44px;
  height: 44px;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-initials {
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
}

.profile-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.profile-name {
  font-size: 1.05rem;
  font-weight: 700;
  color: #fff;
  line-height: 1.2;
}

.profile-role {
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.82);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-toggle {
  margin-left: auto;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(255, 255, 255, 0.18);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #fff;
  transition: background 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
}

.sidebar-toggle:hover {
  background: rgba(255, 255, 255, 0.28);
  border-color: rgba(255, 255, 255, 0.35);
}

.app-sidebar--collapsed .sidebar-toggle {
  margin-left: 0;
  margin-top: var(--spacing-sm);
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  width: 100%;
}

.app-sidebar--collapsed .sidebar-nav {
  align-items: center;
  gap: 0.45rem;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0.9rem;
  border-radius: var(--border-radius);
  text-decoration: none;
  color: var(--text-primary);
  font-weight: 500;
  transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
  width: 100%;
}

.app-sidebar--collapsed .sidebar-link {
  justify-content: center;
  padding: 0.65rem;
}

.sidebar-link i {
  font-size: 1.1rem;
  width: 24px;
  text-align: center;
}

.sidebar-link:hover {
  background: var(--light);
}

.sidebar-link.is-active {
  background: #e7f1ff;
  color: var(--primary);
  font-weight: 600;
}

.sidebar-link--action {
  border: 1px solid rgba(25, 135, 84, 0.35);
  color: var(--success);
  font-weight: 600;
}

.sidebar-link--action:hover {
  background: rgba(25, 135, 84, 0.12);
}

.sidebar-link--action.is-active {
  background: var(--success);
  color: #fff;
  border-color: transparent;
}

.sidebar-link--pending {
  border: 1px solid rgba(255, 193, 7, 0.35);
  color: var(--warning, #b78102);
  font-weight: 600;
  background: rgba(255, 193, 7, 0.12);
}

.sidebar-link--pending:hover {
  background: rgba(255, 193, 7, 0.2);
}

.sidebar-link--pending.is-active {
  background: var(--warning, #ffc107);
  color: var(--text-primary);
  border-color: transparent;
}

.sidebar-footer {
  margin-top: auto;
  width: 100%;
}

.app-sidebar--collapsed .sidebar-footer {
  display: flex;
  justify-content: center;
}

.sidebar-logout {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: var(--border-radius);
  border: 1px solid rgba(220, 53, 69, 0.2);
  background: rgba(220, 53, 69, 0.08);
  color: var(--danger);
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.app-sidebar--collapsed .sidebar-logout {
  width: auto;
  padding: 0.65rem;
  border-radius: 999px;
}

.sidebar-logout:hover {
  background: rgba(220, 53, 69, 0.16);
  border-color: rgba(220, 53, 69, 0.4);
  color: var(--danger-dark);
}

.sidebar-logout i {
  font-size: 1rem;
}

@media (max-width: 900px) {
  .app-sidebar--mobile {
    padding: calc(var(--spacing-lg) + 0.25rem) var(--spacing-lg) var(--spacing-xl);
  }

  .app-sidebar--mobile .sidebar-nav {
    flex-direction: column;
    gap: 0.5rem;
  }

  .app-sidebar--mobile .sidebar-link {
    justify-content: flex-start;
  }

  .app-sidebar--mobile .sidebar-footer {
    margin-top: var(--spacing-lg);
  }
}

@media (max-width: 540px) {
  .app-sidebar {
    padding: var(--spacing-md) var(--spacing-md) calc(var(--spacing-xl) + var(--safe-bottom));
    gap: var(--spacing-md);
  }

  .app-sidebar--mobile {
    max-width: min(260px, 82vw);
  }

  .sidebar-header {
    padding: var(--spacing-sm) var(--spacing-md);
    gap: var(--spacing-sm);
  }

  .profile-avatar {
    width: 42px;
    height: 42px;
  }

  .profile-name {
    font-size: 0.95rem;
  }

  .profile-role {
    font-size: 0.55rem;
  }

  .sidebar-toggle {
    width: 32px;
    height: 32px;
  }

  .sidebar-link {
    padding: 0.6rem 0.75rem;
    font-size: 0.95rem;
    gap: 0.55rem;
  }

  .sidebar-link i {
    font-size: 1rem;
  }

  .sidebar-logout {
    padding: 0.65rem 0.85rem;
    font-size: 0.95rem;
  }
}

@media (max-width: 420px) {
  .app-sidebar--mobile {
    max-width: min(240px, 88vw);
  }

  .sidebar-link {
    padding: 0.55rem 0.7rem;
  }

  .sidebar-logout {
    padding: 0.55rem 0.75rem;
  }
}
</style>
