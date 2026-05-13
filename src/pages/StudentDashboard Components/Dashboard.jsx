import React, { useState, useEffect } from 'react';
import { fmtDate, daysLeft } from './helpers';

export default function DashboardPage({ stats, items, tasks, setActivePage, loadingDeadlines }){
  const upcoming = [...items]
    .sort((a, b) => new Date(a.deadline || 0) - new Date(b.deadline || 0))
    .filter((a) => new Date(a.deadline) >= new Date())
    .slice(0, 4);

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">📅</div>
          <div>
            <div className="stat-num">{stats.totalDeadlines}</div>
            <div className="stat-label">Total Deadlines</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div>
            <div className="stat-num">{stats.done}</div>
            <div className="stat-label">Tasks Done</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber">🔄</div>
          <div>
            <div className="stat-num">{stats.inProcess}</div>
            <div className="stat-label">In Progress</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">⬜</div>
          <div>
            <div className="stat-num">{stats.notDone}</div>
            <div className="stat-label">Not Started</div>
          </div>
        </div>
      </div>

      {stats.totalTasks > 0 && (
        <div className="card mb-6" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontWeight: 700, fontSize: '14px' }}>My Tasks Progress</span>
            <span style={{ fontWeight: 800, fontSize: '14px', color: '#10b981' }}>
              {Math.round((stats.done / stats.totalTasks) * 100)}%
            </span>
          </div>
          <div style={{ height: '10px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${(stats.done / stats.totalTasks) * 100}%`,
              background: 'linear-gradient(90deg, #10b981, #059669)',
              borderRadius: '99px',
              transition: 'width 0.5s ease',
            }} />
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontSize: '12px', color: '#64748b' }}>
            <span>✅ {stats.done} done</span>
            <span>🔄 {stats.inProcess} in progress</span>
            <span>⬜ {stats.notDone} not started</span>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <span className="card-title">⏰ Upcoming Deadlines</span>
          <button className="btn btn-outline btn-sm" onClick={() => setActivePage('deadlines')}>View All</button>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {loadingDeadlines ? (
            <div className="empty-state"><p>Loading...</p></div>
          ) : upcoming.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎉</div>
              <p>No upcoming deadlines right now!</p>
            </div>
          ) : (
            upcoming.map((item) => {
              const dl = daysLeft(item.deadline);
              const isQuiz = item.itemType === 'quiz';
              
              return (
                <div key={`${item.itemType}-${item.id}`} style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '14px 20px', borderBottom: '1px solid #f1f5f9',
                }}>
                  <span style={{ fontSize: '22px' }}>{isQuiz ? '📝' : '📌'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {item.name}
                      <span className={`badge ${isQuiz ? 'badge-quiz' : 'badge-assign'}`} style={{ fontSize: '9px', padding: '2px 6px' }}>
                        {isQuiz ? 'Quiz' : 'Assignment'}
                      </span>
                    </div>
                    {item.description && (
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                        {item.description}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{
                      fontSize: '13px', fontWeight: 700,
                      color: dl.includes('Overdue') ? '#ef4444' : '#f59e0b',
                    }}>
                      {dl}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{fmtDate(item.deadline)}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {tasks.length > 0 && (
        <div className="card" style={{ marginTop: '16px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px' }}>🗒 My Personal Tasks</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
              {stats.totalTasks} task{stats.totalTasks !== 1 ? 's' : ''} — {stats.done} completed
            </div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => setActivePage('tasks')}>Manage Tasks</button>
        </div>
      )}
    </>
  );
}