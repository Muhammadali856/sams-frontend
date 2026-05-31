import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env?.VITE_API_BASE ?? 'https://sams-backend-92kz.onrender.com/api';

export default function ProfileSettings({ user, authHeaders }) {
  const [profileData, setProfileData] = useState(null);
  const [allSubjects, setAllSubjects] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);

  // Fallback if studentId is missing from the login payload
  const studentId = user?.studentId || 'UNKNOWN';

  useEffect(() => {
    setLoading(true);
    
    // Fetch both the master list of subjects AND the student's specific profile
    Promise.all([
      fetch(`${API_BASE}/subjects/`, { headers: authHeaders }),
      fetch(`${API_BASE}/auth/profile/${user.user_id}/`, { headers: authHeaders })
    ])
    .then(async ([subjectsRes, profileRes]) => {
      if (!subjectsRes.ok || !profileRes.ok) throw new Error('Failed to load profile data. Ensure your Student ID is correct.');
      
      const subjectsData = await subjectsRes.json();
      const profileJson = await profileRes.json();

      setAllSubjects(Array.isArray(subjectsData) ? subjectsData : (subjectsData.results ?? []));
      setProfileData(profileJson);
      setSelectedIds(profileJson.subjects || []);
    })
    .catch((err) => setError(err.message))
    .finally(() => setLoading(false));
  }, [authHeaders, user.user_id, studentId]);

  const toggleSelect = (subjectId) => {
    setSelectedIds((prev) => {
      if (prev.includes(subjectId)) return prev.filter((id) => id !== subjectId);
      if (prev.length >= 6) {
        setMsg({ type: 'error', text: 'You can only select a maximum of 6 subjects.' });
        return prev;
      }
      setMsg(null);
      return [...prev, subjectId];
    });
  };

  const handleSave = async () => {
    if (selectedIds.length === 0 || selectedIds.length > 6) {
      setMsg({ type: 'error', text: 'Must select between 1 and 6 subjects.' });
      return;
    }
    
    setSaving(true);
    setMsg(null);
    
    try {
      const res = await fetch(`${API_BASE}/auth/profile/${user.user_id}/`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ subject_ids: selectedIds }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail || `Failed with status ${res.status}`);
      
      setMsg({ type: 'success', text: 'Profile and subjects updated successfully!' });
      
      // Update local profile data state with the new names if returned by backend
      if (data.profile && data.profile.subject_names) {
        setProfileData(prev => ({ ...prev, subject_names: data.profile.subject_names }));
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="card"><div className="empty-state"><p>Loading profile...</p></div></div>;
  if (error) return <div className="card"><div className="empty-state"><div className="empty-icon">⚠️</div><p style={{ color: '#ef4444' }}>{error}</p></div></div>;

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
          <div style={{ gridColumn: 'span 2' }}>
            <div className="form-label">Email Address</div>
            <div style={{ fontSize: '15px' }}>{profileData?.email || 'No email provided'}</div>
          </div>
        </div>
      </div>

      {msg && <div className={`login-alert ${msg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: '16px' }}>{msg.text}</div>}

      {/* Subject Selection */}
      <div className="card mb-6">
        <div className="card-header">
          <span className="card-title">📚 Enrolled Subjects</span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: selectedIds.length > 6 ? 'var(--danger)' : 'var(--text-light)' }}>
            {selectedIds.length} / 6 Selected
          </span>
        </div>
        
        <div style={{ padding: '12px 20px', background: '#eff6ff', borderBottom: '1px solid #bfdbfe', fontSize: '13px', color: '#1e40af' }}>
          Select up to <strong>6 subjects</strong> for your current semester.
        </div>

        <div className="card-body" style={{ padding: '12px' }}>
          {allSubjects.length === 0 ? (
            <div className="empty-state"><p>No subjects available to select.</p></div>
          ) : (
            allSubjects.map((subject) => {
              const isSelected = selectedIds.includes(subject.id);
              return (
                <div
                  key={subject.id}
                  className="assignment-row"
                  onClick={() => toggleSelect(subject.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                    background: isSelected ? '#f8fafc' : 'var(--white)',
                    marginBottom: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <div className={`subtask-check ${isSelected ? 'checked' : ''}`}>
                    {isSelected && <span style={{ color: '#fff', fontSize: '12px', fontWeight: 800 }}>✓</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="assignment-title" style={{ color: isSelected ? 'var(--primary)' : 'var(--text-dark)' }}>
                      {subject.name}
                    </div>
                    {subject.description && (
                      <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '2px' }}>
                        {subject.description}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving || selectedIds.length === 0 || selectedIds.length > 6}>
          {saving ? 'Saving...' : '💾 Save Profile'}
        </button>
      </div>
    </div>
  );
}