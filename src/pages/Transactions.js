// src/pages/Transactions.js — Transaction history, CSV import, holdings auto-update
const { useState, useEffect, useContext, useRef } = React;

// ── Apply a single transaction delta to the matching account's positions ──────
async function applyTransactionToHoldings(txn, accounts, setAccounts) {
  const acct = accounts.find(a => a.id === txn.accountId);
  if (!acct) return;

  const positions = (acct.positions || []).map(p => ({ ...p }));
  const ticker    = (txn.ticker || '').toUpperCase();
  const delta     = txn.type === 'buy' ? txn.qty : -txn.qty;

  if (acct.type === 'equities') {
    const idx = positions.findIndex(p => (p.ticker || '').toUpperCase() === ticker);
    if (idx === -1) {
      if (txn.type === 'buy') positions.push({ id: uid(), ticker, shares: txn.qty });
    } else {
      positions[idx].shares = Math.max(0, (positions[idx].shares || 0) + delta);
    }

  } else if (acct.type === 'crypto') {
    const idx = positions.findIndex(p => (p.ticker || '').toUpperCase() === ticker);
    if (idx === -1) {
      if (txn.type === 'buy') positions.push({ id: uid(), ticker, qty: txn.qty });
    } else {
      positions[idx].qty = Math.max(0, (positions[idx].qty || 0) + delta);
    }

  } else if (acct.type === 'metals') {
    const metal = ticker.toLowerCase();
    const isCountable = metal === 'goldback' || metal === 'silverback';
    const idx = positions.findIndex(p => (p.metal || p.ticker || '').toLowerCase() === metal);
    if (idx === -1) {
      if (txn.type === 'buy') {
        positions.push({ id: uid(), metal, ticker, oz: isCountable ? 0 : txn.qty, count: isCountable ? txn.qty : 0 });
      }
    } else {
      if (isCountable) {
        positions[idx].count = Math.max(0, (positions[idx].count || 0) + delta);
      } else {
        positions[idx].oz = Math.max(0, (positions[idx].oz || 0) + delta);
      }
    }
  }

  const updated = { ...acct, positions };
  const updatedAccounts = accounts.map(a => a.id === acct.id ? updated : a);
  setAccounts(updatedAccounts);
  await DB.saveAccount(updated);
}

// ── Undo a transaction delta (used when deleting a saved transaction) ─────────
async function unapplyTransactionFromHoldings(txn, accounts, setAccounts) {
  // Reverse the type to undo
  await applyTransactionToHoldings({ ...txn, type: txn.type === 'buy' ? 'sell' : 'buy' }, accounts, setAccounts);
}

// ── Format date for display ───────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m,10)-1]} ${parseInt(d,10)}, ${y}`;
}

