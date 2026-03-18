// src/pages/LifeScore.js — Journey: Freedom Score Quiz + Three Futures
// v0.13: Persistent results, sub-tabs, score clarity, gender-aware images, history log
const { useState, useEffect, useContext } = React;

// ── localStorage persistence helpers ──────────────────────────────────────────
const LS_ANSWERS = 'cs_journey_answers';
const LS_PHASE   = 'cs_journey_phase';
const LS_HISTORY = 'cs_journey_history';

function loadPersistedJourney() {
  try {
    const phase   = localStorage.getItem(LS_PHASE) || 'intro';
    const answers = JSON.parse(localStorage.getItem(LS_ANSWERS) || '{}');
    return { phase, answers };
  } catch { return { phase: 'intro', answers: {} }; }
}

function saveJourneyState(phase, answers) {
  try {
    localStorage.setItem(LS_PHASE,   phase);
    localStorage.setItem(LS_ANSWERS, JSON.stringify(answers));
  } catch { /* storage full — silent fail */ }
}

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(LS_HISTORY) || '[]'); }
  catch { return []; }
}

function appendHistory(score, answers) {
  try {
    const hist = loadHistory();
    hist.push({ score, answers, date: new Date().toISOString() });
    if (hist.length > 20) hist.splice(0, hist.length - 20);
    localStorage.setItem(LS_HISTORY, JSON.stringify(hist));
  } catch { /* silent */ }
}

// ── Gender-aware Unsplash images by score tier ────────────────────────────────
const OUTCOME_IMAGES = {
  low: {
    male:   'https://images.unsplash.com/photo-1545079968-4a3cb9a3b832?w=600&q=80',
    female: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=600&q=80',
  },
  mid: {
    male:   'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80',
    female: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&q=80',
  },
  best: {
    male:   'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=600&q=80',
    female: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=600&q=80',
  },
};

function getOutcomeImage(score, gender) {
  const tier = score >= 80 ? 'best' : score >= 45 ? 'mid' : 'low';
  const gKey = (gender || '').toLowerCase().startsWith('f') ? 'female' : 'male';
  return OUTCOME_IMAGES[tier][gKey];
}

// ── Outcome narrative copy by tier ────────────────────────────────────────────
const OUTCOME_COPY = {
  best: {
    headline: "You're on the right path.",
    message:  "Your habits and holdings are aligned. Stay consistent, keep building, and protect what you've earned. Review your Wealth Score quarterly to catch any drift before it compounds.",
  },
  mid: {
    headline: "You're stable — but exposed.",
    message:  "You have a foundation, but gaps in savings, debt, or investing leave you one setback away from sliding backward. The recommendations below show you exactly where to focus next.",
  },
  low: {
    headline: "Your current path needs a change.",
    message:  "Without intentional shifts, compounding works against you. The good news: every point you gain on this score represents a real change in your trajectory. Start with one recommendation.",
  },
};

