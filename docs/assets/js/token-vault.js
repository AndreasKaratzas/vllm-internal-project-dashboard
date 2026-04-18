/**
 * Token vault — AES-GCM envelope for user-scoped secrets in the browser.
 *
 * Threat model (what this actually protects against)
 * --------------------------------------------------
 * The concrete risks for a single-page dashboard that persists a GitHub PAT
 * and a Buildkite token in the browser are:
 *
 *   1. An attacker dumps ``sessionStorage`` via DevTools, a malicious browser
 *      extension with storage-read permission, or a stale browser profile.
 *   2. A later-loaded script on the same origin reads ``sessionStorage``
 *      directly (e.g. a vendored analytics snippet that starts doing
 *      something it shouldn't).
 *   3. A network-level adversary intercepts a request in flight — this is
 *      mitigated by TLS + the CSP ``connect-src`` allowlist, not by us.
 *
 * For (1) and (2), storing raw tokens means a single key lookup dumps every
 * secret in cleartext. The vault instead stores AES-GCM ciphertext and keeps
 * the unwrap key only in a closure variable — so a process that can read
 * ``sessionStorage`` but cannot attach a debugger to this closure gets
 * opaque bytes.
 *
 * What this does NOT protect against
 * ----------------------------------
 *   * Live XSS on the dashboard origin. Any script already executing in this
 *     window can call ``window.__tokenVault.get(...)`` and receive plaintext.
 *     Mitigation is CSP (index.html) + reviewing every JS dependency.
 *   * A determined local attacker with the physical machine. They can
 *     install an extension that reads process memory before the vault locks.
 *   * Coercion — if someone has your password they can re-derive the unwrap
 *     key. Vault encryption is *not* a substitute for password secrecy.
 *
 * Key derivation
 * --------------
 *   loginHash = PBKDF2(pw, saltBytes,            iters, 256, SHA-256)
 *   wrapKey   = PBKDF2(pw, saltBytes || "vault", iters, 256, SHA-256)
 *
 * The login hash is public (it's stored in ``data/users.json``). If we reused
 * it as the wrap key, *anyone* with the users.json and the ciphertext could
 * decrypt. The "|vault" suffix is a domain separator that forces an attacker
 * to run a second PBKDF2 pass *even if* they already know the password hash.
 * That doubles brute-force cost and guarantees login-hash ≠ wrap-key.
 *
 * Ciphertext format
 * -----------------
 *   sessionStorage["vllm_dashboard_enc_<name>"] =
 *     JSON.stringify({ v: 1, iv: <12-byte hex>, ct: <base64 ciphertext+tag> })
 *
 * Every ``put`` picks a fresh 12-byte IV via ``crypto.getRandomValues``;
 * never reuse an (iv, key) pair under AES-GCM or you leak plaintext xor.
 */
