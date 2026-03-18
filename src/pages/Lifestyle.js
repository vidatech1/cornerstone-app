// src/pages/Lifestyle.js — Income, Expenses, Tax & Life Score
const { useState, useEffect, useContext } = React;

window.LifestylePage = function ({ profile, onUpdateProfile }) {
  const { T, F } = useContext(AppCtx);
  
  // Load saved lifestyle data
  const [lifestyle, setLifestyle] = useState(() => {
    const saved = localStorage.getItem('cornerstone_lifestyle');
    return saved ? JSON.parse(saved) : {
      incomeSources: [],
      expenses: [],
      filingStatus: 'single',
      state: '',
      city: '',
      birthMonth: '',
      birthYear: '',
      profession: '',
      jobTitle: '',
      businessType: '',
    };
  });

  // Save on change
  useEffect(() => {
    localStorage.setItem('cornerstone_lifestyle', JSON.stringify(lifestyle));
  }, [lifestyle]);

  const [activeTab, setActiveTab] = useState('income');
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseView, setExpenseView] = useState('list'); // 'list' | 'calendar'
  const [newIncome, setNewIncome] = useState({ source: 'job', label: '', amount: '', grossAmount: '', benefitsCost: '', taxesWithheld: '' });
  const [newExpense, setNewExpense] = useState({ category: 'rent', label: '', amount: '', dueDay: '', frequency: 'monthly', frequencyEvery: 1, frequencyUnit: 'months' });

  const INCOME_TYPES = [
    { value: 'job', label: 'Employment', icon: '💼' },
    { value: 'business', label: 'Business', icon: '🏢' },
    { value: 'investment', label: 'Investment', icon: '📈' },
    { value: 'rental', label: 'Rental Income', icon: '🏠' },
    { value: 'freelance', label: 'Freelance', icon: '💻' },
    { value: 'other', label: 'Other', icon: '💰' },
  ];

  const EXPENSE_CATEGORIES = [
    { value: 'childcare',      label: 'Childcare',       icon: '👶', group: 'Family' },
    { value: 'clothing',       label: 'Clothing',        icon: '👕', group: 'Personal' },
    { value: 'debt',           label: 'Debt Payments',   icon: '💳', group: 'Finance' },
    { value: 'dining',         label: 'Dining Out',      icon: '🍽️', group: 'Food' },
    { value: 'education',      label: 'Education',       icon: '📚', group: 'Family' },
    { value: 'entertainment',  label: 'Entertainment',   icon: '🎬', group: 'Lifestyle' },
    { value: 'fuel',           label: 'Gas / Fuel',      icon: '⛽', group: 'Transportation' },
    { value: 'giving',         label: 'Giving / Tithe',  icon: '🙏', group: 'Finance' },
    { value: 'groceries',      label: 'Groceries',       icon: '🛒', group: 'Food' },
    { value: 'healthcare',     label: 'Healthcare',      icon: '🏥', group: 'Personal' },
    { value: 'insurance',      label: 'Insurance',       icon: '🛡️', group: 'Finance' },
    { value: 'mortgage',       label: 'Mortgage',        icon: '🏡', group: 'Housing' },
    { value: 'personal',       label: 'Personal Care',   icon: '💅', group: 'Personal' },
    { value: 'rent',           label: 'Rent',            icon: '🏠', group: 'Housing' },
    { value: 'savings',        label: 'Savings / Invest',icon: '🏦', group: 'Finance' },
    { value: 'subscriptions',  label: 'Subscriptions',   icon: '📱', group: 'Lifestyle' },
    { value: 'transportation', label: 'Transportation',  icon: '🚗', group: 'Transportation' },
    { value: 'utilities',      label: 'Utilities',       icon: '💡', group: 'Housing' },
    { value: 'custom',         label: 'Custom / Other',  icon: '✏️', group: 'Other' },
  ];

  // Groups in display order
  const EXPENSE_GROUP_ORDER = ['Housing', 'Food', 'Transportation', 'Finance', 'Personal', 'Family', 'Lifestyle', 'Other'];

  const FREQUENCY_OPTS = [
    { value: 'monthly',  label: 'Monthly' },
    { value: 'bimonthly',label: 'Every 2 Months' },
    { value: 'quarterly',label: 'Every 3 Months' },
    { value: 'biannual', label: 'Every 6 Months' },
    { value: 'annual',   label: 'Yearly' },
    { value: 'custom',   label: 'Custom Cycle' },
  ];

  // Effective monthly cost of variable-frequency bills
  const effectiveMonthlyCost = (exp) => {
    const amt = parseFloat(exp.amount) || 0;
    if (!exp.frequency || exp.frequency === 'monthly') return amt;
    if (exp.frequency === 'bimonthly')  return amt / 2;
    if (exp.frequency === 'quarterly')  return amt / 3;
    if (exp.frequency === 'biannual')   return amt / 6;
    if (exp.frequency === 'annual')     return amt / 12;
    if (exp.frequency === 'custom') {
      const every = parseFloat(exp.frequencyEvery) || 1;
      const unit  = exp.frequencyUnit || 'months';
      const months = unit === 'weeks' ? every / 4.33 : unit === 'years' ? every * 12 : every;
      return amt / months;
    }
    return amt;
  };

  const FILING_STATUSES = [
    { value: 'single', label: 'Single' },
    { value: 'married_joint', label: 'Married Filing Jointly' },
    { value: 'married_separate', label: 'Married Filing Separately' },
    { value: 'head_household', label: 'Head of Household' },
    { value: 'widow', label: 'Qualifying Widow(er)' },
  ];

  const US_STATES = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
    'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
    'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
    'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
    'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
    'Wisconsin', 'Wyoming'
  ];

  // No state income tax states
  const NO_STATE_TAX = ['Alaska', 'Florida', 'Nevada', 'South Dakota', 'Tennessee', 'Texas', 'Washington', 'Wyoming'];

  // Calculate totals
  // For employment income: use netAmount if available, else amount
  const effectiveMonthlyIncome = (inc) => {
    if (inc.source === 'job' && inc.netAmount) return parseFloat(inc.netAmount) || 0;
    return parseFloat(inc.amount) || 0;
  };
  const totalMonthlyIncome = lifestyle.incomeSources.reduce((sum, i) => sum + effectiveMonthlyIncome(i), 0);
  const totalMonthlyExpenses = lifestyle.expenses.reduce((sum, e) => sum + effectiveMonthlyCost(e), 0);
  const monthlyNet = totalMonthlyIncome - totalMonthlyExpenses;
  const annualIncome = totalMonthlyIncome * 12;

  // Calculate age from birth year
  const currentYear = new Date().getFullYear();
  const age = lifestyle.birthYear ? currentYear - parseInt(lifestyle.birthYear) : null;

  // Calculate federal tax bracket (2024 rates, simplified)
  const getFederalTaxBracket = (income, status) => {
    const brackets = {
      single: [
        { min: 0, max: 11600, rate: 10 },
        { min: 11600, max: 47150, rate: 12 },
        { min: 47150, max: 100525, rate: 22 },
        { min: 100525, max: 191950, rate: 24 },
        { min: 191950, max: 243725, rate: 32 },
        { min: 243725, max: 609350, rate: 35 },
        { min: 609350, max: Infinity, rate: 37 },
      ],
      married_joint: [
        { min: 0, max: 23200, rate: 10 },
        { min: 23200, max: 94300, rate: 12 },
        { min: 94300, max: 201050, rate: 22 },
        { min: 201050, max: 383900, rate: 24 },
        { min: 383900, max: 487450, rate: 32 },
        { min: 487450, max: 731200, rate: 35 },
        { min: 731200, max: Infinity, rate: 37 },
      ],
      head_household: [
        { min: 0, max: 16550, rate: 10 },
        { min: 16550, max: 63100, rate: 12 },
        { min: 63100, max: 100500, rate: 22 },
        { min: 100500, max: 191950, rate: 24 },
        { min: 191950, max: 243700, rate: 32 },
        { min: 243700, max: 609350, rate: 35 },
        { min: 609350, max: Infinity, rate: 37 },
      ],
    };
    const statusBrackets = brackets[status] || brackets.single;
    const bracket = statusBrackets.find(b => income >= b.min && income < b.max);
    return bracket ? bracket.rate : 22;
  };

  const federalBracket = getFederalTaxBracket(annualIncome, lifestyle.filingStatus);
  const hasStateTax = lifestyle.state && !NO_STATE_TAX.includes(lifestyle.state);

  // Life Score calculation
  const calculateLifeScore = () => {
    if (totalMonthlyIncome === 0) return 0;
    
    let score = 50; // Base score
    
    // Savings rate impact (up to +30)
    const savingsRate = monthlyNet / totalMonthlyIncome;
    if (savingsRate >= 0.3) score += 30;
    else if (savingsRate >= 0.2) score += 25;
    else if (savingsRate >= 0.15) score += 20;
    else if (savingsRate >= 0.1) score += 15;
    else if (savingsRate >= 0.05) score += 10;
    else if (savingsRate > 0) score += 5;
    else score -= 10; // Negative means spending more than earning
    
    // Multiple income streams (+10)
    if (lifestyle.incomeSources.length >= 3) score += 10;
    else if (lifestyle.incomeSources.length >= 2) score += 5;
    
    // Expense to income ratio
    const expenseRatio = totalMonthlyExpenses / totalMonthlyIncome;
    if (expenseRatio <= 0.5) score += 10;
    else if (expenseRatio <= 0.7) score += 5;
    else if (expenseRatio >= 1) score -= 15;
    
    return Math.min(Math.max(Math.round(score), 0), 100);
  };

  const lifeScore = calculateLifeScore();

  // Get score label
  const getScoreLabel = (score) => {
    if (score >= 85) return { label: 'Thriving', color: T.accentBright };
    if (score >= 70) return { label: 'Flourishing', color: T.accent };
    if (score >= 50) return { label: 'Stable', color: T.accent };
    if (score >= 30) return { label: 'Struggling', color: T.accentDim };
    return { label: 'Critical', color: T.accentDim };
  };

  const scoreInfo = getScoreLabel(lifeScore);

  // Side hustle recommendations based on profession
  const getSideHustleIdeas = () => {
    const prof = (lifestyle.profession || '').toLowerCase();
    const ideas = [];
    
    if (/engineer|developer|programmer|tech|software|it/.test(prof)) {
      ideas.push('Freelance development on Upwork/Toptal', 'Build and sell SaaS products', 'Technical writing or course creation', 'Code review consulting');
    } else if (/design|creative|art|graphic/.test(prof)) {
      ideas.push('Freelance design on 99designs/Fiverr', 'Sell digital assets on Creative Market', 'Brand consulting for small businesses', 'Social media management');
    } else if (/teach|education|professor/.test(prof)) {
      ideas.push('Online tutoring on Wyzant/Chegg', 'Create courses on Udemy/Skillshare', 'Test prep coaching', 'Curriculum consulting');
    } else if (/nurse|medical|health|doctor/.test(prof)) {
      ideas.push('Per diem shifts at other facilities', 'Health coaching/consulting', 'Medical writing', 'Telehealth services');
    } else if (/account|finance|bank/.test(prof)) {
      ideas.push('Bookkeeping for small businesses', 'Tax preparation services', 'Financial coaching', 'Freelance CFO services');
    } else if (/market|sales|business/.test(prof)) {
      ideas.push('Marketing consulting', 'Affiliate marketing', 'Sales coaching', 'Lead generation services');
    } else if (/write|editor|content/.test(prof)) {
      ideas.push('Freelance writing/copywriting', 'Ghostwriting books', 'Content strategy consulting', 'Newsletter creation');
    } else if (/real estate|property/.test(prof)) {
      ideas.push('Property management', 'Real estate photography', 'Home staging consulting', 'Rental arbitrage');
    } else {
      ideas.push('Consulting in your field of expertise', 'Creating educational content', 'Coaching/mentoring', 'Starting a service-based side business');
    }
    
    return ideas;
  };

  // Add income source
  const addIncome = () => {
    if (window.playClick) window.playClick();
    const label = newIncome.label || INCOME_TYPES.find(t => t.value === newIncome.source)?.label || 'Income';
    const entry = { id: uid(), source: newIncome.source, label };
    if (newIncome.source === 'job' && newIncome.grossAmount && parseFloat(newIncome.grossAmount) > 0) {
      entry.grossAmount   = parseFloat(newIncome.grossAmount)   || 0;
      entry.benefitsCost  = parseFloat(newIncome.benefitsCost)  || 0;
      entry.taxesWithheld = parseFloat(newIncome.taxesWithheld) || 0;
      entry.netAmount     = entry.grossAmount - entry.benefitsCost - entry.taxesWithheld;
      entry.amount        = entry.netAmount;
    } else {
      if (!newIncome.amount || parseFloat(newIncome.amount) <= 0) return;
      entry.amount = parseFloat(newIncome.amount) || 0;
    }
    setLifestyle(prev => ({ ...prev, incomeSources: [...prev.incomeSources, entry] }));
    setNewIncome({ source: 'job', label: '', amount: '', grossAmount: '', benefitsCost: '', taxesWithheld: '' });
    setShowAddIncome(false);
  };

  // Add expense
  const addExpense = () => {
    if (!newExpense.amount || parseFloat(newExpense.amount) <= 0) return;
    if (window.playClick) window.playClick();
    const label = newExpense.label || EXPENSE_CATEGORIES.find(c => c.value === newExpense.category)?.label || 'Expense';
    const entry = {
      id: uid(),
      category: newExpense.category,
      label,
      amount: parseFloat(newExpense.amount),
      frequency: newExpense.frequency || 'monthly',
      dueDay: newExpense.dueDay || '',
    };
    if (newExpense.frequency === 'custom') {
      entry.frequencyEvery = parseFloat(newExpense.frequencyEvery) || 1;
      entry.frequencyUnit  = newExpense.frequencyUnit || 'months';
    }
    setLifestyle(prev => ({ ...prev, expenses: [...prev.expenses, entry] }));
    setNewExpense({ category: 'rent', label: '', amount: '', dueDay: '', frequency: 'monthly', frequencyEvery: 1, frequencyUnit: 'months' });
    setShowAddExpense(false);
  };

  // Remove item
  const removeIncome = (id) => {
    if (window.playClick) window.playClick();
    setLifestyle(prev => ({ ...prev, incomeSources: prev.incomeSources.filter(i => i.id !== id) }));
  };

  const removeExpense = (id) => {
    if (window.playClick) window.playClick();
    setLifestyle(prev => ({ ...prev, expenses: prev.expenses.filter(e => e.id !== id) }));
  };

  // Update profile field
  const updateField = (field, value) => {
    setLifestyle(prev => ({ ...prev, [field]: value }));
  };

  const iStyle = inputStyle(T, F);

  const TabButton = ({ id, label, icon }) => React.createElement('button', {
    onClick: () => { if (window.playClick) window.playClick(); setActiveTab(id); },
    style: {
      flex: 1,
      padding: '12px 8px',
      background: activeTab === id ? T.accentGlow : 'transparent',
      border: 'none',
      borderBottom: activeTab === id ? `2px solid ${T.accent}` : '2px solid transparent',
      color: activeTab === id ? T.accent : T.textMuted,
      fontFamily: "'Inter', sans-serif",
      fontSize: F.xs,
      fontWeight: activeTab === id ? 600 : 400,
      cursor: 'pointer',
      transition: 'all 0.2s',
    }
  }, icon, ' ', label);

  return React.createElement('div', {
    className: 'fade-up',
    style: { padding: '24px 18px 120px', background: T.bg, minHeight: '100vh' }
  },
    // Header
    React.createElement('div', { style: { marginBottom: 24 } },
      React.createElement('div', { style: { fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: T.accent, marginBottom: 6 } }, 'Financial Wellness'),
      React.createElement('h1', { style: { fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 500, color: T.text, marginBottom: 8 } }, 'Lifestyle'),
      React.createElement('p', { style: { fontSize: F.sm, color: T.textSub, lineHeight: 1.5 } }, 'Track income, expenses, and understand your financial health'),
    ),

    // Life Score Card
    React.createElement(Card, { style: { padding: '20px 22px', marginBottom: 20, textAlign: 'center' } },
      React.createElement('div', { style: { marginBottom: 12 } },
        React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontSize: 48, fontWeight: 500, color: scoreInfo.color } }, lifeScore),
        React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: scoreInfo.color, fontWeight: 600, marginBottom: 4 } }, scoreInfo.label),
        React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted } }, 'Lifestyle Score'),
      ),
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 } },
        React.createElement('div', { style: { textAlign: 'center' } },
          React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.md, color: T.accentBright } }, fmt(totalMonthlyIncome)),
          React.createElement('div', { style: { fontSize: F.xs - 1, color: T.textMuted, marginTop: 2 } }, 'Income/mo'),
        ),
        React.createElement('div', { style: { textAlign: 'center' } },
          React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.md, color: T.accentDim } }, fmt(totalMonthlyExpenses)),
          React.createElement('div', { style: { fontSize: F.xs - 1, color: T.textMuted, marginTop: 2 } }, 'Expenses/mo'),
        ),
        React.createElement('div', { style: { textAlign: 'center' } },
          React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.md, color: monthlyNet >= 0 ? T.accent : T.accentDim } }, fmt(monthlyNet)),
          React.createElement('div', { style: { fontSize: F.xs - 1, color: T.textMuted, marginTop: 2 } }, 'Net/mo'),
        ),
      ),
    ),

    // Tabs
    React.createElement('div', { style: { display: 'flex', borderBottom: `1px solid ${T.border}`, marginBottom: 20 } },
      React.createElement(TabButton, { id: 'income', label: 'Income', icon: '💼' }),
      React.createElement(TabButton, { id: 'expenses', label: 'Expenses', icon: '💳' }),
      React.createElement(TabButton, { id: 'profile', label: 'Profile', icon: '👤' }),
      React.createElement(TabButton, { id: 'insights', label: 'Insights', icon: '💡' }),
    ),

    // Tab Content
    activeTab === 'income' && React.createElement('div', null,
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 } },
        React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.md, color: T.text } }, 'Income Sources'),
        React.createElement(Btn, { onClick: () => setShowAddIncome(true), style: { padding: '8px 14px', fontSize: F.xs } }, '+ Add'),
      ),

      lifestyle.incomeSources.length === 0
        ? React.createElement('div', { style: { textAlign: 'center', padding: '40px 20px', color: T.textMuted } },
            React.createElement('div', { style: { fontSize: 32, marginBottom: 12 } }, '💼'),
            React.createElement('div', { style: { fontSize: F.sm } }, 'No income sources yet'),
            React.createElement('div', { style: { fontSize: F.xs, marginTop: 4 } }, 'Add your job, business, or other income'),
          )
        : lifestyle.incomeSources.map(inc => {
            const typeInfo = INCOME_TYPES.find(t => t.value === inc.source) || INCOME_TYPES[5];
            const hasBreakdown = inc.source === 'job' && inc.grossAmount;
            return React.createElement(Card, { key: inc.id, style: { padding: '14px 16px', marginBottom: 10 } },
              React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: hasBreakdown ? 10 : 0 } },
                React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
                  React.createElement('span', { style: { fontSize: 22 } }, typeInfo.icon),
                  React.createElement('div', null,
                    React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.sm, color: T.text, fontWeight: 500 } }, inc.label),
                    React.createElement('div', { style: { fontFamily: "'Inter', sans-serif", fontSize: F.xs, color: T.textMuted } }, typeInfo.label),
                  ),
                ),
                React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                  React.createElement('div', { style: { textAlign: 'right' } },
                    React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.md, color: T.accentBright } },
                      fmt(inc.netAmount ?? inc.amount)
                    ),
                    hasBreakdown && React.createElement('div', { style: { fontSize: 10, color: T.textMuted } }, 'net/mo'),
                  ),
                  React.createElement('button', { onClick: () => removeIncome(inc.id), style: { background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer', padding: 4 } }, '✕'),
                ),
              ),
              // Employment breakdown rows
              hasBreakdown && React.createElement('div', { style: { background: T.surfaceAlt, borderRadius: 10, padding: '10px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 } },
                React.createElement('div', null,
                  React.createElement('div', { style: { fontSize: 10, color: T.textMuted, marginBottom: 2 } }, 'Gross'),
                  React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.sm, color: T.text } }, fmt(inc.grossAmount)),
                ),
                React.createElement('div', null,
                  React.createElement('div', { style: { fontSize: 10, color: T.textMuted, marginBottom: 2 } }, 'Benefits'),
                  React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.sm, color: T.accentDim } }, '−' + fmt(inc.benefitsCost || 0)),
                ),
                React.createElement('div', null,
                  React.createElement('div', { style: { fontSize: 10, color: T.textMuted, marginBottom: 2 } }, 'Taxes'),
                  React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.sm, color: T.accentDim } }, '−' + fmt(inc.taxesWithheld || 0)),
                ),
              ),
            );
          }),

      // Add Income Modal
      showAddIncome && React.createElement('div', {
        className: 'modal-overlay',
        onClick: e => { if (e.target === e.currentTarget) setShowAddIncome(false); },
        style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: 20 }
      },
        React.createElement('div', { className: 'scale-in', style: { background: T.surface, borderRadius: 18, padding: 24, width: '100%', maxWidth: 420, maxHeight: '92vh', overflowY: 'auto' } },
          React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.lg, color: T.text, marginBottom: 20 } }, 'Add Income Source'),

          React.createElement('div', { style: { marginBottom: 14 } },
            React.createElement(Lbl, null, 'Type'),
            React.createElement('select', { value: newIncome.source, onChange: e => setNewIncome(p => ({ ...p, source: e.target.value })), style: { ...iStyle, cursor: 'pointer' } },
              ...INCOME_TYPES.map(t => React.createElement('option', { key: t.value, value: t.value }, t.icon + ' ' + t.label))
            ),
          ),

          React.createElement('div', { style: { marginBottom: 14 } },
            React.createElement(Lbl, null, 'Label (optional)'),
            React.createElement('input', { value: newIncome.label, onChange: e => setNewIncome(p => ({ ...p, label: e.target.value })), placeholder: 'e.g. Day Job, Etsy Shop', style: iStyle }),
          ),

          // Employment detail fields
          newIncome.source === 'job'
            ? React.createElement('div', { style: { background: T.surfaceAlt, borderRadius: 12, padding: '14px', marginBottom: 14, border: `1px solid ${T.border}` } },
                React.createElement('div', { style: { fontSize: F.xs, color: T.accent, fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 } }, '💼 Pay Breakdown'),
                React.createElement('div', { style: { marginBottom: 10 } },
                  React.createElement(Lbl, null, 'Monthly Gross Income ($)'),
                  React.createElement('input', { type: 'number', value: newIncome.grossAmount, onChange: e => setNewIncome(p => ({ ...p, grossAmount: e.target.value })), placeholder: '0', style: iStyle }),
                ),
                React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 } },
                  React.createElement('div', null,
                    React.createElement(Lbl, null, 'Benefits Cost ($)'),
                    React.createElement('input', { type: 'number', value: newIncome.benefitsCost, onChange: e => setNewIncome(p => ({ ...p, benefitsCost: e.target.value })), placeholder: '0', style: iStyle }),
                  ),
                  React.createElement('div', null,
                    React.createElement(Lbl, null, 'Taxes Withheld ($)'),
                    React.createElement('input', { type: 'number', value: newIncome.taxesWithheld, onChange: e => setNewIncome(p => ({ ...p, taxesWithheld: e.target.value })), placeholder: '0', style: iStyle }),
                  ),
                ),
                // Live net preview
                newIncome.grossAmount && parseFloat(newIncome.grossAmount) > 0 && React.createElement('div', { style: { padding: '8px 12px', background: T.accentGlow, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                  React.createElement('span', { style: { fontSize: F.xs, color: T.textMuted } }, 'Calculated Net/mo'),
                  React.createElement('span', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.md, color: T.accentBright } },
                    fmt(
                      (parseFloat(newIncome.grossAmount) || 0) -
                      (parseFloat(newIncome.benefitsCost) || 0) -
                      (parseFloat(newIncome.taxesWithheld) || 0)
                    )
                  ),
                ),
                !newIncome.grossAmount && React.createElement('div', { style: { marginTop: 4 } },
                  React.createElement(Lbl, null, '— OR just enter Net Monthly ($)'),
                  React.createElement('input', { type: 'number', value: newIncome.amount, onChange: e => setNewIncome(p => ({ ...p, amount: e.target.value })), placeholder: 'Net take-home', style: iStyle }),
                ),
              )
            : React.createElement('div', { style: { marginBottom: 14 } },
                React.createElement(Lbl, null, 'Monthly Amount ($)'),
                React.createElement('input', { type: 'number', value: newIncome.amount, onChange: e => setNewIncome(p => ({ ...p, amount: e.target.value })), placeholder: '0', style: iStyle }),
              ),

          React.createElement('div', { style: { display: 'flex', gap: 10, marginTop: 6 } },
            React.createElement(Btn, { onClick: () => setShowAddIncome(false), variant: 'ghost', style: { flex: 1 } }, 'Cancel'),
            React.createElement(Btn, { onClick: addIncome, style: { flex: 2 } }, 'Add Income'),
          ),
        ),
      ),
    ),

    activeTab === 'expenses' && React.createElement('div', null,
      // Toolbar: list/calendar toggle + Add
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 } },
        React.createElement('div', { style: { display: 'flex', gap: 6 } },
          React.createElement('button', {
            onClick: () => setExpenseView('list'),
            style: { padding: '6px 12px', borderRadius: 8, border: `1px solid ${expenseView === 'list' ? T.accent : T.border}`, background: expenseView === 'list' ? T.accentGlow : 'transparent', color: expenseView === 'list' ? T.accent : T.textMuted, fontSize: F.xs, cursor: 'pointer' }
          }, '☰ List'),
          React.createElement('button', {
            onClick: () => setExpenseView('calendar'),
            style: { padding: '6px 12px', borderRadius: 8, border: `1px solid ${expenseView === 'calendar' ? T.accent : T.border}`, background: expenseView === 'calendar' ? T.accentGlow : 'transparent', color: expenseView === 'calendar' ? T.accent : T.textMuted, fontSize: F.xs, cursor: 'pointer' }
          }, '📅 Calendar'),
        ),
        React.createElement(Btn, { onClick: () => setShowAddExpense(true), style: { padding: '8px 14px', fontSize: F.xs } }, '+ Add'),
      ),

      lifestyle.expenses.length === 0
        ? React.createElement('div', { style: { textAlign: 'center', padding: '40px 20px', color: T.textMuted } },
            React.createElement('div', { style: { fontSize: 32, marginBottom: 12 } }, '💳'),
            React.createElement('div', { style: { fontSize: F.sm } }, 'No expenses tracked yet'),
            React.createElement('div', { style: { fontSize: F.xs, marginTop: 4 } }, 'Add your monthly bills and spending'),
          )
        : expenseView === 'calendar'
          // ── Calendar View ──────────────────────────────────────────────────
          ? React.createElement('div', null,
              React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.md, color: T.text, marginBottom: 12 } }, 'Bills by Due Date'),
              React.createElement('div', { style: { position: 'relative' } },
                // Day 1–31 grid
                (() => {
                  const withDue = lifestyle.expenses.filter(e => e.dueDay);
                  const noDue   = lifestyle.expenses.filter(e => !e.dueDay);
                  const byDay   = {};
                  withDue.forEach(e => { const d = parseInt(e.dueDay); if (!byDay[d]) byDay[d] = []; byDay[d].push(e); });
                  const today = new Date().getDate();
                  return React.createElement('div', null,
                    // Calendar grid
                    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 16 } },
                      ...['S','M','T','W','T','F','S'].map((d, i) =>
                        React.createElement('div', { key: i, style: { textAlign: 'center', fontSize: 10, color: T.textMuted, padding: '4px 0' } }, d)
                      ),
                      ...[...Array(31)].map((_, i) => {
                        const day = i + 1;
                        const bills = byDay[day] || [];
                        const isToday = day === today;
                        return React.createElement('div', { key: day, style: { minHeight: 44, background: bills.length ? T.accentGlow : T.surface, border: `1px solid ${isToday ? T.accent : T.border}`, borderRadius: 8, padding: '3px 4px', position: 'relative' } },
                          React.createElement('div', { style: { fontSize: 10, color: isToday ? T.accent : T.textMuted, fontWeight: isToday ? 700 : 400 } }, day),
                          bills.map((b, bi) => {
                            const cat = EXPENSE_CATEGORIES.find(c => c.value === b.category);
                            return React.createElement('div', { key: bi, title: `${b.label} — ${fmt(b.amount)}`, style: { fontSize: 9, color: T.accent, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' } }, cat?.icon);
                          }),
                        );
                      }),
                    ),
                    // Bill list below grid
                    Object.keys(byDay).sort((a, b) => parseInt(a) - parseInt(b)).map(day =>
                      React.createElement('div', { key: day, style: { marginBottom: 8 } },
                        React.createElement('div', { style: { fontSize: F.xs, color: T.textMuted, marginBottom: 4 } }, `Due: Day ${day}`),
                        ...byDay[day].map(exp => {
                          const cat = EXPENSE_CATEGORIES.find(c => c.value === exp.category) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
                          const freqLabel = FREQUENCY_OPTS.find(f => f.value === (exp.frequency || 'monthly'))?.label || 'Monthly';
                          return React.createElement(Card, { key: exp.id, style: { padding: '10px 14px', marginBottom: 6 } },
                            React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                              React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                                React.createElement('span', null, cat.icon),
                                React.createElement('div', null,
                                  React.createElement('div', { style: { fontSize: F.sm, color: T.text, fontWeight: 500 } }, exp.label),
                                  React.createElement('div', { style: { fontSize: F.xs, color: T.textMuted } }, freqLabel),
                                ),
                              ),
                              React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                                React.createElement('div', { style: { textAlign: 'right' } },
                                  React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.sm, color: T.accentDim } }, fmt(exp.amount)),
                                  exp.frequency && exp.frequency !== 'monthly' && React.createElement('div', { style: { fontSize: 10, color: T.textMuted } }, fmt(effectiveMonthlyCost(exp)) + '/mo'),
                                ),
                                React.createElement('button', { onClick: () => removeExpense(exp.id), style: { background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer', padding: 4 } }, '✕'),
                              ),
                            ),
                          );
                        }),
                      )
                    ),
                    noDue.length > 0 && React.createElement('div', null,
                      React.createElement('div', { style: { fontSize: F.xs, color: T.textMuted, marginBottom: 4, marginTop: 8 } }, 'No Due Date Set'),
                      ...noDue.map(exp => {
                        const cat = EXPENSE_CATEGORIES.find(c => c.value === exp.category) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
                        return React.createElement(Card, { key: exp.id, style: { padding: '10px 14px', marginBottom: 6, opacity: 0.75 } },
                          React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                              React.createElement('span', null, cat.icon),
                              React.createElement('div', { style: { fontSize: F.sm, color: T.text } }, exp.label),
                            ),
                            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                              React.createElement('span', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.sm, color: T.accentDim } }, fmt(exp.amount)),
                              React.createElement('button', { onClick: () => removeExpense(exp.id), style: { background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer', padding: 4 } }, '✕'),
                            ),
                          ),
                        );
                      }),
                    ),
                  );
                })()
              ),
            )
          // ── List View: grouped by category ────────────────────────────────
          : React.createElement('div', null,
              (() => {
                const grouped = {};
                lifestyle.expenses.forEach(exp => {
                  const cat = EXPENSE_CATEGORIES.find(c => c.value === exp.category);
                  const group = cat?.group || 'Other';
                  if (!grouped[group]) grouped[group] = [];
                  grouped[group].push({ exp, cat: cat || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1] });
                });
                return EXPENSE_GROUP_ORDER.filter(g => grouped[g]).map(group =>
                  React.createElement('div', { key: group, style: { marginBottom: 20 } },
                    React.createElement('div', { style: { fontSize: F.xs, color: T.accent, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600, marginBottom: 8 } }, group),
                    ...grouped[group].map(({ exp, cat }) => {
                      const freqLabel = FREQUENCY_OPTS.find(f => f.value === (exp.frequency || 'monthly'))?.label || 'Monthly';
                      const isVariable = exp.frequency && exp.frequency !== 'monthly';
                      return React.createElement(Card, { key: exp.id, style: { padding: '12px 16px', marginBottom: 8 } },
                        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                          React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
                            React.createElement('span', { style: { fontSize: 20 } }, cat.icon),
                            React.createElement('div', null,
                              React.createElement('div', { style: { fontSize: F.sm, color: T.text, fontWeight: 500 } }, exp.label),
                              React.createElement('div', { style: { fontSize: F.xs, color: T.textMuted } },
                                freqLabel + (exp.dueDay ? ` · Due day ${exp.dueDay}` : '')
                              ),
                            ),
                          ),
                          React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                            React.createElement('div', { style: { textAlign: 'right' } },
                              React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.md, color: T.accentDim } }, fmt(exp.amount)),
                              isVariable && React.createElement('div', { style: { fontSize: 10, color: T.textMuted } }, fmt(effectiveMonthlyCost(exp)) + '/mo avg'),
                            ),
                            React.createElement('button', { onClick: () => removeExpense(exp.id), style: { background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer', padding: 4 } }, '✕'),
                          ),
                        ),
                      );
                    }),
                  )
                );
              })()
            ),

      // Add Expense Modal
      showAddExpense && React.createElement('div', {
        className: 'modal-overlay',
        onClick: e => { if (e.target === e.currentTarget) setShowAddExpense(false); },
        style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: 20 }
      },
        React.createElement('div', { className: 'scale-in', style: { background: T.surface, borderRadius: 18, padding: 24, width: '100%', maxWidth: 420, maxHeight: '92vh', overflowY: 'auto' } },
          React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.lg, color: T.text, marginBottom: 20 } }, 'Add Expense'),

          React.createElement('div', { style: { marginBottom: 14 } },
            React.createElement(Lbl, null, 'Category'),
            React.createElement('select', {
              value: newExpense.category,
              onChange: e => setNewExpense(p => ({ ...p, category: e.target.value })),
              style: { ...iStyle, cursor: 'pointer' }
            },
              ...EXPENSE_CATEGORIES.map(c => React.createElement('option', { key: c.value, value: c.value }, c.icon + ' ' + c.label))
            ),
          ),

          React.createElement('div', { style: { marginBottom: 14 } },
            React.createElement(Lbl, null, 'Label'),
            React.createElement('input', { value: newExpense.label, onChange: e => setNewExpense(p => ({ ...p, label: e.target.value })), placeholder: 'e.g. Apartment Rent, Netflix', style: iStyle }),
          ),

          React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 } },
            React.createElement('div', null,
              React.createElement(Lbl, null, 'Amount ($)'),
              React.createElement('input', { type: 'number', value: newExpense.amount, onChange: e => setNewExpense(p => ({ ...p, amount: e.target.value })), placeholder: '0', style: iStyle }),
            ),
            React.createElement('div', null,
              React.createElement(Lbl, null, 'Due Day (1–31)'),
              React.createElement('input', { type: 'number', min: 1, max: 31, value: newExpense.dueDay, onChange: e => setNewExpense(p => ({ ...p, dueDay: e.target.value })), placeholder: 'e.g. 15', style: iStyle }),
            ),
          ),

          React.createElement('div', { style: { marginBottom: newExpense.frequency === 'custom' ? 10 : 20 } },
            React.createElement(Lbl, null, 'Billing Frequency'),
            React.createElement('select', {
              value: newExpense.frequency,
              onChange: e => setNewExpense(p => ({ ...p, frequency: e.target.value })),
              style: { ...iStyle, cursor: 'pointer' }
            },
              ...FREQUENCY_OPTS.map(f => React.createElement('option', { key: f.value, value: f.value }, f.label))
            ),
          ),

          // Custom frequency inputs
          newExpense.frequency === 'custom' && React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 } },
            React.createElement('div', null,
              React.createElement(Lbl, null, 'Every'),
              React.createElement('input', { type: 'number', min: 1, value: newExpense.frequencyEvery, onChange: e => setNewExpense(p => ({ ...p, frequencyEvery: e.target.value })), placeholder: '2', style: iStyle }),
            ),
            React.createElement('div', null,
              React.createElement(Lbl, null, 'Unit'),
              React.createElement('select', { value: newExpense.frequencyUnit, onChange: e => setNewExpense(p => ({ ...p, frequencyUnit: e.target.value })), style: { ...iStyle, cursor: 'pointer' } },
                React.createElement('option', { value: 'weeks' }, 'Weeks'),
                React.createElement('option', { value: 'months' }, 'Months'),
                React.createElement('option', { value: 'years' }, 'Years'),
              ),
            ),
          ),

          // Monthly equivalent preview for non-monthly
          newExpense.frequency && newExpense.frequency !== 'monthly' && newExpense.amount && React.createElement('div', { style: { padding: '8px 12px', background: T.accentGlow, borderRadius: 8, marginBottom: 14, display: 'flex', justifyContent: 'space-between' } },
            React.createElement('span', { style: { fontSize: F.xs, color: T.textMuted } }, 'Monthly equivalent'),
            React.createElement('span', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.sm, color: T.accent } }, fmt(effectiveMonthlyCost(newExpense))),
          ),

          React.createElement('div', { style: { display: 'flex', gap: 10 } },
            React.createElement(Btn, { onClick: () => setShowAddExpense(false), variant: 'ghost', style: { flex: 1 } }, 'Cancel'),
            React.createElement(Btn, { onClick: addExpense, style: { flex: 2 } }, 'Add Expense'),
          ),
        ),
      ),
    ),

    activeTab === 'profile' && React.createElement('div', null,
      React.createElement(Card, { style: { padding: '20px 22px', marginBottom: 16 } },
        React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.md, color: T.text, marginBottom: 16 } }, 'Personal Information'),
        
        React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 } },
          React.createElement('div', null,
            React.createElement(Lbl, null, 'Birth Month'),
            React.createElement('select', { value: lifestyle.birthMonth, onChange: e => updateField('birthMonth', e.target.value), style: { ...iStyle, cursor: 'pointer' } },
              React.createElement('option', { value: '' }, 'Select...'),
              ...['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => 
                React.createElement('option', { key: m, value: i + 1 }, m)
              )
            ),
          ),
          React.createElement('div', null,
            React.createElement(Lbl, null, 'Birth Year'),
            React.createElement('input', { type: 'number', value: lifestyle.birthYear, onChange: e => updateField('birthYear', e.target.value), placeholder: '1990', style: iStyle }),
          ),
        ),
        
        React.createElement('div', { style: { marginBottom: 14 } },
          React.createElement(Lbl, null, 'Filing Status'),
          React.createElement('select', { value: lifestyle.filingStatus, onChange: e => updateField('filingStatus', e.target.value), style: { ...iStyle, cursor: 'pointer' } },
            ...FILING_STATUSES.map(s => React.createElement('option', { key: s.value, value: s.value }, s.label))
          ),
        ),
        
        React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } },
          React.createElement('div', null,
            React.createElement(Lbl, null, 'State'),
            React.createElement('select', { value: lifestyle.state, onChange: e => updateField('state', e.target.value), style: { ...iStyle, cursor: 'pointer' } },
              React.createElement('option', { value: '' }, 'Select...'),
              ...US_STATES.map(s => React.createElement('option', { key: s, value: s }, s))
            ),
          ),
          React.createElement('div', null,
            React.createElement(Lbl, null, 'City'),
            React.createElement('input', { value: lifestyle.city, onChange: e => updateField('city', e.target.value), placeholder: 'Your city', style: iStyle }),
          ),
        ),
      ),

      React.createElement(Card, { style: { padding: '20px 22px' } },
        React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.md, color: T.text, marginBottom: 16 } }, 'Professional Information'),
        
        React.createElement('div', { style: { marginBottom: 14 } },
          React.createElement(Lbl, null, 'Profession'),
          React.createElement('input', { value: lifestyle.profession, onChange: e => updateField('profession', e.target.value), placeholder: 'e.g. Software Engineer, Nurse, Teacher', style: iStyle }),
        ),
        
        React.createElement('div', { style: { marginBottom: 14 } },
          React.createElement(Lbl, null, 'Job Title'),
          React.createElement('input', { value: lifestyle.jobTitle, onChange: e => updateField('jobTitle', e.target.value), placeholder: 'e.g. Senior Developer, RN, Math Teacher', style: iStyle }),
        ),
        
        lifestyle.incomeSources.some(i => i.source === 'business') && React.createElement('div', null,
          React.createElement(Lbl, null, 'Business Type'),
          React.createElement('input', { value: lifestyle.businessType, onChange: e => updateField('businessType', e.target.value), placeholder: 'e.g. E-commerce, Consulting, Restaurant', style: iStyle }),
        ),
      ),
    ),

    activeTab === 'insights' && React.createElement('div', null,
      // Tax Estimate Card
      annualIncome > 0 && React.createElement(Card, { style: { padding: '20px 22px', marginBottom: 16 } },
        React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.md, color: T.text, marginBottom: 12 } }, '📊 Tax Estimate'),
        React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 } },
          React.createElement('div', null,
            React.createElement('div', { style: { fontSize: F.xs, color: T.textMuted, marginBottom: 4 } }, 'Annual Income'),
            React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.md, color: T.text } }, fmt(annualIncome)),
          ),
          React.createElement('div', null,
            React.createElement('div', { style: { fontSize: F.xs, color: T.textMuted, marginBottom: 4 } }, 'Federal Bracket'),
            React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.md, color: T.accent } }, federalBracket + '%'),
          ),
        ),
        lifestyle.state && React.createElement('div', { style: { marginTop: 12, padding: '10px 12px', background: T.accentGlow, borderRadius: 10 } },
          React.createElement('div', { style: { fontSize: F.xs, color: T.textSub } },
            hasStateTax 
              ? `${lifestyle.state} has state income tax. Consider this in your planning.`
              : `${lifestyle.state} has no state income tax — great for take-home pay!`
          ),
        ),
        age && React.createElement('div', { style: { marginTop: 12, fontSize: F.xs, color: T.textMuted } },
          `Age ${age} • ${65 - age > 0 ? (65 - age) + ' years to traditional retirement' : 'At or past retirement age'}`
        ),
      ),

      // Single Income Warning + Side Hustles
      lifestyle.incomeSources.length === 1 && React.createElement(Card, { style: { padding: '20px 22px', marginBottom: 16, border: `1px solid ${T.accent}44` } },
        React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.md, color: T.accent, marginBottom: 10 } }, '💡 Diversify Your Income'),
        React.createElement('div', { style: { fontSize: F.sm, color: T.textSub, marginBottom: 14, lineHeight: 1.6 } },
          "You currently have one income source. Building multiple streams of income provides financial security and accelerates wealth building."
        ),
        lifestyle.profession && React.createElement('div', null,
          React.createElement('div', { style: { fontSize: F.xs, color: T.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 } }, 
            'Ideas for ' + (lifestyle.profession || 'your field')
          ),
          ...getSideHustleIdeas().map((idea, i) => 
            React.createElement('div', { key: i, style: { padding: '8px 0', borderBottom: i < 3 ? `1px solid ${T.border}` : 'none', fontSize: F.sm, color: T.text } }, 
              '→ ' + idea
            )
          ),
        ),
        !lifestyle.profession && React.createElement('div', { style: { fontSize: F.sm, color: T.textMuted, fontStyle: 'italic' } },
          'Add your profession in the Profile tab to get personalized side hustle ideas.'
        ),
      ),

      // Business Owner Insights
      lifestyle.incomeSources.some(i => i.source === 'business') && React.createElement(Card, { style: { padding: '20px 22px', marginBottom: 16 } },
        React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.md, color: T.text, marginBottom: 12 } }, '🏢 Business Owner Insights'),
        React.createElement('div', { style: { fontSize: F.sm, color: T.textSub, lineHeight: 1.6, marginBottom: 12 } },
          lifestyle.businessType 
            ? `As a ${lifestyle.businessType} owner, focus on tracking your profit margins, not just revenue. Consider separating business and personal expenses for cleaner books.`
            : 'Add your business type in the Profile tab for personalized benchmarks.'
        ),
        React.createElement('div', { style: { padding: '12px 14px', background: T.accentGlow, borderRadius: 10 } },
          React.createElement('div', { style: { fontSize: F.sm, color: T.text, fontWeight: 500, marginBottom: 6 } }, 'Growth Tips'),
          React.createElement('div', { style: { fontSize: F.xs, color: T.textSub, lineHeight: 1.6 } },
            '• Review pricing quarterly — most small businesses undercharge\n• Track customer acquisition cost vs lifetime value\n• Consider 1:1 coaching if below industry benchmarks'
          ),
        ),
      ),

      // Savings Rate Card
      totalMonthlyIncome > 0 && React.createElement(Card, { style: { padding: '20px 22px' } },
        React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.md, color: T.text, marginBottom: 12 } }, '💰 Savings Analysis'),
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 } },
          React.createElement('div', { style: { width: 60, height: 60, borderRadius: '50%', border: `3px solid ${monthlyNet >= 0 ? T.accent : T.accentDim}`, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
            React.createElement('span', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.md, color: monthlyNet >= 0 ? T.accent : T.accentDim } },
              Math.round((monthlyNet / totalMonthlyIncome) * 100) + '%'
            ),
          ),
          React.createElement('div', null,
            React.createElement('div', { style: { fontSize: F.sm, color: T.text, marginBottom: 4 } }, 'Monthly Savings Rate'),
            React.createElement('div', { style: { fontSize: F.xs, color: T.textMuted } },
              monthlyNet >= totalMonthlyIncome * 0.2 
                ? 'Excellent! You\'re saving 20%+ — wealth building mode.'
                : monthlyNet >= totalMonthlyIncome * 0.1
                  ? 'Good progress. Aim for 20% to accelerate growth.'
                  : monthlyNet > 0
                    ? 'Room to grow. Review expenses for savings opportunities.'
                    : 'Spending exceeds income. Review expenses urgently.'
            ),
          ),
        ),
      ),

      totalMonthlyIncome === 0 && React.createElement('div', { style: { textAlign: 'center', padding: '40px 20px', color: T.textMuted } },
        React.createElement('div', { style: { fontSize: 32, marginBottom: 12 } }, '💡'),
        React.createElement('div', { style: { fontSize: F.sm } }, 'Add income and expenses to see insights'),
      ),
    ),
  );
};
