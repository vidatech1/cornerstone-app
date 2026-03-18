// src/pages/Settings.js — Cornerstone Settings Page
const { useState, useEffect, useContext } = React;

window.SettingsPage = function ({ profile, onUpdateProfile, onOpenAdmin }) {
  const { T, F } = useContext(AppCtx);
  
  // Load settings from localStorage/DB
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('cornerstone_sound');
    return saved !== null ? saved === 'true' : true;
  });
  const [soundVolume, setSoundVolume] = useState(() => {
    return parseFloat(localStorage.getItem('cornerstone_volume') || '0.5');
  });
  const [soundPack, setSoundPack] = useState(() => {
    return localStorage.getItem('cornerstone_soundpack') || 'soft';
  });
  const [fontSize, setFontSize] = useState(() => {
    return localStorage.getItem('cornerstone_fontsize') || 'medium';
  });
  
  // Email report settings
  const [emailEnabled, setEmailEnabled] = useState(() => {
    return localStorage.getItem('cornerstone_email_enabled') === 'true';
  });
  const [emailAddress, setEmailAddress] = useState(() => {
    return localStorage.getItem('cornerstone_email') || profile?.email || '';
  });
  const [emailFrequency, setEmailFrequency] = useState(() => {
    return localStorage.getItem('cornerstone_email_freq') || 'weekly';
  });
  const [emailIncludes, setEmailIncludes] = useState(() => {
    const saved = localStorage.getItem('cornerstone_email_includes');
    return saved ? JSON.parse(saved) : ['networth', 'score', 'goals', 'tips'];
  });
  
  const [saved, setSaved] = useState(false);

  // Save settings when they change
  const saveSettings = async () => {
    if (window.playClick) window.playClick();
    
    localStorage.setItem('cornerstone_sound', soundEnabled);
    localStorage.setItem('cornerstone_volume', soundVolume);
    localStorage.setItem('cornerstone_soundpack', soundPack);
    localStorage.setItem('cornerstone_fontsize', fontSize);
    localStorage.setItem('cornerstone_email_enabled', emailEnabled);
    localStorage.setItem('cornerstone_email', emailAddress);
    localStorage.setItem('cornerstone_email_freq', emailFrequency);
    localStorage.setItem('cornerstone_email_includes', JSON.stringify(emailIncludes));
    
    // Update global sound settings
    window.SoundEnabled = soundEnabled;
    window.SoundVolume = soundVolume;
    window.SoundPack = soundPack;
    
    // Update font scale globally
    window.FontSizePreference = fontSize;
    
    // Trigger app to re-render with new font size
    if (window.updateFontSize) window.updateFontSize(fontSize);
    
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleEmailInclude = (key) => {
    if (window.playClick) window.playClick();
    setEmailIncludes(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const testSound = () => {
    if (window.playClick) window.playClick();
  };

  const iStyle = inputStyle(T, F);
  
  const Section = ({ title, children }) => React.createElement('div', {
    style: { 
      background: T.surface, 
      border: `1px solid ${T.border}`, 
      borderRadius: 18, 
      padding: '22px 24px', 
      marginBottom: 16 
    }
  },
    React.createElement('div', {
      style: {
        fontFamily: "'Playfair Display', serif",
        fontWeight: 500,
        fontSize: F.md,
        color: T.text,
        marginBottom: 18,
        paddingBottom: 12,
        borderBottom: `1px solid ${T.border}`,
      }
    }, title),
    children
  );

  const Toggle = ({ label, desc, checked, onChange }) => React.createElement('div', {
    style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }
  },
    React.createElement('div', { style: { flex: 1 } },
      React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.text, marginBottom: 3 } }, label),
      desc && React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted } }, desc),
    ),
    React.createElement('button', {
      onClick: () => { if (window.playClick) window.playClick(); onChange(!checked); },
      style: {
        width: 50,
        height: 28,
        borderRadius: 14,
        border: 'none',
        background: checked ? T.accent : T.border,
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
      }
    },
      React.createElement('div', {
        style: {
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: '#fff',
          position: 'absolute',
          top: 3,
          left: checked ? 25 : 3,
          transition: 'all 0.3s ease',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }
      })
    )
  );

  const RadioGroup = ({ options, value, onChange, columns = 3 }) => React.createElement('div', {
    style: { display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 8 }
  },
    ...options.map(opt => React.createElement('button', {
      key: opt.value,
      onClick: () => { if (window.playClick) window.playClick(); onChange(opt.value); },
      style: {
        padding: '12px 14px',
        borderRadius: 12,
        border: `1px solid ${value === opt.value ? T.accent : T.border}`,
        background: value === opt.value ? T.accentGlow : 'transparent',
        color: value === opt.value ? T.accent : T.text,
        fontFamily: "'Inter', sans-serif",
        fontSize: F.sm,
        fontWeight: value === opt.value ? 600 : 400,
        cursor: 'pointer',
        transition: 'all 0.2s',
        textAlign: 'center',
      }
    },
      React.createElement('div', null, opt.icon && React.createElement('span', { style: { marginRight: 6 } }, opt.icon), opt.label),
      opt.desc && React.createElement('div', { style: { fontSize: F.xs - 1, color: T.textMuted, marginTop: 4 } }, opt.desc),
    ))
  );

  return React.createElement('div', {
    className: 'fade-up',
    style: {
      padding: '28px 22px 120px',
      background: T.bg,
      minHeight: '100vh',
      maxWidth: 600,
      margin: '0 auto',
    }
  },
    // Header
    React.createElement('div', { style: { marginBottom: 28 } },
      React.createElement('div', {
        style: {
          fontSize: 10,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: T.accent,
          marginBottom: 8,
        }
      }, 'Customize'),
      React.createElement('h1', {
        style: {
          fontFamily: "'Playfair Display', serif",
          fontSize: 28,
          fontWeight: 500,
          color: T.text,
          marginBottom: 8,
        }
      }, 'Settings'),
      React.createElement('p', {
        style: {
          fontSize: 13,
          color: T.textSub,
          lineHeight: 1.6,
        }
      }, 'Personalize your Cornerstone experience'),
    ),

    // Sound Settings
    React.createElement(Section, { title: '🔊 Sound Effects' },
      React.createElement(Toggle, {
        label: 'Enable Sounds',
        desc: 'Play sound effects on interactions',
        checked: soundEnabled,
        onChange: setSoundEnabled,
      }),
      
      soundEnabled && React.createElement(React.Fragment, null,
        React.createElement('div', { style: { marginBottom: 18 } },
          React.createElement(Lbl, null, 'Volume'),
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
            React.createElement('span', { style: { fontSize: 14 } }, '🔈'),
            React.createElement('input', {
              type: 'range',
              min: 0,
              max: 1,
              step: 0.1,
              value: soundVolume,
              onChange: e => setSoundVolume(parseFloat(e.target.value)),
              style: { flex: 1, accentColor: T.accent },
            }),
            React.createElement('span', { style: { fontSize: 14 } }, '🔊'),
            React.createElement('span', { style: { fontSize: F.xs, color: T.textMuted, minWidth: 35 } }, `${Math.round(soundVolume * 100)}%`),
          ),
        ),
        
        React.createElement('div', { style: { marginBottom: 14 } },
          React.createElement(Lbl, null, 'Sound Style'),
          React.createElement(RadioGroup, {
            value: soundPack,
            onChange: setSoundPack,
            options: [
              { value: 'soft', label: 'Soft', desc: 'Gentle clicks' },
              { value: 'crisp', label: 'Crisp', desc: 'Clear taps' },
              { value: 'warm', label: 'Warm', desc: 'Mellow tones' },
            ]
          }),
        ),
        
        React.createElement(Btn, { 
          onClick: testSound, 
          variant: 'ghost', 
          style: { width: '100%', marginTop: 8 } 
        }, '▶ Test Sound'),
      ),
    ),

    // Font Size Settings
    React.createElement(Section, { title: '🔤 Display' },
      React.createElement('div', { style: { marginBottom: 14 } },
        React.createElement(Lbl, null, 'Font Size'),
        React.createElement(RadioGroup, {
          value: fontSize,
          onChange: setFontSize,
          options: [
            { value: 'small', label: 'Small', icon: 'A' },
            { value: 'medium', label: 'Medium', icon: 'A' },
            { value: 'large', label: 'Large', icon: 'A' },
          ]
        }),
      ),
      React.createElement('div', {
        style: {
          padding: '14px 16px',
          background: T.accentGlow,
          borderRadius: 12,
          border: `1px solid ${T.border}`,
        }
      },
        React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: fontSize === 'small' ? 12 : fontSize === 'large' ? 16 : 14, color: T.text } },
          'Preview: This is how your text will appear throughout the app.'
        ),
      ),
    ),

    // Email Reports
    React.createElement(Section, { title: '📧 Email Reports' },
      React.createElement(Toggle, {
        label: 'Weekly/Monthly Reports',
        desc: 'Receive progress updates via email',
        checked: emailEnabled,
        onChange: setEmailEnabled,
      }),
      
      emailEnabled && React.createElement(React.Fragment, null,
        React.createElement('div', { style: { marginBottom: 14 } },
          React.createElement(Lbl, null, 'Email Address'),
          React.createElement('input', {
            type: 'email',
            value: emailAddress,
            onChange: e => setEmailAddress(e.target.value),
            placeholder: 'your@email.com',
            style: iStyle,
          }),
        ),
        
        React.createElement('div', { style: { marginBottom: 14 } },
          React.createElement(Lbl, null, 'Frequency'),
          React.createElement(RadioGroup, {
            value: emailFrequency,
            onChange: setEmailFrequency,
            columns: 2,
            options: [
              { value: 'weekly', label: 'Weekly', desc: 'Every Sunday' },
              { value: 'monthly', label: 'Monthly', desc: '1st of month' },
            ]
          }),
        ),
        
        React.createElement('div', null,
          React.createElement(Lbl, null, 'Include in Report'),
          React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            ...[
              { key: 'networth', label: 'Net Worth Summary', desc: 'Assets, debt, and changes' },
              { key: 'score', label: 'Position Score', desc: 'Your score and tier' },
              { key: 'goals', label: 'Goal Progress', desc: 'Updates on your goals' },
              { key: 'tips', label: 'Financial Tips', desc: 'Personalized recommendations' },
              { key: 'market', label: 'Market Updates', desc: 'Your investments performance' },
            ].map(item => React.createElement('button', {
              key: item.key,
              onClick: () => toggleEmailInclude(item.key),
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 10,
                border: `1px solid ${emailIncludes.includes(item.key) ? T.accent : T.border}`,
                background: emailIncludes.includes(item.key) ? T.accentGlow : 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
              }
            },
              React.createElement('div', {
                style: {
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  border: `2px solid ${emailIncludes.includes(item.key) ? T.accent : T.border}`,
                  background: emailIncludes.includes(item.key) ? T.accent : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0,
                }
              }, emailIncludes.includes(item.key) ? '✓' : ''),
              React.createElement('div', { style: { flex: 1 } },
                React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.text } }, item.label),
                React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted } }, item.desc),
              ),
            ))
          ),
        ),
        
        React.createElement('div', {
          style: {
            marginTop: 16,
            padding: '12px 14px',
            background: 'rgba(212,148,58,0.08)',
            borderRadius: 10,
            border: `1px solid ${T.border}`,
          }
        },
          React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textSub, lineHeight: 1.6 } },
            '💡 Reports are generated locally and sent using your default email app. No data is stored on external servers.'
          ),
        ),
      ),
    ),

    // Save Button
    React.createElement('div', { style: { marginTop: 24 } },
      React.createElement(Btn, {
        onClick: saveSettings,
        style: { width: '100%', padding: '16px', fontSize: F.md },
      }, saved ? '✓ Settings Saved' : 'Save Settings'),
    ),

    // Admin Access (hidden link for admins only)
    onOpenAdmin && React.createElement('div', { style: { marginTop: 24, textAlign: 'center' } },
      React.createElement('button', {
        onClick: () => { if (window.playClick) window.playClick(); onOpenAdmin(); },
        style: {
          background: 'none',
          border: `1px solid ${T.border}`,
          borderRadius: 10,
          padding: '12px 20px',
          color: T.textMuted,
          fontFamily: "'Inter', sans-serif",
          fontSize: F.xs,
          cursor: 'pointer',
          transition: 'all 0.2s',
        }
      }, '🔐 Admin Panel'),
    ),

    // Version info
    React.createElement('div', {
      style: {
        textAlign: 'center',
        marginTop: 32,
        padding: '16px 0',
        borderTop: `1px solid ${T.border}`,
      }
    },
      React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.sm, color: T.textMuted, marginBottom: 4 } }, 'Cornerstone'),
      React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted } }, `Alpha ${window.APP_VERSION || '0.07'} · Build wealth that lasts`),
    ),
  );
};
