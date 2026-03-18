// src/components/PinLock.js
const { useState, useEffect, useContext } = React;

window.PinLock = function ({ onUnlock }) {
  const { T, F } = useContext(AppCtx);
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const hint = localStorage.getItem('ws_hint') || '';

  const check = () => {
    const stored = localStorage.getItem('ws_pin') || '';
    if (pin === stored) {
      onUnlock();
    } else {
      setAttempts(a => a + 1);
      setErr(`Incorrect PIN.${attempts >= 2 && hint ? ' Tap "Show hint" below.' : ''}`);
      setPin('');
    }
  };

  return React.createElement('div', {
    style: { minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }
  },
    React.createElement('div', { className: 'scale-in', style: { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 22, padding: 40, width: '100%', maxWidth: 360, textAlign: 'center' } },
      React.createElement('div', { style: { fontSize: 56, marginBottom: 20 } }, '🔐'),
      React.createElement('h2', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 800, fontSize: F.xl, color: T.text, marginBottom: 8 } }, 'Wealth Score'),
      React.createElement('p', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.textSub, marginBottom: 28, lineHeight: 1.6 } }, 'Enter your PIN to access your financial data'),
      React.createElement('input', {
        type: 'password', inputMode: 'numeric', value: pin,
        onChange: e => setPin(e.target.value),
        onKeyDown: e => e.key === 'Enter' && check(),
        placeholder: '● ● ● ●', maxLength: 8, autoFocus: true,
        style: { ...inputStyle(T, F), textAlign: 'center', fontSize: F.xl + 4, letterSpacing: 12, marginBottom: 8 },
      }),
      err && React.createElement('div', { style: { color: T.negative, fontSize: F.xs, fontFamily: "'Inter', sans-serif", marginBottom: 10 } }, err),
      React.createElement(Btn, { onClick: check, style: { width: '100%', marginTop: 8 } }, 'Unlock'),
      hint && React.createElement('button', {
        onClick: () => setShowHint(p => !p),
        style: { background: 'none', border: 'none', color: T.textMuted, fontSize: F.xs, fontFamily: "'Inter', sans-serif", marginTop: 16, cursor: 'pointer' },
      }, showHint ? 'Hide hint' : 'Forgot PIN? Show hint'),
      showHint && hint && React.createElement('div', { style: { marginTop: 10, background: T.surfaceAlt, borderRadius: 10, padding: '10px 14px', fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.textSub } }, `Hint: ${hint}`),
    )
  );
};

window.PinSetup = function ({ onComplete, onSkip }) {
  const { T, F } = useContext(AppCtx);
  const [step, setStep] = useState('choice'); // choice | set | confirm | hint
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [hint, setHint] = useState('');
  const [err, setErr] = useState('');

  const finish = (withPin) => {
    if (withPin) {
      localStorage.setItem('ws_pin', pin);
      localStorage.setItem('ws_hint', hint);
      localStorage.setItem('ws_hasPin', '1');
    }
    onComplete(withPin);
  };

  if (step === 'choice') return React.createElement('div', { className: 'scale-in', style: { textAlign: 'center' } },
    React.createElement('div', { style: { fontSize: 52, marginBottom: 16 } }, '🔒'),
    React.createElement('h2', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 800, fontSize: F.lg, color: T.text, marginBottom: 10 } }, 'Protect Your Data'),
    React.createElement('p', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.textSub, lineHeight: 1.7, marginBottom: 26 } },
      'Add a PIN? The app will auto-lock after 10 minutes of inactivity.'
    ),
    React.createElement('div', { style: { display: 'flex', gap: 10 } },
      React.createElement(Btn, { onClick: () => setStep('set'), style: { flex: 2 } }, '🔒 Yes, Add PIN'),
      React.createElement(Btn, { onClick: () => finish(false), variant: 'secondary', style: { flex: 1 } }, 'Skip'),
    )
  );

  if (step === 'set') return React.createElement('div', { className: 'scale-in', style: { textAlign: 'center' } },
    React.createElement('h2', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 800, fontSize: F.lg, color: T.text, marginBottom: 8 } }, 'Create Your PIN'),
    React.createElement('p', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.textSub, marginBottom: 20 } }, 'At least 4 digits'),
    React.createElement('input', { type: 'password', inputMode: 'numeric', value: pin, onChange: e => setPin(e.target.value), placeholder: '4+ digits', maxLength: 8, autoFocus: true, style: { ...inputStyle(T, F), textAlign: 'center', fontSize: F.xl, letterSpacing: 10, marginBottom: 8 } }),
    err && React.createElement('div', { style: { color: T.negative, fontSize: F.xs, marginBottom: 8 } }, err),
    React.createElement(Btn, { onClick: () => { if (pin.length < 4) { setErr('At least 4 digits'); return; } setErr(''); setStep('confirm'); }, style: { width: '100%' } }, 'Next →')
  );

  if (step === 'confirm') return React.createElement('div', { className: 'scale-in', style: { textAlign: 'center' } },
    React.createElement('h2', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 800, fontSize: F.lg, color: T.text, marginBottom: 8 } }, 'Confirm PIN'),
    React.createElement('input', { type: 'password', inputMode: 'numeric', value: confirm, onChange: e => setConfirm(e.target.value), placeholder: 'Re-enter', maxLength: 8, autoFocus: true, style: { ...inputStyle(T, F), textAlign: 'center', fontSize: F.xl, letterSpacing: 10, marginBottom: 8 } }),
    err && React.createElement('div', { style: { color: T.negative, fontSize: F.xs, marginBottom: 8 } }, err),
    React.createElement(Btn, { onClick: () => { if (confirm !== pin) { setErr("PINs don't match"); setConfirm(''); return; } setErr(''); setStep('hint'); }, style: { width: '100%' } }, 'Next →')
  );

  return React.createElement('div', { className: 'scale-in', style: { textAlign: 'center' } },
    React.createElement('h2', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 800, fontSize: F.lg, color: T.text, marginBottom: 8 } }, 'Recovery Hint (Optional)'),
    React.createElement('p', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.textSub, marginBottom: 16 } }, 'A hint that reminds you of your PIN without revealing it'),
    React.createElement('input', { value: hint, onChange: e => setHint(e.target.value), placeholder: 'e.g. My old street number', style: { ...inputStyle(T, F), marginBottom: 16 } }),
    React.createElement(Btn, { onClick: () => finish(true), style: { width: '100%' } }, 'Finish Setup →'),
    React.createElement('button', { onClick: () => finish(true), style: { background: 'none', border: 'none', color: T.textMuted, fontSize: F.xs, fontFamily: "'Inter', sans-serif", marginTop: 12, cursor: 'pointer' } }, 'Skip hint'),
  );
};
