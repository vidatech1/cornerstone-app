// src/pages/Onboarding.js
const { useState, useContext, useRef } = React;

window.Onboarding = function ({ onComplete }) {
  const { T, F } = useContext(AppCtx);
  const [step, setStep]       = useState(0);
  const [profile, setProfile] = useState({ name: '', age: '', city: '', gender: '', occupation: '' });
  const [income,  setIncome]  = useState({ job: '', business: '', dividends: '' });
  const [accounts, setAccounts]   = useState([]);
  const [addingAcct, setAddingAcct] = useState(false);
  const [acctForm,   setAcctForm]   = useState({ label: '', type: 'cash', subtype: 'checking', amount: '', monthlyContrib: '' });
  const [err, setErr]           = useState('');
  const [folderHandle,  setFolderHandle]  = useState(null);
  const [folderPicking, setFolderPicking] = useState(false);
  const [backupFreq,    setBackupFreq]    = useState('weekly');
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const fileInputRef = useRef(null);

  // 0 Welcome · 1 About You · 2 Income · 3 Accounts · 4 Backup · 5 PIN · 6 Done
  const STEPS  = ['Welcome', 'About You', 'Income', 'Accounts', 'Backup', 'Security', 'All Set!'];
  const pct    = Math.round((step / (STEPS.length - 1)) * 100);
  const setP   = (k, v) => setProfile(p => ({ ...p, [k]: v }));
  const iStyle = inputStyle(T, F);
  const fsOK   = supportsFileSystemAccess();

  // Handle restore from backup file
  const [restoreStatus, setRestoreStatus] = useState(''); // Progress messages
  
  const [pinPrompt,    setPinPrompt]    = useState(null); // { onSubmit } | null

  const handleRestoreClick = () => {
    setRestoreError('');
    setRestoreStatus('');
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    // S05: reject files over 5MB before parsing — legitimate backups are ~8KB
    if (file.size > 5 * 1024 * 1024) {
      setRestoreError('File is too large to be a valid Cornerstone backup. Please select your .json backup file.');
      return;
    }

    setRestoring(true);
    setRestoreError('');
    setRestoreStatus('Reading backup file...');

    // R01: timeout is a safety net — cleared immediately when doRestore begins
    // to prevent it firing mid-restore on slow devices
    let timeoutFired = false;
    const timeout = setTimeout(() => {
      timeoutFired = true;
      setRestoring(false);
      setRestoreStatus('');
      setRestoreError('Restore timed out. Please try again or check the file.');
    }, 15000);

    try {
      let text;
      if (typeof file.text === 'function') {
        text = await file.text();
      } else {
        text = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = ev => resolve(ev.target.result);
          reader.onerror = () => reject(new Error('FileReader failed'));
          reader.readAsText(file);
        });
      }

      let data;
      try { data = JSON.parse(text); }
      catch {
        clearTimeout(timeout);
        setRestoring(false);
        setRestoreStatus('');
        setRestoreError('Could not restore: the file appears to be corrupted or is not a valid Cornerstone backup.');
        return;
      }

      setRestoreStatus('Decrypting and restoring...');

      // R01: doRestore clears timeout FIRST before any async DB operations
      const doRestore = async () => {
        clearTimeout(timeout); // R01: prevents timeout firing mid-restore
        if (timeoutFired) return; // already timed out — abort silently
        setRestoreStatus('Restoring accounts...');
        const [prof, inc, accts] = await Promise.all([
          DB.getSetting('profile'),
          DB.getSetting('income'),
          DB.getAccounts(),
        ]);
        setRestoreStatus('Complete!');
        await new Promise(r => setTimeout(r, 400));
        setRestoring(false);
        setRestoreStatus('');
        if (window.playSuccess) window.playSuccess();
        showToast('Data restored successfully!', 'success');
        onComplete(prof || {}, inc || { job: 0, business: 0, dividends: 0 }, accts || []);
      };

      restoreFromParsed(
        data,
        doRestore,
        (errorMsg) => {
          clearTimeout(timeout);
          setRestoring(false);
          setRestoreStatus('');
          setRestoreError(errorMsg);
        },
        (onSubmit) => {
          clearTimeout(timeout);
          setRestoring(false);
          setRestoreStatus('');
          setPinPrompt({ onSubmit });
        },
      );
    } catch (err) {
      clearTimeout(timeout);
      setRestoring(false);
      setRestoreStatus('');
      setRestoreError('Could not restore: unable to read the file on this device. Please try again.');
    }
  };

  const addAccount = () => {
    if (!acctForm.label || !acctForm.amount) { setErr('Please fill in account name and balance.'); return; }
    setAccounts(prev => [...prev, { ...acctForm, id: uid(), amount: parseFloat(acctForm.amount) || 0, monthlyContrib: parseFloat(acctForm.monthlyContrib) || 0, positions: [] }]);
    setAcctForm({ label: '', type: 'cash', subtype: 'checking', amount: '', monthlyContrib: '' });
    setAddingAcct(false); setErr('');
  };

  const handlePickFolder = async () => {
    setFolderPicking(true);
    const handle = await pickBackupFolder();
    setFolderPicking(false);
    if (handle) setFolderHandle(handle);
  };

  const finish = async () => {
    const finalProfile = { ...profile, age: parseInt(profile.age) || 0 };
    const finalIncome  = { job: parseFloat(income.job) || 0, business: parseFloat(income.business) || 0, dividends: parseFloat(income.dividends) || 0 };
    await DB.setSetting('profile',         finalProfile);
    await DB.setSetting('income',          finalIncome);
    await DB.setSetting('onboarded',       true);
    await DB.setSetting('backupFrequency', backupFreq);
    if (folderHandle) {
      await DB.setSetting('backupFolderHandle', folderHandle);
      await DB.setSetting('backupFolderName',   folderHandle.name);
    }
    for (const a of accounts) await DB.saveAccount(a);
    onComplete(finalProfile, finalIncome, accounts);
  };

  const freqOpts = [
    { k: 'launch',  label: 'Every time I open the app', note: 'Maximum safety'         },
    { k: 'daily',   label: 'Daily',                     note: 'Great for active users'  },
    { k: 'weekly',  label: 'Weekly',                    note: 'Recommended ★'           },
    { k: 'monthly', label: 'Monthly',                   note: 'Light touch'             },
    { k: 'manual',  label: 'Manual only',               note: "I'll handle it myself"   },
  ];

  // Shared progress bar
  const Progress = React.createElement('div', { style: { marginBottom: 26 } },
    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 7 } },
      React.createElement('span', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 500, fontSize: F.sm, color: T.accent } }, STEPS[step]),
      React.createElement('span', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted } }, `${step + 1} of ${STEPS.length}`),
    ),
    React.createElement('div', { style: { height: 5, background: T.border || 'rgba(212,148,58,0.08)', borderRadius: 3, overflow: 'hidden' } },
      React.createElement('div', { style: { height: '100%', width: `${pct}%`, background: T.amberGrad || 'linear-gradient(90deg,#8a6830,#e8a84a)', borderRadius: 3, transition: 'width 0.45s ease' } }),
    ),
    React.createElement('div', { style: { display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 } },
      ...STEPS.map((_, i) => React.createElement('div', { key: i, style: { width: i === step ? 20 : 8, height: 8, borderRadius: 4, background: i < step ? T.accentBright : i === step ? T.accent : T.border, transition: 'all 0.3s ease' } }))
    ),
  );

  return React.createElement('div', { style: { minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 } },
    // Hidden file input for restore - always rendered so it works from any step
    React.createElement('input', {
      ref: fileInputRef,
      type: 'file',
      accept: '.wealthscore,.json,application/json,text/plain',
      style: { display: 'none' },
      onChange: handleFileSelect,
    }),

    // PIN entry modal for encrypted backup restore
    pinPrompt && React.createElement(PinRestoreModal, {
      T, F,
      onSubmit: async (pin, onPinError) => {
        // R02: pass onPinError so modal stays open and shows error inline on wrong PIN
        setRestoring(true);
        setRestoreStatus('Decrypting backup...');
        await pinPrompt.onSubmit(pin, onPinError);
        setRestoring(false);
        setRestoreStatus('');
      },
      onCancel: () => { setPinPrompt(null); setRestoreError('Restore cancelled.'); },
    }),
    
    React.createElement('div', { className: 'fade-up', style: { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 22, padding: 34, width: '100%', maxWidth: 540 } },
      Progress,

      // ── 0: Welcome ───────────────────────────────────────────────────────
      step === 0 && React.createElement('div', { style: { textAlign: 'center' } },
        
        React.createElement('div', { style: { marginBottom: 20 } },
          React.createElement('svg', { viewBox: '0 0 48 48', width: 64, height: 64 },
            React.createElement('rect', { x: 8, y: 24, width: 16, height: 16, rx: 3, fill: '#d4943a', opacity: 0.9 }),
            React.createElement('rect', { x: 24, y: 24, width: 16, height: 16, rx: 3, fill: '#8a6830', opacity: 0.6 }),
            React.createElement('rect', { x: 16, y: 8, width: 16, height: 16, rx: 3, fill: '#5a6a7a', opacity: 0.4 }),
          ),
        ),
        React.createElement('h1', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: F.xl + 4, color: T.text, marginBottom: 10 } }, 'Welcome to Cornerstone'),
        React.createElement('p', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.base, color: T.textSub, lineHeight: 1.75, marginBottom: 18 } },
          'Build wealth that lasts. Your private, offline-first financial tracker. Everything stays on your device.'
        ),
        React.createElement('div', { style: { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 28 } },
          ...['📵 Offline-first', '🔒 PIN lock', '📊 Position Score', '📑 PDF reports', '💾 Auto-backup'].map(f =>
            React.createElement('span', { key: f, style: { background: T.accentGlow, border: `1px solid ${T.border}`, borderRadius: 20, padding: '6px 14px', fontSize: F.xs, color: T.textSub, fontFamily: "'Inter', sans-serif", fontWeight: 500 } }, f)
          )
        ),
        
        // Two equal buttons: Start Fresh OR Restore
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
          React.createElement(Btn, { onClick: () => setStep(1), disabled: restoring, style: { width: '100%', fontSize: F.md, padding: '14px' } }, "🚀 Start Fresh"),
          
          // OR divider
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' } },
            React.createElement('div', { style: { flex: 1, height: 1, background: T.border } }),
            React.createElement('span', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted, fontWeight: 500 } }, 'OR'),
            React.createElement('div', { style: { flex: 1, height: 1, background: T.border } }),
          ),
          
          // Restore button - now prominent with progress
          React.createElement(Btn, { 
            onClick: handleRestoreClick, 
            variant: 'secondary',
            disabled: restoring,
            style: { 
              width: '100%', 
              fontSize: F.md, 
              padding: '14px',
              background: restoring ? T.accentGlow : T.surface,
              border: `2px solid ${T.accent}`,
              color: T.accent,
            } 
          }, 
            restoring 
              ? React.createElement('span', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 } },
                  React.createElement('span', { className: 'spin', style: { display: 'inline-block' } }, '⏳'),
                  restoreStatus || 'Restoring...'
                )
              : '📂 Restore from Backup'
          ),
          
          // Progress bar when restoring
          restoring && React.createElement('div', { style: { marginTop: 4 } },
            React.createElement('div', { style: { height: 4, background: T.border, borderRadius: 2, overflow: 'hidden' } },
              React.createElement('div', { 
                className: 'progress-bar',
                style: { 
                  height: '100%', 
                  background: T.accent, 
                  borderRadius: 2,
                  animation: 'progress 1.5s ease-in-out infinite',
                } 
              }),
            ),
          ),
        ),
        
        // Helper text
        React.createElement('p', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted, marginTop: 16, lineHeight: 1.6 } },
          'Switching devices or restoring your data? Tap "Restore from Backup" and select your Cornerstone backup file (.json) from iCloud Drive or your Downloads folder.'
        ),
        
        // Error message
        restoreError && React.createElement('div', { 
          style: { 
            marginTop: 12, 
            padding: '10px 14px', 
            background: 'rgba(220,38,38,0.1)', 
            border: '1px solid rgba(220,38,38,0.3)', 
            borderRadius: 10,
            fontSize: F.xs,
            color: '#dc2626',
            fontFamily: "'Inter', sans-serif",
          } 
        }, restoreError),
      ),

      // ── 1: About You ─────────────────────────────────────────────────────
      step === 1 && React.createElement('div', null,
        React.createElement('h2', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 500, fontSize: F.lg, color: T.text, marginBottom: 20 } }, 'Tell us about yourself'),
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
          React.createElement('div', null, React.createElement(Lbl, null, 'Your First Name'),
            React.createElement('input', { value: profile.name, onChange: e => setP('name', e.target.value), placeholder: 'e.g. Marcus', style: iStyle, autoFocus: true })),
          React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } },
            React.createElement('div', null, React.createElement(Lbl, null, 'Age'), React.createElement('input', { type: 'number', value: profile.age, onChange: e => setP('age', e.target.value), placeholder: '34', style: iStyle })),
            React.createElement('div', null, React.createElement(Lbl, null, 'City / Region'), React.createElement('input', { value: profile.city, onChange: e => setP('city', e.target.value), placeholder: 'Trenton, NJ', style: iStyle })),
          ),
          React.createElement('div', null, React.createElement(Lbl, null, 'Gender'),
            React.createElement('div', { style: { display: 'flex', gap: 7, flexWrap: 'wrap' } },
              ...['Male', 'Female'].map(g =>
                React.createElement('button', { key: g, onClick: () => setP('gender', g), style: { flex: 1, minWidth: 100, padding: '12px 4px', borderRadius: 10, border: `1px solid ${profile.gender === g ? T.accent : T.border}`, background: profile.gender === g ? T.accentGlow : 'transparent', color: profile.gender === g ? T.accent : T.textMuted, fontSize: F.sm, fontFamily: "'Inter', sans-serif", fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' } }, g)
              )
            )
          ),
          React.createElement('div', null, React.createElement(Lbl, null, 'Occupation'),
            React.createElement('select', { value: profile.occupation, onChange: e => setP('occupation', e.target.value), style: iStyle },
              React.createElement('option', { value: '' }, 'Select…'),
              ...OCCUPATION_OPTS.map(o => React.createElement('option', { key: o, value: o }, o)),
            )
          ),
          err && React.createElement('div', { style: { color: T.negative, fontSize: F.xs } }, err),
          React.createElement('div', { style: { display: 'flex', gap: 10, marginTop: 4 } },
            React.createElement(Btn, { onClick: () => { setErr(''); setStep(0); }, variant: 'secondary', style: { flex: 1 } }, '← Back'),
            React.createElement(Btn, { onClick: () => { if (!profile.name.trim()) { setErr('Please enter your name.'); return; } setErr(''); setStep(2); }, style: { flex: 2 } }, 'Continue →'),
          ),
          
          // Quick restore link for users who missed the Welcome screen
          React.createElement('div', { style: { marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.border}`, textAlign: 'center' } },
            React.createElement('span', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted } }, 'Have a backup file? '),
            React.createElement('button', { 
              onClick: handleRestoreClick,
              disabled: restoring,
              style: { 
                background: 'none', 
                border: 'none', 
                color: T.accent, 
                fontSize: F.xs, 
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                textDecoration: 'underline',
                cursor: 'pointer',
              } 
            }, restoring ? 'Restoring...' : 'Restore from Backup →'),
            
            // Restore error on step 1
            restoreError && React.createElement('div', { 
              style: { 
                marginTop: 10, 
                padding: '8px 12px', 
                background: 'rgba(220,38,38,0.1)', 
                border: '1px solid rgba(220,38,38,0.3)', 
                borderRadius: 8,
                fontSize: F.xs - 1,
                color: '#dc2626',
                fontFamily: "'Inter', sans-serif",
              } 
            }, restoreError),
          ),
        ),
      ),

      // ── 2: Income ────────────────────────────────────────────────────────
      step === 2 && React.createElement('div', null,
        React.createElement('h2', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 500, fontSize: F.lg, color: T.text, marginBottom: 6 } }, 'Monthly Income'),
        React.createElement('p', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.textSub, marginBottom: 20, lineHeight: 1.6 } }, 'Approximate is fine — you can update anytime.'),
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
          ...([['job','💼 Job / Employment (after tax)','5000'],['business','🏪 Business / Freelance / Side income','0'],['dividends','📈 Investments / Dividends','0']]).map(([k,lbl,ph]) =>
            React.createElement('div', { key: k }, React.createElement(Lbl, null, lbl),
              React.createElement('input', { type: 'number', value: income[k], onChange: e => setIncome(p => ({ ...p, [k]: e.target.value })), placeholder: ph, style: iStyle }))
          ),
          React.createElement('div', { style: { display: 'flex', gap: 10, marginTop: 4 } },
            React.createElement(Btn, { onClick: () => setStep(1), variant: 'secondary', style: { flex: 1 } }, '← Back'),
            React.createElement(Btn, { onClick: () => setStep(3), style: { flex: 2 } }, 'Continue →'),
          ),
        ),
      ),

      // ── 3: Accounts ──────────────────────────────────────────────────────
      step === 3 && React.createElement('div', null,
        React.createElement('h2', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 500, fontSize: F.lg, color: T.text, marginBottom: 6 } }, 'Add Your Accounts'),
        React.createElement('p', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.textSub, marginBottom: 16, lineHeight: 1.55 } }, 'Add checking, savings, investments, and debts. You can add more later.'),
        accounts.length > 0 && React.createElement('div', { style: { marginBottom: 12, maxHeight: 170, overflowY: 'auto' } },
          ...accounts.map(a =>
            React.createElement('div', { key: a.id, style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: T.surfaceAlt, borderRadius: 10, marginBottom: 6, border: `1px solid ${T.border}` } },
              React.createElement('div', null,
                React.createElement('span', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 700, fontSize: F.sm, color: T.text } }, a.label),
                React.createElement('span', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted, marginLeft: 8 } }, `${TYPE_META[a.type]?.label}`),
              ),
              React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                React.createElement('span', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 700, fontSize: F.sm, color: TYPE_META[a.type]?.color } }, fmt(a.amount)),
                React.createElement('button', { onClick: () => setAccounts(p => p.filter(x => x.id !== a.id)), style: { background: 'none', border: 'none', color: T.negative, fontSize: F.md, cursor: 'pointer' } }, '✕'),
              ),
            )
          )
        ),
        addingAcct
          ? React.createElement('div', { style: { background: T.surfaceAlt, borderRadius: 12, padding: 15, border: `1px solid ${T.border}`, marginBottom: 12 } },
              React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 9 } },
                React.createElement('input', { value: acctForm.label, onChange: e => setAcctForm(p => ({ ...p, label: e.target.value })), placeholder: 'Account name', style: { ...iStyle, fontSize: F.sm }, autoFocus: true }),
                React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
                  React.createElement('select', { value: acctForm.type, onChange: e => { const s = Object.keys(SUBTYPE_MAP[e.target.value]||{})[0]||''; setAcctForm(p => ({...p, type: e.target.value, subtype: s})); }, style: { ...iStyle, fontSize: F.sm } },
                    ...Object.entries(TYPE_META).map(([k,v]) => React.createElement('option', { key: k, value: k }, v.label))
                  ),
                  React.createElement('select', { value: acctForm.subtype, onChange: e => setAcctForm(p => ({...p, subtype: e.target.value})), style: { ...iStyle, fontSize: F.sm } },
                    ...Object.entries(SUBTYPE_MAP[acctForm.type]||{}).map(([k,v]) => React.createElement('option', { key: k, value: k }, v))
                  ),
                ),
                React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
                  React.createElement('input', { type: 'number', value: acctForm.amount, onChange: e => setAcctForm(p => ({...p, amount: e.target.value})), placeholder: 'Balance ($)', style: { ...iStyle, fontSize: F.sm } }),
                  React.createElement('input', { type: 'number', value: acctForm.monthlyContrib, onChange: e => setAcctForm(p => ({...p, monthlyContrib: e.target.value})), placeholder: 'Monthly contrib ($)', style: { ...iStyle, fontSize: F.sm } }),
                ),
                err && React.createElement('div', { style: { color: T.negative, fontSize: F.xs } }, err),
                React.createElement('div', { style: { display: 'flex', gap: 8 } },
                  React.createElement(Btn, { onClick: addAccount, style: { flex: 2 } }, 'Add Account'),
                  React.createElement(Btn, { onClick: () => { setAddingAcct(false); setErr(''); }, variant: 'secondary', style: { flex: 1 } }, 'Cancel'),
                ),
              )
            )
          : React.createElement('button', {
              onClick: () => setAddingAcct(true),
              style: { width: '100%', padding: '12px', background: 'none', border: `2px dashed ${T.border}`, borderRadius: 12, color: T.accent, fontSize: F.base, fontFamily: "'Inter', sans-serif", fontWeight: 500, marginBottom: 12, cursor: 'pointer', transition: 'border-color 0.2s' },
              onMouseEnter: e => e.currentTarget.style.borderColor = T.accent,
              onMouseLeave: e => e.currentTarget.style.borderColor = T.border,
            }, '+ Add an Account'),
        React.createElement('div', { style: { display: 'flex', gap: 10 } },
          React.createElement(Btn, { onClick: () => setStep(2), variant: 'secondary', style: { flex: 1 } }, '← Back'),
          React.createElement(Btn, { onClick: () => setStep(4), style: { flex: 2 } }, accounts.length === 0 ? 'Skip for Now →' : 'Continue →'),
        ),
      ),

      // ── 4: Backup Setup ──────────────────────────────────────────────────
      step === 4 && React.createElement('div', null,
        React.createElement('div', { style: { textAlign: 'center', marginBottom: 22 } },
          React.createElement('div', { style: { fontSize: 52, marginBottom: 12 } }, '🗂️'),
          React.createElement('h2', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 500, fontSize: F.lg + 1, color: T.text, marginBottom: 8 } }, 'Choose Your Backup Home'),
          React.createElement('p', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.textSub, lineHeight: 1.7 } },
            'Set it once — Cornerstone handles the rest automatically. Your data stays on your device, private and safe.'
          ),
        ),

        // Folder picker
        React.createElement('div', { style: { marginBottom: 16 } },
          folderHandle
            ? React.createElement('div', { style: { background: '#052e16', border: '1px solid #d4943a55', borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 } },
                React.createElement('div', { style: { fontSize: 32 } }, '✅'),
                React.createElement('div', { style: { flex: 1 } },
                  React.createElement('div', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 800, fontSize: F.base, color: '#e8a84a', marginBottom: 3 } }, `Backups will save to: ${folderHandle.name}`),
                  React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: 'rgba(212,148,58,0.6)', lineHeight: 1.5 } },
                    'If this folder syncs with iCloud or Google Drive, your data is automatically in the cloud too.'
                  ),
                ),
                React.createElement('button', { onClick: handlePickFolder, style: { background: 'none', border: '1px solid #d4943a55', borderRadius: 8, color: '#e8a84a', fontSize: F.xs, fontFamily: "'Playfair Display', sans-serif", fontWeight: 700, padding: '6px 11px', cursor: 'pointer' } }, 'Change'),
              )
            : fsOK
              ? React.createElement('button', {
                  onClick: handlePickFolder, disabled: folderPicking,
                  style: { width: '100%', background: T.cyanDim, border: `2px solid ${T.cyan}55`, borderRadius: 16, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: folderPicking ? 'wait' : 'pointer', transition: 'all 0.2s', textAlign: 'left' },
                  onMouseEnter: e => e.currentTarget.style.borderColor = T.cyan,
                  onMouseLeave: e => e.currentTarget.style.borderColor = T.cyan + '55',
                },
                  React.createElement('div', { style: { fontSize: 34, flexShrink: 0 } }, folderPicking ? '⏳' : '📁'),
                  React.createElement('div', null,
                    React.createElement('div', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 800, fontSize: F.base, color: T.cyan, marginBottom: 4 } },
                      folderPicking ? 'Opening folder picker…' : 'Choose Backup Folder'
                    ),
                    React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textSub, lineHeight: 1.55 } },
                      'Tap to open a folder picker. Choose Documents — or any folder inside iCloud Drive or Google Drive for automatic cloud backup.'
                    ),
                  ),
                )
              : React.createElement('div', { style: { background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 14, padding: '16px 18px' } },
                  React.createElement('div', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 700, fontSize: F.base, color: T.accent, marginBottom: 5 } }, '📥 Download-based Backups'),
                  React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.textSub, lineHeight: 1.65 } },
                    'Backups will go to your Downloads folder. Move them to iCloud Drive or Google Drive for cloud safety. Use Chrome or Brave for automatic folder saving.'
                  ),
                )
        ),

        // Cloud tip
        !folderHandle && React.createElement('div', { style: { display: 'flex', gap: 10, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 12, padding: '11px 14px', marginBottom: 16 } },
          React.createElement('span', { style: { fontSize: 17, flexShrink: 0 } }, '💡'),
          React.createElement('span', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textSub, lineHeight: 1.6 } },
            React.createElement('strong', { style: { color: T.text } }, 'Pro tip: '),
            'Choose a folder inside iCloud Drive, Google Drive, or Dropbox and every backup goes to the cloud automatically — no extra steps, and the data is yours.',
          ),
        ),

        // iCloud sync guidance for mobile users
        React.createElement('div', { style: { background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 14, padding: '14px 16px', marginBottom: 16 } },
          React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: F.sm, color: T.accent, marginBottom: 6 } }, '☁️ Sync Between iPhone & Mac'),
          React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textSub, lineHeight: 1.7 } },
            'Choose a folder inside ',
            React.createElement('strong', { style: { color: T.text } }, 'iCloud Drive'),
            ' and your encrypted backup syncs automatically to all your Apple devices. On iPhone, tap Backup Now → save the file to iCloud Drive → your Mac will see it instantly.',
          ),
        ),

        // Frequency picker
        React.createElement(Lbl, { style: { marginBottom: 9 } }, 'How often should we back up?'),
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 22 } },
          ...freqOpts.map(opt =>
            React.createElement('button', { key: opt.k, onClick: () => setBackupFreq(opt.k),
              style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 15px', borderRadius: 11, border: `1px solid ${backupFreq === opt.k ? T.accent : T.border}`, background: backupFreq === opt.k ? T.accentGlow : T.surfaceAlt, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left' },
            },
              React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                React.createElement('div', { style: { width: 17, height: 17, borderRadius: '50%', border: `2px solid ${backupFreq === opt.k ? T.accent : T.border}`, background: backupFreq === opt.k ? T.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' } },
                  backupFreq === opt.k && React.createElement('div', { style: { width: 6, height: 6, borderRadius: '50%', background: T.bg } })
                ),
                React.createElement('span', { style: { fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: F.sm, color: backupFreq === opt.k ? T.accent : T.text } }, opt.label),
              ),
              React.createElement('span', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: backupFreq === opt.k ? T.accent : T.textMuted } }, opt.note),
            )
          )
        ),

        React.createElement('div', { style: { display: 'flex', gap: 10 } },
          React.createElement(Btn, { onClick: () => setStep(3), variant: 'secondary', style: { flex: 1 } }, '← Back'),
          React.createElement(Btn, { onClick: () => setStep(5), style: { flex: 2 } }, folderHandle ? '✅ Backup ready — Continue →' : 'Continue →'),
        ),

        !folderHandle && fsOK && React.createElement('div', { style: { textAlign: 'center', marginTop: 12 } },
          React.createElement('button', { onClick: () => setStep(5), style: { background: 'none', border: 'none', color: T.textMuted, fontSize: F.xs, fontFamily: "'Inter', sans-serif", cursor: 'pointer', textDecoration: 'underline' } },
            "Skip folder setup — I'll configure this later"
          ),
        ),
      ),

      // ── 5: PIN ───────────────────────────────────────────────────────────
      step === 5 && React.createElement(PinSetup, {
        onComplete: () => setStep(6),
        onSkip:     () => setStep(6),
      }),

      // ── 6: All Set! ──────────────────────────────────────────────────────
      step === 6 && React.createElement('div', { style: { textAlign: 'center' } },
        React.createElement('div', { style: { fontSize: 64, marginBottom: 16 } }, '✦'),
        React.createElement('h2', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: F.xl, color: T.accent, marginBottom: 10 } },
          `You're all set${profile.name ? `, ${profile.name}` : ''}!`
        ),
        React.createElement('p', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.base, color: T.textSub, lineHeight: 1.7, marginBottom: 20 } },
          "Your Cornerstone dashboard is ready. Let's see where you stand — and where you're headed."
        ),
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28, textAlign: 'left' } },
          ...[
            [accounts.length > 0, `◆ ${accounts.length} account${accounts.length !== 1 ? 's' : ''} added`],
            [!!folderHandle,       `◆ Auto-backup → ${folderHandle?.name}`],
            [!folderHandle,        '◆ Backup → Downloads (change anytime)'],
            [backupFreq !== 'manual', `◆ ${{ launch:'Every open', daily:'Daily', weekly:'Weekly', monthly:'Monthly' }[backupFreq]} backup scheduled`],
            [true,                 '◆ Your data stays on your device — always private'],
          ].filter(([show]) => show).map(([, label], i) =>
            React.createElement('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 10, background: T.accentGlow, border: `1px solid ${T.border}`, borderRadius: 10, padding: '11px 16px' } },
              React.createElement('span', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.text } }, label)
            )
          )
        ),
        React.createElement(Btn, { onClick: finish, style: { width: '100%', fontSize: F.md, padding: '14px' } }, 'Open My Dashboard →'),
      ),
    )
  );
};
