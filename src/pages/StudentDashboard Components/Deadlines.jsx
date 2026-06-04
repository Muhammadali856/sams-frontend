import React, { useState, useEffect } from 'react';
import { fmtDate, daysLeft } from './helpers';

export default function DeadlinesPage({ items, expanded, toggleExpand, loading, error }) {
  const [sortOverdue, setSortOverdue] = useState(false);
  const [filterType, setFilterType]   = useState('all'); // 'all', 'assignment', 'quiz'

  // First filter by type
  const filteredItems = items.filter((item) => {
    if (filterType === 'all') return true;
    return item.itemType === filterType;
  });

  // Then sort
  const sorted = [...filteredItems].sort((a, b) => {
    const aOver = new Date(a.deadline) < new Date();
    const bOver = new Date(b.deadline) < new Date();
    if (sortOverdue) {
      if (aOver !== bOver) return aOver ? -1 : 1; 
    } else {
      if (aOver !== bOver) return aOver ? 1 : -1; 
    }
    return new Date(a.deadline || 0) - new Date(b.deadline || 0);
  });

  if (loading) return <div className="card"><div className="empty-state"><p>Loading deadlines…</p></div></div>;
  if (error) return <div className="card"><div className="empty-state"><div className="empty-icon">⚠️</div><p style={{ color: '#ef4444' }}>Could not load deadlines: {error}</p></div></div>;

  return (
    <>
      <div className="info-banner">
        <span>ℹ️</span>
        <span>
          These academic deadlines are set by your teacher and are <strong>read-only</strong>.
          To track your personal progress, use <strong>My Tasks</strong>.
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '14px', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`btn btn-sm ${filterType === 'all' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterType('all')}
          >All</button>
          <button
            className={`btn btn-sm ${filterType === 'quiz' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterType('quiz')}
          >📝 Quizzes</button>
          <button
            className={`btn btn-sm ${filterType === 'assignment' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterType('assignment')}
          >📌 Assignments</button>
        </div>
        
        <div style={{ width: '1px', height: '24px', background: '#cbd5e1' }} className="hide-mobile" />

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`btn btn-sm ${!sortOverdue ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setSortOverdue(false)}
          >📅 Soonest first</button>
          <button
            className={`btn btn-sm ${sortOverdue ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setSortOverdue(true)}
          >⚠ Overdue first</button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p>No deadlines found for this view.</p>
          </div>
        </div>
      ) : (
        sorted.map((item) => {
          // Use a composite key because an assignment and quiz might share the same ID number
          const uniqueId = `${item.itemType}-${item.id}`;
          const isOpen   = expanded === uniqueId;
          const dl       = daysLeft(item.deadline);
          const overdue  = dl === 'Overdue';
          const isQuiz   = item.itemType === 'quiz';

          return (
            <div
              key={uniqueId}
              className={`assignment-row ${isOpen ? 'expanded' : ''}`}
              onClick={() => toggleExpand(uniqueId)}
            >
              <div className="assignment-row-header">
                <span style={{ fontSize: '20px' }}>{isQuiz ? '📝' : '📌'}</span>
                <div style={{ flex: 1 }}>
                  <div className="assignment-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {item.name}
                    <span className={`badge ${isQuiz ? 'badge-quiz' : 'badge-assign'}`} style={{ fontSize: '9px', padding: '2px 6px' }}>
                      {isQuiz ? 'Quiz' : 'Assignment'}
                    </span>
                  </div>
                  <div className="assignment-meta">
                    <span>📅 Deadline: {fmtDate(item.deadline)}</span>
                  </div>
                </div>
                <span style={{
                  padding: '4px 12px', borderRadius: '99px',
                  fontSize: '11px', fontWeight: 700, flexShrink: 0,
                  background: overdue ? '#fee2e2' : dl === 'Due today' ? '#fef9c3' : '#ecfdf5',
                  color:      overdue ? '#ef4444' : dl === 'Due today' ? '#ca8a04'  : '#059669',
                }}>
                  {overdue ? '⚠ Overdue' : dl === 'Due today' ? '⏰ Due Today' : `⏳ ${dl}`}
                </span>
                <span style={{ color: '#94a3b8', marginLeft: '8px', fontSize: '16px' }}>
                  {isOpen ? '▲' : '▼'}
                </span>
              </div>

              {isOpen && (
                <div className="assignment-subtasks" onClick={(e) => e.stopPropagation()}>
                  {item.description ? (
                    <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>{item.description}</p>
                  ) : (
                    <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>
                      No description provided.
                    </p>
                  )}
                  <div style={{
                    marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9',
                    fontSize: '12px', color: '#94a3b8',
                  }}>
                    📅 Due: <strong>{fmtDate(item.deadline)}</strong>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </>
  );
}