// ── Add / Edit Transaction Modal ──────────────────────────────────────────────
function TxnFormModal({ txn, accounts, onSave, onClose }) {
  const { T, F } = useContext(AppCtx);
  const isNew = !txn;

  const eligibleAccounts = accounts.filter(a => ['equities','crypto','metals'].includes(a.type));

  const [form, setForm] = useState(() => {
    if (txn) return { ...txn };
    const firstAcct = eligibleAccounts[0];
    return {
      accountId: firstAcct?.id || '',
      date: new Date().toISOString().slice(0, 10),
      type: 'buy',
      ticker: '',
      qty: '',
      price: '',
      total: '',
      notes: '',
    };
  });
  const [err, setErr] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Auto-calc total when qty or price changes
  const handleQtyPrice = (k, v) => {
    setForm(f => {
      const next = { ...f, [k]: v };
      const q = parseFloat(next.qty) || 0;
      const p = parseFloat(next.price) || 0;
      if (q > 0 && p > 0) next.total = (q * p).toFixed(2);
      return next;
    });
  };

  const save = () => {
    if (!form.accountId) { setErr('Please select an account.'); return; }
    if (!form.date)       { setErr('Please enter a date.'); return; }
    if (!form.ticker.trim()) { setErr('Please enter a ticker or asset symbol.'); return; }
    const qty   = parseFloat(form.qty);
    const price = parseFloat(form.price) || 0;
    if (!qty || qty <= 0) { setErr('Quantity must be greater than zero.'); return; }

    const record = {
      ...form,
      id:     txn?.id || uid(),
      ticker: form.ticker.trim().toUpperCase(),
      qty,
      price,
      total:  parseFloat(form.total) || qty * price,
      source: txn?.source || 'manual',
      importedAt: txn?.importedAt || Date.now(),
    };
    onSave(record);
  };

  const iStyle = inputStyle(T, F);
  const acct   = eligibleAccounts.find(a => a.id === form.accountId);

  return React.createElement('div', {
    className: 'modal-overlay',
    onClick: e => { if (e.target === e.currentTarget) onClose(); },
  },
    React.createElement('div', {
      className: 'scale-in',
      style: { background: T.modalBg, border: `1px solid ${T.border}`, borderRadius: 20, padding: 26, width: '100%', maxWidth: 480, maxHeight: '92vh', overflowY: 'auto' },
    },
      // Header
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 } },
        React.createElement('span', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 800, fontSize: F.lg, color: T.text } },
          isNew ? 'Add Transaction' : 'Edit Transaction'
        ),
        React.createElement('button', {
          onClick: onClose,
          style: { background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 8, color: T.textSub, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 },
        }, '✕'),
      ),

      err && React.createElement('div', {
        style: { background: T.negative + '18', border: `1px solid ${T.negative}44`, borderRadius: 8, padding: '9px 14px', marginBottom: 14, fontSize: F.sm, color: T.negative, fontFamily: "'Inter', sans-serif" },
      }, err),

      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },

        // Account
        React.createElement('div', null,
          React.createElement(Lbl, null, 'Account'),
          eligibleAccounts.length === 0
            ? React.createElement('div', { style: { fontSize: F.sm, color: T.textMuted, fontFamily: "'Inter', sans-serif" } },
                'No investment accounts found. Add an Equities, Crypto, or Metals account first.'
              )
            : React.createElement('select', {
                value: form.accountId, onChange: e => set('accountId', e.target.value), style: iStyle,
              },
                React.createElement('option', { value: '' }, '— Select account —'),
                ...eligibleAccounts.map(a =>
                  React.createElement('option', { key: a.id, value: a.id }, a.label)
                ),
              ),
        ),

        // Date
        React.createElement('div', null,
          React.createElement(Lbl, null, 'Transaction Date'),
          React.createElement('input', {
            type: 'date', value: form.date, onChange: e => set('date', e.target.value), style: iStyle,
          }),
        ),

        // Buy / Sell toggle
        React.createElement('div', null,
          React.createElement(Lbl, null, 'Type'),
          React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
            ['buy', 'sell'].map(t =>
              React.createElement('button', {
                key: t,
                onClick: () => set('type', t),
                style: {
                  padding: '12px', borderRadius: 12, border: `2px solid ${form.type === t ? (t === 'buy' ? T.positive : T.negative) : T.border}`,
                  background: form.type === t ? (t === 'buy' ? T.positive + '18' : T.negative + '18') : 'transparent',
                  color: form.type === t ? (t === 'buy' ? T.positive : T.negative) : T.textMuted,
                  fontFamily: "'Playfair Display', sans-serif", fontWeight: 700, fontSize: F.base, cursor: 'pointer',
                  transition: 'all 0.15s',
                },
              }, t === 'buy' ? '▲ Buy' : '▼ Sell')
            ),
          ),
        ),

        // Ticker
        React.createElement('div', null,
          React.createElement(Lbl, null, acct?.type === 'metals' ? 'Metal Symbol (e.g. GOLD, SILVER)' : 'Ticker Symbol'),
          React.createElement('input', {
            value: form.ticker,
            onChange: e => set('ticker', e.target.value.toUpperCase()),
            placeholder: acct?.type === 'crypto' ? 'e.g. BTC, ETH' : acct?.type === 'metals' ? 'e.g. GOLD, SILVER' : 'e.g. VOO, SCHD',
            style: iStyle,
            autoCapitalize: 'characters',
          }),
        ),

        // Qty / Price / Total
        React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
          React.createElement('div', null,
            React.createElement(Lbl, null, acct?.type === 'metals' ? 'Amount (oz or count)' : acct?.type === 'crypto' ? 'Quantity (tokens)' : 'Shares'),
            React.createElement('input', {
              type: 'number', value: form.qty,
              onChange: e => handleQtyPrice('qty', e.target.value),
              placeholder: '0', style: iStyle,
            }),
          ),
          React.createElement('div', null,
            React.createElement(Lbl, null, 'Price per Unit ($)'),
            React.createElement('input', {
              type: 'number', value: form.price,
              onChange: e => handleQtyPrice('price', e.target.value),
              placeholder: '0.00', style: iStyle,
            }),
          ),
        ),

        // Total (editable, auto-filled)
        React.createElement('div', null,
          React.createElement(Lbl, null, 'Total Value ($)'),
          React.createElement('input', {
            type: 'number', value: form.total,
            onChange: e => set('total', e.target.value),
            placeholder: 'Auto-calculated', style: iStyle,
          }),
          React.createElement('div', { style: { fontSize: F.xs, color: T.textMuted, fontFamily: "'Inter', sans-serif", marginTop: 4 } },
            'Auto-filled from Shares × Price. Override if needed.'
          ),
        ),

        // Notes
        React.createElement('div', null,
          React.createElement(Lbl, null, 'Notes (optional)'),
          React.createElement('input', {
            value: form.notes, onChange: e => set('notes', e.target.value),
            placeholder: 'e.g. Dividend reinvestment, DRIP', style: iStyle,
          }),
        ),

        // Actions
        React.createElement('div', { style: { display: 'flex', gap: 10, marginTop: 4 } },
          React.createElement(Btn, { onClick: onClose, variant: 'secondary', style: { flex: 1 } }, 'Cancel'),
          React.createElement(Btn, { onClick: save, style: { flex: 2 } }, isNew ? 'Add Transaction' : 'Save Changes'),
        ),
      ),
    ),
  );
}

