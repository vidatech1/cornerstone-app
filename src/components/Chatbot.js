// src/components/Chatbot.js
const { useState, useRef, useEffect, useContext, useMemo } = React;

window.Chatbot = function ({ accounts, income, goals, isOnline, onClose }) {
  const { T, F } = useContext(AppCtx);
  const [mode, setMode]   = useState(null);
  const [msgs, setMsgs]   = useState([{ role: 'assistant', text: "Hi! Ask me anything about your accounts, goals, debt, savings, or position score — all from your own data." }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey]   = useState('');
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const context = useMemo(() => {
    const sumType = t => sumArr(accounts.filter(a => a.type === t).map(a => a.amount));
    const savings  = sumArr(accounts.filter(a => a.type === 'cash' && a.subtype === 'savings').map(a => a.amount));
    const checking = sumArr(accounts.filter(a => a.type === 'cash' && a.subtype === 'checking').map(a => a.amount));
    const ti = (income?.job || 0) + (income?.business || 0) + (income?.dividends || 0);
    return `You are a helpful financial assistant for the Cornerstone app. Answer ONLY questions based on the user data below. Be friendly, concise, and remind users to consult a financial advisor for major decisions. Keep answers under 130 words.
Income: $${ti}/mo | Checking: $${checking.toFixed(0)} | Savings: $${savings.toFixed(0)} | Equities: $${sumType('equities').toFixed(0)} | Crypto: $${sumType('crypto').toFixed(0)} | Metals: $${sumType('metals').toFixed(0)} | Debt: $${sumType('debt').toFixed(0)}
Goals: ${(goals || []).map(g => g.label).join(', ') || 'none'}
Accounts: ${accounts.map(a => `${a.label}(${a.type}/$${a.amount})`).join(', ')}`;
  }, [accounts, income, goals]);

  const smartOfflineAnswer = q => {
    const ql = q.toLowerCase();
    const sumType = t => sumArr(accounts.filter(a => a.type === t).map(a => a.amount));
    const savings  = sumArr(accounts.filter(a => a.type === 'cash' && a.subtype === 'savings').map(a => a.amount));
    const checking = sumArr(accounts.filter(a => a.type === 'cash' && a.subtype === 'checking').map(a => a.amount));
    const totalAssets = sumType('cash') + sumType('equities') + sumType('crypto') + sumType('metals');
    const totalDebt = sumType('debt');
    const netWorth = totalAssets - totalDebt;
    const ws = calcWealthScore(accounts, income);
    const ti = (income?.job || 0) + (income?.business || 0) + (income?.dividends || 0);
    
    // Greetings
    if (/^(hi|hello|hey|good morning|good evening|sup|yo)/.test(ql)) {
      return `Hello! I'm your offline assistant. I can tell you about your savings (${fmt(savings)}), checking (${fmt(checking)}), investments, debt, net worth, or position score. What would you like to know?`;
    }
    // How much / total / balance queries
    if (/how much|total|balance|have i got|do i have/.test(ql)) {
      if (/saving/.test(ql)) return `You have ${fmt(savings)} in savings accounts.`;
      if (/check/.test(ql)) return `You have ${fmt(checking)} in checking accounts.`;
      if (/cash/.test(ql)) return `You have ${fmt(sumType('cash'))} in cash (checking + savings).`;
      if (/debt|owe/.test(ql)) return `Your total debt is ${fmt(totalDebt)}.`;
      if (/invest|stock|equit/.test(ql)) return `You have ${fmt(sumType('equities'))} in equities/stocks.`;
      if (/crypto/.test(ql)) return `You have ${fmt(sumType('crypto'))} in crypto.`;
      if (/metal|gold|silver/.test(ql)) return `You have ${fmt(sumType('metals'))} in precious metals.`;
      return `Total assets: ${fmt(totalAssets)}. Total debt: ${fmt(totalDebt)}. Net worth: ${fmt(netWorth)}.`;
    }
    // Savings & emergency fund
    if (/saving|emergency/.test(ql)) return `Your savings accounts total ${fmt(savings)}. Financial experts recommend 3-6 months of expenses in emergency savings.`;
    // Checking
    if (/check|spend/.test(ql)) return `Your checking accounts total ${fmt(checking)}. That's your available spending money.`;
    // Debt
    if (/debt|owe|loan|credit/.test(ql)) return `Your total debt is ${fmt(totalDebt)}. Consider the debt snowball method: pay minimums on all debts, then attack the smallest balance first for quick wins.`;
    // Net worth
    if (/net worth|worth|wealthy|rich/.test(ql)) return `Your net worth is ${fmt(netWorth)}. Assets: ${fmt(totalAssets)}, Debt: ${fmt(totalDebt)}.`;
    // Score
    if (/score|position|health|doing/.test(ql)) return `Your Position Score is ${ws.score}/100 (${ws.label}). Your weakest factor is ${ws.factors.sort((a, b) => a.score / a.max - b.score / b.max)[0].name}. Check the Journey tab for ways to improve.`;
    // Investments
    if (/invest|stock|crypto|metal|portfolio/.test(ql)) return `Your investments: Equities ${fmt(sumType('equities'))}, Crypto ${fmt(sumType('crypto'))}, Metals ${fmt(sumType('metals'))}. Total invested: ${fmt(sumType('equities') + sumType('crypto') + sumType('metals'))}.`;
    // Goals
    if (/goal/.test(ql)) return (goals || []).length > 0 ? `You have ${goals.length} goal(s): ${goals.map(g => g.label).join(', ')}.` : `You haven't set any goals yet. Add goals from the Home tab to track your progress.`;
    // Income
    if (/income|earn|salary|make/.test(ql)) return `Your monthly income: ${fmt(ti)} total. Job: ${fmt(income?.job || 0)}, Business: ${fmt(income?.business || 0)}, Dividends: ${fmt(income?.dividends || 0)}.`;
    // Accounts list
    if (/account|list|show me/.test(ql)) return `You have ${accounts.length} account(s): ${accounts.map(a => `${a.label} (${fmt(a.amount)})`).join(', ')}.`;
    // Help
    if (/help|what can you|capabilities/.test(ql)) return `I can tell you about: savings, checking, debt, net worth, investments (stocks, crypto, metals), income, goals, position score, and list your accounts. Just ask!`;
    // Fallback with helpful suggestion
    return `I'm not sure about "${q}". Try asking about your savings, debt, net worth, investments, income, goals, or position score.`;
  };

  const sendOffline = () => {
    if (!input.trim()) return;
    if (window.playClick) window.playClick();
    const userMsg = { role: 'user', text: input.trim() };
    setMsgs(m => [...m, userMsg, { role: 'assistant', text: smartOfflineAnswer(input.trim()) }]);
    setInput('');
  };

  const sendApi = async () => {
    if (!input.trim() || loading) return;
    if (window.playClick) window.playClick();
    const userMsg = { role: 'user', text: input.trim() };
    setMsgs(m => [...m, userMsg]);
    setInput(''); setLoading(true);
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 300, system: context, messages: msgs.concat(userMsg).map(m => ({ role: m.role, content: m.text })) }),
      });
      const data = await res.json();
      setMsgs(m => [...m, { role: 'assistant', text: data.content?.[0]?.text || 'Sorry, could not process that.' }]);
    } catch { setMsgs(m => [...m, { role: 'assistant', text: 'Connection error. Please check your API key and internet connection.' }]); }
    setLoading(false);
  };

  // Mode picker
  if (mode === null) return React.createElement('div', {
    style: { position: 'fixed', bottom: 90, right: 20, width: 320, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, boxShadow: '0 20px 60px rgba(0,0,0,0.4)', zIndex: 350, padding: 22 },
    className: 'scale-in',
  },
    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 16 } },
      React.createElement('span', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 500, fontSize: F.md, color: T.text } }, '💬 Ask Cornerstone'),
      React.createElement('button', { onClick: onClose, style: { background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 7, color: T.textSub, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' } }, '✕'),
    ),
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 9 } },
      React.createElement('button', { 
        onClick: () => { if (window.playClick) window.playClick(); setMode('offline'); }, 
        style: { background: T.accentGlow, border: `1px solid ${T.accent}55`, borderRadius: 12, padding: '13px 14px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s' } 
      },
        React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 500, fontSize: F.base, color: T.accent, marginBottom: 3 } }, '📵 Smart Offline Assistant'),
        React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textSub } }, 'No internet needed. Answers from your own data only — always available.'),
      ),
      isOnline && React.createElement('button', { 
        onClick: () => { if (window.playClick) window.playClick(); setMode('api'); }, 
        style: { background: T.surfaceAlt, border: '1px solid rgba(129,140,248,0.3)', borderRadius: 12, padding: '13px 14px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s' } 
      },
        React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 500, fontSize: F.base, color: '#818cf8', marginBottom: 3 } }, '🤖 AI Assistant (Claude API)'),
        React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textSub } }, 'Requires your Anthropic API key. Richer, conversational answers.'),
      ),
    )
  );

  const isApi = mode === 'api';
  const needKey = isApi && !apiKey;

  return React.createElement('div', {
    className: 'scale-in',
    style: { position: 'fixed', bottom: 90, right: 20, width: 340, maxHeight: 490, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, boxShadow: '0 20px 60px rgba(0,0,0,0.4)', zIndex: 350, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  },
    // Header
    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: `1px solid ${T.border}`, background: T.surfaceAlt } },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
        React.createElement('span', { style: { fontSize: 15 } }, isApi ? '🤖' : '📵'),
        React.createElement('span', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 500, fontSize: F.base, color: T.text } }, isApi ? 'AI Assistant' : 'Offline Assistant'),
      ),
      React.createElement('div', { style: { display: 'flex', gap: 6 } },
        React.createElement('button', { onClick: () => { if (window.playClick) window.playClick(); setMode(null); }, style: { background: 'none', border: 'none', color: T.textMuted, fontSize: F.xs, fontFamily: "'Inter', sans-serif", cursor: 'pointer' } }, 'Switch'),
        React.createElement('button', { onClick: onClose, style: { background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 7, color: T.textSub, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' } }, '✕'),
      ),
    ),
    // Key entry
    needKey
      ? React.createElement('div', { style: { padding: 18, display: 'flex', flexDirection: 'column', gap: 11 } },
          React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.textSub, lineHeight: 1.6 } }, 'Enter your Anthropic API key. ', React.createElement('span', { style: { color: T.accent } }, 'Never saved — session only.')),
          React.createElement('input', { value: apiKey, onChange: e => setApiKey(e.target.value), placeholder: 'sk-ant-...', style: inputStyle(T, F), type: 'password' }),
          React.createElement(Btn, { onClick: () => {}, style: { width: '100%' } }, 'Enable AI Chat'),
          React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted, textAlign: 'center' } }, 'Free key at console.anthropic.com'),
        )
      : React.createElement(React.Fragment, null,
          // Messages
          React.createElement('div', { style: { flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 9, minHeight: 200, maxHeight: 300 } },
            ...msgs.map((m, i) =>
              React.createElement('div', { key: i, style: { display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' } },
                React.createElement('div', {
                  style: { maxWidth: '87%', background: m.role === 'user' ? T.accent : T.surfaceAlt, borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', padding: '9px 13px', fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: m.role === 'user' ? '#080d14' : T.text, lineHeight: 1.55 }
                }, m.text)
              )
            ),
            loading && React.createElement('div', { style: { display: 'flex', justifyContent: 'flex-start' } },
              React.createElement('div', { style: { background: T.surfaceAlt, borderRadius: 14, padding: '9px 14px', color: T.textMuted, fontSize: F.sm } }, 'Thinking…')
            ),
            React.createElement('div', { ref: endRef }),
          ),
          // Input
          React.createElement('div', { style: { padding: '10px 12px', borderTop: `1px solid ${T.border}`, display: 'flex', gap: 7 } },
            React.createElement('input', { value: input, onChange: e => setInput(e.target.value), onKeyDown: e => e.key === 'Enter' && (isApi ? sendApi() : sendOffline()), placeholder: 'Ask about your finances…', style: { ...inputStyle(T, F), padding: '8px 11px', fontSize: F.sm } }),
            React.createElement('button', {
              onClick: isApi ? sendApi : sendOffline, disabled: loading,
              style: { background: T.accent, border: 'none', borderRadius: 9, color: '#080d14', padding: '8px 14px', fontSize: F.md, fontWeight: 700, flexShrink: 0, cursor: 'pointer' }
            }, loading ? '…' : '↑'),
          ),
        )
  );
};
