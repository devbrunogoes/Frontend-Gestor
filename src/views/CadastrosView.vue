<template>
  <section class="content-area">
    <div class="page-header">
      <h2>Cadastros</h2>
    </div>

    <div class="reports-grid" aria-label="Ações de Cadastro">
      <RouterLink class="report-card" to="/clientes" aria-label="Clientes">
        <div class="report-icon"><i class="fa-solid fa-user"></i></div>
        <h3>Clientes</h3>
        <p>Cadastro e gestão de clientes</p>
      </RouterLink>

      <RouterLink class="report-card" to="/fornecedores" aria-label="Fornecedores">
        <div class="report-icon"><i class="fa-solid fa-truck"></i></div>
        <h3>Fornecedores</h3>
        <p>Parceiros e informações comerciais</p>
      </RouterLink>

      <RouterLink class="report-card" to="/produtos" aria-label="Produtos">
        <div class="report-icon"><i class="fa-solid fa-box-open"></i></div>
        <h3>Produtos</h3>
        <p>Cadastro de itens e preços</p>
      </RouterLink>

      <RouterLink class="report-card" to="/categorias" aria-label="Categorias">
        <div class="report-icon"><i class="fa-solid fa-tags"></i></div>
        <h3>Categorias</h3>
        <p>Organize seu catálogo</p>
      </RouterLink>

      <RouterLink class="report-card" to="/formas-pagamento" aria-label="Formas de Pagamento">
        <div class="report-icon"><i class="fa-solid fa-credit-card"></i></div>
        <h3>Formas de Pagamento</h3>
        <p>Condições e taxas</p>
      </RouterLink>

      <RouterLink class="report-card" to="/usuarios" aria-label="Usuários">
        <div class="report-icon"><i class="fa-solid fa-user-gear"></i></div>
        <h3>Usuários</h3>
        <p>Perfis e permissões</p>
      </RouterLink>

      <RouterLink class="report-card" to="/rotas" aria-label="Rotas">
        <div class="report-icon"><i class="fa-solid fa-road"></i></div>
        <h3>Rotas</h3>
        <p>Definição de rotas</p>
      </RouterLink>

      <RouterLink class="report-card" to="/estruturas" aria-label="Estruturas">
        <div class="report-icon"><i class="fa-solid fa-diagram-project"></i></div>
        <h3>Estruturas</h3>
        <p>Bases de produção</p>
      </RouterLink>

      <RouterLink class="report-card" to="/ordens-producao" aria-label="Ordens de Produção">
        <div class="report-icon"><i class="fa-solid fa-industry"></i></div>
        <h3>Ordens de Produção</h3>
        <p>Controle do processo</p>
      </RouterLink>

      <RouterLink class="report-card" to="/comissoes" aria-label="Comissões">
        <div class="report-icon"><i class="fa-solid fa-percent"></i></div>
        <h3>Comissões</h3>
        <p>Regras e percentuais</p>
      </RouterLink>
    </div>
  </section>
</template>

<script setup>
</script>
