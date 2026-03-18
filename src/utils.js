// src/utils.js — shared helpers & custom hooks
const { useState, useEffect, useContext, useRef } = React;

window.fmt  = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
window.fmtD = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
window.sumArr = arr => arr.reduce((a, b) => a + b, 0);

let _uid = 1000;
window.uid = () => (++_uid).toString();

// Style helpers — Cornerstone luxury input
window.inputStyle = (T, F) => ({
  background: T.inputBg || T.surface,
  border: `1px solid ${T.inputBorder || T.border}`,
  color: T.text,
  borderRadius: 12,
  padding: '12px 16px',
  fontSize: F.base,
  width: '100%',
  outline: 'none',
  fontFamily: "'Inter', sans-serif",
  transition: 'border-color 0.2s ease',
});

// Reusable label component — Cornerstone style
window.Lbl = function ({ children, style = {} }) {
  const { T, F } = useContext(AppCtx);
  return React.createElement('div', {
    style: {
      fontSize: F.lbl || 10,
      color: T.textMuted || '#5a6a7a',
      letterSpacing: '2px',
      textTransform: 'uppercase',
      fontWeight: 500,
      fontFamily: "'Inter', sans-serif",
      marginBottom: 8,
      ...style,
    }
  }, children);
};

// Reusable button — Cornerstone style
window.Btn = function ({ children, onClick, style = {}, variant = 'primary', disabled = false }) {
  const { T, F } = useContext(AppCtx);
  const [hov, setHov] = useState(false);
  
  const handleClick = (e) => {
    if (disabled) return;
    if (window.playClick) window.playClick();
    if (onClick) onClick(e);
  };
  
  const base = {
    padding: '12px 22px', 
    borderRadius: 12, 
    fontSize: F.sm || 13,
    fontFamily: "'Inter', sans-serif", 
    fontWeight: 500, 
    border: 'none',
    transition: 'all 0.25s ease', 
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  };
  
  const vars = {
    primary: { 
      background: hov ? 'rgba(212,148,58,0.2)' : (T.accentGlow || 'rgba(212,148,58,0.12)'), 
      border: `1px solid ${hov ? 'rgba(212,148,58,0.3)' : 'rgba(212,148,58,0.2)'}`,
      color: T.accent || '#d4943a',
      transform: hov && !disabled ? 'translateY(-1px)' : 'none',
    },
    secondary: { 
      background: hov ? T.surfaceHover : 'transparent', 
      border: `1px solid ${T.borderLight || T.border}`, 
      color: T.textSub 
    },
    danger: { 
      background: hov ? 'rgba(138,104,48,0.2)' : 'rgba(138,104,48,0.1)', 
      border: `1px solid ${T.accentDim || '#8a6830'}44`, 
      color: T.accentDim || '#8a6830' 
    },
    ghost: {
      background: 'transparent',
      border: `1px solid ${T.borderLight || T.border}`,
      color: T.textSub,
    },
  };
  
  return React.createElement('button', {
    onClick: handleClick,
    onMouseEnter: () => setHov(true),
    onMouseLeave: () => setHov(false),
    disabled,
    style: { ...base, ...(vars[variant] || vars.primary), ...style },
  }, children);
};

// Auto-lock timer hook (10 min inactivity)
window.useAutoLock = function (onLock, hasPin) {
  const timer = useRef(null);
  const TIMEOUT = 10 * 60 * 1000; // 10 minutes

  useEffect(() => {
    if (!hasPin) return;
    const reset = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(onLock, TIMEOUT);
    };
    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    events.forEach(e => document.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer.current);
      events.forEach(e => document.removeEventListener(e, reset));
    };
  }, [hasPin, onLock]);
};

// Online status hook
window.useOnlineStatus = function () {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
};

// ── Toast system ──────────────────────────────────────────────────────────
// Global event bus — any component can fire a toast without prop drilling
window._toastListeners = [];
window.showToast = function (msg, type = 'success', duration = 3000) {
  const id = Date.now();
  window._toastListeners.forEach(fn => fn({ id, msg, type, duration }));
};

