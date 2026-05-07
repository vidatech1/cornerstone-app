// src/utils/csvParser.js — Broker CSV detection and normalization
window.CSVParser = (function () {

  // Tokenize a single CSV line (handles quoted fields with embedded commas)
  function tokenize(line) {
    const fields = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (c === ',' && !inQ) {
        fields.push(cur.trim()); cur = '';
      } else {
        cur += c;
      }
    }
    fields.push(cur.trim());
    return fields;
  }

  // Parse full CSV text → { headers, rows }
  // Skips preamble lines (broker metadata before the actual table)
  function parseCSV(text) {
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    let headerIdx = 0;
    // Find the first row that looks like a real header (≥3 columns, letter content)
    for (let i = 0; i < Math.min(lines.length, 20); i++) {
      const cols = tokenize(lines[i]);
      if (cols.length >= 3 && /[a-zA-Z]{2}/.test(cols[0]) && /[a-zA-Z]/.test(cols[1])) {
        headerIdx = i;
        break;
      }
    }
    const headers = tokenize(lines[headerIdx]).map(h => h.replace(/^"|"$/g, '').trim());
    const rows = [];
    for (let i = headerIdx + 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      const vals = tokenize(line);
      if (vals.every(v => !v.trim())) continue;
      const obj = {};
      headers.forEach((h, j) => {
        obj[h] = (vals[j] ?? '').replace(/^"|"$/g, '').trim();
      });
      rows.push(obj);
    }
    return { headers, rows };
  }

  // Parse dollar string → number (handles negatives, parens, commas)
  function parseMoney(s) {
    if (!s) return 0;
    const cleaned = s.replace(/[$,\s]/g, '').replace(/^\((.+)\)$/, '-$1');
    return parseFloat(cleaned) || 0;
  }

  // Parse quantity string → number
  function parseQty(s) {
    if (!s) return 0;
    return parseFloat(s.replace(/[,\s]/g, '')) || 0;
  }

  // Normalize various date formats → YYYY-MM-DD
  function parseDate(s) {
    if (!s) return null;
    s = s.trim().split(' ')[0]; // drop time component
    // Already ISO
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // MM/DD/YYYY or M/D/YYYY
    const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`;
    // MM/DD/YY
    const mdy2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
    if (mdy2) {
      const yr = parseInt(mdy2[3]) + (parseInt(mdy2[3]) > 50 ? 1900 : 2000);
      return `${yr}-${mdy2[1].padStart(2, '0')}-${mdy2[2].padStart(2, '0')}`;
    }
    // "Jan 15, 2024" or "January 15, 2024"
    const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
    const long = s.match(/^([a-zA-Z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/);
    if (long) {
      const m = MONTHS[long[1].toLowerCase().slice(0, 3)];
      if (m) return `${long[3]}-${String(m).padStart(2, '0')}-${long[2].padStart(2, '0')}`;
    }
    return null;
  }

  // Classify an action/description string as 'buy', 'sell', or null
  function classifyAction(s) {
    const a = (s || '').toLowerCase();
    if (/\b(buy|bought|purchase|reinvest|reinvestment|bto|bo)\b/.test(a)) return 'buy';
    if (/\b(sell|sold|redemption|sto|so)\b/.test(a)) return 'sell';
    return null;
  }

  // Field lookup helper — find best matching header from a list of candidates
  function col(obj, ...candidates) {
    for (const c of candidates) {
      if (obj[c] !== undefined) return obj[c];
    }
    return '';
  }

  // ── BROKER DEFINITIONS ────────────────────────────────────────────────────
  const BROKERS = [

    // 1. Fidelity
    // Headers: Run Date, Action, Symbol, Security Description, Security Type, Quantity, Price ($), Amount ($)
    {
      name: 'Fidelity',
      detect: h => h.includes('Run Date') || (h.includes('Action') && h.includes('Security Description')),
      normalize(rows) {
        return rows.map(r => {
          const type = classifyAction(col(r, 'Action'));
          if (!type) return null;
          const ticker = col(r, 'Symbol').toUpperCase();
          if (!ticker || ticker === '--') return null;
          const qty   = Math.abs(parseQty(col(r, 'Quantity')));
          const price = Math.abs(parseMoney(col(r, 'Price ($)', 'Price')));
          const total = Math.abs(parseMoney(col(r, 'Amount ($)', 'Amount'))) || qty * price;
          return { date: parseDate(col(r, 'Run Date', 'Date')), type, ticker, qty, price, total, broker: 'Fidelity', rawDescription: col(r, 'Security Description') };
        }).filter(Boolean);
      },
    },

    // 2. Vanguard
    // Headers: Trade date, Settlement date, Transaction type, Investment name, Symbol, Shares, Share price, Principal amount
    {
      name: 'Vanguard',
      detect: h => h.includes('Trade date') && (h.includes('Investment name') || h.includes('Symbol')),
      normalize(rows) {
        return rows.map(r => {
          const type = classifyAction(col(r, 'Transaction type'));
          if (!type) return null;
          const ticker = col(r, 'Symbol').toUpperCase();
          if (!ticker || ticker === '--') return null;
          const qty   = Math.abs(parseQty(col(r, 'Shares')));
          const price = Math.abs(parseMoney(col(r, 'Share price')));
          const total = Math.abs(parseMoney(col(r, 'Principal amount'))) || qty * price;
          return { date: parseDate(col(r, 'Trade date')), type, ticker, qty, price, total, broker: 'Vanguard', rawDescription: col(r, 'Investment name') };
        }).filter(Boolean);
      },
    },

    // 3. Schwab
    // Headers: Date, Action, Symbol, Description, Quantity, Price, Fees & Comm, Amount
    {
      name: 'Schwab',
      detect: h => h.includes('Date') && h.includes('Action') && h.includes('Symbol') && h.includes('Fees & Comm'),
      normalize(rows) {
        return rows.map(r => {
          const type = classifyAction(col(r, 'Action'));
          if (!type) return null;
          const ticker = col(r, 'Symbol').toUpperCase();
          if (!ticker || ticker === '--') return null;
          const qty   = Math.abs(parseQty(col(r, 'Quantity')));
          const price = Math.abs(parseMoney(col(r, 'Price')));
          const total = Math.abs(parseMoney(col(r, 'Amount'))) || qty * price;
          return { date: parseDate(col(r, 'Date')), type, ticker, qty, price, total, broker: 'Schwab', rawDescription: col(r, 'Description') };
        }).filter(Boolean);
      },
    },

    // 4. Robinhood
    // Headers: Activity Date, Process Date, Settle Date, Instrument, Description, Trans Code, Quantity, Price, Amount
    {
      name: 'Robinhood',
      detect: h => h.includes('Activity Date') && h.includes('Trans Code'),
      normalize(rows) {
        return rows.map(r => {
          const code = col(r, 'Trans Code').toUpperCase();
          const type = (code === 'BUY' || code === 'BTO') ? 'buy' : (code === 'SELL' || code === 'STO') ? 'sell' : null;
          if (!type) return null;
          const ticker = col(r, 'Instrument').toUpperCase();
          if (!ticker) return null;
          const qty   = Math.abs(parseQty(col(r, 'Quantity')));
          const price = Math.abs(parseMoney(col(r, 'Price')));
          const total = Math.abs(parseMoney(col(r, 'Amount'))) || qty * price;
          return { date: parseDate(col(r, 'Activity Date')), type, ticker, qty, price, total, broker: 'Robinhood', rawDescription: col(r, 'Description') };
        }).filter(Boolean);
      },
    },

    // 5. TD Ameritrade (now part of Schwab)
    // Headers: DATE, TRANSACTION ID, DESCRIPTION, QUANTITY, SYMBOL, PRICE, COMMISSION, AMOUNT
    {
      name: 'TD Ameritrade',
      detect: h => h.includes('TRANSACTION ID') || (h.includes('DATE') && h.includes('SYMBOL') && h.includes('QUANTITY') && !h.includes('Action')),
      normalize(rows) {
        return rows.map(r => {
          const desc = col(r, 'DESCRIPTION', 'Description');
          const type = classifyAction(desc);
          if (!type) return null;
          const ticker = col(r, 'SYMBOL', 'Symbol').toUpperCase();
          if (!ticker || ticker === '--') return null;
          const qty   = Math.abs(parseQty(col(r, 'QUANTITY', 'Quantity')));
          const price = Math.abs(parseMoney(col(r, 'PRICE', 'Price')));
          const total = Math.abs(parseMoney(col(r, 'AMOUNT', 'Amount'))) || qty * price;
          return { date: parseDate(col(r, 'DATE', 'Date')), type, ticker, qty, price, total, broker: 'TD Ameritrade', rawDescription: desc };
        }).filter(Boolean);
      },
    },

    // 6. E*Trade
    // Headers: TransactionDate, TransactionType, SecurityType, Symbol, Quantity, Amount, Price, Commission, Description
    {
      name: 'E*Trade',
      detect: h => h.includes('TransactionDate') && h.includes('TransactionType'),
      normalize(rows) {
        return rows.map(r => {
          const type = classifyAction(col(r, 'TransactionType'));
          if (!type) return null;
          const ticker = col(r, 'Symbol').toUpperCase();
          if (!ticker || ticker === '--') return null;
          const qty   = Math.abs(parseQty(col(r, 'Quantity')));
          const price = Math.abs(parseMoney(col(r, 'Price')));
          const total = Math.abs(parseMoney(col(r, 'Amount'))) || qty * price;
          return { date: parseDate(col(r, 'TransactionDate')), type, ticker, qty, price, total, broker: 'E*Trade', rawDescription: col(r, 'Description') };
        }).filter(Boolean);
      },
    },

    // 7. Merrill Lynch / Merrill Edge
    // Headers: Date, Description, Quantity, Price, Amount, Settlement Date
    // (no dedicated Symbol column — ticker is embedded in Description)
    {
      name: 'Merrill',
      detect: h => h.includes('Date') && h.includes('Description') && h.includes('Quantity') && h.includes('Price') && !h.includes('Symbol') && !h.includes('Action') && !h.includes('Trans Code'),
      normalize(rows) {
        return rows.map(r => {
          const desc = col(r, 'Description');
          const type = classifyAction(desc);
          if (!type) return null;
          // Ticker is typically the first ALL-CAPS word after the action verb
          const match = desc.match(/\b([A-Z]{1,6})\b/g) || [];
          const ticker = (match.find(t => t.length >= 1 && t.length <= 6 && !/^(BUY|BOUGHT|SELL|SOLD|OF|AT|FOR|THE|AND)$/.test(t)) || '').toUpperCase();
          if (!ticker) return null;
          const qty   = Math.abs(parseQty(col(r, 'Quantity')));
          const price = Math.abs(parseMoney(col(r, 'Price')));
          const total = Math.abs(parseMoney(col(r, 'Amount'))) || qty * price;
          return { date: parseDate(col(r, 'Date')), type, ticker, qty, price, total, broker: 'Merrill', rawDescription: desc };
        }).filter(Boolean);
      },
    },

    // 8. Ally Invest
    // Headers: Date, Transaction, Symbol, Qty, Price, Gross Amt, Net Amt, Commission
    {
      name: 'Ally Invest',
      detect: h => h.includes('Transaction') && h.includes('Qty') && (h.includes('Gross Amt') || h.includes('Net Amt')),
      normalize(rows) {
        return rows.map(r => {
          const type = classifyAction(col(r, 'Transaction'));
          if (!type) return null;
          const ticker = col(r, 'Symbol').toUpperCase();
          if (!ticker || ticker === '--') return null;
          const qty   = Math.abs(parseQty(col(r, 'Qty')));
          const price = Math.abs(parseMoney(col(r, 'Price')));
          const total = Math.abs(parseMoney(col(r, 'Gross Amt', 'Net Amt'))) || qty * price;
          return { date: parseDate(col(r, 'Date')), type, ticker, qty, price, total, broker: 'Ally Invest', rawDescription: '' };
        }).filter(Boolean);
      },
    },

    // 9. Webull
    // Headers: Date, Time, Symbol, Category, Side, Filled Price, Quantity, Amount
    // (alternate export): Order No., Time, Symbol, Action, Filled, Avg. Price, Cash Flow
    {
      name: 'Webull',
      detect: h => (h.includes('Side') && h.includes('Filled Price')) || (h.includes('Action') && h.includes('Avg. Price')),
      normalize(rows) {
        return rows.map(r => {
          const side = col(r, 'Side', 'Action');
          const type = classifyAction(side) || (side.toUpperCase() === 'BUY' ? 'buy' : side.toUpperCase() === 'SELL' ? 'sell' : null);
          if (!type) return null;
          const ticker = col(r, 'Symbol').toUpperCase();
          if (!ticker || ticker === '--') return null;
          const qty   = Math.abs(parseQty(col(r, 'Quantity', 'Filled')));
          const price = Math.abs(parseMoney(col(r, 'Filled Price', 'Avg. Price')));
          const total = Math.abs(parseMoney(col(r, 'Amount', 'Cash Flow'))) || qty * price;
          return { date: parseDate(col(r, 'Date', 'Order Date')), type, ticker, qty, price, total, broker: 'Webull', rawDescription: '' };
        }).filter(Boolean);
      },
    },

    // 10. Interactive Brokers (IBKR)
    // Headers: DataDiscriminator, Asset Category, Currency, Symbol, Date/Time, Quantity, T. Price, Proceeds, Comm/Fee
    // Positive Quantity = buy, negative = sell
    {
      name: 'IBKR',
      detect: h => h.includes('T. Price') || (h.includes('DataDiscriminator') && h.includes('Proceeds')),
      normalize(rows) {
        return rows.map(r => {
          if (r['DataDiscriminator'] && r['DataDiscriminator'] !== 'Order') return null;
          const rawQty = parseQty(col(r, 'Quantity'));
          if (rawQty === 0) return null;
          const type   = rawQty > 0 ? 'buy' : 'sell';
          const ticker = col(r, 'Symbol').toUpperCase();
          if (!ticker) return null;
          const qty   = Math.abs(rawQty);
          const price = Math.abs(parseMoney(col(r, 'T. Price')));
          const total = Math.abs(parseMoney(col(r, 'Proceeds'))) || qty * price;
          return { date: parseDate(col(r, 'Date/Time', 'TradeDate')), type, ticker, qty, price, total, broker: 'IBKR', rawDescription: col(r, 'Description') };
        }).filter(Boolean);
      },
    },
  ];

  // Generic fallback: attempt to auto-map common column names
  function genericParse(headers, rows) {
    const find = (...names) => headers.find(h => names.some(n => h.toLowerCase() === n.toLowerCase())) ||
                               headers.find(h => names.some(n => h.toLowerCase().includes(n.toLowerCase())));
    const dateCol   = find('date', 'trade date', 'activity date', 'transaction date', 'run date', 'order date');
    const typeCol   = find('action', 'transaction type', 'type', 'trans code', 'side', 'transaction');
    const tickerCol = find('symbol', 'ticker', 'instrument');
    const qtyCol    = find('quantity', 'qty', 'shares', 'filled');
    const priceCol  = find('price', 'filled price', 'share price', 'avg. price', 't. price');
    const amtCol    = find('amount', 'gross amt', 'principal amount', 'net amt', 'proceeds', 'cash flow');

    if (!dateCol || !typeCol || !tickerCol || !qtyCol) {
      return { broker: null, transactions: [], total: rows.length, parsed: 0, error: 'Could not detect broker format. Make sure you are exporting a transaction history (not positions or balances) from your broker.' };
    }

    const txns = rows.map(r => {
      const type = classifyAction(r[typeCol]);
      if (!type) return null;
      const ticker = (r[tickerCol] || '').toUpperCase();
      if (!ticker || ticker === '--') return null;
      const qty   = Math.abs(parseQty(r[qtyCol]));
      const price = Math.abs(parseMoney(amtCol ? r[priceCol] : ''));
      const total = Math.abs(parseMoney(amtCol ? r[amtCol] : '')) || qty * price;
      return { date: parseDate(r[dateCol]), type, ticker, qty, price, total, broker: 'Generic', rawDescription: '' };
    }).filter(Boolean);

    return { broker: 'Generic', transactions: txns, total: rows.length, parsed: txns.length };
  }

  // ── PUBLIC API ─────────────────────────────────────────────────────────────
  return {
    // Main entry: parse CSV text and return normalized result
    parse(text) {
      let parsed;
      try {
        parsed = parseCSV(text);
      } catch (e) {
        return { broker: null, transactions: [], total: 0, parsed: 0, error: 'Could not read the file. Make sure it is a valid CSV.' };
      }

      const { headers, rows } = parsed;
      const hSet = new Set(headers);

      for (const b of BROKERS) {
        if (b.detect(headers) || b.detect([...hSet])) {
          const transactions = b.normalize(rows).filter(t => t.date && t.qty > 0);
          return { broker: b.name, transactions, total: rows.length, parsed: transactions.length };
        }
      }

      const result = genericParse(headers, rows);
      result.transactions = (result.transactions || []).filter(t => t.date && t.qty > 0);
      result.parsed = result.transactions.length;
      return result;
    },

    // Deterministic duplicate fingerprint
    fingerprint(txn) {
      return [txn.date, txn.type, (txn.ticker || '').toLowerCase(), txn.qty, Math.round((txn.price || 0) * 100)].join('|');
    },

    SUPPORTED_BROKERS: BROKERS.map(b => b.name),
  };
})();
