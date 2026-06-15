BEGIN;

-- Plano de testes (quantos testes vamos rodar)
SELECT plan(2);

-- =========================================================================
-- SETUP (MOCK DATA)
-- =========================================================================
-- Limpar as tabelas (apenas nesta transação!)
DELETE FROM public.issues;
DELETE FROM public.projects;

-- Re-inserir os mocks com o banco limpo
INSERT INTO public.projects (id, name, qa_returns_count) 
VALUES ('11111111-1111-1111-1111-111111111111', 'Mock Project A', 2);

INSERT INTO public.projects (id, name, qa_returns_count) 
VALUES ('22222222-2222-2222-2222-222222222222', 'Mock Project B', 1);


-- =========================================================================
-- TEST: kpi_qa_returns
-- =========================================================================
-- Verifica se a view kpi_qa_returns retorna o total corretamente


-- Cenário 1: Total QA Returns deve ser 3 (2 + 1)
SELECT results_eq(
    'SELECT total_returns::int FROM public.kpi_qa_returns',
    ARRAY[3],
    'A View kpi_qa_returns deve somar corretamente os campos qa_returns_count de todos os projetos'
);

-- =========================================================================
-- TEST: kpi_active_projects
-- =========================================================================
-- Cenário 2: Projetos ativos devem ser 2
SELECT results_eq(
    'SELECT total::int FROM public.kpi_active_projects',
    ARRAY[2],
    'A View kpi_active_projects deve contar os projetos existentes'
);

-- =========================================================================
-- TEARDOWN
-- =========================================================================
-- Finaliza os testes
SELECT * FROM finish();

-- Sempre faz ROLLBACK para não sujar o banco
ROLLBACK;
