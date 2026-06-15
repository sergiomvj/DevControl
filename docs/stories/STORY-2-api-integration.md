---
id: STORY-2
title: Desenvolvimento das Camadas de Acesso a Dados e API
status: TO-DO
assignee: "@dev"
epic: "Conversão Dinâmica do Dashboard"
---

# Story: Desenvolvimento das Camadas de Acesso a Dados e API

## 🎯 Objetivo
Criar a camada de abstração (Data Access Layer) e as rotas de API (ou Server Actions) para recuperar os dados do banco Supabase que alimentarão o dashboard.

## 📝 Descrição
Com o banco configurado (STORY-1), a aplicação Next.js precisa acessar e disponibilizar esses dados para o frontend. Implementaremos funções assíncronas para buscar:
- Os 4 KPIs do painel superior (chamando as Views/RPCs do Supabase).
- A lista de Projetos com todos os seus atributos (status, métricas de sprint, roles e próximos passos).
- A lista de Issues separada por categorias ("Sergio precisa agir", "QA Loop Watch" e issues gerais do Kanban).

A API deve calcular em tempo real as flags de risco: 
- `risk` (se qa_returns_count >= 1).
- `blocked` (se houver alguma Issue vinculada categorizada como bloqueante).

## ✅ Critérios de Aceite (DoD)
- [ ] Serviços de busca implementados utilizando `@supabase/supabase-js`.
- [ ] Lógica de negócio da API sinaliza projetos como `risk` ou `blocked` baseando-se nas regras estabelecidas.
- [ ] Tipagens completas geradas ou definidas no TypeScript (`types/index.ts`).
- [ ] Endpoint `/api/dashboard` (ou Server Actions nativos) respondendo com o JSON consolidado.
- [ ] Tratamento de erros e estados de carregamento (loading/error bounds).

## QA Results
**Reviewer:** @qa (Quinn)
**Decision:** PASS (com observações)
**Traceability & Testability:**
- As regras de negócio para `risk` e `blocked` estão claras.
- Faltam cenários Given-When-Then para validação. Sugestão: *Given issue bloqueante associada, When API for chamada, Then projeto retorna blocked=true.*
- Certificar-se de cobrir com testes unitários no Jest/Vitest a função que calcula esses status.
