// src/utils/wealthEngine.js

window.calcWealthScore = function (accounts, income) {
  const sumType = t => sumArr(accounts.filter(a => a.type === t).map(a => a.amount));
  const savings  = sumArr(accounts.filter(a => a.type === 'cash' && a.subtype === 'savings').map(a => a.amount));
  const equities = sumType('equities'), crypto = sumType('crypto'), metals = sumType('metals'), debt = sumType('debt');
  const totalAssets = sumType('cash') + equities + crypto + metals;
  const mortgage    = accounts.find(a => a.subtype === 'mortgage')?.amount || 0;
  const nonMortDebt = debt - mortgage;
  const totalIncome = (income?.job || 0) + (income?.business || 0) + (income?.dividends || 0);
  let score = 0;
  const factors = [];

  // Emergency fund (Dave Ramsey: $1k→$3k→3-6mo expenses)
  const efScore = Math.min(savings / 3000, 1) * 20; score += efScore;
  factors.push({ name: 'Emergency Fund', score: Math.round(efScore), max: 20, note: savings >= 3000 ? '✅ Fully funded' : `${fmt(savings)} saved — goal is $3,000` });

  // Debt-to-income
  const dti = totalIncome > 0 ? nonMortDebt / totalIncome : 10;
  const dtiScore = dti <= 1 ? 20 : dti <= 3 ? 14 : dti <= 6 ? 8 : 3; score += dtiScore;
  factors.push({ name: 'Debt-to-Income', score: dtiScore, max: 20, note: dti <= 1 ? '✅ Excellent ratio' : `Non-mortgage debt is ${dti.toFixed(1)}× monthly income` });

  // Investment rate (Tony Robbins: 10%+ of income)
  const mc = sumArr(accounts.filter(a => ['equities', 'crypto', 'metals'].includes(a.type)).map(a => a.monthlyContrib || 0));
  const ir = totalIncome > 0 ? mc / totalIncome : 0;
  const invScore = ir >= 0.15 ? 20 : ir >= 0.10 ? 16 : ir >= 0.05 ? 10 : 4; score += invScore;
  factors.push({ name: 'Investment Rate', score: invScore, max: 20, note: ir >= 0.10 ? `✅ ${(ir * 100).toFixed(1)}% of income invested` : `Investing ${(ir * 100).toFixed(1)}% — aim for 10%+` });

  // Net worth trajectory
  const nw = totalAssets - debt;
  const nwScore = nw > 50000 ? 20 : nw > 0 ? 12 : nw > -20000 ? 6 : 2; score += nwScore;
  factors.push({ name: 'Net Worth', score: nwScore, max: 20, note: nw > 0 ? `Positive ${fmt(nw)}` : `${fmt(nw)} — debt exceeds assets` });

  // Diversification (Buffett + Robbins)
  const div = [sumType('cash') > 0, equities > 0, crypto > 0, metals > 0].filter(Boolean).length;
  const divScore = div * 5; score += divScore;
  factors.push({ name: 'Diversification', score: divScore, max: 20, note: div >= 3 ? '✅ Well diversified' : `${div} asset class${div === 1 ? '' : 'es'} — add more` });

  const s = Math.round(score);
  const label = s >= 80 ? 'Excellent' : s >= 65 ? 'Good' : s >= 45 ? 'Fair' : s >= 30 ? 'Needs Work' : 'Critical';
  const color = s >= 80 ? '#e8a84a' : s >= 65 ? '#d4943a' : s >= 45 ? '#a07830' : s >= 30 ? '#8a6830' : '#6a5020';
  return { score: s, label, color, factors };
};

window.calcFreedomScore = function (answers, accounts, income) {
  const weights = { q1:[20,14,7,2], q2:[20,15,8,2], q3:[20,14,6,1], q4:[20,15,8,3], q5:[20,12,5,2], q6:[20,14,6,1], q7:[20,13,5,1], q8:[20,14,7,1] };
  let raw = 0;
  LIFE_QUESTIONS.forEach(q => { raw += (weights[q.id] || [])[answers[q.id] || 0] || 0; });
  const ws = calcWealthScore(accounts, income);
  return Math.min(Math.round(raw * 0.6 + ws.score * 0.4), 100);
};

