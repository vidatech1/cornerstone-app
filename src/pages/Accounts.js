// src/pages/Accounts.js
const { useState, useContext } = React;

window.AccountsPage = function ({ accounts, setAccounts, liveValues, pricesLoading, onRefreshPrices }) {
  const { T, F } = useContext(AppCtx);
  const [modal, setModal]       = useState(null);
  const [filter, setFilter]     = useState('all');
  const [pieAcct, setPieAcct]   = useState(null);

  const save = async acct => {
    const updated = accounts.find(a => a.id === acct.id)
      ? accounts.map(a => a.id === acct.id ? acct : a)
      : [...accounts, acct];
    setAccounts(updated);
    await DB.saveAccount(acct);
    setModal(null);
  };

  const remove = async id => {
    if (!confirm('Remove this account?')) return;
    setAccounts(accounts.filter(a => a.id !== id));
    await DB.deleteAccount(id);
  };

  const TYPES_LIST = ['cash', 'equities', 'crypto', 'metals', 'property', 'debt'];
  const visible = filter === 'all' ? accounts : accounts.filter(a => a.type === filter);
  const isLiveable = t => t === 'equities' || t === 'crypto' || t === 'metals';

  // Use live values where available for display amounts
  const displayAmount = (a) => liveValues?.[a.id]?.totalValue ?? a.amount;

  const allocSlices = TYPES_LIST.filter(t => t !== 'debt').map(t => ({
    label: TYPE_META[t].label,
    value: sumArr(accounts.filter(a => a.type === t).map(a => displayAmount(a))),
    color: TYPE_META[t].color,
  })).filter(s => s.value > 0);

  const cashSlices = [
    { label: 'Checking', value: sumArr(accounts.filter(a => a.type === 'cash' && a.subtype === 'checking').map(a => a.amount)), color: '#d4943a' },
    { label: 'Savings',  value: sumArr(accounts.filter(a => a.type === 'cash' && a.subtype === 'savings').map(a => a.amount)), color: '#e8a84a' },
  ].filter(s => s.value > 0);

  const COLS = ['#e8a84a','#d4943a','#a07830','#8a6830','#6a5840','#5a4830','#4a3820','#3a2810'];

  // Position detail modal — shows live prices
  const PosPieModal = ({ acct }) => {
    const lv = liveValues?.[acct.id];
    const enrichedPos = lv?.positions || acct.positions || [];
    const totalValue = lv?.totalValue ?? acct.amount;
    const slices = enrichedPos.map((p, i) => ({
      label: p.ticker || p.metal,
      value: p.liveValue ?? (totalValue / Math.max(enrichedPos.length, 1)),
      color: COLS[i % COLS.length],
    }));

    return React.createElement('div', { className: 'modal-overlay', onClick: e => { if (e.target === e.currentTarget) setPieAcct(null); } },
      React.createElement('div', { className: 'scale-in', style: { background: T.modalBg, border: `1px solid ${T.border}`, borderRadius: 20, padding: 26, width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto' } },
        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 6 } },
          React.createElement('span', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 800, fontSize: F.lg, color: T.text } }, acct.label),
          React.createElement('button', { onClick: () => setPieAcct(null), style: { background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 8, color: T.textSub, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 } }, '✕'),
        ),
        React.createElement('div', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 800, fontSize: F.xl, color: TYPE_META[acct.type]?.color, textAlign: 'center', marginBottom: 12 } }, fmt(totalValue)),
        slices.length > 0
          ? React.createElement(PieChart, { slices, size: 180, centerLabel: fmt(totalValue) })
          : React.createElement('div', { style: { textAlign: 'center', color: T.textMuted, padding: '20px 0', fontFamily: "'Inter', sans-serif" } }, 'No positions yet.'),

        // Position table with live prices
        enrichedPos.length > 0 && React.createElement('div', { style: { marginTop: 16 } },
          // Header
          React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4, padding: '6px 0', borderBottom: `1px solid ${T.border}` } },
            ...['Asset', 'Qty', 'Price', 'Value'].map(h =>
              React.createElement('span', { key: h, style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted, letterSpacing: '1px', textTransform: 'uppercase' } }, h)
            )
          ),
          ...enrichedPos.map((p, i) => {
            const sym = p.ticker || p.metal || '';
            const qty = p.shares || p.qty || p.oz || p.count || 0;
            const price = p.livePrice;
            const val   = p.liveValue;
            const chg   = p.change;
            const srcBadge = p.source === 'estimate' ? '~est' : p.source === 'yahoo' ? 'YF' : p.source === 'coingecko' ? 'CG' : p.source === 'metals.live' ? 'ML' : '';
            return React.createElement('div', { key: p.id || sym, style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4, padding: '9px 0', borderBottom: `1px solid ${T.border}`, alignItems: 'center' } },
              React.createElement('div', null,
                React.createElement('span', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 700, fontSize: F.sm, color: COLS[i % COLS.length] } }, sym.toUpperCase()),
                srcBadge && React.createElement('span', { style: { fontFamily: "'Inter', sans-serif", fontSize: 9, color: T.textMuted, marginLeft: 4, background: T.surfaceAlt, padding: '1px 4px', borderRadius: 4 } }, srcBadge),
              ),
              React.createElement('span', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textSub } },
                qty >= 0.001 ? (qty >= 1000 ? qty.toLocaleString() : qty) : qty.toFixed(6)
              ),
              React.createElement('div', null,
                price != null
                  ? React.createElement('div', null,
                      React.createElement('div', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 600, fontSize: F.xs, color: T.text } }, `$${price >= 100 ? price.toLocaleString('en-US', { maximumFractionDigits: 2 }) : price.toFixed(price < 1 ? 4 : 2)}`),
                      chg != null && React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: 10, color: chg >= 0 ? T.positive : T.negative } },
                        `${chg >= 0 ? '▲' : '▼'} ${Math.abs(chg).toFixed(2)}%`
                      ),
                    )
                  : React.createElement('span', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted } }, '—'),
              ),
              React.createElement('span', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 700, fontSize: F.sm, color: val != null ? T.positive : T.textMuted } },
                val != null ? fmt(val) : '—'
              ),
            );
          }),
          // Premium note for goldbacks/silverbacks
          enrichedPos.some(p => p.premiumNote) && React.createElement('div', { style: { background: 'rgba(212,148,58,0.12)', border: '1px solid rgba(212,148,58,0.3)', borderRadius: 9, padding: '9px 12px', marginTop: 12, fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: 'T.accent', lineHeight: 1.5 } },
            enrichedPos.find(p => p.premiumNote)?.premiumNote
          ),
        ),
      )
    );
  };

  return React.createElement('div', { className: 'fade-up', style: { padding: '22px 16px', background: T.bg, minHeight: '100vh' } },
    React.createElement('div', { style: { maxWidth: 800, margin: '0 auto' } },
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 } },
        React.createElement('div', null,
          React.createElement(Lbl, { style: { marginBottom: 4 } }, 'Manage'),
          React.createElement('h2', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 800, fontSize: F.xl, color: T.text } }, 'Accounts'),
        ),
        React.createElement('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
          onRefreshPrices && React.createElement('button', {
            onClick: onRefreshPrices, disabled: pricesLoading,
            title: 'Refresh live prices',
            style: { background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 9, padding: '7px 12px', color: pricesLoading ? T.textMuted : T.cyan, fontSize: F.xs, fontFamily: "'Playfair Display', sans-serif", fontWeight: 700, cursor: pricesLoading ? 'wait' : 'pointer', transition: 'all 0.15s' },
          }, pricesLoading ? '↻ Loading…' : '↻ Refresh'),
          React.createElement(Btn, { onClick: () => setModal({ mode: 'add' }) }, '+ Add Account'),
        ),
      ),

      // Charts row
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 } },
        React.createElement(Card, { hover: true, style: { padding: '16px 14px', textAlign: 'center' } },
          React.createElement(Lbl, { style: { marginBottom: 10 } }, 'Asset Allocation'),
          React.createElement(PieChart, { slices: allocSlices, size: 150 }),
        ),
        React.createElement(Card, { hover: true, style: { padding: '16px 14px', textAlign: 'center' } },
          React.createElement(Lbl, { style: { marginBottom: 10 } }, 'Checking vs Savings'),
          React.createElement(PieChart, { slices: cashSlices, size: 150 }),
        ),
      ),

      // Filter pills
      React.createElement('div', { style: { display: 'flex', gap: 7, marginBottom: 18, flexWrap: 'wrap' } },
        ...['all', ...TYPES_LIST].map(t => {
          const active = filter === t;
          const col = t === 'all' ? T.accent : TYPE_META[t].color;
          return React.createElement('button', { key: t, onClick: () => setFilter(t), style: { padding: '6px 15px', borderRadius: 18, border: `2px solid ${active ? col : T.border}`, background: active ? col + '22' : 'transparent', color: active ? col : T.textMuted, fontSize: F.xs + 1, fontFamily: "'Playfair Display', sans-serif", fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' } },
            t === 'all' ? 'All' : TYPE_META[t].label
          );
        })
      ),

      // Account groups by type
      ...TYPES_LIST.map(type => {
        const accts = visible.filter(a => a.type === type);
        if (!accts.length) return null;
        const meta = TYPE_META[type];
        const groups = {};
        accts.forEach(a => { const k = a.subtype || 'other'; if (!groups[k]) groups[k] = []; groups[k].push(a); });

        return React.createElement('div', { key: type, style: { marginBottom: 22 } },
          React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 } },
            React.createElement(Lbl, { style: { color: meta.color } }, meta.label),
            React.createElement('span', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 700, fontSize: F.base, color: meta.color } },
              fmt(sumArr(accts.map(a => displayAmount(a))))
            ),
          ),
          ...Object.entries(groups).map(([sub, subAccts]) =>
            React.createElement('div', { key: sub, style: { marginBottom: 10 } },
              React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 7, paddingLeft: 4 } },
                (SUBTYPE_MAP[type] || {})[sub] || sub
              ),
              ...subAccts.map(a => {
                const live = liveValues?.[a.id];
                const dispAmt = live?.totalValue ?? a.amount;
                const hasLive = live && isLiveable(a.type) && (a.positions || []).length > 0;
                const livePosWithData = (live?.positions || []).filter(p => p.livePrice != null);

                return React.createElement(Card, { key: a.id, hover: true, style: { padding: '14px 16px', marginBottom: 7, border: `1px solid ${meta.color}30` } },
                  React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 } },
                    React.createElement('div', { style: { flex: 1 } },
                      React.createElement('div', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 700, fontSize: F.md, color: T.text, marginBottom: 4 } },
                        // Vehicle: show Year Make Model as subtitle if available
                        a.type === 'property' && a.subtype === 'vehicle' && (a.propYear || a.propMake)
                          ? React.createElement('div', null,
                              React.createElement('div', null, a.label),
                              React.createElement('div', { style: { fontSize: F.xs, color: T.textMuted, fontFamily: "'Inter', sans-serif", fontWeight: 400, marginTop: 2 } },
                                [a.propYear, a.propMake, a.propModel].filter(Boolean).join(' ')
                              ),
                            )
                          : a.label
                      ),
                      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 } },
                        React.createElement('div', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 800, fontSize: F.base + 1, color: meta.color } },
                          a.type === 'property' ? fmt(dispAmt) + ' equity' : fmtD(dispAmt)
                        ),
                        hasLive && React.createElement('span', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, background: T.cyanDim, color: T.cyan, borderRadius: 5, padding: '1px 6px' } }, 'live'),
                      ),
                      a.monthlyContrib > 0 && React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.positive } }, `+${fmt(a.monthlyContrib)}/mo`),

                      // Property detail pills
                      a.type === 'property' && a.subtype === 'realestate' && a.propValue && React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7 } },
                        React.createElement('span', { style: { fontSize: F.xs, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 6, padding: '2px 8px', color: T.textSub } }, '🏡 ' + fmt(parseFloat(a.propValue))),
                        a.propLoanBalance && React.createElement('span', { style: { fontSize: F.xs, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 6, padding: '2px 8px', color: T.textSub } }, '🏦 ' + fmt(parseFloat(a.propLoanBalance)) + ' balance'),
                        a.propInterestRate && React.createElement('span', { style: { fontSize: F.xs, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 6, padding: '2px 8px', color: T.textSub } }, a.propInterestRate + '% rate'),
                        a.propMonthlyPayment && React.createElement('span', { style: { fontSize: F.xs, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 6, padding: '2px 8px', color: T.textSub } }, fmt(parseFloat(a.propMonthlyPayment)) + '/mo'),
                        a.propPrincipal && a.propInterest && React.createElement('span', { style: { fontSize: F.xs, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 6, padding: '2px 8px', color: T.textSub } },
                          `P:${fmt(parseFloat(a.propPrincipal))} I:${fmt(parseFloat(a.propInterest))}${a.propEscrow ? ` E:${fmt(parseFloat(a.propEscrow))}` : ''}`
                        ),
                      ),
                      a.type === 'property' && a.subtype === 'vehicle' && a.propValue && React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7 } },
                        React.createElement('span', { style: { fontSize: F.xs, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 6, padding: '2px 8px', color: T.textSub } },
                          a.propFinanced === 'financed' ? '📋 Financed' : '✅ Owned'
                        ),
                        React.createElement('span', { style: { fontSize: F.xs, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 6, padding: '2px 8px', color: T.textSub } }, '📊 ' + fmt(parseFloat(a.propValue)) + ' value'),
                        a.propFinanced === 'financed' && a.propLoanBalance && React.createElement('span', { style: { fontSize: F.xs, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 6, padding: '2px 8px', color: T.textSub } }, fmt(parseFloat(a.propLoanBalance)) + ' remaining'),
                        a.propInterestRate && React.createElement('span', { style: { fontSize: F.xs, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 6, padding: '2px 8px', color: T.textSub } }, a.propInterestRate + '% rate'),
                      ),

                      // Show top positions inline with price change (non-property)
                      livePosWithData.length > 0 && React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7 } },
                        ...livePosWithData.slice(0, 5).map(p =>
                          React.createElement('span', { key: p.id || (p.ticker || p.metal), style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 6, padding: '2px 8px', color: T.textSub, display: 'inline-flex', gap: 4, alignItems: 'center' } },
                            React.createElement('span', { style: { fontWeight: 700 } }, (p.ticker || p.metal || '').toUpperCase()),
                            p.change != null && React.createElement('span', { style: { color: p.change >= 0 ? T.positive : T.negative } },
                              `${p.change >= 0 ? '▲' : '▼'}${Math.abs(p.change).toFixed(1)}%`
                            ),
                          )
                        )
                      ),
                      // Show ticker pills for accounts without live prices yet
                      !hasLive && (a.positions || []).length > 0 && React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7 } },
                        ...(a.positions || []).map(p => React.createElement('span', { key: p.id, style: { fontSize: F.xs, fontFamily: "'Inter', sans-serif", fontWeight: 600, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 6, padding: '2px 8px', color: T.textSub } }, p.ticker || p.metal || ''))
                      ),
                    ),
                    React.createElement('div', { style: { display: 'flex', gap: 5, flexShrink: 0 } },
                      isLiveable(a.type) && (a.positions || []).length > 0 && React.createElement(Btn, { onClick: () => setPieAcct(a), variant: 'secondary', style: { padding: '6px 10px', fontSize: F.xs } }, '📊'),
                      React.createElement(Btn, { onClick: () => setModal({ mode: 'edit', acct: a }), variant: 'secondary', style: { padding: '6px 10px', fontSize: F.xs } }, 'Edit'),
                      React.createElement(Btn, { onClick: () => remove(a.id), variant: 'danger', style: { padding: '6px 10px', fontSize: F.xs } }, '✕'),
                    ),
                  ),
                );
              })
            )
          )
        );
      }),

      React.createElement('div', { style: { paddingBottom: 100 } }),
    ),
    modal && React.createElement(AccountModal, { acct: modal.acct, onSave: save, onClose: () => setModal(null) }),
    pieAcct && React.createElement(PosPieModal, { acct: pieAcct }),
  );
};
