import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const routes = [
  { path: '/', name: 'home', component: () => import('@/views/HomeView.vue'), meta: { requiresAuth: true } },
  { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { requiresAuth: false, guestOnly: true } },
  { path: '/alertas-estoque', name: 'alertas-estoque', component: () => import('@/views/AlertasEstoqueView.vue'), meta: { requiresAuth: true, permissions: 'ESTOQUE' } },
  { path: '/cadastros', name: 'cadastros', component: () => import('@/views/CadastrosView.vue'), meta: { requiresAuth: true, permissions: ['CLIENTES', 'ESTOQUE', 'VENDAS', 'ROTAS', 'FINANCEIRO'] } },
  { path: '/categorias', name: 'categorias', component: () => import('@/views/CategoriasView.vue'), meta: { requiresAuth: true, permissions: 'ESTOQUE' } },
  { path: '/clientes', name: 'clientes', component: () => import('@/views/ClientesView.vue'), meta: { requiresAuth: true, permissions: 'CLIENTES' } },
  { path: '/comissoes', name: 'comissoes', component: () => import('@/views/ComissoesView.vue'), meta: { requiresAuth: true, permissions: 'VENDAS' } },
  { path: '/configuracoes', name: 'configuracoes', component: () => import('@/views/ConfiguracoesView.vue'), meta: { requiresAuth: true } },
  { path: '/contas-receber', name: 'contas-receber', component: () => import('@/views/ContasReceberView.vue'), meta: { requiresAuth: true, permissions: 'FINANCEIRO' } },
  { path: '/contas-pagar', name: 'contas-pagar', component: () => import('@/views/ContasPagarView.vue'), meta: { requiresAuth: true, permissions: 'FINANCEIRO' } },
  { path: '/despesas', name: 'despesas', component: () => import('@/views/DespesasView.vue'), meta: { requiresAuth: true, permissions: 'FINANCEIRO' } },
  { path: '/estoque', name: 'estoque', component: () => import('@/views/EstoqueView.vue'), meta: { requiresAuth: true, permissions: 'ESTOQUE' } },
  { path: '/estruturas', name: 'estruturas', component: () => import('@/views/EstruturasView.vue'), meta: { requiresAuth: true, permissions: 'ESTOQUE' } },
  { path: '/executar-rota', name: 'executar-rota', component: () => import('@/views/ExecutarRotaView.vue'), meta: { requiresAuth: true, permissions: 'ROTAS' } },
  { path: '/financeiro', name: 'financeiro', component: () => import('@/views/FinanceiroView.vue'), meta: { requiresAuth: true, permissions: 'FINANCEIRO' } },
  { path: '/fluxo-caixa', name: 'fluxo-caixa', component: () => import('@/views/FluxoCaixaView.vue'), meta: { requiresAuth: true, permissions: 'FINANCEIRO' } },
  { path: '/formas-pagamento', name: 'formas-pagamento', component: () => import('@/views/FormasPagamentoView.vue'), meta: { requiresAuth: true, permissions: ['FINANCEIRO', 'VENDAS'] } },
  { path: '/fornecedores', name: 'fornecedores', component: () => import('@/views/FornecedoresView.vue'), meta: { requiresAuth: true, permissions: ['ESTOQUE', 'CLIENTES'] } },
  { path: '/metas', name: 'metas', component: () => import('@/views/MetasView.vue'), meta: { requiresAuth: true, permissions: 'VENDAS' } },
  { path: '/ordens-producao', name: 'ordens-producao', component: () => import('@/views/OrdensProducaoView.vue'), meta: { requiresAuth: true, permissions: 'ESTOQUE' } },
  { path: '/produtos', name: 'produtos', component: () => import('@/views/ProdutosView.vue'), meta: { requiresAuth: true, permissions: 'ESTOQUE' } },
  { path: '/relatorio-clientes', name: 'relatorio-clientes', component: () => import('@/views/RelatorioClientesView.vue'), meta: { requiresAuth: true, permissions: 'RELATORIOS' } },
  { path: '/relatorio-estoque', name: 'relatorio-estoque', component: () => import('@/views/RelatorioEstoqueView.vue'), meta: { requiresAuth: true, permissions: 'RELATORIOS' } },
  { path: '/relatorio-financeiro', name: 'relatorio-financeiro', component: () => import('@/views/RelatorioFinanceiroView.vue'), meta: { requiresAuth: true, permissions: 'RELATORIOS' } },
  { path: '/relatorio-rotas', name: 'relatorio-rotas', component: () => import('@/views/RelatorioRotasView.vue'), meta: { requiresAuth: true, permissions: 'RELATORIOS' } },
  { path: '/relatorio-vendas', name: 'relatorio-vendas', component: () => import('@/views/RelatorioVendasView.vue'), meta: { requiresAuth: true, permissions: 'RELATORIOS' } },
  { path: '/relatorios', name: 'relatorios', component: () => import('@/views/RelatoriosView.vue'), meta: { requiresAuth: true, permissions: 'RELATORIOS' } },
  { path: '/rota-andamento', name: 'rota-andamento', component: () => import('@/views/RotaAndamentoView.vue'), meta: { requiresAuth: true, permissions: 'ROTAS' } },
  { path: '/rotas-em-andamento', name: 'rotas-em-andamento', component: () => import('@/views/RotasEmAndamentoView.vue'), meta: { requiresAuth: true, permissions: 'ROTAS' } },
  { path: '/rotas/:id', name: 'rota-detalhe', component: () => import('@/views/RotaDetalheView.vue'), meta: { requiresAuth: true, permissions: 'ROTAS' } },
  { path: '/rotas', name: 'rotas', component: () => import('@/views/RotasView.vue'), meta: { requiresAuth: true, permissions: 'ROTAS' } },
  { path: '/sessoes', name: 'sessoes', component: () => import('@/views/SessoesView.vue'), meta: { requiresAuth: true, permissions: 'RELATORIOS' } },
  { path: '/usuarios', name: 'usuarios', component: () => import('@/views/UsuariosView.vue'), meta: { requiresAuth: true, permissions: 'RELATORIOS' } },
  { path: '/vendas', name: 'vendas', component: () => import('@/views/VendasView.vue'), meta: { requiresAuth: true, permissions: 'VENDAS' } },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() { return { top: 0 } }
})

router.beforeEach((to, from) => {
  const auth = useAuth()

  if (to.meta?.guestOnly) {
    if (auth.isLoggedIn()) return { name: 'home' }
    return true
  }

  if (to.meta?.requiresAuth === false) return true

  if (!auth.isLoggedIn()) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  const required = to.meta?.permissions || to.meta?.permission
  const mode = to.meta?.permissionMode === 'all' ? 'all' : 'any'
  if (required && !auth.hasPermission(required, { mode })) {
    return from && from.name ? false : { name: 'home' }
  }

  return true
})

// Catch-all 404 route
router.addRoute({
  path: '/:pathMatch(.*)*',
  name: 'not-found',
  component: () => import('@/views/NotFoundView.vue'),
  meta: { requiresAuth: false }
})

export default router
