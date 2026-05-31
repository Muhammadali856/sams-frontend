import React, { useState } from 'react';
import '../styles/global.css'; 

const API_BASE = import.meta.env?.VITE_API_BASE ?? 'https://sams-backend-92kz.onrender.com/api';

export default function LoginPage({ onLoginSuccess }) {
  const [role, setRole] = useState('student');
  const [step, setStep] = useState('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // NEW: State to track if it's their first time
  const [isFirstTime, setIsFirstTime] = useState(false);

  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [showStudentPassword, setShowStudentPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [tempUserId, setTempUserId] = useState(null);

  const [teacherUsername, setTeacherUsername] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');

  const handleStudentLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Only send the full name if they are in "First Time" mode
    const payload = {
      student_id: studentId.toUpperCase(), 
      password: studentPassword 
    };
    if (isFirstTime) {
      payload.full_name = fullName.toUpperCase();
    }

    try {
      const response = await fetch(`${API_BASE}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('access_token', data.access);
        setTempUserId(data.user_id); 

        // Backend will tell us if they need to change password (which triggers for first-timers)
        if (data.require_password_change) {
           setStep('changePassword'); 
        } else {
           onLoginSuccess({ 
             name: data.username, // Using the backend's username as fallback
             token: data.access, 
             role: 'student',
             studentId: payload.student_id,
             user_id: data.user_id 
           }); 
        }
      } else {
        // Smart UX: If they forgot to click "First time", do it for them automatically!
        if (data.first_time_required) {
          setIsFirstTime(true);
        }
        setError(data.detail || "Invalid student credentials.");
      }
    } catch (error) {
      console.error("🚨 THE REAL ERROR IS:", error); 
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    const token = localStorage.getItem('access_token');

    try {
      const response = await fetch(`${API_BASE}/auth/change-password/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ new_password: newPassword }),
      });

      if (response.ok) {
        alert("Password updated! Welcome to SAMS. 🎉");
        onLoginSuccess({ 
          name: fullName.toUpperCase(), 
          token: token, 
          role: 'student',
          studentId: studentId.toUpperCase(),
          user_id: tempUserId
        });
      } else {
        const errorData = await response.json();
        setError(errorData.new_password?.[0] || "Failed to change password.");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTeacherLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: teacherUsername, 
          password: teacherPassword 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('access_token', data.access);
        onLoginSuccess({ 
          name: teacherUsername,
          token: data.access, 
          role: 'teacher',
          user_id: data.user_id 
        });
      } else {
        setError(data.detail || "Invalid teacher credentials.");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-left hide-mobile">
        <div className="login-decor top-right"></div>
        <div className="login-decor bottom-left"></div>
        
        <div className="login-logo-box">
          <div className="login-logo-icon">📚</div>
          <div>
            <div className="login-logo-title">SAMS</div>
            <div className="login-logo-sub">Portal Integration</div>
          </div>
        </div>

        <div className="login-hero-text">
          <h1 className="login-hero-h1">Welcome <span className="login-hero-accent">Back</span></h1>
          <p className="login-hero-para">
            Log in to access your dashboard, view upcoming deadlines, and manage your academic programmes.
          </p>
        </div>
      </div>

      <div className="login-right">
        <div className="login-form-card">
          
          <div className="login-form-head">
            <h2 className="login-form-h2">
              {step === 'login' ? 'Sign In' : 'Set New Password'}
            </h2>
            <p className="login-form-sub">
              {step === 'changePassword' 
                ? 'For security, please set a new password for your account before entering the dashboard.'
                : 'Enter your details to continue.'}
            </p>
          </div>

          {error && <div className="login-alert error">⚠️ {error}</div>}

          {step === 'login' && (
            <div className="login-role-toggle">
              <button 
                className={`login-role-btn ${role === 'student' ? 'active' : ''}`}
                onClick={() => { setRole('student'); setError(''); setIsFirstTime(false); }}
              >
                🎓 Student
              </button>
              <button 
                className={`login-role-btn ${role === 'teacher' ? 'active' : ''}`}
                onClick={() => { setRole('teacher'); setError(''); }}
              >
                🏫 Teacher
              </button>
            </div>
          )}

          {role === 'teacher' && step === 'login' && (
            <form onSubmit={handleTeacherLogin}>
              <div className="form-group">
                <label className="form-label">Username / Email</label>
                <input 
                  className="form-input" 
                  type="text" 
                  placeholder="Enter teacher ID"
                  value={teacherUsername} 
                  onChange={(e) => setTeacherUsername(e.target.value)} 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input 
                  className="form-input" 
                  type="password" 
                  placeholder="Enter password"
                  value={teacherPassword} 
                  onChange={(e) => setTeacherPassword(e.target.value)} 
                  required 
                />
              </div>

              <button type="submit" className="btn btn-primary w-full" disabled={isLoading}>
                {isLoading ? 'Logging in...' : 'Teacher Log In'}
              </button>
            </form>
          )}

          {role === 'student' && step === 'login' && (
            <form onSubmit={handleStudentLogin}>
              
              {/* Only show Full Name if it is their first time */}
              {isFirstTime && (
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input 
                    className="form-input" 
                    type="text" 
                    placeholder="e.g. Ali Bin Ahmad"
                    value={fullName} 
                    onChange={(e) => setFullName(e.target.value)} 
                    required={isFirstTime} 
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Student ID</label>
                <input 
                  className="form-input" 
                  type="text" 
                  placeholder="e.g. S123456"
                  value={studentId} 
                  onChange={(e) => setStudentId(e.target.value)} 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    className="form-input" 
                    type={showStudentPassword ? "text" : "password"} 
                    placeholder={isFirstTime ? "Enter your default password" : "Enter your password"}
                    value={studentPassword} 
                    onChange={(e) => setStudentPassword(e.target.value)} 
                    required 
                    style={{ paddingRight: '45px' }}
                  />

                  <button
                    type="button"
                    onClick={() => setShowStudentPassword(!showStudentPassword)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    {showStudentPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C7 20 2.73 16.11 1 12c1-2.3 2.7-4.3 4.86-5.73M9.9 4.24A10.94 10.94 0 0 1 12 4c5 0 9.27 3.89 11 8a11.05 11.05 0 0 1-2.17 3.19M1 1l22 22"/></svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-full" disabled={isLoading}>
                {isLoading ? 'Logging in...' : (isFirstTime ? 'Verify Identity' : 'Student Log In')}
              </button>

              {/* The First Time Button Toggle */}
              {!isFirstTime && (
                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <button 
                    type="button" 
                    onClick={() => { setIsFirstTime(true); setError(''); }}
                    style={{ background: 'none', border: 'none', color: '#1e40af', textDecoration: 'underline', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
                  >
                    First time logging in?
                  </button>
                </div>
              )}
              {isFirstTime && (
                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <button 
                    type="button" 
                    onClick={() => { setIsFirstTime(false); setError(''); }}
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '13px' }}
                  >
                    ← Back to standard login
                  </button>
                </div>
              )}
            </form>
          )}

          {role === 'student' && step === 'changePassword' && (
            <form onSubmit={handleChangePasswordSubmit}>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input 
                  className="form-input" 
                  type="password" 
                  placeholder="Type a secure new password"
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  required 
                />
              </div>

              <button type="submit" className="btn btn-primary w-full" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Password & Enter'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}