// ── Main component ────────────────────────────────────────────────────────────
window.LifeScorePage = function ({ accounts, income, profile, onViewRecommendations }) {
  const { T, F } = useContext(AppCtx);

  // Restore persisted state on mount — quiz survives tab navigation
  const persisted                      = loadPersistedJourney();
  const [phase,          setPhaseRaw]  = useState(persisted.phase);
  const [answers,        setAnswersRaw] = useState(persisted.answers);
  const [activeQ,        setActiveQ]   = useState(0);
  const [expandedFuture, setExpanded]  = useState(0);
  const [journeyTab,     setJourneyTab] = useState('results');
  const [historySaved,   setHistorySaved] = useState(false);

  // Persist-aware setters
  const setPhase = (p) => { setPhaseRaw(p); saveJourneyState(p, answers); };
  const setAnswers = (fn) => {
    setAnswersRaw(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn;
      saveJourneyState(phase, next);
      return next;
    });
  };

  const totalQ   = LIFE_QUESTIONS.length;
  const answered = Object.keys(answers).length;
  const allDone  = answered === totalQ;

  const weights = window.QUESTION_WEIGHTS || {
    q1:[20,14,7,2], q2:[20,15,8,2], q3:[20,14,6,1], q4:[20,15,8,3],
    q5:[20,12,5,2], q6:[20,14,6,1], q7:[20,13,5,1], q8:[20,14,7,1],
  };

  const pick = (qid, idx) => {
    if (window.playClick) window.playClick();
    setAnswers(prev => ({ ...prev, [qid]: idx }));
    if (activeQ < totalQ - 1) setTimeout(() => setActiveQ(i => i + 1), 180);
  };

  const score = allDone ? calcFreedomScore(answers, accounts, income) : null;
  const ws    = calcWealthScore(accounts, income);

  // Save to history the first time results are shown per session
  useEffect(() => {
    if (phase === 'results' && score !== null && !historySaved) {
      appendHistory(score, answers);
      setHistorySaved(true);
    }
  }, [phase, score]);

  const reset = () => {
    if (window.playClick) window.playClick();
    setAnswersRaw({});
    setPhaseRaw('intro');
    saveJourneyState('intro', {});
    setActiveQ(0);
    setExpanded(0);
    setHistorySaved(false);
  };

  const q = LIFE_QUESTIONS[activeQ];

  const sectionLabel = { fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: T.accent, marginBottom: 8 };
  const headingStyle = { fontFamily: "'Playfair Display', serif", fontWeight: 500, color: T.text };

  const gender     = profile?.gender || 'male';
  const history    = loadHistory();
  const scoreTier  = score !== null ? (score >= 80 ? 'best' : score >= 45 ? 'mid' : 'low') : 'mid';
  const tierColor  = { best: T.positive, mid: T.accent, low: T.negative };
  const tierC      = tierColor[scoreTier];
  const futures    = window.THREE_FUTURES || [];
  const levelColor = { best: T.accentBright || '#e8a84a', mid: T.accent || '#d4943a', low: T.accentDim || '#8a6830' };

  // ── RESULTS PHASE ───────────────────────────────────────────────────────────
  if (phase === 'results' && score !== null) {
    const userPathIdx  = score >= 80 ? 0 : score >= 45 ? 1 : 2;
    const outcomeImg   = getOutcomeImage(score, gender);
    const outcomeCopy  = OUTCOME_COPY[scoreTier];

    // History sub-tab
    const renderHistory = () => {
      if (history.length === 0) return React.createElement('div', {
        style: { textAlign: 'center', padding: '40px 20px', color: T.textMuted, fontFamily: "'Inter', sans-serif", fontSize: F.sm },
      }, 'No history yet. Complete the quiz to start tracking your progress.');

      return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
        React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted, marginBottom: 4 } },
          `${history.length} assessment${history.length !== 1 ? 's' : ''} recorded`
        ),
        history.length > 1 && React.createElement('div', { style: { background: T.surface, borderRadius: 12, padding: '14px 16px', border: `1px solid ${T.border}`, marginBottom: 4 } },
          React.createElement('div', { style: { ...sectionLabel, marginBottom: 10 } }, 'Score Trend'),
          React.createElement('div', { style: { display: 'flex', alignItems: 'flex-end', gap: 4, height: 52 } },
            history.slice(-12).map((h, i) => {
              const pct = h.score / 100;
              const c   = h.score >= 80 ? T.positive : h.score >= 45 ? T.accent : T.negative;
              return React.createElement('div', { key: i, style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 } },
                React.createElement('div', { title: String(h.score), style: { width: '100%', height: `${Math.max(pct * 42, 4)}px`, background: c, borderRadius: 3, opacity: 0.85 } }),
                React.createElement('div', { style: { fontSize: 8, color: T.textMuted } }, h.score),
              );
            })
          ),
        ),
        ...history.slice().reverse().map((h, i) => {
          const d   = new Date(h.date);
          const c   = h.score >= 80 ? T.positive : h.score >= 45 ? T.accent : T.negative;
          const lbl = h.score >= 80 ? 'The Builder' : h.score >= 45 ? 'The Balancer' : 'The Drifter';
          return React.createElement('div', { key: i, style: { background: T.surface, borderRadius: 12, padding: '14px 16px', border: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
            React.createElement('div', null,
              React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 26, color: c } }, h.score),
              React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textSub, marginTop: 2 } }, lbl),
            ),
            React.createElement('div', { style: { textAlign: 'right' } },
              React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted } },
                d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              ),
              i === 0 && React.createElement('div', { style: { fontSize: 9, color: T.accent, marginTop: 2 } }, 'Most Recent'),
            ),
          );
        }),
        React.createElement('div', { style: { paddingBottom: 20 } }),
      );
    };

    // Recommendations sub-tab (inline — no page switch needed)
    const renderRecs = () => {
      const recs = genRecommendations(accounts, income);
      const pc   = { high: T.negative, medium: T.accent, low: T.positive };
      return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },

        // Two-score clarity card
        React.createElement('div', { style: { background: T.surface, borderRadius: 14, border: `1px solid ${T.border}`, overflow: 'hidden', marginBottom: 4 } },
          React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr' } },
            React.createElement('div', { style: { padding: '16px 14px', borderRight: `1px solid ${T.border}` } },
              React.createElement('div', { style: { fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: T.accent, marginBottom: 6 } }, 'Freedom Score'),
              React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 28, color: tierC, lineHeight: 1 } }, score),
              React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted, marginTop: 4, lineHeight: 1.5 } },
                "Quiz-based — reflects your habits & mindset. Where you're headed."
              ),
            ),
            React.createElement('div', { style: { padding: '16px 14px' } },
              React.createElement('div', { style: { fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: T.textMuted, marginBottom: 6 } }, 'Position Score'),
              React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 28, color: ws.score >= 70 ? T.positive : ws.score >= 40 ? T.accent : T.negative, lineHeight: 1 } }, ws.score),
              React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted, marginTop: 4, lineHeight: 1.5 } },
                'Holdings-based — reflects your current financial position. Where you stand today.'
              ),
            ),
          ),
          React.createElement('div', { style: { padding: '10px 14px', borderTop: `1px solid ${T.border}`, background: T.surfaceAlt || T.surface } },
            React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textSub, lineHeight: 1.6 } },
              score > ws.score
                ? '💡 Your mindset is ahead of your current position. Keep executing — your holdings will catch up.'
                : score < ws.score
                ? '💡 Your holdings are stronger than your habits suggest. Tighten your financial behaviors to match your assets.'
                : '💡 Your habits and holdings are in sync — a rare and healthy state to be in.'
            ),
          ),
        ),

        ...recs.map(rec => {
          const priColor = pc[rec.priority] || T.textMuted;
          return React.createElement(Card, { key: rec.id, style: { padding: '18px 18px', border: `1px solid ${priColor}33` } },
            React.createElement('div', { style: { display: 'flex', gap: 10, marginBottom: 8 } },
              React.createElement('span', { style: { fontSize: F.xl } }, rec.icon),
              React.createElement('div', null,
                React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 500, fontSize: F.base, color: T.text, marginBottom: 3 } }, rec.title),
                React.createElement('span', { style: { fontSize: F.xs, fontFamily: "'Inter', sans-serif", fontWeight: 600, background: priColor + '22', color: priColor, borderRadius: 6, padding: '2px 8px' } }, rec.priority.toUpperCase()),
              ),
            ),
            React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.textSub, lineHeight: 1.65, marginBottom: 12 } }, rec.desc),
            React.createElement('div', { style: { background: T.accentGlow || 'rgba(212,148,58,0.08)', borderRadius: 10, padding: '10px 12px', border: `1px solid ${T.border}` } },
              React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 } }, 'Suggested Strategy'),
              React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 500, fontSize: F.sm, color: T.text, lineHeight: 1.55 } }, rec.strategy),
            ),
          );
        }),

        React.createElement('div', { style: { padding: '12px 16px', borderRadius: 10, border: `1px solid ${T.accent}33`, background: T.surface } },
          React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted, lineHeight: 1.65 } },
            '⚠️ These recommendations are for educational purposes only and do not constitute professional financial advice. Consult a CFP before major decisions.'
          ),
        ),
        React.createElement('div', { style: { paddingBottom: 20 } }),
      );
    };

    // Results sub-tab
    const renderResults = () => React.createElement('div', null,

      // Gender-aware outcome image with gradient overlay
      React.createElement('div', { style: { borderRadius: 16, overflow: 'hidden', marginBottom: 22, position: 'relative', height: 190 } },
        React.createElement('img', {
          src: outcomeImg,
          alt: `${scoreTier} outcome`,
          style: { width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' },
          onError: e => { e.target.style.display = 'none'; },
        }),
        React.createElement('div', { style: { position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8,13,20,0.88) 0%, rgba(8,13,20,0.1) 60%)' } }),
        React.createElement('div', { style: { position: 'absolute', bottom: 14, left: 16, right: 16 } },
          React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: F.lg, color: '#fff', lineHeight: 1.3 } },
            outcomeCopy.headline
          ),
        ),
      ),

      // Score
      React.createElement('div', { style: { textAlign: 'center', marginBottom: 24 } },
        React.createElement('div', { style: sectionLabel }, 'Freedom Score'),
        React.createElement('div', { style: { ...headingStyle, fontSize: 64, lineHeight: 1, color: tierC, marginBottom: 6 } }, score),
        React.createElement('div', { style: { ...headingStyle, fontSize: F.sm, fontWeight: 400, color: T.textSub } },
          score >= 80 ? 'The Builder — Financial Freedom Path'
          : score >= 45 ? 'The Balancer — Stable but Vulnerable'
          : 'The Drifter — Significant Change Needed'
        ),
      ),

      // Score bar
      React.createElement('div', { style: { marginBottom: 22 } },
        React.createElement('div', { style: { height: 6, background: T.border, borderRadius: 3, overflow: 'hidden', marginBottom: 8 } },
          React.createElement('div', { style: { height: '100%', width: `${score}%`, background: 'linear-gradient(90deg, #6a5020, #e8a84a)', borderRadius: 3, transition: 'width 1s ease' } })
        ),
        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.textMuted } },
          React.createElement('span', null, 'Hardship'),
          React.createElement('span', null, 'Constrained'),
          React.createElement('span', null, 'Freedom'),
        ),
      ),

      // Narrative path message
      React.createElement('div', { style: { padding: '16px 18px', borderRadius: 14, border: `1px solid ${tierC}33`, background: T.surface, marginBottom: 22 } },
        React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.textSub, lineHeight: 1.7 } }, outcomeCopy.message),
      ),

      // Three futures
      React.createElement('div', { style: { ...sectionLabel, marginBottom: 12 } }, 'Three Possible Futures'),
      ...futures.map((future, idx) => {
        const isYours = idx === userPathIdx;
        const isOpen  = expandedFuture === idx;
        const color   = levelColor[future.level];
        return React.createElement('div', {
          key: future.id,
          onClick: () => setExpanded(isOpen ? -1 : idx),
          style: { background: T.surface, borderRadius: 14, marginBottom: 10, border: `1px solid ${isYours ? color + '44' : T.border}`, borderLeft: `3px solid ${color}`, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s' },
        },
          React.createElement('div', { style: { padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
            React.createElement('div', null,
              isYours && React.createElement('div', { style: { fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color, marginBottom: 3 } }, 'Your Current Path'),
              React.createElement('div', { style: { ...headingStyle, fontSize: F.base, fontWeight: 600, color } }, future.name),
              React.createElement('div', { style: { fontSize: F.xs, color: T.textMuted, marginTop: 2 } }, `Score ${future.range}`),
            ),
            React.createElement('span', { style: { fontSize: F.xs, color: T.textMuted } }, isOpen ? '−' : '+'),
          ),
          isOpen && React.createElement('div', { style: { padding: '0 18px 18px' } },
            React.createElement('div', { style: { fontSize: F.sm, color: T.textSub, lineHeight: 1.65, marginBottom: 14 } }, future.headline),
            React.createElement('div', { style: { fontSize: F.sm, color: T.textMuted, lineHeight: 1.7, marginBottom: 14 } }, future.summary),
            React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 } },
              ...future.details.map((d, i) =>
                React.createElement('div', { key: i, style: { fontSize: F.xs, color: T.textSub, paddingLeft: 12, borderLeft: `1px solid ${color}44`, lineHeight: 1.5 } }, d)
              )
            ),
            React.createElement('div', { style: { fontSize: F.xs, color, fontStyle: 'italic', padding: '10px 12px', background: T.accentGlow, borderRadius: 8 } }, future.callout),
          ),
        );
      }),

      // Retake
      React.createElement('div', { style: { marginTop: 28, textAlign: 'center' } },
        React.createElement('div', { style: { fontSize: F.xs, color: T.textMuted, marginBottom: 14, lineHeight: 1.6 } },
          'Retake this assessment every 90 days. As your habits improve, your score rises.'
        ),
        React.createElement(Btn, { onClick: reset, variant: 'secondary', style: { padding: '12px 28px' } }, '🔄 Retake Assessment'),
      ),
      React.createElement('div', { style: { paddingBottom: 20 } }),
    );

    return React.createElement('div', {
      className: 'fade-up',
      style: { padding: '22px 16px 120px', background: T.bg, minHeight: '100vh', maxWidth: 460, margin: '0 auto' },
    },
      React.createElement('div', { style: { marginBottom: 18 } },
        React.createElement('div', { style: sectionLabel }, 'Your Journey'),
        React.createElement('h2', { style: { ...headingStyle, fontSize: 22, fontWeight: 600, marginBottom: 0 } }, 'Journey Dashboard'),
      ),

      // Sub-tabs
      React.createElement('div', { style: { display: 'flex', gap: 4, background: T.surface, borderRadius: 12, padding: 4, marginBottom: 22, border: `1px solid ${T.border}` } },
        [
          { id: 'results', label: '🏆 My Score' },
          { id: 'recs',    label: '📋 Recommendations' },
          { id: 'history', label: `📅 History${history.length > 1 ? ` (${history.length})` : ''}` },
        ].map(tab =>
          React.createElement('button', {
            key: tab.id,
            onClick: () => setJourneyTab(tab.id),
            style: {
              flex: 1, padding: '9px 6px', borderRadius: 9, border: 'none', cursor: 'pointer',
              fontFamily: "'Inter', sans-serif", fontSize: F.xs, fontWeight: journeyTab === tab.id ? 600 : 400,
              background: journeyTab === tab.id ? T.accent : 'transparent',
              color: journeyTab === tab.id ? '#080d14' : T.textMuted,
              transition: 'all 0.18s',
            },
          }, tab.label)
        )
      ),

      journeyTab === 'results' && renderResults(),
      journeyTab === 'recs'    && renderRecs(),
      journeyTab === 'history' && renderHistory(),
    );
  }

  // ── QUIZ PHASE ─────────────────────────────────────────────────────────────
  if (phase === 'quiz') {
    const qWeights = weights[q.id] || [];
    const maxW     = Math.max(...qWeights, 1);

    return React.createElement('div', {
      className: 'fade-up',
      style: { padding: '28px 20px 120px', background: T.bg, minHeight: '100vh', maxWidth: 460, margin: '0 auto' },
    },
      React.createElement('div', { style: { marginBottom: 24 } },
        React.createElement('div', { style: sectionLabel }, 'Your Journey'),
        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 } },
          React.createElement('div', { style: { fontSize: F.xs, color: T.textMuted } }, `Question ${activeQ + 1} of ${totalQ}`),
          React.createElement('div', { style: { fontSize: F.xs, color: T.textMuted } }, `${answered} answered`),
        ),
        React.createElement('div', { style: { height: 4, background: T.border, borderRadius: 2, overflow: 'hidden', marginBottom: 12 } },
          React.createElement('div', { style: { height: '100%', width: `${(answered / totalQ) * 100}%`, background: 'linear-gradient(90deg, #8a6830, #e8a84a)', borderRadius: 2, transition: 'width 0.35s ease' } })
        ),
        React.createElement('div', { style: { display: 'flex', gap: 5, justifyContent: 'center' } },
          ...LIFE_QUESTIONS.map((lq, i) => {
            const isAnswered = answers[lq.id] !== undefined;
            const isActive   = i === activeQ;
            return React.createElement('div', {
              key: i, onClick: () => setActiveQ(i),
              style: { width: isActive ? 20 : 10, height: 6, borderRadius: 3, cursor: 'pointer', transition: 'all 0.25s', background: isActive ? T.accent : isAnswered ? T.accentDim : T.border },
            });
          })
        ),
      ),

      React.createElement(Card, { style: { padding: '24px 20px', marginBottom: 14 } },
        React.createElement('div', { style: { ...headingStyle, fontSize: F.md, fontWeight: 400, lineHeight: 1.55, marginBottom: 20 } }, q.text),
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          ...q.opts.map((opt, i) => {
            const selected    = answers[q.id] === i;
            const w           = qWeights[i] || 0;
            const barPct      = (w / maxW) * 100;
            const impactLabel = w >= 18 ? 'High impact' : w >= 10 ? 'Medium impact' : 'Low impact';
            return React.createElement('button', {
              key: i, onClick: () => pick(q.id, i),
              style: {
                padding: '14px 16px', borderRadius: 10, textAlign: 'left', cursor: 'pointer',
                border: `1px solid ${selected ? T.accent : T.border}`,
                background: selected ? T.accentGlow : T.surfaceAlt,
                color: selected ? T.accent : T.text,
                fontFamily: "'Inter', sans-serif", fontSize: F.sm,
                fontWeight: selected ? 500 : 400, transition: 'all 0.15s',
                position: 'relative', overflow: 'hidden',
              },
            },
              React.createElement('div', { style: { position: 'absolute', left: 0, top: 0, bottom: 0, width: `${barPct}%`, background: selected ? T.accent + '18' : T.accent + '0a', transition: 'width 0.3s ease', pointerEvents: 'none' } }),
              React.createElement('div', { style: { position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 } },
                React.createElement('span', null, opt),
                React.createElement('span', { style: { fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: selected ? T.accent : T.textMuted, whiteSpace: 'nowrap' } }, impactLabel),
              ),
            );
          })
        ),
      ),

      React.createElement('div', { style: { display: 'flex', gap: 10 } },
        activeQ > 0 && React.createElement(Btn, { onClick: () => setActiveQ(i => i - 1), variant: 'ghost', style: { flex: 1 } }, '← Back'),
        activeQ < totalQ - 1
          ? React.createElement(Btn, { onClick: () => setActiveQ(i => i + 1), style: { flex: 2 } }, 'Next →')
          : allDone
            ? React.createElement(Btn, { onClick: () => { setPhaseRaw('results'); saveJourneyState('results', answers); }, style: { flex: 2 } }, 'See My Results')
            : React.createElement(Btn, { variant: 'ghost', style: { flex: 2 }, disabled: true }, 'Answer all questions'),
      ),

      allDone && React.createElement('div', { style: { textAlign: 'center', fontSize: F.xs, color: T.textMuted, marginTop: 12 } },
        'All questions answered — tap See My Results above.'
      ),
    );
  }

  // ── INTRO PHASE ────────────────────────────────────────────────────────────
  const hasHistory = history.length > 0;
  const lastScore  = hasHistory ? history[history.length - 1].score : null;

  return React.createElement('div', {
    className: 'fade-up',
    style: { padding: '28px 20px 120px', background: T.bg, minHeight: '100vh', maxWidth: 460, margin: '0 auto' },
  },
    React.createElement('div', { style: { marginBottom: 24 } },
      React.createElement('div', { style: sectionLabel }, 'Your Journey'),
      React.createElement('h2', { style: { ...headingStyle, fontSize: 26, fontWeight: 500, marginBottom: 8 } }, 'Discover Your Future'),
      React.createElement('div', { style: { fontSize: F.sm, color: T.textMuted, lineHeight: 1.6 } },
        '8 questions · Weighted scoring · Three possible outcomes'
      ),
    ),

    // Returning user: show last score + shortcut back to results
    hasHistory && React.createElement('div', {
      style: { padding: '14px 18px', borderRadius: 12, border: `1px solid ${T.accent}44`, background: T.surface, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    },
      React.createElement('div', null,
        React.createElement('div', { style: { fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: T.accent, marginBottom: 4 } }, 'Last Score'),
        React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 28, color: lastScore >= 80 ? T.positive : lastScore >= 45 ? T.accent : T.negative } }, lastScore),
      ),
      React.createElement(Btn, {
        onClick: () => { setPhaseRaw('results'); saveJourneyState('results', answers); },
        variant: 'secondary', style: { fontSize: F.xs, padding: '8px 14px' },
      }, 'View Results'),
    ),

    React.createElement('div', { style: { ...sectionLabel, marginBottom: 14 } }, 'Three Possible Futures'),
    ...futures.map((future, idx) => {
      const color = levelColor[future.level];
      return React.createElement('div', { key: future.id, style: { background: T.surface, borderRadius: 14, marginBottom: 10, border: `1px solid ${T.border}`, borderLeft: `3px solid ${color}`, padding: '16px 18px' } },
        React.createElement('div', { style: { ...headingStyle, fontSize: F.base, fontWeight: 600, color, marginBottom: 3 } }, future.name),
        React.createElement('div', { style: { fontSize: F.xs, color: T.textMuted, marginBottom: 6 } }, `Score ${future.range}`),
        React.createElement('div', { style: { fontSize: F.sm, color: T.textSub, lineHeight: 1.5 } }, future.headline),
      );
    }),

    React.createElement('div', { style: { padding: '16px 18px', borderRadius: 12, border: `1px solid ${T.border}`, marginBottom: 28, marginTop: 6 } },
      React.createElement('div', { style: { ...sectionLabel, marginBottom: 8 } }, 'How It Works'),
      React.createElement('div', { style: { fontSize: F.xs, color: T.textMuted, lineHeight: 1.8 } },
        'Each of the 8 questions carries a weighted score — the best answers yield up to 20 points each. ' +
        'Your quiz score (60%) is combined with your live Wealth Score (40%) to calculate a final Freedom Score out of 100.'
      ),
    ),

    React.createElement(Btn, {
      onClick: () => { if (window.playClick) window.playClick(); setPhase('quiz'); },
      style: { width: '100%', padding: '16px' },
    }, hasHistory ? '🔄 Retake Assessment' : 'Begin Assessment'),
  );
};
