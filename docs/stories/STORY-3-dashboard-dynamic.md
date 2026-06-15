---
id: STORY-3
title: Refatoração do Dashboard para Consumo Dinâmico
status: TO-DO
assignee: "@dev"
epic: "Conversão Dinâmica do Dashboard"
---

# Story: Refatoração do Dashboard para Consumo Dinâmico

## 🎯 Objetivo
Alterar o componente `app/page.tsx` para buscar os dados em tempo real a partir da API ou Server Actions e renderizar os componentes visualmente. Incorporar atualizações realtime do Supabase.

## 📝 Descrição
A conversão inicial do HTML estático para JSX foi feita, mas os dados estão fixos no código. Esta story requer a conversão do `page.tsx` para consumir os dados do banco de dados (da STORY-2).
Cada secção do dashboard (`.kpis`, `.projects`, `.kanban`, `.issues`) deve mapear arrays dinâmicos. As lógicas condicionais de cores (classes como `.risk`, `.blocked`, status-pill `.warn`, tag `.red`) devem ser baseadas nos status reais retornados pelo banco.

Também precisamos implementar Supabase Realtime para que o painel atualize automaticamente, refletindo a visão do futuro (V2) antecipadamente.

## ✅ Critérios de Aceite (DoD)
- [ ] `app/page.tsx` consome os dados da API/Supabase.
- [ ] Configuração de subscrições do Supabase Realtime para atualizar a interface sem recarregar a página.
- [ ] A tag `<div className="badge">Atualizado: ...</div>` exibe o timestamp real da última atualização (`last_updated_at` mais recente).
- [ ] Componentes de interface renderizam listas dinâmicas (`projects.map()`, `kpis.map()`, etc.).
- [ ] Lógica condicional de estilos conectada às regras de negócio e flags da API.
- [ ] Manter 100% de fidelidade visual em relação ao layout estático original.
- [ ] Teste end-to-end de visualização validado.

## QA Results
**Reviewer:** @qa (Quinn)
**Decision:** CONCERNS
**Traceability & Testability:**
- Supabase Realtime introduz NFRs de performance e estabilidade de conexão (WebSockets).
- A story deve incluir um DoD para *graceful degradation* caso a conexão realtime caia (fallback para polling ou cache).
- O teste E2E deve simular explicitamente um evento do Supabase Realtime para verificar se o UI reage.
