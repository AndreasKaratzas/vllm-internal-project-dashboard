/**
 * Entry-gate for the dashboard.
 *
 * Renders a full-screen overlay on load with three paths:
 *   1. Sign in — github_login + password checked against data/users.json
 *      (salted PBKDF2-SHA256 hashes, derived in-browser).
 *   2. Sign up — github_login + email + password + PAT. The PAT is used
 *      client-side to (a) verify the claimed login via GET /user, (b) commit
 *      the new user entry directly to data/users.json via the Contents API,
 *      and (c) open a lightweight ``signup-request`` issue as an audit
 *      record. The issue body carries ONLY name/email/requested_at — the
 *      salt, iteration count, and password hash never appear in a public
 *      issue. PAT stays in-browser; it is not re-used by any workflow.
 *   3. Continue as guest — writes a session flag and hides the protected
 *      tabs (Test Build + Ready Tickets + Admin).
 *
 * This is NOT real access control. The protected tabs contain no sensitive
 * data — they are gated against accidental clicks, not determined attackers.
 * A user with DevTools can set sessionStorage manually and bypass everything.
 * That's fine for the stated threat model.
 */
(function() {
  'use strict';

  var SESSION_KEY = 'vllm_dashboard_auth';
  // Legacy plaintext-PAT key — kept only so we can evict it on boot if a
  // prior build of the dashboard wrote one. All new token I/O uses the
  // encrypted ``__tokenVault``.
  var LEGACY_PAT_KEY = 'vllm_dashboard_gh_pat';
  var LEGACY_BK_KEY = 'vllm_dashboard_bk_token';
  var GATED_TABS = ['ci-testbuild', 'ci-ready', 'ci-admin'];
  var ADMIN_ONLY_TABS = ['ci-admin'];
  var DASHBOARD_REPO = 'AndreasKaratzas/vllm-ci-dashboard';

  // Evict any plaintext tokens an older version of the dashboard may have
  // written before the vault existed. Safe to run every load.
  try {
    sessionStorage.removeItem(LEGACY_PAT_KEY);
    sessionStorage.removeItem(LEGACY_BK_KEY);
  } catch (e) {}

  function getSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); }
    catch (e) { return null; }
  }
  function setSession(obj) {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(obj || null)); } catch (e) {}
  }
  function clearSession() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
  }

  window.__authGate = {
    isAuthed: function() {
      var s = getSession();
      return !!(s && s.mode === 'user' && s.login);
    },
    isAdmin: function() {
      var s = getSession();
      return !!(s && s.mode === 'user' && s.login && s.admin === true);
    },
    isGuest: function() {
      var s = getSession();
      return !!(s && s.mode === 'guest');
    },
    getLogin: function() {
      var s = getSession();
      return (s && s.login) || '';
    },
    signOut: function() {
      clearSession();
      // Lock the vault — wipes ciphertext and drops the in-memory AES key.
      try { if (window.__tokenVault) window.__tokenVault.lock(); } catch (e) {}
      try { sessionStorage.removeItem(LEGACY_PAT_KEY); } catch (e) {}
      try { sessionStorage.removeItem(LEGACY_BK_KEY); } catch (e) {}
      location.reload();
    },
    gatedTabs: GATED_TABS,
    adminOnlyTabs: ADMIN_ONLY_TABS,
  };

  // ── Crypto helpers (PBKDF2-SHA256) ─────────────────────────────────
  function _randHex(bytes) {
    var arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    var hex = '';
    for (var i = 0; i < arr.length; i++) {
      var h = arr[i].toString(16);
      if (h.length < 2) h = '0' + h;
      hex += h;
    }
    return hex;
  }
  function _hexToBytes(hex) {
    var out = new Uint8Array(hex.length / 2);
    for (var i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i*2, 2), 16);
    return out;
  }
  function _bytesToHex(buf) {
    var u = new Uint8Array(buf);
    var hex = '';
    for (var i = 0; i < u.length; i++) {
      var h = u[i].toString(16);
      if (h.length < 2) h = '0' + h;
      hex += h;
    }
    return hex;
  }

  async function derivePasswordHash(password, saltHex, iterations) {
    var enc = new TextEncoder();
    var key = await crypto.subtle.importKey(
      'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
    );
    var bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: _hexToBytes(saltHex), iterations: iterations, hash: 'SHA-256' },
      key, 256
    );
    return _bytesToHex(bits);
  }

  // GitHub Contents API round-trip: fetch users.json, upsert the caller's
  // entry (by github_login), PUT with the fetched SHA for optimistic
  // concurrency. One retry on 409 covers the common case where two signups
  // race. Salt/iterations/password_hash live HERE, never in the public
  // signup issue body.
  async function _commitUserEntry(pat, entry) {
    var url = 'https://api.github.com/repos/' + DASHBOARD_REPO + '/contents/data/users.json';
    var headers = {
      'Authorization': 'token ' + pat,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
    };

    async function _tryOnce() {
      var getResp = await fetch(url + '?ref=main', { headers: headers });
      if (!getResp.ok) {
        throw new Error('Could not read users.json (' + getResp.status + ').');
      }
      var meta = await getResp.json();
      var currentSha = meta.sha;
      var currentText = '';
      try {
        currentText = atob((meta.content || '').replace(/\n/g, ''));
      } catch (e) {
        throw new Error('users.json has unreadable base64 content.');
      }
      var db;
      try {
        db = JSON.parse(currentText);
      } catch (e) {
        throw new Error('users.json is not valid JSON.');
      }
      if (!db || typeof db !== 'object') db = {};
      if (!Array.isArray(db.users)) db.users = [];
      if (!db.admin) db.admin = 'AndreasKaratzas';

      var loginLower = entry.github_login.toLowerCase();
      db.users = db.users.filter(function(u) {
        return (u.github_login || '').toLowerCase() !== loginLower;
      });
      db.users.push(entry);
      db.users.sort(function(a, b) {
        var al = (a.github_login || '').toLowerCase();
        var bl = (b.github_login || '').toLowerCase();
        return al < bl ? -1 : al > bl ? 1 : 0;
      });

      var encoded = btoa(JSON.stringify(db, null, 2) + '\n');
      var putResp = await fetch(url, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify({
          message: 'signup: add @' + entry.github_login,
          content: encoded,
          sha: currentSha,
          branch: 'main',
        }),
      });
      if (putResp.status === 409 || putResp.status === 422) {
        return { retry: true };
      }
      if (!putResp.ok) {
        var txt = await putResp.text();
        throw new Error('users.json commit failed (' + putResp.status + '): ' + txt.slice(0, 160));
      }
      return { retry: false };
    }

    var outcome = await _tryOnce();
    if (outcome.retry) {
      outcome = await _tryOnce();
      if (outcome.retry) throw new Error('users.json is contended; please retry signup.');
    }
  }

  // Fetch users.json fresh off ``main`` so a brand-new signup can sign
  // in immediately. The Contents API is always real-time (no CDN cache)
  // and works unauthenticated on public repos; we fall back to
  // raw.githubusercontent.com (≤5-min CDN) and finally to the
  // gh-pages-served relative path (wait for deploy) if the API is
  // rate-limited.
  async function loadUsers() {
    var empty = { users: [], admin: 'AndreasKaratzas' };
    var bust = Math.floor(Date.now() / 1000);

    try {
      var r = await fetch(
        'https://api.github.com/repos/' + DASHBOARD_REPO + '/contents/data/users.json?ref=main&_=' + bust,
        { headers: { 'Accept': 'application/vnd.github+json' } }
      );
      if (r.ok) {
        var meta = await r.json();
        var text = atob((meta.content || '').replace(/\n/g, ''));
        return JSON.parse(text);
      }
    } catch (e) {}

    try {
      var r2 = await fetch(
        'https://raw.githubusercontent.com/' + DASHBOARD_REPO + '/main/data/users.json?_=' + bust
      );
      if (r2.ok) return await r2.json();
    } catch (e) {}

    try {
      var r3 = await fetch('data/users.json?_=' + bust);
      if (r3.ok) return await r3.json();
    } catch (e) {}

    return empty;
  }

  // ── Styles ─────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('auth-gate-styles')) return;
    var s = document.createElement('style');
    s.id = 'auth-gate-styles';
    s.textContent = `
      #auth-gate {
        position: fixed; inset: 0; z-index: 99999;
        background: rgba(8, 12, 18, 0.92); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        font-family: inherit; color: #e6edf3;
      }
      #auth-gate-card {
        background: #161b22; border: 1px solid #30363d; border-radius: 10px;
        padding: 28px 32px; width: min(92vw, 440px);
        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      }
      #auth-gate h2 { margin: 0 0 6px 0; font-size: 20px; }
      #auth-gate .sub { color: #8b949e; font-size: 13px; margin-bottom: 18px; }
      #auth-gate label { display: block; font-size: 11px; color: #8b949e;
        text-transform: uppercase; letter-spacing: 0.04em; margin: 10px 0 4px; }
      #auth-gate input { width: 100%; box-sizing: border-box; padding: 8px 10px;
        background: #0d1117; border: 1px solid #30363d; border-radius: 5px;
        color: #e6edf3; font-size: 13px; font-family: inherit; }
      #auth-gate input:focus { outline: none; border-color: #1f6feb; }
      #auth-gate .btn-row { display: flex; gap: 8px; margin-top: 14px; }
      #auth-gate button { padding: 8px 14px; border: none; border-radius: 5px;
        font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }
      #auth-gate button.primary { background: #238636; color: white; }
      #auth-gate button.primary:disabled { background: #1a1f26; color: #8b949e; cursor: wait; }
      #auth-gate button.link { background: transparent; color: #58a6ff; padding: 4px 0;
        border-radius: 0; font-weight: 500; text-decoration: underline; }
      #auth-gate button.guest { background: transparent; color: #8b949e;
        border: 1px solid #30363d; }
      #auth-gate .status { font-size: 12px; min-height: 16px; margin-top: 10px; }
      #auth-gate .status.err { color: #f85149; }
      #auth-gate .status.ok { color: #3fb950; }
      #auth-gate .status.info { color: #8b949e; }
      #auth-gate .divider { margin: 16px 0; border-top: 1px solid #30363d; }
      body.__auth-locked { overflow: hidden; }
      .__gate-hidden { display: none !important; }
    `;
    document.head.appendChild(s);
  }

  // ── Tab visibility ─────────────────────────────────────────────────
  function applyTabVisibility() {
    var session = getSession();
    var isAuthed = !!(session && session.mode === 'user');
    var isAdmin = !!(isAuthed && session.admin === true);

    GATED_TABS.forEach(function(id) {
      var btn = document.querySelector('[data-tab="' + id + '"]');
      var panel = document.getElementById('tab-' + id);
      var hide;
      if (ADMIN_ONLY_TABS.indexOf(id) !== -1) {
        hide = !isAdmin;
      } else {
        hide = !isAuthed;
      }
      if (btn) btn.classList.toggle('__gate-hidden', hide);
      if (panel) panel.classList.toggle('__gate-hidden', hide);
    });
  }

  // ── Overlay UI ─────────────────────────────────────────────────────
  function buildOverlay() {
    injectStyles();
    document.body.classList.add('__auth-locked');

    var gate = document.createElement('div');
    gate.id = 'auth-gate';
    var card = document.createElement('div');
    card.id = 'auth-gate-card';
    gate.appendChild(card);
    document.body.appendChild(gate);

    var mode = { kind: 'signin' }; // 'signin' | 'signup'

    function el(tag, attrs) {
      var n = document.createElement(tag);
      if (attrs) for (var k in attrs) {
        if (k === 'text') n.textContent = attrs[k];
        else if (k === 'html') n.innerHTML = attrs[k];
        else if (k === 'on') for (var ev in attrs.on) n.addEventListener(ev, attrs.on[ev]);
        else n.setAttribute(k, attrs[k]);
      }
      return n;
    }

    function renderSignin() {
      card.innerHTML = '';
      card.appendChild(el('h2', { text: 'vLLM CI Dashboard' }));
      card.appendChild(el('p', { class: 'sub', text: 'Sign in to access Test Build + Ready Tickets, or continue as guest.' }));

      card.appendChild(el('label', { text: 'GitHub username' }));
      var loginI = el('input', { autocomplete: 'username', placeholder: 'e.g. AndreasKaratzas' });
      card.appendChild(loginI);

      card.appendChild(el('label', { text: 'Password' }));
      var pwI = el('input', { type: 'password', autocomplete: 'current-password' });
      card.appendChild(pwI);

      var status = el('div', { class: 'status' });

      var row = el('div', { class: 'btn-row' });
      var signIn = el('button', { class: 'primary', text: 'Sign in' });
      var guest = el('button', { class: 'guest', text: 'Continue as guest' });
      row.appendChild(signIn);
      row.appendChild(guest);
      card.appendChild(row);
      card.appendChild(status);

      card.appendChild(el('div', { class: 'divider' }));
      var signupRow = el('div');
      signupRow.appendChild(el('span', { class: 'sub', text: "Don't have an account? " }));
      var signupBtn = el('button', { class: 'link', text: 'Sign up' });
      signupRow.appendChild(signupBtn);
      card.appendChild(signupRow);

      signIn.addEventListener('click', async function() {
        var login = (loginI.value || '').trim();
        var pw = pwI.value || '';
        if (!login || !pw) { status.className = 'status err'; status.textContent = 'Fill both fields.'; return; }
        signIn.disabled = true; status.className = 'status info'; status.textContent = 'Verifying…';
        try {
          var db = await loadUsers();
          // GitHub logins are case-insensitive; match accordingly so
          // "AndreasKaratzas" and "andreaskaratzas" reach the same entry.
          var loginLower = login.toLowerCase();
          var user = (db.users || []).find(function(u) { return (u.github_login || '').toLowerCase() === loginLower; });
          if (!user) throw new Error('No such user. Sign up first, or check the username.');
          login = user.github_login;
          var iters = user.iterations || 200000;
          var hash = await derivePasswordHash(pw, user.salt, iters);
          if (hash !== user.password_hash) throw new Error('Wrong password.');
          // Derive the AES-GCM wrap key now, while we still have the
          // cleartext password in hand. It's the only moment we can do
          // this — we never persist the password anywhere.
          if (window.__tokenVault) {
            try { await window.__tokenVault.unlock(pw, user.salt, iters, login); }
            catch (ve) { console.warn('vault unlock failed:', ve && ve.message); }
          }
          setSession({
            mode: 'user', login: login, email: user.email,
            admin: (db.admin && db.admin === login) ? true : false,
            signed_in_at: new Date().toISOString(),
          });
          teardown();
        } catch (e) {
          status.className = 'status err'; status.textContent = e.message || 'Sign-in failed.';
        } finally {
          signIn.disabled = false;
        }
      });

      guest.addEventListener('click', function() {
        setSession({ mode: 'guest', signed_in_at: new Date().toISOString() });
        teardown();
      });

      signupBtn.addEventListener('click', function() {
        mode.kind = 'signup';
        renderSignup();
      });
    }

    function renderSignup() {
      card.innerHTML = '';
      card.appendChild(el('h2', { text: 'Request access' }));
      card.appendChild(el('p', { class: 'sub', text: "Your sign-up commits a user entry to the dashboard repo and opens a lightweight audit issue — both via your GitHub PAT. PAT is only used client-side; it is not stored, and the issue body contains only your name, email, and request time." }));

      card.appendChild(el('label', { text: 'GitHub username' }));
      var loginI = el('input', { autocomplete: 'username' });
      card.appendChild(loginI);

      card.appendChild(el('label', { text: 'Work email (AMD address expected)' }));
      var emailI = el('input', { type: 'email', autocomplete: 'email' });
      card.appendChild(emailI);

      card.appendChild(el('label', { text: 'Password (min 12 chars)' }));
      var pwI = el('input', { type: 'password', autocomplete: 'new-password' });
      card.appendChild(pwI);

      card.appendChild(el('label', { text: 'Confirm password' }));
      var pw2I = el('input', { type: 'password', autocomplete: 'new-password' });
      card.appendChild(pw2I);

      card.appendChild(el('label', { text: 'GitHub PAT (repo scope) — for identity check and issue creation' }));
      var patI = el('input', { type: 'password', autocomplete: 'off', placeholder: 'ghp_…' });
      card.appendChild(patI);

      var status = el('div', { class: 'status' });

      var row = el('div', { class: 'btn-row' });
      var submit = el('button', { class: 'primary', text: 'Submit request' });
      var back = el('button', { class: 'guest', text: 'Back to sign in' });
      row.appendChild(submit); row.appendChild(back);
      card.appendChild(row);
      card.appendChild(status);

      back.addEventListener('click', function() { mode.kind = 'signin'; renderSignin(); });

      submit.addEventListener('click', async function() {
        var login = (loginI.value || '').trim();
        var email = (emailI.value || '').trim();
        var pw = pwI.value || '';
        var pw2 = pw2I.value || '';
        var pat = (patI.value || '').trim();

        if (!login || !email || !pw || !pat) {
          status.className = 'status err'; status.textContent = 'All fields are required.'; return;
        }
        if (pw.length < 12) { status.className = 'status err'; status.textContent = 'Password must be at least 12 characters.'; return; }
        if (pw !== pw2) { status.className = 'status err'; status.textContent = 'Passwords do not match.'; return; }
        if (!/^[A-Za-z0-9-]+$/.test(login)) { status.className = 'status err'; status.textContent = 'Invalid GitHub username.'; return; }
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { status.className = 'status err'; status.textContent = 'Invalid email.'; return; }

        submit.disabled = true;
        status.className = 'status info'; status.textContent = 'Verifying GitHub identity…';
        try {
          var meResp = await fetch('https://api.github.com/user', {
            headers: { 'Authorization': 'token ' + pat, 'Accept': 'application/vnd.github+json' }
          });
          if (!meResp.ok) throw new Error('PAT rejected by GitHub (' + meResp.status + ').');
          var me = await meResp.json();
          if ((me.login || '').toLowerCase() !== login.toLowerCase()) {
            throw new Error('PAT belongs to @' + me.login + ', not @' + login + '.');
          }

          status.textContent = 'Hashing password…';
          var salt = _randHex(16);
          var iterations = 200000;
          var hash = await derivePasswordHash(pw, salt, iterations);
          var requestedAt = new Date().toISOString();

          status.textContent = 'Updating users file…';
          // Commit the salt/iterations/hash directly into data/users.json
          // via the Contents API. Keeping this out of the public issue body
          // is deliberate — the issue becomes an audit record, not a
          // payload-bearing envelope.
          await _commitUserEntry(pat, {
            github_login: me.login,
            email: email,
            salt: salt,
            iterations: iterations,
            password_hash: hash,
            requested_at: requestedAt,
          });

          status.textContent = 'Opening audit issue…';
          var body = [
            '<!-- signup-request: audit record, no credentials -->',
            '```json',
            JSON.stringify({
              github_login: me.login,
              email: email,
              requested_at: requestedAt,
            }, null, 2),
            '```',
            '',
            'Requested by @' + me.login + '. The user entry was committed to `data/users.json` via the Contents API; this issue is an audit record and does not need to be closed automatically.',
          ].join('\n');

          var issueResp = await fetch('https://api.github.com/repos/' + DASHBOARD_REPO + '/issues', {
            method: 'POST',
            headers: {
              'Authorization': 'token ' + pat,
              'Accept': 'application/vnd.github+json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: 'signup: ' + me.login,
              body: body,
              labels: ['signup-request'],
            }),
          });
          if (!issueResp.ok) {
            var t = await issueResp.text();
            throw new Error('Issue creation failed (' + issueResp.status + '): ' + t.slice(0, 160));
          }
          var issue = await issueResp.json();

          status.className = 'status ok';
          status.textContent = 'Signed up. Audit issue #' + issue.number + ' opened; you can sign in now with your username + password.';
          submit.disabled = false;
          submit.textContent = 'Request submitted';
        } catch (e) {
          status.className = 'status err'; status.textContent = e.message || 'Signup failed.';
          submit.disabled = false;
        }
      });
    }

    renderSignin();
  }

  // A minimal "re-enter password to unlock saved tokens" overlay shown on
  // page reload when the session record is present (so we know who the
  // user is) but the vault's AES key is gone (because it only lived in
  // memory). This lets the dashboard keep encrypted tokens on disk without
  // ever committing them to long-lived, key-less storage.
  function buildUnlockOverlay(login) {
    injectStyles();
    document.body.classList.add('__auth-locked');

    var gate = document.createElement('div');
    gate.id = 'auth-gate';
    var card = document.createElement('div');
    card.id = 'auth-gate-card';
    gate.appendChild(card);
    document.body.appendChild(gate);

    card.innerHTML = '';
    var h2 = document.createElement('h2');
    h2.textContent = 'Welcome back, @' + login;
    card.appendChild(h2);

    var sub = document.createElement('p');
    sub.className = 'sub';
    sub.textContent = 'Re-enter your password to unlock saved GitHub / Buildkite tokens for this tab. We never store the password or keep the decryption key at rest.';
    card.appendChild(sub);

    var label = document.createElement('label');
    label.textContent = 'Password';
    card.appendChild(label);
    var pwI = document.createElement('input');
    pwI.type = 'password';
    pwI.autocomplete = 'current-password';
    card.appendChild(pwI);

    var status = document.createElement('div');
    status.className = 'status';
    var row = document.createElement('div');
    row.className = 'btn-row';
    var unlockBtn = document.createElement('button');
    unlockBtn.className = 'primary';
    unlockBtn.textContent = 'Unlock';
    var skipBtn = document.createElement('button');
    skipBtn.className = 'guest';
    skipBtn.textContent = 'Skip — use dashboard without tokens';
    row.appendChild(unlockBtn);
    row.appendChild(skipBtn);
    card.appendChild(row);
    card.appendChild(status);

    var divider = document.createElement('div');
    divider.className = 'divider';
    card.appendChild(divider);
    var signOutRow = document.createElement('div');
    var signOutBtn = document.createElement('button');
    signOutBtn.className = 'link';
    signOutBtn.textContent = 'Sign out';
    signOutRow.appendChild(signOutBtn);
    card.appendChild(signOutRow);

    signOutBtn.addEventListener('click', function() { window.__authGate.signOut(); });
    skipBtn.addEventListener('click', function() {
      // User declines to unlock: purge any leftover ciphertext so the next
      // login starts clean, and drop into the dashboard without tokens.
      try { if (window.__tokenVault) window.__tokenVault.lock(); } catch (e) {}
      teardown();
    });

    unlockBtn.addEventListener('click', async function() {
      var pw = pwI.value || '';
      if (!pw) { status.className = 'status err'; status.textContent = 'Enter your password.'; return; }
      unlockBtn.disabled = true;
      status.className = 'status info'; status.textContent = 'Verifying…';
      try {
        var db = await loadUsers();
        var loginLower = (login || '').toLowerCase();
        var user = (db.users || []).find(function(u) { return (u.github_login || '').toLowerCase() === loginLower; });
        if (!user) throw new Error('Account not found — sign in again.');
        var iters = user.iterations || 200000;
        var hash = await derivePasswordHash(pw, user.salt, iters);
        if (hash !== user.password_hash) throw new Error('Wrong password.');
        if (window.__tokenVault) {
          await window.__tokenVault.unlock(pw, user.salt, iters, login);
        }
        teardown();
      } catch (e) {
        status.className = 'status err'; status.textContent = e.message || 'Unlock failed.';
      } finally {
        unlockBtn.disabled = false;
      }
    });

    pwI.focus();
  }

  function teardown() {
    document.body.classList.remove('__auth-locked');
    var g = document.getElementById('auth-gate');
    if (g) g.remove();
    applyTabVisibility();
    // Notify tab scripts that auth state changed so they can re-render.
    document.dispatchEvent(new CustomEvent('auth:changed'));
  }

  function boot() {
    var s = getSession();
    if (s && s.mode === 'guest') {
      applyTabVisibility();
      return;
    }
    if (s && s.mode === 'user' && s.login) {
      // Session survived a reload; the in-memory vault key did not. If we
      // can see ciphertext in storage, or any downstream tab is going to
      // need a token, we need to re-derive the key — which requires the
      // password. Prompt for it, but give the user an out via Sign out.
      var hasCiphertext = false;
      try {
        for (var i = 0; i < sessionStorage.length; i++) {
          var k = sessionStorage.key(i);
          if (k && k.indexOf('vllm_dashboard_enc_') === 0) { hasCiphertext = true; break; }
        }
      } catch (e) {}
      if (hasCiphertext && window.__tokenVault && !window.__tokenVault.isUnlocked()) {
        buildUnlockOverlay(s.login);
        return;
      }
      applyTabVisibility();
      return;
    }
    buildOverlay();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Re-apply visibility on every DOM mutation to the nav (handles late tab registration).
  var navObserverStarted = false;
  function startNavObserver() {
    if (navObserverStarted) return;
    var nav = document.querySelector('#sidebar-nav') || document.querySelector('nav');
    if (!nav) return;
    navObserverStarted = true;
    var mo = new MutationObserver(function() { applyTabVisibility(); });
    mo.observe(nav, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startNavObserver);
  else startNavObserver();
})();
