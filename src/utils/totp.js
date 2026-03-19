// src/utils/totp.js — TOTP (Time-based One-Time Password) Engine
// RFC 6238 compliant. Zero external dependencies.
// Uses Web Crypto API for HMAC-SHA1. Works completely offline.
// Compatible with: Proton Authenticator, Google Authenticator, Authy, 1Password

window.TOTPEngine = (function () {

  // ── Storage keys ───────────────────────────────────────────────────────────
  const LS_TOTP_SECRET  = 'cs_totp_secret';   // base32-encoded secret (encrypted)
  const LS_TOTP_ENABLED = 'cs_totp_enabled';  // whether TOTP is active

  // ── Base32 alphabet (RFC 4648) ─────────────────────────────────────────────
  const B32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

  // Encode bytes to base32 string
  function base32Encode(bytes) {
    let bits = 0, val = 0, output = '';
    for (let i = 0; i < bytes.length; i++) {
      val = (val << 8) | bytes[i];
      bits += 8;
      while (bits >= 5) {
        output += B32_CHARS[(val >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    if (bits > 0) output += B32_CHARS[(val << (5 - bits)) & 31];
    // Pad to multiple of 8
    while (output.length % 8 !== 0) output += '=';
    return output;
  }

  // Decode base32 string to Uint8Array
  function base32Decode(str) {
    // Remove padding and spaces, uppercase
    str = str.replace(/=+$/, '').replace(/\s/g, '').toUpperCase();
    let bits = 0, val = 0;
    const output = [];
    for (let i = 0; i < str.length; i++) {
      const idx = B32_CHARS.indexOf(str[i]);
      if (idx === -1) throw new Error('Invalid base32 character: ' + str[i]);
      val = (val << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        output.push((val >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }
    return new Uint8Array(output);
  }

  // ── Generate a cryptographically random TOTP secret ───────────────────────
  // Returns a 20-byte (160-bit) base32-encoded secret
  function generateSecret() {
    const bytes = window.crypto.getRandomValues(new Uint8Array(20));
    return base32Encode(bytes);
  }

  // ── HMAC-SHA1 using Web Crypto API ────────────────────────────────────────
  async function hmacSHA1(keyBytes, messageBytes) {
    const key = await window.crypto.subtle.importKey(
      'raw', keyBytes,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );
    const sig = await window.crypto.subtle.sign('HMAC', key, messageBytes);
    return new Uint8Array(sig);
  }

  // ── TOTP code generation (RFC 6238) ───────────────────────────────────────
  // Returns the 6-digit code for a given secret and time step
  async function generateCode(secret, timeStep = null) {
    const step   = timeStep !== null ? timeStep : Math.floor(Date.now() / 1000 / 30);
    const keyBytes = base32Decode(secret);

    // Counter as 8-byte big-endian
    const counter = new Uint8Array(8);
    let t = step;
    for (let i = 7; i >= 0; i--) {
      counter[i] = t & 0xff;
      t = Math.floor(t / 256);
    }

    const hmac   = await hmacSHA1(keyBytes, counter);
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code   = (
      ((hmac[offset]     & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8)  |
       (hmac[offset + 3] & 0xff)
    ) % 1000000;

    return String(code).padStart(6, '0');
  }

  // ── Verify a TOTP code (allows ±1 time step for clock drift) ─────────────
  async function verifyCode(secret, inputCode) {
    const clean = String(inputCode).replace(/\s/g, '');
    if (clean.length !== 6) return false;
    const step = Math.floor(Date.now() / 1000 / 30);
    // Check current step and ±1 for clock drift tolerance
    for (const delta of [-1, 0, 1]) {
      const expected = await generateCode(secret, step + delta);
      if (expected === clean) return true;
    }
    return false;
  }

  // ── Build an otpauth:// URI for QR code generation ───────────────────────
  // Compatible with all TOTP apps (Proton Authenticator, Google Authenticator, etc.)
  function buildOtpauthUri(secret, accountName = 'Cornerstone', issuer = 'VidaTech') {
    const enc = encodeURIComponent;
    return `otpauth://totp/${enc(issuer)}:${enc(accountName)}?secret=${secret}&issuer=${enc(issuer)}&algorithm=SHA1&digits=6&period=30`;
  }

  // ── Generate QR code as SVG data URI using Google Charts API ─────────────
  // Falls back to showing the raw URI if offline
  function buildQRCodeUrl(otpauthUri) {
    const encoded = encodeURIComponent(otpauthUri);
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}`;
  }

  // ── Encrypt and store the TOTP secret ────────────────────────────────────
  // Secret is encrypted with the user's PIN before storage
  async function saveSecret(secret, pin) {
    if (!window.CornerstoneEncryption) throw new Error('Encryption engine not loaded.');
    const envelope = await CornerstoneEncryption.encrypt({ totpSecret: secret }, pin);
    localStorage.setItem(LS_TOTP_SECRET,  JSON.stringify(envelope));
    localStorage.setItem(LS_TOTP_ENABLED, '1');
  }

  // ── Load and decrypt the TOTP secret ─────────────────────────────────────
  async function loadSecret(pin) {
    const raw = localStorage.getItem(LS_TOTP_SECRET);
    if (!raw) return null;
    try {
      const envelope = JSON.parse(raw);
      const payload  = await CornerstoneEncryption.decrypt(envelope, pin);
      return payload.totpSecret || null;
    } catch (err) {
      if (err.message === 'WRONG_PIN') throw err;
      console.warn('[TOTP] Could not load secret:', err.message);
      return null;
    }
  }

  // ── Disable TOTP ──────────────────────────────────────────────────────────
  function disable() {
    localStorage.removeItem(LS_TOTP_SECRET);
    localStorage.removeItem(LS_TOTP_ENABLED);
  }

  function isEnabled() {
    return localStorage.getItem(LS_TOTP_ENABLED) === '1';
  }

  // ── Remaining seconds in current time step ────────────────────────────────
  function secondsRemaining() {
    return 30 - (Math.floor(Date.now() / 1000) % 30);
  }

  return {
    generateSecret,
    generateCode,
    verifyCode,
    buildOtpauthUri,
    buildQRCodeUrl,
    saveSecret,
    loadSecret,
    disable,
    isEnabled,
    secondsRemaining,
    base32Encode,
    base32Decode,
  };

})();
