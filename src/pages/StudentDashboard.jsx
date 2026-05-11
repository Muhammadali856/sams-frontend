import React, { useState, useEffect, useRef } from 'react';
import '../styles/global.css';

/**
 * StudentDashboard.jsx
 *
 * Data model:
 *  - Assignments  → fetched from backend (read-only; no status field)
 *  - Tasks        → student's personal tasks (CRUD + status)
 *
 * API base is read from VITE_API_BASE env-var or falls back to localhost.
 */

const API_BASE = import.meta.env?.VITE_API_BASE ?? 'https://sams-backend-92kz.onrender.com/api';  

/* ── Helpers ─────────────────────────────────────────────── */
const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const daysLeft = (d) => {
  const diff = Math.ceil((new Date(d) - new Date()) / 86_400_000);
  if (diff < 0)  return 'Overdue';
  if (diff === 0) return 'Due today';
  return `${diff}d left`;
};

/* Status options only apply to Tasks, NOT Assignments */
const TASK_STATUS = [
  { value: 'not done',   label: '⬜ Not Done',   cls: 'badge-todo'    },
  { value: 'in process', label: '🔄 In Process',  cls: 'badge-process' },
  { value: 'done',       label: '✅ Done',         cls: 'badge-done'    },
];

const statusInfo = (value) =>
  TASK_STATUS.find((s) => s.value === value) ?? TASK_STATUS[0];

/* ── Sidebar nav ─────────────────────────────────────────── */
const NAV = [
  { id: 'dashboard',     label: 'Dashboard',      icon: '🏠' },
  { id: 'assignments',   label: 'Assignments',     icon: '📋' },
  { id: 'tasks',         label: 'My Tasks',        icon: '✅' },
  { id: 'pomodoro',      label: 'Pomodoro Timer',  icon: '⏱'  },
  { id: 'notifications', label: 'Notifications',   icon: '🔔' },
];

