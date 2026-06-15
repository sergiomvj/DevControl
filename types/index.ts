export type KanbanStatus = 'PRD' | 'DevMaster' | 'Dev' | 'QA' | 'Human';

export interface Project {
  id: string;
  name: string;
  repo: string;
  progress_sprint: number;
  progress_task: number;
  qa_returns_count: number;
  qa_returns_max: number;
  role: string;
  next_step: string;
  created_at: string;
  updated_at: string;
  
  // Computed fields (business logic)
  isRisk?: boolean;
  isBlocked?: boolean;
}

export interface Issue {
  id: string;
  project_id: string;
  title: string;
  desc_text: string | null;
  tag: string | null;
  role: string | null;
  status: KanbanStatus;
  priority: string | null;
  loop_count: number;
  created_at: string;
  updated_at: string;
  
  // Nested relation
  projects?: Project;
}

export interface DashboardKPIs {
  activeProjects: number;
  avgSprintProgress: number;
  blockedIssues: number;
  totalQaReturns: number;
}

export interface DashboardData {
  kpis: DashboardKPIs;
  projects: Project[];
  actionRequiredIssues: Issue[];
  qaLoopIssues: Issue[];
  kanbanIssues: Issue[];
  allIssues: Issue[];
}
