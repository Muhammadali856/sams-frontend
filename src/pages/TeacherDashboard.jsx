import React, { useState, useEffect } from 'react';
import '../styles/global.css';

/**
 * TeacherDashboard.jsx
 * Features:
 * - 401 Unauthorized Auto-Redirect
 * - Dynamic Subjects Dropdown
 * - Full CRUD for assignments, subjects, and quizzes
 * - Student details modal (Real API)
 * - Unified Assignment/Quiz modal and timeline
 */

const API_BASE = import.meta.env?.VITE_API_BASE ?? 'https://sams-backend-92kz.onrender.com/api';

const EMPTY_FORM = {
  itemType: 'assignment', // 'assignment' | 'quiz'
  name: '', 
  subject: '', 
  deadline: '', 
  description: '', 
};

/* ── Helpers ────────────────────────────────────────────── */
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const daysLeft = (d) => {
  if (!d) return { label: 'No date', color: '#94a3b8' };
  const diff = Math.ceil((new Date(d) - new Date()) / 86400000);
  if (diff < 0) return { label: 'Overdue',   color: '#ef4444' };
  if (diff === 0) return { label: 'Due today', color: '#f59e0b' };
  if (diff <= 3)  return { label: `${diff}d left`, color: '#f59e0b' };
  return { label: `${diff}d left`, color: '#10b981' };
};

/* ── Sidebar nav ─────────────────────────────────────────── */
const NAV = [
  { id: 'dashboard',   label: 'Dashboard',    icon: '🏠' },
  { id: 'assignments', label: 'Assignments',  icon: '📋' },
  { id: 'quizzes',     label: 'Quizzes',      icon: '📝' },
  { id: 'subjects',    label: 'Subjects',     icon: '🏫' },
  { id: 'students',    label: 'Students',     icon: '🎓' },
];

