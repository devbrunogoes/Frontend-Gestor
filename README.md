# Frontend adaptado para o backend (API REST)

Este frontend é uma camada estática simples (HTML/CSS/JS sem frameworks) preparada para se integrar com uma API REST conforme contrato descrito abaixo.

Principais arquivos adicionados:
- `js/api.js` - wrapper fetch que injeta Authorization e trata erros/401.
- `js/auth.js` - login/logout/getCurrentUser/isLoggedIn helpers.
- `js/ui.js` - funções de UI: escapeHtml, showError, showSuccess, spinner.
- `js/users.js` - exemplo de carga/render/CRUD de usuários.

API base (default): http://localhost:8080/api

Endpoints esperados:
- POST /api/auth/login -> { email, password } -> AuthResponse { token, userId, nome, email, role, permissions, expiresAt }
- GET /api/users
- GET /api/users/{id}
- POST /api/users
- PUT /api/users/{id}
- PATCH /api/users/{id}/active?active=false
- PUT /api/users/{id}/permissions
- DELETE /api/users/{id}
- GET /api/users/roles
- GET /api/users/permissions
- GET /api/users/roles/{role}/default-permissions

Como testar localmente:
1. Abra um terminal na pasta do frontend.
2. Sirva os arquivos estáticos (exemplo com Python):
```
python -m http.server 5173
```
3. Abra http://localhost:5173/login.html

Notas de segurança e integração:
- O exemplo salva token em localStorage (simples, vulnerável a XSS). Em produção, prefira cookie httpOnly.
- Garanta que o backend permita CORS para o origin do frontend durante desenvolvimento (Authorization header).
- Escape output do servidor antes de inserir no DOM (use `escapeHtml`).

Próximos passos possíveis (posso gerar para você):
- Atualizar `login.html`/`usuarios.html` para usar os novos scripts e proteger rotas.
- Substituir simulações locais por chamadas reais ao backend.
- Implementar formulários de criação/edição de usuários integrados.

## Migração para Vue 3 + Vite (atualizado)

O projeto foi migrado para uma SPA em Vue 3 + Vite, mantendo compatibilidade gradual com o código legado enquanto as telas eram reescritas.

- Entrada do app: `index.html` monta `src/main.js` (Vite).
- Router: `src/router/index.js` com todas as rotas das antigas páginas `.html`.
- Layout: `src/App.vue` + `src/components/AppSidebar.vue` (sidebar portada de `partials/sidebar.html`).
- Estilos: CSS legado importado em `src/main.js` (`css/style.css`, `css/styles.css`).
- Estado Global: Pinia habilitado em `src/main.js` e store `src/stores/auth.js` para sessão (token/usuário/expiração).
- Serviços:
	- `src/services/api.js` (wrapper fetch com base URL e Authorization opcional)
	- `src/services/users.js`, `src/services/products.js`, `src/services/sales.js`
- Autenticação:
	- `src/composables/useAuth.js` usa o store do Pinia e expõe `login/logout/isLoggedIn/getCurrentUser`.
	- Guardas de rota aplicadas (todas, exceto `/login`).
- Telas reescritas (pure Vue): Usuários, Produtos, Vendas.
- Dashboard: gráficos migrados para Vue com `vue-chartjs`/`chart.js` em `src/components/charts/*`.

Como rodar (dev):

```
npm install
npm run dev
# http://localhost:5173/
```

Build de produção:

```
npm run build
# Saída: dist/
```

### Notas de integração

- O wrapper `apiFetch` tenta enviar Authorization em ambientes considerados “prod” (ou quando `window.FORCE_AUTH = true`). Em dev local, o envio é opcional.
- Serviços tentam a API primeiro e usam localStorage como fallback (útil para desenvolvimento offline):
	- `users`: `/users`, `/users/{id}`, `/users/roles`.
	- `products`: `/products`, `/products/{id}`.
	- `sales`: `/vendas`, `/vendas/{id}/devolucoes`, `/clientes` ou `/clients`, `/rotas/execucoes` ou `/routes/executions`, `/products` ou `/estoque`.

### Próximos passos

- Remover CDNs/bridges não mais usados (ex.: Chart.js no `index.html`).
- Expandir stores (ex.: preferências do usuário) e adicionar testes.
- Atualizar/alinhar endpoints conforme o backend definitivo.
