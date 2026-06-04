import React, { useState } from 'react';
import '../styles/global.css'; 

const API_BASE = import.meta.env?.VITE_API_BASE ?? 'https://sams-backend-92kz.onrender.com/api';

export default function LoginPage({ onLoginSuccess }) {
  const [role, setRole] = useState('student');
  const [step, setStep] = useState('login'); // 'login', 'changePassword', 'forgot_request', 'forgot_verify', 'forgot_confirm'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [isFirstTime, setIsFirstTime] = useState(false);

  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [showStudentPassword, setShowStudentPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [tempUserId, setTempUserId] = useState(null);

  const [teacherUsername, setTeacherUsername] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');

  // --- OTP Flow States ---
  const [resetStudentId, setResetStudentId] = useState('');
  const [otpCode, setOtpCode] = useState('');

  const handleStudentLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

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

        if (data.require_password_change) {
           setStep('changePassword'); 
        } else {
           onLoginSuccess({ 
             name: data.username,
             token: data.access, 
             role: 'student',
             studentId: payload.student_id,
             user_id: data.user_id 
           }); 
        }
      } else {
        if (data.first_time_required) {
          setIsFirstTime(true);
        }
        setError(data.detail || "Invalid student credentials.");
      }
    } catch (error) {
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
          user_id: data.user_id,
          is_head_teacher: data.is_head_teacher
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

  // ==========================================
  // OTP FORGOT PASSWORD FLOW API HANDLERS
  // ==========================================
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError(''); setSuccessMsg(''); setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/forgot-password/request/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: resetStudentId }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMsg(data.message || "We sent a 6-digit code to your email!");
        setStep('forgot_verify');
      } else {
        setError(data.error || "Failed to send verification code.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError(''); setSuccessMsg(''); setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/forgot-password/verify/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: resetStudentId, otp_code: otpCode }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMsg("Code verified! Please set your new password.");
        setStep('forgot_confirm');
      } else {
        setError(data.error || "Invalid code.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    setError(''); setSuccessMsg(''); setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/forgot-password/confirm/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          student_id: resetStudentId, 
          otp_code: otpCode, 
          new_password: newPassword 
        }),
      });
      const data = await response.json();
      if (response.ok) {
        alert("Your password has been reset successfully! You can now log in.");
        setStep('login');
        setStudentPassword('');
        setNewPassword('');
        setOtpCode('');
      } else {
        setError(data.error || "Failed to reset password.");
      }
    } catch {
      setError("Network error.");
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
                : step.includes('forgot') ? '' : 'Enter your details to continue.'}
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

          {/* ==============================================
              TEACHER LOGIN
              ============================================== */}
          {role === 'teacher' && step === 'login' && (
            <form onSubmit={handleTeacherLogin}>
              <div className="form-group">
                <label className="form-label">Teacher ID</label>
                <input 
                  className="form-input" 
                  type="text" 
                  placeholder="e.g. T12345"
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
                {isLoading ? 'Logging in...' : 'Log In'}
              </button>
            </form>
          )}

          {/* ==============================================
              STUDENT LOGIN
              ============================================== */}
          {role === 'student' && step === 'login' && (
            <form onSubmit={handleStudentLogin}>
              
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
                {isLoading ? 'Logging in...' : (isFirstTime ? 'Verify Identity' : 'Log In')}
              </button>

              {/* Side-by-side Navigation Links */}
              {!isFirstTime && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '18px' }}>
                  <button 
                    type="button" 
                    onClick={() => { setIsFirstTime(true); setError(''); }}
                    style={{ background: 'none', border: 'none', color: '#1e40af', textDecoration: 'underline', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                  >
                    First time ?
                  </button>
                  <span style={{ color: '#cbd5e1' }}>|</span>
                  <button 
                    type="button" 
                    onClick={() => { setStep('forgot_request'); setError(''); setSuccessMsg(''); setResetStudentId(studentId); }}
                    style={{ background: 'none', border: 'none', color: '#64748b', textDecoration: 'underline', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                  >
                    Forgot password ?
                  </button>
                </div>
              )}

              {/* Back button for First Time view */}
              {isFirstTime && (
                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <button 
                    type="button" 
                    onClick={() => { setIsFirstTime(false); setError(''); }}
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                  >
                    ← Back to standard login
                  </button>
                </div>
              )}

              {/* First Time Tips Panel */}
              {isFirstTime && (
                <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '8px', padding: '14px', marginTop: '20px', fontSize: '13px', color: 'var(--text-mid)' }}>
                   <strong style={{ color: 'var(--primary)', display: 'block', marginBottom: '8px' }}>💡 First Time Login Guide:</strong>
                   <ul style={{ paddingLeft: '18px', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                     <li>Enter your <strong>Full Name</strong> exactly as registered in the university system.</li>
                     <li>Enter your <strong>Student ID</strong> (e.g., S123456).</li>
                     <li>Use the <strong>default password</strong> provided by the administration.</li>
                     <li>You will be prompted to create a new secure password immediately.</li>
                   </ul>
                </div>
              )}
            </form>
          )}

          {/* ==============================================
              FIRST TIME PASSWORD CHANGE
              ============================================== */}
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

          {/* ==============================================
              FORGOT PASSWORD FLOW
              ============================================== */}
          
          {/* STEP 1: REQUEST CODE */}
          {step === 'forgot_request' && (
            <form onSubmit={handleRequestOTP}>
              <div className="login-form-head">
                <h2 className="login-form-h2">Account Recovery</h2>
                <p className="login-form-sub">Enter your Student ID to receive a 6-digit recovery code via email.</p>
              </div>
              <div className="form-group">
                <label className="form-label">Student ID</label>
                <input className="form-input" type="text" placeholder="e.g. S123456" value={resetStudentId} onChange={(e) => setResetStudentId(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Send Recovery Code'}
              </button>
              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <button type="button" onClick={() => setStep('login')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                  ← Back to login
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: VERIFY CODE */}
          {step === 'forgot_verify' && (
            <form onSubmit={handleVerifyOTP}>
              <div className="login-form-head">
                <h2 className="login-form-h2">Check Your Email</h2>
                <p className="login-form-sub">We sent a 6-digit verification code to your Outlook account.</p>
              </div>
              {successMsg && <div className="login-alert success">✅ {successMsg}</div>}
              
              <div className="form-group">
                <label className="form-label">6-Digit Code</label>
                <input className="form-input" type="text" placeholder="e.g. 123456" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={isLoading}>
                {isLoading ? 'Verifying...' : 'Verify Code'}
              </button>
              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <button type="button" onClick={() => { setStep('forgot_request'); setSuccessMsg(''); setError(''); }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                  ← Try a different Student ID
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: CONFIRM NEW PASSWORD */}
          {step === 'forgot_confirm' && (
            <form onSubmit={handleConfirmReset}>
              <div className="login-form-head">
                <h2 className="login-form-h2">Create New Password</h2>
                <p className="login-form-sub">Your code was verified. Please set a new secure password.</p>
              </div>
              {successMsg && <div className="login-alert success">✅ {successMsg}</div>}
              
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input className="form-input" type="password" placeholder="Min. 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Reset Password'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}