window.ToastHost = function () {
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    const handler = t => {
      setToasts(prev => [...prev, t]);
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), t.duration + 400);
    };
    window._toastListeners.push(handler);
    return () => { window._toastListeners = window._toastListeners.filter(f => f !== handler); };
  }, []);

  // Cornerstone toast colors (amber-based)
  const colors = {
    success: { bg: '#121c2b', border: 'rgba(232,168,74,0.3)', icon: '✓', text: '#e8a84a' },
    error:   { bg: '#121c2b', border: 'rgba(138,104,48,0.4)', icon: '✕', text: '#8a6830' },
    warning: { bg: '#121c2b', border: 'rgba(212,148,58,0.3)', icon: '!', text: '#d4943a' },
    info:    { bg: '#121c2b', border: 'rgba(212,148,58,0.25)', icon: '◆', text: '#d4943a' },
  };

  return React.createElement('div', {
    style: { position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', zIndex: 600, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', pointerEvents: 'none' },
  },
    ...toasts.map(t => {
      const c = colors[t.type] || colors.success;
      return React.createElement('div', {
        key: t.id,
        style: {
          display: 'flex', alignItems: 'center', gap: 10,
          background: c.bg, border: `1px solid ${c.border}`,
          borderRadius: 14, padding: '12px 20px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
          fontFamily: "'Inter', sans-serif", fontWeight: 500,
          fontSize: 13, color: c.text, whiteSpace: 'nowrap',
          animation: 'fadeUp 0.3s ease both',
          pointerEvents: 'none',
        },
      },
        React.createElement('span', { style: { fontSize: 14, opacity: 0.8 } }, c.icon),
        t.msg,
      );
    })
  );
};

// ── File System Access API helpers ────────────────────────────────────────
// Check if browser supports the modern folder-picker API
window.supportsFileSystemAccess = function () {
  return typeof window.showDirectoryPicker === 'function';
};

// Ask user to pick a folder; store the handle in IndexedDB for reuse
window.pickBackupFolder = async function () {
  if (!supportsFileSystemAccess()) return null;
  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite', startIn: 'documents' });
    // Persist the handle so future sessions can reuse it without asking again
    await DB.setSetting('backupFolderHandle', handle);
    await DB.setSetting('backupFolderName', handle.name);
    return handle;
  } catch (e) {
    // User cancelled picker
    return null;
  }
};

// Get stored folder handle; verify permission is still granted
window.getBackupFolder = async function () {
  try {
    const handle = await DB.getSetting('backupFolderHandle');
    if (!handle) return null;
    // Re-request permission if needed (required after browser restart)
    const perm = await handle.queryPermission({ mode: 'readwrite' });
    if (perm === 'granted') return handle;
    const req = await handle.requestPermission({ mode: 'readwrite' });
    if (req === 'granted') return handle;
    return null;
  } catch { return null; }
};

// Save a file directly into the stored folder — no download dialog
window.saveToFolder = async function (handle, filename, content) {
  const fileHandle = await handle.getFileHandle(filename, { create: true });
  const writable   = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
};

// Weather hook
window.useWeather = function (city, isOnline) {
  const [weather, setWeather] = useState(null);
  useEffect(() => {
    if (!isOnline) { setWeather(null); return; }
    // Simple city→coords lookup for common cities
    const cityCoords = {
      'trenton': [40.22, -74.76], 'new york': [40.71, -74.01],
      'los angeles': [34.05, -118.24], 'chicago': [41.88, -87.63],
      'houston': [29.76, -95.37], 'philadelphia': [39.95, -75.17],
      'default': [40.71, -74.01],
    };
    const key = (city || '').toLowerCase().split(',')[0].trim();
    const [lat, lon] = cityCoords[key] || cityCoords['default'];
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=fahrenheit`)
      .then(r => r.json())
      .then(d => {
        const cw = d?.current_weather;
        if (!cw) return;
        const code = cw.weathercode;
        const icon = code === 0 ? '☀️' : code <= 2 ? '⛅' : code <= 48 ? '🌫️' : code <= 67 ? '🌧️' : code <= 82 ? '🌧️' : code <= 99 ? '⛈️' : '❄️';
        setWeather({ temp: Math.round(cw.temperature), icon, wind: Math.round(cw.windspeed) });
      })
      .catch(() => setWeather(null));
  }, [isOnline, city]);
  return weather;
};