// ── Duplicate Review Modal ────────────────────────────────────────────────────
function DuplicateModal({ duplicates, newOnly, onSkip, onReview, onCancel }) {
  const { T, F } = useContext(AppCtx);
  const [selected, setSelected] = useState(new Set());

  const toggle = fp => setSelected(s => {
    const n = new Set(s);
    n.has(fp) ? n.delete(fp) : n.add(fp);
    return n;
  });

  return React.createElement('div', { className: 'modal-overlay' },
    React.createElement('div', {
      className: 'scale-in',
      style: { background: T.modalBg, border: `1px solid ${T.border}`, borderRadius: 20, padding: 26, width: '100%', maxWidth: 480, maxHeight: '88vh', overflowY: 'auto' },
    },
      React.createElement('div', { style: { textAlign: 'center', marginBottom: 20 } },
        React.createElement('div', { style: { fontSize: 36, marginBottom: 8 } }, '⚠️'),
        React.createElement('div', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 800, fontSize: F.lg, color: T.text, marginBottom: 6 } },
          'Possible Duplicates Found'
        ),
        React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.textSub, lineHeight: 1.5 } },
          `${duplicates.length} transaction${duplicates.length !== 1 ? 's' : ''} match records already in your history. What would you like to do?`
        ),
      ),

      // Duplicate list
      React.createElement('div', { style: { background: T.surfaceAlt, borderRadius: 12, overflow: 'hidden', border: `1px solid ${T.border}`, marginBottom: 18 } },
        duplicates.map((t, i) =>
          React.createElement('div', {
            key: i,
            style: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: i < duplicates.length - 1 ? `1px solid ${T.border}` : 'none' },
          },
            React.createElement('input', {
              type: 'checkbox', checked: selected.has(t._fp), onChange: () => toggle(t._fp),
              style: { width: 18, height: 18, accentColor: T.accent, cursor: 'pointer', flexShrink: 0 },
            }),
            React.createElement('div', { style: { flex: 1 } },
              React.createElement('div', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 700, fontSize: F.sm, color: t.type === 'buy' ? T.positive : T.negative } },
                `${t.type === 'buy' ? '▲' : '▼'} ${t.ticker}  ×${t.qty}`
              ),
              React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textSub } },
                `${fmtDate(t.date)}  ·  ${t.broker || 'Manual'}`
              ),
            ),
            React.createElement('div', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 700, fontSize: F.sm, color: T.accent } },
              fmtD(t.total),
            ),
          )
        ),
      ),

      React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted, marginBottom: 16, textAlign: 'center' } },
        'Check the boxes above to import selected duplicates anyway.'
      ),

      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
        React.createElement(Btn, {
          onClick: () => onSkip(selected),
          style: { width: '100%' },
        }, `Import ${newOnly} new · Skip unchecked duplicates`),
        React.createElement(Btn, {
          onClick: () => onReview(selected),
          variant: 'secondary',
          style: { width: '100%' },
        }, 'Import everything (including checked duplicates)'),
        React.createElement(Btn, {
          onClick: onCancel,
          variant: 'danger',
          style: { width: '100%' },
        }, 'Cancel Upload'),
      ),
    ),
  );
}

