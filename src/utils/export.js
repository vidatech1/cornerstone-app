// src/utils/export.js

window.exportPDF = function (profile, accounts, goals, strategies, income) {
  const ws = calcWealthScore(accounts, income);
  const sumType = t => sumArr(accounts.filter(a => a.type === t).map(a => a.amount));
  const totalAssets = sumType('cash') + sumType('equities') + sumType('crypto') + sumType('metals');
  const totalDebt   = sumType('debt');
  const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<title>Wealth Score Report — ${profile?.name || 'User'}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair Display:wght@400;700;800&family=Playfair Display+Sans:wght@400;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Inter',sans-serif;color:#0a1a30;background:white;padding:36px;max-width:720px;margin:0 auto;}
  h1{font-family:'Playfair Display',sans-serif;color:#0f2a5a;font-size:30px;margin-bottom:4px;}
  h2{font-family:'Playfair Display',sans-serif;color:#0f2a5a;font-size:17px;border-bottom:2px solid #d4943a;padding-bottom:6px;margin:28px 0 14px;}
  .meta{color:#5a7a9a;font-size:13px;margin-bottom:28px;}
  .score-box{display:inline-flex;align-items:center;gap:16px;background:#0f2a5a;border-radius:14px;padding:16px 24px;margin-bottom:8px;}
  .score-num{font-family:'Playfair Display',sans-serif;font-size:48px;font-weight:800;color:${ws.color};}
  .score-info{color:white;}.score-label{font-size:16px;font-weight:700;color:${ws.color};}.score-sub{font-size:12px;color:rgba(255,255,255,0.5);margin-top:3px;}
  .stats{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:8px;}
  .stat{background:#f4f8ff;border-radius:10px;padding:14px 18px;flex:1;min-width:140px;}
  .stat-v{font-family:'Playfair Display',sans-serif;font-size:22px;font-weight:800;color:#0f2a5a;}
  .stat-l{font-size:11px;color:#5a7a9a;margin-top:3px;text-transform:uppercase;letter-spacing:1px;}
  .factor{margin-bottom:12px;padding:10px 14px;background:#f8fbff;border-radius:8px;border-left:3px solid ${ws.color};}
  .factor-head{display:flex;justify-content:space-between;font-family:'Playfair Display',sans-serif;font-weight:700;font-size:14px;margin-bottom:5px;}
  .factor-bar{height:6px;background:#e0ecf8;border-radius:3px;overflow:hidden;}
  .factor-note{font-size:12px;color:#5a7a9a;margin-top:5px;}
  table{width:100%;border-collapse:collapse;font-size:13px;margin-top:4px;}
  th{background:#0f2a5a;color:white;padding:9px 12px;text-align:left;font-family:'Playfair Display',sans-serif;font-size:12px;}
  td{padding:9px 12px;border-bottom:1px solid #e0ecf8;}tr:nth-child(even)td{background:#f8fbff;}
  ul{padding-left:20px;}li{margin-bottom:6px;font-size:13px;line-height:1.5;}
  .footer{margin-top:40px;color:#8fa8c8;font-size:11px;border-top:1px solid #c5d5ea;padding-top:14px;line-height:1.6;}
</style></head><body>
<h1>🌳 Wealth Score Report</h1>
<div class="meta">Prepared for ${profile?.name || 'User'}${profile?.city ? ' · ' + profile.city : ''}${profile?.age ? ' · Age ' + profile.age : ''} · ${now}</div>

<div class="score-box">
  <div class="score-num">${ws.score}</div>
  <div class="score-info"><div class="score-label">${ws.label}</div><div class="score-sub">out of 100 · Wealth Score</div></div>
</div>

<h2>Financial Summary</h2>
<div class="stats">
  <div class="stat"><div class="stat-v">${fmt(totalAssets - totalDebt)}</div><div class="stat-l">Net Worth</div></div>
  <div class="stat"><div class="stat-v">${fmt(totalAssets)}</div><div class="stat-l">Total Assets</div></div>
  <div class="stat"><div class="stat-v">${fmt(totalDebt)}</div><div class="stat-l">Total Debt</div></div>
  <div class="stat"><div class="stat-v">${fmt((income?.job || 0) + (income?.business || 0) + (income?.dividends || 0))}</div><div class="stat-l">Monthly Income</div></div>
</div>

<h2>Score Breakdown</h2>
${ws.factors.map(f => `
<div class="factor">
  <div class="factor-head"><span>${f.name}</span><span style="color:${f.score / f.max > 0.7 ? '#16a34a' : f.score / f.max > 0.4 ? '#d97706' : '#dc2626'}">${f.score}/${f.max}</span></div>
  <div class="factor-bar"><div style="height:100%;width:${(f.score / f.max) * 100}%;background:${f.score / f.max > 0.7 ? '#e8a84a' : f.score / f.max > 0.4 ? '#d4943a' : '#8a6830'};border-radius:3px;"></div></div>
  <div class="factor-note">${f.note}</div>
</div>`).join('')}

<h2>Accounts (${accounts.length})</h2>
<table>
  <tr><th>Account</th><th>Type</th><th>Sub-type</th><th>Balance</th><th>Monthly Contrib</th></tr>
  ${accounts.map(a => `<tr><td>${a.label}</td><td>${TYPE_META[a.type]?.label || a.type}</td><td>${(SUBTYPE_MAP[a.type] || {})[a.subtype] || a.subtype}</td><td>${fmtD(a.amount)}</td><td>${a.monthlyContrib ? fmt(a.monthlyContrib) : '—'}</td></tr>`).join('')}
</table>

${goals?.length ? `<h2>Goals (${goals.length})</h2><ul>${goals.map(g => `<li><strong>${g.label}</strong>${g.targetAmount ? ' — Target: ' + fmt(g.targetAmount) : ''}${g.targetDate ? ' by ' + new Date(g.targetDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''}${g.notes ? ' · ' + g.notes : ''}</li>`).join('')}</ul>` : ''}

${strategies?.length ? `<h2>Active Strategies</h2><ul>${strategies.map(s => `<li>${s.text}</li>`).join('')}</ul>` : ''}

<div class="footer">
  Generated by Wealth Score · ${now}<br/>
  ⚠️ This report is for personal reference only and does not constitute professional financial advice.<br/>
  Please consult a certified financial advisor (CFP) before making major financial decisions.
</div>
</body></html>`;

  const win = window.open('', '_blank');
  if (!win) { alert('Please allow pop-ups to generate the PDF report.'); return; }
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 600);
};

window.createBackup = async function (folderHandle, pin) {
  const data    = await DB.exportAll();
  const payload = { _type: 'wealthscore_backup', _version: '2.0', _date: new Date().toISOString(), ...data };
  const d = new Date();
  const dateStamp = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  let json, filename, encrypted = false, encMethod = 'none';

  // ── Priority 1: Wallet encryption (strongest) ─────────────────────────
  if (window.WalletAuth?.isWalletEnabled?.() && window.WalletAuth?.isPhantomAvailable?.()) {
    try {
      const envelope = await WalletAuth.encryptWithWallet(payload);
      json      = JSON.stringify(envelope, null, 2);
      filename  = `${dateStamp}-cornerstone-wallet.json`;
      encrypted = true;
      encMethod = 'wallet';
    } catch (err) {
      console.warn('[Backup] Wallet encryption failed, falling back to PIN:', err.message);
      // Fall through to PIN encryption
    }
  }

  // ── Priority 2: PIN encryption ────────────────────────────────────────
  if (!encrypted && pin && window.CornerstoneEncryption) {
    try {
      const envelope = await CornerstoneEncryption.encrypt(payload, pin);
      json      = JSON.stringify(envelope, null, 2);
      filename  = `${dateStamp}-cornerstone-secure.json`;
      encrypted = true;
      encMethod = 'pin';
    } catch (err) {
      console.warn('[Backup] PIN encryption failed:', err.message);
      showToast('⚠️ Encryption failed — backup saved without encryption. Check your PIN in Settings.', 'warning', 5000);
      json     = JSON.stringify(payload, null, 2);
      filename = `${dateStamp}-cornerstone.json`;
    }
  }

  // ── Priority 3: Unencrypted fallback ──────────────────────────────────
  if (!encrypted && !json) {
    if (window.CornerstoneEncryption) {
      showToast('💡 Backup saved unencrypted. Set a PIN in Settings to secure future backups.', 'warning', 4000);
    }
    json     = JSON.stringify(payload, null, 2);
    filename = `${dateStamp}-cornerstone.json`;
  }

  if (folderHandle) {
    await saveToFolder(folderHandle, filename, json);
    return { method: 'folder', folderName: folderHandle.name, filename, encrypted, encMethod };
  } else {
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    return { method: 'download', filename, encrypted, encMethod };
  }
};

// ── Backup scheduling ─────────────────────────────────────────────────────

// Returns ms between backups for a given frequency string
window.backupFrequencyMs = function (freq) {
  const DAY = 86400000;
  if (freq === 'launch')  return 0;
  if (freq === 'daily')   return DAY;
  if (freq === 'weekly')  return DAY * 7;
  if (freq === 'monthly') return DAY * 30;
  return null;
};

// Check whether a scheduled backup is due
window.isBackupDue = async function () {
  const freq = await DB.getSetting('backupFrequency') || 'weekly';
  if (freq === 'manual') return false;
  const ms = backupFrequencyMs(freq);
  if (ms === null) return false;
  const last = await DB.getSetting('lastBackupAt');
  if (!last) return true;
  return (Date.now() - new Date(last).getTime()) >= ms;
};

window.recordBackup = async function () {
  const now = new Date().toISOString();
  await DB.setSetting('lastBackupAt', now);
  return now;
};

window.lastBackupLabel = function (isoString) {
  if (!isoString) return 'Never backed up';
  const diff = Date.now() - new Date(isoString).getTime();
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  const mins  = Math.floor(diff / 60000);
  if (mins < 2)   return 'Just now';
  if (mins < 60)  return `${mins} min ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7)   return `${days} days ago`;
  if (days < 30)  return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
};

window.backupUrgency = function (isoString, freq) {
  if (freq === 'manual') return 'ok';
  if (!isoString) return 'critical';
  const days = (Date.now() - new Date(isoString).getTime()) / 86400000;
  if (days > 30) return 'critical';
  if (days > 14) return 'warning';
  return 'ok';
};

window.runBackup = async function (silent = false) {
  const handle = await getBackupFolder();
  const pin    = CornerstoneEncryption.getStoredPin();
  const result = await createBackup(handle, pin);
  const ts     = await recordBackup();
  const folderName = (handle && handle.name) || (await DB.getSetting('backupFolderName')) || 'Downloads';
  const encLabel = result.encMethod === 'wallet' ? ' 🔒 Wallet-encrypted'
                 : result.encMethod === 'pin'    ? ' 🔒 Encrypted'
                 : '';
  const msg = result.method === 'folder'
    ? `Backed up to ${folderName}${encLabel}`
    : `Backup saved${encLabel} — move to iCloud or Google Drive for safety`;
  showToast(msg, 'success', 3200);
  return ts;
};

// ── Backup scheduling ─────────────────────────────────────────────────────

// Returns ms between backups for a given frequency string
window.backupFrequencyMs = function (freq) {
  const DAY = 86400000;
  if (freq === 'launch')  return 0;           // every launch
  if (freq === 'daily')   return DAY;
  if (freq === 'weekly')  return DAY * 7;
  if (freq === 'monthly') return DAY * 30;
  return null; // 'manual' — never auto
};

// Check whether a scheduled backup is due; returns true if it should fire
window.isBackupDue = async function () {
  const freq = await DB.getSetting('backupFrequency') || 'weekly';
  if (freq === 'manual') return false;
  const ms = backupFrequencyMs(freq);
  if (ms === null) return false;
  const last = await DB.getSetting('lastBackupAt');
  if (!last) return true; // never backed up → always due
  return (Date.now() - new Date(last).getTime()) >= ms;
};

// Record that a backup just happened
window.recordBackup = async function () {
  const now = new Date().toISOString();
  await DB.setSetting('lastBackupAt', now);
  return now;
};

// Human-readable "last backed up" string
window.lastBackupLabel = function (isoString) {
  if (!isoString) return 'Never backed up';
  const diff = Date.now() - new Date(isoString).getTime();
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  const mins  = Math.floor(diff / 60000);
  if (mins < 2)   return 'Just now';
  if (mins < 60)  return `${mins} min ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7)   return `${days} days ago`;
  if (days < 30)  return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
};

// Urgency color based on last backup age
window.backupUrgency = function (isoString, freq) {
  if (freq === 'manual') return 'ok';
  if (!isoString) return 'critical';
  const days = (Date.now() - new Date(isoString).getTime()) / 86400000;
  if (days > 30) return 'critical';
  if (days > 14) return 'warning';
  return 'ok';
};

// Full backup + record timestamp + optional silent toast
window.runBackup = async function (silent = false) {
  const handle = await getBackupFolder();
  // Pass PIN for encryption if available — user never sees a password prompt
  const pin    = CornerstoneEncryption.getStoredPin();
  const result = await createBackup(handle, pin);
  const ts     = await recordBackup();
  const folderName = (handle && handle.name) || (await DB.getSetting('backupFolderName')) || 'Downloads';
  const encNote = result.encrypted ? ' 🔒 Encrypted' : '';
  const msg = result.method === 'folder'
    ? `Backed up to ${folderName}${encNote}`
    : `Backup saved${encNote} — move to iCloud or Google Drive for safety`;
  showToast(msg, 'success', 3200);
  return ts;
};

window.restoreFromFile = async function (file, onSuccess, onError) {
  console.log('📂 Starting restore from file:', file?.name, 'size:', file?.size);
  
  // Validate file object
  if (!file || !(file instanceof Blob)) {
    console.error('Invalid file object:', file);
    onError('Invalid file. Please select a .wealthscore file.');
    return;
  }
  
  try {
    // Method 1: Try using file.text() (modern API, works in most browsers)
    let text;
    if (typeof file.text === 'function') {
      console.log('Using file.text() method');
      text = await file.text();
    } else {
      // Method 2: Fallback to FileReader wrapped in Promise
      console.log('Using FileReader fallback');
      text = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = () => reject(new Error('FileReader failed: ' + (reader.error?.message || 'Unknown error')));
        reader.readAsText(file);
      });
    }
    
    console.log('📄 File read successfully, length:', text?.length);
    
    if (!text || text.length === 0) {
      onError('File appears to be empty. Please try a different backup.');
      return;
    }
    
    // Parse JSON
    const data = JSON.parse(text);
    
    if (data._type !== 'wealthscore_backup') { 
      onError('Not a valid Cornerstone backup file. Expected _type: wealthscore_backup'); 
      return; 
    }
    
    console.log('📂 Restoring backup from', data._date || 'unknown date');
    console.log('   Accounts:', data.accounts?.length || 0);
    console.log('   Goals:', data.goals?.length || 0);
    
    await DB.restoreBackup(data);
    console.log('✅ Restore complete');
    onSuccess();
    
  } catch (err) { 
    console.error('Restore error:', err);
    // Provide more specific error messages
    if (err instanceof SyntaxError) {
      onError('File is not valid JSON. Make sure you selected a .wealthscore backup file.');
    } else {
      onError('Could not restore: ' + (err.message || 'Unknown error'));
    }
  }
};

// ── restoreFromParsed ─────────────────────────────────────────────────────
// Called by Dashboard.js after it reads the file to text immediately inside
// the onChange handler (while browser permission is guaranteed active).
// Receiving a plain JS object instead of a file handle eliminates the
// "permission lost after reference acquired" error on restore.
window.restoreFromParsed = async function(data, onSuccess, onError, onNeedPin, _depth = 0) {
  // S04: recursion depth guard
  if (_depth > 1) {
    return onError('Could not restore: backup format is invalid (nested encryption detected).');
  }

  try {
    if (!data || typeof data !== 'object') {
      return onError('Could not restore: the backup file is empty or invalid.');
    }

    // ── Wallet-encrypted backup path ──────────────────────────────────────
    if (window.WalletAuth?.isWalletEncrypted?.(data)) {
      try {
        const decrypted = await WalletAuth.decryptWithWallet(data);
        return restoreFromParsed(decrypted, onSuccess, onError, onNeedPin, _depth + 1);
      } catch (err) {
        if (err.message === 'WRONG_WALLET') {
          return onError(
            `This backup was encrypted with a different Phantom wallet${data._pubkey ? ` (${data._pubkey.slice(0,6)}…${data._pubkey.slice(-4)})` : ''}. Connect the correct wallet to restore it.`
          );
        }
        if (err.message.includes('cancelled')) return onError('Restore cancelled. Approve the Phantom signing request to decrypt your backup.');
        return onError('Could not decrypt wallet backup: ' + err.message);
      }
    }

    // ── PIN-encrypted backup path ─────────────────────────────────────────
    if (CornerstoneEncryption.isEncrypted(data)) {
      const storedPin = CornerstoneEncryption.getStoredPin();

      const attemptDecrypt = async (pin, onPinError) => {
        try {
          const decrypted = await CornerstoneEncryption.decrypt(data, pin);
          return restoreFromParsed(decrypted, onSuccess, onError, onNeedPin, _depth + 1);
        } catch (err) {
          if (err.message === 'WRONG_PIN') {
            onPinError('Incorrect PIN — please try again.');
          } else {
            onError('Could not decrypt backup: ' + err.message);
          }
        }
      };

      if (storedPin) {
        try {
          const decrypted = await CornerstoneEncryption.decrypt(data, storedPin);
          return restoreFromParsed(decrypted, onSuccess, onError, onNeedPin, _depth + 1);
        } catch (err) {
          if (err.message === 'WRONG_PIN') {
            if (typeof onNeedPin === 'function') return onNeedPin(attemptDecrypt);
            return onError('Incorrect PIN. This backup was secured with a different PIN.');
          }
          return onError('Could not decrypt backup: ' + err.message);
        }
      } else {
        if (typeof onNeedPin === 'function') return onNeedPin(attemptDecrypt);
        return onError('This backup is encrypted. Set up your PIN in Settings to restore it.');
      }
    }

    // ── Unencrypted backup path ───────────────────────────────────────────
    const payload = (data.accounts || data.settings) ? data : (data.data || null);

    if (!payload) {
      return onError('Could not restore: unrecognized backup format. Make sure you are selecting a Cornerstone backup file (.json or .wealthscore).');
    }

    const { accounts = [], settings = {}, weeklySnaps = [] } = payload;

    if (Array.isArray(accounts) && accounts.length > 0) {
      const existing = await DB.getAccounts();
      for (const acc of existing) { await DB.deleteAccount(acc.id); }
      for (const acc of accounts) { await DB.saveAccount(acc); }
    }

    if (settings && typeof settings === 'object') {
      for (const [key, value] of Object.entries(settings)) {
        if (key === 'ws_pin' || key === 'pin') continue;
        await DB.setSetting(key, value);
      }
    }

    if (Array.isArray(weeklySnaps) && weeklySnaps.length > 0) {
      for (const snap of weeklySnaps) {
        if (snap && snap.date) { await DB.saveWeeklySnap(snap); }
      }
    }

    showToast('✅ Backup restored successfully', 'success');
    if (typeof onSuccess === 'function') onSuccess();

  } catch (err) {
    console.error('[Cornerstone] restoreFromParsed error:', err);
    onError('Could not restore: an unexpected error occurred (' + (err?.message || 'unknown') + '). Your existing data has not been changed.');
  }
};
