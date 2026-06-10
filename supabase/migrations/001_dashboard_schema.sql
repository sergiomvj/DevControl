-- DevControl Dashboard Schema
-- Story #8 — FBR Dev Control Dashboard
-- Migration: 001_dashboard_schema.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS dashboard_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  repo text,
  status text,
  sprint_pct int DEFAULT 0,
  task_pct int DEFAULT 0,
  qa_returns int DEFAULT 0,
  color text DEFAULT 'normal',
  role text,
  next_step text,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dashboard_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number int,
  title text,
  body text,
  status text,
  project text,
  priority text,
  qa_returns int DEFAULT 0,
  role text,
  next_step text,
  repo text,
  synced_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dashboard_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ts timestamptz DEFAULT now(),
  active_projects int DEFAULT 0,
  avg_sprint_pct int DEFAULT 0,
  blockers int DEFAULT 0,
  human_required int DEFAULT 0
);

CREATE TABLE IF NOT EXISTS dashboard_kanban (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  column_name text,
  issue_number int,
  title text,
  description text,
  project text,
  synced_at timestamptz DEFAULT now()
);
