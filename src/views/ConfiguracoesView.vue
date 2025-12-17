<template>
  <section class="content-area">
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;gap:1rem;">
      <h2 style="margin:0;">Configurações</h2>
      <div class="page-actions" style="display:flex;gap:.5rem;">
        <button class="btn btn-success" @click="save" :disabled="saving">Salvar</button>
      </div>
    </div>

    <div v-if="errorMsg" style="color:#dc3545; margin-bottom:.5rem">{{ errorMsg }}</div>
    <div v-if="successMsg" style="color:#198754; margin-bottom:.5rem">{{ successMsg }}</div>

    <!-- Gerais -->
    <div class="settings-section settings-form">
      <h3><i class="fa-solid fa-gear"></i> Gerais</h3>
      <div class="form-grid">
        <div class="form-group form-group-large">
          <label for="empresa">Nome da Empresa</label>
          <input id="empresa" class="form-control" v-model.trim="settings.empresaNome" />
        </div>
        <div class="form-group">
          <label for="moeda">Moeda</label>
          <input id="moeda" class="form-control" v-model.trim="settings.moeda" placeholder="BRL" />
        </div>
        <div class="form-group">
          <label for="tz">Time Zone</label>
          <input id="tz" class="form-control" v-model.trim="settings.timezone" placeholder="America/Sao_Paulo" />
        </div>
        <div class="form-group form-group-large">
          <label for="api">API Host (opcional)</label>
          <input id="api" class="form-control" v-model.trim="settings.apiHost" placeholder="http://localhost:8082/api" />
        </div>
      </div>
    </div>

    <!-- Vendas -->
    <div class="settings-section settings-form">
      <h3><i class="fa-solid fa-cart-shopping"></i> Vendas</h3>
      <div class="form-grid">
        <div class="form-group">
          <label for="formaPadrao">Forma de Pagamento Padrão</label>
          <select id="formaPadrao" class="form-control" v-model="settings.formaPagamentoPadrao">
            <option value="Pix">Pix</option>
            <option value="Cartão">Cartão</option>
            <option value="Dinheiro">Dinheiro</option>
          </select>
        </div>
        <div class="form-group">
          <label for="statusPadrao">Status de Pagamento Padrão</label>
          <select id="statusPadrao" class="form-control" v-model="settings.statusPagamentoPadrao">
            <option value="Pago">Pago</option>
            <option value="Pendente">Pendente</option>
          </select>
        </div>
        <div class="form-group">
          <label for="origemPadrao">Origem Padrão</label>
          <select id="origemPadrao" class="form-control" v-model="settings.vendaOrigemPadrao">
            <option value="sistema">Sistema</option>
            <option value="rota">Rota</option>
          </select>
        </div>
        <div class="form-group">
          <label for="descontoMax">Desconto Máximo por Item (%)</label>
          <input id="descontoMax" type="number" min="0" step="0.1" class="form-control" v-model.number="settings.descontoMaximoVenda" />
        </div>
        <div class="form-group form-group-full">
          <label class="switch">
            <input type="checkbox" v-model="settings.mostrarBotoesRapidosVendas" />
            <span>Mostrar botões rápidos na tela de Vendas</span>
          </label>
        </div>
        <div class="form-group form-group-full">
          <label class="switch">
            <input type="checkbox" v-model="settings.mostrarFabNovaVenda" />
            <span>Mostrar botão flutuante "Nova Venda" no celular</span>
          </label>
        </div>
      </div>
    </div>

    <!-- Financeiro -->
    <div class="settings-section settings-form">
      <h3><i class="fa-solid fa-sack-dollar"></i> Financeiro</h3>
      <div class="form-grid">
        <div class="form-group">
          <label for="diasVenc">Dias padrão para vencimento (Receber)</label>
          <input id="diasVenc" type="number" min="0" step="1" class="form-control" v-model.number="settings.receberDiasPadrao" />
        </div>
        <div class="form-group">
          <label for="multa">Multa por atraso (%)</label>
          <input id="multa" type="number" min="0" step="0.1" class="form-control" v-model.number="settings.multaAtrasoPerc" />
        </div>
        <div class="form-group">
          <label for="juros">Juros/mês (%)</label>
          <input id="juros" type="number" min="0" step="0.1" class="form-control" v-model.number="settings.jurosMensalPerc" />
        </div>
        <div class="form-group">
          <label for="casas">Casas decimais</label>
          <input id="casas" type="number" min="0" max="4" step="1" class="form-control" v-model.number="settings.decimais" />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { getSettings, saveSettings } from '@/services/settings'

const settings = reactive({
  // gerais
  empresaNome:'', moeda:'BRL', timezone:'America/Sao_Paulo', apiHost:'',
  // vendas
  formaPagamentoPadrao:'Pix', statusPagamentoPadrao:'Pago', vendaOrigemPadrao:'sistema', descontoMaximoVenda:0,
  mostrarBotoesRapidosVendas:true, mostrarFabNovaVenda:true,
  // financeiro
  receberDiasPadrao:0, multaAtrasoPerc:0, jurosMensalPerc:0, decimais:2,
})
const saving = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

async function load(){
  errorMsg.value=''; successMsg.value=''
  try {
    const s = await getSettings()
    Object.assign(settings, settings, s || {})
  } catch(e){ errorMsg.value = e?.message || 'Erro ao carregar configurações' }
}

async function save(){
  saving.value = true; errorMsg.value=''; successMsg.value=''
  try { await saveSettings({ ...settings }); successMsg.value='Configurações salvas.' }
  catch(e){ errorMsg.value = e?.message || 'Erro ao salvar' }
  finally { saving.value = false }
}

onMounted(load)
</script>