/* ═══════════════════════════════════════════════════════════ */
export default function TeacherDashboard({ user, onLogout }) {
  const [activePage,   setActivePage]   = useState('dashboard');
  
  // Real API States
  const [assignments,  setAssignments]  = useState([]);
  const [quizzes,      setQuizzes]      = useState([]);
  const [subjects,     setSubjects]     = useState([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [apiError,     setApiError]     = useState('');

  const [modalOpen,    setModalOpen]    = useState(false);
  const [editTarget,   setEditTarget]   = useState(null); 
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [formError,    setFormError]    = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [deleteConfirm,setDeleteConfirm]= useState(null); 
  const [isDeleting,   setIsDeleting]   = useState(false);
  const [search,       setSearch]       = useState('');

  // Auth Headers
  const token = user?.token ?? localStorage.getItem('access_token');
  const authHeaders = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // Unified Fetch Function
  const fetchDashboardData = async () => {
    setIsLoading(true);
    setApiError('');
    try {
      const [assignRes, subjRes, quizRes] = await Promise.all([
        fetch(`${API_BASE}/assignments/`, { headers: authHeaders }),
        fetch(`${API_BASE}/subjects/`, { headers: authHeaders }),
        fetch(`${API_BASE}/quizzes/`, { headers: authHeaders })
      ]);

      if (assignRes.status === 401 || subjRes.status === 401 || quizRes.status === 401) {
        onLogout(); 
        return;
      }

      if (!assignRes.ok || !subjRes.ok || !quizRes.ok) throw new Error('Failed to fetch dashboard data');

      const assignData = await assignRes.json();
      const subjData = await subjRes.json();
      const quizData = await quizRes.json();

      setAssignments(Array.isArray(assignData) ? assignData : (assignData.results || []));
      setSubjects(Array.isArray(subjData) ? subjData : (subjData.results || []));
      setQuizzes(Array.isArray(quizData) ? quizData : (quizData.results || []));
    } catch (err) {
      setApiError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Modal helpers ── */
  const openAdd = (type = 'assignment') => {
    setForm({ ...EMPTY_FORM, itemType: type });
    setEditTarget(null);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (item, type = 'assignment') => {
    setForm({ 
      itemType: type,
      name: item.name || item.title || '', 
      deadline: item.deadline ? item.deadline.split('T')[0] : '', 
      description: item.description || '', 
      subject: item.subject || '' 
    });
    setEditTarget(item.id);
    setFormError('');
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setFormError(''); };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const validateForm = () => {
    if (!form.name.trim())        return `${form.itemType === 'quiz' ? 'Quiz' : 'Assignment'} Name is required.`;
    if (!form.subject)            return 'Subject is required.';
    if (!form.deadline)           return 'Deadline is required.';
    if (!form.description.trim()) return 'Description is required.';
    return '';
  };

  const handleSubmit = async () => {
    const err = validateForm();
    if (err) { setFormError(err); return; }

    setIsSubmitting(true);
    setFormError('');

    const baseUrl = form.itemType === 'quiz' ? `${API_BASE}/quizzes` : `${API_BASE}/assignments`;
    const url = editTarget ? `${baseUrl}/${editTarget}/` : `${baseUrl}/`;
    const method = editTarget ? 'PATCH' : 'POST';

    const payload = {
      name: form.name,
      deadline: form.deadline,
      description: form.description,
      subject: form.subject ? parseInt(form.subject, 10) : null
    };

    try {
      const response = await fetch(url, {
        method: method,
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      if (response.status === 401) return onLogout();

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.detail || JSON.stringify(errorData));
      }

      fetchDashboardData(); 
      closeModal();
    } catch (error) {
      setFormError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    
    setIsDeleting(true);
    const { id, type } = deleteConfirm;
    const baseUrl = type === 'quiz' ? `${API_BASE}/quizzes` : `${API_BASE}/assignments`;

    try {
      const response = await fetch(`${baseUrl}/${id}/`, {
        method: 'DELETE',
        headers: authHeaders,
      });

      if (response.status === 401) return onLogout();
      if (!response.ok) throw new Error(`Failed to delete ${type}`);

      if (type === 'quiz') {
        setQuizzes((prev) => prev.filter((q) => q.id !== id));
      } else {
        setAssignments((prev) => prev.filter((a) => a.id !== id));
      }
      
      setDeleteConfirm(null);
    } catch (error) {
      alert(error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  /* ── Filtered lists ── */
  const filteredAssignments = assignments.filter((a) => {
    const name = a.name || a.title || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const filteredQuizzes = quizzes.filter((q) => {
    const name = q.name || q.title || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  /* ── Stats ── */
  const stats = {
    totalAssignments: assignments.length,
    totalQuizzes: quizzes.length,
  };

  const PAGE_TITLE = {
    dashboard:   { title: 'Dashboard',     sub: `Good day, ${user.name}! 👋` },
    assignments: { title: 'Assignments',   sub: 'Create and manage academic tasks' },
    quizzes:     { title: 'Quizzes',       sub: 'Create and manage upcoming quizzes' },
    subjects:    { title: 'Subjects',      sub: 'Manage academic subjects' },
    students:    { title: 'Students',      sub: 'View enrolled students' },
  };
  const { title, sub } = PAGE_TITLE[activePage];

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">📚</div>
          <div>
            <div className="logo-text">SAMS</div>
            <div className="logo-sub">Teacher Portal</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section-label">Menu</div>
          {NAV.map((item) => (
            <button key={item.id} className={`nav-item ${activePage === item.id ? 'active' : ''}`} onClick={() => setActivePage(item.id)}>
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar" style={{ background: '#10b981' }}>{user.name[0]}</div>
            <div>
              <div className="user-name">{user.name}</div>
              <div className="user-role">Teacher</div>
            </div>
          </div>
          <button className="logout-btn" onClick={onLogout}>🚪 Log out</button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        <div className="topbar">
          <div className="topbar-title">
            <h2>{title}</h2>
            <p>{sub}</p>
          </div>
          {activePage === 'assignments' && <button className="btn btn-accent" onClick={() => openAdd('assignment')}>+ New Assignment</button>}
          {activePage === 'quizzes' && <button className="btn btn-accent" onClick={() => openAdd('quiz')}>+ New Quiz</button>}
        </div>

        {apiError && (
          <div style={{ padding: '15px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '20px' }}>
            ⚠️ Error loading data: {apiError}
          </div>
        )}

        <div className="page-body">
          {activePage === 'dashboard'   && <TeacherDashboardPage stats={stats} assignments={assignments} quizzes={quizzes} subjects={subjects} setActivePage={setActivePage} openAdd={openAdd} isLoading={isLoading} />}
          {activePage === 'assignments' && <TasksListPage type="assignment" items={filteredAssignments} subjects={subjects} search={search} setSearch={setSearch} openEdit={(item) => openEdit(item, 'assignment')} setDeleteConfirm={setDeleteConfirm} isLoading={isLoading} />}
          {activePage === 'quizzes'     && <TasksListPage type="quiz" items={filteredQuizzes} subjects={subjects} search={search} setSearch={setSearch} openEdit={(item) => openEdit(item, 'quiz')} setDeleteConfirm={setDeleteConfirm} isLoading={isLoading} />}
          {activePage === 'subjects'    && <SubjectsPage authHeaders={authHeaders} subjects={subjects} isLoading={isLoading} refreshData={fetchDashboardData} onLogout={onLogout} />}
          {activePage === 'students'    && <StudentsPage authHeaders={authHeaders} onLogout={onLogout} />}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editTarget ? '✏️ Edit ' : '➕ New '} 
                {form.itemType === 'quiz' ? 'Quiz' : 'Assignment'}
              </h3>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              {formError && <div className="login-alert error">⚠️ {formError}</div>}
              
              {/* Type Toggle (Only editable when creating new) */}
              <div className="form-group" style={{ display: editTarget ? 'none' : 'block' }}>
                <div style={{ display: 'flex', gap: '10px', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
                  <button 
                    className={`btn w-full ${form.itemType === 'assignment' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setForm({...form, itemType: 'assignment'})}
                    style={{ border: 'none' }}
                  >📋 Assignment</button>
                  <button 
                    className={`btn w-full ${form.itemType === 'quiz' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setForm({...form, itemType: 'quiz'})}
                    style={{ border: 'none' }}
                  >📝 Quiz</button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{form.itemType === 'quiz' ? 'Quiz Name *' : 'Assignment Name *'}</label>
                <input className="form-input" name="name" placeholder={`e.g. Physics ${form.itemType === 'quiz' ? 'Test' : 'Homework'}`} value={form.name} onChange={handleFormChange} disabled={isSubmitting} />
              </div>
              <div className="form-group">
                <label className="form-label">Deadline *</label>
                <input className="form-input" type="date" name="deadline" value={form.deadline} onChange={handleFormChange} disabled={isSubmitting} />
              </div>
              <div className="form-group">
                <label className="form-label">Subject *</label>
                <select className="form-select" name="subject" value={form.subject} onChange={handleFormChange} disabled={isSubmitting}>
                  <option value="">Select subject…</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Description *</label>
                <textarea className="form-textarea" name="description" placeholder={`${form.itemType === 'quiz' ? 'Quiz' : 'Assignment'} details...`} value={form.description} onChange={handleFormChange} disabled={isSubmitting} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={closeModal} disabled={isSubmitting}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : (editTarget ? '💾 Save Changes' : `✅ Create ${form.itemType === 'quiz' ? 'Quiz' : 'Assignment'}`)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm !== null && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">🗑️ Delete {deleteConfirm.type === 'quiz' ? 'Quiz' : 'Assignment'}</h3></div>
            <div className="modal-body">
              <p>Are you sure you want to delete this {deleteConfirm.type}?</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : '🗑️ Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Dashboard Page ── */
function TeacherDashboardPage({ stats, assignments, quizzes, subjects, setActivePage, openAdd, isLoading }) {
  const allItems = [
    ...assignments.map(a => ({ ...a, itemType: 'assignment' })),
    ...quizzes.map(q => ({ ...q, itemType: 'quiz' }))
  ].sort((a, b) => new Date(a.deadline || 0) - new Date(b.deadline || 0));

  const upcoming = allItems.filter(item => new Date(item.deadline) >= new Date()).slice(0, 5);

  return (
    <>
      <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="stat-card">
          <div className="stat-icon blue">📋</div>
          <div><div className="stat-num">{stats.totalAssignments}</div><div className="stat-label">Total Assignments</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon info" style={{ background: 'var(--info-bg, #e0f2fe)' }}>📝</div>
          <div><div className="stat-num">{stats.totalQuizzes}</div><div className="stat-label">Total Quizzes</div></div>
        </div>
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-title">⏰ Upcoming Deadlines</span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {isLoading ? <div className="empty-state">Loading...</div> : upcoming.length === 0 ? <div className="empty-state">No upcoming deadlines.</div> : upcoming.map((item) => {
              const dl = daysLeft(item.deadline);
              const subjName = subjects.find(s => s.id === item.subject)?.name || 'All Subjects';
              const isQuiz = item.itemType === 'quiz';
              
              return (
                <div key={`${item.itemType}-${item.id}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '18px' }}>{isQuiz ? '📝' : '📌'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {item.name}
                      <span className={`badge ${isQuiz ? 'badge-quiz' : 'badge-assign'}`} style={{ fontSize: '9px', padding: '2px 6px' }}>
                        {isQuiz ? 'Quiz' : 'Assignment'}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{subjName}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: dl.color }}>{dl.label}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{fmtDate(item.deadline)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">⚡ Quick Actions</span></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[{ icon: '➕', label: 'Post New Assignment', action: () => openAdd('assignment') },
              { icon: '📝', label: 'Post New Quiz', action: () => openAdd('quiz') },
              { icon: '🏫', label: 'Manage Subjects', action: () => setActivePage('subjects') },
              { icon: '🎓', label: 'View Students', action: () => setActivePage('students') }
            ].map((qa) => (
              <button key={qa.label} onClick={qa.action} className="btn btn-outline w-full" style={{ justifyContent: 'flex-start', padding: '12px 14px' }}>
                <span style={{ fontSize: '20px' }}>{qa.icon}</span> {qa.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Generic Tasks List Page ── */
function TasksListPage({ type, items, subjects, search, setSearch, openEdit, setDeleteConfirm, isLoading }) {
  const isQuiz = type === 'quiz';
  return (
    <>
      <div style={{ marginBottom: '18px' }}>
        <input className="form-input" placeholder={`🔍 Search ${isQuiz ? 'quizzes' : 'assignments'}…`} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Deadline</th><th>Subject</th><th>Days Left</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={5} className="empty-state">Loading {isQuiz ? 'quizzes' : 'assignments'}...</td></tr> : items.length === 0 ? <tr><td colSpan={5} className="empty-state">No {isQuiz ? 'quizzes' : 'assignments'} found.</td></tr> : items.map((item) => {
                const dl = daysLeft(item.deadline);
                const subjName = subjects.find(s => s.id === item.subject)?.name || 'All Subjects';
                return (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {item.name}
                        <span className={`badge ${isQuiz ? 'badge-quiz' : 'badge-assign'}`} style={{ fontSize: '9px', padding: '2px 6px' }}>
                          {isQuiz ? 'Quiz' : 'Assignment'}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>{item.description?.slice(0, 50)}...</div>
                    </td>
                    <td style={{ fontSize: '13px', fontWeight: 600 }}>{fmtDate(item.deadline)}</td>
                    <td><span className="badge badge-todo">{subjName}</span></td>
                    <td><span style={{ fontWeight: 700, color: dl.color, fontSize: '13px' }}>{dl.label}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(item)}>✏️ Edit</button>
                      <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#991b1b', border: 'none', marginLeft: '6px' }} onClick={() => setDeleteConfirm({ id: item.id, type: type })}>🗑️</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ── Students Management ── */
function StudentsPage({ authHeaders, onLogout }) {
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/students/`, { headers: authHeaders })
      .then(async (res) => {
        if (res.status === 401) return onLogout();
        if (!res.ok) {
           const errorData = await res.json().catch(() => ({}));
           throw new Error(errorData.detail || errorData.message || `HTTP ${res.status}`);
        }
        const data = await res.json();
        setStudents(Array.isArray(data) ? data : (data.results || []));
      })
      .catch((err) => setApiError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <>
      <div className="card">
        <div className="card-header"><span className="card-title">🎓 Enrolled Students</span> <span className="badge badge-todo">{students.length} students</span></div>
        {apiError && <div style={{ padding: '15px', color: '#991b1b' }}>⚠️ Error: {apiError}</div>}
        <div className="table-wrap">
          <table>
            <thead><tr><th>#</th><th>First Name</th><th>Student ID</th><th style={{ textAlign: 'center' }}>Details</th></tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={4} className="empty-state">Loading...</td></tr> : students.map((s, i) => (
                <tr key={s.id}>
                  <td style={{ color: '#94a3b8', fontWeight: 600 }}>{i + 1}</td>
                  <td><span style={{ fontWeight: 700 }}>{s.user?.first_name || 'Unknown'}</span></td>
                  <td style={{ fontFamily: 'monospace' }}>{s.user?.username || 'N/A'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => setSelectedStudent(s)}>👁️ View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {selectedStudent && (
        <div className="modal-overlay" onClick={() => setSelectedStudent(null)}>
          <div className="modal" style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">🎓 Student Details</h3>
              <button className="modal-close" onClick={() => setSelectedStudent(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div><div className="form-label">Full Name</div><div style={{ fontSize: '16px', fontWeight: 700 }}>{selectedStudent.user?.first_name} {selectedStudent.user?.last_name}</div></div>
              <div><div className="form-label">Email Address</div><div>{selectedStudent.user?.email}</div></div>
              <div><div className="form-label">Student ID</div><div style={{ fontFamily: 'monospace' }}>{selectedStudent.user?.username}</div></div>
              <div>
                <div className="form-label">Enrolled Subjects</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {selectedStudent.subject_names?.map((name, idx) => (
                    <span key={idx} className="badge badge-process">{name}</span>
                  )) || <span style={{ color: '#94a3b8' }}>None</span>}
                </div>
              </div>
              <div><div className="form-label">Status</div><span className={`badge ${selectedStudent.is_active ? 'badge-done' : 'badge-todo'}`}>{selectedStudent.is_active ? 'Active' : 'Inactive'}</span></div>
            </div>
            <div className="modal-footer"><button className="btn btn-primary" onClick={() => setSelectedStudent(null)}>Close</button></div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Subjects Management ── */
function SubjectsPage({ authHeaders, subjects, isLoading, refreshData, onLogout }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const openAdd = () => { setForm({ name: '', description: '' }); setEditTarget(null); setModalOpen(true); };
  const openEdit = (subj) => { setForm({ name: subj.name || '', description: subj.description || '' }); setEditTarget(subj.id); setModalOpen(true); };

  const handleSubmit = async () => {
    if (!form.name.trim()) return alert("Subject name is required.");
    setIsSubmitting(true);
    const url = editTarget ? `${API_BASE}/subjects/${editTarget}/` : `${API_BASE}/subjects/`;
    try {
      const response = await fetch(url, {
        method: editTarget ? 'PATCH' : 'POST',
        headers: authHeaders,
        body: JSON.stringify(form),
      });
      if (response.status === 401) return onLogout();
      if (!response.ok) throw new Error('Failed to save subject');
      refreshData();
      setModalOpen(false);
    } catch (error) { alert(error.message); } finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/subjects/${id}/`, { method: 'DELETE', headers: authHeaders });
      if (response.status === 401) return onLogout();
      if (!response.ok) throw new Error('Failed to delete subject');
      refreshData();
      setDeleteConfirm(null);
    } catch (error) { alert(error.message); }
  };

  return (
    <>
      <div className="card">
        <div className="card-header"><span className="card-title">🏫 Subjects</span> <button className="btn btn-accent btn-sm" onClick={openAdd}>+ New Subject</button></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Description</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={3} className="empty-state">Loading...</td></tr> : subjects.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 700 }}>{s.name}</td>
                  <td>{s.description || 'No description'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(s)}>✏️ Edit</button>
                    <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#991b1b', border: 'none', marginLeft: '6px' }} onClick={() => setDeleteConfirm(s.id)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">{editTarget ? '✏️ Edit' : '➕ Add'} Subject</h3></div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting ? 'Saving...' : '💾 Save'}</button>
            </div>
          </div>
        </div>
      )}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">🗑️ Delete Subject</h3></div>
            <div className="modal-body"><p>Are you sure? This may affect student enrollments.</p></div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={() => setDeleteConfirm(null)}>Cancel</button><button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>🗑️ Delete</button></div>
          </div>
        </div>
      )}
    </>
  );
}