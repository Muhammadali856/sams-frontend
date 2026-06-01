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
      setAllSubjects(Array.isArray(subjectsData) ? subjectsData : (subjectsData.results ?? []));
      setProfileData(profileJson);
    })
    .catch((err) => setError(err.message))
    .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProfileData();
  }, [authHeaders, user.user_id]);

  const handleEnrollSubmit = async () => {
    if (!enrollKey.trim()) {
      setMsg({ type: 'error', text: 'Please enter the enrollment key.' });
      return;
    }
    
    setIsEnrolling(true);
    setMsg(null);
    
    try {
      const res = await fetch(`${API_BASE}/subjects/${enrollTarget.id}/enroll/`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ enrollment_key: enrollKey }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail || `Failed to enroll.`);
      
      setMsg({ type: 'success', text: `Successfully enrolled in ${enrollTarget.name}! 🎉` });
      setEnrollTarget(null);
      setEnrollKey('');
      fetchProfileData(); // Refresh the list to show the new subject
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setIsEnrolling(false);
    }
  };

  if (loading) return <div className="card"><div className="empty-state"><p>Loading profile...</p></div></div>;
  if (error) return <div className="card"><div className="empty-state"><div className="empty-icon">⚠️</div><p style={{ color: '#ef4444' }}>{error}</p></div></div>;

  const enrolledIds = profileData?.subjects || [];

  return (
    <div style={{ maxWidth: '800px' }}>
      
      {/* Read-Only Profile Details */}
      <div className="card mb-6">
        <div className="card-header">
          <span className="card-title">👤 Personal Details</span>
        </div>
        <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <div className="form-label">Full Name</div>
            <div style={{ fontSize: '15px', fontWeight: 700 }}>
              {profileData?.first_name} {profileData?.last_name}
            </div>
          </div>
          <div>
            <div className="form-label">Student ID</div>
            <div style={{ fontSize: '15px', fontFamily: 'monospace' }}>
              {studentId}
            </div>
          </div>
        </div>
      </div>

      {msg && <div className={`login-alert ${msg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: '16px' }}>{msg.text}</div>}

      {/* Available Subjects List */}
      <div className="card mb-6">
        <div className="card-header">
          <span className="card-title">📚 Course Registration</span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: enrolledIds.length >= 6 ? 'var(--danger)' : 'var(--text-light)' }}>
            {enrolledIds.length} / 6 Enrolled
          </span>
        </div>
        
        <div style={{ padding: '12px 20px', background: '#eff6ff', borderBottom: '1px solid #bfdbfe', fontSize: '13px', color: '#1e40af' }}>
          To enroll in a new subject, click <strong>Enroll</strong> and enter the secret key provided by your teacher.
        </div>

        <div className="card-body" style={{ padding: '12px' }}>
          {allSubjects.length === 0 ? (
            <div className="empty-state"><p>No subjects are currently open for registration.</p></div>
          ) : (
            allSubjects.map((subject) => {
              const isEnrolled = enrolledIds.includes(subject.id);
              return (
                <div key={subject.id} className="assignment-row" style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px', padding: '14px 16px' }}>
                  <div style={{ flex: 1 }}>
                    <div className="assignment-title" style={{ color: 'var(--text-dark)' }}>
                      {subject.name}
                    </div>
                    {subject.description && (
                      <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '2px' }}>
                        {subject.description}
                      </div>
                    )}
                  </div>
                  
                  {isEnrolled ? (
                    <span style={{ background: '#d1fae5', color: '#065f46', padding: '6px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: 700 }}>
                      ✅ Enrolled
                    </span>
                  ) : (
                    <button 
                      className="btn btn-outline btn-sm" 
                      onClick={() => { setEnrollTarget(subject); setEnrollKey(''); setMsg(null); }}
                      disabled={enrolledIds.length >= 6}
                    >
                      🔐 Enroll
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Enrollment Security Modal */}
      {enrollTarget && (
        <div className="modal-overlay" onClick={() => setEnrollTarget(null)}>
          <div className="modal" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
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