// src/components/WealthGauge.js — Cornerstone Arc Gauge
const { useState, useContext } = React;

// Simple arc gauge for dashboard cards
window.WealthGauge = function ({ score, size = 140 }) {
  const { T, F } = useContext(AppCtx);
  const tier = window.getTier ? window.getTier(score) : { name: 'Position' };
  
  // Arc geometry - semi-circle arc
  const width = size;
  const height = size * 0.6;
  const strokeWidth = size * 0.055;
  const radius = (width - strokeWidth * 2) / 2 - 10;
  const centerX = width / 2;
  const centerY = height - 10;
  
  // Arc path (semi-circle from left to right)
  const startX = centerX - radius;
  const endX = centerX + radius;
  const arcPath = `M ${startX} ${centerY} A ${radius} ${radius} 0 0 1 ${endX} ${centerY}`;
  
  // Calculate arc length and progress
  const arcLength = Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score)) / 100;
  const dashOffset = arcLength * (1 - progress);
  
  return React.createElement('div', {
    style: { 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      gap: 8,
    }
  },
    // Arc SVG
    React.createElement('div', {
      style: { position: 'relative', width, height }
    },
      React.createElement('svg', {
        width: width,
        height: height,
        viewBox: `0 0 ${width} ${height}`,
        style: { overflow: 'visible' }
      },
        // Gradient definition
        React.createElement('defs', null,
          React.createElement('linearGradient', { id: 'amberArcGrad', x1: '0%', y1: '0%', x2: '100%', y2: '0%' },
            React.createElement('stop', { offset: '0%', stopColor: T.accentDim || '#8a6830' }),
            React.createElement('stop', { offset: '100%', stopColor: T.accentBright || '#e8a84a' })
          )
        ),
        // Background arc
        React.createElement('path', {
          d: arcPath,
          fill: 'none',
          stroke: T.border || 'rgba(212,148,58,0.08)',
          strokeWidth: strokeWidth,
          strokeLinecap: 'round'
        }),
        // Progress arc
        score > 0 && React.createElement('path', {
          d: arcPath,
          fill: 'none',
          stroke: 'url(#amberArcGrad)',
          strokeWidth: strokeWidth,
          strokeLinecap: 'round',
          strokeDasharray: arcLength,
          strokeDashoffset: dashOffset,
          style: { transition: 'stroke-dashoffset 0.8s ease' }
        })
      ),
      // Score number - positioned inside arc with proper spacing
      React.createElement('div', {
        style: {
          position: 'absolute',
          bottom: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
        }
      },
        React.createElement('span', {
          style: {
            fontFamily: "'Playfair Display', serif",
            fontSize: size * 0.28,
            fontWeight: 600,
            color: T.accent || '#d4943a',
            lineHeight: 1,
          }
        }, score)
      )
    ),
    // Tier badge
    React.createElement('span', {
      style: {
        fontSize: F ? F.xs : 10,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        color: T.accent || '#d4943a',
        padding: '6px 14px',
        background: T.accentGlow || 'rgba(212,148,58,0.12)',
        borderRadius: 20,
        fontWeight: 500,
      }
    }, tier.name)
  );
};

// Large version for Journey page
window.WealthGaugeLarge = function ({ score, size = 160 }) {
  const { T, F } = useContext(AppCtx);
  const tier = window.getTier ? window.getTier(score) : { name: 'Position' };
  
  const width = size;
  const height = size * 0.6;
  const strokeWidth = size * 0.05;
  const radius = (width - strokeWidth * 2) / 2 - 8;
  const centerX = width / 2;
  const centerY = height - 8;
  
  const startX = centerX - radius;
  const endX = centerX + radius;
  const arcPath = `M ${startX} ${centerY} A ${radius} ${radius} 0 0 1 ${endX} ${centerY}`;
  
  const arcLength = Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score)) / 100;
  const dashOffset = arcLength * (1 - progress);
  
  return React.createElement('div', {
    style: { 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      gap: 12,
    }
  },
    React.createElement('div', {
      style: { position: 'relative', width, height }
    },
      React.createElement('svg', {
        width: width,
        height: height,
        viewBox: `0 0 ${width} ${height}`,
        style: { overflow: 'visible' }
      },
        React.createElement('defs', null,
          React.createElement('linearGradient', { id: 'amberArcGradLg', x1: '0%', y1: '0%', x2: '100%', y2: '0%' },
            React.createElement('stop', { offset: '0%', stopColor: T.accentDim || '#8a6830' }),
            React.createElement('stop', { offset: '100%', stopColor: T.accentBright || '#e8a84a' })
          )
        ),
        React.createElement('path', {
          d: arcPath,
          fill: 'none',
          stroke: T.border || 'rgba(212,148,58,0.08)',
          strokeWidth: strokeWidth,
          strokeLinecap: 'round'
        }),
        score > 0 && React.createElement('path', {
          d: arcPath,
          fill: 'none',
          stroke: 'url(#amberArcGradLg)',
          strokeWidth: strokeWidth,
          strokeLinecap: 'round',
          strokeDasharray: arcLength,
          strokeDashoffset: dashOffset,
          style: { transition: 'stroke-dashoffset 0.8s ease' }
        })
      ),
      React.createElement('div', {
        style: {
          position: 'absolute',
          bottom: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
        }
      },
        React.createElement('span', {
          style: {
            fontFamily: "'Playfair Display', serif",
            fontSize: size * 0.32,
            fontWeight: 600,
            color: T.accent || '#d4943a',
            lineHeight: 1,
          }
        }, score)
      )
    ),
    React.createElement('span', {
      style: {
        fontSize: F ? F.xs + 1 : 11,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        color: T.accent || '#d4943a',
        padding: '8px 18px',
        background: T.accentGlow || 'rgba(212,148,58,0.12)',
        borderRadius: 24,
        fontWeight: 500,
      }
    }, tier.name)
  );
};

