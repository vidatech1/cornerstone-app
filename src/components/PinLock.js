// src/components/PinLock.js
// v0.15: 6-digit PIN, TOTP second factor, PIN migration prompt
const { useState, useEffect, useContext } = React;

// ── PinLock — app unlock screen ───────────────────────────────────────────
window.PinLock = function ({ onUnlock }) {
  const { T, F } = useContext(AppCtx);
  const [pin,       setPin]      = useState('');
  const [totpCode,  setTotpCode] = useState('');
  const [phase,     setPhase]    = useState('pin'); // 'pin' | 'totp'
  const [err,       setErr]      = useState('');
  const [showHint,  setShowHint] = useState(false);
  const [attempts,  setAttempts] = useState(0);
  const [checking,  setChecking] = useState(false);

  const hint      = localStorage.getItem('ws_hint') || '';
  const totpOn    = window.TOTPEngine?.isEnabled?.() || false;

  const checkPin = () => {
    const stored = localStorage.getItem('ws_pin') || '';
    if (pin === stored) {
      if (totpOn) {
        // PIN correct — proceed to TOTP step
        setPhase('totp');
        setPin('');
        setErr('');
      } else {
        onUnlock();
      }
    } else {
      setAttempts(a => a + 1);
      setErr(`Incorrect PIN.${attempts >= 2 && hint ? ' Tap "Show hint" below.' : ''}`);
      setPin('');
    }
  };

  const checkTotp = async () => {
    if (totpCode.length !== 6) { setErr('Enter the 6-digit code from your authenticator app.'); return; }
    setChecking(true);
    setErr('');
    try {
      const storedPin = localStorage.getItem('ws_pin') || '';
      const secret    = await TOTPEngine.loadSecret(storedPin);
      if (!secret) {
        // TOTP secret missing — fail open with warning (user must re-setup)
        console.warn('[PinLock] TOTP secret missing — allowing unlock with PIN only');
        onUnlock();
        return;
      }
      const valid = await TOTPEngine.verifyCode(secret, totpCode);
      if (valid) {
        onUnlock();
      } else {
        setErr('Incorrect code. Codes refresh every 30 seconds — try again.');
        setTotpCode('');
      }
    } catch (err) {
      console.warn('[PinLock] TOTP check error:', err.message);
      setErr('Could not verify code. Please try again.');
      setTotpCode('');
    }
    setChecking(false);
  };

  const iStyle = inputStyle(T, F);

  // ── TOTP phase ────────────────────────────────────────────────────────────
  if (phase === 'totp') return React.createElement('div', {
    style: { minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  },
    React.createElement('div', { className: 'scale-in', style: { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 22, padding: 40, width: '100%', maxWidth: 360, textAlign: 'center' } },
      React.createElement('div', { style: { fontSize: 48, marginBottom: 16 } }, '🔐'),
      React.createElement('h2', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: F.lg, color: T.text, marginBottom: 8 } }, 'Two-Factor Verification'),
      React.createElement('p', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.textSub, marginBottom: 24, lineHeight: 1.6 } },
        'Enter the 6-digit code from your authenticator app.'
      ),
      React.createElement('input', {
        type: 'text', inputMode: 'numeric', value: totpCode,
        onChange: e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6)),
        onKeyDown: e => e.key === 'Enter' && checkTotp(),
        placeholder: '● ● ● ● ● ●', maxLength: 6, autoFocus: true,
        style: { ...iStyle, textAlign: 'center', fontSize: F.xl, letterSpacing: 10, marginBottom: 8 },
      }),
      err && React.createElement('div', { style: { color: T.negative, fontSize: F.xs, fontFamily: "'Inter', sans-serif", marginBottom: 10 } }, err),
      React.createElement(Btn, {
        onClick: checkTotp,
        disabled: checking || totpCode.length < 6,
        style: { width: '100%', marginTop: 8 },
      }, checking ? 'Verifying…' : 'Verify Code'),
      React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted, marginTop: 16, lineHeight: 1.5 } },
        'Open Proton Authenticator, Google Authenticator, or your TOTP app to find the code for Cornerstone.'
      ),
    )
  );

  // ── PIN phase ─────────────────────────────────────────────────────────────
  return React.createElement('div', {
    style: { minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  },
    React.createElement('div', { className: 'scale-in', style: { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 22, padding: 40, width: '100%', maxWidth: 360, textAlign: 'center' } },
      React.createElement('div', { style: { fontSize: 56, marginBottom: 20 } }, '🔐'),
      React.createElement('h2', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: F.xl, color: T.text, marginBottom: 8 } }, 'Cornerstone'),
      React.createElement('p', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.textSub, marginBottom: 28, lineHeight: 1.6 } },
        totpOn ? 'Enter your PIN — then verify with your authenticator app.' : 'Enter your PIN to access your financial data.'
      ),
      React.createElement('input', {
        type: 'password', inputMode: 'numeric', value: pin,
        onChange: e => setPin(e.target.value),
        onKeyDown: e => e.key === 'Enter' && checkPin(),
        placeholder: '● ● ● ● ● ●', maxLength: 10, autoFocus: true,
        style: { ...iStyle, textAlign: 'center', fontSize: F.xl, letterSpacing: 12, marginBottom: 8 },
      }),
      err && React.createElement('div', { style: { color: T.negative, fontSize: F.xs, fontFamily: "'Inter', sans-serif", marginBottom: 10 } }, err),
      React.createElement(Btn, { onClick: checkPin, style: { width: '100%', marginTop: 8 } }, 'Unlock'),
      totpOn && React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 14 } },
        React.createElement('div', { style: { width: 6, height: 6, borderRadius: '50%', background: T.positive } }),
        React.createElement('span', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted } }, '2-factor authentication active'),
      ),
      hint && React.createElement('button', {
        onClick: () => setShowHint(p => !p),
        style: { background: 'none', border: 'none', color: T.textMuted, fontSize: F.xs, fontFamily: "'Inter', sans-serif", marginTop: 16, cursor: 'pointer' },
      }, showHint ? 'Hide hint' : 'Forgot PIN? Show hint'),
      showHint && hint && React.createElement('div', { style: { marginTop: 10, background: T.surfaceAlt, borderRadius: 10, padding: '10px 14px', fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.textSub } },
        `Hint: ${hint}`
      ),
    )
  );
};

