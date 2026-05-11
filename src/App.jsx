import React, { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import './styles/global.css';

/**
 * App.jsx — Root component
 * Manages authentication state, persists login via localStorage, 
 * and routes to the correct page.
 */
export default function App() {
  const [user, setUser] = useState(null); // { name, role, id, token }
  const [isChecking, setIsChecking] = useState(true);

  // 1. Check local storage when the app first loads
  useEffect(() => {
    const savedUser = localStorage.getItem('sams_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsChecking(false);
  }, []);

  // 2. Save user to state and hard drive on login
  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('sams_user', JSON.stringify(userData));
    if (userData.token) {
      localStorage.setItem('access_token', userData.token);
    }
  };

  // 3. Wipe user from state and hard drive on logout
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('sams_user');
    localStorage.removeItem('access_token');
  };

  // Prevent flash of login screen while checking storage
  if (isChecking) {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading...</div>;
  }

  // Route: Not logged in
  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Route: Student
  if (user.role === 'student') {
    return <StudentDashboard user={user} onLogout={handleLogout} />;
  }

  // Route: Teacher
  if (user.role === 'teacher') {
    return <TeacherDashboard user={user} onLogout={handleLogout} />;
  }

  return null;
}