import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env?.VITE_API_BASE ?? 'https://sams-backend-92kz.onrender.com/api';

export default function ProfileSettings({ user, authHeaders }) {
  const [profileData, setProfileData] = useState(null);
  const [allSubjects, setAllSubjects] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);

  // Enrollment Modal States
  const [enrollTarget, setEnrollTarget] = useState(null);
  const [enrollKey, setEnrollKey] = useState('');
  const [isEnrolling, setIsEnrolling] = useState(false);
  
  // NEW: Change Password States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState(null);
  const [pwdSuccess, setPwdSuccess] = useState(null);

  const studentId = user?.studentId || 'UNKNOWN';

  const fetchProfileData = () => {
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/subjects/`, { headers: authHeaders }),
      fetch(`${API_BASE}/auth/profile/${user.user_id}/`, { headers: authHeaders })
    ])
    .then(async ([subjectsRes, profileRes]) => {
      if (!subjectsRes.ok || !profileRes.ok) throw new Error('Failed to load profile data.');
      const subjectsData = await subjectsRes.json();
      const profileJson = await profileRes.json();
      setAllSubjects(subjectsData);
      setProfileData(profileJson);
      setLoading(false);
    })
    .catch(err => {
      setError(err.message);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const handleEnrollSubmit = async () => {
    if (!enrollKey.trim()) return;
    setIsEnrolling(true);
    setError(null);
    setMsg(null);

    try {
      const response = await fetch(`${API_BASE}/subjects/${enrollTarget.id}/enroll/`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollment_key: enrollKey })
      });

      const data = await response.json();
      if (response.ok) {
        setMsg(`Successfully enrolled in ${enrollTarget.name}!`);
        setEnrollTarget(null);
        setEnrollKey('');
        fetchProfileData(); // Refresh the list
      } else {
        alert(data.error || 'Failed to enroll.');
      }
    } catch (err) {
      alert('Network error during enrollment.');
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleDropSubject = async (subjectId) => {
    if (!window.confirm("Are you sure you want to drop this subject?")) return;
    
    const currentSubjectIds = profileData.subjects.filter(id => id !== subjectId);
    
    try {
      const response = await fetch(`${API_BASE}/auth/profile/${user.user_id}/`, {
        method: 'PATCH',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject_ids: currentSubjectIds })
      });
      if (response.ok) {
        fetchProfileData();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to drop subject.");
      }
    } catch (err) {
      alert("Network error.");
    }
  };

  // NEW: Handle Password Change logic
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(null);

    if (newPassword !== confirmPassword) {
      setPwdError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setPwdError("Password must be at least 8 characters long.");
      return;
    }

    setPwdLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/change-password/`, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ new_password: newPassword })
      });

      const data = await response.json();
      if (response.ok) {
        setPwdSuccess("Your password has been updated successfully!");
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPwdError(data.new_password?.[0] || data.error || "Failed to update password.");
      }
    } catch (err) {
      setPwdError("Network error. Please try again.");
    } finally {
      setPwdLoading(false);
    }
  };

  if (loading) return <div className="card"><div className="empty-state"><p>Loading profile data…</p></div></div>;
  if (error) return <div className="card"><div className="empty-state"><div className="empty-icon">⚠️</div><p style={{ color: '#ef4444' }}>{error}</p></div></div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {msg && (
        <div style={{ background: '#ecfdf5', color: '#065f46', padding: '12px 16px', borderRadius: '8px', border: '1px solid #a7f3d0', fontWeight: 600, fontSize: '14px' }}>
          ✅ {msg}
        </div>
      )}

      {/* ─── 1. Personal Details Card ─── */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">👤 Personal Details</h3>
        </div>
        <div className="card-body">
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '14px', fontWeight: 600 }}>
                {profileData.first_name} {profileData.last_name || ''}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Campus ID</label>
              <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '14px', fontWeight: 600 }}>
                {studentId}
              </div>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Registered Email</label>
              <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '14px', fontWeight: 600 }}>
                {profileData.email}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── NEW: Security Settings Card ─── */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">🔐 Security Settings</h3>
        </div>
        <div className="card-body">
          <form onSubmit={handlePasswordChange}>
            {pwdError && <div style={{ marginBottom: '16px', padding: '10px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }}>⚠️ {pwdError}</div>}
            {pwdSuccess && <div style={{ marginBottom: '16px', padding: '10px', background: '#ecfdf5', color: '#065f46', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }}>✅ {pwdSuccess}</div>}
            
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="Min. 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="submit" className="btn btn-primary" disabled={pwdLoading || !newPassword}>
                {pwdLoading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ─── 2. Academic Programmes Card ─── */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📚 Academic Programmes</h3>
          <span style={{ fontSize: '12px', fontWeight: 700, color: profileData.subjects.length >= 6 ? '#ef4444' : '#64748b' }}>
            {profileData.subjects.length} / 6 Enrolled
          </span>
        </div>
        <div className="card-body">
          <div style={{ marginBottom: '20px' }}>
            {profileData.subjects.length === 0 ? (
               <div style={{ padding: '20px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>
                 You are not enrolled in any subjects yet.
               </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {profileData.subjects.map((subId, index) => {
                  const subjectName = profileData.subject_names[index];
                  return (
                    <div key={subId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary)' }}>{subjectName}</span>
                      <button 
                        onClick={() => handleDropSubject(subId)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', fontWeight: 700, cursor: 'pointer', padding: '4px 8px', borderRadius: '4px' }}
                        onMouseEnter={(e) => e.target.style.background = '#fee2e2'}
                        onMouseLeave={(e) => e.target.style.background = 'none'}
                      >
                        Drop
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <h4 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '12px' }}>Available Subjects</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {allSubjects.filter(s => !profileData.subjects.includes(s.id)).map(sub => (
              <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--white)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-dark)' }}>{sub.name}</div>
                  {sub.description && <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '2px' }}>{sub.description}</div>}
                </div>
                <button 
                  className="btn btn-outline btn-sm"
                  onClick={() => setEnrollTarget(sub)}
                  disabled={profileData.subjects.length >= 6}
                >
                  Enroll
                </button>
              </div>
            ))}
            {allSubjects.filter(s => !profileData.subjects.includes(s.id)).length === 0 && (
              <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>No more subjects available.</div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Enrollment Key Modal ─── */}
      {enrollTarget && (
        <div className="modal-overlay" onClick={() => setEnrollTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">🔐 Enter Enrollment Key</h3>
              <button className="modal-close" onClick={() => setEnrollTarget(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '13px', color: 'var(--text-mid)', marginBottom: '16px' }}>
                You are attempting to enroll in <strong>{enrollTarget.name}</strong>. Please enter the secret key provided by your teacher.
              </p>
              <div className="form-group">
                <label className="form-label">Enrollment Key</label>
                <input 
                  className="form-input" 
                  type="text"
                  placeholder="Paste your key here..."
                  value={enrollKey} 
                  onChange={(e) => setEnrollKey(e.target.value)} 
                  disabled={isEnrolling}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setEnrollTarget(null)} disabled={isEnrolling}>Cancel</button>
              <button className="btn btn-primary" onClick={handleEnrollSubmit} disabled={isEnrolling || !enrollKey.trim()}>
                {isEnrolling ? 'Verifying...' : 'Verify & Enroll'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}