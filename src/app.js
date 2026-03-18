// src/app.js — Root application component
const { useState, useEffect, useCallback, useContext } = React;

// App version (alpha stage)
window.APP_VERSION = '0.11';

// Default seed data for first-time users who skip onboarding
const DEFAULT_STRATEGIES = [
  { id: 'ds1', text: '🏦 Emergency Fund — Auto-transfer $200/mo to savings until reaching $3,000.' },
  { id: 'ds2', text: '💳 Debt Snowball — Pay minimums on all debt. All extra cash attacks the smallest balance first.' },
  { id: 'ds3', text: '📈 Auto-Invest — $15 bi-weekly into STRC, $15 into SCHD. Keep investing consistently.' },
];

function App() {
  const [themeMode, setTheme]    = useState(() => localStorage.getItem('ws_theme')    || 'dark');
  const [fontSize,  setFontSize] = useState(() => localStorage.getItem('cornerstone_fontsize') || 'medium');
  const T = themeMode === 'dark' ? DARK : LIGHT;
  const F = FONT_SCALES[fontSize] || FONT_SCALES.medium;

  const [appState, setAppState] = useState('loading'); // loading | onboarding | locked | app
  const [page,     setPage]     = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  // Core data
  const [profile,    setProfile]    = useState(null);
  const [income,     setIncome]     = useState({ job: 0, business: 0, dividends: 0 });
  const [accounts,   setAccounts]   = useState([]);
  const [goals,      setGoals]      = useState([]);
  const [strategies, setStrategies] = useState([]);

  // Live portfolio values from price engine
  // Map of accountId → { totalValue, positions: [...enriched] }
  const [liveValues,    setLiveValues]    = useState({});
  const [pricesLoading, setPricesLoading] = useState(false);
  const [pricesLastRun, setPricesLastRun] = useState(null);

  const isOnline = useOnlineStatus();
  const hasPin   = !!localStorage.getItem('ws_pin');

  // Theme persistence
  useEffect(() => { localStorage.setItem('ws_theme', themeMode); }, [themeMode]);
  useEffect(() => { localStorage.setItem('cornerstone_fontsize', fontSize); }, [fontSize]);
  
  // Listen for font size changes from Settings page
  useEffect(() => {
    const handler = (e) => setFontSize(e.detail);
    window.addEventListener('fontSizeChanged', handler);
    return () => window.removeEventListener('fontSizeChanged', handler);
  }, []);

  // Global body style
  useEffect(() => {
    document.body.style.background = T.bg;
    document.body.style.color      = T.text;
  }, [T]);

  // Auto-lock
  const lock = useCallback(() => { if (hasPin) setAppState('locked'); }, [hasPin]);
  useAutoLock(lock, hasPin);

  // ── Bootstrap — load from IndexedDB ───────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [onboarded, prof, inc, accts, gls, strats] = await Promise.all([
          DB.getSetting('onboarded'),
          DB.getSetting('profile'),
          DB.getSetting('income'),
          DB.getAccounts(),
          DB.getGoals(),
          DB.getStrategies(),
        ]);

        if (!onboarded) { setAppState('onboarding'); return; }

        setProfile(prof || {});
        setIncome(inc  || { job: 0, business: 0, dividends: 0 });
        setAccounts(accts  || []);
        setGoals(gls       || []);
        setStrategies(strats.length ? strats : DEFAULT_STRATEGIES);

        setAppState(hasPin ? 'locked' : 'app');
      } catch (err) {
        console.error('DB load error:', err);
        setAppState('onboarding');
      }
    })();
  }, []);

  // ── Live price refresh ─────────────────────────────────────────────────────
  // Runs when app becomes visible, when accounts change, or when we come online
  const refreshPrices = useCallback(async (accts) => {
    const list = accts || accounts;
    if (!list.length || !isOnline) return;
    // Only refresh if enough accounts have positions to warrant it
    const hasLiveableAccounts = list.some(a =>
      (a.type === 'equities' || a.type === 'crypto' || a.type === 'metals') && (a.positions || []).length > 0
    );
    if (!hasLiveableAccounts) return;

    setPricesLoading(true);
    try {
      const values = await PriceEngine.refreshAccountValues(list);
      setLiveValues(values);
      setPricesLastRun(new Date());

      // Weekly snapshot: check if we need a new one
      const due = await PriceEngine.shouldTakeSnapshot();
      if (due) {
        await PriceEngine.saveWeeklySnapshot(list, values);
      }
    } catch (err) {
      console.warn('[App] Price refresh failed:', err);
    }
    setPricesLoading(false);
  }, [accounts, isOnline]);

  // Refresh prices when app state becomes active
  useEffect(() => {
    if (appState === 'app' && accounts.length > 0) {
      refreshPrices(accounts);
    }
  }, [appState, isOnline]);

  // Re-run when accounts change (e.g. new position added)
  useEffect(() => {
    if (appState === 'app') refreshPrices(accounts);
  }, [accounts]);

  // ── Computed live net worth ────────────────────────────────────────────────
  // Merges stored account amounts with live price values where available
  const liveAccounts = accounts.map(a => ({
    ...a,
    liveAmount: liveValues[a.id]?.totalValue ?? a.amount,
  }));

  const onOnboardComplete = async (prof, inc, accts) => {
    setProfile(prof);
    setIncome(inc);
    setAccounts(accts);
    setStrategies(DEFAULT_STRATEGIES);
    for (const s of DEFAULT_STRATEGIES) await DB.saveStrategy(s);
    setAppState('app');
  };

  const ctx = { T, F, isOnline };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (appState === 'loading') return React.createElement(AppCtx.Provider, { value: ctx },
    React.createElement('div', { style: { minHeight: '100vh', background: T.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 } },
      React.createElement('svg', { viewBox: '0 0 48 48', width: 64, height: 64 },
        React.createElement('rect', { x: 8, y: 24, width: 16, height: 16, rx: 3, fill: '#d4943a', opacity: 0.9 }),
        React.createElement('rect', { x: 24, y: 24, width: 16, height: 16, rx: 3, fill: '#8a6830', opacity: 0.6 }),
        React.createElement('rect', { x: 16, y: 8, width: 16, height: 16, rx: 3, fill: '#5a6a7a', opacity: 0.4 }),
      ),
      React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: F.lg, color: T.text } }, 'Cornerstone'),
      React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.textMuted } }, 'Loading your vault…'),
    )
  );

  // ── Onboarding ────────────────────────────────────────────────────────────
  if (appState === 'onboarding') return React.createElement(AppCtx.Provider, { value: ctx },
    React.createElement(Onboarding, { onComplete: onOnboardComplete })
  );

  // ── PIN lock ──────────────────────────────────────────────────────────────
  if (appState === 'locked') return React.createElement(AppCtx.Provider, { value: ctx },
    React.createElement(PinLock, { onUnlock: () => setAppState('app') })
  );

  // ── Main app ──────────────────────────────────────────────────────────────
  // PAGE INDEX MAP — must stay in sync with Nav.js exactly:
  // Tab nav:    0=Home  1=Holdings  2=Forecast  3=Journey  (4=unused)  5=Report
  // Header nav: 6=Settings  7=Lifestyle  8=Support
  // Hidden:     9=Recommendations (reachable from Journey results)
  const pages = [
    React.createElement(Dashboard,           { key: 0, profile, accounts: liveAccounts, income, goals, setGoals, strategies, setStrategies, setPage, isOnline, liveValues, pricesLoading }),
    React.createElement(AccountsPage,        { key: 1, accounts, setAccounts, liveValues, pricesLoading, onRefreshPrices: () => refreshPrices(accounts) }),
    React.createElement(ProjectionsPage,     { key: 2, accounts: liveAccounts, income, profile }),
    React.createElement(LifeScorePage,       { key: 3, accounts: liveAccounts, income, profile, onViewRecommendations: () => setPage(9) }),
    null, // index 4 — unused (Nav jumps from 3 to 5)
    React.createElement(WeeklyReportPage,    { key: 5, accounts: liveAccounts, income, liveValues, isOnline }),
    React.createElement(SettingsPage,        { key: 6, profile, onUpdateProfile: setProfile, onOpenAdmin: () => setShowAdmin(true) }),
    React.createElement(LifestylePage,       { key: 7, profile, onUpdateProfile: setProfile }),
    React.createElement(SupportPage,         { key: 8, profile }),
    React.createElement(RecommendationsPage, { key: 9, accounts: liveAccounts, income, strategies, setStrategies }),
  ];

  return React.createElement(AppCtx.Provider, { value: ctx },
    React.createElement('div', { style: { background: T.bg, minHeight: '100vh' } },

      // Offline banner
      !isOnline && React.createElement('div', { style: { background: 'rgba(212,148,58,0.12)', border: '1px solid rgba(212,148,58,0.3)', padding: '8px 16px', textAlign: 'center', fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: F.xs, color: T.accent } },
        '📵 You\'re offline — all core features work without internet. Live prices paused.'
      ),

      React.createElement(Nav, { page, setPage, themeMode, setTheme, fontSize, setFontSize, isOnline, onLock: lock, hasPin, pricesLoading }),

      // Page content
      React.createElement('div', { style: { maxWidth: 800, margin: '0 auto' } },
        pages[page],
      ),

      // Global toast notifications
      React.createElement(ToastHost, null),

      // Chatbot FAB
      React.createElement('button', {
        onClick: () => { if (window.playClick) window.playClick(); setShowChat(p => !p); },
        className: 'no-print',
        style: {
          position: 'fixed', bottom: 24, right: 24, width: 54, height: 54,
          borderRadius: '50%', background: showChat ? T.surface : T.accent,
          border: `1px solid ${showChat ? T.border : T.accent}`,
          color: showChat ? T.textSub : '#080d14', fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)', zIndex: 200, transition: 'all 0.2s ease',
          cursor: 'pointer',
        },
      }, showChat ? '✕' : '💬'),

      showChat && React.createElement(Chatbot, {
        accounts: liveAccounts, income, goals, isOnline,
        onClose: () => setShowChat(false),
      }),

      // Admin Panel (modal overlay)
      showAdmin && React.createElement('div', {
        style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: T.bg, zIndex: 1000, overflowY: 'auto' }
      },
        React.createElement(AdminPage, { onClose: () => setShowAdmin(false) }),
      ),
    )
  );
}

// Mount
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
