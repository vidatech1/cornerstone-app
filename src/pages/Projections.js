// src/pages/Projections.js
const { useState, useMemo, useContext } = React;

window.ProjectionsPage = function ({ accounts, income, profile }) {
  const { T, F } = useContext(AppCtx);
  const age       = parseInt(profile?.age) || 35;
  const retireAge = 65;
  const yearsLeft = Math.max(0, retireAge - age);

  // Cap: max projection = min(90 − age, 60), floor 10
  const maxAllowedYrs = Math.max(10, Math.min(90 - age, 60));
  const yOptions = (() => {
    const base = [10, 20, 30].filter(y => y < maxAllowedYrs);
    if (!base.includes(maxAllowedYrs)) base.push(maxAllowedYrs);
    return base;
  })();

  const [selectedYr, setSelectedYr] = useState(Math.min(20, maxAllowedYrs));
  const [scenarios, setScenarios]   = useState([
    { id: 1, label: 'Conservative', growthAdj: -0.4, debtExtra: 0,   color: '#8a6830' },
    { id: 2, label: 'Current Plan', growthAdj: 0,    debtExtra: 0,   color: '#d4943a' },
    { id: 3, label: 'Aggressive',   growthAdj: 0.5,  debtExtra: 500, color: '#e8a84a' },
  ]);

  const setScField = (id, k, v) =>
    setScenarios(prev => prev.map(s => s.id === id ? { ...s, [k]: v } : s));

  // ── Core projection engine ─────────────────────────────────────────────────
  const compute = (sc, maxYr) => {
    const assetAccts = accounts.filter(a => a.type !== 'debt');
    let assets = sumArr(assetAccts.map(a => a.amount));
    let debt   = sumArr(accounts.filter(a => a.type === 'debt').map(a => a.amount));
    const mc   = sumArr(accounts
      .filter(a => ['equities','crypto','metals','property'].includes(a.type))
      .map(a => a.monthlyContrib || 0));

    // Weighted-average growth rate by account value
    const defaultG = { equities: 8, crypto: 20, metals: 5, property: 4, cash: 1 };
    const totalVal  = sumArr(assetAccts.map(a => a.amount)) || 1;
    const baseG     = assetAccts.length
      ? sumArr(assetAccts.map(a => (defaultG[a.type] || 6) * ((a.amount || 0) / totalVal)))
      : 7;
    const adjG = Math.max(0.1, baseG * (1 + sc.growthAdj));
    const mr   = (adjG / 100) / 12;
    const dp   = sumArr(accounts.filter(a => a.type === 'debt').map(a => a.monthlyContrib || 0))
               + sc.debtExtra;

    const pts = [];
    for (let m = 0; m <= maxYr * 12; m++) {
      if (m % 12 === 0) pts.push({
        year:   m / 12,
        assets: Math.round(assets),
        debt:   Math.round(debt),
        net:    Math.round(assets - debt),
      });
      assets = assets * (1 + mr) + mc;
      debt   = Math.max(0, debt - dp);
    }
    return pts;
  };

  const allData = useMemo(
    () => scenarios.map(sc => ({ ...sc, data: compute(sc, selectedYr) })),
    [scenarios, accounts, income, selectedYr]
  );

  // ── SVG chart ─────────────────────────────────────────────────────────────
  const ScenarioChart = ({ yr }) => {
    const W = 560, H = 150, PL = 68, PR = 16, PT = 14, PB = 30;
    const allNets = allData.flatMap(s => s.data.filter(d => d.year <= yr).map(d => d.net));
    if (!allNets.length) return null;
    const minN  = Math.min(0, ...allNets);
    const maxN  = Math.max(1, ...allNets);
    const range = maxN - minN;
    const xs = y => ((y / yr) * (W - PL - PR)) + PL;
    const ys = v => H - PB - ((v - minN) / range) * (H - PT - PB);
    const fmtAxis = v =>
      Math.abs(v) >= 1e6 ? `$${(v/1e6).toFixed(1)}M`
      : Math.abs(v) >= 1e3 ? `$${(v/1e3).toFixed(0)}k`
      : `$${Math.round(v)}`;
    const ticks   = [minN, minN + range * 0.5, maxN];
    const xLabels = [0, Math.round(yr / 2), yr];

    return React.createElement('div', { style: { overflowX: 'auto', marginBottom: 16 } },
      React.createElement('svg', {
        width: W, height: H,
        viewBox: `0 0 ${W} ${H}`,
        style: { display: 'block', minWidth: 260, width: '100%' },
      },
        ...ticks.map((v, i) => React.createElement('line', {
          key: 'g'+i, x1: PL, y1: ys(v), x2: W-PR, y2: ys(v),
          stroke: T.border, strokeWidth: 1, strokeDasharray: '3 3',
        })),
        React.createElement('line', { x1: PL, y1: H-PB, x2: W-PR, y2: H-PB, stroke: T.border, strokeWidth: 1 }),
        React.createElement('line', { x1: PL, y1: PT,   x2: PL,   y2: H-PB, stroke: T.border, strokeWidth: 1 }),
        minN < 0 && React.createElement('line', {
          x1: PL, y1: ys(0), x2: W-PR, y2: ys(0),
          stroke: T.border, strokeWidth: 1, strokeDasharray: '1 3',
        }),
        ...allData.map(sc => {
          const pts = sc.data.filter(d => d.year <= yr);
          if (pts.length < 2) return null;
          const d = pts.map((p, i) =>
            `${i===0?'M':'L'}${xs(p.year).toFixed(1)},${ys(p.net).toFixed(1)}`
          ).join(' ');
          return React.createElement('path', {
            key: sc.id, d, fill: 'none',
            stroke: sc.color, strokeWidth: 2,
            strokeLinejoin: 'round', strokeLinecap: 'round',
          });
        }),
        ...ticks.map((v, i) => React.createElement('text', {
          key: 'yl'+i, x: PL-6, y: ys(v)+4,
          textAnchor: 'end', fill: T.textMuted, fontSize: 10, fontFamily: 'Inter',
        }, fmtAxis(v))),
        ...xLabels.map(y => React.createElement('text', {
          key: 'xl'+y, x: xs(y), y: H-8,
          textAnchor: 'middle', fill: T.textMuted, fontSize: 10, fontFamily: 'Inter',
        }, new Date().getFullYear() + y)),
        yearsLeft > 0 && yearsLeft <= yr && React.createElement('line', {
          x1: xs(yearsLeft), y1: PT, x2: xs(yearsLeft), y2: H-PB,
          stroke: T.accent+'55', strokeWidth: 1, strokeDasharray: '4 3',
        }),
        yearsLeft > 0 && yearsLeft <= yr && React.createElement('text', {
          x: xs(yearsLeft)+4, y: PT+11,
          fill: T.accent, fontSize: 10, fontFamily: 'Inter',
        }, 'Retirement'),
      )
    );
  };

  const hasAssets = accounts.some(a => a.type !== 'debt' && (a.amount || 0) > 0);
  const iStyle = {
    background: T.surfaceAlt, border: `1px solid ${T.border}`,
    color: T.text, borderRadius: 8, padding: '7px 10px',
    fontSize: F.sm, width: '100%', fontFamily: "'Inter', sans-serif", outline: 'none',
  };

  return React.createElement('div', {
    className: 'fade-up',
    style: { padding: '24px 16px', background: T.bg, minHeight: '100vh' },
  },
    React.createElement('div', { style: { maxWidth: 800, margin: '0 auto' } },

      // Header
      React.createElement('div', { style: { marginBottom: 26 } },
        React.createElement('div', { style: { fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: T.accent, marginBottom: 5 } }, 'Forecast'),
        React.createElement('h2', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 500, fontSize: F.xl, color: T.text, marginBottom: 4 } }, 'Projections'),
        React.createElement('div', { style: { fontSize: F.sm, color: T.textMuted } },
          [profile?.name, `Age ${age}`, yearsLeft > 0 ? `${yearsLeft} yrs to retirement` : 'Retirement age reached'].filter(Boolean).join('  ·  ')
        ),
      ),

      // Empty state
      !hasAssets && React.createElement(Card, { style: { padding: '32px 24px', textAlign: 'center', marginBottom: 24 } },
        React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.md, color: T.text, marginBottom: 8 } }, 'No holdings to project'),
        React.createElement('div', { style: { fontSize: F.sm, color: T.textMuted, lineHeight: 1.6 } },
          'Add accounts in the Holdings tab to see your portfolio growth over time.'
        ),
      ),

      // Scenarios
      React.createElement('div', { style: { fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: T.textMuted, marginBottom: 12 } }, 'Scenarios'),
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 } },
        ...scenarios.map(sc =>
          React.createElement(Card, { key: sc.id, style: { padding: '16px 14px', borderTop: `2px solid ${sc.color}` } },
            React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: F.base, color: sc.color, marginBottom: 14 } }, sc.label),
            React.createElement('div', { style: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: T.textMuted, marginBottom: 5 } }, 'Growth Adj.'),
            React.createElement('select', {
              value: sc.growthAdj,
              onChange: e => setScField(sc.id, 'growthAdj', parseFloat(e.target.value)),
              style: { ...iStyle, marginBottom: 12, cursor: 'pointer' },
            },
              ...[[-0.5,'−50%  Bear'],[-0.4,'−40%'],[-0.2,'−20%'],[0,'Base Rate'],[0.2,'+20%'],[0.5,'+50%  Bull'],[1.0,'+100%']].map(
                ([v,l]) => React.createElement('option', { key: v, value: v }, l)
              )
            ),
            React.createElement('div', { style: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: T.textMuted, marginBottom: 5 } }, 'Extra Debt / Mo'),
            React.createElement('input', {
              type: 'number', value: sc.debtExtra,
              onChange: e => setScField(sc.id, 'debtExtra', parseFloat(e.target.value) || 0),
              placeholder: '0', style: iStyle,
            }),
          )
        )
      ),

      // Time horizon selector
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' } },
        React.createElement('div', { style: { fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: T.textMuted, marginRight: 4 } }, 'Time Horizon'),
        ...yOptions.map(y =>
          React.createElement('button', {
            key: y, onClick: () => setSelectedYr(y),
            style: {
              padding: '7px 16px', borderRadius: 8, cursor: 'pointer',
              border: `1px solid ${selectedYr === y ? T.accent : T.border}`,
              background: selectedYr === y ? T.accentGlow : 'transparent',
              color: selectedYr === y ? T.accent : T.textMuted,
              fontSize: F.xs, fontFamily: "'Inter', sans-serif", transition: 'all 0.15s',
            },
          }, `${y} yr`)
        ),
        React.createElement('span', { style: { fontSize: F.xs, color: T.textMuted, marginLeft: 'auto' } },
          `Max ${maxAllowedYrs} yrs  ·  age 90 cap`
        ),
      ),

      // Projection card
      React.createElement(Card, { style: { padding: '22px 18px', marginBottom: 16 } },
        React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 500, fontSize: F.lg, color: T.text, marginBottom: 2 } },
          `${selectedYr}-Year Projection`
        ),
        React.createElement('div', { style: { fontSize: F.sm, color: T.textMuted, marginBottom: 20 } },
          `${new Date().getFullYear()} — ${new Date().getFullYear() + selectedYr}  ·  Age ${age} to ${age + selectedYr}${age + selectedYr >= retireAge ? '  (Retirement)' : ''}`
        ),
        React.createElement(ScenarioChart, { yr: selectedYr }),
        React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 } },
          ...allData.map(sc => {
            const end = sc.data.find(d => d.year === selectedYr) || sc.data[sc.data.length - 1];
            if (!end) return null;
            return React.createElement('div', {
              key: sc.id,
              style: { padding: '14px 12px', borderTop: `2px solid ${sc.color}`, background: T.surfaceAlt, borderRadius: 10 },
            },
              React.createElement('div', { style: { fontSize: F.xs, color: sc.color, fontWeight: 600, marginBottom: 8, letterSpacing: 0.5 } }, sc.label),
              React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: F.lg, color: end.net >= 0 ? T.text : T.negative, marginBottom: 8 } },
                fmt(end.net)
              ),
              React.createElement('div', { style: { fontSize: F.xs, color: T.textMuted, lineHeight: 1.9 } }, `Assets  ${fmt(end.assets)}`),
              React.createElement('div', { style: { fontSize: F.xs, color: T.textMuted }              }, `Debt    ${fmt(end.debt)}`),
            );
          })
        ),
      ),

      // Assumptions
      React.createElement('div', {
        style: { padding: '14px 18px', borderRadius: 12, border: `1px solid ${T.border}`, marginBottom: 20 },
      },
        React.createElement('div', { style: { fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: T.textMuted, fontWeight: 600, marginBottom: 6 } }, 'Assumptions'),
        React.createElement('div', { style: { fontSize: F.xs, color: T.textMuted, lineHeight: 1.8 } },
          'Base annual growth: Equities 8%  ·  Crypto 20%  ·  Metals 5%  ·  Property 4%  ·  Cash 1%. ' +
          'Weighted by account value, adjusted per scenario. Mathematical estimates only — not investment advice. ' +
          'Consult a certified financial advisor before major decisions.'
        ),
      ),

      React.createElement('div', { style: { paddingBottom: 100 } }),
    )
  );
};
