// src/pages/WeeklyReport.js
const { useState, useEffect, useContext, useCallback } = React;

window.WeeklyReportPage = function ({ accounts, income, liveValues, isOnline }) {
  const { T, F } = useContext(AppCtx);
  const [snaps,    setSnaps]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null); // selected week index for detail

  useEffect(() => {
    (async () => {
      setLoading(true);
      const history = await PriceEngine.getWeeklyHistory(16);
      setSnaps(history);
      if (history.length > 0) setSelected(history.length - 1); // default: latest
      setLoading(false);
    })();
  }, []);

  const fmt = window.fmt;
  const fmtD = window.fmtD;
  const fmtPct = (n) => (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
  const fmtChange = (n) => (n >= 0 ? '+' : '') + fmt(Math.abs(n));

  // ── Compute net worth from a snapshot ──────────────────────────────────────
  function snapNetWorth(snap) {
    if (!snap) return 0;
    return snap.accounts.reduce((sum, a) => {
      const meta = TYPE_META[a.type] || {};
      return a.type === 'debt' ? sum - Math.abs(a.amount) : sum + a.amount;
    }, 0);
  }

  function snapAssets(snap) {
    if (!snap) return 0;
    return snap.accounts.filter(a => a.type !== 'debt').reduce((s, a) => s + a.amount, 0);
  }
  function snapDebts(snap) {
    if (!snap) return 0;
    return snap.accounts.filter(a => a.type === 'debt').reduce((s, a) => s + Math.abs(a.amount), 0);
  }

  // ── Current snapshot from live values ─────────────────────────────────────
  const currentSnap = {
    date: new Date().toISOString(),
    accounts: accounts.map(a => ({
      id: a.id, label: a.label, type: a.type,
      amount: liveValues?.[a.id]?.totalValue ?? a.amount,
      positions: liveValues?.[a.id]?.positions || a.positions || [],
    })),
  };

  const currentNW = snapNetWorth(currentSnap);
  const prevSnap  = snaps.length > 0 ? snaps[snaps.length - 1] : null;
  const prevNW    = snapNetWorth(prevSnap);
  const weekChange  = currentNW - prevNW;
  const weekChangePct = prevNW !== 0 ? (weekChange / Math.abs(prevNW)) * 100 : 0;

  const changeColor = weekChange >= 0 ? T.positive : T.negative;
  const changeIcon  = weekChange >= 0 ? '▲' : '▼';

  // ── Narrative summary ──────────────────────────────────────────────────────
  function getNarrative(change, pct, assets, debts) {
    const absChange = Math.abs(change);
    const direction = change >= 0 ? 'up' : 'down';
    const magnitude = absChange < 50 ? 'minimal' : absChange < 500 ? 'modest' : absChange < 2000 ? 'notable' : 'significant';

    if (magnitude === 'minimal') {
      return `Your net worth held relatively steady this week — ${direction === 'up' ? 'a small gain' : 'a small dip'} of ${fmt(absChange)}. Steady consistency is the foundation of long-term wealth.`;
    }
    if (direction === 'up') {
      if (magnitude === 'modest') return `Solid week — net worth grew by ${fmt(absChange)} (${fmtPct(pct)}). Keep the momentum going.`;
      if (magnitude === 'notable') return `Strong week — you added ${fmt(absChange)} to your net worth (${fmtPct(pct)}). Market movements or debt paydown drove a meaningful improvement.`;
      return `Exceptional week — net worth jumped ${fmt(absChange)} (${fmtPct(pct)}). A significant move worth noting.`;
    } else {
      if (magnitude === 'modest') return `Net worth dipped ${fmt(absChange)} this week (${fmtPct(Math.abs(pct))}). Normal market variance — stay the course.`;
      if (magnitude === 'notable') return `Net worth dropped ${fmt(absChange)} this week (${fmtPct(Math.abs(pct))}). Review your strategy — is this market volatility or a spending leak?`;
      return `Significant drop of ${fmt(absChange)} this week. This deserves a close look. Check your accounts for any large unplanned expenses or market moves.`;
    }
  }

  // ── Account-level change breakdown ────────────────────────────────────────
  function getAccountChanges() {
    if (!prevSnap) return [];
    return currentSnap.accounts.map(curr => {
      const prev = prevSnap.accounts.find(a => a.id === curr.id);
      const prevAmt = prev?.amount || 0;
      const change  = curr.amount - prevAmt;
      return { ...curr, prevAmt, change, changePct: prevAmt !== 0 ? (change / Math.abs(prevAmt)) * 100 : 0 };
    }).filter(a => Math.abs(a.change) > 0.01);
  }

  const acctChanges  = getAccountChanges();
  const gainers      = acctChanges.filter(a => a.change > 0).sort((a, b) => b.change - a.change);
  const losers       = acctChanges.filter(a => a.change < 0).sort((a, b) => a.change - b.change);

  // ── Sparkline SVG ──────────────────────────────────────────────────────────
  function Sparkline({ data, width = 200, height = 50, color }) {
    if (data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const pts = data.map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 8) - 4;
      return `${x},${y}`;
    }).join(' ');
    return React.createElement('svg', { width, height, style: { overflow: 'visible' } },
      React.createElement('polyline', { points: pts, fill: 'none', stroke: color || T.cyan, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }),
      React.createElement('circle', { cx: pts.split(' ').slice(-1)[0].split(',')[0], cy: pts.split(' ').slice(-1)[0].split(',')[1], r: 3, fill: color || T.cyan }),
    );
  }

  // ── Net worth history for chart ────────────────────────────────────────────
  const historyNW = snaps.map(s => snapNetWorth(s));
  const historyDates = snaps.map(s => {
    const d = new Date(s.date);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) return React.createElement('div', { style: { padding: '60px 20px', textAlign: 'center', color: T.textMuted, fontFamily: "'Playfair Display', sans-serif" } },
    React.createElement('div', { style: { fontSize: 36, marginBottom: 12 } }, '📊'),
    React.createElement('div', null, 'Loading weekly report…'),
  );

  return React.createElement('div', { style: { padding: '16px 16px 100px' } },

    // ── Header ──────────────────────────────────────────────────────────────
    React.createElement('div', { style: { marginBottom: 22 } },
      React.createElement('h2', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 900, fontSize: F.lg + 2, color: T.text, marginBottom: 4 } }, '📊 Weekly Report'),
      React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.textMuted } },
        snaps.length === 0
          ? 'Your first snapshot will be saved automatically. Come back next week to see your first week-over-week report.'
          : `Updated ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · ${snaps.length} week${snaps.length !== 1 ? 's' : ''} of history`,
      ),
    ),

    // ── This week hero card ──────────────────────────────────────────────────
    React.createElement('div', { style: { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, padding: 22, marginBottom: 16 } },
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 } },
        React.createElement('div', null,
          React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 } }, 'Net Worth'),
          React.createElement('div', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 900, fontSize: F.hero, color: T.text, lineHeight: 1 } }, fmt(currentNW)),
        ),
        prevSnap && React.createElement('div', { style: { textAlign: 'right' } },
          React.createElement('div', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 800, fontSize: F.md, color: changeColor } }, `${changeIcon} ${fmt(Math.abs(weekChange))}`),
          React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: changeColor } }, `${fmtPct(weekChangePct)} this week`),
        ),
      ),

      // Assets / Debts breakdown
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 } },
        React.createElement('div', { style: { background: T.surfaceAlt, borderRadius: 10, padding: '12px 14px' } },
          React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted, marginBottom: 4 } }, 'Total Assets'),
          React.createElement('div', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 800, fontSize: F.md, color: T.positive } }, fmt(snapAssets(currentSnap))),
          prevSnap && React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted, marginTop: 2 } },
            (() => { const d = snapAssets(currentSnap) - snapAssets(prevSnap); return `${d >= 0 ? '+' : ''}${fmt(d)} vs last week`; })()
          ),
        ),
        React.createElement('div', { style: { background: T.surfaceAlt, borderRadius: 10, padding: '12px 14px' } },
          React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted, marginBottom: 4 } }, 'Total Debt'),
          React.createElement('div', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 800, fontSize: F.md, color: T.negative } }, fmt(snapDebts(currentSnap))),
          prevSnap && React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted, marginTop: 2 } },
            (() => { const d = snapDebts(currentSnap) - snapDebts(prevSnap); return d <= 0 ? `${fmt(Math.abs(d))} paid down ✓` : `+${fmt(d)} added`; })()
          ),
        ),
      ),

      // Narrative
      prevSnap && React.createElement('div', { style: { background: T.surfaceAlt, borderRadius: 10, padding: '12px 15px', fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.textSub, lineHeight: 1.7 } },
        getNarrative(weekChange, weekChangePct, snapAssets(currentSnap), snapDebts(currentSnap))
      ),

      // First-time notice
      !prevSnap && React.createElement('div', { style: { background: T.cyanDim, border: `1px solid ${T.cyan}33`, borderRadius: 10, padding: '12px 15px', fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.textSub, lineHeight: 1.7 } },
        '📍 This is your starting baseline. When you return next week, you\'ll see exactly how much your net worth has grown or changed — and why.'
      ),
    ),

    // ── Sparkline history chart ──────────────────────────────────────────────
    historyNW.length >= 2 && React.createElement('div', { style: { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, padding: 20, marginBottom: 16 } },
      React.createElement('div', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 800, fontSize: F.base, color: T.text, marginBottom: 14 } }, 'Net Worth Over Time'),
      React.createElement('div', { style: { width: '100%', overflowX: 'auto' } },
        (() => {
          const w = Math.max(300, historyNW.length * 40);
          const h = 90;
          const min = Math.min(...historyNW);
          const max = Math.max(...historyNW);
          const range = max - min || 1;
          const pts = historyNW.map((v, i) => {
            const x = 20 + (i / (historyNW.length - 1)) * (w - 40);
            const y = h - 10 - ((v - min) / range) * (h - 30);
            return { x, y, v, date: historyDates[i] };
          });
          const polyPts = pts.map(p => `${p.x},${p.y}`).join(' ');
          const areaD = `M ${pts[0].x} ${h} L ${pts.map(p => `${p.x},${p.y}`).join(' L ')} L ${pts[pts.length - 1].x} ${h} Z`;

          return React.createElement('svg', { width: w, height: h + 20, style: { display: 'block' } },
            React.createElement('defs', null,
              React.createElement('linearGradient', { id: 'areaGrad', x1: '0', y1: '0', x2: '0', y2: '1' },
                React.createElement('stop', { offset: '0%', stopColor: T.cyan, stopOpacity: '0.18' }),
                React.createElement('stop', { offset: '100%', stopColor: T.cyan, stopOpacity: '0' }),
              )
            ),
            React.createElement('path', { d: areaD, fill: 'url(#areaGrad)' }),
            React.createElement('polyline', { points: polyPts, fill: 'none', stroke: T.cyan, strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' }),
            ...pts.map((p, i) =>
              React.createElement('g', { key: i },
                React.createElement('circle', { cx: p.x, cy: p.y, r: 4, fill: T.cyan }),
                React.createElement('text', { x: p.x, y: h + 14, textAnchor: 'middle', fill: T.textMuted, fontSize: 10, fontFamily: "'Inter', sans-serif" }, p.date),
              )
            ),
          );
        })()
      ),
    ),

    // ── Movers this week ────────────────────────────────────────────────────
    (gainers.length > 0 || losers.length > 0) && React.createElement('div', { style: { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, padding: 20, marginBottom: 16 } },
      React.createElement('div', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 800, fontSize: F.base, color: T.text, marginBottom: 14 } }, 'What Moved This Week'),

      gainers.length > 0 && React.createElement('div', { style: { marginBottom: 14 } },
        React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.positive, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 } }, '▲ Gains'),
        ...gainers.slice(0, 5).map(a =>
          React.createElement('div', { key: a.id, style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${T.border}` } },
            React.createElement('div', null,
              React.createElement('span', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 700, fontSize: F.sm, color: T.text } }, a.label),
              React.createElement('span', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted, marginLeft: 8 } }, TYPE_META[a.type]?.label),
            ),
            React.createElement('div', { style: { textAlign: 'right' } },
              React.createElement('div', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 700, fontSize: F.sm, color: T.positive } }, `+${fmt(a.change)}`),
              React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.positive } }, fmtPct(a.changePct)),
            ),
          )
        ),
      ),

      losers.length > 0 && React.createElement('div', null,
        React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.negative, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 } }, '▼ Declines'),
        ...losers.slice(0, 5).map(a =>
          React.createElement('div', { key: a.id, style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${T.border}` } },
            React.createElement('div', null,
              React.createElement('span', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 700, fontSize: F.sm, color: T.text } }, a.label),
              React.createElement('span', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted, marginLeft: 8 } }, TYPE_META[a.type]?.label),
            ),
            React.createElement('div', { style: { textAlign: 'right' } },
              React.createElement('div', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 700, fontSize: F.sm, color: T.negative } }, fmt(a.change)),
              React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.negative } }, fmtPct(a.changePct)),
            ),
          )
        ),
      ),
    ),

    // ── Account by account snapshot ──────────────────────────────────────────
    React.createElement('div', { style: { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, padding: 20, marginBottom: 16 } },
      React.createElement('div', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 800, fontSize: F.base, color: T.text, marginBottom: 14 } }, 'Current Portfolio Snapshot'),
      ...currentSnap.accounts.map(a => {
        const meta = TYPE_META[a.type] || {};
        const isDebt = a.type === 'debt';
        const livePs = liveValues?.[a.id]?.positions || [];
        return React.createElement('div', { key: a.id, style: { padding: '11px 0', borderBottom: `1px solid ${T.border}` } },
          React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
            React.createElement('div', null,
              React.createElement('span', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 700, fontSize: F.sm, color: T.text } }, a.label),
              React.createElement('span', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted, marginLeft: 8 } }, meta.label),
            ),
            React.createElement('span', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 800, fontSize: F.sm, color: isDebt ? T.negative : (meta.color || T.text) } },
              isDebt ? `-${fmt(a.amount)}` : fmt(a.amount)
            ),
          ),
          // Show live positions if available
          livePs.length > 0 && React.createElement('div', { style: { marginTop: 7, paddingLeft: 12 } },
            ...livePs.filter(p => p.liveValue != null).map(p =>
              React.createElement('div', { key: p.id || (p.ticker || p.metal), style: { display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textSub } },
                React.createElement('span', null, p.ticker || p.metal),
                React.createElement('div', { style: { display: 'flex', gap: 10 } },
                  React.createElement('span', null, fmt(p.liveValue)),
                  p.change != null && React.createElement('span', { style: { color: p.change >= 0 ? T.positive : T.negative } }, fmtPct(p.change)),
                ),
              )
            )
          ),
        );
      }),
      // Total footer
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', paddingTop: 12, marginTop: 4 } },
        React.createElement('span', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 800, fontSize: F.base, color: T.text } }, 'Net Worth'),
        React.createElement('span', { style: { fontFamily: "'Playfair Display', sans-serif", fontWeight: 900, fontSize: F.md, color: currentNW >= 0 ? T.positive : T.negative } }, fmt(currentNW)),
      ),
    ),

    // ── Offline notice ───────────────────────────────────────────────────────
    !isOnline && React.createElement('div', { style: { background: 'rgba(212,148,58,0.12)', border: '1px solid rgba(212,148,58,0.3)', borderRadius: 12, padding: '12px 16px', fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: 'T.accent', marginBottom: 16 } },
      '📵 You\'re offline — showing last known values. Connect to internet for live prices.'
    ),

  ); // end page
};