// ── PinSetup — PIN creation during onboarding/settings ───────────────────
// v0.15: minimum 6 digits, migration prompt for existing 4-digit users
window.PinSetup = function ({ onComplete, onSkip, isMigration = false }) {
  const { T, F } = useContext(AppCtx);
  const [step,    setStep]    = useState(isMigration ? 'set' : 'choice');
  const [pin,     setPin]     = useState('');
  const [confirm, setConfirm] = useState('');
  const [hint,    setHint]    = useState('');
  const [err,     setErr]     = useState('');

  const MIN_PIN = 6;

  const finish = (withPin) => {
    if (withPin) {
      localStorage.setItem('ws_pin',    pin);
      localStorage.setItem('ws_hint',   hint);
      localStorage.setItem('ws_hasPin', '1');
    }
    onComplete(withPin);
  };

  if (step === 'choice') return React.createElement('div', { className: 'scale-in', style: { textAlign: 'center' } },
    React.createElement('div', { style: { fontSize: 52, marginBottom: 16 } }, '🔒'),
    React.createElement('h2', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: F.lg, color: T.text, marginBottom: 10 } }, 'Protect Your Data'),
    React.createElement('p', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.textSub, lineHeight: 1.7, marginBottom: 8 } },
      'Add a 6-digit PIN? The app will auto-lock after 10 minutes of inactivity.'
    ),
    React.createElement('p', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted, lineHeight: 1.6, marginBottom: 24 } },
      'You can also add Phantom wallet authentication or an authenticator app in Settings for stronger security.'
    ),
    React.createElement('div', { style: { display: 'flex', gap: 10 } },
      React.createElement(Btn, { onClick: () => setStep('set'), style: { flex: 2 } }, '🔒 Yes, Add PIN'),
      React.createElement(Btn, { onClick: () => finish(false), variant: 'secondary', style: { flex: 1 } }, 'Skip'),
    )
  );

  if (step === 'set') return React.createElement('div', { className: 'scale-in', style: { textAlign: 'center' } },
    React.createElement('h2', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: F.lg, color: T.text, marginBottom: 8 } },
      isMigration ? 'Upgrade to 6-Digit PIN' : 'Create Your PIN'
    ),
    isMigration && React.createElement('p', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.accent, marginBottom: 12, padding: '8px 12px', background: T.accentGlow, borderRadius: 8 } },
      '🔒 6-digit PINs are 100× harder to brute-force than 4-digit PINs.'
    ),
    React.createElement('p', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.textSub, marginBottom: 20 } },
      `Minimum ${MIN_PIN} digits`
    ),
    React.createElement('input', {
      type: 'password', inputMode: 'numeric', value: pin,
      onChange: e => setPin(e.target.value),
      onKeyDown: e => e.key === 'Enter' && (() => {
        if (pin.length < MIN_PIN) { setErr(`At least ${MIN_PIN} digits required`); return; }
        setErr(''); setStep('confirm');
      })(),
      placeholder: `${MIN_PIN}+ digits`, maxLength: 12, autoFocus: true,
      style: { ...inputStyle(T, F), textAlign: 'center', fontSize: F.xl, letterSpacing: 10, marginBottom: 8 },
    }),
    err && React.createElement('div', { style: { color: T.negative, fontSize: F.xs, marginBottom: 8 } }, err),
    React.createElement(Btn, {
      onClick: () => {
        if (pin.length < MIN_PIN) { setErr(`At least ${MIN_PIN} digits required`); return; }
        setErr(''); setStep('confirm');
      },
      style: { width: '100%' },
    }, 'Next →')
  );

  if (step === 'confirm') return React.createElement('div', { className: 'scale-in', style: { textAlign: 'center' } },
    React.createElement('h2', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: F.lg, color: T.text, marginBottom: 8 } }, 'Confirm PIN'),
    React.createElement('p', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.textSub, marginBottom: 20 } }, 'Enter your PIN again to confirm'),
    React.createElement('input', {
      type: 'password', inputMode: 'numeric', value: confirm,
      onChange: e => setConfirm(e.target.value),
      onKeyDown: e => e.key === 'Enter' && (() => {
        if (confirm !== pin) { setErr("PINs don't match"); setConfirm(''); return; }
        setErr(''); setStep('hint');
      })(),
      placeholder: 'Re-enter PIN', maxLength: 12, autoFocus: true,
      style: { ...inputStyle(T, F), textAlign: 'center', fontSize: F.xl, letterSpacing: 10, marginBottom: 8 },
    }),
    err && React.createElement('div', { style: { color: T.negative, fontSize: F.xs, marginBottom: 8 } }, err),
    React.createElement(Btn, {
      onClick: () => {
        if (confirm !== pin) { setErr("PINs don't match"); setConfirm(''); return; }
        setErr(''); setStep('hint');
      },
      style: { width: '100%' },
    }, 'Next →')
  );

  // Hint step
  return React.createElement('div', { className: 'scale-in', style: { textAlign: 'center' } },
    React.createElement('h2', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: F.lg, color: T.text, marginBottom: 8 } }, 'Recovery Hint (Optional)'),
    React.createElement('p', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.textSub, marginBottom: 16 } },
      'A hint that reminds you of your PIN without revealing it.'
    ),
    React.createElement('input', {
      value: hint, onChange: e => setHint(e.target.value),
      placeholder: 'e.g. My old street number',
      style: { ...inputStyle(T, F), marginBottom: 16 },
    }),
    React.createElement(Btn, { onClick: () => finish(true), style: { width: '100%' } }, 'Finish Setup →'),
    React.createElement('button', {
      onClick: () => finish(true),
      style: { background: 'none', border: 'none', color: T.textMuted, fontSize: F.xs, fontFamily: "'Inter', sans-serif", marginTop: 12, cursor: 'pointer' },
    }, 'Skip hint'),
  );
};

