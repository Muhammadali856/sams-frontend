import React, { useState, useEffect } from 'react';
import '../styles/global.css';

/**
 * TeacherDashboard.jsx
 * Features:
 * - 401 Unauthorized Auto-Redirect
 * - Dynamic Programmes Dropdown
 * - Full CRUD for assignments & programmes
 * - Student details modal (Real API)
 * - Removed: Subjects, Exams, and Quizzes logic
 */

const API_BASE = import.meta.env?.VITE_API_BASE ?? 'https://sams-backend-92kz.onrender.com/api';

const EMPTY_FORM = {
  name: '', 
  programme: '', 
  deadline: '', 
  description: '', 
};

/* ── Helpers ────────────────────────────────────────────── */
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const daysLeft = (d) => {
  const diff = Math.ceil((new Date(d) - new Date()) / 86400000);
  if (diff < 0) return { label: 'Overdue',   color: '#ef4444' };
  if (diff === 0) return { label: 'Due today', color: '#f59e0b' };
  if (diff <= 3)  return { label: `${diff}d left`, color: '#f59e0b' };
  return { label: `${diff}d left`, color: '#10b981' };
};

/* ── Sidebar nav ─────────────────────────────────────────── */
const NAV = [
  { id: 'dashboard',   label: 'Dashboard',    icon: '🏠' },
  { id: 'assignments', label: 'Assignments',   icon: '📋' },
  { id: 'programmes',  label: 'Programmes',    icon: '🏫' },
  { id: 'students',    label: 'Students',      icon: '🎓' },
];

