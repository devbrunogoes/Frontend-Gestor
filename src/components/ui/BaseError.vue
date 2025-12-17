<template>
  <div class="base-error" role="alert">
    <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
    <div class="content">
      <strong>Erro:</strong>
      <span>{{ message }}</span>
      <button v-if="retry" class="btn btn-light" @click="retry">Tentar novamente</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  message: { type: String, default: 'Algo deu errado.' },
  retry: { type: Function, default: null },
})
</script>

<style scoped>
.base-error{ display:flex; align-items:center; gap:.5rem; background:#fdecea; color:#b02a37; border:1px solid #f5c2c7; padding:.5rem .75rem; border-radius:.375rem; }
.base-error .fa-triangle-exclamation{ font-size:1rem; }
.base-error .content{ display:flex; align-items:center; gap:.5rem; flex-wrap:wrap; }
.base-error .btn{ padding:.25rem .5rem; }
</style>
