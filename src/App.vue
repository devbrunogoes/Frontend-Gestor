<template>
  <div class="app-container" :class="layoutClasses">
    <AppSidebar
      v-if="showSidebar"
      :collapsed="sidebarCollapsed"
      :is-mobile="overlayMode"
      @toggle-collapse="toggleSidebarCollapse"
    />
    <div
      v-if="showSidebar && overlayMode && !sidebarCollapsed"
      class="sidebar-backdrop"
      role="presentation"
      @click="toggleSidebarCollapse"
    />
    <button
      v-if="showSidebar && overlayMode && sidebarCollapsed"
      type="button"
      class="sidebar-fab"
      @click="toggleSidebarCollapse"
      aria-label="Abrir menu lateral"
    >
      <i class="fa-solid fa-bars" aria-hidden="true"></i>
    </button>
    <main class="main-content" role="main">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from '@/components/AppSidebar.vue'

const route = useRoute()
const showSidebar = computed(() => route.name !== 'login')

const sidebarCollapsed = ref(true)
const isMobile = ref(false)
const forceDesktopOverlay = ref(true)

const overlayMode = computed(() => isMobile.value || forceDesktopOverlay.value)

const layoutClasses = computed(() => ({
  'auth-layout': !showSidebar.value,
  'sidebar-collapsed': showSidebar.value && sidebarCollapsed.value,
  'sidebar-expanded': showSidebar.value && !sidebarCollapsed.value,
  'sidebar-mobile': showSidebar.value && overlayMode.value,
  'sidebar-overlay': showSidebar.value && overlayMode.value
}))

function toggleSidebarCollapse() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

function evaluateViewport() {
  if (typeof window === 'undefined') return
  const mobile = window.matchMedia('(max-width: 900px)').matches
  if (mobile && !isMobile.value) {
    sidebarCollapsed.value = true
  }
  isMobile.value = mobile
}

onMounted(() => {
  evaluateViewport()
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', evaluateViewport)
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', evaluateViewport)
  }
})
</script>

<style>
.sidebar-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(16, 24, 40, 0.45);
  backdrop-filter: blur(1px);
  z-index: 1400;
}

.sidebar-fab {
  position: fixed;
  top: calc(var(--safe-top) + 1rem);
  left: calc(var(--safe-left) + 1rem);
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #0d6efd 0%, #3d8bfd 100%);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 24px rgba(13, 110, 253, 0.3);
  cursor: pointer;
  z-index: 1450;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.sidebar-fab:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 32px rgba(13, 110, 253, 0.35);
}

.app-container.sidebar-overlay.sidebar-expanded .main-content {
  pointer-events: none;
}

@supports (padding: max(0px)) {
  .sidebar-backdrop {
    padding-top: var(--safe-top);
    padding-bottom: var(--safe-bottom);
  }

  .sidebar-fab {
    top: max(calc(var(--safe-top) + 0.75rem), 0.75rem);
    left: max(calc(var(--safe-left) + 0.75rem), 0.75rem);
  }
}

@media (max-width: 420px) {
  .sidebar-fab {
    width: 40px;
    height: 40px;
    font-size: 0.95rem;
  }
}
</style>