// Full card version with "View Details" modal
window.WealthScoreCard = function ({ accounts, income, onGoToRecs }) {
  const { T, F } = useContext(AppCtx);
  const [showDetails, setShowDetails] = useState(false);
  const [hovered, setHovered] = useState(false);
  const ws = calcWealthScore(accounts, income);
  const tier = window.getTier ? window.getTier(ws.score) : { name: 'Position', desc: '' };

  const handleClick = () => {
    if (window.playClick) window.playClick();
    setShowDetails(true);
  };

  return React.createElement(React.Fragment, null,
    React.createElement(Card, { 
      hover: true, 
      onClick: handleClick,
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
      style: { 
        padding: '24px 20px', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        minWidth: 155,
        cursor: 'pointer',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? '0 8px 28px rgba(212,148,58,0.08)' : 'none',
        transition: 'all 0.3s ease',
      } 
    },
      React.createElement(Lbl, { style: { marginBottom: 12 } }, 'Your Position'),
      React.createElement(WealthGauge, { score: ws.score, size: 130 }),
      React.createElement('div', { 
        style: { 
          marginTop: 16, 
          textAlign: 'center' 
        } 
      },
        React.createElement('button', {
          style: { 
            background: T.accentGlow || 'rgba(212,148,58,0.12)', 
            border: `1px solid ${T.border || 'rgba(212,148,58,0.15)'}`, 
            borderRadius: 10, 
            padding: '10px 20px', 
            color: T.accent || '#d4943a', 
            fontSize: F.xs + 1, 
            fontFamily: "'Inter', sans-serif", 
            fontWeight: 500, 
            cursor: 'pointer', 
            transition: 'all 0.2s' 
          },
        }, 'View Details →'),
      )
    ),
    
    // Details Modal
    showDetails && React.createElement('div', { 
      className: 'modal-overlay', 
      onClick: e => { if (e.target === e.currentTarget) setShowDetails(false); } 
    },
      React.createElement('div', { 
        className: 'scale-in', 
        style: { 
          background: T.modalBg || T.surface, 
          border: `1px solid ${T.border}`, 
          borderRadius: 24, 
          padding: 28, 
          width: '100%', 
          maxWidth: 420, 
          maxHeight: '90vh', 
          overflowY: 'auto' 
        } 
      },
        // Header
        React.createElement('div', { 
          style: { 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: 24 
          } 
        },
          React.createElement('span', { 
            style: { 
              fontFamily: "'Playfair Display', serif", 
              fontWeight: 600, 
              fontSize: F.lg, 
              color: T.text 
            } 
          }, `Your Position: ${ws.score}`),
          React.createElement('button', { 
            onClick: () => setShowDetails(false), 
            style: { 
              background: T.surfaceAlt || T.surface, 
              border: `1px solid ${T.borderLight || T.border}`, 
              borderRadius: 10, 
              color: T.textMuted, 
              width: 36, 
              height: 36, 
              fontSize: 16, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              cursor: 'pointer'
            } 
          }, '✕'),
        ),
        
        // Score display
        React.createElement('div', { 
          style: { textAlign: 'center', marginBottom: 28 } 
        },
          React.createElement(WealthGaugeLarge, { score: ws.score, size: 180 }),
        ),
        
        // Factors breakdown
        ...ws.factors.map((f, i) => {
          const ratio = f.score / f.max;
          const barColor = ratio > 0.7 ? T.accentBright : ratio > 0.4 ? T.accent : T.accentDim;
          
          return React.createElement('div', { 
            key: i, 
            style: { 
              marginBottom: 20, 
              paddingBottom: 20, 
              borderBottom: `1px solid ${T.borderLight || T.border}` 
            } 
          },
            React.createElement('div', { 
              style: { display: 'flex', justifyContent: 'space-between', marginBottom: 8 } 
            },
              React.createElement('span', { 
                style: { 
                  fontFamily: "'Playfair Display', serif", 
                  fontWeight: 500, 
                  fontSize: F.base, 
                  color: T.text 
                } 
              }, f.name),
              React.createElement('span', { 
                style: { 
                  fontFamily: "'Playfair Display', serif", 
                  fontWeight: 600, 
                  fontSize: F.base, 
                  color: barColor 
                } 
              }, `${f.score}/${f.max}`),
            ),
            React.createElement('div', { 
              style: { 
                height: 6, 
                background: T.border || 'rgba(212,148,58,0.08)', 
                borderRadius: 3, 
                overflow: 'hidden', 
                marginBottom: 8 
              } 
            },
              React.createElement('div', { 
                style: { 
                  height: '100%', 
                  width: `${ratio * 100}%`, 
                  background: barColor, 
                  borderRadius: 3, 
                  transition: 'width 0.6s ease' 
                } 
              }),
            ),
            React.createElement('div', { 
              style: { 
                fontSize: F.sm, 
                color: T.textSub, 
                lineHeight: 1.6 
              } 
            }, f.note),
          );
        }),
        
        // CTA button
        React.createElement(Btn, { 
          onClick: () => { 
            if (window.playClick) window.playClick();
            setShowDetails(false); 
            onGoToRecs(); 
          }, 
          style: { width: '100%', marginTop: 8 } 
        }, 'View Recommendations →'),
      )
    )
  );
};
