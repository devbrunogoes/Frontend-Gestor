<template>
  <section class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <div class="auth-icon"><i class="fa-solid fa-right-to-bracket"></i></div>
        <div>
          <h2 class="auth-title">Bem-vindo</h2>
          <p class="auth-subtitle">Acesse sua conta para continuar</p>
        </div>
      </div>

      <form @submit.prevent="onSubmit" class="auth-form">
        <div class="form-group form-group-large">
          <label for="email">E-mail</label>
          <input id="email" type="email" class="form-control" v-model.trim="email" required autocomplete="username" />
        </div>
        <div class="form-group form-group-large">
          <label for="password">Senha</label>
          <input id="password" type="password" class="form-control" v-model="password" required autocomplete="current-password" />
        </div>
        <div class="auth-actions">
          <label class="switch" style="margin:0;">
            <input type="checkbox" v-model="remember" />
            <span>Lembrar</span>
          </label>
          <button type="submit" class="btn btn-success" :disabled="loading">
            {{ loading ? 'Entrando…' : 'Entrar' }}
          </button>
        </div>
        <div v-if="errorMsg" class="auth-error">{{ errorMsg }}</div>
      </form>
    </div>
  </section>
  
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const route = useRoute()
const router = useRouter()
const { login } = useAuth()

const email = ref('')
const password = ref('')
const remember = ref(true)
const loading = ref(false)
const errorMsg = ref('')

async function onSubmit(){
  errorMsg.value = ''
  loading.value = true
  try {
    await login(email.value, password.value)
    if (remember.value) {
      try { localStorage.setItem('last_email', email.value) } catch {}
    }
    const redirect = route.query.redirect || '/'
    router.replace(String(redirect))
  } catch (e) {
    errorMsg.value = e?.message || 'Falha ao entrar. Verifique as credenciais.'
  } finally {
    loading.value = false
  }
}

try { const last = localStorage.getItem('last_email'); if (last) email.value = last } catch {}
</script>
