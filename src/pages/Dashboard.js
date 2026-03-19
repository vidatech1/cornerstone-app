// src/pages/Dashboard.js
const { useState, useEffect, useContext, useRef, useCallback } = React;

window.Dashboard = function ({ profile, accounts, income, goals, setGoals, strategies, setStrategies, setPage, isOnline }) {
  const { T, F } = useContext(AppCtx);
  const [bannerIdx, setBannerIdx]     = useState(() => parseInt(localStorage.getItem('ws_bannerIdx') || '0'));
  const [cachedUrl, setCachedUrl]     = useState(() => localStorage.getItem('ws_bannerUrl') || null);
  const [showPicker, setShowPicker]   = useState(false);
  const [showExport, setShowExport]   = useState(false);
  const [restoreErr, setRestoreErr]   = useState('');
  const [pinPrompt,  setPinPrompt]    = useState(null); // { onSubmit } | null
  const [goalModal, setGoalModal]     = useState(null);
  const [editStrat, setEditStrat]     = useState(null);
  const [newStrat, setNewStrat]       = useState('');
  const [addingStrat, setAddingStrat] = useState(false);
  const [quoteIdx, setQuoteIdx]       = useState(0);
  const [now, setNow]                 = useState(new Date());
  const weather                       = useWeather(profile?.city, isOnline);
  const fileRef                       = useRef();

  // ── Backup state ────────────────────────────────────────────────────────
  const [lastBackupAt,    setLastBackupAt]    = useState(null);
  const [backupFreq,      setBackupFreq]      = useState('weekly');
  const [backupDue,       setBackupDue]       = useState(false);
  const [backupDismissed, setBackupDismissed] = useState(false);
  const [showFreqPicker,  setShowFreqPicker]  = useState(false);
  const [backingUp,       setBacking]         = useState(false);

  useEffect(() => {
    (async () => {
      const [last, freq] = await Promise.all([
        DB.getSetting('lastBackupAt'),
        DB.getSetting('backupFrequency'),
      ]);
      const f = freq || 'weekly';
      setLastBackupAt(last || null);
      setBackupFreq(f);
      setTimeout(async () => {
        const due = await isBackupDue();
        if (due && (f === 'launch')) {
          // Launch-frequency: run silently, no banner needed
          const ts = await runBackup(true);
          setLastBackupAt(ts);
        } else {
          setBackupDue(due);
        }
      }, 2200);
    })();
  }, []);

  const handleBackup = useCallback(async (silent = false) => {
    setBacking(true);
    try {
      const ts = await runBackup(silent);
      setLastBackupAt(ts);
      setBackupDue(false);
      setBackupDismissed(false);
    } catch(e) { console.error(e); showToast('Backup failed — please try again', 'error'); }
    setBacking(false);
  }, []);

  const handleFreqChange = async freq => {
    setBackupFreq(freq);
    setShowFreqPicker(false);
    await DB.setSetting('backupFrequency', freq);
    setBackupDue(await isBackupDue());
  };

  const urgency      = backupUrgency(lastBackupAt, backupFreq);
  const urgencyColor = urgency === 'critical' ? T.negative : urgency === 'warning' ? T.accent : T.positive;
  const freqLabels   = { launch: 'Every open', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', manual: 'Manual only' };

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);

  const bannerUrl = isOnline ? NATURE_PHOTOS[bannerIdx].url : (cachedUrl || null);

  const selectBanner = i => {
    setBannerIdx(i); setShowPicker(false);
    localStorage.setItem('ws_bannerIdx', String(i));
    const url = NATURE_PHOTOS[i].url;
    const img = new Image();
    img.onload = () => { localStorage.setItem('ws_bannerUrl', url); setCachedUrl(url); };
    img.src = url;
  };

  // Summaries
  const sumType = t => sumArr(accounts.filter(a => a.type === t).map(a => a.amount));
  const savings  = sumArr(accounts.filter(a => a.type === 'cash' && a.subtype === 'savings').map(a => a.amount));
  const checking = sumArr(accounts.filter(a => a.type === 'cash' && a.subtype === 'checking').map(a => a.amount));
  const cash = sumType('cash'), equities = sumType('equities'), crypto = sumType('crypto'), metals = sumType('metals'), debt = sumType('debt');
  const totalAssets = cash + equities + crypto + metals;
  const mortgage    = accounts.find(a => a.subtype === 'mortgage')?.amount || 0;
  const netWorth    = totalAssets - debt;
  const totalIncome = (income?.job || 0) + (income?.business || 0) + (income?.dividends || 0);
  const age         = parseInt(profile?.age) || 0;

  const allocSlices = [
    { label: 'Equities', value: equities, color: '#e8a84a' },
    { label: 'Cash',     value: cash,     color: '#a07830' },
    { label: 'Crypto',   value: crypto,   color: '#d4943a' },
    { label: 'Metals',   value: metals,   color: '#6a5840' },
  ].filter(s => s.value > 0);

  const cashSlices = [
    { label: 'Checking', value: checking, color: '#d4943a' },
    { label: 'Savings',  value: savings,  color: '#e8a84a' },
  ].filter(s => s.value > 0);

  // Goal CRUD
  const saveGoal = async g => {
    const updated = goals.find(x => x.id === g.id)
      ? goals.map(x => x.id === g.id ? g : x)
      : [...goals, g];
    setGoals(updated);
    await DB.saveGoal(g);
    setGoalModal(null);
  };
  const removeGoal = async id => {
    if (!confirm('Remove this goal?')) return;
    setGoals(goals.filter(g => g.id !== id));
    await DB.deleteGoal(id);
  };

  // Strategy CRUD
  const saveStrat = async (id, text) => {
    const updated = strategies.map(s => s.id === id ? { ...s, text } : s);
    setStrategies(updated);
    await DB.saveStrategy({ id, text });
    setEditStrat(null);
  };
  const removeStrat = async id => {
    if (!confirm('Remove this strategy?')) return;
    setStrategies(strategies.filter(s => s.id !== id));
    await DB.deleteStrategy(id);
  };
  const addStrat = async () => {
    if (!newStrat.trim()) return;
    const s = { id: uid(), text: newStrat.trim() };
    setStrategies(prev => [...prev, s]);
    await DB.saveStrategy(s);
    setNewStrat(''); setAddingStrat(false);
  };

  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // Memoize the goal modal component to prevent re-creation on parent re-renders
  const GoalModalComponent = React.useMemo(() => {
    return function GoalModalInner({ goal, onSave, onClose, accounts, T, F }) {
      const isNew = !goal;
      const [form, setForm] = useState(goal
        ? { ...goal, accountIds: [...(goal.accountIds || [])] }
        : { label: '', targetAmount: '', accountIds: [], targetDate: '', notes: '', isDebtGoal: false }
      );
      const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
      const toggle = id => setForm(f => ({ ...f, accountIds: f.accountIds.includes(id) ? f.accountIds.filter(x => x !== id) : [...f.accountIds, id] }));
      const iSt = inputStyle(T, F);
      
      const handleSave = () => {
        if (!form.label.trim()) return;
        if (window.playClick) window.playClick();
        onSave({ ...form, id: goal?.id || uid(), targetAmount: parseFloat(form.targetAmount) || 0 });
      };
      
      const handleClose = () => {
        if (window.playClick) window.playClick();
        onClose();
      };
      
      return React.createElement('div', { 
        className: 'modal-overlay', 
        onClick: e => { if (e.target === e.currentTarget) handleClose(); },
        style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: 20 }
      },
        React.createElement('div', { 
          className: 'scale-in', 
          onClick: e => e.stopPropagation(), // Prevent clicks inside modal from closing it
          style: { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: 26, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' } 
        },
          React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 } },
            React.createElement('span', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 500, fontSize: F.lg, color: T.text } }, isNew ? 'Add Goal' : 'Edit Goal'),
            React.createElement('button', { onClick: handleClose, style: { background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 8, color: T.textSub, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, cursor: 'pointer' } }, '✕'),
          ),
          React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
            React.createElement('div', null, React.createElement(Lbl, null, 'Goal Name'), React.createElement('input', { value: form.label, onChange: e => set('label', e.target.value), placeholder: 'e.g. Emergency Fund', style: iSt })),
            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
              React.createElement('div', null, React.createElement(Lbl, null, 'Target ($)'), React.createElement('input', { type: 'number', value: form.targetAmount, onChange: e => set('targetAmount', e.target.value), placeholder: '3000', style: iSt })),
              React.createElement('div', null, React.createElement(Lbl, null, 'Target Date'), React.createElement('input', { type: 'date', value: form.targetDate, onChange: e => set('targetDate', e.target.value), style: iSt })),
            ),
            React.createElement('label', { style: { display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' } },
              React.createElement('input', { type: 'checkbox', checked: form.isDebtGoal, onChange: e => set('isDebtGoal', e.target.checked), style: { width: 18, height: 18, accentColor: T.accent } }),
              React.createElement('span', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.textSub } }, 'Debt payoff goal (tracks toward $0)'),
            ),
            React.createElement('div', null,
              React.createElement(Lbl, null, 'Linked Accounts'),
              React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 110, overflowY: 'auto' } },
                ...accounts.map(a => {
                  const sel = form.accountIds.includes(a.id);
                  return React.createElement('button', { 
                    key: a.id, 
                    onClick: () => { if (window.playClick) window.playClick(); toggle(a.id); }, 
                    style: { padding: '4px 12px', borderRadius: 16, border: `1px solid ${sel ? T.accent : T.border}`, background: sel ? T.accentGlow : 'transparent', color: sel ? T.accent : T.textMuted, fontSize: F.xs, fontFamily: "'Inter', sans-serif", fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' } 
                  }, a.label);
                })
              ),
            ),
            React.createElement('div', null, React.createElement(Lbl, null, 'Notes'), React.createElement('input', { value: form.notes || '', onChange: e => set('notes', e.target.value), placeholder: 'Optional…', style: iSt })),
            React.createElement('div', { style: { display: 'flex', gap: 10 } },
              React.createElement(Btn, { onClick: handleClose, variant: 'ghost', style: { flex: 1 } }, 'Cancel'),
              React.createElement(Btn, { onClick: handleSave, style: { flex: 2 } }, isNew ? 'Add Goal' : 'Save Goal'),
            ),
          ),
        )
      );
    };
  }, []);

  return React.createElement('div', { className: 'fade-up', style: { background: T.bg, minHeight: '100vh' } },

    // ── Hero Banner ──────────────────────────────────────────────────────────
    React.createElement('div', { style: { position: 'relative', height: 200, overflow: 'hidden' } },
      bannerUrl
        ? React.createElement('div', { style: { position: 'absolute', inset: 0, backgroundImage: `url(${bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.45)' } })
        : React.createElement('div', { style: { position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#0a1e40,#0d2a5a,#0a3060)' } }),
      React.createElement('div', { style: { position: 'absolute', inset: 0, background: T.heroGrad } }),

      React.createElement('div', { style: { position: 'relative', padding: '20px 20px', maxWidth: 800, margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } },
        // Top row
        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' } },
          React.createElement('div', null,
            React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: F.lg + 2, color: 'white', marginBottom: 3 } },
              profile?.name ? `Welcome back, ${profile.name}` : 'Welcome back'
            ),
            React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: 'rgba(255,255,255,0.55)' } }, dateStr),
            (profile?.occupation || age > 0) && React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: 'rgba(255,255,255,0.35)', marginTop: 3 } },
              [profile?.occupation, age > 0 ? `Age ${age}` : null].filter(Boolean).join(' · ')
            ),
          ),
          React.createElement('div', { style: { textAlign: 'right' } },
            React.createElement('div', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 800, fontSize: F.xl + 2, color: 'white' } }, timeStr),
            weather && React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginTop: 5, background: 'rgba(0,0,0,0.28)', borderRadius: 8, padding: '3px 10px' } },
              React.createElement('span', { style: { fontSize: F.md } }, weather.icon),
              React.createElement('span', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 700, fontSize: F.sm, color: 'white' } }, `${weather.temp}°F`),
              React.createElement('span', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: 'rgba(255,255,255,0.45)' } }, `· ${weather.wind}mph`),
            ),
          ),
        ),
        // Bottom row — backup status + export + photo
        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' } },

          // Left — backup cluster
          React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 5 } },

            // Last backup label + frequency picker
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 7 } },
              React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs - 1, color: urgency === 'ok' ? 'rgba(255,255,255,0.38)' : urgencyColor, letterSpacing: 0.3 } },
                `💾 ${lastBackupLabel(lastBackupAt)}`
              ),
              // Frequency pill
              React.createElement('div', { style: { position: 'relative' } },
                React.createElement('button', {
                  onClick: () => setShowFreqPicker(p => !p),
                  style: { background: 'rgba(0,0,0,0.28)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: '2px 8px', fontSize: F.xs - 1, fontFamily: "'Playfair Display', sans-serif", fontWeight: 700, color: 'rgba(255,255,255,0.45)', cursor: 'pointer' },
                }, `${freqLabels[backupFreq]} ▾`),
                showFreqPicker && React.createElement('div', {
                  style: { position: 'absolute', bottom: '120%', left: 0, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden', minWidth: 148, zIndex: 30, boxShadow: '0 10px 36px rgba(0,0,0,0.45)' },
                },
                  React.createElement('div', { style: { padding: '8px 12px 4px', fontFamily: "'Playfair Display', sans-serif", fontSize: F.xs, color: T.textMuted, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' } }, 'Backup frequency'),
                  ...Object.entries(freqLabels).map(([k, lbl]) =>
                    React.createElement('button', { key: k, onClick: () => handleFreqChange(k),
                      style: { display: 'block', width: '100%', padding: '9px 14px', background: backupFreq === k ? T.cyanDim : 'none', border: 'none', borderTop: `1px solid ${T.border}`, color: backupFreq === k ? T.cyan : T.text, fontSize: F.sm, fontFamily: "'Playfair Display', sans-serif", fontWeight: backupFreq === k ? 700 : 400, textAlign: 'left', cursor: 'pointer' },
                    }, (backupFreq === k ? '✓ ' : '') + lbl)
                  ),
                  // Cloud tip
                  React.createElement('div', { style: { padding: '8px 12px 10px', fontFamily: "'Inter', sans-serif", fontSize: F.xs - 1, color: T.textMuted, borderTop: `1px solid ${T.border}`, lineHeight: 1.5 } },
                    '💡 Save to iCloud Drive or Google Drive folder for cloud backup.'
                  ),
                ),
              ),
            ),

            // Buttons row: Backup Now + Export menu
            React.createElement('div', { style: { display: 'flex', gap: 6, alignItems: 'center' } },
              React.createElement('button', {
                onClick: handleBackup, disabled: backingUp,
                style: { background: urgency !== 'ok' ? urgencyColor + 'cc' : 'rgba(0,0,0,0.35)', border: `1px solid ${urgency !== 'ok' ? urgencyColor : 'rgba(255,255,255,0.2)'}`, borderRadius: 8, color: urgency !== 'ok' ? '#020c1b' : 'rgba(255,255,255,0.75)', padding: '5px 12px', fontSize: F.xs, fontFamily: "'Playfair Display', sans-serif", fontWeight: 700, cursor: backingUp ? 'wait' : 'pointer', transition: 'all 0.2s' },
              }, backingUp ? '⏳ Saving…' : urgency !== 'ok' ? '⚠️ Backup Now' : '💾 Backup'),

              // Export / PDF menu
              React.createElement('div', { style: { position: 'relative' } },
                React.createElement('button', { onClick: () => { setShowExport(p => !p); setShowFreqPicker(false); }, style: { background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 8, color: 'rgba(255,255,255,0.6)', padding: '5px 12px', fontSize: F.xs, fontFamily: "'Inter', sans-serif", fontWeight: 600, cursor: 'pointer' } }, '📄 More'),
                showExport && React.createElement('div', { style: { position: 'absolute', bottom: '120%', left: 0, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 13, overflow: 'hidden', minWidth: 200, zIndex: 20, boxShadow: '0 10px 40px rgba(0,0,0,0.4)' } },
                  ...[
                    ['📑 PDF Report',         () => { setShowExport(false); exportPDF(profile, accounts, goals, strategies, income); }],
                    ['💾 Backup (.wealthscore)', () => { setShowExport(false); handleBackup(); }],
                    ['📂 Restore from Backup', () => { setShowExport(false); fileRef.current?.click(); }],
                  ].map(([label, action], i) =>
                    React.createElement('button', { key: i, onClick: action, style: { display: 'block', width: '100%', padding: '11px 16px', background: 'none', border: 'none', borderTop: i > 0 ? `1px solid ${T.border}` : 'none', color: T.text, fontSize: F.sm, fontFamily: "'Inter', sans-serif", textAlign: 'left', cursor: 'pointer' } }, label)
                  ),
                  React.createElement('div', { style: { padding: '8px 14px 10px', fontFamily: "'Inter', sans-serif", fontSize: F.xs - 1, color: T.textMuted, borderTop: `1px solid ${T.border}`, lineHeight: 1.55 } },
                    '💡 After downloading, move the file to your iCloud Drive or Google Drive for cloud safety.'
                  ),
                ),
                React.createElement('input', { ref: fileRef, type: 'file', accept: '.wealthscore,.json,application/json,text/plain', style: { display: 'none' },
                  onChange: async e => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (!f) return;
                    setRestoreErr('');
                    setPinPrompt(null);
                    // S05: reject files over 5MB — legitimate backups are ~8KB
                    if (f.size > 5 * 1024 * 1024) {
                      setRestoreErr('File is too large to be a valid Cornerstone backup. Please select a .json backup file.');
                      return;
                    }
                    try {
                      let text;
                      if (typeof f.text === 'function') {
                        text = await f.text();
                      } else {
                        text = await new Promise((resolve, reject) => {
                          const reader = new FileReader();
                          reader.onload = ev => resolve(ev.target.result);
                          reader.onerror = () => reject(new Error('FileReader failed'));
                          reader.readAsText(f);
                        });
                      }
                      let data;
                      try { data = JSON.parse(text); }
                      catch { setRestoreErr('Could not restore: the file appears to be corrupted or is not a valid Cornerstone backup.'); return; }
                      restoreFromParsed(
                        data,
                        () => window.location.reload(),
                        msg => setRestoreErr(msg),
                        (onSubmit) => setPinPrompt({ onSubmit }),
                      );
                    } catch (err) {
                      setRestoreErr('Could not restore: unable to read the file on this device. Please try again.');
                    }
                  }
                }),
              ),
            ),
          ),

          // Right — photo button
          isOnline && React.createElement('button', { onClick: () => { setShowPicker(p => !p); setShowFreqPicker(false); setShowExport(false); }, style: { background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 8, color: 'rgba(255,255,255,0.5)', padding: '5px 12px', fontSize: F.xs, fontFamily: "'Inter', sans-serif", fontWeight: 600, cursor: 'pointer' } }, '🖼️ Photo'),
        ),
      ),

      // Photo picker strip
      showPicker && isOnline && React.createElement('div', { style: { position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.88)', padding: '10px 16px', display: 'flex', gap: 8, overflowX: 'auto' } },
        ...NATURE_PHOTOS.map((p, i) =>
          React.createElement('button', { key: p.id, onClick: () => selectBanner(i), style: { flexShrink: 0, width: 70, height: 46, borderRadius: 8, overflow: 'hidden', border: bannerIdx === i ? '2px solid T.accent' : '2px solid transparent', padding: 0, background: 'none', cursor: 'pointer' } },
            React.createElement('img', { src: p.url, alt: p.label, style: { width: '100%', height: '100%', objectFit: 'cover' } })
          )
        )
      ),
    ),

    // ── Body ─────────────────────────────────────────────────────────────────
    React.createElement('div', { style: { padding: '18px 16px', maxWidth: 800, margin: '0 auto' } },

      // Backup due banner
      backupDue && !backupDismissed && backupFreq !== 'manual' && React.createElement('div', {
        style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: urgencyColor + '18', border: `1px solid ${urgencyColor}44`, borderRadius: 12, padding: '10px 14px', marginBottom: 14 },
      },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
          React.createElement('span', { style: { fontSize: F.md } }, urgency === 'critical' ? '🔴' : '🟡'),
          React.createElement('div', null,
            React.createElement('div', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 700, fontSize: F.sm, color: urgencyColor } },
              urgency === 'critical' ? 'Backup overdue — your data is at risk' : `${freqLabels[backupFreq]} backup is due`,
            ),
            React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted, marginTop: 2 } },
              'Save your .wealthscore file, then move it to iCloud Drive or Google Drive for cloud safety.'
            ),
          ),
        ),
        React.createElement('div', { style: { display: 'flex', gap: 7, flexShrink: 0 } },
          React.createElement(Btn, { onClick: handleBackup, style: { padding: '6px 13px', fontSize: F.xs }, variant: 'cyan' }, backingUp ? '⏳' : '💾 Backup Now'),
          React.createElement('button', { onClick: () => setBackupDismissed(true), style: { background: 'none', border: 'none', color: T.textMuted, fontSize: F.md, cursor: 'pointer', padding: '4px 6px' } }, '✕'),
        ),
      ),

      restoreErr && React.createElement('div', { style: { background: T.negative + '18', border: `1px solid ${T.negative}44`, borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.negative } }, restoreErr),

      // Wealth Score + Net Worth
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 14, marginBottom: 16, alignItems: 'stretch' } },
        React.createElement(WealthScoreCard, { accounts, income, onGoToRecs: () => setPage(3) }),
        React.createElement(Card, { style: { padding: '20px 22px', background: T.surface, border: `1px solid ${T.border}` } },
          React.createElement(Lbl, { style: { marginBottom: 8 } }, 'Net Worth'),
          React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.hero, fontWeight: 600, color: netWorth < 0 ? T.accentDim : T.text, letterSpacing: -1, lineHeight: 1 } }, fmt(netWorth)),
          React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted, marginTop: 6, marginBottom: 16, lineHeight: 1.5 } },
            `Assets ${fmt(totalAssets)} · Debt ${fmt(debt)}`
          ),
          age > 0 && React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted, marginBottom: 14 } },
            `${Math.max(0, 65 - age)} years to traditional retirement`
          ),
          React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 } },
            ...[['Income', fmt(totalIncome), T.accentBright], ['Debt', fmt(debt), T.accentDim], ['Liquid', fmt(cash), T.accent]].map(([l, v, c]) =>
              React.createElement('div', { key: l, style: { background: T.mode === 'light' ? '#1a2a3d' : 'rgba(0,0,0,0.25)', borderRadius: 12, padding: '12px 10px', textAlign: 'center' } },
                React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs - 1, color: T.mode === 'light' ? 'rgba(255,255,255,0.6)' : T.textMuted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 1.5 } }, l),
                React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.md, fontWeight: 600, color: c } }, v),
              )
            )
          ),
        ),
      ),

      // Cash + Allocation Charts
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 } },
        React.createElement(Card, { hover: true, style: { padding: '16px 14px', textAlign: 'center' } },
          React.createElement(Lbl, { style: { marginBottom: 10 } }, 'Cash Split'),
          React.createElement(PieChart, { slices: cashSlices, size: 140, centerLabel: fmt(cash) }),
          React.createElement('div', { style: { marginTop: 12 } },
            ...[['Checking', checking, '#d4943a'], ['Savings', savings, '#e8a84a']].map(([l, v, c]) =>
              React.createElement('div', { key: l, style: { display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textSub } },
                React.createElement('span', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                  React.createElement('span', { style: { width: 7, height: 7, borderRadius: '50%', background: c } }),
                  l
                ),
                React.createElement('span', { style: { color: T.text, fontWeight: 600 } }, fmt(v)),
              )
            )
          ),
        ),
        React.createElement(Card, { hover: true, style: { padding: '16px 14px', textAlign: 'center' } },
          React.createElement(Lbl, { style: { marginBottom: 10 } }, 'Asset Allocation'),
          React.createElement(PieChart, { slices: allocSlices, size: 140 }),
        ),
      ),

      // Goals
      React.createElement('div', { style: { marginBottom: 18 } },
        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 } },
          React.createElement(Lbl, null, 'Goals'),
          React.createElement(Btn, { onClick: () => setGoalModal({ mode: 'add' }), variant: 'secondary', style: { padding: '5px 13px', fontSize: F.xs } }, '+ Add Goal'),
        ),
        goals.length === 0
          ? React.createElement(Card, { style: { padding: 20, textAlign: 'center' } },
              React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.textMuted } }, 'No goals yet. Add your first financial goal above.')
            )
          : goals.map(g => React.createElement(GoalCard, { key: g.id, goal: g, accounts, onEdit: g => setGoalModal({ mode: 'edit', goal: g }), onRemove: removeGoal })),
      ),

      // Strategies
      React.createElement('div', { style: { marginBottom: 18 } },
        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 } },
          React.createElement(Lbl, null, 'Active Strategies'),
          React.createElement(Btn, { onClick: () => setAddingStrat(true), variant: 'secondary', style: { padding: '5px 13px', fontSize: F.xs } }, '+ Add'),
        ),
        React.createElement(Card, { style: { padding: '16px 18px', border: `1px solid ${T.accent}33` } },
          strategies.length === 0 && !addingStrat && React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.textMuted, textAlign: 'center', padding: '8px 0' } }, 'No strategies yet. Add one or adopt from Recommendations.'),
          ...strategies.map(s =>
            React.createElement('div', { key: s.id, style: { marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${T.border}` } },
              editStrat === s.id
                ? React.createElement('div', { style: { display: 'flex', gap: 7 } },
                    React.createElement('input', { defaultValue: s.text, id: `st-${s.id}`, style: inputStyle(T, F), onKeyDown: e => e.key === 'Enter' && saveStrat(s.id, document.getElementById(`st-${s.id}`).value) }),
                    React.createElement(Btn, { onClick: () => saveStrat(s.id, document.getElementById(`st-${s.id}`).value), style: { padding: '8px 12px', fontSize: F.xs, flexShrink: 0 } }, 'Save'),
                  )
                : React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 } },
                    React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.text, lineHeight: 1.55, flex: 1 } }, s.text),
                    React.createElement('div', { style: { display: 'flex', gap: 5, flexShrink: 0 } },
                      React.createElement(Btn, { onClick: () => setEditStrat(s.id), variant: 'secondary', style: { padding: '4px 9px', fontSize: F.xs } }, 'Edit'),
                      React.createElement(Btn, { onClick: () => removeStrat(s.id), variant: 'danger', style: { padding: '4px 9px', fontSize: F.xs } }, '✕'),
                    ),
                  )
            )
          ),
          addingStrat && React.createElement('div', { style: { display: 'flex', gap: 7, marginTop: 6 } },
            React.createElement('input', { value: newStrat, onChange: e => setNewStrat(e.target.value), placeholder: 'Describe your strategy…', style: inputStyle(T, F), onKeyDown: e => e.key === 'Enter' && addStrat(), autoFocus: true }),
            React.createElement(Btn, { onClick: addStrat, style: { padding: '8px 12px', fontSize: F.xs, flexShrink: 0 } }, 'Add'),
            React.createElement(Btn, { onClick: () => setAddingStrat(false), variant: 'secondary', style: { padding: '8px 10px', fontSize: F.xs, flexShrink: 0 } }, '✕'),
          ),
        ),
      ),

      // Wisdom
      React.createElement('div', { style: { marginBottom: 24 } },
        React.createElement(Lbl, { style: { marginBottom: 12 } }, 'Wisdom'),
        React.createElement(Card, { hover: true, style: { padding: '24px 22px', border: `1px solid ${T.border}` } },
          React.createElement('div', { style: { fontSize: F.md, color: T.accent, marginBottom: 14 } }, '✦'),
          React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.base + 1, color: T.textSub, fontStyle: 'italic', lineHeight: 1.7, marginBottom: 14 } }, `"${QUOTES[quoteIdx].text}"`),
          React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.accent, marginBottom: 16 } }, `— ${QUOTES[quoteIdx].source}`),
          React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.text, background: T.accentGlow, borderLeft: `2px solid ${T.accent}`, padding: '12px 14px', borderRadius: '0 8px 8px 0', lineHeight: 1.6 } }, QUOTES[quoteIdx].theme),
        ),
        React.createElement('div', { style: { display: 'flex', gap: 8, marginTop: 14, justifyContent: 'center' } },
          ...QUOTES.map((_, i) =>
            React.createElement('button', { key: i, onClick: () => { if (window.playClick) window.playClick(); setQuoteIdx(i); }, style: { width: i === quoteIdx ? 20 : 8, height: 8, borderRadius: 4, border: 'none', background: i === quoteIdx ? T.accent : T.border, padding: 0, cursor: 'pointer', transition: 'all 0.2s' } })
          )
        ),
      ),

      React.createElement('div', { style: { textAlign: 'center', fontFamily: "'Playfair Display', serif", fontSize: F.sm, color: T.textMuted, paddingBottom: 100, fontStyle: 'italic' } },
        'Build wealth that lasts.'
      ),
    ),

    goalModal && React.createElement(GoalModalComponent, { 
      key: goalModal.goal?.id || 'new-goal',
      goal: goalModal.goal, 
      onSave: saveGoal, 
      onClose: () => setGoalModal(null), 
      accounts, 
      T, 
      F 
    }),

    // ── PIN prompt modal for encrypted backup restore ──────────────────────
    pinPrompt && React.createElement(PinRestoreModal, {
      key: 'pin-restore',
      T, F,
      onSubmit: async (pin, onPinError) => {
        // R02/R03: pass onPinError so modal stays open on wrong PIN
        await pinPrompt.onSubmit(pin, onPinError);
      },
      onCancel: () => { setPinPrompt(null); setRestoreErr('Restore cancelled.'); },
    }),
  );
};
