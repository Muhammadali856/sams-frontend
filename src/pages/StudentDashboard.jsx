import React, { useState, useEffect, useRef } from 'react';
import '../styles/global.css';
import DashboardPage from './StudentDashboard Components/Dashboard';
import DeadlinesPage from './StudentDashboard Components/Deadlines';
import TasksPage from './StudentDashboard Components/Tasks';
import ProgrammesPage from './StudentDashboard Components/Programmes';
import PomodoroPage from './StudentDashboard Components/Pomodoro';
import NotificationsPage from './StudentDashboard Components/Notifications';


const API_BASE = import.meta.env?.VITE_API_BASE ?? 'https://sams-backend-92kz.onrender.com/api';  

/* ── Helpers ─────────────────────────────────────────────── */
const fmtDate = (d) => {
  if (!d) return 'No date';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const daysLeft = (d) => {
  if (!d) return 'No date';
  const diff = Math.ceil((new Date(d) - new Date()) / 86_400_000);
  if (diff < 0)  return 'Overdue';
  if (diff === 0) return 'Due today';
  return `${diff}d left`;
};

/* Status options only apply to Tasks, NOT Assignments/Quizzes */
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
  { id: 'deadlines',     label: 'Deadlines',      icon: '📅' }, // Renamed from Assignments
  { id: 'tasks',         label: 'My Tasks',        icon: '✅' },
  { id: 'programmes',    label: 'Programmes',      icon: '🎓' },
  { id: 'pomodoro',      label: 'Pomodoro Timer',  icon: '⏱'  },
  { id: 'notifications', label: 'Notifications',   icon: '🔔' },
];

/* ═══════════════════════════════════════════════════════════
   Root component
═══════════════════════════════════════════════════════════ */
export default function StudentDashboard({ user, onLogout }) {
  const [activePage, setActivePage] = useState('dashboard');

  /* ── Remote data ── */
  const [assignments, setAssignments] = useState([]);
  const [quizzes, setQuizzes]         = useState([]);
  const [loadingDeadlines, setLoadingDeadlines] = useState(true);
  const [deadlineError, setDeadlineError]       = useState(null);

  const [tasks, setTasks]               = useState([]);
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

  /* ── Fetch Deadlines (Assignments + Quizzes) ── */
  useEffect(() => {
    setLoadingDeadlines(true);
    setDeadlineError(null);
    
    Promise.all([
      fetch(`${API_BASE}/assignments/`, { headers: authHeaders }),
      fetch(`${API_BASE}/quizzes/`, { headers: authHeaders })
    ])
    .then(async ([assignRes, quizRes]) => {
      if (!assignRes.ok || !quizRes.ok) throw new Error(`HTTP Error fetching deadlines`);
      const assignData = await assignRes.json();
      const quizData = await quizRes.json();

      setAssignments(Array.isArray(assignData) ? assignData : (assignData.results ?? []));
      setQuizzes(Array.isArray(quizData) ? quizData : (quizData.results ?? []));
    })
    .catch((err) => setDeadlineError(err.message))
    .finally(() => setLoadingDeadlines(false));
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

  /* ── Combine and format deadlines ── */
  const allDeadlines = [
    ...assignments.map(a => ({ ...a, itemType: 'assignment' })),
    ...quizzes.map(q => ({ ...q, itemType: 'quiz' }))
  ];

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

  /* ── Stats ── */
  const stats = {
    totalDeadlines:   allDeadlines.length,
    totalTasks:       tasks.length,
    done:             tasks.filter((t) => t.status === 'done').length,
    inProcess:        tasks.filter((t) => t.status === 'in process').length,
    notDone:          tasks.filter((t) => t.status === 'not done').length,
  };

  const PAGE_TITLE = {
    dashboard:     { title: 'Dashboard',      sub: `Welcome back, ${user?.name?.split(' ')[0] ?? 'Student'}! 👋` },
    deadlines:     { title: 'Deadlines',      sub: 'View your upcoming quizzes and assignments' },
    tasks:         { title: 'My Tasks',       sub: 'Create and manage your personal tasks' },
    programmes:    { title: 'My Programmes',  sub: 'Manage your enrolled programmes for the semester' },
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
              items={allDeadlines}
              tasks={tasks}
              setActivePage={setActivePage}
              loadingDeadlines={loadingDeadlines}
            />
          )}

          {activePage === 'deadlines' && (
            <DeadlinesPage
              items={allDeadlines}
              expanded={expanded}
              toggleExpand={toggleExpand}
              loading={loadingDeadlines}
              error={deadlineError}
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

          {activePage === 'programmes' && (
            <ProgrammesPage user={user} authHeaders={authHeaders} />
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

