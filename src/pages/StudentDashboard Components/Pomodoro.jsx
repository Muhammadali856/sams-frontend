import React, { useState, useEffect, useRef } from 'react';

const WORK_SEC  = 25 * 60;
const BREAK_SEC =  5 * 60;

export default function PomodoroPage() {
  const [seconds,  setSeconds]  = useState(WORK_SEC);
  const [running,  setRunning]  = useState(false);
  const [mode,     setMode]     = useState('work');
  const [sessions, setSessions] = useState(0);
  
  // NEW: State to track fullscreen status accurately
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const intervalRef = useRef(null);
  const containerRef = useRef(null); 

  // Listen for fullscreen changes (handles both button clicks and the 'Esc' key)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (running) {
        e.preventDefault();
        e.returnValue = "Timeringiz ishlab turibdi! Saytdan chiqib ketishni xohlaysizmi?";
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [running]);

  const total = mode === 'work' ? WORK_SEC : BREAK_SEC;
  const pct   = seconds / total;
  const r     = 90;
  const circ  = 2 * Math.PI * r;
  const dash  = circ * pct;

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            if (mode === 'work') {
              setSessions((c) => c + 1);
              setMode('break');
              return BREAK_SEC;
            } else {
              setMode('work');
              return WORK_SEC;
            }
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, mode]);

  const toggle = () => setRunning((r) => !r);
  
  const handleReset = () => {
    const confirmReset = window.confirm("Rostdan ham timerni boshidan boshlamoqchimisiz?");
    if (confirmReset) {
      setRunning(false); 
      clearInterval(intervalRef.current); 
      setSeconds(mode === 'work' ? WORK_SEC : BREAK_SEC);
    }
  };

  const switchMode = (m) => { 
    setRunning(false); 
    clearInterval(intervalRef.current); 
    setMode(m); 
    setSeconds(m === 'work' ? WORK_SEC : BREAK_SEC); 
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        alert(`Fullscreen xatosi: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <div ref={containerRef} style={{ 
      maxWidth: isFullscreen ? '100%' : '480px', 
      margin: '0 auto', 
      // FIXED: Changed '--bg-main' to '--bg' to respect the global.css dark mode variable
      background: isFullscreen ? 'var(--bg)' : 'transparent', 
      height: isFullscreen ? '100vh' : 'auto', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      
      <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', padding: isFullscreen ? '20px' : '0 0 10px 0' }}>
        <button className="btn btn-outline btn-sm" onClick={toggleFullscreen}>
          {isFullscreen ? '⛶ Quit Fullscreen' : '⛶ Fullscreen'}
        </button>
      </div>

      <div className="card" style={{ padding: '32px', textAlign: 'center', width: '100%', maxWidth: '480px' }}>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '28px' }}>
          <button className={`btn btn-sm ${mode === 'work'  ? 'btn-primary' : 'btn-outline'}`} onClick={() => switchMode('work')}>🎯 Work (25m)</button>
          <button className={`btn btn-sm ${mode === 'break' ? 'btn-accent'  : 'btn-outline'}`} onClick={() => switchMode('break')}>☕ Break (5m)</button>
        </div>

        <div className={`pomodoro-ring ring-${mode}`} style={{ position: 'relative', width: 220, height: 220, margin: '0 auto' }}>
          <svg className="ring-svg" width="220" height="220" viewBox="0 0 220 220">
            <circle className="ring-bg"       cx="110" cy="110" r={r} />
            <circle className="ring-progress" cx="110" cy="110" r={r} strokeDasharray={`${dash} ${circ}`} strokeDashoffset={0} />
          </svg>
          <div className="timer-display" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div className="timer-time" style={{ fontSize: '48px', fontWeight: 'bold' }}>{mm}:{ss}</div>
            <div className="timer-mode">{mode === 'work' ? 'Focus' : 'Break'}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
          <button className="btn btn-outline" onClick={handleReset}>↺ Reset</button>
          <button className={`btn ${running ? 'btn-danger' : 'btn-primary'}`} style={{ minWidth: '100px' }} onClick={toggle}>
            {running ? '⏸ Pause' : '▶ Start'}
          </button>
        </div>

        <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Sessions Completed</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: i <= sessions ? '#1a2744' : '#e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
              }}>{i <= sessions ? '🍅' : ''}</div>
            ))}
          </div>
          {sessions >= 4 && <div style={{ marginTop: '12px', fontSize: '13px', color: '#10b981', fontWeight: 700 }}>🎉 4 ta sessiya tugadi! Uzoqroq dam oling.</div>}
        </div>
      </div>
    </div>
  );
}