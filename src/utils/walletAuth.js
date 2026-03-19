// src/utils/walletAuth.js — Phantom Wallet Authentication
// Handles: detection, connection, message signing, key derivation
// Zero external dependencies — uses window.solana injected by Phantom
// Works offline for key derivation; requires network for initial connection

window.WalletAuth = (function () {

  // ── Storage keys ───────────────────────────────────────────────────────────
  const LS_WALLET_PUBKEY  = 'cs_wallet_pubkey';   // stored public key (safe — public)
  const LS_WALLET_ENABLED = 'cs_wallet_enabled';  // whether wallet auth is active

  // ── The deterministic message signed for key derivation ───────────────────
  // IMPORTANT: This message must never change — changing it invalidates all
  // wallet-encrypted backups. It is NOT a nonce; it is a fixed domain separator.
  const SIGN_MESSAGE = 'Cornerstone Secure Backup — VidaTech. Sign to authorize backup encryption. This request does not initiate any blockchain transaction.';

  // ── Detect Phantom ────────────────────────────────────────────────────────
  function isPhantomAvailable() {
    return !!(window.solana && window.solana.isPhantom);
  }

  function isWalletEnabled() {
    return localStorage.getItem(LS_WALLET_ENABLED) === '1';
  }

  function getStoredPubkey() {
    return localStorage.getItem(LS_WALLET_PUBKEY) || null;
  }

  // ── Connect wallet ────────────────────────────────────────────────────────
  // Returns { pubkey: string } or throws with user-friendly message
  async function connect() {
    if (!isPhantomAvailable()) {
      throw new Error('Phantom wallet is not installed. Visit phantom.app to install it.');
    }
    try {
      const resp = await window.solana.connect();
      const pubkey = resp.publicKey.toString();
      localStorage.setItem(LS_WALLET_PUBKEY,  pubkey);
      localStorage.setItem(LS_WALLET_ENABLED, '1');
      return { pubkey };
    } catch (err) {
      if (err.code === 4001) throw new Error('Connection cancelled. Approve the request in Phantom to continue.');
      throw new Error('Could not connect to Phantom: ' + (err.message || 'Unknown error'));
    }
  }

  // ── Disconnect wallet ─────────────────────────────────────────────────────
  async function disconnect() {
    try {
      if (window.solana?.disconnect) await window.solana.disconnect();
    } catch { /* silent — we clean up regardless */ }
    localStorage.removeItem(LS_WALLET_PUBKEY);
    localStorage.removeItem(LS_WALLET_ENABLED);
  }

  // ── Sign the domain message and derive an AES-256-GCM key ─────────────────
  // The 64-byte Ed25519 signature is used as PBKDF2 input material.
  // Same wallet + same message = same signature = same key (deterministic).
  // Returns a CryptoKey ready for AES-GCM encrypt/decrypt.
  async function deriveKeyFromWallet(saltBuf) {
    if (!isPhantomAvailable()) {
      throw new Error('Phantom is not available. Install Phantom to use wallet encryption.');
    }
    if (!window.solana.isConnected) {
      // Attempt silent reconnect (works if user previously approved)
      try { await window.solana.connect({ onlyIfTrusted: true }); }
      catch { throw new Error('Wallet not connected. Please connect Phantom first.'); }
    }

    // Encode the message as UTF-8 bytes
    const enc     = new TextEncoder();
    const msgBytes = enc.encode(SIGN_MESSAGE);

    // Request signature from Phantom
    let signature;
    try {
      const result = await window.solana.signMessage(msgBytes, 'utf8');
      signature = result.signature; // Uint8Array, 64 bytes (Ed25519)
    } catch (err) {
      if (err.code === 4001) throw new Error('Signing cancelled. Approve the request in Phantom to encrypt your backup.');
      throw new Error('Signing failed: ' + (err.message || 'Unknown error'));
    }

    // Import signature bytes as PBKDF2 key material
    const keyMat = await window.crypto.subtle.importKey(
      'raw', signature, 'PBKDF2', false, ['deriveKey']
    );

    // Derive AES-256-GCM key from signature + salt
    return window.crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: saltBuf, iterations: 500000, hash: 'SHA-256' },
      keyMat,
      { name: 'AES-GCM', length: 256 },
      false, // extractable: false
      ['encrypt', 'decrypt']
    );
  }

  // ── Encrypt payload using wallet-derived key ──────────────────────────────
  async function encryptWithWallet(payload) {
    if (!window.crypto?.subtle) throw new Error('Web Crypto API not available.');
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv   = window.crypto.getRandomValues(new Uint8Array(12));
    const key  = await deriveKeyFromWallet(salt.buffer);
    const enc  = new TextEncoder();

    const cipher = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      key,
      enc.encode(JSON.stringify(payload))
    );

    // Helper: buf → base64
    const b64 = (buf) => {
      const bytes = new Uint8Array(buf);
      let s = '';
      for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
      return btoa(s);
    };

    return {
      _cs:       true,
      _version:  '1.0',
      _auth:     'wallet',             // identifies wallet-encrypted backup
      _pubkey:   getStoredPubkey(),    // which wallet encrypted this (informational only)
      _date:     new Date().toISOString(),
      salt:      b64(salt.buffer),
      iv:        b64(iv.buffer),
      data:      b64(cipher),
    };
  }

  // ── Decrypt wallet-encrypted backup ───────────────────────────────────────
  async function decryptWithWallet(envelope) {
    if (!envelope?._cs || envelope._auth !== 'wallet') {
      throw new Error('Not a wallet-encrypted Cornerstone backup.');
    }
    if (!window.crypto?.subtle) throw new Error('Web Crypto API not available.');

    // base64 → ArrayBuffer
    const b64ToBuf = (b64) => {
      const bin = atob(b64);
      const buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      return buf.buffer;
    };

    const saltBuf  = b64ToBuf(envelope.salt);
    const ivBuf    = b64ToBuf(envelope.iv);
    const cipherBuf = b64ToBuf(envelope.data);
    const key      = await deriveKeyFromWallet(saltBuf);

    try {
      const plain = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(ivBuf), tagLength: 128 },
        key,
        cipherBuf
      );
      return JSON.parse(new TextDecoder().decode(plain));
    } catch (err) {
      console.warn('[WalletAuth] Decryption failed:', err.name, err.message);
      throw new Error('WRONG_WALLET');
    }
  }

  // ── Check if an envelope is wallet-encrypted ──────────────────────────────
  function isWalletEncrypted(obj) {
    return obj && obj._cs === true && obj._auth === 'wallet' && obj.salt && obj.iv && obj.data;
  }

  return {
    isPhantomAvailable,
    isWalletEnabled,
    getStoredPubkey,
    connect,
    disconnect,
    encryptWithWallet,
    decryptWithWallet,
    isWalletEncrypted,
    SIGN_MESSAGE,
  };

})();
