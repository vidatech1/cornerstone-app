// src/pages/Recommendations.js
const { useState, useMemo, useContext } = React;

window.RecommendationsPage = function ({ accounts, income, strategies, setStrategies }) {
  const { T, F } = useContext(AppCtx);
  const [adopted, setAdopted] = useState([]);
  const recs = useMemo(() => genRecommendations(accounts, income), [accounts, income]);
  const ws   = calcWealthScore(accounts, income);
  const pc   = { high: T.negative, medium: T.accent, low: T.positive };

  const adopt = async rec => {
    if (strategies.find(s => s.text === rec.strategy)) return;
    const s = { id: uid(), text: rec.strategy };
    setStrategies(prev => [...prev, s]);
    await DB.saveStrategy(s);
    setAdopted(prev => [...prev, rec.id]);
  };

  return React.createElement('div', { className: 'fade-up', style: { padding: '22px 16px', background: T.bg, minHeight: '100vh' } },
    React.createElement('div', { style: { maxWidth: 800, margin: '0 auto' } },
      React.createElement('div', { style: { marginBottom: 22 } },
        React.createElement(Lbl, { style: { marginBottom: 4 } }, 'Analysis'),
        React.createElement('h2', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 500, fontSize: F.xl, color: T.text, marginBottom: 4 } }, 'Recommendations'),
      ),

      // Score summary
      React.createElement(Card, { style: { padding: '18px 20px', marginBottom: 20, border: `1px solid ${T.accent}33` } },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 20 } },
          React.createElement(WealthGauge, { score: ws.score, label: ws.label, color: ws.color, size: 90 }),
          React.createElement('div', { style: { flex: 1 } },
            React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 500, fontSize: F.lg, color: T.text, marginBottom: 6 } }, `Position Score: ${ws.score}/100`),
            React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.textSub, lineHeight: 1.6 } }, `${ws.factors.filter(f => f.score / f.max >= 0.7).length} of 5 factors are strong. Focus on the recommendations below to improve your weakest areas.`),
          ),
        ),
      ),

      // Recommendations
      ...recs.map(rec => {
        const isAdopted = adopted.includes(rec.id) || strategies.some(s => s.text === rec.strategy);
        const priColor  = pc[rec.priority] || T.textMuted;
        return React.createElement(Card, { key: rec.id, hover: true, style: { padding: '20px 20px', marginBottom: 14, border: `1px solid ${priColor}33` } },
          React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 } },
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flex: 1 } },
              React.createElement('span', { style: { fontSize: F.xl } }, rec.icon),
              React.createElement('div', null,
                React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 500, fontSize: F.md, color: T.text, marginBottom: 3 } }, rec.title),
                React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 7 } },
                  React.createElement('span', { style: { fontSize: F.xs, fontFamily: "'Inter', sans-serif", fontWeight: 600, background: priColor + '22', color: priColor, borderRadius: 6, padding: '2px 8px' } }, rec.priority.toUpperCase()),
                  React.createElement('span', { style: { fontSize: F.xs, fontFamily: "'Inter', sans-serif", color: T.textMuted } }, rec.source),
                ),
              ),
            ),
          ),
          React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.textSub, lineHeight: 1.65, marginBottom: 14 } }, rec.desc),
          React.createElement('div', { style: { background: T.accentGlow || 'rgba(212,148,58,0.08)', borderRadius: 10, padding: '11px 14px', border: `1px solid ${T.border}`, marginBottom: 14 } },
            React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 } }, 'Suggested Strategy'),
            React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 500, fontSize: F.sm, color: T.text, lineHeight: 1.55 } }, rec.strategy),
          ),
          React.createElement(Btn, {
            onClick: () => adopt(rec),
            variant: isAdopted ? 'ghost' : 'primary',
            disabled: isAdopted,
            style: { fontSize: F.sm, padding: '9px 16px' },
          }, isAdopted ? '✓ Added to Strategies' : '+ Adopt This Strategy'),
        );
      }),

      React.createElement(Card, { style: { padding: '14px 18px', marginBottom: 20, border: `1px solid ${T.accent}44` } },
        React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 500, fontSize: F.sm, color: T.accent, marginBottom: 5 } }, '⚠️ Disclaimer'),
        React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.textSub, lineHeight: 1.65 } }, 'These recommendations are for educational purposes only and do not constitute professional financial advice. Consult a certified financial planner (CFP) before making major investment or debt decisions.'),
      ),
      React.createElement('div', { style: { paddingBottom: 100 } }),
    )
  );
};