/* ═══════════════════════════════════════════════════════════ */
export default function TeacherDashboard({ user, onLogout }) {
  const [activePage,   setActivePage]   = useState('dashboard');
  
  // Real API States
  const [assignments,  setAssignments]  = useState([]);
  const [programmes,   setProgrammes]   = useState([]);
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
      const [assignRes, progRes] = await Promise.all([
        fetch(`${API_BASE}/assignments/`, { headers: authHeaders }),
        fetch(`${API_BASE}/programmes/`, { headers: authHeaders })
      ]);

      if (assignRes.status === 401 || progRes.status === 401) {
        onLogout(); 
        return;
      }

      if (!assignRes.ok || !progRes.ok) throw new Error('Failed to fetch dashboard data');

      const assignData = await assignRes.json();
      const progData = await progRes.json();

      setAssignments(Array.isArray(assignData) ? assignData : (assignData.results || []));
      setProgrammes(Array.isArray(progData) ? progData : (progData.results || []));
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
  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditTarget(null);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (a) => {
    setForm({ 
      name: a.name || a.title || '', 
      deadline: a.deadline ? a.deadline.split('T')[0] : '', 
      description: a.description || '', 
      programme: a.programme || '' 
    });
    setEditTarget(a.id);
    setFormError('');
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setFormError(''); };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const validateForm = () => {
    if (!form.name.trim())        return 'Assignment Name is required.';
    if (!form.programme)          return 'Programme is required.';
    if (!form.deadline)           return 'Deadline is required.';
    if (!form.description.trim()) return 'Description is required.';
    return '';
  };

  const handleSubmit = async () => {
    const err = validateForm();
    if (err) { setFormError(err); return; }

    setIsSubmitting(true);
    setFormError('');

    const url = editTarget ? `${API_BASE}/assignments/${editTarget}/` : `${API_BASE}/assignments/`;
    const method = editTarget ? 'PATCH' : 'POST';

    const payload = {
      ...form,
      programme: form.programme ? parseInt(form.programme) : null
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

  const handleDelete = async (id) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`${API_BASE}/assignments/${id}/`, {
        method: 'DELETE',
        headers: authHeaders,
      });

      if (response.status === 401) return onLogout();
      if (!response.ok) throw new Error('Failed to delete assignment');

      setAssignments((prev) => prev.filter((a) => a.id !== id));
      setDeleteConfirm(null);
    } catch (error) {
      alert(error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  /* ── Filtered list ── */
  const filtered = assignments.filter((a) => {
    const aName = a.name || a.title || '';
    return aName.toLowerCase().includes(search.toLowerCase());
  });

  /* ── Stats ── */
  const stats = {
    total: assignments.length,
  };

  const PAGE_TITLE = {
    dashboard:   { title: 'Dashboard',     sub: `Good day, ${user.name}! 👋` },
    assignments: { title: 'Assignments',   sub: 'Create and manage academic tasks' },
    programmes:  { title: 'Programmes',    sub: 'Manage academic programmes' },
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
          {activePage === 'assignments' && <button className="btn btn-accent" onClick={openAdd}>+ New Assignment</button>}
        </div>

        {apiError && (
          <div style={{ padding: '15px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '20px' }}>
            ⚠️ Error loading data: {apiError}
          </div>
        )}

        <div className="page-body">
          {activePage === 'dashboard'   && <TeacherDashboardPage stats={stats} assignments={assignments} programmes={programmes} setActivePage={setActivePage} openAdd={openAdd} isLoading={isLoading} />}
          {activePage === 'assignments' && <AssignmentsPage assignments={filtered} programmes={programmes} search={search} setSearch={setSearch} openEdit={openEdit} setDeleteConfirm={setDeleteConfirm} openAdd={openAdd} isLoading={isLoading} />}
          {activePage === 'programmes'  && <ProgrammesPage authHeaders={authHeaders} programmes={programmes} isLoading={isLoading} refreshData={fetchDashboardData} onLogout={onLogout} />}
          {activePage === 'students'    && <StudentsPage authHeaders={authHeaders} onLogout={onLogout} />}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editTarget ? '✏️ Edit Assignment' : '➕ New Assignment'}</h3>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              {formError && <div className="login-alert error">⚠️ {formError}</div>}
              <div className="form-group">
                <label className="form-label">Assignment Name *</label>
                <input className="form-input" name="name" placeholder="e.g. Physics Homework" value={form.name} onChange={handleFormChange} disabled={isSubmitting} />
              </div>
              <div className="form-group">
                <label className="form-label">Deadline *</label>
                <input className="form-input" type="date" name="deadline" value={form.deadline} onChange={handleFormChange} disabled={isSubmitting} />
              </div>
              <div className="form-group">
                <label className="form-label">Programme *</label>
                <select className="form-select" name="programme" value={form.programme} onChange={handleFormChange} disabled={isSubmitting}>
                  <option value="">Select programme…</option>
                  {programmes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Description *</label>
                <textarea className="form-textarea" name="description" placeholder="Assignment details..." value={form.description} onChange={handleFormChange} disabled={isSubmitting} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={closeModal} disabled={isSubmitting}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : (editTarget ? '💾 Save Changes' : '✅ Create Assignment')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm !== null && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">🗑️ Delete Assignment</h3></div>
            <div className="modal-body">
              <p>Are you sure you want to delete <strong>"{assignments.find(a => a.id === deleteConfirm)?.name}"</strong>?</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)} disabled={isDeleting}>
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
function TeacherDashboardPage({ stats, assignments, programmes, setActivePage, openAdd, isLoading }) {
  const upcoming = [...assignments].sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 5);
  return (
    <>
      <div className="stats-grid" style={{ gridTemplateColumns: '1fr' }}>
        <div className="stat-card">
          <div className="stat-icon blue">📋</div>
          <div><div className="stat-num">{stats.total}</div><div className="stat-label">Total Assignments Posted</div></div>
        </div>
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-title">⏰ Upcoming Deadlines</span>
            <button className="btn btn-outline btn-sm" onClick={() => setActivePage('assignments')}>View All</button>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {isLoading ? <div className="empty-state">Loading...</div> : upcoming.length === 0 ? <div className="empty-state">No assignments posted.</div> : upcoming.map((a) => {
              const dl = daysLeft(a.deadline);
              const progName = programmes.find(p => p.id === a.programme)?.name || 'All Programmes';
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '18px' }}>📌</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '13px' }}>{a.name}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{progName}</div>
                    {/* Fixed: Show description summary */}
                    <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '2px' }}>{a.description?.slice(0, 40)}...</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: dl.color }}>{dl.label}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{fmtDate(a.deadline)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">⚡ Quick Actions</span></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[{ icon: '➕', label: 'Post New Assignment', action: openAdd },
              { icon: '📋', label: 'Manage Assignments', action: () => setActivePage('assignments') },
              { icon: '🏫', label: 'Manage Programmes', action: () => setActivePage('programmes') },
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

/* ── Assignments Page ── */
function AssignmentsPage({ assignments, programmes, search, setSearch, openEdit, setDeleteConfirm, openAdd, isLoading }) {
  return (
    <>
      <div style={{ marginBottom: '18px' }}>
        <input className="form-input" placeholder="🔍 Search assignments…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Deadline</th><th>Programme</th><th>Days Left</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={5} className="empty-state">Loading assignments...</td></tr> : assignments.length === 0 ? <tr><td colSpan={5} className="empty-state">No assignments found.</td></tr> : assignments.map((a) => {
                const dl = daysLeft(a.deadline);
                const progName = programmes.find(p => p.id === a.programme)?.name || 'All Programmes';
                return (
                  <tr key={a.id}>
                    <td><div style={{ fontWeight: 700 }}>{a.name}</div><div style={{ fontSize: '12px', color: '#94a3b8' }}>{a.description?.slice(0, 50)}...</div></td>
                    <td style={{ fontSize: '13px', fontWeight: 600 }}>{fmtDate(a.deadline)}</td>
                    <td><span className="badge badge-todo">{progName}</span></td>
                    <td><span style={{ fontWeight: 700, color: dl.color, fontSize: '13px' }}>{dl.label}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(a)}>✏️ Edit</button>
                      <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#991b1b', border: 'none', marginLeft: '6px' }} onClick={() => setDeleteConfirm(a.id)}>🗑️</button>
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
                <div className="form-label">Enrolled Programmes</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {selectedStudent.programme_names?.map((name, idx) => (
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

/* ── Programmes Management ── */
function ProgrammesPage({ authHeaders, programmes, isLoading, refreshData, onLogout }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const openAdd = () => { setForm({ name: '', description: '' }); setEditTarget(null); setModalOpen(true); };
  const openEdit = (prog) => { setForm({ name: prog.name || '', description: prog.description || '' }); setEditTarget(prog.id); setModalOpen(true); };

  const handleSubmit = async () => {
    if (!form.name.trim()) return alert("Programme name is required.");
    setIsSubmitting(true);
    const url = editTarget ? `${API_BASE}/programmes/${editTarget}/` : `${API_BASE}/programmes/`;
    try {
      const response = await fetch(url, {
        method: editTarget ? 'PATCH' : 'POST',
        headers: authHeaders,
        body: JSON.stringify(form),
      });
      if (response.status === 401) return onLogout();
      if (!response.ok) throw new Error('Failed to save programme');
      refreshData();
      setModalOpen(false);
    } catch (error) { alert(error.message); } finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/programmes/${id}/`, { method: 'DELETE', headers: authHeaders });
      if (response.status === 401) return onLogout();
      if (!response.ok) throw new Error('Failed to delete programme');
      refreshData();
      setDeleteConfirm(null);
    } catch (error) { alert(error.message); }
  };

  return (
    <>
      <div className="card">
        <div className="card-header"><span className="card-title">🏫 Programmes</span> <button className="btn btn-accent btn-sm" onClick={openAdd}>+ New Programme</button></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Description</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={3} className="empty-state">Loading...</td></tr> : programmes.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 700 }}>{p.name}</td>
                  {/* Fixed: Displays the description */}
                  <td>{p.description || 'No description'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(p)}>✏️ Edit</button>
                    <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#991b1b', border: 'none', marginLeft: '6px' }} onClick={() => setDeleteConfirm(p.id)}>🗑️</button>
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
            <div className="modal-header"><h3 className="modal-title">{editTarget ? '✏️ Edit' : '➕ Add'} Programme</h3></div>
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
            <div className="modal-header"><h3 className="modal-title">🗑️ Delete Programme</h3></div>
            <div className="modal-body"><p>Are you sure? This may affect student enrollments.</p></div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={() => setDeleteConfirm(null)}>Cancel</button><button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>🗑️ Delete</button></div>
          </div>
        </div>
      )}
    </>
  );
}