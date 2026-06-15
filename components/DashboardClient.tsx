'use client'

import { useEffect, useState } from 'react'
import { DashboardData } from '@/types'
import { supabase } from '@/lib/supabase'

export default function DashboardClient({ initialData }: { initialData: DashboardData }) {
  const [data, setData] = useState<DashboardData>(initialData)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [connStatus, setConnStatus] = useState<'Realtime' | 'Polling'>('Realtime')

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
        <div className="filter active">Todos</div>
        <div className="filter">Human Required</div>
        <div className="filter">QA Loop Watch</div>
        <div className="filter">PO Review</div>
        <div className="filter">P0/P1</div>
        <div className="filter">Sprint atual</div>
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
              </article>
            ))}
          </div>

          <div className="kanban">
            {['PRD', 'DevMaster', 'Dev', 'QA', 'Human'].map(status => (
              <div className="col" key={status}>
                <h3>{status}</h3>
                {data.kanbanIssues.filter(i => i.status === status).map(issue => (
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
    </div>
  )
}
