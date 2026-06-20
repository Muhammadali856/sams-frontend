import React, { useState } from 'react';
import '../styles/global.css'; 

const API_BASE = import.meta.env?.VITE_API_BASE ?? 'https://sams-backend-92kz.onrender.com/api';

export default function LoginPage({ onLoginSuccess }) {
  const [step, setStep] = useState('login'); 
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Unified Login State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // First-Time Student State
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [fullName, setFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [tempUserId, setTempUserId] = useState(null);

  // OTP Flow States
  const [resetStudentId, setResetStudentId] = useState('');
  const [otpCode, setOtpCode] = useState('');

  // ==========================================
  // UNIFIED LOGIN HANDLER
  // ==========================================
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const payload = { identifier: identifier.toUpperCase(), password };
    if (isFirstTime) payload.full_name = fullName.toUpperCase();

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
             role: data.role,
             studentId: data.studentId || data.username, 
             user_id: data.user_id,
             is_head_teacher: data.is_head_teacher
           }); 
        }
      } else {
        if (data.first_time_required) {
          setIsFirstTime(true);
        }
        setError(data.detail || "Invalid credentials.");
      }
    } catch (err) {
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ new_password: newPassword }),
      });

      if (response.ok) {
        alert("Password updated! Welcome to SAMS. 🎉");
        onLoginSuccess({ 
          name: fullName.toUpperCase(), 
          token: token, 
          role: 'student',
          studentId: identifier.toUpperCase(),
          user_id: tempUserId
        });
      } else {
        const data = await response.json();
        setError(data.new_password?.[0] || "Failed to change password.");
      }
    } catch (err) {
      setError("Network error.");
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
        setSuccessMsg(data.message || "Code sent to your email!");
        setStep('forgot_verify');
      } else {
        setError(data.error || "Failed to send verification code.");
      }
    } catch {
      setError("Network error.");
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
      if (response.ok) {
        setSuccessMsg("Code verified! Please set your new password.");
        setStep('forgot_confirm');
      } else {
        const data = await response.json();
        setError(data.error || "Invalid code.");
      }
    } catch { setError("Network error."); } finally { setIsLoading(false); }
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    setError(''); setSuccessMsg(''); setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/forgot-password/confirm/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: resetStudentId, otp_code: otpCode, new_password: newPassword }),
      });
      if (response.ok) {
        alert("Password reset successfully! You can now log in.");
        setStep('login'); setPassword(''); setNewPassword(''); setOtpCode('');
      } else {
        const data = await response.json();
        setError(data.error || "Failed to reset password.");
      }
    } catch { setError("Network error."); } finally { setIsLoading(false); }
  };

  // ==========================================
  // RENDER: ACCOUNT RECOVERY (Narrow Centered Card)
  // ==========================================
  if (step.includes('forgot')) {
    return (
      <div className="auth-page">
        <div className="auth-narrow-card">
          {step === 'forgot_request' && (
            <form onSubmit={handleRequestOTP}>
              <div className="auth-form-head">
                <h2 className="auth-form-h2">Account Recovery</h2>
                <p className="auth-form-sub">Enter your ID to receive a 6-digit recovery code via email.</p>
              </div>
              {error && <div className="auth-alert error">⚠️ {error}</div>}
              <div className="form-group">
                <label className="form-label">Campus ID</label>
                <input className="form-input" type="text" placeholder="e.g. FIT2508130" value={resetStudentId} onChange={(e) => setResetStudentId(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={isLoading}>{isLoading ? 'Sending...' : 'Send Recovery Code'}</button>
              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <button type="button" className="auth-link" onClick={() => setStep('login')}>← Back to Login</button>
              </div>
            </form>
          )}

          {step === 'forgot_verify' && (
            <form onSubmit={handleVerifyOTP}>
              <div className="auth-form-head">
                <h2 className="auth-form-h2">Check Your Email</h2>
                <p className="auth-form-sub">We sent a 6-digit verification code to your registered email.</p>
              </div>
              {error && <div className="auth-alert error">⚠️ {error}</div>}
              {successMsg && <div className="auth-alert success">✅ {successMsg}</div>}
              <div className="form-group">
                <label className="form-label">6-Digit Code</label>
                <input className="form-input" type="text" placeholder="e.g. 123456" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={isLoading}>{isLoading ? 'Verifying...' : 'Verify Code'}</button>
              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <button type="button" className="auth-link" onClick={() => { setStep('forgot_request'); setSuccessMsg(''); setError(''); }}>← Try a different ID</button>
              </div>
            </form>
          )}

          {step === 'forgot_confirm' && (
            <form onSubmit={handleConfirmReset}>
              <div className="auth-form-head">
                <h2 className="auth-form-h2">Create New Password</h2>
                <p className="auth-form-sub">Your code was verified. Please set a new secure password.</p>
              </div>
              {error && <div className="auth-alert error">⚠️ {error}</div>}
              {successMsg && <div className="auth-alert success">✅ {successMsg}</div>}
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input className="form-input" type="password" placeholder="Min. 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={isLoading}>{isLoading ? 'Saving...' : 'Reset Password'}</button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: MAIN LOGIN (Split Centered Card)
  // ==========================================
  return (
    <div className="auth-page">
      <div className="auth-split-card">
        
        {/* 1. LEFT SIDE: Form */}
        <div className="auth-form-wrapper">
          <div className="auth-form-head">
            <h2 className="auth-form-h2">{step === 'login' ? 'Sign In' : 'Secure Account'}</h2>
            <p className="auth-form-sub">
              {step === 'changePassword' 
                ? 'Please set a secure personal password to activate your portal access.'
                : 'Enter your credentials to continue.'}
            </p>
          </div>

          {error && <div className="auth-alert error">⚠️ {error}</div>}

          {step === 'login' && (
            <form onSubmit={handleLogin}>
              
              {isFirstTime && (
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" type="text" placeholder="e.g. Ali Bin Ahmad" value={fullName} onChange={(e) => setFullName(e.target.value)} required={isFirstTime} />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Campus ID</label>
                <input className="form-input" type="text" placeholder="e.g. FIT2508130" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    className="form-input" 
                    type={showPassword ? "text" : "password"} 
                    placeholder={isFirstTime ? "Enter default password" : "Enter password"}
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    style={{ paddingRight: '45px' }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    {showPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C7 20 2.73 16.11 1 12c1-2.3 2.7-4.3 4.86-5.73M9.9 4.24A10.94 10.94 0 0 1 12 4c5 0 9.27 3.89 11 8a11.05 11.05 0 0 1-2.17 3.19M1 1l22 22"/></svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-full" disabled={isLoading} style={{ marginTop: '10px' }}>
                {isLoading ? 'Processing...' : (isFirstTime ? 'Verify Identity' : 'Log In')}
              </button>

              {!isFirstTime && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '24px' }}>
                  <button type="button" className="auth-link" onClick={() => { setIsFirstTime(true); setError(''); }}>First time?</button>
                  <span style={{ color: '#cbd5e1' }}>|</span>
                  <button type="button" className="auth-link" onClick={() => { setStep('forgot_request'); setError(''); setSuccessMsg(''); setResetStudentId(identifier); }}>Forgot password?</button>
                </div>
              )}

              {isFirstTime && (
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                  <button type="button" className="auth-link" onClick={() => { setIsFirstTime(false); setError(''); }}>← Back to standard login</button>
                </div>
              )}
            </form>
          )}

          {step === 'changePassword' && (
            <form onSubmit={handleChangePasswordSubmit}>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input className="form-input" type="password" placeholder="Type a secure new password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={isLoading} style={{ marginTop: '10px' }}>
                {isLoading ? 'Saving...' : 'Save Password & Enter'}
              </button>
            </form>
          )}
        </div>

        {/* 2. RIGHT SIDE: Graphic Cover & Dynamic Guides */}
        <div className="auth-cover hide-mobile">
          <div className="auth-logo-box">
            <div className="auth-logo-icon">📚</div>
            <div>
              <div className="auth-logo-title">SAMS</div>
              <div className="auth-logo-sub">Portal Integration</div>
            </div>
          </div>
          
          <div style={{ background: 'rgba(255,255,255,0.08)', padding: '24px', borderRadius: '12px', marginTop: 'auto', marginBottom: 'auto' }}>
            <h3 style={{ color: '#fff', fontSize: '15px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              💡 {isFirstTime ? 'First Time Login Guide' : 'Access Guide'}
            </h3>
            
            <ul style={{ paddingLeft: '20px', color: 'rgba(255,255,255,0.85)', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '10px', margin: 0, lineHeight: 1.5 }}>
              {isFirstTime ? (
                <>
                  <li>Enter your <strong>Full Name</strong> exactly as shown on your student ID.</li>
                  <li>Enter your assigned <strong>Campus ID</strong>.</li>
                  <li>Use the <strong>default password</strong> (samspass123)</li>
                  <li>If you are a teacher, please ask the Head Teacher (Mr. Nigel Koo) to manually create your account.</li>
                </>
              ) : (
                <>
                  <li>Enter your <strong>Campus ID</strong></li>
                  <li>Enter your secure portal password.</li>
                  <li>If this is your very first time using the SAMS, please click the <strong>"First time?"</strong></li>
                </>
              )}
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}