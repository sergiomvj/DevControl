-- Insert Projects
INSERT INTO projects (id, name, repo, progress_sprint, progress_task, qa_returns_count, qa_returns_max, role, next_step)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'sextouViralVideos', 'sergiomvj/sextouViralVideos', 13, 20, 2, 4, 'Tech Lead', 'Revisar PR #42 e subir para Staging.'),
  ('22222222-2222-2222-2222-222222222222', 'DevControl', 'sergiomvj/DevControl', 85, 90, 0, 0, 'Project Manager', 'Aprovar épico de métricas com stakeholders.'),
  ('33333333-3333-3333-3333-333333333333', 'DataSync API', 'sergiomvj/DataSync', 45, 50, 1, 3, 'Backend Dev', 'Finalizar endpoint de reconciliação de dados.');

-- Insert Issues
INSERT INTO issues (id, project_id, title, desc_text, tag, role, status, priority, loop_count)
VALUES 
  -- Sergio precisa agir
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Revisar arquitetura do BD', 'Verificar índices e chaves estrangeiras', 'action_required', 'Sérgio', 'PRD', 'high', 0),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'Aprovar novo layout', 'Mockups da V2 do Dashboard', 'action_required', 'Sérgio', 'PRD', 'medium', 0),
  
  -- QA Loop Watch
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Refatorar componente de Vídeo', 'Issue de QA: lentidão na renderização', 'qa_return', 'Dev Team', 'Dev', 'high', 2),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', 'Corrigir falha de sync', 'Sincronização perdendo dados intermitentemente', 'qa_return', 'Backend Dev', 'Dev', 'critical', 3),
  
  -- Kanban board issues
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'Mapeamento de Requisitos', '', 'scope', 'PO', 'PRD', 'medium', 0),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Setup do Repositório', '', 'infra', 'DevOps', 'DevMaster', 'high', 0),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', 'Implementar Auth', '', 'security', 'Backend', 'Dev', 'high', 0),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Testes de Integração', '', 'tests', 'QA', 'QA', 'medium', 0),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'Treinamento de Equipe', '', 'onboarding', 'Agile Master', 'Human', 'low', 0);
