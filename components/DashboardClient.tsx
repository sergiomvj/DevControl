'use client'

import { useEffect, useState } from 'react'
import { DashboardData, Project, Issue } from '@/types'
import { supabase } from '@/lib/supabase'
import { getDashboardData } from '@/app/actions/dashboard'

type FilterType = 'Todos' | 'Human Required' | 'QA Loop Watch' | 'PO Review' | 'P0/P1' | 'Sprint atual'

export default function DashboardClient({ initialData }: { initialData: DashboardData }) {
  const [data, setData] = useState<DashboardData>(initialData)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [connStatus, setConnStatus] = useState<'Realtime' | 'Polling'>('Realtime')
  const [activeFilter, setActiveFilter] = useState<FilterType>('Todos')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  useEffect(() => {
    let pollingInterval: NodeJS.Timeout | null = null

    const startPolling = () => {
      if (pollingInterval) return
      setConnStatus('Polling')
      pollingInterval = setInterval(async () => {
        try {
          const freshData = await getDashboardData()
          setData(freshData)
          setLastUpdated(new Date())
        } catch (error) {
          console.error('Polling error', error)
        }
      }, 15000) // 15s polling fallback
    }

    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, async () => {
        const freshData = await getDashboardData()
        setData(freshData)
        setLastUpdated(new Date())
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issues' }, async () => {
        const freshData = await getDashboardData()
        setData(freshData)
        setLastUpdated(new Date())
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnStatus('Realtime')
          if (pollingInterval) {
            clearInterval(pollingInterval)
            pollingInterval = null
          }
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          startPolling()
        }
      })

    return () => {
      supabase.removeChannel(channel)
      if (pollingInterval) clearInterval(pollingInterval)
    }
  }, [])

  const filteredKanbanIssues = data.kanbanIssues.filter(issue => {
    switch (activeFilter) {
      case 'Human Required':
        return issue.role === 'Human' || issue.status === 'Human'
      case 'QA Loop Watch':
        return issue.loop_count > 0 || issue.tag === 'qa_return'
      case 'PO Review':
        return issue.role === 'PO'
      case 'P0/P1':
        return issue.priority === 'P0' || issue.priority === 'P1' || issue.priority === 'critical'
      case 'Sprint atual':
        return issue.status !== 'PRD' // Tudo que ainda está em andamento
      case 'Todos':
      default:
        return true
    }
  })

  return (
    <div className="app">
      <header>
        <div>
          <h1>FBR Development Control</h1>
          <div className="subtitle">Painel central de execução — GitHub Issues + Projects + fluxo PO → DevMaster → Dev → QA.</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <div className="badge" style={{ background: connStatus === 'Realtime' ? 'var(--green)' : 'var(--red)', color: '#fff' }}>
            {connStatus === 'Realtime' ? '⚡ Tempo Real' : '📡 Modo Polling'}
          </div>
          <div className="badge">Atualizado: {lastUpdated.toLocaleString('pt-BR')}</div>
        </div>
      </header>

      <section className="kpis">
        <div className="kpi">
          <div className="label">Projetos ativos</div>
          <div className="value">{data.kpis.activeProjects}</div>
          <div className="hint">Monitoramento em tempo real</div>
        </div>
        <div className="kpi">
          <div className="label">Sprint média</div>
          <div className="value">{data.kpis.avgSprintProgress}%</div>
          <div className="hint">ponderado por peso de Issue</div>
        </div>
        <div className="kpi">
          <div className="label">Bloqueios</div>
          <div className="value" style={{ color: 'var(--yellow)' }}>{data.kpis.blockedIssues}</div>
          <div className="hint">Problemas críticos ou bloqueantes</div>
        </div>
        <div className="kpi">
          <div className="label">Retornos de QA</div>
          <div className="value" style={{ color: 'var(--red)' }}>{data.kpis.totalQaReturns}</div>
          <div className="hint">Soma de returns em andamento</div>
        </div>
      </section>

      <nav className="filters">
        {(['Todos', 'Human Required', 'QA Loop Watch', 'PO Review', 'P0/P1', 'Sprint atual'] as FilterType[]).map(filter => (
          <div 
            key={filter} 
            className={`filter ${activeFilter === filter ? 'active' : ''}`}
            onClick={() => setActiveFilter(filter)}
            style={{ cursor: 'pointer' }}
          >
            {filter}
          </div>
        ))}
      </nav>

      <main className="layout">
        <section className="panel">
          <div className="section-title">
            <h2>Projetos</h2>
            <span>visão executiva</span>
          </div>
          <div className="projects">
            {data.projects.map(project => (
              <article 
                key={project.id} 
                className={`project-card ${project.isBlocked ? 'blocked' : ''} ${project.isRisk ? 'risk' : ''}`}
              >
                <div className="project-head">
                  <div>
                    <div className="project-name">{project.name}</div>
                    <div className="repo">{project.repo}</div>
                  </div>
                  <div className={`status-pill ${project.isBlocked ? 'danger' : project.isRisk ? 'warn' : ''}`}>
                    {project.role || 'Active'}
                  </div>
                </div>
                <div className="progress-row">
                  <div className="bar">
                    <div 
                      className={`fill ${project.isBlocked ? 'red' : project.isRisk ? 'yellow' : 'green'}`} 
                      style={{ width: `${project.progress_sprint}%` }}
                    ></div>
                  </div>
                  <strong>{project.progress_sprint}%</strong>
                </div>
                <div className="meta">
                  <div><small>Sprint</small><b>{project.progress_sprint}%</b></div>
                  <div><small>Task atual</small><b>{project.progress_task}%</b></div>
                  <div><small>QA Returns</small><b>{project.qa_returns_count}/{project.qa_returns_max}</b></div>
                </div>
                <p className="next">
                  <span className="role">{project.role || 'Sys'}</span> Próxima etapa: {project.next_step}
                </p>
                <div style={{ marginTop: '12px' }}>
                  <button 
                    style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: 'var(--fg-dim)' }}
                    onClick={() => setSelectedProject(project)}
                  >
                    Ver Detalhes
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="kanban">
            {['PRD', 'DevMaster', 'Dev', 'QA', 'Human'].map(status => (
              <div className="col" key={status}>
                <h3>{status}</h3>
                {filteredKanbanIssues.filter(i => i.status === status).map(issue => (
                  <div key={issue.id} className="mini-card">
                    <b>{issue.title}</b>
                    {issue.desc_text}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        <aside className="panel">
          <div className="section-title">
            <h2>Sergio precisa agir</h2>
            <span>sem ruído</span>
          </div>
          <div className="issues">
            {data.actionRequiredIssues.map(issue => (
              <div key={issue.id} className="issue">
                <div className="issue-top">
                  <div className="issue-title">{issue.title}</div>
                  <div className="tag red">{issue.role || 'Human'}</div>
                </div>
                <div className="issue-desc">{issue.desc_text}</div>
                <span className="tag">{issue.projects?.name}</span>
                {issue.priority && <span className="tag red">{issue.priority}</span>}
              </div>
            ))}
          </div>

          <div style={{ height: '18px' }}></div>
          <div className="section-title">
            <h2>QA Loop Watch</h2>
            <span>evita loops</span>
          </div>
          <div className="issues">
            {data.qaLoopIssues.map(issue => (
              <div key={issue.id} className="issue">
                <div className="issue-top">
                  <div className="issue-title">{issue.title}</div>
                  <div className="tag yellow">QA Loop {issue.loop_count}</div>
                </div>
                <div className="issue-desc">{issue.desc_text}</div>
                <span className="tag">{issue.projects?.name}</span>
                <span className="tag">QA</span>
              </div>
            ))}
          </div>

          <div style={{ height: '18px' }}></div>
          <div className="section-title">
            <h2>Melhorias UX</h2>
            <span>recomendadas</span>
          </div>
          <div className="issues">
            <div className="issue">
              <div className="issue-title">Next action obrigatório</div>
              <div className="issue-desc">Todo card mostra o próximo movimento, não só status.</div>
            </div>
          </div>
        </aside>
      </main>

      <div className="footer-note">
        V2: dashboard Next.js Server Actions + Supabase Realtime executando localmente.
      </div>

      {selectedProject && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '24px'
        }}>
          <div style={{
            background: 'var(--surface-1)', borderRadius: '8px', border: '1px solid var(--border)',
            width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0 }}>{selectedProject.name}</h2>
                <span style={{ color: 'var(--fg-dim)', fontSize: '14px' }}>{selectedProject.repo}</span>
              </div>
              <button 
                onClick={() => setSelectedProject(null)}
                style={{ background: 'none', border: 'none', color: 'var(--fg-dim)', cursor: 'pointer', fontSize: '24px' }}
              >
                &times;
              </button>
            </div>
            <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h3 style={{ color: 'var(--fg)', marginBottom: '12px' }}>A Fazer / Em Andamento</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {data.allIssues?.filter(i => i.project_id === selectedProject.id && i.status !== 'PRD').map(issue => (
                    <div key={issue.id} style={{ background: 'var(--surface-2)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <strong>{issue.title}</strong>
                        <span style={{ fontSize: '12px', background: 'var(--surface-3)', padding: '2px 6px', borderRadius: '4px' }}>{issue.status}</span>
                      </div>
                      <div style={{ color: 'var(--fg-dim)', fontSize: '13px' }}>{issue.desc_text}</div>
                    </div>
                  ))}
                  {data.allIssues?.filter(i => i.project_id === selectedProject.id && i.status !== 'PRD').length === 0 && (
                    <div style={{ color: 'var(--fg-dim)', fontSize: '13px' }}>Nenhuma task pendente.</div>
                  )}
                </div>
              </div>
              <div>
                <h3 style={{ color: 'var(--fg)', marginBottom: '12px' }}>Feitas (PRD)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {data.allIssues?.filter(i => i.project_id === selectedProject.id && i.status === 'PRD').map(issue => (
                    <div key={issue.id} style={{ background: 'var(--surface-2)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border)', opacity: 0.7 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <strong style={{ textDecoration: 'line-through' }}>{issue.title}</strong>
                        <span style={{ fontSize: '12px', color: 'var(--green)' }}>PRD</span>
                      </div>
                    </div>
                  ))}
                  {data.allIssues?.filter(i => i.project_id === selectedProject.id && i.status === 'PRD').length === 0 && (
                    <div style={{ color: 'var(--fg-dim)', fontSize: '13px' }}>Nenhuma task concluída ainda.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