// ── Import CSV Modal ──────────────────────────────────────────────────────────
function ImportModal({ accounts, onImport, onClose }) {
  const { T, F } = useContext(AppCtx);
  const fileRef  = useRef(null);

  const eligible = accounts.filter(a => ['equities','crypto','metals'].includes(a.type));

  const [step,        setStep]        = useState('setup');   // setup | preview | duplicates
  const [accountId,   setAccountId]   = useState(eligible[0]?.id || '');
  const [parsed,      setParsed]      = useState(null);
  const [duplicates,  setDuplicates]  = useState([]);
  const [err,         setErr]         = useState('');
  const [loading,     setLoading]     = useState(false);
  const [dragging,    setDragging]    = useState(false);

  const processFile = async file => {
    if (!accountId) { setErr('Please select an account first.'); return; }
    if (!file || !file.name.endsWith('.csv')) { setErr('Please upload a .csv file.'); return; }
    setErr(''); setLoading(true);

    try {
      const text   = await file.text();
      const result = CSVParser.parse(text);
      if (result.error) { setErr(result.error); setLoading(false); return; }
      if (result.parsed === 0) { setErr('No buy or sell transactions found in this file. Make sure you are exporting transaction history, not a positions snapshot.'); setLoading(false); return; }

      // Attach accountId to each transaction
      result.transactions = result.transactions.map(t => ({ ...t, _fp: CSVParser.fingerprint(t), accountId }));
      setParsed(result);

      // Check for duplicates against existing stored transactions
      const existing = await DB.getTransactions();
      const existingFPs = new Set(existing.map(t => CSVParser.fingerprint(t)));
      const dups = result.transactions.filter(t => existingFPs.has(t._fp));

      if (dups.length > 0) {
        setDuplicates(dups);
        setStep('duplicates');
      } else {
        setStep('preview');
      }
    } catch (e) {
      setErr('Failed to read file. Please try again.');
    }
    setLoading(false);
  };

  const handleFileInput = e => processFile(e.target.files[0]);

  const handleDrop = e => {
    e.preventDefault(); setDragging(false);
    processFile(e.dataTransfer.files[0]);
  };

  // Confirm the import: save all accepted transactions and apply to holdings
  const confirmImport = async (transactions) => {
    setLoading(true);
    const toSave = transactions.map(({ _fp, ...t }) => ({ ...t, id: uid(), importedAt: Date.now(), source: 'csv' }));
    // Load fresh accounts state from DB to avoid stale closures
    const freshAccounts = await DB.getAccounts();
    let currentAccounts = freshAccounts;
    let currentSet = [...currentAccounts];

    // Apply each transaction delta sequentially to avoid race conditions
    for (const txn of toSave) {
      await DB.saveTransaction(txn);
      // Re-fetch to apply correctly in sequence
      currentSet = await DB.getAccounts();
      await applyTransactionToHoldings(txn, currentSet, async updated => {
        currentSet = updated;
        for (const a of updated) await DB.saveAccount(a);
      });
    }

    // Reload accounts from DB and propagate to app state
    const finalAccounts = await DB.getAccounts();
    onImport(finalAccounts, toSave.length);
    onClose();
  };

  // Handle duplicate resolution choices
  const handleSkipDups = async (selectedFPs) => {
    // Import new txns + any duplicates the user explicitly checked
    const toImport = parsed.transactions.filter(t => !duplicates.some(d => d._fp === t._fp) || selectedFPs.has(t._fp));
    await confirmImport(toImport);
  };

  const handleImportAll = async (selectedFPs) => {
    await confirmImport(parsed.transactions);
  };

  const iStyle = inputStyle(T, F);
  const newCount = parsed ? parsed.transactions.filter(t => !duplicates.some(d => d._fp === t._fp)).length : 0;

  if (step === 'duplicates') {
    return React.createElement(DuplicateModal, {
      duplicates,
      newOnly: newCount,
      onSkip:   handleSkipDups,
      onReview: handleImportAll,
      onCancel: onClose,
    });
  }

  return React.createElement('div', {
    className: 'modal-overlay',
    onClick: e => { if (e.target === e.currentTarget) onClose(); },
  },
    React.createElement('div', {
      className: 'scale-in',
      style: { background: T.modalBg, border: `1px solid ${T.border}`, borderRadius: 20, padding: 26, width: '100%', maxWidth: 500, maxHeight: '92vh', overflowY: 'auto' },
    },
      // Header
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 } },
        React.createElement('div', null,
          React.createElement('div', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 800, fontSize: F.lg, color: T.text } },
            step === 'preview' ? 'Review Import' : 'Import CSV'
          ),
          step === 'setup' && React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted, marginTop: 3 } },
            'Fidelity · Vanguard · Schwab · Robinhood · TD Ameritrade · E*Trade · Merrill · Ally · Webull · IBKR'
          ),
        ),
        React.createElement('button', {
          onClick: onClose,
          style: { background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 8, color: T.textSub, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 },
        }, '✕'),
      ),

      err && React.createElement('div', {
        style: { background: T.negative + '18', border: `1px solid ${T.negative}44`, borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: F.sm, color: T.negative, fontFamily: "'Inter', sans-serif", lineHeight: 1.5 },
      }, err),

      // ── SETUP STEP ──
      step === 'setup' && React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },

        // Account selector
        React.createElement('div', null,
          React.createElement(Lbl, null, 'Step 1 — Which account is this CSV from?'),
          eligible.length === 0
            ? React.createElement('div', { style: { fontSize: F.sm, color: T.textMuted, fontFamily: "'Inter', sans-serif" } },
                'Add an Equities, Crypto, or Metals account before importing.'
              )
            : React.createElement('select', {
                value: accountId, onChange: e => setAccountId(e.target.value), style: iStyle,
              },
                React.createElement('option', { value: '' }, '— Select account —'),
                ...eligible.map(a => React.createElement('option', { key: a.id, value: a.id }, a.label)),
              ),
        ),

        // Drop zone
        React.createElement('div', null,
          React.createElement(Lbl, null, 'Step 2 — Upload your CSV file'),
          React.createElement('div', {
            onDragOver: e => { e.preventDefault(); setDragging(true); },
            onDragLeave: () => setDragging(false),
            onDrop: handleDrop,
            onClick: () => fileRef.current?.click(),
            style: {
              border: `2px dashed ${dragging ? T.accent : T.border}`,
              borderRadius: 16, padding: '32px 20px', textAlign: 'center', cursor: 'pointer',
              background: dragging ? T.accentGlow : T.surfaceAlt,
              transition: 'all 0.2s',
            },
          },
            loading
              ? React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 } },
                  React.createElement('div', { style: { width: 28, height: 28, borderRadius: '50%', border: `3px solid ${T.accent}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' } }),
                  React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.textMuted } }, 'Parsing file…'),
                )
              : React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 } },
                  React.createElement('div', { style: { fontSize: 36 } }, '📂'),
                  React.createElement('div', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 600, fontSize: F.base, color: T.text } },
                    'Tap to choose a file'
                  ),
                  React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted } },
                    'or drag & drop your .csv here'
                  ),
                ),
          ),
          React.createElement('input', {
            ref: fileRef, type: 'file', accept: '.csv', onChange: handleFileInput,
            style: { display: 'none' },
          }),
        ),

        // Tips
        React.createElement('div', {
          style: { background: T.accentGlow, border: `1px solid rgba(212,148,58,0.2)`, borderRadius: 12, padding: '12px 16px' },
        },
          React.createElement('div', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 700, fontSize: F.sm, color: T.accent, marginBottom: 6 } },
            '💡 How to export from your broker'
          ),
          ['Fidelity: Accounts → History → Download → CSV',
           'Schwab: Accounts → History → Export',
           'Robinhood: Account → Statements → CSV',
           'Vanguard: Balances & Holdings → Download History'].map((tip, i) =>
            React.createElement('div', { key: i, style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textSub, marginBottom: 3 } }, tip)
          ),
        ),

        React.createElement(Btn, { onClick: onClose, variant: 'secondary', style: { width: '100%' } }, 'Cancel'),
      ),

      // ── PREVIEW STEP ──
      step === 'preview' && parsed && React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },

        // Summary
        React.createElement('div', {
          style: { background: T.accentGlow, border: `1px solid rgba(212,148,58,0.2)`, borderRadius: 14, padding: 16 },
        },
          React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, textAlign: 'center' } },
            [
              { label: 'Broker Detected', value: parsed.broker || 'Generic' },
              { label: 'Rows in File',    value: parsed.total },
              { label: 'Ready to Import', value: parsed.parsed },
            ].map((s, i) =>
              React.createElement('div', { key: i },
                React.createElement('div', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 800, fontSize: F.lg, color: T.accent } }, s.value),
                React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted, marginTop: 2 } }, s.label),
              )
            ),
          ),
        ),

        // Transaction preview list (first 10)
        React.createElement('div', null,
          React.createElement(Lbl, null, `Preview — first ${Math.min(10, parsed.transactions.length)} of ${parsed.transactions.length}`),
          React.createElement('div', { style: { background: T.surfaceAlt, borderRadius: 12, overflow: 'hidden', border: `1px solid ${T.border}` } },
            parsed.transactions.slice(0, 10).map((t, i) =>
              React.createElement('div', {
                key: i,
                style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: i < Math.min(9, parsed.transactions.length - 1) ? `1px solid ${T.border}` : 'none' },
              },
                React.createElement('div', null,
                  React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                    React.createElement('span', {
                      style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: t.type === 'buy' ? T.positive + '22' : T.negative + '22', color: t.type === 'buy' ? T.positive : T.negative },
                    }, t.type.toUpperCase()),
                    React.createElement('span', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 700, fontSize: F.sm, color: T.text } }, t.ticker),
                    React.createElement('span', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textSub } }, `×${t.qty}`),
                  ),
                  React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted, marginTop: 2 } }, fmtDate(t.date)),
                ),
                React.createElement('div', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 700, fontSize: F.sm, color: T.accent } },
                  t.total > 0 ? fmtD(t.total) : t.price > 0 ? `@ ${fmtD(t.price)}` : '—'
                ),
              )
            ),
          ),
        ),

        React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted, lineHeight: 1.5, textAlign: 'center' } },
          'Transactions will be saved to your history and your holdings will be automatically updated.'
        ),

        React.createElement('div', { style: { display: 'flex', gap: 10 } },
          React.createElement(Btn, { onClick: () => { setParsed(null); setStep('setup'); }, variant: 'secondary', style: { flex: 1 } }, '← Back'),
          React.createElement(Btn, { onClick: () => confirmImport(parsed.transactions), style: { flex: 2 }, disabled: loading },
            loading ? 'Importing…' : `Import ${parsed.parsed} Transaction${parsed.parsed !== 1 ? 's' : ''}`
          ),
        ),
      ),
    ),
  );
}

// ── Main Transactions Page ────────────────────────────────────────────────────
window.TransactionsPage = function ({ accounts, setAccounts }) {
  const { T, F } = useContext(AppCtx);

  const [transactions, setTransactions] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showImport,   setShowImport]   = useState(false);
  const [showForm,     setShowForm]     = useState(null);   // null | 'new' | txn object
  const [filterAcct,   setFilterAcct]   = useState('all');
  const [filterType,   setFilterType]   = useState('all');
  const [confirmDel,   setConfirmDel]   = useState(null);   // txn to delete

  // Load saved transactions on mount
  useEffect(() => {
    DB.getTransactions()
      .then(txns => {
        txns.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        setTransactions(txns);
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Save a new or edited transaction ───────────────────────────────────────
  const handleSaveTxn = async (txn) => {
    const isNew = !transactions.find(t => t.id === txn.id);
    await DB.saveTransaction(txn);

    if (isNew) {
      // Apply the delta to holdings
      await applyTransactionToHoldings(txn, accounts, setAccounts);
    } else {
      // For edits: undo the old delta, then apply the new one
      const old = transactions.find(t => t.id === txn.id);
      if (old) await unapplyTransactionFromHoldings(old, accounts, setAccounts);
      await applyTransactionToHoldings(txn, accounts, setAccounts);
    }

    const freshTxns = await DB.getTransactions();
    freshTxns.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    setTransactions(freshTxns);
    setShowForm(null);
    showToast(isNew ? 'Transaction added. Holdings updated.' : 'Transaction updated.', 'success');
  };

  // ── Delete a transaction ────────────────────────────────────────────────────
  const handleDeleteTxn = async (txn) => {
    await DB.deleteTransaction(txn.id);
    // Reverse the delta
    await unapplyTransactionFromHoldings(txn, accounts, setAccounts);
    const freshTxns = await DB.getTransactions();
    freshTxns.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    setTransactions(freshTxns);
    setConfirmDel(null);
    showToast('Transaction removed. Holdings updated.', 'success');
  };

  // ── After CSV import, reload everything ────────────────────────────────────
  const handleImportDone = async (updatedAccounts, count) => {
    setAccounts(updatedAccounts);
    const freshTxns = await DB.getTransactions();
    freshTxns.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    setTransactions(freshTxns);
    showToast(`${count} transaction${count !== 1 ? 's' : ''} imported. Holdings updated.`, 'success');
  };

  // ── Filtered view ───────────────────────────────────────────────────────────
  const visible = transactions.filter(t => {
    if (filterAcct !== 'all' && t.accountId !== filterAcct) return false;
    if (filterType !== 'all' && t.type !== filterType) return false;
    return true;
  });

  const totalBuys  = transactions.filter(t => t.type === 'buy').length;
  const totalSells = transactions.filter(t => t.type === 'sell').length;

  const acctName = id => accounts.find(a => a.id === id)?.label || '—';
  const eligibleAccounts = accounts.filter(a => ['equities','crypto','metals'].includes(a.type));

  return React.createElement('div', { className: 'fade-up', style: { padding: '22px 16px', background: T.bg, minHeight: '100vh' } },
    React.createElement('div', { style: { maxWidth: 800, margin: '0 auto' } },

      // ── Page header ─────────────────────────────────────────────────────────
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 } },
        React.createElement('div', null,
          React.createElement(Lbl, { style: { marginBottom: 4 } }, 'History'),
          React.createElement('h2', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 800, fontSize: F.xl, color: T.text } }, 'Transactions'),
        ),
        React.createElement('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' } },
          React.createElement(Btn, {
            onClick: () => setShowImport(true),
            variant: 'secondary',
            style: { fontSize: F.xs, padding: '8px 14px' },
          }, '📂 Import CSV'),
          React.createElement(Btn, {
            onClick: () => setShowForm('new'),
            style: { fontSize: F.xs, padding: '8px 14px' },
          }, '+ Add'),
        ),
      ),

      // ── Summary pills ────────────────────────────────────────────────────────
      transactions.length > 0 && React.createElement('div', { style: { display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' } },
        React.createElement('div', { style: { padding: '6px 14px', borderRadius: 20, background: T.surfaceAlt, border: `1px solid ${T.border}`, fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textSub } },
          `${transactions.length} total`
        ),
        React.createElement('div', { style: { padding: '6px 14px', borderRadius: 20, background: T.positive + '18', border: `1px solid ${T.positive}44`, fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.positive } },
          `▲ ${totalBuys} buys`
        ),
        React.createElement('div', { style: { padding: '6px 14px', borderRadius: 20, background: T.negative + '18', border: `1px solid ${T.negative}44`, fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.negative } },
          `▼ ${totalSells} sells`
        ),
      ),

      // ── Filters ──────────────────────────────────────────────────────────────
      transactions.length > 0 && React.createElement('div', { style: { display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' } },
        // Account filter
        React.createElement('select', {
          value: filterAcct,
          onChange: e => setFilterAcct(e.target.value),
          style: { ...inputStyle(T, F), width: 'auto', padding: '7px 12px', fontSize: F.xs, borderRadius: 10 },
        },
          React.createElement('option', { value: 'all' }, 'All Accounts'),
          ...eligibleAccounts.map(a => React.createElement('option', { key: a.id, value: a.id }, a.label)),
        ),
        // Type filter
        ['all', 'buy', 'sell'].map(t =>
          React.createElement('button', {
            key: t,
            onClick: () => setFilterType(t),
            style: {
              padding: '7px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: F.xs, fontWeight: 500,
              border: `1px solid ${filterType === t ? T.accent : T.border}`,
              background: filterType === t ? T.accentGlow : 'transparent',
              color: filterType === t ? T.accent : T.textMuted,
              transition: 'all 0.15s',
            },
          }, t === 'all' ? 'All Types' : t === 'buy' ? '▲ Buys' : '▼ Sells')
        ),
      ),

      // ── Loading state ────────────────────────────────────────────────────────
      loading && React.createElement('div', { style: { textAlign: 'center', padding: '48px 0', color: T.textMuted, fontFamily: "'Inter', sans-serif", fontSize: F.sm } },
        React.createElement('div', { className: 'spin', style: { width: 28, height: 28, border: `3px solid ${T.accent}`, borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', marginBottom: 12 } }),
        React.createElement('div', null, 'Loading transactions…'),
      ),

      // ── Empty state ──────────────────────────────────────────────────────────
      !loading && transactions.length === 0 && React.createElement('div', {
        style: { textAlign: 'center', padding: '56px 24px', background: T.surface, borderRadius: 20, border: `1px solid ${T.border}` },
      },
        React.createElement('div', { style: { fontSize: 48, marginBottom: 14 } }, '📋'),
        React.createElement('div', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 700, fontSize: F.lg, color: T.text, marginBottom: 8 } },
          'No transactions yet'
        ),
        React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.textSub, lineHeight: 1.6, maxWidth: 320, margin: '0 auto 24px' } },
          'Import a CSV from your broker or add transactions manually. Buys and sells will automatically update your holdings.'
        ),
        React.createElement('div', { style: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' } },
          React.createElement(Btn, { onClick: () => setShowImport(true) }, '📂 Import CSV'),
          React.createElement(Btn, { onClick: () => setShowForm('new'), variant: 'secondary' }, '+ Add Manually'),
        ),
      ),

      // ── No results after filtering ────────────────────────────────────────────
      !loading && transactions.length > 0 && visible.length === 0 && React.createElement('div', {
        style: { textAlign: 'center', padding: '40px 24px', color: T.textMuted, fontFamily: "'Inter', sans-serif", fontSize: F.sm },
      }, 'No transactions match the selected filters.'),

      // ── Transaction cards ─────────────────────────────────────────────────────
      !loading && visible.length > 0 && React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
        visible.map(txn => {
          const isBuy = txn.type === 'buy';
          return React.createElement('div', {
            key: txn.id,
            style: {
              background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14,
              padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
            },
          },
            // Type badge
            React.createElement('div', {
              style: {
                flexShrink: 0, width: 44, height: 44, borderRadius: 12,
                background: isBuy ? T.positive + '18' : T.negative + '18',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: F.xs,
                color: isBuy ? T.positive : T.negative,
              },
            }, isBuy ? '▲' : '▼'),

            // Main info
            React.createElement('div', { style: { flex: 1, minWidth: 0 } },
              React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
                React.createElement('span', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 800, fontSize: F.base, color: T.text } },
                  txn.ticker
                ),
                React.createElement('span', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textSub } },
                  `× ${txn.qty >= 1 ? txn.qty.toLocaleString() : txn.qty}`
                ),
                txn.source === 'csv' && React.createElement('span', {
                  style: { fontFamily: "'Inter', sans-serif", fontSize: 10, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 5, padding: '1px 6px', color: T.textMuted },
                }, txn.broker || 'CSV'),
              ),
              React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted, marginTop: 3 } },
                `${fmtDate(txn.date)}  ·  ${acctName(txn.accountId)}`
              ),
              txn.notes && React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textSub, marginTop: 2, fontStyle: 'italic' } },
                txn.notes
              ),
            ),

            // Value + actions
            React.createElement('div', { style: { flexShrink: 0, textAlign: 'right' } },
              React.createElement('div', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 800, fontSize: F.base, color: T.accent, marginBottom: 6 } },
                txn.total > 0 ? fmtD(txn.total) : txn.price > 0 ? `@ ${fmtD(txn.price)}` : '—'
              ),
              React.createElement('div', { style: { display: 'flex', gap: 6, justifyContent: 'flex-end' } },
                React.createElement('button', {
                  onClick: () => setShowForm(txn),
                  title: 'Edit',
                  style: { background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 8, padding: '5px 10px', color: T.textSub, fontSize: F.xs, cursor: 'pointer' },
                }, '✎'),
                React.createElement('button', {
                  onClick: () => setConfirmDel(txn),
                  title: 'Delete',
                  style: { background: 'none', border: `1px solid ${T.border}`, borderRadius: 8, padding: '5px 10px', color: T.accentDim || '#8a6830', fontSize: F.xs, cursor: 'pointer' },
                }, '✕'),
              ),
            ),
          );
        }),
      ),

      React.createElement('div', { style: { paddingBottom: 100 } }),
    ),

    // ── Delete confirmation ──────────────────────────────────────────────────
    confirmDel && React.createElement('div', { className: 'modal-overlay' },
      React.createElement('div', {
        className: 'scale-in',
        style: { background: T.modalBg, border: `1px solid ${T.border}`, borderRadius: 20, padding: 28, width: '100%', maxWidth: 360, textAlign: 'center' },
      },
        React.createElement('div', { style: { fontSize: 36, marginBottom: 12 } }, '🗑️'),
        React.createElement('div', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 800, fontSize: F.lg, color: T.text, marginBottom: 8 } },
          'Remove Transaction?'
        ),
        React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.textSub, lineHeight: 1.5, marginBottom: 20 } },
          `This will remove the ${confirmDel.type} of ${confirmDel.qty} ${confirmDel.ticker} and reverse the update to your holdings.`
        ),
        React.createElement('div', { style: { display: 'flex', gap: 10 } },
          React.createElement(Btn, { onClick: () => setConfirmDel(null), variant: 'secondary', style: { flex: 1 } }, 'Keep It'),
          React.createElement(Btn, { onClick: () => handleDeleteTxn(confirmDel), variant: 'danger', style: { flex: 1 } }, 'Yes, Remove'),
        ),
      ),
    ),

    // ── Modals ────────────────────────────────────────────────────────────────
    showImport && React.createElement(ImportModal, {
      accounts,
      onImport: handleImportDone,
      onClose:  () => setShowImport(false),
    }),

    (showForm === 'new' || (showForm && typeof showForm === 'object')) && React.createElement(TxnFormModal, {
      txn:      showForm === 'new' ? null : showForm,
      accounts,
      onSave:   handleSaveTxn,
      onClose:  () => setShowForm(null),
    }),
  );
};
