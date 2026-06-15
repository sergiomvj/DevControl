'use server'

import { supabase } from '@/lib/supabase'
import { DashboardData, Issue, Project, DashboardKPIs } from '@/types'

export async function getDashboardData(): Promise<DashboardData> {
  try {
    // 1. Fetch KPIs
    const [
      { data: activeProjectsData, error: err1 },
      { data: avgSprintData, error: err2 },
      { data: blockedIssuesData, error: err3 },
      { data: qaReturnsData, error: err4 },
    ] = await Promise.all([
      supabase.from('kpi_active_projects').select('*').single(),
      supabase.from('kpi_avg_sprint').select('*').single(),
      supabase.from('kpi_blocked_issues').select('*').single(),
      supabase.from('kpi_qa_returns').select('*').single(),
    ])

    if (err1 || err2 || err3 || err4) {
      console.error('Error fetching KPIs', { err1, err2, err3, err4 })
      throw new Error('Failed to fetch KPI data')
    }

    const kpis: DashboardKPIs = {
      activeProjects: activeProjectsData?.total || 0,
      avgSprintProgress: Math.round(avgSprintData?.avg_progress || 0),
      blockedIssues: blockedIssuesData?.total || 0,
      totalQaReturns: qaReturnsData?.total_returns || 0,
    }

    // 2. Fetch Projects
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (projectsError) {
      console.error('Error fetching projects:', projectsError)
      throw new Error('Failed to fetch projects')
    }

    // 3. Fetch Issues
    const { data: issuesData, error: issuesError } = await supabase
      .from('issues')
      .select('*, projects(name)')
      .order('created_at', { ascending: false })

    if (issuesError) {
      console.error('Error fetching issues:', issuesError)
      throw new Error('Failed to fetch issues')
    }

    const issues = issuesData as Issue[]

    // 4. Compute Business Logic (Risk / Blocked) for Projects
    const projects: Project[] = (projectsData as Project[]).map(project => {
      // isRisk: qa_returns_count >= 1
      const isRisk = project.qa_returns_count >= 1

      // isBlocked: any related issue has tag='blocked' or priority='critical'
      const hasBlockingIssue = issues.some(
        issue => 
          issue.project_id === project.id && 
          (issue.tag === 'blocked' || issue.priority === 'critical')
      )
      
      return {
        ...project,
        isRisk,
        isBlocked: hasBlockingIssue,
      }
    })

    // 5. Categorize Issues for Dashboard Sections
    const actionRequiredIssues = issues.filter(issue => issue.tag === 'action_required')
    const qaLoopIssues = issues.filter(issue => issue.tag === 'qa_return' || issue.loop_count > 0)
    
    // Kanban issues: everything else that isn't purely an action required or qa loop?
    // Actually, Kanban might show everything or just specific items.
    // Based on the layout, it shows items mapped to status columns. Let's include all non-action_required/non-qa issues, or maybe all issues.
    // For now, let's include all issues in Kanban, except the ones strictly belonging to the special top panels, or include all.
    const kanbanIssues = issues.filter(issue => issue.tag !== 'action_required' && issue.tag !== 'qa_return')

    return {
      kpis,
      projects,
      actionRequiredIssues,
      qaLoopIssues,
      kanbanIssues
    }

  } catch (error) {
    console.error('getDashboardData error:', error)
    throw error
  }
}
