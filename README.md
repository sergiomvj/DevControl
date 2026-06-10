# DevControl — FBR Dev Control Dashboard

Dashboard de controle de desenvolvimento para acompanhamento de projetos, issues e KPIs via GitHub + Supabase.

---

## 🚀 Rodar Localmente

### Pré-requisitos

- Node.js 20+
- npm 10+

### Instalação

```bash
git clone https://github.com/sergiomvj/DevControl.git
cd DevControl
npm install
```

### Configurar variáveis de ambiente

```bash
cp .env.example .env.local
# Edite .env.local com seus valores
```

### Iniciar em modo desenvolvimento

```bash
npm run dev
# Acesse: http://localhost:3000
```

---

## 🐳 Deploy no Easypanel (Passo a Passo)

### Pré-requisitos

- Instância do Easypanel em execução no VPS
- Acesso ao painel de administração do Easypanel
- Repositório GitHub: `sergiomvj/DevControl`

### Passo 1 — Criar novo app no Easypanel

1. Abra o painel do Easypanel
2. Clique em **"Create Service"** → **"App"**
3. Selecione o tipo **Dockerfile**

### Passo 2 — Conectar repositório GitHub

1. Em **"Source"**, escolha **GitHub**
2. Selecione o repositório `sergiomvj/DevControl`
3. Branch: `main`
4. Dockerfile path: `Dockerfile`

### Passo 3 — Configurar domínio

1. Em **"Domains"**, adicione o domínio: `devcontrol.fbr.news`
2. Porta do container: `3000`
3. Ative HTTPS (Let's Encrypt automático)

### Passo 4 — Configurar variáveis de ambiente

No painel do Easypanel, em **"Environment"**, adicione todas as variáveis listadas em `.env.example`:

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_APP_NAME` | Nome do app exibido na UI |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_ANON_KEY` | Chave anon do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service role (admin) do Supabase |
| `GITHUB_APP_ID` | ID do GitHub App |
| `GITHUB_INSTALLATION_ID` | Installation ID do GitHub App no org |
| `GITHUB_APP_PRIVATE_KEY` | Chave privada PEM do GitHub App |
| `CRON_SECRET` | Secret para proteger o endpoint `/api/sync` |
| `SYNC_INTERVAL_MS` | Intervalo de sync em milissegundos (padrão: 300000) |

### Passo 5 — Deploy

1. Clique em **"Deploy"**
2. Aguarde o build (primeiro build pode levar 2–3 minutos)
3. Verifique os logs em tempo real no painel
4. Quando aparecer **"Running"**, acesse `https://devcontrol.fbr.news`

### Passo 6 — Configurar sync periódico (opcional)

Para acionar o sync do GitHub automaticamente, configure um cron externo ou use o Easypanel Jobs:

```bash
# Exemplo de chamada ao endpoint de sync:
curl -X POST https://devcontrol.fbr.news/api/sync \
  -H "Authorization: Bearer SEU_CRON_SECRET"
```

---

## 🔐 Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `NEXT_PUBLIC_APP_NAME` | Não | Nome exibido na UI (padrão: FBR Dev Control Dashboard) |
| `SUPABASE_URL` | **Sim** | URL completa do projeto Supabase (ex: `https://xxx.supabase.co`) |
| `SUPABASE_ANON_KEY` | **Sim** | Chave pública anon do Supabase (JWT) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Sim** | Chave service role do Supabase com permissões admin |
| `GITHUB_APP_ID` | **Sim** | ID numérico do GitHub App |
| `GITHUB_INSTALLATION_ID` | **Sim** | ID da instalação do GitHub App na organização/conta |
| `GITHUB_APP_PRIVATE_KEY` | **Sim** | Chave privada RSA em formato PEM (multi-linha suportada) |
| `CRON_SECRET` | **Sim** | String secreta usada para autenticar chamadas ao `/api/sync` |
| `SYNC_INTERVAL_MS` | Não | Intervalo entre syncs em ms (padrão: `300000` = 5 min) |

---

## 📡 Endpoints da API

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/dashboard` | Retorna dados do dashboard (projetos, issues, KPIs, kanban) |
| `GET` | `/api/dashboard?filter=human_required` | Filtra apenas issues que requerem intervenção humana |
| `GET` | `/api/dashboard?filter=qa_loop` | Filtra issues em loop de QA |
| `GET` | `/api/dashboard?filter=po_review` | Filtra projetos em PO review |
| `GET` | `/api/dashboard?filter=p0p1` | Filtra prioridades P0/P1 |
| `GET` | `/api/dashboard?filter=sprint` | Filtra projetos com sprint ativo |
| `POST` | `/api/sync` | Aciona sync GitHub → Supabase (requer `Authorization: Bearer <CRON_SECRET>`) |

---

## 🗄️ Banco de Dados (Supabase)

As migrations ficam em `supabase/migrations/`. Execute-as no seu projeto Supabase antes do primeiro deploy:

```bash
# Via Supabase CLI
supabase db push
```

---

## 🏗️ Stack

- **Next.js 15** (App Router, standalone output)
- **React 19**
- **Supabase** (PostgreSQL + Auth)
- **GitHub App** (autenticação via JWT/installation token)
- **Docker** (imagem Alpine, multistage build)
- **Easypanel** (deploy no VPS)