window.getLifeScenario = function (score, profile) {
  const age  = parseInt(profile?.age) || 40;
  const name = profile?.name || 'You';
  const gender = profile?.gender || '';
  const pronoun = gender === 'Female' ? 'she' : gender === 'Male' ? 'he' : 'they';
  const retireAge = age + Math.max(0, 65 - age);

  if (score >= 80) return {
    label: 'Financial Freedom', emoji: '🏡',
    scene: '🌴🏡💎',
    color: '#e8a84a',
    title: `${name}'s Future: A Life of Freedom`,
    summary: `At ${retireAge}, ${name} has fully paid off the mortgage, maintains a diversified investment portfolio, and travels at will. The emergency fund has grown into generational wealth. ${pronoun.charAt(0).toUpperCase() + pronoun.slice(1)} wakes up each morning with choices — not obligations.`,
    details: [
      '🏡 Owns home outright — no mortgage payment',
      '✈️ Takes 2–3 vacations per year, fully funded',
      '📈 Investment income covers all monthly expenses',
      '👨‍👩‍👧 Leaves a financial legacy for the next generation',
      '😴 Sleeps peacefully — zero financial stress',
    ],
    callout: 'Keep your current path and this future is yours.',
  };

  if (score >= 50) return {
    label: 'Stable but Constrained', emoji: '🏢',
    scene: '🏢🛋️📺',
    color: '#d4943a',
    title: `${name}'s Future: Getting By Comfortably`,
    summary: `At ${retireAge}, ${name} lives in a modest apartment, has Social Security and a small retirement fund, and gets through each month — but there's little room for extras. ${pronoun.charAt(0).toUpperCase() + pronoun.slice(1)} is stable, but not free.`,
    details: [
      '🏢 Renting a modest apartment or living with family',
      '💊 Healthcare costs are a constant concern',
      '📅 Monthly budget requires careful management',
      '🚗 Older vehicle, deferred maintenance',
      '😐 Life is comfortable but choices are limited',
    ],
    callout: 'A few strategic changes now could dramatically shift this outcome.',
  };

  return {
    label: 'Financial Hardship', emoji: '😟',
    scene: '😟🌉💸',
    color: '#8a6830',
    title: `${name}'s Future: A Difficult Road`,
    summary: `Without significant changes, ${name}'s financial trajectory points toward hardship at ${retireAge}. Debt has compounded, savings were never built, and retirement income is minimal. Daily life involves real financial stress and limited options.`,
    details: [
      '💸 Living primarily on Social Security ($1,600–$2,000/mo)',
      '🏠 Housing instability — dependent on others or public assistance',
      '😰 Every unexpected expense becomes a crisis',
      '🏥 Difficulty affording healthcare and medications',
      '😔 Limited independence and personal freedom',
    ],
    callout: 'It\'s not too late. The right moves now change everything.',
  };
};

window.genRecommendations = function (accounts, income) {
  const savings = sumArr(accounts.filter(a => a.type === 'cash' && a.subtype === 'savings').map(a => a.amount));
  const credits = accounts.filter(a => a.subtype === 'credit' && a.amount > 0);
  const mc = sumArr(accounts.filter(a => ['equities', 'crypto'].includes(a.type)).map(a => a.monthlyContrib || 0));
  const totalIncome = (income?.job || 0) + (income?.business || 0);
  const recs = [];

  if (savings < 3000) recs.push({
    id: uid(), title: 'Build Emergency Fund First', icon: '🏦', source: 'Dave Ramsey', priority: 'high',
    desc: `You have ${fmt(savings)} in savings. Ramsey's Baby Step 1 & 3: build to $1,000 immediately, then grow to $3,000 (1 month of expenses).`,
    strategy: '🏦 Emergency Fund — Auto-transfer $200/mo to savings until you reach $3,000. This is untouchable.',
  });

  if (credits.length) recs.push({
    id: uid(), title: 'Eliminate Credit Card Debt', icon: '💳', source: 'Dave Ramsey + Buffett', priority: 'high',
    desc: `${fmt(sumArr(credits.map(a => a.amount)))} in credit card debt. At 20–29% APR, this is your most expensive money.`,
    strategy: `💳 Debt Snowball — Pay minimums everywhere. All extra money attacks ${credits.sort((a, b) => a.amount - b.amount)[0]?.label} first (smallest balance). Roll each payoff into the next card.`,
  });

  if (mc / Math.max(totalIncome, 1) < 0.10) recs.push({
    id: uid(), title: 'Automate 10% Into Investments', icon: '📈', source: 'Tony Robbins', priority: 'medium',
    desc: `You're investing ${((mc / Math.max(totalIncome, 1)) * 100).toFixed(1)}% of income. Robbins says automating 10% is the single most powerful habit.`,
    strategy: '📈 Auto-Invest — Increase 401k by $50/mo. Set a $25/mo recurring transfer to Roth IRA. Small amounts compound dramatically over 20 years.',
  });

  recs.push({
    id: uid(), title: 'Diversify Into Hard Assets', icon: '🪙', source: 'Warren Buffett', priority: 'low',
    desc: 'Hard assets (gold, silver) protect against inflation and currency devaluation. Buffett holds significant non-cash assets.',
    strategy: '🪙 Metals Hedge — Allocate 3–5% of monthly investment contributions to physical silver or gold as inflation insurance.',
  });

  recs.push({
    id: uid(), title: 'Update Your Tracker Every 2 Weeks', icon: '📊', source: 'All Advisors', priority: 'low',
    desc: 'Consistency in tracking is the #1 predictor of financial improvement. You\'re already doing the right thing.',
    strategy: '📊 Bi-Weekly Ritual — Every other payday: update balances, review goals, check Wealth Score trend.',
  });

  return recs;
};

// Expose question weights for UI display
window.QUESTION_WEIGHTS = { q1:[20,14,7,2], q2:[20,15,8,2], q3:[20,14,6,1], q4:[20,15,8,3], q5:[20,12,5,2], q6:[20,14,6,1], q7:[20,13,5,1], q8:[20,14,7,1] };
