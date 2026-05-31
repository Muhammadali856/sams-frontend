import React, { useState, useEffect, useRef } from 'react';
import '../styles/global.css';
import DashboardPage from './StudentDashboard Components/Dashboard';
import DeadlinesPage from './StudentDashboard Components/Deadlines';
import TasksPage from './StudentDashboard Components/Tasks';
import PomodoroPage from './StudentDashboard Components/Pomodoro';
import ProfileSettings from './StudentDashboard Components/ProfileSettings'; // NEW IMPORT

const API_BASE = import.meta.env?.VITE_API_BASE ?? 'https://sams-backend-92kz.onrender.com/api';  

/* ── Sidebar nav (Removed Programmes and Notifications) ── */
const NAV = [
  { id: 'dashboard',     label: 'Dashboard',      icon: '🏠' },
  { id: 'deadlines',     label: 'Deadlines',      icon: '📅' },
  { id: 'tasks',         label: 'My Tasks',       icon: '✅' },
  { id: 'pomodoro',      label: 'Pomodoro Timer', icon: '⏱'  },
];

export default function StudentDashboard({ user, onLogout }) {
  const [activePage, setActivePage] = useState('dashboard');

  const [assignments, setAssignments] = useState([]);
  const [quizzes, setQuizzes]         = useState([]);
  const [loadingDeadlines, setLoadingDeadlines] = useState(true);
  const [deadlineError, setDeadlineError]       = useState(null);

  const [tasks, setTasks]               = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [taskError, setTaskError]       = useState(null);

  const [expanded, setExpanded] = useState(null);

  const token = user?.token ?? localStorage.getItem('access_token');
  const authHeaders = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

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
  }, []); 

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
  }, []); 

  const allDeadlines = [
    ...assignments.map(a => ({ ...a, itemType: 'assignment' })),
    ...quizzes.map(q => ({ ...q, itemType: 'quiz' }))
  ];

  const toggleExpand = (id) => setExpanded((prev) => (prev === id ? null : id));

  const createTask = async (taskData) => {
    const res  = await fetch(`${API_BASE}/tasks/`, { method: 'POST', headers: authHeaders, body: JSON.stringify(taskData) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const created = await res.json();
    setTasks((prev) => [created, ...prev]);
  };

  const updateTaskStatus = async (id, status) => {
    const res = await fetch(`${API_BASE}/tasks/${id}/`, { method: 'PATCH', headers: authHeaders, body: JSON.stringify({ status }) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const updated = await res.json();
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
  };

  const deleteTask = async (id) => {
    const res = await fetch(`${API_BASE}/tasks/${id}/`, { method: 'DELETE', headers: authHeaders });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const stats = {
    totalDeadlines:   allDeadlines.length,
    totalTasks:       tasks.length,
    done:             tasks.filter((t) => t.status === 'done').length,
    inProcess:        tasks.filter((t) => t.status === 'in process').length,
    notDone:          tasks.filter((t) => t.status === 'not done').length,
  };

  const PAGE_TITLE = {
    dashboard:     { title: 'Dashboard',       sub: `Welcome back, ${user?.name?.split(' ')[0] ?? 'Student'}! 👋` },
    deadlines:     { title: 'Deadlines',       sub: 'View your upcoming quizzes and assignments' },
    tasks:         { title: 'My Tasks',        sub: 'Create and manage your personal tasks' },
    pomodoro:      { title: 'Pomodoro Timer',  sub: 'Stay focused, study smarter' },
    profile:       { title: 'Profile Settings', sub: 'Manage your personal details and subjects' }, // NEW PAGE TITLE
  };

  const { title, sub } = PAGE_TITLE[activePage] || PAGE_TITLE['dashboard'];

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
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="user-avatar">{user?.name?.[0] ?? 'S'}</div>
              <div>
                <div className="user-name">{user?.name?.split(' ')[0] ?? 'Student'}</div>
                <div className="user-role">Student</div>
              </div>
            </div>
            {/* NEW SETTINGS GEAR ICON */}
            <button 
              onClick={() => setActivePage('profile')}
              title="Profile Settings"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '18px', color: activePage === 'profile' ? 'var(--accent)' : 'rgba(255,255,255,0.4)',
                transition: 'color 0.2s', padding: '4px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
              onMouseLeave={(e) => e.currentTarget.style.color = activePage === 'profile' ? 'var(--accent)' : 'rgba(255,255,255,0.4)'}
            >
              ⚙️
            </button>
          </div>
          <button className="logout-btn" onClick={onLogout}>🚪 Log out</button>
        </div>
      </aside>

      {/* ─── Main Content ─── */}
      <div className="main-content">
        <div className="topbar">
          <div className="topbar-title">
            <h2>{title}</h2>
            <p>{sub}</p>
          </div>
          {/* Notifications removed from Topbar right */}
          <div className="topbar-right"></div>
        </div>

        <div className="page-body">
          {activePage === 'dashboard' && (
            <DashboardPage stats={stats} items={allDeadlines} tasks={tasks} setActivePage={setActivePage} loadingDeadlines={loadingDeadlines} />
          )}

          {activePage === 'deadlines' && (
            <DeadlinesPage items={allDeadlines} expanded={expanded} toggleExpand={toggleExpand} loading={loadingDeadlines} error={deadlineError} />
          )}

          {activePage === 'tasks' && (
            <TasksPage tasks={tasks} loading={loadingTasks} error={taskError} onCreateTask={createTask} onUpdateStatus={updateTaskStatus} onDeleteTask={deleteTask} />
          )}

          {activePage === 'pomodoro' && <PomodoroPage />}

          {/* NEW PROFILE COMPONENT */}
          {activePage === 'profile' && (
            <ProfileSettings user={user} authHeaders={authHeaders} />
          )}
        </div>
      </div>
    </div>
  );
}