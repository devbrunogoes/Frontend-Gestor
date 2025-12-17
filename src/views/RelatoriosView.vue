<template>
  <section class="content-area">
    <div class="page-header">
      <h2>Relatórios</h2>
    </div>

    <div class="reports-grid">
      <RouterLink class="report-card" to="/relatorio-vendas" aria-label="Relatório de Vendas">
        <div class="report-icon"><i class="fa-solid fa-file-invoice-dollar"></i></div>
        <h3>Vendas</h3>
        <p>Resumo, filtros e exportações</p>
      </RouterLink>

      <RouterLink class="report-card" to="/relatorio-clientes" aria-label="Relatório de Clientes">
        <div class="report-icon"><i class="fa-solid fa-user-group"></i></div>
        <h3>Clientes</h3>
        <p>Listagem, segmentação e filtros</p>
      </RouterLink>

      <RouterLink class="report-card" to="/relatorio-estoque" aria-label="Relatório de Estoque">
        <div class="report-icon"><i class="fa-solid fa-boxes-stacked"></i></div>
        <h3>Estoque</h3>
        <p>Abaixo do mínimo, totais e histórico</p>
      </RouterLink>

      <RouterLink class="report-card" to="/relatorio-financeiro" aria-label="Relatório Financeiro">
        <div class="report-icon"><i class="fa-solid fa-scale-balanced"></i></div>
        <h3>Financeiro</h3>
        <p>Receitas x Despesas por período</p>
      </RouterLink>

      <RouterLink class="report-card" to="/relatorio-rotas" aria-label="Relatório de Rotas">
        <div class="report-icon"><i class="fa-solid fa-route"></i></div>
        <h3>Rotas</h3>
        <p>Execuções, desempenho e progresso</p>
      </RouterLink>
    </div>
  </section>
</template>

<script setup>
</script>
