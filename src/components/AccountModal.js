// src/components/AccountModal.js
const { useState, useContext } = React;

window.AccountModal = function ({ acct, onSave, onClose }) {
  const { T, F } = useContext(AppCtx);
  const isNew = !acct;

  const [form, setForm] = useState(acct
    ? { ...acct, positions: [...(acct.positions || [])] }
    : { label: '', type: 'cash', subtype: 'checking', amount: '', monthlyContrib: '', positions: [],
        // property fields
        propValue: '', propLoanBalance: '', propInterestRate: '', propMonthlyPayment: '',
        propPrincipal: '', propInterest: '', propEscrow: '',
        propFinanced: 'owned', propMake: '', propModel: '', propYear: '',
        propLoanAmount: '',
      }
  );

  // Position entry forms — different shape per type
  const blankStock  = { ticker: '', shares: '' };
  const blankCrypto = { ticker: '', qty: '' };
  const blankMetal  = { metal: 'gold', oz: '', count: '', unit: 'oz' };

  const [posStock,  setPosStock]  = useState(blankStock);
  const [posCrypto, setPosCrypto] = useState(blankCrypto);
  const [posMetal,  setPosMetal]  = useState(blankMetal);
  const [editingPos, setEditingPos] = useState(null); // Track which position is being edited
  const [err, setErr] = useState('');

  // ── Ticker autocomplete state ──────────────────────────────────────────────
  const [tickerSuggestions, setTickerSuggestions] = useState([]); // search results
  const [showSuggestions,   setShowSuggestions]   = useState(false);
  const [searchingTicker,   setSearchingTicker]   = useState(false);
  const _searchTimer = React.useRef(null);

  // ── Ticker history state ───────────────────────────────────────────────────
  const [tickerHistory,     setTickerHistory]     = useState(null);  // fetched history obj
  const [historyTicker,     setHistoryTicker]     = useState('');    // which ticker we have history for
  const [loadingHistory,    setLoadingHistory]    = useState(false);

  // Debounced ticker search — fires 400ms after user stops typing
  const onTickerInput = (rawVal) => {
    const val = rawVal.toUpperCase().trim();
    setPosStock(p => ({ ...p, ticker: val }));
    setTickerHistory(null); setHistoryTicker('');
    if (_searchTimer.current) clearTimeout(_searchTimer.current);
    if (val.length < 1) { setTickerSuggestions([]); setShowSuggestions(false); return; }
    setSearchingTicker(true);
    _searchTimer.current = setTimeout(async () => {
      const results = await PriceEngine.searchTickers(val);
      setTickerSuggestions(results);
      setShowSuggestions(results.length > 0);
      setSearchingTicker(false);
    }, 400);
  };

  // When a suggestion is selected — set ticker and fetch history immediately
  const selectSuggestion = async (suggestion) => {
    setPosStock(p => ({ ...p, ticker: suggestion.symbol }));
    setShowSuggestions(false);
    setTickerSuggestions([]);
    if (_searchTimer.current) clearTimeout(_searchTimer.current);
    // Fetch 10-year history for this ticker
    setLoadingHistory(true);
    setHistoryTicker(suggestion.symbol);
    const hist = await PriceEngine.fetchTickerHistory(suggestion.symbol, '10y');
    setTickerHistory(hist);
    setLoadingHistory(false);
  };

  const set = (k, v) => {
    if (k === 'type') {
      const s = Object.keys(SUBTYPE_MAP[v] || {})[0] || '';
      setForm(f => ({ ...f, type: v, subtype: s, positions: [] }));
    } else setForm(f => ({ ...f, [k]: v }));
  };

  const removePos = (id) => setForm(f => ({ ...f, positions: f.positions.filter(p => p.id !== id) }));
  
  // Update an existing position
  const updatePos = (id, updates) => setForm(f => ({
    ...f,
    positions: f.positions.map(p => p.id === id ? { ...p, ...updates } : p)
  }));
  
  // Start editing a position
  const startEditPos = (pos) => {
    if (window.playClick) window.playClick();
    setEditingPos({ ...pos });
  };
  
  // Save edited position
  const saveEditPos = () => {
    if (editingPos) {
      updatePos(editingPos.id, editingPos);
      setEditingPos(null);
    }
  };
  
  // Cancel editing
  const cancelEditPos = () => setEditingPos(null);

  // ── Add position handlers ──────────────────────────────────────────────────
  const addStock = () => {
    if (!posStock.ticker.trim()) { setErr('Enter a ticker symbol.'); return; }
    if (!posStock.shares || parseFloat(posStock.shares) <= 0) { setErr('Enter number of shares.'); return; }
    setForm(f => ({ ...f, positions: [...f.positions, { id: uid(), ticker: posStock.ticker.toUpperCase().trim(), shares: parseFloat(posStock.shares) }] }));
    setPosStock(blankStock); setErr('');
  };

  const addCrypto = () => {
    if (!posCrypto.ticker.trim()) { setErr('Enter a token symbol.'); return; }
    if (!posCrypto.qty || parseFloat(posCrypto.qty) <= 0) { setErr('Enter quantity of tokens.'); return; }
    setForm(f => ({ ...f, positions: [...f.positions, { id: uid(), ticker: posCrypto.ticker.toUpperCase().trim(), qty: parseFloat(posCrypto.qty) }] }));
    setPosCrypto(blankCrypto); setErr('');
  };

  const addMetal = () => {
    const isCountable = posMetal.metal === 'goldback' || posMetal.metal === 'silverback';
    if (isCountable) {
      if (!posMetal.count || parseFloat(posMetal.count) <= 0) { setErr('Enter number of pieces.'); return; }
    } else {
      if (!posMetal.oz || parseFloat(posMetal.oz) <= 0) { setErr('Enter troy oz.'); return; }
    }
    setForm(f => ({
      ...f,
      positions: [...f.positions, {
        id: uid(),
        metal: posMetal.metal,
        oz: parseFloat(posMetal.oz) || 0,
        count: parseFloat(posMetal.count) || 0,
        ticker: posMetal.metal.toUpperCase(),
      }],
    }));
    setPosMetal(blankMetal); setErr('');
  };

  const save = () => {
    if (!form.label.trim()) { setErr('Account name is required.'); return; }
    let amount = parseFloat(form.amount) || 0;
    // For real estate: auto-set amount to equity (value − loan balance)
    if (form.type === 'property' && form.subtype === 'realestate' && form.propValue) {
      const val = parseFloat(form.propValue) || 0;
      const bal = parseFloat(form.propLoanBalance) || 0;
      amount = val - bal;
    }
    // For vehicle: amount is the vehicle value
    if (form.type === 'property' && form.subtype === 'vehicle' && form.propValue) {
      const val = parseFloat(form.propValue) || 0;
      const bal = form.propFinanced === 'financed' ? (parseFloat(form.propLoanBalance) || 0) : 0;
      amount = val - bal;
    }
    onSave({ ...form, id: acct ? acct.id : uid(), amount, monthlyContrib: parseFloat(form.monthlyContrib) || 0 });
  };

  const iStyle = inputStyle(T, F);
  const isEquities = form.type === 'equities';
  const isCrypto   = form.type === 'crypto';
  const isMetals   = form.type === 'metals';
  const isProperty = form.type === 'property';
  const hasPositions = isEquities || isCrypto || isMetals;

  const METAL_OPTS = [
    { value: 'gold',      label: 'Gold coin/bar (oz)',    unit: 'oz' },
    { value: 'silver',    label: 'Silver coin/bar (oz)',  unit: 'oz' },
    { value: 'platinum',  label: 'Platinum (oz)',         unit: 'oz' },
    { value: 'palladium', label: 'Palladium (oz)',        unit: 'oz' },
    { value: 'goldback',  label: 'Goldbacks (count)',     unit: 'count' },
    { value: 'silverback',label: 'Silverbacks (count)',   unit: 'count' },
  ];

  const metalLabel = (p) => {
    const opt = METAL_OPTS.find(o => o.value === p.metal);
    if (p.metal === 'goldback' || p.metal === 'silverback') return `${p.count} × ${opt?.label || p.metal}`;
    return `${p.oz} oz ${opt?.label?.split(' ')[0] || p.metal}`;
  };

  return React.createElement('div', { className: 'modal-overlay', onClick: e => { if (e.target === e.currentTarget) onClose(); } },
    React.createElement('div', { className: 'scale-in', style: { background: T.modalBg, border: `1px solid ${T.border}`, borderRadius: 20, padding: 26, width: '100%', maxWidth: 520, maxHeight: '92vh', overflowY: 'auto' } },

      // Header
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 } },
        React.createElement('span', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 800, fontSize: F.lg, color: T.text } }, isNew ? 'Add Account' : 'Edit Account'),
        React.createElement('button', { onClick: onClose, style: { background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 8, color: T.textSub, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 } }, '✕'),
      ),

      // Error
      err && React.createElement('div', { style: { background: T.negative + '18', border: `1px solid ${T.negative}44`, borderRadius: 8, padding: '9px 14px', marginBottom: 14, fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.negative } }, err),

      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },

        // Account name
        React.createElement('div', null,
          React.createElement(Lbl, null, 'Account Name'),
          React.createElement('input', {
            value: form.label, onChange: e => set('label', e.target.value),
            placeholder: isCrypto ? 'e.g. Coinbase, Cold Wallet' : isMetals ? 'e.g. Home Safe, Safety Deposit Box' : 'e.g. Fidelity Roth IRA',
            style: iStyle, autoFocus: true,
          }),
        ),

        // Type + Subtype
        React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
          React.createElement('div', null,
            React.createElement(Lbl, null, 'Type'),
            React.createElement('select', { value: form.type, onChange: e => set('type', e.target.value), style: iStyle },
              ...Object.entries(TYPE_META).map(([k, v]) => React.createElement('option', { key: k, value: k }, v.label))
            ),
          ),
          React.createElement('div', null,
            React.createElement(Lbl, null, 'Sub-type'),
            React.createElement('select', { value: form.subtype, onChange: e => set('subtype', e.target.value), style: iStyle },
              ...Object.entries(SUBTYPE_MAP[form.type] || {}).map(([k, v]) => React.createElement('option', { key: k, value: k }, v))
            ),
          ),
        ),

        // Balance + monthly contrib (manual override / debt)
        React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
          React.createElement('div', null,
            React.createElement(Lbl, null, hasPositions ? 'Manual Value Override ($)' : 'Current Value ($)'),
            React.createElement('input', {
              type: 'number', value: form.amount, onChange: e => set('amount', e.target.value),
              placeholder: hasPositions ? 'Leave 0 — auto-calculated' : '0',
              style: iStyle,
            }),
            hasPositions && React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted, marginTop: 4 } },
              'Set to 0 and add positions below for live pricing.'
            ),
          ),
          React.createElement('div', null,
            React.createElement(Lbl, null, 'Monthly Contrib ($)'),
            React.createElement('input', { type: 'number', value: form.monthlyContrib, onChange: e => set('monthlyContrib', e.target.value), placeholder: '0', style: iStyle }),
          ),
        ),

        // ── Equities positions ───────────────────────────────────────────────
        isEquities && React.createElement('div', { style: { background: T.surfaceAlt, borderRadius: 14, padding: '14px 16px', border: `1px solid ${T.border}` } },
          React.createElement(Lbl, { style: { color: T.accent, marginBottom: 10 } }, 'Holdings — Stocks & ETFs'),
          React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted, marginBottom: 10 } },
            'Prices refresh automatically. Tap a position to edit.'
          ),
          // Existing positions
          form.positions.length > 0 && React.createElement('div', { style: { marginBottom: 12 } },
            ...form.positions.map(p =>
              editingPos && editingPos.id === p.id
                // Editing mode
                ? React.createElement('div', { key: p.id, style: { display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 6, padding: '8px 10px', background: T.accentGlow, borderRadius: 9, marginBottom: 6, border: `1px solid ${T.accent}` } },
                    React.createElement('input', {
                      value: editingPos.ticker,
                      onChange: e => setEditingPos(ep => ({ ...ep, ticker: e.target.value.toUpperCase() })),
                      style: { ...iStyle, fontSize: F.sm, padding: '6px 8px' },
                    }),
                    React.createElement('input', {
                      type: 'number',
                      value: editingPos.shares,
                      onChange: e => setEditingPos(ep => ({ ...ep, shares: parseFloat(e.target.value) || 0 })),
                      style: { ...iStyle, fontSize: F.sm, padding: '6px 8px' },
                    }),
                    React.createElement('button', { 
                      onClick: saveEditPos, 
                      style: { background: T.accent, border: 'none', borderRadius: 7, color: '#080d14', fontSize: F.xs, fontWeight: 600, padding: '6px 10px', cursor: 'pointer' } 
                    }, '✓'),
                    React.createElement('button', { 
                      onClick: cancelEditPos, 
                      style: { background: 'none', border: `1px solid ${T.border}`, borderRadius: 7, color: T.textMuted, fontSize: F.xs, padding: '6px 10px', cursor: 'pointer' } 
                    }, '✕'),
                  )
                // Display mode
                : React.createElement('div', { 
                    key: p.id, 
                    onClick: () => startEditPos(p),
                    style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: T.surface, borderRadius: 9, marginBottom: 6, border: `1px solid ${T.border}`, cursor: 'pointer', transition: 'all 0.2s' },
                  },
                    React.createElement('div', { style: { display: 'flex', gap: 10, alignItems: 'center' } },
                      React.createElement('span', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: F.sm, color: T.accent, minWidth: 60 } }, p.ticker),
                      React.createElement('span', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textSub } }, `${p.shares} shares`),
                    ),
                    React.createElement('div', { style: { display: 'flex', gap: 6, alignItems: 'center' } },
                      React.createElement('span', { style: { fontSize: F.xs, color: T.textMuted } }, '✎'),
                      React.createElement('button', { 
                        onClick: (e) => { e.stopPropagation(); removePos(p.id); }, 
                        style: { background: 'none', border: 'none', color: T.accentDim, fontSize: F.md, cursor: 'pointer', padding: '0 4px' } 
                      }, '✕'),
                    ),
                  )
            )
          ),
          // Add new stock
          React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            // Ticker input row with autocomplete
            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, position: 'relative' } },
              React.createElement('div', { style: { position: 'relative' } },
                React.createElement('input', {
                  value: posStock.ticker,
                  onChange: e => onTickerInput(e.target.value),
                  onKeyDown: e => {
                    if (e.key === 'Enter') { setShowSuggestions(false); addStock(); }
                    if (e.key === 'Escape') setShowSuggestions(false);
                  },
                  onBlur: () => setTimeout(() => setShowSuggestions(false), 180),
                  onFocus: () => tickerSuggestions.length > 0 && setShowSuggestions(true),
                  placeholder: 'Ticker (e.g. SCHD)',
                  style: { ...iStyle, fontSize: F.sm, padding: '8px 10px', paddingRight: searchingTicker ? 32 : 10 },
                }),
                // Spinner indicator
                searchingTicker && React.createElement('div', {
                  style: { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, borderRadius: '50%', border: `2px solid ${T.accent}`, borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }
                }),
                // Autocomplete dropdown
                showSuggestions && tickerSuggestions.length > 0 && React.createElement('div', {
                  style: { position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 300, background: T.surface, border: `1px solid ${T.borderStrong || T.border}`, borderRadius: 10, marginTop: 4, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }
                },
                  tickerSuggestions.map((s, i) =>
                    React.createElement('div', {
                      key: s.symbol + i,
                      onMouseDown: () => selectSuggestion(s),
                      style: { padding: '9px 12px', cursor: 'pointer', borderBottom: i < tickerSuggestions.length - 1 ? `1px solid ${T.border}` : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.15s' },
                      onMouseEnter: e => e.currentTarget.style.background = T.surfaceHover,
                      onMouseLeave: e => e.currentTarget.style.background = 'transparent',
                    },
                      React.createElement('div', null,
                        React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: F.sm, color: T.accent } }, s.symbol),
                        React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textSub, marginTop: 1 } }, s.name),
                      ),
                      React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: 10, color: T.textMuted, textAlign: 'right' } },
                        React.createElement('div', null, s.exchange),
                        React.createElement('div', { style: { color: s.type === 'MUTUALFUND' ? T.warning : s.type === 'ETF' ? T.info : T.textMuted } }, s.type),
                      ),
                    )
                  )
                ),
              ),
              React.createElement('input', {
                type: 'number', value: posStock.shares, onChange: e => setPosStock(p => ({ ...p, shares: e.target.value })),
                onKeyDown: e => e.key === 'Enter' && addStock(),
                placeholder: 'Shares', style: { ...iStyle, fontSize: F.sm, padding: '8px 10px' },
              }),
              React.createElement('button', {
                onClick: addStock,
                style: { background: T.accent, border: 'none', borderRadius: 9, color: '#080d14', fontSize: 20, fontWeight: 'bold', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
              }, '+'),
            ),
            // ── Historical performance summary panel ───────────────────────
            loadingHistory && React.createElement('div', {
              style: { padding: '10px 12px', background: T.surfaceAlt || T.surface, borderRadius: 10, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 8 }
            },
              React.createElement('div', { style: { width: 14, height: 14, borderRadius: '50%', border: `2px solid ${T.accent}`, borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite', flexShrink: 0 } }),
              React.createElement('span', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted } }, `Loading 10-year history for ${historyTicker}…`),
            ),
            tickerHistory && !loadingHistory && React.createElement('div', {
              style: { background: T.surfaceAlt || T.surface, borderRadius: 10, border: `1px solid ${T.border}`, overflow: 'hidden' }
            },
              // Header
              React.createElement('div', { style: { padding: '10px 12px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                React.createElement('div', null,
                  React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: F.sm, color: T.accent } }, tickerHistory.ticker),
                  React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textSub, marginTop: 1 } }, tickerHistory.name),
                ),
                React.createElement('div', { style: { textAlign: 'right' } },
                  React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: 10, color: T.textMuted } }, `${tickerHistory.range} period`),
                  tickerHistory.currentPrice && React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: F.sm, color: T.text } },
                    `$${tickerHistory.currentPrice.toFixed(2)}`
                  ),
                ),
              ),
              // Stats row
              React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, borderBottom: `1px solid ${T.border}` } },
                [
                  { label: 'Avg Annual Return', value: tickerHistory.avgAnnualReturnPct != null ? `${tickerHistory.avgAnnualReturnPct >= 0 ? '+' : ''}${tickerHistory.avgAnnualReturnPct.toFixed(1)}%` : '—', color: tickerHistory.avgAnnualReturnPct >= 0 ? T.positive : T.negative },
                  { label: 'Total Return', value: tickerHistory.totalReturnPct != null ? `${tickerHistory.totalReturnPct >= 0 ? '+' : ''}${tickerHistory.totalReturnPct.toFixed(0)}%` : '—', color: tickerHistory.totalReturnPct >= 0 ? T.positive : T.negative },
                  { label: 'Positive Years', value: tickerHistory.totalYears ? `${tickerHistory.positiveYears}/${tickerHistory.totalYears}` : '—', color: T.text },
                ].map((stat, i) =>
                  React.createElement('div', { key: i, style: { padding: '8px 10px', borderRight: i < 2 ? `1px solid ${T.border}` : 'none', textAlign: 'center' } },
                    React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: F.sm, color: stat.color } }, stat.value),
                    React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: 9, color: T.textMuted, marginTop: 2, lineHeight: 1.3 } }, stat.label),
                  )
                ),
              ),
              // Mini bar chart of annual returns
              tickerHistory.annualReturns.length > 0 && React.createElement('div', { style: { padding: '10px 12px' } },
                React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: 9, color: T.textMuted, marginBottom: 6 } }, 'Annual Returns'),
                React.createElement('div', { style: { display: 'flex', alignItems: 'flex-end', gap: 3, height: 40 } },
                  tickerHistory.annualReturns.slice(-10).map((r, i) => {
                    const maxAbs = Math.max(...tickerHistory.annualReturns.slice(-10).map(x => Math.abs(x.returnPct)), 1);
                    const pct = Math.abs(r.returnPct) / maxAbs;
                    const isPos = r.returnPct >= 0;
                    return React.createElement('div', { key: i, style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 } },
                      React.createElement('div', { title: `${r.year}: ${r.returnPct.toFixed(1)}%`, style: { width: '100%', height: `${Math.max(pct * 32, 3)}px`, background: isPos ? T.positive : T.negative, borderRadius: 2, opacity: 0.85 } }),
                      React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: 8, color: T.textMuted } }, String(r.year).slice(2)),
                    );
                  })
                ),
              ),
            ),
          ),
        ),

        // ── Crypto positions ─────────────────────────────────────────────────
        isCrypto && React.createElement('div', { style: { background: T.surfaceAlt, borderRadius: 14, padding: '14px 16px', border: `1px solid ${T.border}` } },
          React.createElement(Lbl, { style: { color: T.accent, marginBottom: 6 } }, 'Holdings — Crypto Tokens'),
          React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted, marginBottom: 10 } },
            'Prices from CoinGecko. Tap a token to edit its quantity.'
          ),
          // Existing crypto positions
          form.positions.length > 0 && React.createElement('div', { style: { marginBottom: 12 } },
            ...form.positions.map(p =>
              editingPos && editingPos.id === p.id
                // Editing mode
                ? React.createElement('div', { key: p.id, style: { display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 6, padding: '8px 10px', background: T.accentGlow, borderRadius: 9, marginBottom: 6, border: `1px solid ${T.accent}` } },
                    React.createElement('input', {
                      value: editingPos.ticker,
                      onChange: e => setEditingPos(ep => ({ ...ep, ticker: e.target.value.toUpperCase() })),
                      style: { ...iStyle, fontSize: F.sm, padding: '6px 8px' },
                    }),
                    React.createElement('input', {
                      type: 'number',
                      value: editingPos.qty,
                      onChange: e => setEditingPos(ep => ({ ...ep, qty: parseFloat(e.target.value) || 0 })),
                      style: { ...iStyle, fontSize: F.sm, padding: '6px 8px' },
                    }),
                    React.createElement('button', { 
                      onClick: saveEditPos, 
                      style: { background: T.accent, border: 'none', borderRadius: 7, color: '#080d14', fontSize: F.xs, fontWeight: 600, padding: '6px 10px', cursor: 'pointer' } 
                    }, '✓'),
                    React.createElement('button', { 
                      onClick: cancelEditPos, 
                      style: { background: 'none', border: `1px solid ${T.border}`, borderRadius: 7, color: T.textMuted, fontSize: F.xs, padding: '6px 10px', cursor: 'pointer' } 
                    }, '✕'),
                  )
                // Display mode
                : React.createElement('div', { 
                    key: p.id, 
                    onClick: () => startEditPos(p),
                    style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: T.surface, borderRadius: 9, marginBottom: 6, border: `1px solid ${T.border}`, cursor: 'pointer', transition: 'all 0.2s' },
                  },
                    React.createElement('div', { style: { display: 'flex', gap: 10, alignItems: 'center' } },
                      React.createElement('span', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: F.sm, color: T.accent, minWidth: 60 } }, p.ticker),
                      React.createElement('span', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textSub } },
                        p.qty >= 1 ? `${p.qty.toLocaleString()} tokens` : `${p.qty} tokens`
                      ),
                    ),
                    React.createElement('div', { style: { display: 'flex', gap: 6, alignItems: 'center' } },
                      React.createElement('span', { style: { fontSize: F.xs, color: T.textMuted } }, '✎'),
                      React.createElement('button', { 
                        onClick: (e) => { e.stopPropagation(); removePos(p.id); }, 
                        style: { background: 'none', border: 'none', color: T.accentDim, fontSize: F.md, cursor: 'pointer', padding: '0 4px' } 
                      }, '✕'),
                    ),
                  )
            )
          ),
          // Add new crypto
          React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8 } },
            React.createElement('input', {
              value: posCrypto.ticker, onChange: e => setPosCrypto(p => ({ ...p, ticker: e.target.value.toUpperCase() })),
              onKeyDown: e => e.key === 'Enter' && addCrypto(),
              placeholder: 'Symbol (e.g. BTC)', style: { ...iStyle, fontSize: F.sm, padding: '8px 10px' },
            }),
            React.createElement('input', {
              type: 'number', value: posCrypto.qty, onChange: e => setPosCrypto(p => ({ ...p, qty: e.target.value })),
              onKeyDown: e => e.key === 'Enter' && addCrypto(),
              placeholder: 'Quantity', style: { ...iStyle, fontSize: F.sm, padding: '8px 10px' },
            }),
            React.createElement('button', {
              onClick: addCrypto,
              style: { background: T.accent, border: 'none', borderRadius: 9, color: '#080d14', fontSize: 20, fontWeight: 'bold', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
            }, '+'),
          ),
          // Wallet label tip
          React.createElement('div', { style: { marginTop: 10, fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted, borderTop: `1px solid ${T.border}`, paddingTop: 10 } },
            '💡 Each "Account" = one wallet or exchange. Add another account for a separate wallet.'
          ),
        ),

        // ── Metals positions ─────────────────────────────────────────────────
        isMetals && React.createElement('div', { style: { background: T.surfaceAlt, borderRadius: 14, padding: '14px 16px', border: `1px solid ${T.border}` } },
          React.createElement(Lbl, { style: { color: T.accent, marginBottom: 6 } }, 'Holdings — Precious Metals'),
          React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted, marginBottom: 10, lineHeight: 1.5 } },
            'Live spot prices from metals.live. Goldbacks and silverbacks show melt value.'
          ),
          // Existing metals
          form.positions.length > 0 && React.createElement('div', { style: { marginBottom: 12 } },
            ...form.positions.map(p =>
              React.createElement('div', { key: p.id, style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: T.surface, borderRadius: 9, marginBottom: 6, border: `1px solid ${T.border}` } },
                React.createElement('div', null,
                  React.createElement('span', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: F.sm, color: T.accent } }, metalLabel(p)),
                ),
                React.createElement('button', { onClick: () => removePos(p.id), style: { background: 'none', border: 'none', color: T.accentDim, fontSize: F.md, cursor: 'pointer', padding: '0 4px' } }, '✕'),
              )
            )
          ),
          // Add metal
          React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
              React.createElement('select', {
                value: posMetal.metal,
                onChange: e => setPosMetal(p => ({ ...p, metal: e.target.value, oz: '', count: '' })),
                style: { ...iStyle, fontSize: F.sm, padding: '8px 10px' },
              },
                ...METAL_OPTS.map(o => React.createElement('option', { key: o.value, value: o.value }, o.label))
              ),
              (posMetal.metal === 'goldback' || posMetal.metal === 'silverback')
                ? React.createElement('input', {
                    type: 'number', value: posMetal.count, onChange: e => setPosMetal(p => ({ ...p, count: e.target.value })),
                    placeholder: '# of pieces', style: { ...iStyle, fontSize: F.sm, padding: '8px 10px' },
                  })
                : React.createElement('input', {
                    type: 'number', value: posMetal.oz, onChange: e => setPosMetal(p => ({ ...p, oz: e.target.value })),
                    placeholder: 'Troy oz', style: { ...iStyle, fontSize: F.sm, padding: '8px 10px' },
                  }),
            ),
            // Goldback/silverback melt value note
            (posMetal.metal === 'goldback') && React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: 'T.accent', lineHeight: 1.5 } },
              '⚠️ 1 goldback = 1/1000 troy oz of gold. Melt value is shown — actual resale value is typically 4–6× spot.'
            ),
            (posMetal.metal === 'silverback') && React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: 'T.accent', lineHeight: 1.5 } },
              '⚠️ 1 silverback = ~1 troy oz silver. Melt value shown — collector premium may apply.'
            ),
            React.createElement(Btn, { onClick: addMetal, variant: 'secondary', style: { width: '100%' } }, '+ Add to Vault'),
          ),
        ),

        // ── Property: Real Estate ────────────────────────────────────────────
        isProperty && form.subtype === 'realestate' && React.createElement('div', { style: { background: T.surfaceAlt, borderRadius: 14, padding: '14px 16px', border: `1px solid ${T.border}` } },
          React.createElement(Lbl, { style: { color: T.accent, marginBottom: 10 } }, '🏡 Real Estate Details'),

          React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 } },
            React.createElement('div', null,
              React.createElement(Lbl, null, 'Property Value ($)'),
              React.createElement('input', { type: 'number', value: form.propValue, onChange: e => set('propValue', e.target.value), placeholder: '450000', style: iStyle }),
            ),
            React.createElement('div', null,
              React.createElement(Lbl, null, 'Remaining Loan Balance ($)'),
              React.createElement('input', { type: 'number', value: form.propLoanBalance, onChange: e => set('propLoanBalance', e.target.value), placeholder: '320000', style: iStyle }),
            ),
          ),

          React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 } },
            React.createElement('div', null,
              React.createElement(Lbl, null, 'Interest Rate (%)'),
              React.createElement('input', { type: 'number', step: '0.01', value: form.propInterestRate, onChange: e => set('propInterestRate', e.target.value), placeholder: '6.5', style: iStyle }),
            ),
            React.createElement('div', null,
              React.createElement(Lbl, null, 'Monthly Payment ($)'),
              React.createElement('input', { type: 'number', value: form.propMonthlyPayment, onChange: e => set('propMonthlyPayment', e.target.value), placeholder: '2200', style: iStyle }),
            ),
          ),

          // Payment breakdown
          React.createElement(Lbl, { style: { marginBottom: 6 } }, 'Monthly Payment Breakdown (optional)'),
          React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 } },
            React.createElement('div', null,
              React.createElement(Lbl, null, 'Principal ($)'),
              React.createElement('input', { type: 'number', value: form.propPrincipal, onChange: e => set('propPrincipal', e.target.value), placeholder: '400', style: { ...iStyle, fontSize: F.xs } }),
            ),
            React.createElement('div', null,
              React.createElement(Lbl, null, 'Interest ($)'),
              React.createElement('input', { type: 'number', value: form.propInterest, onChange: e => set('propInterest', e.target.value), placeholder: '1600', style: { ...iStyle, fontSize: F.xs } }),
            ),
            React.createElement('div', null,
              React.createElement(Lbl, null, 'Escrow ($)'),
              React.createElement('input', { type: 'number', value: form.propEscrow, onChange: e => set('propEscrow', e.target.value), placeholder: '200', style: { ...iStyle, fontSize: F.xs } }),
            ),
          ),

          // Live equity preview
          form.propValue && form.propLoanBalance && React.createElement('div', { style: { padding: '10px 12px', background: T.accentGlow, borderRadius: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } },
            React.createElement('div', null,
              React.createElement('div', { style: { fontSize: 10, color: T.textMuted, marginBottom: 2 } }, 'Est. Equity'),
              React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.md, color: T.accent } },
                fmt(Math.max(0, (parseFloat(form.propValue) || 0) - (parseFloat(form.propLoanBalance) || 0)))
              ),
            ),
            React.createElement('div', null,
              React.createElement('div', { style: { fontSize: 10, color: T.textMuted, marginBottom: 2 } }, 'LTV Ratio'),
              React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.sm, color: T.text } },
                form.propValue ? Math.round(((parseFloat(form.propLoanBalance) || 0) / (parseFloat(form.propValue) || 1)) * 100) + '%' : '—'
              ),
            ),
          ),
          React.createElement('div', { style: { fontSize: F.xs, color: T.textMuted, marginTop: 8 } }, '💡 Net equity (value − balance) will be used as the asset value.'),
        ),

        // ── Property: Vehicle ────────────────────────────────────────────────
        isProperty && form.subtype === 'vehicle' && React.createElement('div', { style: { background: T.surfaceAlt, borderRadius: 14, padding: '14px 16px', border: `1px solid ${T.border}` } },
          React.createElement(Lbl, { style: { color: T.accent, marginBottom: 10 } }, '🚗 Vehicle Details'),

          React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 } },
            React.createElement('div', null,
              React.createElement(Lbl, null, 'Year'),
              React.createElement('input', { type: 'number', value: form.propYear, onChange: e => set('propYear', e.target.value), placeholder: '2020', style: iStyle }),
            ),
            React.createElement('div', null,
              React.createElement(Lbl, null, 'Make'),
              React.createElement('input', { value: form.propMake, onChange: e => set('propMake', e.target.value), placeholder: 'Toyota', style: iStyle }),
            ),
            React.createElement('div', null,
              React.createElement(Lbl, null, 'Model'),
              React.createElement('input', { value: form.propModel, onChange: e => set('propModel', e.target.value), placeholder: 'Camry', style: iStyle }),
            ),
          ),

          React.createElement('div', { style: { marginBottom: 10 } },
            React.createElement(Lbl, null, 'Ownership'),
            React.createElement('select', { value: form.propFinanced, onChange: e => set('propFinanced', e.target.value), style: { ...iStyle, cursor: 'pointer' } },
              React.createElement('option', { value: 'owned' }, '✅ Owned Outright'),
              React.createElement('option', { value: 'financed' }, '📋 Financed / Loan'),
            ),
          ),

          React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 } },
            React.createElement('div', null,
              React.createElement(Lbl, null, 'Est. Market Value ($)'),
              React.createElement('input', { type: 'number', value: form.propValue, onChange: e => set('propValue', e.target.value), placeholder: '18000', style: iStyle }),
              React.createElement('div', { style: { fontSize: 10, color: T.textMuted, marginTop: 3 } }, 'Use KBB or similar for estimate'),
            ),
            form.propFinanced === 'financed' && React.createElement('div', null,
              React.createElement(Lbl, null, 'Remaining Loan Balance ($)'),
              React.createElement('input', { type: 'number', value: form.propLoanBalance, onChange: e => set('propLoanBalance', e.target.value), placeholder: '12000', style: iStyle }),
            ),
          ),

          form.propFinanced === 'financed' && React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 } },
            React.createElement('div', null,
              React.createElement(Lbl, null, 'Loan Amount ($)'),
              React.createElement('input', { type: 'number', value: form.propLoanAmount, onChange: e => set('propLoanAmount', e.target.value), placeholder: '20000', style: iStyle }),
            ),
            React.createElement('div', null,
              React.createElement(Lbl, null, 'Interest Rate (%)'),
              React.createElement('input', { type: 'number', step: '0.01', value: form.propInterestRate, onChange: e => set('propInterestRate', e.target.value), placeholder: '4.9', style: iStyle }),
            ),
          ),

          form.propValue && React.createElement('div', { style: { padding: '10px 12px', background: T.accentGlow, borderRadius: 10 } },
            React.createElement('div', { style: { fontSize: 10, color: T.textMuted, marginBottom: 2 } },
              form.propFinanced === 'financed' ? 'Net Equity (Value − Balance)' : 'Asset Value'
            ),
            React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.md, color: T.accent } },
              fmt(
                form.propFinanced === 'financed'
                  ? Math.max(0, (parseFloat(form.propValue) || 0) - (parseFloat(form.propLoanBalance) || 0))
                  : (parseFloat(form.propValue) || 0)
              )
            ),
          ),
        ),

        // ── Property: Collection / Other ─────────────────────────────────────
        isProperty && form.subtype === 'collection' && React.createElement('div', { style: { background: T.surfaceAlt, borderRadius: 14, padding: '14px 16px', border: `1px solid ${T.border}` } },
          React.createElement(Lbl, { style: { color: T.accent, marginBottom: 10 } }, '🗃️ Collection / Personal Property'),
          React.createElement('div', { style: { fontSize: F.xs, color: T.textMuted, marginBottom: 12, lineHeight: 1.5 } },
            'Trading cards, jewelry, art, equipment, or any other tangible asset. Enter the estimated resale or appraised value.'
          ),
          React.createElement('div', { style: { marginBottom: 10 } },
            React.createElement(Lbl, null, 'Estimated Value ($)'),
            React.createElement('input', { type: 'number', value: form.amount, onChange: e => set('amount', e.target.value), placeholder: '0', style: iStyle }),
          ),
          React.createElement('div', { style: { fontSize: F.xs, color: T.textMuted } }, '💡 Group similar items (e.g. "Baseball Card Collection") under one entry to keep things tidy.'),
        ),

        // For property types, hide the default value/contrib row if using subtype-specific fields

        // Save / Cancel
        React.createElement('div', { style: { display: 'flex', gap: 10, marginTop: 4 } },
          React.createElement(Btn, { onClick: onClose, variant: 'secondary', style: { flex: 1 } }, 'Cancel'),
          React.createElement(Btn, { onClick: save, style: { flex: 2 } }, isNew ? 'Add Account' : 'Save Changes'),
        ),

      ) // end form column
    ) // end modal card
  ); // end overlay
};

// Expose metal options for use in Accounts page display
window.METAL_OPTS = [
  { value: 'gold',      label: 'Gold',       color: '#fbbf24' },
  { value: 'silver',    label: 'Silver',     color: '#d4d4d8' },
  { value: 'platinum',  label: 'Platinum',   color: '#a1a1aa' },
  { value: 'palladium', label: 'Palladium',  color: '#a8a29e' },
  { value: 'goldback',  label: 'Goldback',   color: '#fbbf24' },
  { value: 'silverback',label: 'Silverback', color: '#d4d4d8' },
];
