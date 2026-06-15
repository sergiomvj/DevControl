-- ENUM for kanban statuses
CREATE TYPE kanban_status AS ENUM ('PRD', 'DevMaster', 'Dev', 'QA', 'Human');

-- Table: projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  repo TEXT,
  progress_sprint INTEGER DEFAULT 0,
  progress_task INTEGER DEFAULT 0,
  qa_returns_count INTEGER DEFAULT 0,
  qa_returns_max INTEGER DEFAULT 0,
  role TEXT,
  next_step TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: issues
CREATE TABLE issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  desc_text TEXT,
  tag TEXT,
  role TEXT,
  status kanban_status NOT NULL,
  priority TEXT,
  loop_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Views for KPIs
-- 1. Active projects count
CREATE OR REPLACE VIEW kpi_active_projects AS
SELECT count(*) as total FROM projects;

-- 2. Average sprint progress
CREATE OR REPLACE VIEW kpi_avg_sprint AS
SELECT COALESCE(AVG(progress_sprint), 0) as avg_progress FROM projects;

-- 3. Blocked issues (assuming tag = 'blocked' or priority = 'high' or loop_count >= 2)
CREATE OR REPLACE VIEW kpi_blocked_issues AS
SELECT count(*) as total FROM issues WHERE tag = 'blocked' OR priority = 'critical' OR loop_count >= 2;

-- 4. Total QA returns
CREATE OR REPLACE VIEW kpi_qa_returns AS
SELECT COALESCE(SUM(qa_returns_count), 0) as total_returns FROM projects;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_issues_updated_at BEFORE UPDATE ON issues FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
