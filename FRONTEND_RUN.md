Objetivo

Executar o frontend Vue 3 + Vite e o backend localmente (Windows PowerShell) e validar as telas reescritas (Usuários, Produtos, Vendas) e o Dashboard com gráficos em Vue.

Pré-requisitos
- Node.js 18+
- Java + Maven + Banco (para rodar o backend Spring Boot)

1) Rodar o backend (Spring Boot)

```powershell
cd "C:\Users\Bruno Goes\OneDrive\Documentos\Bruno Goes\Projetos Pessoais\Gestor-IA"
mvn spring-boot:run
```

Por padrão o backend sobe em http://localhost:8080. Garanta CORS para http://localhost:5173 durante o desenvolvimento.

2) Rodar o frontend (Vite dev server)

```powershell
cd "C:\Users\Bruno Goes\OneDrive\Documentos\Bruno Goes\Projetos Pessoais\Gestor-IA\frontend"
npm install
npm run dev
```

Acesse http://localhost:5173/

3) Build de produção

```powershell
cd "C:\Users\Bruno Goes\OneDrive\Documentos\Bruno Goes\Projetos Pessoais\Gestor-IA\frontend"
npm run build
```

Saída gerada em `frontend/dist`.

4) Notas de integração (API)
- O wrapper `src/services/api.js` usa base URL `http://<host>:8082/api` por padrão em dev local; ajuste conforme seu backend (ou defina `window.API_ENV`/`window.FORCE_AUTH` se necessário).
- Serviços tentam a API primeiro e caem para localStorage (útil sem backend):
  - Usuários: `src/services/users.js`
  - Produtos: `src/services/products.js`
  - Vendas: `src/services/sales.js`

5) Autenticação
- Guardas de rota exigem login para todas as páginas exceto `/login`.
- O composable `src/composables/useAuth.js` usa o store `src/stores/auth.js` (Pinia) para manter `token/user/expiresAt`.

6) Gráficos do Dashboard
- Migrados para Vue (`vue-chartjs` + `chart.js`):
  - `src/components/charts/SalesByDay.vue`
  - `src/components/charts/SalesByOrigin.vue`
  - `src/components/charts/TopProducts.vue`

7) Dicas
- Se o backend usar outra porta/origem, ajuste CORS no backend e a base do `apiFetch` quando necessário.
- Em dev, o envio de Authorization é opcional; em produção é automático (veja `api.js`).

Fim do arquivo.

