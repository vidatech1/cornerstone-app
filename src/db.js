// src/db.js — IndexedDB persistence layer (offline-first)
// All user data lives here — never leaves the device unless user exports/backups

(function () {
  const DB_NAME = 'WealthScoreDB';
  const DB_VER  = 2; // bumped for weeklySnaps store

  let _db = null;

  function openDB() {
    return new Promise((resolve, reject) => {
      if (_db) return resolve(_db);
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        // One store per data type for clean separation
        if (!db.objectStoreNames.contains('settings'))     db.createObjectStore('settings');
        if (!db.objectStoreNames.contains('accounts'))     db.createObjectStore('accounts',     { keyPath: 'id' });
        if (!db.objectStoreNames.contains('goals'))        db.createObjectStore('goals',        { keyPath: 'id' });
        if (!db.objectStoreNames.contains('strategies'))   db.createObjectStore('strategies',   { keyPath: 'id' });
        if (!db.objectStoreNames.contains('lifeHistory'))  db.createObjectStore('lifeHistory',  { keyPath: 'id' });
        if (!db.objectStoreNames.contains('weeklySnaps'))  db.createObjectStore('weeklySnaps',  { keyPath: 'id' });
      };
      req.onsuccess = e => { _db = e.target.result; resolve(_db); };
      req.onerror   = e => reject(e.target.error);
    });
  }

  async function get(store, key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  async function set(store, key, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      const os = tx.objectStore(store);
      const req = store === 'settings' ? os.put(value, key) : os.put(value);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  }

  async function getAll(store) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  async function remove(store, key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(store, 'readwrite');
      const req = tx.objectStore(store).delete(key);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  }

  async function clearStore(store) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(store, 'readwrite');
      const req = tx.objectStore(store).clear();
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  }

  // High-level helpers used by the app
  window.DB = {
    // Settings (single values keyed by string)
    getSetting:    key       => get('settings', key),
    setSetting:    (key, val)=> set('settings', key, val),

    // Accounts
    getAccounts:   ()        => getAll('accounts'),
    saveAccount:   acct      => set('accounts', null, acct),
    deleteAccount: id        => remove('accounts', id),
    clearAccounts: ()        => clearStore('accounts'),

    // Goals
    getGoals:      ()        => getAll('goals'),
    saveGoal:      goal      => set('goals', null, goal),
    deleteGoal:    id        => remove('goals', id),

    // Strategies
    getStrategies: ()        => getAll('strategies'),
    saveStrategy:  s         => set('strategies', null, s),
    deleteStrategy:id        => remove('strategies', id),

    // Weekly portfolio snapshots
    getWeeklySnaps:  ()     => getAll('weeklySnaps'),
    saveWeeklySnap:  snap   => set('weeklySnaps', null, snap),
    clearWeeklySnaps:()     => clearStore('weeklySnaps'),

    // Life Score history
    getLifeHistory:()        => getAll('lifeHistory'),
    saveLifeEntry: entry     => set('lifeHistory', null, entry),

    // Full restore from backup
    async restoreBackup(data) {
      // Wipe and rewrite all stores
      await clearStore('accounts');
      await clearStore('goals');
      await clearStore('strategies');
      await clearStore('lifeHistory');
      await clearStore('weeklySnaps');
      if (data.profile)    await set('settings', 'profile', data.profile);
      if (data.income)     await set('settings', 'income',  data.income);
      await set('settings', 'onboarded', true); // Mark as onboarded after restore!
      for (const a of (data.accounts   || [])) await set('accounts',    null, a);
      for (const g of (data.goals      || [])) await set('goals',       null, g);
      for (const s of (data.strategies || [])) await set('strategies',  null, s);
      for (const w of (data.weeklySnaps|| [])) await set('weeklySnaps', null, w);
    },

    // Full export snapshot
    async exportAll() {
      const [profile, income, accounts, goals, strategies, lifeHistory, weeklySnaps] = await Promise.all([
        get('settings', 'profile'),
        get('settings', 'income'),
        getAll('accounts'),
        getAll('goals'),
        getAll('strategies'),
        getAll('lifeHistory'),
        getAll('weeklySnaps'),
      ]);
      return { profile, income, accounts, goals, strategies, lifeHistory, weeklySnaps };
    },
  };
})();
