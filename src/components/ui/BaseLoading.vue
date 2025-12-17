<template>
  <div class="base-loading" role="status" aria-live="polite">
    <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
    <span class="msg">{{ message }}</span>
  </div>
  
</template>

<script setup>
defineProps({ message: { type: String, default: 'Carregando…' } })
</script>

<style scoped>
.base-loading{ display:flex; align-items:center; gap:.5rem; color:#6c757d; padding:.5rem 0; }
.base-loading .fa-spinner{ font-size:1rem; }
.base-loading .msg{ font-size:.95rem; }
</style>