(function () {
  'use strict';

  var ENC_PREFIX = 'vllm_dashboard_enc_';
  var VAULT_VERSION = 1;

  // Unwrap key (CryptoKey) + derivation salt, held only in memory. Cleared
  // by ``lock()`` and by the browser when the tab closes.
  var _wrapKey = null;
  var _unlockedFor = '';  // username this key was derived for (informational)

  // ── byte helpers ────────────────────────────────────────────────────
  function _hexToBytes(hex) {
    var out = new Uint8Array(hex.length / 2);
    for (var i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
    return out;
  }
  function _bytesToHex(buf) {
    var u = new Uint8Array(buf), s = '';
    for (var i = 0; i < u.length; i++) {
      var h = u[i].toString(16);
      s += (h.length < 2 ? '0' : '') + h;
    }
    return s;
  }
  function _bytesToB64(buf) {
    var u = new Uint8Array(buf), bin = '';
    for (var i = 0; i < u.length; i++) bin += String.fromCharCode(u[i]);
    return btoa(bin);
  }
  function _b64ToBytes(b64) {
    var bin = atob(b64);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  // ── KDF: password + salt → AES-GCM 256 CryptoKey ────────────────────
  async function _deriveWrapKey(password, saltHex, iterations) {
    var enc = new TextEncoder();
    var saltBytes = _hexToBytes(saltHex);
    var context = enc.encode('|vault');
    var domainSalt = new Uint8Array(saltBytes.length + context.length);
    domainSalt.set(saltBytes, 0);
    domainSalt.set(context, saltBytes.length);

    var material = await crypto.subtle.importKey(
      'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: domainSalt, iterations: iterations, hash: 'SHA-256' },
      material,
      { name: 'AES-GCM', length: 256 },
      false,           // non-extractable — key cannot be read out of WebCrypto
      ['encrypt', 'decrypt']
    );
  }

  // ── Public API ──────────────────────────────────────────────────────
  async function unlock(password, saltHex, iterations, loginHint) {
    if (!password || !saltHex) throw new Error('vault.unlock: password and salt required');
    var iters = iterations | 0;
    if (iters < 50000) throw new Error('vault.unlock: iterations too low');
    _wrapKey = await _deriveWrapKey(password, saltHex, iters);
    _unlockedFor = loginHint || '';
  }

  function lock() {
    _wrapKey = null;
    _unlockedFor = '';
    // Also wipe any ciphertext in sessionStorage — a locked vault should
    // not leave behind records that a future unlock could read.
    try {
      var toRemove = [];
      for (var i = 0; i < sessionStorage.length; i++) {
        var k = sessionStorage.key(i);
        if (k && k.indexOf(ENC_PREFIX) === 0) toRemove.push(k);
      }
      for (var j = 0; j < toRemove.length; j++) sessionStorage.removeItem(toRemove[j]);
    } catch (e) { /* sessionStorage unavailable — nothing to clear */ }
  }

  function isUnlocked() { return _wrapKey !== null; }
  function unlockedFor() { return _unlockedFor; }

  async function put(name, value) {
    if (!_wrapKey) throw new Error('vault.put: vault is locked');
    if (!name || typeof name !== 'string') throw new Error('vault.put: name required');
    if (value == null || value === '') { clear(name); return; }

    var iv = new Uint8Array(12);
    crypto.getRandomValues(iv);
    var ct = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      _wrapKey,
      new TextEncoder().encode(String(value))
    );
    var record = { v: VAULT_VERSION, iv: _bytesToHex(iv), ct: _bytesToB64(ct) };
    try { sessionStorage.setItem(ENC_PREFIX + name, JSON.stringify(record)); }
    catch (e) { throw new Error('vault.put: sessionStorage write failed'); }
  }

  async function get(name) {
    if (!_wrapKey) return '';  // locked → no access; callers decide how to prompt
    var raw;
    try { raw = sessionStorage.getItem(ENC_PREFIX + name); } catch (e) { return ''; }
    if (!raw) return '';
    var record;
    try { record = JSON.parse(raw); } catch (e) { return ''; }
    if (!record || record.v !== VAULT_VERSION || !record.iv || !record.ct) return '';
    try {
      var pt = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: _hexToBytes(record.iv) },
        _wrapKey,
        _b64ToBytes(record.ct)
      );
      return new TextDecoder('utf-8').decode(pt);
    } catch (e) {
      // Tampered ciphertext or wrong key — treat as empty, drop the record
      // so a subsequent put() starts fresh rather than failing silently.
      try { sessionStorage.removeItem(ENC_PREFIX + name); } catch (_) {}
      return '';
    }
  }

  function clear(name) {
    try { sessionStorage.removeItem(ENC_PREFIX + name); } catch (e) {}
  }

  function has(name) {
    try { return sessionStorage.getItem(ENC_PREFIX + name) != null; }
    catch (e) { return false; }
  }

  // Decrypt a ``{v, iv, ct}`` record produced externally — e.g. by
  // ``scripts/vllm/encrypt_roster.py`` — using the same wrap key that
  // unwraps ``sessionStorage`` entries. Lets us gate publicly-hosted
  // ciphertext behind the admin's password without re-deriving a key.
  // Returns '' on failure (locked, malformed, or wrong key) so callers
  // can treat an unreadable blob as "no data" rather than crashing.
  async function decryptExternal(record) {
    if (!_wrapKey) return '';
    if (!record || record.v !== VAULT_VERSION || !record.iv || !record.ct) return '';
    try {
      var pt = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: _hexToBytes(record.iv) },
        _wrapKey,
        _b64ToBytes(record.ct)
      );
      return new TextDecoder('utf-8').decode(pt);
    } catch (e) {
      return '';
    }
  }

  window.__tokenVault = {
    unlock: unlock,
    lock: lock,
    isUnlocked: isUnlocked,
    unlockedFor: unlockedFor,
    put: put,
    get: get,
    clear: clear,
    has: has,
    decryptExternal: decryptExternal,
    VERSION: VAULT_VERSION,
  };
})();
