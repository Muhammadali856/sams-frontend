import React, { useState, useEffect } from 'react';
import '../styles/global.css';

/**
 * LoginPage.jsx
 * Dual-role login screen (Student / Teacher).
 */

const DEMO_USERS = [
  { id: 's1', username: 'student1', password: 'pass123', role: 'student', name: 'Eshboev Muhammadali' },
  { id: 't1', username: 'teacher',  password: 'teach123', role: 'teacher', name: 'Mr. Nigel' },
];

export default function LoginPage({ onLogin }) {
  const [role, setRole] = useState('student');
  const [isSignUp, setIsSignUp] = useState(false);
  
  // States for the required JSON payload
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Programme Selection States
  const [availableProgrammes, setAvailableProgrammes] = useState([]);
  const [selectedProgrammes, setSelectedProgrammes] = useState([]);
  const [programmeModalOpen, setProgrammeModalOpen] = useState(false); // Controls the pop-up
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch programmes when the user opens the Sign Up form
  useEffect(() => {
    if (isSignUp && availableProgrammes.length === 0) {
      fetch('https://sams-backend-92kz.onrender.com/api/programmes/')
        .then(res => res.json())
        .then(data => {
          setAvailableProgrammes(Array.isArray(data) ? data : (data.results || []));
        })
        .catch(err => console.error("Failed to fetch programmes:", err));
    }
  }, [isSignUp, availableProgrammes.length]);

  const handleProgrammeToggle = (id) => {
    setSelectedProgrammes(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (isSignUp) {
      if (!username.trim() || !password.trim() || !firstName.trim() || !lastName.trim() || !email.trim()) {
        setError('Please fill out all required fields.');
        return;
      }
      if (selectedProgrammes.length === 0) {
        setError('Please select at least one programme.');
        return;
      }

      setLoading(true);
      try {
        const response = await fetch('https://sams-backend-92kz.onrender.com/api/auth/signup/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username,    
            student_id: username,  
            password: password,
            first_name: firstName,
            last_name: lastName,
            email: email,
            programme_ids: selectedProgrammes 
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.message || data.error || JSON.stringify(data));
        } else {
          setSuccessMsg('Account created successfully! Please log in.');
          setIsSignUp(false);
          setPassword(''); 
          setSelectedProgrammes([]);
        }
      } catch (err) {
        setError('Failed to connect to the server. Please try again.');
        console.error("Signup error:", err);
      } finally {
        setLoading(false);
      }

    } else {
      if (!username.trim() || !password.trim()) {
        setError('Please enter both your ID/Username and password.');
        return;
      }
      
      setLoading(true);
      try {
        const response = await fetch('https://sams-backend-92kz.onrender.com/api/auth/login/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username,    
            student_id: username,  
            password: password,
            role: role             
          }),
        });

        const data = await response.json();

        if (response.ok) {
          onLogin({ 
            id: data.user?.id || data.id || username, 
            name: data.user?.first_name || data.first_name || username, 
            role: role,
            token: data.token || data.access 
          });
        } else {
          setError(data.detail || data.error || data.message || 'Invalid credentials. Please try again.');
        }
      } catch (err) {
        setError('Failed to connect to the server. Please try again.');
        console.error("Login error:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const demoCredentials = role === 'student'
      ? [{ u: 'FIT2508130', p: 'samspass123', label: 'Student 1' }]
      : [{ u: 'nigelkoo', p: 'nigelkoopass123', label: 'Mr. Nigel' }];

  return (
    <div className="login-page">
      {/* ── Left Panel ── */}
      <div className="login-left">
        <div className="login-decor top-right" />
        <div className="login-decor bottom-left" />
        
        <div className="login-logo-box">
          <div className="login-logo-icon">📚</div>
          <div>
            <div className="login-logo-title">SAMS</div>
            <div className="login-logo-sub">Assignment Management</div>
          </div>
        </div>
        
        <div className="login-hero-text">
          <h1 className="login-hero-h1">Stay on top of every <span className="login-hero-accent">deadline</span></h1>
          <p className="login-hero-para">A centralized platform for educators and students to manage assignments, track progress, and never miss a due date.</p>
          <div className="login-chips">
            {['📅 Calendar View', '⏱ Pomodoro Timer', '🔔 Smart Reminders', '✅ Task Tracker'].map((c) => (
              <span key={c} className="login-chip">{c}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div className="login-right">
        <div className="card login-form-card" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
          <div className="login-form-head">
            <h2 className="login-form-h2">{isSignUp ? 'Create an Account' : 'Welcome back'}</h2>
            <p className="login-form-sub">{isSignUp ? 'Sign up to get started' : 'Sign in to your account to continue'}</p>
          </div>

          <div className="login-role-toggle">
            <button className={`login-role-btn ${role === 'student' ? 'active' : ''}`} onClick={() => { setRole('student'); setError(''); setSuccessMsg(''); }}>
              🎓 Student
            </button>
            <button className={`login-role-btn ${role === 'teacher' ? 'active' : ''}`} onClick={() => { setRole('teacher'); setIsSignUp(false); setError(''); setSuccessMsg(''); }}>
              👨‍🏫 Teacher
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {error && <div className="login-alert error">⚠️ {error}</div>}
            {successMsg && <div className="login-alert success">✅ {successMsg}</div>}

            {isSignUp && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input className="form-input" type="text" placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input className="form-input" type="text" placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" placeholder="john@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">Programme(s)</label>
                  <button 
                    type="button" 
                    className="form-input" 
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'left', background: '#fff' }}
                    onClick={() => setProgrammeModalOpen(true)}
                  >
                    <span style={{ color: selectedProgrammes.length > 0 ? '#1a2332' : '#94a3b8' }}>
                      {selectedProgrammes.length > 0 ? `${selectedProgrammes.length} programme(s) selected` : 'Choose programmes...'}
                    </span>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>▼</span>
                  </button>
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label">
                {role === 'student' ? 'Student ID' : 'Username'}
              </label>
              <input 
                className="form-input" 
                type="text" 
                placeholder={role === 'student' ? 'FIT2508123' : 'teacher'} 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                autoComplete="username" 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={isSignUp ? "new-password" : "current-password"} />
            </div>

            <button type="submit" className="btn btn-primary w-full" style={{ padding: '12px', marginTop: '10px' }} disabled={loading}>
              {loading ? (isSignUp ? 'Signing up…' : 'Signing in…') : (isSignUp ? 'Sign up' : `Sign in as ${role === 'student' ? 'Student' : 'Teacher'}`)}
            </button>
            
            {role === 'student' && (
              <div className="login-auth-toggle">
                {isSignUp ? "Already have an account? " : "Don't have an account? "}
                <span onClick={() => { setIsSignUp(!isSignUp); setError(''); setSuccessMsg(''); }}>
                  {isSignUp ? "Sign in" : "Sign up"}
                </span>
                
                {!isSignUp && (
                  <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '6px', textDecoration: 'none', cursor: 'default' }}>
                    (Only students)
                  </span>
                )}
              </div>
            )}
            {role === 'teacher' && (
              <div className="login-auth-toggle">
                Don't have an account?{" "}
                <span onClick={() => { 
                  window.location.href = "mailto:fit2508130@xmu.edu.my?subject=Teacher%20Account%20Request&body=Hello,%20I%20would%20like%20to%20request%20a%20teacher%20account."; 
                }}>
                  Ask admin.
                </span>
              </div>
            )}
          </form>

          {!isSignUp && (
            <div className="login-demo-box">
              <div className="login-demo-title">Demo Credentials</div>
              {demoCredentials.map((c) => (
                <div key={c.u} className="login-demo-row">
                  <span>👤 {c.label}</span>
                  <span style={{ fontFamily: 'monospace' }}>{c.u} / {c.p}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Programme Selection Modal ── */}
      {programmeModalOpen && (
        <div className="modal-overlay" onClick={() => setProgrammeModalOpen(false)} style={{ zIndex: 1000 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Select Programmes</h3>
              <button type="button" className="modal-close" onClick={() => setProgrammeModalOpen(false)}>✕</button>
            </div>
            
            <div className="modal-body" style={{ maxHeight: '300px', overflowY: 'auto', padding: '10px 24px' }}>
              {availableProgrammes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '14px' }}>
                  Loading programmes...
                </div>
              ) : (
                availableProgrammes.map((p) => (
                  <label key={p.id} style={{ 
                    display: 'flex', alignItems: 'center', gap: '12px', 
                    padding: '12px 0', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' 
                  }}>
                    <input 
                      type="checkbox" 
                      checked={selectedProgrammes.includes(p.id)}
                      onChange={() => handleProgrammeToggle(p.id)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#1a2332' }}>{p.name}</div>
                      {p.description && <div style={{ fontSize: '12px', color: '#94a3b8' }}>{p.description.substring(0, 50)}{p.description.length > 50 ? '...' : ''}</div>}
                    </div>
                  </label>
                ))
              )}
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <button 
                type="button" 
                className="btn btn-primary w-full" 
                onClick={() => setProgrammeModalOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}