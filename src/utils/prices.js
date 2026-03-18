// src/utils/prices.js — Live price fetching engine
// Sources: Yahoo Finance (stocks/ETFs), CoinGecko (crypto), metals-api (gold/silver/platinum)
// All calls are cached in memory for the session to avoid hammering free APIs

window.PriceEngine = (function () {

  // ── In-memory cache (clears on page reload) ────────────────────────────────
  const _cache = {};
  const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  function cached(key, value) {
    _cache[key] = { value, ts: Date.now() };
  }
  function fromCache(key) {
    const hit = _cache[key];
    if (!hit) return null;
    if (Date.now() - hit.ts > CACHE_TTL) return null;
    return hit.value;
  }

  // ── CoinGecko ID map for common symbols ────────────────────────────────────
  // CoinGecko uses slugs not ticker symbols — we maintain a map for common coins
  // Unknown coins fall back to a search call
  const GECKO_IDS = {
    BTC: 'bitcoin', ETH: 'ethereum', BNB: 'binancecoin', SOL: 'solana',
    XRP: 'ripple', ADA: 'cardano', AVAX: 'avalanche-2', DOT: 'polkadot',
    DOGE: 'dogecoin', MATIC: 'matic-network', LINK: 'chainlink', LTC: 'litecoin',
    ATOM: 'cosmos', UNI: 'uniswap', SHIB: 'shiba-inu', TRX: 'tron',
    NEAR: 'near', ICP: 'internet-computer', FIL: 'filecoin', VET: 'vechain',
    ALGO: 'algorand', XLM: 'stellar', HBAR: 'hedera-hashgraph', EGLD: 'elrond-erd-2',
    EOS: 'eos', AAVE: 'aave', GRT: 'the-graph', MKR: 'maker', COMP: 'compound-governance-token',
    SAND: 'the-sandbox', MANA: 'decentraland', AXS: 'axie-infinity',
    CRO: 'crypto-com-chain', FTM: 'fantom', ONE: 'harmony',
    STRC: 'starcom', // may need updating
    USDT: 'tether', USDC: 'usd-coin', DAI: 'dai', BUSD: 'binance-usd',
  };

  // ── Metal slugs for metals-api compatible endpoints ────────────────────────
  // Using Frankfurt/open metals — no key for basic XAU, XAG, XPT
  const METAL_SYMBOLS = { gold: 'XAU', silver: 'XAG', platinum: 'XPT', palladium: 'XPD' };

  // ── Stock / ETF price via Yahoo Finance (free, no key) ─────────────────────
  // Routed through allorigins CORS proxy
  async function fetchStockPrice(ticker) {
    const cacheKey = `stock_${ticker}`;
    const hit = fromCache(cacheKey);
    if (hit !== null) return hit;

    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
      const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxy, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta) throw new Error('No meta in response');
      const price = meta.regularMarketPrice || meta.previousClose;
      const prevClose = meta.previousClose || meta.chartPreviousClose;
      const change = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;
      // If price is null/zero, this may be a mutual fund — fall through to quoteSummary
      if (!price) throw new Error('No price in chart response');
      const result = { price, change, currency: meta.currency || 'USD', source: 'yahoo' };
      cached(cacheKey, result);
      return result;
    } catch (err) {
      console.warn(`[PriceEngine] Chart fetch failed for ${ticker}, trying quoteSummary:`, err.message);
      // ── Mutual fund fallback: quoteSummary/price module ──────────────────
      // Handles tickers like SBLGX, FXAIX, VTSAX that the chart endpoint drops
      try {
        const url2 = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=price`;
        const proxy2 = `https://api.allorigins.win/raw?url=${encodeURIComponent(url2)}`;
        const res2 = await fetch(proxy2, { signal: AbortSignal.timeout(8000) });
        if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
        const data2 = await res2.json();
        const pm = data2?.quoteSummary?.result?.[0]?.price;
        if (!pm) throw new Error('No price module in quoteSummary');
        const price2 = pm.regularMarketPrice?.raw ?? pm.postMarketPrice?.raw ?? null;
        if (!price2) throw new Error('price module has no regularMarketPrice');
        const changePct = pm.regularMarketChangePercent?.raw
          ? pm.regularMarketChangePercent.raw * 100
          : 0;
        const result2 = {
          price: price2,
          change: changePct,
          currency: pm.currency || 'USD',
          source: 'yahoo',
          name: pm.longName || pm.shortName || ticker,
          quoteType: pm.quoteType || 'MUTUALFUND',
        };
        const cacheKey = `stock_${ticker}`;
        cached(cacheKey, result2);
        return result2;
      } catch (err2) {
        console.warn(`[PriceEngine] quoteSummary also failed for ${ticker}:`, err2.message);
        return null;
      }
    }
  }

  // ── Ticker autocomplete search via Yahoo Finance ───────────────────────────
  // Returns up to 8 suggestions: { symbol, shortname, exchDisp, typeDisp }
  // Used by AccountModal for live autocomplete as user types
  async function searchTickers(query) {
    if (!query || query.length < 1) return [];
    const cacheKey = `search_${query.toUpperCase()}`;
    const hit = fromCache(cacheKey);
    if (hit !== null) return hit;

    try {
      const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0&listsCount=0`;
      const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxy, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const quotes = (data?.finance?.result?.[0]?.documents || data?.quotes || [])
        .filter(q => q.symbol && (q.quoteType === 'EQUITY' || q.quoteType === 'ETF' || q.quoteType === 'MUTUALFUND'))
        .slice(0, 8)
        .map(q => ({
          symbol: q.symbol,
          name: q.shortname || q.longname || q.symbol,
          exchange: q.exchDisp || q.exchange || '',
          type: q.quoteType || 'EQUITY',
        }));
      cached(cacheKey, quotes);
      return quotes;
    } catch (err) {
      console.warn(`[PriceEngine] Ticker search failed for "${query}":`, err.message);
      return [];
    }
  }

  // ── Historical performance data for a ticker ──────────────────────────────
  // Returns { ticker, name, currency, annualReturns, summary } for display in modal
  // range: '1y' | '5y' | '10y' — defaults to '10y'
  async function fetchTickerHistory(ticker, range = '10y') {
    const cacheKey = `history_${ticker}_${range}`;
    const hit = fromCache(cacheKey);
    if (hit !== null) return hit;

    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1mo&range=${range}`;
      const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxy, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const result = data?.chart?.result?.[0];
      if (!result) throw new Error('No chart result');

      const meta = result.meta;
      const timestamps = result.timestamp || [];
      const closes = result.indicators?.adjclose?.[0]?.adjclose || result.indicators?.quote?.[0]?.close || [];

      // Build annual return data points from monthly closes
      const yearMap = {};
      timestamps.forEach((ts, i) => {
        const yr = new Date(ts * 1000).getFullYear();
        const price = closes[i];
        if (!price) return;
        if (!yearMap[yr]) yearMap[yr] = { open: price, close: price };
        yearMap[yr].close = price;
      });

      const years = Object.keys(yearMap).sort();
      const annualReturns = [];
      for (let i = 1; i < years.length; i++) {
        const prev = yearMap[years[i - 1]].close;
        const curr = yearMap[years[i]].close;
        if (prev && curr) {
          annualReturns.push({
            year: parseInt(years[i]),
            returnPct: ((curr - prev) / prev) * 100,
          });
        }
      }

      // Summary stats
      const firstClose = closes.find(c => c != null);
      const lastClose = [...closes].reverse().find(c => c != null);
      const totalReturn = firstClose && lastClose ? ((lastClose - firstClose) / firstClose) * 100 : null;
      const avgAnnual = annualReturns.length
        ? annualReturns.reduce((s, r) => s + r.returnPct, 0) / annualReturns.length
        : null;
      const positiveYears = annualReturns.filter(r => r.returnPct > 0).length;

      const histResult = {
        ticker,
        name: meta.longName || meta.shortName || ticker,
        currency: meta.currency || 'USD',
        currentPrice: meta.regularMarketPrice || lastClose,
        range,
        annualReturns,
        totalReturnPct: totalReturn,
        avgAnnualReturnPct: avgAnnual,
        positiveYears,
        totalYears: annualReturns.length,
        firstDate: timestamps[0] ? new Date(timestamps[0] * 1000).getFullYear() : null,
      };

      cached(cacheKey, histResult);
      return histResult;
    } catch (err) {
      console.warn(`[PriceEngine] History fetch failed for ${ticker}:`, err.message);
      return null;
    }
  }

  // ── Crypto price via CoinGecko public API (no key, 30 req/min) ─────────────
  async function _resolveGeckoId(symbol) {
    const upper = symbol.toUpperCase();
    if (GECKO_IDS[upper]) return GECKO_IDS[upper];
    // Fallback: search CoinGecko by symbol
    try {
      const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${symbol}`, { signal: AbortSignal.timeout(6000) });
      const data = await res.json();
      const coin = data?.coins?.find(c => c.symbol.toUpperCase() === upper);
      if (coin) { GECKO_IDS[upper] = coin.id; return coin.id; }
    } catch { /* fall through */ }
    return symbol.toLowerCase(); // last resort: try lowercase symbol as ID
  }

  async function fetchCryptoPrices(symbols) {
    // Batch fetch all symbols at once to be efficient with rate limits
    if (!symbols.length) return {};
    const cacheKey = `crypto_${symbols.sort().join(',')}`;
    const hit = fromCache(cacheKey);
    if (hit !== null) return hit;

    try {
      // Resolve all symbols to CoinGecko IDs
      const idMap = {}; // geckoId → original symbol
      for (const sym of symbols) {
        const id = await _resolveGeckoId(sym);
        idMap[id] = sym.toUpperCase();
      }
      const ids = Object.keys(idMap).join(',');
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Remap to symbol → { price, change }
      const result = {};
      for (const [geckoId, sym] of Object.entries(idMap)) {
        const entry = data[geckoId];
        if (entry) result[sym] = { price: entry.usd, change: entry.usd_24h_change || 0, source: 'coingecko' };
      }
      cached(cacheKey, result);
      return result;
    } catch (err) {
      console.warn('[PriceEngine] Crypto batch fetch failed:', err.message);
      return {};
    }
  }

  // ── Metals spot price (USD per troy oz) ────────────────────────────────────
  // Uses the open.er-api.com / frankfurter approach for metal commodity codes
  // Gold (XAU), Silver (XAG), Platinum (XPT) vs USD
  async function fetchMetalPrices() {
    const cacheKey = 'metals_all';
    const hit = fromCache(cacheKey);
    if (hit !== null) return hit;

    try {
      // metals-api free tier or fallback to exchangerate data
      // Using metals.live public endpoint (no key, daily updates)
      const res = await fetch('https://api.metals.live/v1/spot', { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Response is array of { metal: 'gold', price: 2345.67 }
      const result = {};
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item.gold)     result.gold     = { price: item.gold,     change: 0, unit: 'oz', source: 'metals.live' };
          if (item.silver)   result.silver   = { price: item.silver,   change: 0, unit: 'oz', source: 'metals.live' };
          if (item.platinum) result.platinum = { price: item.platinum, change: 0, unit: 'oz', source: 'metals.live' };
          if (item.palladium)result.palladium= { price: item.palladium,change: 0, unit: 'oz', source: 'metals.live' };
        }
      }
      // Sometimes the response format is { gold: 2345, silver: 29.5, ... }
      for (const [key, val] of Object.entries(data)) {
        if (typeof val === 'number') result[key] = { price: val, change: 0, unit: 'oz', source: 'metals.live' };
      }
      if (Object.keys(result).length > 0) {
        cached(cacheKey, result);
        return result;
      }
      throw new Error('Empty metals response');
    } catch (err) {
      console.warn('[PriceEngine] Metals API failed, trying fallback:', err.message);
      // Fallback: reasonable static estimates (updated periodically in code)
      // These are approximate and clearly labeled as estimates
      const fallback = {
        gold:     { price: 3150, change: 0, unit: 'oz', source: 'estimate' },
        silver:   { price: 34,   change: 0, unit: 'oz', source: 'estimate' },
        platinum: { price: 980,  change: 0, unit: 'oz', source: 'estimate' },
        palladium:{ price: 1050, change: 0, unit: 'oz', source: 'estimate' },
      };
      cached(cacheKey, fallback);
      return fallback;
    }
  }

  // ── Main entry point: compute live values for all accounts ─────────────────
  // Returns a map of { accountId: { totalValue, positions: [{ ...pos, livePrice, liveValue, change }] } }
  async function refreshAccountValues(accounts) {
    const results = {};

    // Collect all symbols to batch fetch
    const stockTickers = new Set();
    const cryptoSymbols = new Set();
    let needMetals = false;

    for (const acct of accounts) {
      if (acct.type === 'equities') {
        for (const p of (acct.positions || [])) stockTickers.add(p.ticker.toUpperCase());
      } else if (acct.type === 'crypto') {
        for (const p of (acct.positions || [])) cryptoSymbols.add(p.ticker.toUpperCase());
      } else if (acct.type === 'metals') {
        needMetals = true;
      }
    }

    // Parallel fetch all needed price types
    const [stockPrices, cryptoPrices, metalPrices] = await Promise.all([
      stockTickers.size  ? Promise.all([...stockTickers].map(t => fetchStockPrice(t).then(r => [t, r]))) : Promise.resolve([]),
      cryptoSymbols.size ? fetchCryptoPrices([...cryptoSymbols]) : Promise.resolve({}),
      needMetals         ? fetchMetalPrices() : Promise.resolve({}),
    ]);

    // Build stock price map
    const stockMap = {};
    for (const [ticker, data] of stockPrices) { if (data) stockMap[ticker] = data; }

    // Now compute per-account enriched positions
    for (const acct of accounts) {
      if (acct.type === 'equities') {
        const enriched = (acct.positions || []).map(p => {
          const priceData = stockMap[p.ticker.toUpperCase()];
          if (!priceData) return { ...p, livePrice: null, liveValue: null, change: null };
          return {
            ...p,
            livePrice: priceData.price,
            liveValue: priceData.price * (p.shares || 0),
            change: priceData.change,
            source: priceData.source,
          };
        });
        const totalLive = enriched.reduce((s, p) => s + (p.liveValue || 0), 0);
        results[acct.id] = { positions: enriched, totalValue: totalLive || acct.amount };

      } else if (acct.type === 'crypto') {
        const enriched = (acct.positions || []).map(p => {
          const priceData = cryptoPrices[p.ticker.toUpperCase()];
          if (!priceData) return { ...p, livePrice: null, liveValue: null, change: null };
          return {
            ...p,
            livePrice: priceData.price,
            liveValue: priceData.price * (p.qty || p.shares || 0),
            change: priceData.change,
            source: priceData.source,
          };
        });
        const totalLive = enriched.reduce((s, p) => s + (p.liveValue || 0), 0);
        results[acct.id] = { positions: enriched, totalValue: totalLive || acct.amount };

      } else if (acct.type === 'metals') {
        const enriched = (acct.positions || []).map(p => {
          const metal = (p.metal || p.ticker || '').toLowerCase();
          // Handle goldbacks/silverbacks — calculate melt value based on gold/silver content
          let spotKey = metal;
          let contentOz = p.oz || p.qty || p.shares || 0;
          let premiumNote = null;
          if (metal === 'goldback') {
            // 1 goldback = 1/1000 troy oz of gold
            spotKey = 'gold';
            contentOz = (p.qty || p.count || 0) / 1000;
            premiumNote = 'Melt value only — goldbacks carry a significant collector premium';
          } else if (metal === 'silverback') {
            spotKey = 'silver';
            contentOz = (p.qty || p.count || 0) * 0.999; // 1 troy oz silver each
            premiumNote = 'Melt value — silverbacks carry a collector premium';
          }
          const priceData = metalPrices[spotKey];
          if (!priceData) return { ...p, livePrice: null, liveValue: null, change: null };
          const meltValue = priceData.price * contentOz;
          return {
            ...p,
            livePrice: priceData.price,
            liveValue: meltValue,
            meltValue,
            premiumNote,
            change: priceData.change,
            source: priceData.source,
          };
        });
        const totalLive = enriched.reduce((s, p) => s + (p.liveValue || 0), 0);
        results[acct.id] = { positions: enriched, totalValue: totalLive || acct.amount };

      } else {
        // Cash / debt — use stored amount
        results[acct.id] = { positions: acct.positions || [], totalValue: acct.amount };
      }
    }

    return results;
  }

  // ── Weekly snapshot helpers ────────────────────────────────────────────────
  async function saveWeeklySnapshot(accounts, liveValues) {
    const snapshot = {
      id: `snap_${Date.now()}`,
      date: new Date().toISOString(),
      weekOf: _weekKey(new Date()),
      accounts: accounts.map(a => ({
        id: a.id, label: a.label, type: a.type,
        amount: liveValues[a.id]?.totalValue ?? a.amount,
        positions: (liveValues[a.id]?.positions || a.positions || []).map(p => ({
          ticker: p.ticker || p.metal, shares: p.shares, qty: p.qty, oz: p.oz,
          livePrice: p.livePrice, liveValue: p.liveValue,
        })),
      })),
    };
    await DB.setSetting(`snap_${snapshot.weekOf}`, snapshot);
    await DB.setSetting('snap_latest', snapshot);
    return snapshot;
  }

  function _weekKey(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay()); // Start of week (Sunday)
    return d.toISOString().slice(0, 10);
  }

  async function getWeeklyHistory(weeksBack = 12) {
    const snaps = [];
    const now = new Date();
    for (let i = 0; i < weeksBack; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      const key = `snap_${_weekKey(d)}`;
      try {
        const snap = await DB.getSetting(key);
        if (snap) snaps.push(snap);
      } catch { /* no snap for this week */ }
    }
    return snaps.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  async function shouldTakeSnapshot() {
    const latest = await DB.getSetting('snap_latest');
    if (!latest) return true;
    const latestWeek = _weekKey(new Date(latest.date));
    const thisWeek   = _weekKey(new Date());
    return latestWeek !== thisWeek;
  }

  return {
    fetchStockPrice,
    fetchCryptoPrices,
    fetchMetalPrices,
    refreshAccountValues,
    saveWeeklySnapshot,
    getWeeklyHistory,
    shouldTakeSnapshot,
    weekKey: _weekKey,
    searchTickers,
    fetchTickerHistory,
  };
})();
