// src/components/PinRestoreModal.js
// Shown when restoring an encrypted backup on a device where the PIN doesn't match
// or no PIN is set — asks the user to enter the PIN from the original device

window.PinRestoreModal = function ({ T, F, onSubmit, onCancel }) {
  const [digits,  setDigits]  = React.useState(['', '', '', '']);
  const [error,   setError]   = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const inputRefs = [React.useRef(), React.useRef(), React.useRef(), React.useRef()];

  const handleDigit = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    setError('');
    if (val && i < 3) inputRefs[i + 1].current?.focus();
  };

  const handleKey = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputRefs[i - 1].current?.focus();
    }
  };

  // R07: paste handler — distribute pasted digits across all 4 fields
  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 4);
    if (!pasted) return;
    const next = ['', '', '', ''];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    setError('');
    // Focus last filled digit or next empty
    const focusIdx = Math.min(pasted.length, 3);
    inputRefs[focusIdx].current?.focus();
  };

  // R02/R03: handleSubmit no longer dismisses modal — stays open on wrong PIN
  const handleSubmit = async () => {
    const pin = digits.join('');
    if (pin.length < 4) { setError('Enter all 4 digits.'); return; }
    setLoading(true);
    setError('');
    // onSubmit receives a pinError callback — if PIN is wrong, modal stays open
    await onSubmit(pin, (pinErr) => {
      setError(pinErr || 'Incorrect PIN — please try again.');
      setDigits(['', '', '', '']);
      setTimeout(() => inputRefs[0].current?.focus(), 50);
    });
    setLoading(false);
  };

  return React.createElement('div', {
    style: {
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 600, padding: 24,
    },
  },
    React.createElement('div', {
      className: 'scale-in',
      style: {
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 22, padding: '32px 28px', width: '100%', maxWidth: 340,
        textAlign: 'center',
      },
    },
      React.createElement('div', { style: { fontSize: 40, marginBottom: 16 } }, '🔒'),

      React.createElement('div', {
        style: { fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: F.lg, color: T.text, marginBottom: 8 },
      }, 'Encrypted Backup'),

      React.createElement('div', {
        style: { fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.textSub, lineHeight: 1.6, marginBottom: 28 },
      }, 'This backup was secured with your PIN. Enter the PIN from the device that created this backup.'),

      // PIN digit inputs
      React.createElement('div', { style: { display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 20 } },
        digits.map((d, i) =>
          React.createElement('input', {
            key: i,
            ref: inputRefs[i],
            type: 'password',
            inputMode: 'numeric',
            maxLength: 1,
            value: d,
            onChange: e => handleDigit(i, e.target.value),
            onKeyDown: e => handleKey(i, e),
            // R07: paste only on first input, distributes to all
            onPaste: i === 0 ? handlePaste : undefined,
            autoFocus: i === 0,
            style: {
              width: 52, height: 60, borderRadius: 12, textAlign: 'center',
              fontSize: 28, fontWeight: 700,
              background: T.bg,
              border: `2px solid ${error ? T.negative : d ? T.accent : T.border}`,
              color: T.text, outline: 'none',
              transition: 'border-color 0.2s',
              fontFamily: "'Inter', sans-serif",
            },
          })
        )
      ),

      // R02/R03: inline error — modal stays open, error shown here
      error && React.createElement('div', {
        style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.negative, marginBottom: 14, padding: '8px 12px', background: T.negative + '18', borderRadius: 8, border: `1px solid ${T.negative}44` },
      }, error),

      React.createElement('div', { style: { display: 'flex', gap: 10 } },
        React.createElement(Btn, {
          onClick: onCancel,
          variant: 'secondary',
          style: { flex: 1 },
        }, 'Cancel'),
        React.createElement(Btn, {
          onClick: handleSubmit,
          style: { flex: 2 },
          disabled: loading || digits.join('').length < 4,
        }, loading ? '🔓 Decrypting…' : 'Unlock Backup'),
      ),

      // S01/S02: transparency about PIN-based encryption strength
      React.createElement('div', {
        style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted, marginTop: 18, lineHeight: 1.6 },
      }, '⚠️ Without the correct PIN, this backup cannot be recovered. Keep your PIN in a safe place.'),
    ),
  );
};
