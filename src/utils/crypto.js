// src/utils/crypto.js — Cornerstone Secure Backup Encryption Engine
// AES-256-GCM encryption with PIN-derived keys via PBKDF2
// No external dependencies — uses Web Crypto API (built into every browser)
// Compatible with: Chrome, Firefox, Safari 15+, iOS Safari 15+
//
// File format produced:
// {
//   _cs:      true,                  // Cornerstone Secure Backup marker
//   _version: '1.0',
//   _date:    ISO string,
//   salt:     base64 string,         // 16-byte random salt for PBKDF2
//   iv:       base64 string,         // 12-byte random IV for AES-GCM
//   data:     base64 string,         // AES-256-GCM ciphertext of the JSON payload
// }
//
// Security properties:
// - AES-256-GCM: authenticated encryption — detects tampering
// - PBKDF2: 500,000 iterations — brute-forcing all 10,000 PIN combos takes ~hours
// - Random salt per backup: same PIN produces different keys for different backups
// - Random IV per backup: same plaintext produces different ciphertext each time
// - Wrong PIN: decryption fails with a clear error, no data exposed

window.CornerstoneEncryption = (function () {

  const PBKDF2_ITERATIONS = 500000;
  const PBKDF2_HASH       = 'SHA-256';
  const KEY_LENGTH        = 256; // AES-256

  // ── Utility: convert between ArrayBuffer and Base64 ───────────────────────
  // A03: loop-based approach — avoids stack overflow on large buffers
  function bufToBase64(buf) {
    const bytes = new Uint8Array(buf);
    let binary  = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  function base64ToBuf(b64) {
    const binary = atob(b64);
    const bytes  = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }

  // ── Derive AES-256-GCM key from PIN + salt using PBKDF2 ──────────────────
  async function deriveKey(pin, saltBuf) {
    const enc    = new TextEncoder();
    const keyMat = await window.crypto.subtle.importKey(
      'raw', enc.encode(String(pin)), 'PBKDF2', false, ['deriveKey']
    );
    // A01: explicit extractable: false
    return window.crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: saltBuf, iterations: PBKDF2_ITERATIONS, hash: PBKDF2_HASH },
      keyMat,
      { name: 'AES-GCM', length: KEY_LENGTH },
      false, // extractable: false — key cannot be exported from the browser
      ['encrypt', 'decrypt']
    );
  }

  // ── Encrypt a JSON-serializable payload with a PIN ────────────────────────
  async function encrypt(payload, pin) {
    if (!window.crypto?.subtle) throw new Error('Web Crypto API not available in this browser.');

    const salt  = window.crypto.getRandomValues(new Uint8Array(16));
    const iv    = window.crypto.getRandomValues(new Uint8Array(12));
    const key   = await deriveKey(pin, salt.buffer);
    const enc   = new TextEncoder();
    const plain = enc.encode(JSON.stringify(payload));

    // A02: explicit tagLength: 128 (NIST recommended, also the default)
    const cipher = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      key,
      plain
    );

    return {
      _cs:      true,
      _version: '1.0',
      _date:    new Date().toISOString(),
      salt:     bufToBase64(salt.buffer),
      iv:       bufToBase64(iv.buffer),
      data:     bufToBase64(cipher),
    };
  }

  // ── Decrypt a Cornerstone Secure Backup envelope with a PIN ──────────────
  async function decrypt(envelope, pin) {
    if (!envelope?._cs) throw new Error('Not a Cornerstone Secure Backup file.');
    if (!window.crypto?.subtle) throw new Error('Web Crypto API not available in this browser.');

    // R04: consistent — always work with ArrayBuffer, convert to Uint8Array at point of use
    const saltBuf  = base64ToBuf(envelope.salt);
    const ivBuf    = base64ToBuf(envelope.iv);
    const cipherBuf = base64ToBuf(envelope.data);
    const key      = await deriveKey(pin, saltBuf);

    try {
      // A02: explicit tagLength: 128
      const plain = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(ivBuf), tagLength: 128 },
        key,
        cipherBuf
      );
      const dec  = new TextDecoder();
      return JSON.parse(dec.decode(plain));
    } catch (err) {
      // S07: log original error for debugging, then surface a clean user-facing error
      console.warn('[Cornerstone] Decryption failed:', err.name, err.message);
      // AES-GCM authentication tag failure = wrong PIN or tampered file
      throw new Error('WRONG_PIN');
    }
  }

  // ── Check whether a parsed file object is an encrypted backup ────────────
  function isEncrypted(obj) {
    return obj && obj._cs === true && obj.salt && obj.iv && obj.data;
  }

  // ── Get the current PIN from localStorage ────────────────────────────────
  // Returns null if no PIN is set
  function getStoredPin() {
    return localStorage.getItem('ws_pin') || null;
  }

  // ── Check if PIN is set ───────────────────────────────────────────────────
  function hasPinSet() {
    return !!localStorage.getItem('ws_pin');
  }

  return { encrypt, decrypt, isEncrypted, getStoredPin, hasPinSet };

})();
