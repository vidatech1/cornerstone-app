// src/components/PieChart.js — Cornerstone Donut Chart
window.PieChart = function ({ slices, size = 180, centerLabel }) {
  const { T, F } = React.useContext(AppCtx);
  const [hov, setHov] = React.useState(null);
  const total = sumArr(slices.map(s => s.value));

  if (!total) return React.createElement('div', {
    style: { textAlign: 'center', color: T.textMuted, fontSize: F.sm, padding: '20px 0', fontFamily: "'Inter', sans-serif" }
  }, 'No data yet');

  let cum = -Math.PI / 2;
  const cx = size / 2, cy = size / 2, ir = size * 0.24;

  const paths = slices.map((s, i) => {
    const angle = (s.value / total) * 2 * Math.PI;
    const r = hov === i ? size * 0.40 : size * 0.37;
    cum += angle;
    const x1 = cx + r * Math.cos(cum - angle), y1 = cy + r * Math.sin(cum - angle);
    const x2 = cx + r * Math.cos(cum),          y2 = cy + r * Math.sin(cum);
    const xi1= cx + ir* Math.cos(cum - angle), yi1= cy + ir* Math.sin(cum - angle);
    const xi2= cx + ir* Math.cos(cum),          yi2= cy + ir* Math.sin(cum);
    const lg = angle > Math.PI ? 1 : 0;
    return {
      d: `M${xi1},${yi1} L${x1},${y1} A${r},${r} 0 ${lg},1 ${x2},${y2} L${xi2},${yi2} A${ir},${ir} 0 ${lg},0 ${xi1},${yi1} Z`,
      color: s.color, label: s.label,
      pct: ((s.value / total) * 100).toFixed(0),
      val: s.value,
    };
  });

  const handleHover = (i) => {
    if (window.playClick && i !== null && hov !== i) window.playClick();
    setHov(i);
  };

  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 } },
    React.createElement('svg', { width: size, height: size, style: { overflow: 'visible' } },
      ...paths.map((p, i) =>
        React.createElement('path', {
          key: i, d: p.d, fill: p.color,
          stroke: T.bg, strokeWidth: '2',
          style: { 
            transition: 'all 0.25s ease', 
            cursor: 'pointer', 
            opacity: hov !== null && hov !== i ? 0.5 : 1,
            filter: hov === i ? 'brightness(1.1)' : 'none',
          },
          onMouseEnter: () => handleHover(i),
          onMouseLeave: () => handleHover(null),
        })
      ),
      hov !== null
        ? React.createElement(React.Fragment, null,
            React.createElement('text', { x: cx, y: cy - 6, textAnchor: 'middle', fill: T.text, fontSize: F.sm + 2, fontFamily: "'Playfair Display', serif", fontWeight: '600' }, `${paths[hov].pct}%`),
            React.createElement('text', { x: cx, y: cy + 10, textAnchor: 'middle', fill: T.textSub, fontSize: F.xs, fontFamily: "'Inter', sans-serif" }, paths[hov].label),
          )
        : (centerLabel && React.createElement('text', { x: cx, y: cy + 3, textAnchor: 'middle', dominantBaseline: 'middle', fill: T.text, fontSize: F.sm, fontFamily: "'Playfair Display', serif", fontWeight: '600' }, centerLabel))
    ),
    React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px 16px', justifyContent: 'center', maxWidth: size + 60 } },
      ...paths.map((p, i) =>
        React.createElement('div', {
          key: i,
          onMouseEnter: () => handleHover(i),
          onMouseLeave: () => handleHover(null),
          style: { 
            display: 'flex', 
            alignItems: 'center', 
            gap: 6, 
            fontSize: F.xs, 
            color: hov === i ? T.text : T.textSub, 
            fontFamily: "'Inter', sans-serif", 
            cursor: 'pointer', 
            transition: 'all 0.2s',
            padding: '2px 0',
          },
        },
          React.createElement('div', { style: { width: 7, height: 7, borderRadius: '50%', background: p.color, flexShrink: 0 } }),
          React.createElement('span', null, p.label),
          React.createElement('span', { style: { color: T.text, fontWeight: 600 } }, `${p.pct}%`)
        )
      )
    )
  );
};
