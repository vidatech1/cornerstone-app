// src/theme.js — Cornerstone Theme Tokens & Context
window.AppCtx = React.createContext({});

// App Metadata
window.APP_NAME = 'Cornerstone';
window.APP_TAGLINE = 'Build wealth that lasts';

// Tier System
window.TIERS = [
  { min: 0,  max: 25,  name: 'Foundation', desc: 'Laying the groundwork' },
  { min: 26, max: 50,  name: 'Framework',  desc: 'Structure taking shape' },
  { min: 51, max: 70,  name: 'Legacy',     desc: 'Building something lasting' },
  { min: 71, max: 85,  name: 'Monument',   desc: 'Built to last' },
  { min: 86, max: 100, name: 'Cornerstone', desc: 'You have become the foundation others build on' },
];

window.getTier = (score) => {
  for (const tier of window.TIERS) {
    if (score >= tier.min && score <= tier.max) return tier;
  }
  return window.TIERS[0];
};

// Mediterranean Night Theme (Luxury 2-color: Navy + Amber)
window.DARK = {
  mode: 'dark',
  // Backgrounds
  bg: '#080d14',           // Midnight
  surface: '#121c2b',      // Navy
  surfaceAlt: '#1a2a3d',   // Navy Light
  surfaceHover: '#1e3148',
  navBg: '#0a1018',
  modalBg: '#0e1825',
  inputBg: '#121c2b',
  
  // Borders
  border: 'rgba(212,148,58,0.10)',
  borderLight: 'rgba(240,232,220,0.06)',
  borderHover: 'rgba(212,148,58,0.25)',
  inputBorder: 'rgba(212,148,58,0.12)',
  
  // Primary Amber Accent
  accent: '#d4943a',       // Amber
  accentBright: '#e8a84a', // Amber Bright (positive)
  accentDim: '#8a6830',    // Amber Dim (negative/debt)
  accentGlow: 'rgba(212,148,58,0.12)',
  accentGlowStrong: 'rgba(212,148,58,0.20)',
  
  // Text (Marble tones)
  text: '#f0e8dc',         // Marble
  textSub: '#c4b8a4',      // Marble Soft
  textMuted: '#5a6a7a',    // Slate
  
  // Semantic (All amber-based for luxury simplicity)
  positive: '#e8a84a',     // Amber Bright
  negative: '#8a6830',     // Amber Dim
  warning: '#c4943a',
  
  // Legacy compatibility
  cyan: '#d4943a',
  cyanDim: 'rgba(212,148,58,0.12)',
  
  // Gradients
  heroGrad: 'linear-gradient(160deg, #080d14cc, #121c2b88)',
  amberGrad: 'linear-gradient(90deg, #8a6830, #e8a84a)',
  torchGlow: 'radial-gradient(circle, rgba(212,148,58,0.06) 0%, transparent 60%)',
};

// Light Theme (keeping for compatibility but making it warm)
window.LIGHT = {
  mode: 'light',
  bg: '#f8f5f0',
  surface: '#ffffff',
  surfaceAlt: '#faf8f5',
  surfaceHover: '#f5f2ed',
  border: '#e8e0d4',
  borderLight: '#f0ebe4',
  borderHover: '#d4943a55',
  navBg: '#121c2b',
  text: '#1a1814',
  textSub: '#4a4540',
  textMuted: '#8a8478',
  accent: '#c4863a',
  accentBright: '#d4943a',
  accentDim: '#a07830',
  accentGlow: 'rgba(196,134,58,0.12)',
  accentGlowStrong: 'rgba(196,134,58,0.20)',
  positive: '#5a9a6a',
  negative: '#a05a5a',
  warning: '#c4863a',
  cyan: '#c4863a',
  cyanDim: 'rgba(196,134,58,0.12)',
  inputBg: '#faf8f5',
  inputBorder: '#e8e0d4',
  modalBg: '#ffffff',
  heroGrad: 'linear-gradient(160deg, #121c2b99, #1a2a3d88)',
  amberGrad: 'linear-gradient(90deg, #a07830, #d4943a)',
  torchGlow: 'radial-gradient(circle, rgba(196,134,58,0.08) 0%, transparent 60%)',
};

