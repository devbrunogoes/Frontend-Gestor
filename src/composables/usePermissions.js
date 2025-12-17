import { ref } from 'vue'

export function usePermissions(){
  const loading = ref(false)

  function has(){
    // Sempre permitir
    return true
  }
  async function reload(){ /* no-op */ }

  return { loading, has, reload }
}
