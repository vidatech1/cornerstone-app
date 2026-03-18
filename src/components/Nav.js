// src/components/Nav.js — Cornerstone Navigation
window.Nav = function ({ page, setPage, themeMode, setTheme, fontSize, setFontSize, isOnline, onLock, hasPin, pricesLoading }) {
  const { T, F } = React.useContext(AppCtx);
  
  const tabs = [
    { id: 0, label: 'Home', icon: '◉' },
    { id: 1, label: 'Holdings', icon: '◎' },
    { id: 2, label: 'Forecast', icon: '◈' },
    { id: 3, label: 'Journey', icon: '◇' },
    { id: 5, label: 'Report', icon: '▣' },
  ];

  // Logo SVG component
  const Logo = React.createElement('svg', { 
    viewBox: '0 0 30 30', 
    width: 28, 
    height: 28,
    style: { flexShrink: 0 }
  },
    React.createElement('rect', { x: 4, y: 15, width: 11, height: 11, rx: 2.5, fill: '#d4943a', opacity: 0.9 }),
    React.createElement('rect', { x: 15, y: 15, width: 11, height: 11, rx: 2.5, fill: '#8a6830', opacity: 0.6 }),
    React.createElement('rect', { x: 9.5, y: 4, width: 11, height: 11, rx: 2.5, fill: '#5a6a7a', opacity: 0.4 })
  );

  const handleTabClick = (id) => {
    if (window.playClick) window.playClick();
    setPage(id);
  };

  return React.createElement('div', {
    className: 'no-print',
    style: { 
      position: 'sticky', 
      top: 0, 
      zIndex: 100, 
      background: T.bg,
      borderBottom: `1px solid ${T.borderLight || 'rgba(240,232,220,0.06)'}`,
    },
  },
    // Header row
    React.createElement('div', { 
      style: { 
        maxWidth: 420, 
        margin: '0 auto', 
        padding: '14px 20px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      } 
    },
      // Logo + Name
      React.createElement('div', { 
        style: { display: 'flex', alignItems: 'center', gap: 10 } 
      },
        Logo,
        React.createElement('span', { 
          style: { 
            fontFamily: "'Playfair Display', serif", 
            fontWeight: 600, 
            fontSize: F.md + 2, 
            color: T.text, 
            letterSpacing: 0.5 
          } 
        }, 'Cornerstone'),
        // Status badges
        pricesLoading && React.createElement('span', { 
          style: { 
            fontSize: F.xs - 1, 
            background: T.accentGlow || 'rgba(212,148,58,0.12)', 
            color: T.accent, 
            borderRadius: 6, 
            padding: '2px 7px', 
            fontWeight: 500,
            marginLeft: 4
          } 
        }, '↻'),
        !isOnline && React.createElement('span', { 
          style: { 
            fontSize: F.xs - 1, 
            background: 'rgba(138,104,48,0.18)', 
            color: T.accentDim || '#8a6830', 
            borderRadius: 6, 
            padding: '2px 7px', 
            fontWeight: 500,
            marginLeft: 4
          } 
        }, 'offline'),
      ),
      
      // Controls
      React.createElement('div', { 
        style: { display: 'flex', alignItems: 'center', gap: 6 } 
      },
        // Lifestyle button
        React.createElement('button', { 
          onClick: () => { 
            if (window.playClick) window.playClick();
            setPage(7);
          },
          style: { 
            background: page === 7 ? T.accentGlow : T.surface, 
            border: `1px solid ${page === 7 ? T.accent : (T.borderLight || 'rgba(240,232,220,0.06)')}`, 
            borderRadius: 8, 
            padding: '6px 10px', 
            color: page === 7 ? T.accent : T.textMuted, 
            fontSize: F.xs,
            cursor: 'pointer',
            transition: 'all 0.2s'
          } 
        }, '💰'),
        
        // Support button
        React.createElement('button', { 
          onClick: () => { 
            if (window.playClick) window.playClick();
            setPage(8);
          },
          style: { 
            background: page === 8 ? T.accentGlow : T.surface, 
            border: `1px solid ${page === 8 ? T.accent : (T.borderLight || 'rgba(240,232,220,0.06)')}`, 
            borderRadius: 8, 
            padding: '6px 10px', 
            color: page === 8 ? T.accent : T.textMuted, 
            fontSize: F.xs,
            cursor: 'pointer',
            transition: 'all 0.2s'
          } 
        }, '❓'),
        
        // Settings button
        React.createElement('button', { 
          onClick: () => { 
            if (window.playClick) window.playClick();
            setPage(6); // Settings page
          },
          style: { 
            background: page === 6 ? T.accentGlow : T.surface, 
            border: `1px solid ${page === 6 ? T.accent : (T.borderLight || 'rgba(240,232,220,0.06)')}`, 
            borderRadius: 8, 
            padding: '6px 10px', 
            color: page === 6 ? T.accent : T.textMuted, 
            fontSize: F.xs,
            cursor: 'pointer',
            transition: 'all 0.2s'
          } 
        }, '⚙'),
        
        // Sound toggle
        React.createElement('button', { 
          onClick: () => { 
            window.SoundEnabled = !window.SoundEnabled;
            localStorage.setItem('cornerstone_sound', window.SoundEnabled);
            if (window.SoundEnabled && window.playClick) window.playClick();
          },
          style: { 
            background: T.surface, 
            border: `1px solid ${T.borderLight || 'rgba(240,232,220,0.06)'}`, 
            borderRadius: 8, 
            padding: '6px 10px', 
            color: window.SoundEnabled ? T.accent : T.textMuted, 
            fontSize: F.xs,
            cursor: 'pointer',
            transition: 'all 0.2s'
          } 
        }, '♪'),
        
        // Theme toggle
        React.createElement('button', { 
          onClick: () => { 
            if (window.playClick) window.playClick();
            setTheme(t => t === 'dark' ? 'light' : 'dark'); 
          }, 
          style: { 
            background: T.surface, 
            border: `1px solid ${T.borderLight || 'rgba(240,232,220,0.06)'}`, 
            borderRadius: 8, 
            padding: '6px 10px', 
            color: T.textSub, 
            fontSize: F.xs,
            cursor: 'pointer',
            transition: 'all 0.2s'
          } 
        }, themeMode === 'dark' ? '☀' : '☾'),
        
        // Lock button
        hasPin && React.createElement('button', { 
          onClick: () => {
            if (window.playClick) window.playClick();
            onLock();
          }, 
          title: 'Lock app', 
          style: { 
            background: T.surface, 
            border: `1px solid ${T.borderLight || 'rgba(240,232,220,0.06)'}`, 
            borderRadius: 8, 
            padding: '6px 10px', 
            color: T.textSub, 
            fontSize: F.xs,
            cursor: 'pointer',
            transition: 'all 0.2s'
          } 
        }, '🔒'),
      ),
    ),
    
    // Tab bar
    React.createElement('div', { 
      style: { 
        maxWidth: 420, 
        margin: '0 auto', 
        padding: '0 12px 8px',
      } 
    },
      React.createElement('div', {
        style: {
          display: 'flex',
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 14,
          padding: '6px',
          gap: 2,
        }
      },
        ...tabs.map(t =>
          React.createElement('button', { 
            key: t.id, 
            onClick: () => handleTabClick(t.id), 
            style: { 
              flex: 1, 
              padding: '10px 4px 8px', 
              background: page === t.id ? T.accentGlow : 'transparent',
              border: 'none', 
              borderRadius: 10,
              color: page === t.id ? T.accent : T.textMuted, 
              fontSize: F.xs,
              fontFamily: "'Inter', sans-serif",
              fontWeight: 500, 
              transition: 'all 0.2s',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
            } 
          }, 
            React.createElement('span', { style: { fontSize: F.sm + 2, lineHeight: 1 } }, t.icon),
            t.label
          )
        )
      )
    )
  );
};
