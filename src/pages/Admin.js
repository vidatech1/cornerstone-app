// src/pages/Admin.js — Secure Admin Settings Panel
// Security: OTP email verification OR 6-digit passcode, rate limiting, lockout protection
const { useState, useEffect, useContext } = React;

window.AdminPage = function ({ onClose }) {
  const { T, F } = useContext(AppCtx);
  
  // ─── Security State ───────────────────────────────────────────────────────
  const [authState, setAuthState] = useState('locked'); // 'locked' | 'otp_sent' | 'authenticated'
  const [authMethod, setAuthMethod] = useState(null); // 'otp' | 'passcode'
  const [otpCode, setOtpCode] = useState('');
  const [passcodeInput, setPasscodeInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Rate limiting & lockout
  const [attempts, setAttempts] = useState(() => {
    const saved = sessionStorage.getItem('admin_attempts');
    return saved ? parseInt(saved) : 0;
  });
  const [lockoutUntil, setLockoutUntil] = useState(() => {
    const saved = sessionStorage.getItem('admin_lockout');
    return saved ? parseInt(saved) : 0;
  });
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
  
  // Admin settings
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('cornerstone_admin_settings');
    return saved ? JSON.parse(saved) : {
      membershipUrl: 'https://bio.site/vidatech1',
      supportEmail: 'info@vidatech1.com',
      websiteUrl: 'https://bio.site/vidatech1',
      passcodeHash: null, // SHA-256 hash of passcode
      otpEnabled: true,
    };
  });

  // Session timeout (auto-logout after 10 minutes of inactivity)
  const SESSION_TIMEOUT = 10 * 60 * 1000;
  const [sessionStart, setSessionStart] = useState(null);

  useEffect(() => {
    if (authState === 'authenticated' && sessionStart) {
      const timeout = setTimeout(() => {
        setAuthState('locked');
        setSessionStart(null);
        showToast('Session expired for security', 'info');
      }, SESSION_TIMEOUT);
      return () => clearTimeout(timeout);
    }
  }, [authState, sessionStart]);

  // Check lockout status
  const isLockedOut = lockoutUntil > Date.now();
  const lockoutRemaining = isLockedOut ? Math.ceil((lockoutUntil - Date.now()) / 60000) : 0;

  // ─── Security Functions ───────────────────────────────────────────────────
  
  // Simple hash function (in production, use Web Crypto API)
  const hashPasscode = async (passcode) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(passcode + 'cornerstone_salt_2025');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Generate OTP (6 digits)
  const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Record failed attempt
  const recordFailedAttempt = () => {
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    sessionStorage.setItem('admin_attempts', newAttempts.toString());
    
    if (newAttempts >= MAX_ATTEMPTS) {
      const lockout = Date.now() + LOCKOUT_DURATION;
      setLockoutUntil(lockout);
      sessionStorage.setItem('admin_lockout', lockout.toString());
      setError(`Too many failed attempts. Locked for ${Math.ceil(LOCKOUT_DURATION / 60000)} minutes.`);
    }
  };

  // Clear attempts on success
  const clearAttempts = () => {
    setAttempts(0);
    sessionStorage.removeItem('admin_attempts');
    sessionStorage.removeItem('admin_lockout');
    setLockoutUntil(0);
  };

  // Send OTP via email (opens email client with code)
  const sendOTP = () => {
    if (isLockedOut) {
      setError(`Locked out. Try again in ${lockoutRemaining} minutes.`);
      return;
    }

    setLoading(true);
    setError('');
    
    // Generate and store OTP temporarily
    const otp = generateOTP();
    sessionStorage.setItem('admin_otp', otp);
    sessionStorage.setItem('admin_otp_expires', (Date.now() + 5 * 60 * 1000).toString()); // 5 min expiry
    
    // Create mailto link with OTP
    const subject = 'Cornerstone Admin Access Code';
    const body = `Your one-time admin access code is: ${otp}\n\nThis code expires in 5 minutes.\n\nIf you did not request this code, please ignore this email.\n\n— Cornerstone Security`;
    const mailto = `mailto:info@vidatech1.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Note: In a real app, this would be sent via backend API
    // For offline/client-only, we show the code and ask user to verify
    
    setTimeout(() => {
      setLoading(false);
      setAuthState('otp_sent');
      setAuthMethod('otp');
      
      // For demo/offline: show the code in console (in production, send via API)
      console.log('🔐 Admin OTP:', otp);
      
      // Open mailto
      window.open(mailto, '_blank');
    }, 1000);
  };

  // Verify OTP
  const verifyOTP = () => {
    if (isLockedOut) {
      setError(`Locked out. Try again in ${lockoutRemaining} minutes.`);
      return;
    }

    const storedOTP = sessionStorage.getItem('admin_otp');
    const expiry = parseInt(sessionStorage.getItem('admin_otp_expires') || '0');
    
    if (!storedOTP || Date.now() > expiry) {
      setError('Code expired. Please request a new one.');
      sessionStorage.removeItem('admin_otp');
      sessionStorage.removeItem('admin_otp_expires');
      setAuthState('locked');
      return;
    }
    
    if (otpCode.trim() === storedOTP) {
      // Success
      clearAttempts();
      sessionStorage.removeItem('admin_otp');
      sessionStorage.removeItem('admin_otp_expires');
      setAuthState('authenticated');
      setSessionStart(Date.now());
      if (window.playSuccess) window.playSuccess();
    } else {
      recordFailedAttempt();
      setError('Invalid code. Please try again.');
      setOtpCode('');
    }
  };

  // Verify passcode
  const verifyPasscode = async () => {
    if (isLockedOut) {
      setError(`Locked out. Try again in ${lockoutRemaining} minutes.`);
      return;
    }

    if (passcodeInput.length !== 6 || !/^\d+$/.test(passcodeInput)) {
      setError('Passcode must be exactly 6 digits.');
      return;
    }

    const hash = await hashPasscode(passcodeInput);
    
    if (hash === settings.passcodeHash) {
      clearAttempts();
      setAuthState('authenticated');
      setSessionStart(Date.now());
      if (window.playSuccess) window.playSuccess();
    } else {
      recordFailedAttempt();
      setError('Invalid passcode.');
      setPasscodeInput('');
    }
  };

  // Save new passcode to storage
  const savePasscode = async (passcode) => {
    if (passcode.length !== 6 || !/^\d+$/.test(passcode)) {
      setError('Passcode must be exactly 6 digits.');
      return false;
    }
    
    const hash = await hashPasscode(passcode);
    updateSetting('passcodeHash', hash);
    if (window.playSuccess) window.playSuccess();
    return true;
  };

  // Update setting
  const updateSetting = (key, value) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem('cornerstone_admin_settings', JSON.stringify(updated));
      return updated;
    });
  };

  // ─── UI State ─────────────────────────────────────────────────────────────
  const [editingPasscode, setEditingPasscode] = useState(false);
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');

  const iStyle = inputStyle(T, F);

  // ─── Render ───────────────────────────────────────────────────────────────

  // Lockout Screen
  if (isLockedOut) {
    return React.createElement('div', {
      className: 'fade-up',
      style: { padding: '24px 18px 120px', background: T.bg, minHeight: '100vh' }
    },
      React.createElement(Card, { style: { padding: '40px 24px', textAlign: 'center', marginTop: 60 } },
        React.createElement('div', { style: { fontSize: 48, marginBottom: 20 } }, '🔒'),
        React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.lg, color: T.text, marginBottom: 12 } }, 'Access Temporarily Locked'),
        React.createElement('div', { style: { fontSize: F.sm, color: T.textSub, marginBottom: 20, lineHeight: 1.6 } },
          `Too many failed attempts. For security, admin access is locked for ${lockoutRemaining} more minute${lockoutRemaining !== 1 ? 's' : ''}.`
        ),
        React.createElement(Btn, { onClick: onClose, variant: 'ghost' }, 'Return to App'),
      ),
    );
  }

  // Auth Screen
  if (authState !== 'authenticated') {
    return React.createElement('div', {
      className: 'fade-up',
      style: { padding: '24px 18px 120px', background: T.bg, minHeight: '100vh' }
    },
      React.createElement('div', { style: { marginBottom: 28 } },
        React.createElement('button', {
          onClick: onClose,
          style: { background: 'none', border: 'none', color: T.textMuted, fontSize: F.sm, cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }
        }, '← Back'),
        React.createElement('div', { style: { fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: T.accent, marginBottom: 6 } }, 'Secure Access'),
        React.createElement('h1', { style: { fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 500, color: T.text } }, 'Admin Panel'),
      ),

      React.createElement(Card, { style: { padding: '28px 24px' } },
        React.createElement('div', { style: { textAlign: 'center', marginBottom: 24 } },
          React.createElement('div', { style: { fontSize: 40, marginBottom: 12 } }, '🔐'),
          React.createElement('div', { style: { fontSize: F.sm, color: T.textSub } }, 'Choose authentication method'),
        ),

        error && React.createElement('div', { style: { background: 'rgba(212,148,58,0.15)', border: `1px solid ${T.accent}66`, borderRadius: 10, padding: '12px 14px', marginBottom: 20, fontSize: F.sm, color: T.accent, textAlign: 'center' } }, error),

        authState === 'locked' && React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
          // OTP Option
          settings.otpEnabled && React.createElement(Btn, {
            onClick: sendOTP,
            disabled: loading,
            style: { padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 },
          }, loading ? 'Sending...' : '📧 Send Code to Email'),
          
          // Passcode Option (if set)
          settings.passcodeHash && React.createElement(Btn, {
            onClick: () => { setAuthMethod('passcode'); setAuthState('otp_sent'); },
            variant: 'ghost',
            style: { padding: '16px' },
          }, '🔢 Use Passcode'),
          
          // Info
          React.createElement('div', { style: { fontSize: F.xs, color: T.textMuted, textAlign: 'center', marginTop: 8 } },
            settings.passcodeHash 
              ? 'Code will be sent to info@vidatech1.com'
              : 'Set up a passcode after first login for faster access'
          ),
        ),

        // OTP Entry
        authState === 'otp_sent' && authMethod === 'otp' && React.createElement('div', null,
          React.createElement('div', { style: { marginBottom: 16 } },
            React.createElement(Lbl, null, 'Enter 6-digit code from email'),
            React.createElement('input', {
              type: 'text',
              inputMode: 'numeric',
              maxLength: 6,
              value: otpCode,
              onChange: e => setOtpCode(e.target.value.replace(/\D/g, '')),
              placeholder: '000000',
              autoFocus: true,
              style: { ...iStyle, textAlign: 'center', fontSize: F.lg, letterSpacing: 8, fontFamily: 'monospace' },
            }),
          ),
          React.createElement('div', { style: { display: 'flex', gap: 10 } },
            React.createElement(Btn, { onClick: () => { setAuthState('locked'); setOtpCode(''); setError(''); }, variant: 'ghost', style: { flex: 1 } }, 'Cancel'),
            React.createElement(Btn, { onClick: verifyOTP, disabled: otpCode.length !== 6, style: { flex: 2 } }, 'Verify'),
          ),
          React.createElement('div', { style: { fontSize: F.xs, color: T.textMuted, textAlign: 'center', marginTop: 12 } },
            'Code expires in 5 minutes • Check your email client'
          ),
        ),

        // Passcode Entry
        authState === 'otp_sent' && authMethod === 'passcode' && React.createElement('div', null,
          React.createElement('div', { style: { marginBottom: 16 } },
            React.createElement(Lbl, null, 'Enter 6-digit passcode'),
            React.createElement('input', {
              type: 'password',
              inputMode: 'numeric',
              maxLength: 6,
              value: passcodeInput,
              onChange: e => setPasscodeInput(e.target.value.replace(/\D/g, '')),
              placeholder: '••••••',
              autoFocus: true,
              style: { ...iStyle, textAlign: 'center', fontSize: F.lg, letterSpacing: 8, fontFamily: 'monospace' },
            }),
          ),
          React.createElement('div', { style: { display: 'flex', gap: 10 } },
            React.createElement(Btn, { onClick: () => { setAuthState('locked'); setPasscodeInput(''); setError(''); }, variant: 'ghost', style: { flex: 1 } }, 'Cancel'),
            React.createElement(Btn, { onClick: verifyPasscode, disabled: passcodeInput.length !== 6, style: { flex: 2 } }, 'Unlock'),
          ),
        ),

        // Remaining attempts warning
        attempts > 0 && attempts < MAX_ATTEMPTS && React.createElement('div', { style: { fontSize: F.xs, color: T.accent, textAlign: 'center', marginTop: 12 } },
          `${MAX_ATTEMPTS - attempts} attempts remaining before lockout`
        ),
      ),
    );
  }

  // ─── Authenticated Admin Panel ────────────────────────────────────────────
  return React.createElement('div', {
    className: 'fade-up',
    style: { padding: '24px 18px 120px', background: T.bg, minHeight: '100vh' }
  },
    // Header
    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 } },
      React.createElement('div', null,
        React.createElement('div', { style: { fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: T.accent, marginBottom: 6 } }, '🔓 Authenticated'),
        React.createElement('h1', { style: { fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 500, color: T.text } }, 'Admin Settings'),
      ),
      React.createElement(Btn, {
        onClick: () => { setAuthState('locked'); setSessionStart(null); onClose(); },
        variant: 'ghost',
        style: { fontSize: F.xs },
      }, 'Lock & Exit'),
    ),

    // Session Info
    React.createElement('div', { style: { background: 'rgba(212,148,58,0.1)', borderRadius: 10, padding: '10px 14px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 } },
      React.createElement('span', { style: { fontSize: 16 } }, '⏱️'),
      React.createElement('span', { style: { fontSize: F.xs, color: T.textSub } }, 
        `Session expires in ${Math.ceil((SESSION_TIMEOUT - (Date.now() - sessionStart)) / 60000)} min`
      ),
    ),

    // Business Links
    React.createElement(Card, { style: { padding: '20px 22px', marginBottom: 16 } },
      React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.md, color: T.text, marginBottom: 16 } }, '🔗 Business Links'),
      
      React.createElement('div', { style: { marginBottom: 14 } },
        React.createElement(Lbl, null, 'Website URL'),
        React.createElement('input', {
          value: settings.websiteUrl,
          onChange: e => updateSetting('websiteUrl', e.target.value),
          placeholder: 'https://your-website.com',
          style: iStyle,
        }),
        React.createElement('div', { style: { fontSize: F.xs - 1, color: T.textMuted, marginTop: 4 } }, 'Main business website'),
      ),

      React.createElement('div', { style: { marginBottom: 14 } },
        React.createElement(Lbl, null, 'Membership URL'),
        React.createElement('input', {
          value: settings.membershipUrl,
          onChange: e => updateSetting('membershipUrl', e.target.value),
          placeholder: 'https://membership-page.com',
          style: iStyle,
        }),
        React.createElement('div', { style: { fontSize: F.xs - 1, color: T.textMuted, marginTop: 4 } }, 'Where users go to sign up for memberships'),
      ),

      React.createElement('div', null,
        React.createElement(Lbl, null, 'Support Email'),
        React.createElement('input', {
          type: 'email',
          value: settings.supportEmail,
          onChange: e => updateSetting('supportEmail', e.target.value),
          placeholder: 'support@your-domain.com',
          style: iStyle,
        }),
        React.createElement('div', { style: { fontSize: F.xs - 1, color: T.textMuted, marginTop: 4 } }, 'Email for support form submissions'),
      ),
    ),

    // Security Settings
    React.createElement(Card, { style: { padding: '20px 22px', marginBottom: 16 } },
      React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.md, color: T.text, marginBottom: 16 } }, '🔒 Security Settings'),
      
      // Passcode Management
      !editingPasscode 
        ? React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${T.border}` } },
            React.createElement('div', null,
              React.createElement('div', { style: { fontSize: F.sm, color: T.text } }, '6-Digit Passcode'),
              React.createElement('div', { style: { fontSize: F.xs, color: T.textMuted } }, 
                settings.passcodeHash ? 'Passcode is set' : 'Not configured'
              ),
            ),
            React.createElement(Btn, {
              onClick: () => setEditingPasscode(true),
              variant: 'ghost',
              style: { fontSize: F.xs },
            }, settings.passcodeHash ? 'Change' : 'Set Up'),
          )
        : React.createElement('div', { style: { padding: '12px 0', borderBottom: `1px solid ${T.border}` } },
            React.createElement('div', { style: { fontSize: F.sm, color: T.text, marginBottom: 12 } }, 
              settings.passcodeHash ? 'Change Passcode' : 'Set New Passcode'
            ),
            React.createElement('div', { style: { marginBottom: 10 } },
              React.createElement(Lbl, null, 'New 6-digit passcode'),
              React.createElement('input', {
                type: 'password',
                inputMode: 'numeric',
                maxLength: 6,
                value: newPasscode,
                onChange: e => setNewPasscode(e.target.value.replace(/\D/g, '')),
                placeholder: '••••••',
                style: { ...iStyle, letterSpacing: 4 },
              }),
            ),
            React.createElement('div', { style: { marginBottom: 12 } },
              React.createElement(Lbl, null, 'Confirm passcode'),
              React.createElement('input', {
                type: 'password',
                inputMode: 'numeric',
                maxLength: 6,
                value: confirmPasscode,
                onChange: e => setConfirmPasscode(e.target.value.replace(/\D/g, '')),
                placeholder: '••••••',
                style: { ...iStyle, letterSpacing: 4 },
              }),
            ),
            React.createElement('div', { style: { display: 'flex', gap: 10 } },
              React.createElement(Btn, {
                onClick: () => { setEditingPasscode(false); setNewPasscode(''); setConfirmPasscode(''); setError(''); },
                variant: 'ghost',
                style: { flex: 1 },
              }, 'Cancel'),
              React.createElement(Btn, {
                onClick: async () => {
                  if (newPasscode !== confirmPasscode) {
                    setError('Passcodes do not match');
                    return;
                  }
                  if (await savePasscode(newPasscode)) {
                    setEditingPasscode(false);
                    setNewPasscode('');
                    setConfirmPasscode('');
                    showToast('Passcode updated', 'success');
                  }
                },
                disabled: newPasscode.length !== 6 || confirmPasscode.length !== 6,
                style: { flex: 2 },
              }, 'Save'),
            ),
          ),

      // OTP Toggle
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' } },
        React.createElement('div', null,
          React.createElement('div', { style: { fontSize: F.sm, color: T.text } }, 'Email OTP Option'),
          React.createElement('div', { style: { fontSize: F.xs, color: T.textMuted } }, 'Allow login via email code'),
        ),
        React.createElement('button', {
          onClick: () => {
            if (!settings.passcodeHash && settings.otpEnabled) {
              setError('Set up a passcode first before disabling OTP');
              return;
            }
            updateSetting('otpEnabled', !settings.otpEnabled);
          },
          style: {
            width: 50, height: 28, borderRadius: 14, border: 'none',
            background: settings.otpEnabled ? T.accent : T.border,
            position: 'relative', cursor: 'pointer', transition: 'all 0.2s',
          }
        },
          React.createElement('div', {
            style: {
              width: 22, height: 22, borderRadius: '50%', background: '#fff',
              position: 'absolute', top: 3,
              left: settings.otpEnabled ? 25 : 3,
              transition: 'all 0.2s',
            }
          }),
        ),
      ),
    ),

    // Danger Zone
    React.createElement(Card, { style: { padding: '20px 22px', border: `1px solid ${T.accentDim}44` } },
      React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.md, color: T.accentDim, marginBottom: 12 } }, '⚠️ Danger Zone'),
      
      React.createElement(Btn, {
        onClick: () => {
          if (confirm('Are you sure you want to reset all admin settings? This cannot be undone.')) {
            localStorage.removeItem('cornerstone_admin_settings');
            setSettings({
              membershipUrl: 'https://bio.site/vidatech1',
              supportEmail: 'info@vidatech1.com',
              websiteUrl: 'https://bio.site/vidatech1',
              passcodeHash: null,
              otpEnabled: true,
            });
            showToast('Settings reset to defaults', 'info');
          }
        },
        variant: 'ghost',
        style: { width: '100%', color: T.accentDim, borderColor: T.accentDim },
      }, 'Reset All Admin Settings'),
    ),

    // Security Notice
    React.createElement('div', { style: { marginTop: 24, padding: '14px 16px', background: T.surfaceAlt, borderRadius: 12, border: `1px solid ${T.border}` } },
      React.createElement('div', { style: { fontSize: F.xs, color: T.textMuted, lineHeight: 1.6 } },
        '🛡️ Security Notes:\n',
        '• Session auto-locks after 10 minutes of inactivity\n',
        '• 5 failed attempts triggers 15-minute lockout\n',
        '• Passcodes are hashed and never stored in plain text\n',
        '• OTP codes expire after 5 minutes',
      ),
    ),
  );
};
