import React, { useState, useEffect } from 'react';

export default function ProgrammesPage({ user, authHeaders }) {
  const [allProgrammes, setAllProgrammes] = useState([]);
  const [selectedIds, setSelectedIds] = useState(user?.programme_ids || []);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState(null);
  const [msg, setMsg]           = useState(null); 

  useEffect(() => {
    fetch(`${API_BASE}/programmes/`, { headers: authHeaders })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setAllProgrammes(Array.isArray(data) ? data : (data.results ?? []));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [authHeaders]);

  const toggleSelect = (progId) => {
    setSelectedIds((prev) => {
      if (prev.includes(progId)) return prev.filter((id) => id !== progId);
      if (prev.length >= 6) {
        setMsg({ type: 'error', text: 'You can only select a maximum of 6 programmes.' });
        return prev;
      }
      setMsg(null);
      return [...prev, progId];
    });
  };

  const handleSave = async () => {
    if (selectedIds.length === 0 || selectedIds.length > 6) {
      setMsg({ type: 'error', text: 'Must select between 1 and 6 programmes.' });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`${API_BASE}/auth/update-programmes/`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ programme_ids: selectedIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed with status ${res.status}`);
      setMsg({ type: 'success', text: data.message || 'Programmes updated successfully!' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="card"><div className="empty-state"><p>Loading available programmes…</p></div></div>;
  if (error) return <div className="card"><div className="empty-state"><div className="empty-icon">⚠️</div><p style={{ color: '#ef4444' }}>Could not load programmes: {error}</p></div></div>;

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        background: '#eff6ff', border: '1px solid #bfdbfe',
        borderRadius: '10px', padding: '10px 16px',
        marginBottom: '16px', fontSize: '13px', color: '#1e40af',
      }}>
        <span>ℹ️</span>
        <span>Select up to <strong>6 programmes</strong> for your current semester. Changes will be saved to your profile.</span>
      </div>

      {msg && <div className={`login-alert ${msg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: '16px' }}>{msg.text}</div>}

      <div className="card mb-6">
        <div className="card-header">
          <span className="card-title">Available Programmes</span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: selectedIds.length > 6 ? 'var(--danger)' : 'var(--text-light)' }}>
            {selectedIds.length} / 6 Selected
          </span>
        </div>
        <div className="card-body" style={{ padding: '12px' }}>
          {allProgrammes.length === 0 ? (
            <div className="empty-state"><p>No programmes available to select.</p></div>
          ) : (
            allProgrammes.map((prog) => {
              const isSelected = selectedIds.includes(prog.id);
              return (
                <div
                  key={prog.id}
                  className="assignment-row"
                  onClick={() => toggleSelect(prog.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                    background: isSelected ? '#f8fafc' : 'var(--white)',
                    marginBottom: '8px'
                  }}
                >
                  <div className={`subtask-check ${isSelected ? 'checked' : ''}`}>
                    {isSelected && <span style={{ color: '#fff', fontSize: '12px', fontWeight: 800 }}>✓</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="assignment-title" style={{ color: isSelected ? 'var(--primary)' : 'var(--text-dark)' }}>{prog.name}</div>
                    {prog.description && <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '2px' }}>{prog.description}</div>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving || selectedIds.length === 0 || selectedIds.length > 6}>
          {saving ? 'Saving...' : '💾 Save Programmes'}
        </button>
      </div>
    </div>
  );
}