import React, { useState, useEffect } from 'react';

export default function TasksPage({ tasks, loading, error, onCreateTask, onUpdateStatus, onDeleteTask }) {
  const [filter,     setFilter]     = useState('all');
  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError,  setFormError]  = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const filtered = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter);

  const handleCreate = async () => {
    if (!form.name.trim()) { setFormError('Task name is required.'); return; }
    setSubmitting(true);
    setFormError('');
    try {
      await onCreateTask({ name: form.name.trim(), description: form.description.trim(), status: 'not done' });
      setForm({ name: '', description: '' });
      setShowForm(false);
    } catch {
      setFormError('Failed to create task. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try { await onDeleteTask(id); } finally { setDeletingId(null); }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[ ['all', 'All'], ['not done', 'Not Done'], ['in process', 'In Process'], ['done', 'Done'] ].map(([v, l]) => (
            <button
              key={v}
              className={`btn btn-sm ${filter === v ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setFilter(v)}
            >{l}</button>
          ))}
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => { setShowForm((v) => !v); setFormError(''); }}
        >
          {showForm ? '✕ Cancel' : '＋ New Task'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
          <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '12px' }}>➕ Create New Task</div>
          <input
            type="text" placeholder="Task name *" value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            style={{
              width: '100%', padding: '9px 12px', borderRadius: '8px',
              border: `1.5px solid ${formError ? '#fca5a5' : '#e2e8f0'}`,
              fontSize: '14px', marginBottom: '10px', outline: 'none', boxSizing: 'border-box',
            }}
          />
          <textarea
            placeholder="Description (optional)" value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            style={{
              width: '100%', padding: '9px 12px', borderRadius: '8px',
              border: '1.5px solid #e2e8f0', fontSize: '14px',
              marginBottom: '10px', resize: 'vertical', outline: 'none', boxSizing: 'border-box',
            }}
          />
          {formError && <div style={{ color: '#ef4444', fontSize: '12px', marginBottom: '8px' }}>{formError}</div>}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button className="btn btn-outline btn-sm" onClick={() => { setShowForm(false); setFormError(''); setForm({ name: '', description: '' }); }}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Task'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card"><div className="empty-state"><p>Loading your tasks…</p></div></div>
      ) : error ? (
        <div className="card"><div className="empty-state"><div className="empty-icon">⚠️</div><p style={{ color: '#ef4444' }}>Could not load tasks: {error}</p></div></div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <p>{filter === 'all' ? 'No tasks yet. Hit "+ New Task" to create your first!' : `No tasks with status "${filter}".`}</p>
          </div>
        </div>
      ) : (
        filtered.map((t) => {
          const si      = statusInfo(t.status);
          const isDone  = t.status === 'done';
          const deleting = deletingId === t.id;

          return (
            <div key={t.id} className="assignment-row" style={{ marginBottom: '10px', opacity: deleting ? 0.5 : 1, transition: 'opacity 0.2s' }}>
              <div className="assignment-row-header" style={{ cursor: 'default' }}>
                <span style={{ fontSize: '20px' }}>🗒</span>
                <div style={{ flex: 1 }}>
                  <div className="assignment-title" style={{ textDecoration: isDone ? 'line-through' : 'none', color: isDone ? '#94a3b8' : undefined }}>{t.name}</div>
                  {t.description && <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{t.description}</div>}
                  <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '4px' }}>Created {fmtDate(t.created_at)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                  <select
                    value={t.status} onChange={(e) => onUpdateStatus(t.id, e.target.value)}
                    className={`badge ${si.cls}`}
                    style={{ border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '12px', borderRadius: '99px', padding: '4px 10px', appearance: 'none', WebkitAppearance: 'none' }}
                  >
                    {TASK_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <button
                    onClick={() => handleDelete(t.id)} disabled={deleting} title="Delete task"
                    style={{ background: 'none', border: 'none', cursor: deleting ? 'not-allowed' : 'pointer', color: '#cbd5e1', fontSize: '16px', padding: '4px', transition: 'color 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')} onMouseLeave={(e) => (e.currentTarget.style.color = '#cbd5e1')}
                  >🗑</button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </>
  );
}