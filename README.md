# 🌳 Wealth Score PWA

## Deploy Options

### Option 1 — Netlify (Easiest, Free)
1. Go to https://app.netlify.com
2. Drag & drop this entire folder onto the Netlify dashboard
3. Done. You'll get a URL like https://wealth-score-xxx.netlify.app
4. Open that URL in Chrome → "Install" prompt → Install to desktop

### Option 2 — Vercel (Also Free)
1. Install Vercel CLI: npm i -g vercel
2. Run: vercel --prod
3. Follow prompts

### Option 3 — Local (No Internet Needed)
Run a local server:
  npx serve .         (Node)
  python -m http.server 8080   (Python)
Then open: http://localhost:8080

## Features
- 📵 Fully offline after first load (Service Worker)
- 🔒 PIN lock with 10-min auto-lock
- 📊 Wealth Score (0–100) with 5 factors
- 💬 Smart offline chatbot + optional Claude API chatbot
- 🏦 Goals, strategies, accounts, projections
- 🔮 Freedom Score + 3 life scenario quiz
- 📑 PDF report export
- 💾 Backup & restore (.wealthscore files)
- ☀️ Live weather (when online)
- 🖼️ Nature banner photos (cached offline)

## Data Storage
All data lives in your browser's IndexedDB.
It never leaves your device unless you manually export a backup.

## PWA Install
Open in Chrome → look for the install icon in the address bar
Or: click the "Install Wealth Score" banner that appears at the bottom.
