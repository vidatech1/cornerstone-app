// src/components/SecuritySetup.js
// Shared security setup component used in Onboarding (step 6) and Settings
// Handles: Phantom wallet connection + TOTP authenticator setup
// v0.15

window.SecuritySetup = function ({ T, F, onComplete, onSkip, isSettings = false }) {
  const [walletStatus, setWalletStatus] = React.useState(() => ({
    connected: WalletAuth.isWalletEnabled(),
    pubkey:    WalletAuth.getStoredPubkey(),
  }));
  const [totpStatus,   setTotpStatus]   = React.useState(() => ({
    enabled: TOTPEngine.isEnabled(),
  }));
  const [walletLoading, setWalletLoading] = React.useState(false);
  const [walletErr,     setWalletErr]     = React.useState('');
  const [totpPhase,     setTotpPhase]     = React.useState('idle'); // idle | setup | verify | done
  const [totpSecret,    setTotpSecret]    = React.useState('');
  const [totpInput,     setTotpInput]     = React.useState('');
  const [totpErr,       setTotpErr]       = React.useState('');
  const [totpLoading,   setTotpLoading]   = React.useState(false);
  const [qrUrl,         setQrUrl]         = React.useState('');

  const phantomAvailable = WalletAuth.isPhantomAvailable();

  // ── Phantom connect ───────────────────────────────────────────────────────
  const connectWallet = async () => {
    setWalletLoading(true);
    setWalletErr('');
    try {
      const { pubkey } = await WalletAuth.connect();
      setWalletStatus({ connected: true, pubkey });
      if (window.showToast) showToast('✅ Phantom wallet connected', 'success');
    } catch (err) {
      setWalletErr(err.message);
    }
    setWalletLoading(false);
  };

  const disconnectWallet = async () => {
    await WalletAuth.disconnect();
    setWalletStatus({ connected: false, pubkey: null });
    if (window.showToast) showToast('Phantom wallet disconnected', 'success');
  };

  // ── TOTP setup ────────────────────────────────────────────────────────────
  const startTotpSetup = async () => {
    const secret = TOTPEngine.generateSecret();
    setTotpSecret(secret);
    const pin = localStorage.getItem('ws_pin') || '';
    const uri = TOTPEngine.buildOtpauthUri(secret, `Cornerstone (${pin ? 'secured' : 'no PIN'})`, 'VidaTech');
    setQrUrl(TOTPEngine.buildQRCodeUrl(uri));
    setTotpPhase('setup');
    setTotpInput('');
    setTotpErr('');
  };

  const verifyAndSaveTOTP = async () => {
    if (totpInput.length !== 6) { setTotpErr('Enter the 6-digit code from your app.'); return; }
    setTotpLoading(true);
    setTotpErr('');
    try {
      const valid = await TOTPEngine.verifyCode(totpSecret, totpInput);
      if (!valid) {
        setTotpErr('Code incorrect or expired. Wait for it to refresh and try again.');
        setTotpInput('');
        setTotpLoading(false);
        return;
      }
      // Save the secret encrypted with user's PIN
      const pin = localStorage.getItem('ws_pin') || '';
      await TOTPEngine.saveSecret(totpSecret, pin);
      setTotpStatus({ enabled: true });
      setTotpPhase('done');
      if (window.showToast) showToast('✅ Authenticator app connected', 'success');
    } catch (err) {
      setTotpErr('Could not save authenticator: ' + err.message);
    }
    setTotpLoading(false);
  };

  const disableTOTP = () => {
    TOTPEngine.disable();
    setTotpStatus({ enabled: false });
    setTotpPhase('idle');
    if (window.showToast) showToast('Authenticator app removed', 'success');
  };

  const shortPubkey = (pk) => pk ? `${pk.slice(0, 6)}…${pk.slice(-4)}` : '';

  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },

    !isSettings && React.createElement('div', { style: { textAlign: 'center', marginBottom: 8 } },
      React.createElement('div', { style: { fontSize: 44, marginBottom: 12 } }, '🛡️'),
      React.createElement('h2', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: F.lg, color: T.text, marginBottom: 6 } }, 'Advanced Security'),
      React.createElement('p', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.textSub, lineHeight: 1.65 } },
        'Add a second layer of protection. Both are optional — you can set them up anytime in Settings.'
      ),
    ),

    // ── Phantom Wallet Card ───────────────────────────────────────────────
    React.createElement('div', {
      style: { background: T.surface, borderRadius: 16, padding: '18px 20px', border: `1px solid ${walletStatus.connected ? T.positive + '44' : T.border}` },
    },
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 } },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
          React.createElement('div', { style: { fontSize: 28 } }, '👻'),
          React.createElement('div', null,
            React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: F.base, color: T.text } }, 'Phantom Wallet'),
            React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted, marginTop: 2 } },
              walletStatus.connected
                ? `Connected: ${shortPubkey(walletStatus.pubkey)}`
                : 'Not connected'
            ),
          ),
        ),
        walletStatus.connected
          ? React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
              React.createElement('div', { style: { width: 8, height: 8, borderRadius: '50%', background: T.positive } }),
              React.createElement('span', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.positive } }, 'Active'),
            )
          : React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted } }, 'Optional'),
      ),

      React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textSub, lineHeight: 1.65, marginBottom: 14 } },
        walletStatus.connected
          ? 'Your backup files are encrypted using your Phantom wallet signature. This is significantly stronger than PIN-only encryption.'
          : 'Connect your Phantom wallet to encrypt backups with your wallet signature — cryptographically stronger than a PIN.',
      ),

      walletErr && React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.negative, marginBottom: 10, padding: '8px 10px', background: T.negative + '18', borderRadius: 8 } }, walletErr),

      !phantomAvailable && React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted, marginBottom: 10, padding: '8px 10px', background: T.surfaceAlt, borderRadius: 8 } },
        '⚠️ Phantom is not installed. Visit phantom.app to install it, then return here.'
      ),

      walletStatus.connected
        ? React.createElement(Btn, { onClick: disconnectWallet, variant: 'secondary', style: { width: '100%', fontSize: F.xs } }, 'Disconnect Wallet')
        : React.createElement(Btn, {
            onClick: connectWallet,
            disabled: walletLoading || !phantomAvailable,
            style: { width: '100%', fontSize: F.sm },
          }, walletLoading ? '⏳ Connecting…' : '👻 Connect Phantom Wallet'),
    ),

    // ── TOTP Authenticator Card ───────────────────────────────────────────
    React.createElement('div', {
      style: { background: T.surface, borderRadius: 16, padding: '18px 20px', border: `1px solid ${totpStatus.enabled ? T.positive + '44' : T.border}` },
    },
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 } },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
          React.createElement('div', { style: { fontSize: 28 } }, '🔑'),
          React.createElement('div', null,
            React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: F.base, color: T.text } }, 'Authenticator App'),
            React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted, marginTop: 2 } },
              totpStatus.enabled ? 'Active — codes rotate every 30 seconds' : 'Not configured'
            ),
          ),
        ),
        totpStatus.enabled
          ? React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
              React.createElement('div', { style: { width: 8, height: 8, borderRadius: '50%', background: T.positive } }),
              React.createElement('span', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.positive } }, 'Active'),
            )
          : React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted } }, 'Optional'),
      ),

      React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textSub, lineHeight: 1.65, marginBottom: 14 } },
        totpStatus.enabled
          ? 'A 6-digit code from your authenticator app is required every time you unlock Cornerstone.'
          : 'Works with Proton Authenticator, Google Authenticator, Authy, and any TOTP-compatible app. Works offline.',
      ),

      // TOTP setup flow
      totpPhase === 'setup' && React.createElement('div', { style: { marginBottom: 14 } },
        React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.sm, color: T.accent, marginBottom: 10 } }, 'Step 1 — Scan this QR code'),
        React.createElement('div', { style: { textAlign: 'center', marginBottom: 12 } },
          React.createElement('img', {
            src: qrUrl,
            alt: 'TOTP QR Code',
            style: { width: 180, height: 180, borderRadius: 12, border: `2px solid ${T.border}` },
            onError: e => { e.target.style.display = 'none'; },
          }),
        ),
        React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted, marginBottom: 12, lineHeight: 1.5 } },
          'Open your authenticator app → tap + → Scan QR code → point your camera at the code above.'
        ),
        React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.sm, color: T.accent, marginBottom: 8 } }, 'Step 2 — Verify the code'),
        React.createElement('input', {
          type: 'text', inputMode: 'numeric', value: totpInput,
          onChange: e => setTotpInput(e.target.value.replace(/\D/g, '').slice(0, 6)),
          onKeyDown: e => e.key === 'Enter' && verifyAndSaveTOTP(),
          placeholder: '6-digit code', maxLength: 6, autoFocus: true,
          style: { ...inputStyle(T, F), textAlign: 'center', letterSpacing: 8, fontSize: F.lg, marginBottom: 8 },
        }),
        totpErr && React.createElement('div', { style: { color: T.negative, fontSize: F.xs, marginBottom: 8 } }, totpErr),
        React.createElement('div', { style: { display: 'flex', gap: 8 } },
          React.createElement(Btn, {
            onClick: verifyAndSaveTOTP,
            disabled: totpLoading || totpInput.length < 6,
            style: { flex: 2 },
          }, totpLoading ? 'Verifying…' : 'Verify & Enable'),
          React.createElement(Btn, { onClick: () => setTotpPhase('idle'), variant: 'secondary', style: { flex: 1 } }, 'Cancel'),
        ),
      ),

      totpPhase !== 'setup' && (
        totpStatus.enabled
          ? React.createElement(Btn, { onClick: disableTOTP, variant: 'secondary', style: { width: '100%', fontSize: F.xs } }, 'Remove Authenticator App')
          : React.createElement(Btn, { onClick: startTotpSetup, style: { width: '100%', fontSize: F.sm } }, '🔑 Set Up Authenticator App')
      ),
    ),

    // ── Security level indicator ──────────────────────────────────────────
    React.createElement('div', { style: { padding: '12px 16px', borderRadius: 12, background: T.surface, border: `1px solid ${T.border}` } },
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 } },
        React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted } }, 'Security Level'),
        React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: F.sm, color: walletStatus.connected && totpStatus.enabled ? T.positive : walletStatus.connected || totpStatus.enabled ? T.accent : T.textMuted } },
          walletStatus.connected && totpStatus.enabled ? '🛡️ Maximum'
          : walletStatus.connected ? '🔒 Strong (Wallet)'
          : totpStatus.enabled ? '🔒 Strong (2FA)'
          : '🔑 Baseline (PIN only)'
        ),
      ),
      React.createElement('div', { style: { display: 'flex', gap: 4 } },
        ['PIN', 'Wallet', '2FA'].map((label, i) => {
          const active = i === 0 ? true : i === 1 ? walletStatus.connected : totpStatus.enabled;
          return React.createElement('div', { key: label, style: { flex: 1, height: 4, borderRadius: 2, background: active ? (i === 0 ? T.accent : T.positive) : T.border, transition: 'background 0.3s' } });
        }),
      ),
      React.createElement('div', { style: { display: 'flex', gap: 4, marginTop: 4 } },
        ['PIN', 'Wallet', '2FA'].map((label, i) => {
          const active = i === 0 ? true : i === 1 ? walletStatus.connected : totpStatus.enabled;
          return React.createElement('div', { key: label, style: { flex: 1, fontFamily: "'Inter', sans-serif", fontSize: 9, color: active ? T.textSub : T.textMuted, textAlign: 'center' } }, label);
        }),
      ),
    ),

    // ── Action buttons ────────────────────────────────────────────────────
    !isSettings && React.createElement('div', { style: { display: 'flex', gap: 10, marginTop: 4 } },
      React.createElement(Btn, { onClick: onComplete, style: { flex: 2 } },
        walletStatus.connected || totpStatus.enabled ? '✅ Security configured — Continue →' : 'Continue →'
      ),
      React.createElement(Btn, { onClick: onSkip, variant: 'secondary', style: { flex: 1 } }, 'Skip'),
    ),
  );
};