/* ═══════════════════════════════════════════════════════════
   Root component
═══════════════════════════════════════════════════════════ */
export default function StudentDashboard({ user, onLogout }) {
  const [activePage, setActivePage]   = useState('dashboard');

  /* ── Remote data ── */
  const [assignments, setAssignments]         = useState([]);
  const [loadingAssignments, setLoadingAssign] = useState(true);
  const [assignmentError, setAssignmentError]  = useState(null);

  const [tasks, setTasks]             = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [taskError, setTaskError]       = useState(null);

  /* ── UI state ── */
  const [expanded,      setExpanded]      = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen,     setNotifOpen]     = useState(false);
  const notifRef = useRef(null);

  /* ── Auth header ── */
 const token = user?.token ?? localStorage.getItem('access_token');
  const authHeaders = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  /* ── Fetch assignments ── */
  useEffect(() => {
    setLoadingAssign(true);
    setAssignmentError(null);
    fetch(`${API_BASE}/assignments/`, { headers: authHeaders })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => setAssignments(Array.isArray(data) ? data : (data.results ?? [])))
      .catch((err) => setAssignmentError(err.message))
      .finally(() => setLoadingAssign(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Fetch tasks ── */
  useEffect(() => {
    setLoadingTasks(true);
    setTaskError(null);
    fetch(`${API_BASE}/tasks/`, { headers: authHeaders })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => setTasks(Array.isArray(data) ? data : (data.results ?? [])))
      .catch((err) => setTaskError(err.message))
      .finally(() => setLoadingTasks(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Close notif panel on outside click ── */
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Helpers ── */
  const toggleExpand = (id) => setExpanded((prev) => (prev === id ? null : id));
  const markAllRead  = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  const unreadCount  = notifications.filter((n) => !n.read).length;

  /* ── Task CRUD ── */
  const createTask = async (taskData) => {
    const res  = await fetch(`${API_BASE}/tasks/`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(taskData),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const created = await res.json();
    setTasks((prev) => [created, ...prev]);
  };

  const updateTaskStatus = async (id, status) => {
    const res = await fetch(`${API_BASE}/tasks/${id}/`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const updated = await res.json();
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
  };

  const deleteTask = async (id) => {
    const res = await fetch(`${API_BASE}/tasks/${id}/`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  /* ── Stats (tasks only have status, not assignments) ── */
  const stats = {
    totalAssignments: assignments.length,
    totalTasks:       tasks.length,
    done:             tasks.filter((t) => t.status === 'done').length,
    inProcess:        tasks.filter((t) => t.status === 'in process').length,
    notDone:          tasks.filter((t) => t.status === 'not done').length,
  };

  const PAGE_TITLE = {
    dashboard:     { title: 'Dashboard',      sub: `Welcome back, ${user?.name?.split(' ')[0] ?? 'Student'}! 👋` },
    assignments:   { title: 'Assignments',    sub: 'View your programme assignments and deadlines' },
    tasks:         { title: 'My Tasks',       sub: 'Create and manage your personal tasks' },
    pomodoro:      { title: 'Pomodoro Timer', sub: 'Stay focused, study smarter' },
    notifications: { title: 'Notifications',  sub: 'Stay updated on deadlines' },
  };

  const { title, sub } = PAGE_TITLE[activePage];

  return (
    <div className="app-layout">
      {/* ─── Sidebar ─── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">📚</div>
          <div>
            <div className="logo-text">SAMS</div>
            <div className="logo-sub">Student Portal</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Menu</div>
          {NAV.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => setActivePage(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
              {item.id === 'notifications' && unreadCount > 0 && (
                <span style={{
                  marginLeft: 'auto', background: '#ef4444', color: '#fff',
                  borderRadius: '99px', fontSize: '10px', fontWeight: 700,
                  padding: '1px 6px',
                }}>{unreadCount}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">{user?.name?.[0] ?? 'S'}</div>
            <div>
              <div className="user-name">{user?.name?.split(' ')[0] ?? 'Student'}</div>
              <div className="user-role">Student</div>
            </div>
          </div>
          <button className="logout-btn" onClick={onLogout}>🚪 Log out</button>
        </div>
      </aside>

      {/* ─── Main ─── */}
      <div className="main-content">
        {/* Topbar */}
        <div className="topbar">
          <div className="topbar-title">
            <h2>{title}</h2>
            <p>{sub}</p>
          </div>

          <div className="topbar-right" ref={notifRef}>
            <button className="notif-btn" onClick={() => setNotifOpen((o) => !o)}>
              🔔
              {unreadCount > 0 && <span className="notif-dot" />}
            </button>

            {notifOpen && (
              <div className="notif-panel">
                <div className="notif-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Notifications</span>
                  <button
                    onClick={markAllRead}
                    style={{ fontSize: '11px', fontWeight: 600, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}
                  >Mark all read</button>
                </div>
                {notifications.length === 0 ? (
                  <div style={{ padding: '16px', fontSize: '13px', color: '#94a3b8', textAlign: 'center' }}>
                    No notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className={`notif-item ${!n.read ? 'unread' : ''}`}>
                      <span className="notif-icon">{n.icon}</span>
                      <div>
                        <div className="notif-msg">{n.msg}</div>
                        <div className="notif-time">{n.time}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Page Body */}
        <div className="page-body">
          {activePage === 'dashboard' && (
            <DashboardPage
              stats={stats}
              assignments={assignments}
              tasks={tasks}
              setActivePage={setActivePage}
              loadingAssignments={loadingAssignments}
            />
          )}

          {activePage === 'assignments' && (
            <AssignmentsPage
              assignments={assignments}
              expanded={expanded}
              toggleExpand={toggleExpand}
              loading={loadingAssignments}
              error={assignmentError}
            />
          )}

          {activePage === 'tasks' && (
            <TasksPage
              tasks={tasks}
              loading={loadingTasks}
              error={taskError}
              onCreateTask={createTask}
              onUpdateStatus={updateTaskStatus}
              onDeleteTask={deleteTask}
            />
          )}

          {activePage === 'pomodoro' && <PomodoroPage />}

          {activePage === 'notifications' && (
            <NotificationsPage notifications={notifications} markAllRead={markAllRead} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Dashboard page
══════════════════════════════════════════════════════════ */
function DashboardPage({ stats, assignments, tasks, setActivePage, loadingAssignments }) {
  /* Show the next 4 upcoming assignments (not yet past deadline) */
  const upcoming = [...assignments]
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .filter((a) => new Date(a.deadline) >= new Date())
    .slice(0, 4);

  return (
    <>
      {/* ── Stats grid ── */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">📋</div>
          <div>
            <div className="stat-num">{stats.totalAssignments}</div>
            <div className="stat-label">Assignments</div>
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

      {/* ── Task progress bar (only shown when there are tasks) ── */}
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

      {/* ── Upcoming assignment deadlines ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">📅 Upcoming Assignment Deadlines</span>
          <button className="btn btn-outline btn-sm" onClick={() => setActivePage('assignments')}>View All</button>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {loadingAssignments ? (
            <div className="empty-state"><p>Loading...</p></div>
          ) : upcoming.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎉</div>
              <p>No upcoming deadlines right now!</p>
            </div>
          ) : (
            upcoming.map((a) => {
              const dl = daysLeft(a.deadline);
              return (
                <div key={a.id} style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '14px 20px', borderBottom: '1px solid #f1f5f9',
                }}>
                  <span style={{ fontSize: '22px' }}>📌</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>{a.name}</div>
                    {a.description && (
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                        {a.description}
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
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{fmtDate(a.deadline)}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Quick link to My Tasks ── */}
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

/* ══════════════════════════════════════════════════════════
   Assignments page — READ ONLY
   Teachers create assignments; students can only VIEW them.
   Assignments have no status — just a name, description,
   and a deadline.
══════════════════════════════════════════════════════════ */
function AssignmentsPage({ assignments, expanded, toggleExpand, loading, error }) {
  /* Soonest deadline first; overdue ones sorted to the bottom */
  const [sortOverdue, setSortOverdue] = useState(false);

  const sorted = [...assignments].sort((a, b) => {
    const aOver = new Date(a.deadline) < new Date();
    const bOver = new Date(b.deadline) < new Date();
    if (sortOverdue) {
      if (aOver !== bOver) return aOver ? -1 : 1; // overdue first
    } else {
      if (aOver !== bOver) return aOver ? 1 : -1; // overdue last
    }
    return new Date(a.deadline) - new Date(b.deadline);
  });

  if (loading) {
    return (
      <div className="card">
        <div className="empty-state"><p>Loading assignments…</p></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-icon">⚠️</div>
          <p style={{ color: '#ef4444' }}>Could not load assignments: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Info banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        background: '#eff6ff', border: '1px solid #bfdbfe',
        borderRadius: '10px', padding: '10px 16px',
        marginBottom: '16px', fontSize: '13px', color: '#1e40af',
      }}>
        <span>ℹ️</span>
        <span>
          Assignments are set by your teacher and are <strong>read-only</strong>.
          To track your personal progress, use <strong>My Tasks</strong>.
        </span>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        <button
          className={`btn btn-sm ${!sortOverdue ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setSortOverdue(false)}
        >📅 Soonest first</button>
        <button
          className={`btn btn-sm ${sortOverdue ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setSortOverdue(true)}
        >⚠ Overdue first</button>
      </div>

      {sorted.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p>No assignments have been posted yet.</p>
          </div>
        </div>
      ) : (
        sorted.map((a) => {
          const isOpen  = expanded === a.id;
          const dl      = daysLeft(a.deadline);
          const overdue = dl === 'Overdue';

          return (
            <div
              key={a.id}
              className={`assignment-row ${isOpen ? 'expanded' : ''}`}
              onClick={() => toggleExpand(a.id)}
            >
              {/* ── Row header ── */}
              <div className="assignment-row-header">
                <span style={{ fontSize: '20px' }}>📌</span>

                <div style={{ flex: 1 }}>
                  <div className="assignment-title">{a.name}</div>
                  <div className="assignment-meta">
                    <span>📅 Deadline: {fmtDate(a.deadline)}</span>
                  </div>
                </div>

                {/* Deadline badge — the ONLY badge; no status badge */}
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

              {/* ── Expanded: description only ── */}
              {isOpen && (
                <div
                  className="assignment-subtasks"
                  onClick={(e) => e.stopPropagation()}
                >
                  {a.description ? (
                    <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>{a.description}</p>
                  ) : (
                    <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>
                      No description provided.
                    </p>
                  )}
                  <div style={{
                    marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9',
                    fontSize: '12px', color: '#94a3b8',
                  }}>
                    📅 Due: <strong>{fmtDate(a.deadline)}</strong>
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

/* ══════════════════════════════════════════════════════════
   My Tasks page — full CRUD + status
   Only personal tasks created by the student have status.
══════════════════════════════════════════════════════════ */
function TasksPage({ tasks, loading, error, onCreateTask, onUpdateStatus, onDeleteTask }) {
  const [filter,     setFilter]     = useState('all');
  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError,  setFormError]  = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const filtered =
    filter === 'all'
      ? tasks
      : tasks.filter((t) => t.status === filter);

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
    try {
      await onDeleteTask(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      {/* ── Top bar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            ['all',        'All'],
            ['not done',   'Not Done'],
            ['in process', 'In Process'],
            ['done',       'Done'],
          ].map(([v, l]) => (
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

      {/* ── Create form ── */}
      {showForm && (
        <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
          <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '12px' }}>➕ Create New Task</div>

          <input
            type="text"
            placeholder="Task name *"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            style={{
              width: '100%', padding: '9px 12px', borderRadius: '8px',
              border: `1.5px solid ${formError ? '#fca5a5' : '#e2e8f0'}`,
              fontSize: '14px', marginBottom: '10px',
              outline: 'none', boxSizing: 'border-box',
            }}
          />

          <textarea
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            style={{
              width: '100%', padding: '9px 12px', borderRadius: '8px',
              border: '1.5px solid #e2e8f0', fontSize: '14px',
              marginBottom: '10px', resize: 'vertical',
              outline: 'none', boxSizing: 'border-box',
            }}
          />

          {formError && (
            <div style={{ color: '#ef4444', fontSize: '12px', marginBottom: '8px' }}>{formError}</div>
          )}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => { setShowForm(false); setFormError(''); setForm({ name: '', description: '' }); }}
            >Cancel</button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleCreate}
              disabled={submitting}
            >
              {submitting ? 'Creating…' : 'Create Task'}
            </button>
          </div>
        </div>
      )}

      {/* ── Task list ── */}
      {loading ? (
        <div className="card"><div className="empty-state"><p>Loading your tasks…</p></div></div>
      ) : error ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">⚠️</div>
            <p style={{ color: '#ef4444' }}>Could not load tasks: {error}</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <p>
              {filter === 'all'
                ? 'No tasks yet. Hit "+ New Task" to create your first!'
                : `No tasks with status "${filter}".`}
            </p>
          </div>
        </div>
      ) : (
        filtered.map((t) => {
          const si      = statusInfo(t.status);
          const isDone  = t.status === 'done';
          const deleting = deletingId === t.id;

          return (
            <div
              key={t.id}
              className="assignment-row"
              style={{ marginBottom: '10px', opacity: deleting ? 0.5 : 1, transition: 'opacity 0.2s' }}
            >
              <div className="assignment-row-header" style={{ cursor: 'default' }}>
                <span style={{ fontSize: '20px' }}>🗒</span>

                <div style={{ flex: 1 }}>
                  <div
                    className="assignment-title"
                    style={{
                      textDecoration: isDone ? 'line-through' : 'none',
                      color:          isDone ? '#94a3b8'       : undefined,
                    }}
                  >
                    {t.name}
                  </div>
                  {t.description && (
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                      {t.description}
                    </div>
                  )}
                  <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '4px' }}>
                    Created {fmtDate(t.created_at)}
                  </div>
                </div>

                {/* Status dropdown — the ONLY interactive thing on a task */}
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <select
                    value={t.status}
                    onChange={(e) => onUpdateStatus(t.id, e.target.value)}
                    className={`badge ${si.cls}`}
                    style={{
                      border: 'none', cursor: 'pointer',
                      fontWeight: 700, fontSize: '12px',
                      borderRadius: '99px', padding: '4px 10px',
                      appearance: 'none', WebkitAppearance: 'none',
                    }}
                  >
                    {TASK_STATUS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => handleDelete(t.id)}
                    disabled={deleting}
                    title="Delete task"
                    style={{
                      background: 'none', border: 'none', cursor: deleting ? 'not-allowed' : 'pointer',
                      color: '#cbd5e1', fontSize: '16px', padding: '4px',
                      transition: 'color 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#cbd5e1')}
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

/* ══════════════════════════════════════════════════════════
   Pomodoro — unchanged
══════════════════════════════════════════════════════════ */
const WORK_SEC  = 25 * 60;
const BREAK_SEC =  5 * 60;

function PomodoroPage() {
  const [seconds,  setSeconds]  = useState(WORK_SEC);
  const [running,  setRunning]  = useState(false);
  const [mode,     setMode]     = useState('work');
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef(null);

  const total = mode === 'work' ? WORK_SEC : BREAK_SEC;
  const pct   = seconds / total;
  const r     = 90;
  const circ  = 2 * Math.PI * r;
  const dash  = circ * pct;

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            if (mode === 'work') {
              setSessions((c) => c + 1);
              setMode('break');
              return BREAK_SEC;
            } else {
              setMode('work');
              return WORK_SEC;
            }
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, mode]);

  const toggle     = () => setRunning((r) => !r);
  const reset      = () => { setRunning(false); clearInterval(intervalRef.current); setSeconds(mode === 'work' ? WORK_SEC : BREAK_SEC); };
  const switchMode = (m) => { setRunning(false); clearInterval(intervalRef.current); setMode(m); setSeconds(m === 'work' ? WORK_SEC : BREAK_SEC); };

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto' }}>
      <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '28px' }}>
          <button className={`btn btn-sm ${mode === 'work'  ? 'btn-primary' : 'btn-outline'}`} onClick={() => switchMode('work')}>🎯 Work (25m)</button>
          <button className={`btn btn-sm ${mode === 'break' ? 'btn-accent'  : 'btn-outline'}`} onClick={() => switchMode('break')}>☕ Break (5m)</button>
        </div>

        <div className={`pomodoro-ring ring-${mode}`} style={{ position: 'relative', width: 220, height: 220 }}>
          <svg className="ring-svg" width="220" height="220" viewBox="0 0 220 220">
            <circle className="ring-bg"       cx="110" cy="110" r={r} />
            <circle className="ring-progress" cx="110" cy="110" r={r}
              strokeDasharray={`${dash} ${circ}`} strokeDashoffset={0} />
          </svg>
          <div className="timer-display" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div className="timer-time">{mm}:{ss}</div>
            <div className="timer-mode">{mode === 'work' ? 'Focus' : 'Break'}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
          <button className="btn btn-outline" onClick={reset}>↺ Reset</button>
          <button className={`btn ${running ? 'btn-danger' : 'btn-primary'}`} style={{ minWidth: '100px' }} onClick={toggle}>
            {running ? '⏸ Pause' : '▶ Start'}
          </button>
        </div>

        <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Sessions Completed
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: i <= sessions ? '#1a2744' : '#e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
              }}>{i <= sessions ? '🍅' : ''}</div>
            ))}
          </div>
          {sessions >= 4 && (
            <div style={{ marginTop: '12px', fontSize: '13px', color: '#10b981', fontWeight: 700 }}>
              🎉 4 sessions done! Take a long break.
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: '16px', padding: '18px 20px' }}>
        <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '10px' }}>💡 Pomodoro Tips</div>
        {[
          'Work fully focused for 25 minutes, then take a 5-minute break.',
          'After 4 sessions, take a longer 15–30 minute break.',
          'Remove distractions — silence your phone during work sessions.',
          'Use breaks to stretch, hydrate, or rest your eyes.',
        ].map((tip, i) => (
          <div key={i} style={{ fontSize: '13px', color: '#64748b', padding: '5px 0', borderBottom: i < 3 ? '1px solid #f1f5f9' : 'none' }}>
            {i + 1}. {tip}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Notifications — unchanged
══════════════════════════════════════════════════════════ */
function NotificationsPage({ notifications, markAllRead }) {
  const unread = notifications.filter((n) => !n.read).length;
  return (
    <div style={{ maxWidth: '600px' }}>
      <div className="card">
        <div className="card-header">
          <span className="card-title">🔔 All Notifications</span>
          {unread > 0 && (
            <button className="btn btn-outline btn-sm" onClick={markAllRead}>Mark all as read</button>
          )}
        </div>
        {notifications.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🔕</div><p>No notifications yet.</p></div>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className={`notif-item ${!n.read ? 'unread' : ''}`} style={{ padding: '16px 20px' }}>
              <span className="notif-icon">{n.icon}</span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: n.read ? 500 : 700 }}>{n.msg}</div>
                <div className="notif-time">{n.time}</div>
              </div>
              {!n.read && (
                <span style={{
                  marginLeft: 'auto', width: '8px', height: '8px',
                  background: '#3b82f6', borderRadius: '50%', flexShrink: 0, alignSelf: 'center',
                }} />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
