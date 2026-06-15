---
id: STORY-4
title: Estratégia de Testes para Camada de Banco de Dados (Views e RPCs)
status: TO-DO
assignee: "@qa"
epic: "Conversão Dinâmica do Dashboard"
---

# Story: Estratégia de Testes para Camada de Banco de Dados

## 🎯 Objetivo
Garantir a confiabilidade das regras de negócio que foram delegadas ao banco de dados (Views e RPCs para KPIs) na STORY-1, criando uma suíte de testes isolada.

## 📝 Descrição
O agente @qa levantou um CONCERN sobre a falta de testabilidade das Views e RPCs no Supabase. Para mitigar esse risco sem sobrecarregar a STORY-1 de criação do schema, esta story focará em configurar e escrever testes de unidade focados puramente no banco de dados.
Podemos usar o framework `pgTAP` (suportado nativamente pelo Supabase) ou configurar testes de integração usando o cliente local do Supabase + Jest.

## ✅ Critérios de Aceite (DoD)
- [ ] Ambiente de testes do banco de dados configurado (ex: pgTAP ou script de teste no Jest).
- [ ] Cenário implementado: *Given um projeto com qa_returns=2, When a view for consultada, Then o cálculo deve incluir o projeto corretamente.*
- [ ] Os testes devem limpar o estado do banco antes/depois da execução para manter a idempotência.
- [ ] Documentar o comando para rodar os testes de banco no `README.md`.