// ── PinMigrationBanner — shown once to users with 4-digit PINs ────────────
window.PinMigrationBanner = function ({ T, F, onUpgrade, onDismiss }) {
  return React.createElement('div', {
    style: {
      background: T.accentGlow, border: `1px solid ${T.accent}44`,
      borderRadius: 14, padding: '14px 18px', marginBottom: 16,
      display: 'flex', alignItems: 'center', gap: 14,
    },
  },
    React.createElement('div', { style: { fontSize: 28, flexShrink: 0 } }, '🔒'),
    React.createElement('div', { style: { flex: 1 } },
      React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: F.sm, color: T.accent, marginBottom: 4 } },
        'Upgrade to 6-Digit PIN'
      ),
      React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textSub, lineHeight: 1.5 } },
        'Cornerstone now supports 6-digit PINs — 100× stronger than your current 4-digit PIN.'
      ),
    ),
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 } },
      React.createElement(Btn, { onClick: onUpgrade, style: { fontSize: F.xs, padding: '6px 12px' } }, 'Upgrade'),
      React.createElement('button', {
        onClick: onDismiss,
        style: { background: 'none', border: 'none', color: T.textMuted, fontSize: F.xs, fontFamily: "'Inter', sans-serif", cursor: 'pointer', textAlign: 'center' },
      }, 'Not now'),
    ),
  );
};