window.FONT_SCALES = {
  small:  { xs: 10, sm: 12, base: 13, md: 15, lg: 18, xl: 22, hero: 30, lbl: 9 },
  medium: { xs: 11, sm: 13, base: 15, md: 17, lg: 20, xl: 26, hero: 36, lbl: 10 },
  large:  { xs: 13, sm: 15, base: 17, md: 19, lg: 23, xl: 30, hero: 42, lbl: 12 },
};

// Global font size preference
window.FontSizePreference = localStorage.getItem('cornerstone_fontsize') || 'medium';

// Function to update font size globally
window.updateFontSize = (size) => {
  window.FontSizePreference = size;
  localStorage.setItem('cornerstone_fontsize', size);
  window.dispatchEvent(new CustomEvent('fontSizeChanged', { detail: size }));
};

// Mountain/Nature backgrounds for hero sections
window.NATURE_PHOTOS = [
  { id: 1, url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80', label: 'Alpine Peaks' },
  { id: 2, url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80', label: 'Mountain Range' },
  { id: 3, url: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=1200&q=80', label: 'Summit View' },
  { id: 4, url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1200&q=80', label: 'Misty Peaks' },
  { id: 5, url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&q=80', label: 'Starlit Mountains' },
  { id: 6, url: 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=1200&q=80', label: 'Golden Summit' },
];

// Wisdom Quotes (Mix of Ancient Proverbs and Modern Wisdom)
window.QUOTES = [
  { 
    source: 'Ancient Proverb', 
    text: 'The wise store up choice food and olive oil, but fools gulp theirs down.', 
    theme: 'Save before you spend — every paycheck.' 
  },
  { 
    source: 'Warren Buffett', 
    text: 'Do not save what is left after spending, but spend what is left after saving.', 
    theme: 'Automate savings first, live on the rest.' 
  },
  { 
    source: 'Tony Robbins', 
    text: "It's not about the money — it's about having the freedom to make choices.", 
    theme: 'Each debt paid is a vote for your future freedom.' 
  },
  { 
    source: 'Ancient Proverb', 
    text: 'The borrower is slave to the lender.', 
    theme: 'Every high-interest debt is a chain. Break free one at a time.' 
  },
  { 
    source: 'Warren Buffett', 
    text: "Someone's sitting in the shade today because someone planted a tree long ago.", 
    theme: 'Your investments today are shade for your future self.' 
  },
  { 
    source: 'Ancient Proverb', 
    text: 'Count the cost before you build the tower.', 
    theme: 'This tracker is your tower plan. Keep building it.' 
  },
];

// Three Futures (Journey Page)
window.THREE_FUTURES = [
  {
    id: 'builder',
    name: 'The Builder',
    emoji: '🏛️',
    range: '80 – 100',
    minScore: 80,
    headline: 'Wealth compounds. Legacy takes shape.',
    summary: 'At 65, you retire on your terms — not because you have to. Your investments generate passive income. Debt is a distant memory.',
    details: [
      'Emergency fund covers 12+ months',
      'Investments compound at 7-10% annually',
      'You give generously without fear',
      'Your children inherit knowledge, not just money',
    ],
    callout: 'Keep building. You\'re on the path.',
    level: 'best',
  },
  {
    id: 'balancer',
    name: 'The Balancer',
    emoji: '⚖️',
    range: '45 – 79',
    minScore: 45,
    headline: 'Stable, but vulnerable to storms.',
    summary: 'At 65, you have savings but wonder if it\'s enough. A major expense could set you back years.',
    details: [
      'Emergency fund covers 3-6 months',
      'Some debt lingers into your 60s',
      'Retirement depends on external factors',
    ],
    callout: 'This is where most people land. Cornerstone shows you how to rise above.',
    level: 'mid',
  },
  {
    id: 'drifter',
    name: 'The Drifter',
    emoji: '🌊',
    range: '0 – 44',
    minScore: 0,
    headline: 'Working because you have to.',
    summary: 'At 65, retirement isn\'t an option. Debt has compounded. Every month is a scramble.',
    details: [
      'No emergency fund — every expense is a crisis',
      'Debt grows faster than income',
      'You work into your 70s out of necessity',
    ],
    callout: '40% of Americans are on this path. Your decisions today determine which future you meet.',
    level: 'low',
  },
];

window.getCurrentFuture = (score) => {
  for (const future of window.THREE_FUTURES) {
    if (score >= future.minScore) return future;
  }
  return window.THREE_FUTURES[2];
};

// Asset Type Colors (All amber-based for luxury)
window.TYPE_META = {
  cash:     { label: 'Cash',     color: '#a07830', bg: 'rgba(160,120,48,0.12)' },
  equities: { label: 'Equities', color: '#e8a84a', bg: 'rgba(232,168,74,0.12)' },
  crypto:   { label: 'Crypto',   color: '#d4943a', bg: 'rgba(212,148,58,0.12)' },
  metals:   { label: 'Metals',   color: '#6a5840', bg: 'rgba(106,88,64,0.12)' },
  property: { label: 'Property', color: '#7a9a6a', bg: 'rgba(122,154,106,0.12)' },
  debt:     { label: 'Debt',     color: '#8a6830', bg: 'rgba(138,104,48,0.12)' },
};

// Chart colors (amber gradient for donuts/pies)
window.CHART_COLORS = ['#e8a84a', '#d4943a', '#a07830', '#6a5840', '#4a3820'];

window.SUBTYPE_MAP = {
  cash:     { checking: 'Checking', savings: 'Savings' },
  equities: { retirement: 'Retirement', brokerage: 'Brokerage', education: 'Education (529)' },
  crypto:   { wallet: 'Wallet', exchange: 'Exchange' },
  metals:   { physical: 'Physical', digital: 'Digital' },
  property: { realestate: 'Real Estate', vehicle: 'Vehicle', collection: 'Collection / Other' },
  debt:     { credit: 'Credit Card', loan: 'Personal Loan', mortgage: 'Mortgage', utility: 'Utility Bill', other: 'Other' },
};

window.OCCUPATION_OPTS = [
  'Employed full-time', 'Self-employed / Business owner', 'Part-time / Gig work',
  'Retired', 'Student', 'Caregiver / Stay-at-home', 'Between jobs', 'Other',
];

window.LIFE_QUESTIONS = [
  { id: 'q1', text: 'How do you currently handle your monthly budget?', opts: ['I track every dollar carefully', 'I have a rough idea', 'I spend as I go', "I don't really think about it"] },
  { id: 'q2', text: 'How much of your income do you save or invest each month?', opts: ['More than 20%', '10–20%', 'Less than 10%', 'Nothing right now'] },
  { id: 'q3', text: 'How would you describe your relationship with debt?', opts: ['Debt-free or nearly there', 'Manageable, paying it down', "It's a struggle each month", 'Debt is growing faster than I can pay'] },
  { id: 'q4', text: 'What is your primary financial goal right now?', opts: ['Build wealth and retire early', 'Achieve financial stability', 'Pay off debt', 'Just survive month to month'] },
  { id: 'q5', text: 'How often do you think about retirement savings?', opts: ['Actively contributing and planning', 'Occasionally, but not consistently', 'Rarely', "Never — it feels too far away"] },
  { id: 'q6', text: 'If you lost your job today, how long could you live on your savings?', opts: ['6+ months easily', '1–3 months', 'A few weeks', 'Less than a week'] },
  { id: 'q7', text: 'How do you feel when an unexpected expense comes up?', opts: ['Confident — I have an emergency fund', 'A little stressed but manageable', 'Very stressed — it disrupts everything', 'It feels like a crisis'] },
  { id: 'q8', text: 'What best describes your investment approach?', opts: ['Diversified, long-term strategy', 'Some investments but not planned', 'A few random investments', "I don't invest at all"] },
];

// Sound Effects System
window.SoundEnabled = localStorage.getItem('cornerstone_sound') !== 'false';
window.SoundVolume = parseFloat(localStorage.getItem('cornerstone_volume') || '0.5');
window.SoundPack = localStorage.getItem('cornerstone_soundpack') || 'soft';
window.AudioCtx = null;

// Sound configurations for different packs - Facebook-like subtle sounds
const SOUND_PACKS = {
  soft: {
    click: { freq: 600, decay: 0.06, type: 'sine' },
    select: { freq: 800, decay: 0.08, type: 'sine' },
    success: { freq: [523, 659, 784], decay: 0.1, type: 'sine' }, // C-E-G chord
    toggle: { freq: 500, decay: 0.05, type: 'sine' },
  },
  crisp: {
    click: { freq: 1200, decay: 0.04, type: 'square' },
    select: { freq: 1400, decay: 0.05, type: 'square' },
    success: { freq: [880, 1109, 1319], decay: 0.08, type: 'triangle' },
    toggle: { freq: 1000, decay: 0.03, type: 'square' },
  },
  warm: {
    click: { freq: 400, decay: 0.08, type: 'triangle' },
    select: { freq: 500, decay: 0.1, type: 'triangle' },
    success: { freq: [349, 440, 523], decay: 0.12, type: 'sine' },
    toggle: { freq: 350, decay: 0.06, type: 'triangle' },
  },
};

// Initialize audio context lazily
const getAudioContext = () => {
  if (!window.AudioCtx) {
    window.AudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return window.AudioCtx;
};

// Play a single tone
const playTone = (freq, duration, type = 'sine', volume = 0.15) => {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = type;
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  const vol = volume * window.SoundVolume;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
};

// Play a chord (multiple frequencies)
const playChord = (freqs, duration, type = 'sine', volume = 0.08) => {
  freqs.forEach((freq, i) => {
    setTimeout(() => playTone(freq, duration, type, volume), i * 30);
  });
};

// Main click sound - subtle and satisfying
window.playClick = () => {
  if (!window.SoundEnabled) return;
  try {
    const pack = SOUND_PACKS[window.SoundPack] || SOUND_PACKS.soft;
    const sound = pack.click;
    playTone(sound.freq, sound.decay, sound.type, 0.12);
  } catch (e) { /* Audio not available */ }
};

// Select/toggle sound
window.playSelect = () => {
  if (!window.SoundEnabled) return;
  try {
    const pack = SOUND_PACKS[window.SoundPack] || SOUND_PACKS.soft;
    const sound = pack.select;
    playTone(sound.freq, sound.decay, sound.type, 0.1);
  } catch (e) {}
};

// Success sound (for saves, completions)
window.playSuccess = () => {
  if (!window.SoundEnabled) return;
  try {
    const pack = SOUND_PACKS[window.SoundPack] || SOUND_PACKS.soft;
    const sound = pack.success;
    if (Array.isArray(sound.freq)) {
      playChord(sound.freq, sound.decay, sound.type, 0.08);
    } else {
      playTone(sound.freq, sound.decay, sound.type, 0.1);
    }
  } catch (e) {}
};

// Toggle sound
window.playToggle = () => {
  if (!window.SoundEnabled) return;
  try {
    const pack = SOUND_PACKS[window.SoundPack] || SOUND_PACKS.soft;
    const sound = pack.toggle;
    playTone(sound.freq, sound.decay, sound.type, 0.1);
  } catch (e) {}
};
