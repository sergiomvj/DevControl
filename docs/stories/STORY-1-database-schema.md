---
id: STORY-1
title: Criação do Schema SQL e Configuração do Banco de Dados
status: TO-DO
assignee: "@data-engineer"
epic: "Conversão Dinâmica do Dashboard"
---

# Story: Criação do Schema SQL e Configuração do BD

## 🎯 Objetivo
Substituir os dados mockados no dashboard (KPIs, Projetos, Kanban, Issues) por um banco de dados relacional. Como o projeto possui `@supabase/supabase-js`, configuraremos a base no Supabase.

## 📝 Descrição
O dashboard atualmente possui dados fixos no HTML/JSX. Precisamos modelar e instanciar as seguintes entidades principais para o DevControl:
- **Project**: (id, name, repo, progress_sprint, progress_task, qa_returns_count, qa_returns_max, role, next_step)
- **Issue**: (id, project_id, title, desc, tag, role, status, priority, loop_count)
- **KPIs**: Devem ser criadas Views SQL ou funções RPC no Supabase para calcular dinamicamente (ex: contagem de projetos ativos, média de sprints ponderada, contagem de bloqueios). Não usar tabela estática.
- **Domínios/ENUMs**: Criar ENUM no banco para os status de Kanban (`PRD`, `DevMaster`, `Dev`, `QA`, `Human`).

## ✅ Critérios de Aceite (DoD)
- [ ] Schema SQL (`init.sql` ou migrations) criado para as tabelas principais.
- [ ] ENUM explícito para status do Kanban para evitar inconsistências.
- [ ] Views ou RPCs criadas para cálculo em tempo real dos KPIs.
- [ ] Conexão com o banco configurada no projeto (`lib/supabase.ts` ou similar).
- [ ] Script para popular o banco com os dados simulados que estão no layout estático para testes.

## QA Results
**Reviewer:** @qa (Quinn)
**Decision:** CONCERNS
**Traceability & Testability:** 
- A story precisa especificar como a view/RPC será testada de forma isolada (testes unitários de banco ou integração).
- Recomendado adicionar cenário: *Given um projeto com qa_returns=2, When a view for consultada, Then o cálculo deve incluir o projeto.*
