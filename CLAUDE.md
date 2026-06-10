# DevControl — FBR Dev Control Dashboard

## Projeto
Transformar o `index.html` estático em um sistema Next.js dinâmico alimentado por Supabase + GitHub API.
Layout visual: **pixel-a-pixel idêntico ao `index.html`**. Nenhum elemento visual novo ou removido.

## Stack
- Next.js 15 (App Router) + TypeScript
- Supabase (PostgreSQL) via `@supabase/supabase-js`
- GitHub App FBR para sync de issues
- CSS puro (sem Tailwind) — preservar variáveis CSS do index.html

## Design Tokens (PRESERVAR EXATAMENTE)
```css
--bg: #080b12
--panel: #101623
--panel-2: #151d2d
--line: #263149
--text: #eef3ff
--muted: #94a3b8
--blue: #4f8cff
--green: #27c284
--yellow: #f6c650
--red: #ff5a6a
--purple: #a78bfa
--cyan: #22d3ee
```

## Estrutura de Arquivos Esperada
```
app/
  globals.css          ← CSS do index.html migrado aqui
  layout.tsx
  page.tsx             ← monta o dashboard com dados reais
  api/
    dashboard/route.ts ← GET /api/dashboard — dados do Supabase
    sync/route.ts      ← POST /api/sync — dispara sync GitHub → Supabase
components/
  Header.tsx
  KpiGrid.tsx
  FilterBar.tsx
  ProjectCard.tsx
  KanbanBoard.tsx
  Sidebar.tsx
  IssueItem.tsx
lib/
  supabase.ts          ← cliente Supabase
  github-sync.ts       ← sync GitHub → Supabase
supabase/
  migrations/
    001_dashboard_schema.sql
```

## Variáveis de Ambiente (.env.local)
Já criado. Ver .env.example para lista completa.

## Referência Visual
`index.html` na raiz — este é o layout de referência. Nunca alterar este arquivo.

## Regras Importantes
1. Não usar Tailwind — manter CSS puro do index.html
2. Não alterar nenhum elemento visual — só substituir dados mockados por reais
3. O arquivo `index.html` é sagrado — só para referência, nunca editar
4. TypeScript strict mode
5. Cada componente corresponde exatamente a uma seção do HTML original

## Stories (GitHub Issues em sergiomvj/aiox-dev-harness)
- #8 Schema Supabase → criar /supabase/migrations/001_dashboard_schema.sql
- #9 Sync Job → criar /lib/github-sync.ts + /app/api/sync/route.ts
- #10 API Route → criar /app/api/dashboard/route.ts
- #11 Componentes React → criar todos em /components/ + app/globals.css + app/page.tsx
- #12 Auto-refresh + filtros → adicionar polling 60s + filtros client-side no page.tsx
- #13 Deploy → Dockerfile + next.config.ts standalone
