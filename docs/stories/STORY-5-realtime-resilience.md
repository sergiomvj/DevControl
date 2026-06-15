---
id: STORY-5
title: Resiliência e Fallback para Supabase Realtime
status: TO-DO
assignee: "@dev"
epic: "Conversão Dinâmica do Dashboard"
---

# Story: Resiliência e Fallback para Supabase Realtime

## 🎯 Objetivo
Assegurar os Requisitos Não-Funcionais (NFRs) de estabilidade introduzidos pelo uso de WebSockets (Supabase Realtime) na STORY-3.

## 📝 Descrição
O agente @qa identificou que conexões em tempo real podem sofrer instabilidades. Se o WebSocket falhar, o dashboard não deve ficar congelado ou sem atualizações. Precisamos implementar um mecanismo de *graceful degradation*: se a subscrição realtime do Supabase desconectar ou falhar, o frontend deve automaticamente fazer fallback para um sistema de *polling* (ex: refetch a cada 30 segundos) usando TanStack Query ou SWR.

## ✅ Critérios de Aceite (DoD)
- [ ] Implementação de lógica de fallback: se WebSocket = `CLOSED/ERROR`, ativar polling da API via HTTP.
- [ ] Adição de indicador visual discreto na UI caso o dashboard esteja operando em modo "offline/polling" vs "realtime".
- [ ] Teste E2E (ex: Playwright/Cypress) que simula o corte da conexão WebSocket e valida se o polling é ativado.
- [ ] Teste E2E validando a emissão de evento e a reação do React na interface.
