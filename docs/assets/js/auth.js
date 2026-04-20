/**
 * Entry-gate for the dashboard — PAT-based auth, no passwords.
 *
 * Flow
 * ----
 *   1. Sign in — user pastes a GitHub PAT. We verify via GET api.github.com/user
 *      (which has CORS), match the returned numeric ``id`` against the allowlist
 *      in ``data/users.json``, and create a session. The PAT stays in memory
 *      only; reload re-prompts.
 *   2. Sign up — user supplies an email, we open a prefilled GitHub issue in a
 *      new tab. The user submits the issue from github.com (where they're
 *      already authenticated), and the ``user-signup.yml`` workflow verifies
 *      the author and appends them to ``data/users.json``. No PAT required at
 *      signup — GitHub's own auth is the anti-spoof anchor.
 *   3. Continue as guest — writes a session flag, hides the protected tabs.
 *
 * Why PAT-paste instead of OAuth Device Flow
 * ------------------------------------------
 * GitHub's OAuth endpoints (``/login/device/code``, ``/login/oauth/access_token``)
 * do not send CORS headers, so a pure static site cannot complete the device
 * flow from the browser. PAT-paste is the only static-site-compatible way to
 * prove "I am this GitHub user" without an auxiliary backend. ``users.json``
 * therefore stores only the allowlist (github_id + email + requested_at); no
 * password hashes, no salts, no iteration counts.
 *
 * Threat model
 * ------------
 * This is NOT strong access control. The protected tabs contain no sensitive
 * data — they are gated against accidental clicks, not determined attackers.
 * A user with DevTools can set sessionStorage manually and bypass everything.
 * That's fine for the stated threat model.
 */
(function() {
  'use strict';

  var SESSION_KEY = 'vllm_dashboard_auth';
  var GATED_TABS = ['ci-testbuild', 'ci-ready', 'ci-admin'];
  var ADMIN_ONLY_TABS = ['ci-admin'];
  var DASHBOARD_REPO = 'AndreasKaratzas/vllm-ci-dashboard';

  // Older builds wrote plaintext tokens under these keys. Evict on every
  // boot so a stale browser profile cannot leak them post-migration.
  var LEGACY_KEYS = [
    'vllm_dashboard_gh_pat',
    'vllm_dashboard_bk_token',
  ];
  try {
    LEGACY_KEYS.forEach(function(k) { sessionStorage.removeItem(k); });
  } catch (e) {}

  // In-memory PAT. Never persisted. Used by gated tabs for api.github.com
  // calls and by the vault for wrap-key derivation. Dropped on signOut/reload.
  var _currentPat = '';

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
    getGithubId: function() {
      var s = getSession();
      return (s && s.id) || 0;
    },
    // Exposes the in-memory PAT to gated-tab code. Returns '' if the PAT has
    // not been provided this tab-session (fresh reload before unlock).
    getGithubPat: function() {
      return _currentPat;
    },
    signOut: function() {
      _currentPat = '';
      clearSession();
      try { if (window.__tokenVault) window.__tokenVault.lock(); } catch (e) {}
      location.reload();
    },
    gatedTabs: GATED_TABS,
    adminOnlyTabs: ADMIN_ONLY_TABS,
    // Exposed so dashboard.js (hash nav), utils.js (CI sidebar clicks) and
    // each gated tab's lazy renderer (ci-admin, ci-testbuild, ci-ready)
    // can interrogate the session before rendering. Without this, those
    // callers have to duplicate the GATED_TABS/ADMIN_ONLY_TABS logic and
    // will drift.
    canAccessTab: function(id) { return canAccessTab(id); },
    // Callable from any handler that mutates ``.active`` so nav changes
    // can't leave a gated panel visible to an unprivileged viewer.
    applyTabVisibility: function() { applyTabVisibility(); },
  };

  // ── GitHub API: verify a PAT and return the caller's identity ──────
  async function verifyPat(pat) {
    var r = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': 'token ' + pat,
        'Accept': 'application/vnd.github+json',
      },
    });
    if (!r.ok) {
      if (r.status === 401) throw new Error('PAT rejected by GitHub — check the token or regenerate it.');
      throw new Error('GitHub /user returned ' + r.status + '.');
    }
    var me = await r.json();
    if (!me || typeof me.id !== 'number' || !me.login) {
      throw new Error('GitHub returned an unexpected /user payload.');
    }
    return me;
  }

  // Fetch users.json fresh off main so a brand-new signup (via the workflow)
  // is immediately visible. Contents API is always real-time; raw + relative
  // are fallbacks for when the API is rate-limited.
  async function loadUsers() {
    var empty = { admin_id: 0, users: [] };
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
        padding: 28px 32px; width: min(92vw, 460px);
        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      }
      #auth-gate h2 { margin: 0 0 6px 0; font-size: 20px; }
      #auth-gate .sub { color: #8b949e; font-size: 13px; margin-bottom: 18px; line-height: 1.5; }
      #auth-gate label { display: block; font-size: 11px; color: #8b949e;
        text-transform: uppercase; letter-spacing: 0.04em; margin: 10px 0 4px; }
      #auth-gate input { width: 100%; box-sizing: border-box; padding: 8px 10px;
        background: #0d1117; border: 1px solid #30363d; border-radius: 5px;
        color: #e6edf3; font-size: 13px; font-family: inherit; }
      #auth-gate input:focus { outline: none; border-color: #1f6feb; }
      #auth-gate .btn-row { display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
      #auth-gate button { padding: 8px 14px; border: none; border-radius: 5px;
        font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }
      #auth-gate button.primary { background: #238636; color: white; }
      #auth-gate button.primary:disabled { background: #1a1f26; color: #8b949e; cursor: wait; }
      #auth-gate button.link { background: transparent; color: #58a6ff; padding: 4px 0;
        border-radius: 0; font-weight: 500; text-decoration: underline; }
      #auth-gate button.guest { background: transparent; color: #8b949e;
        border: 1px solid #30363d; }
      #auth-gate .status { font-size: 12px; min-height: 16px; margin-top: 10px; line-height: 1.5; }
      #auth-gate .status.err { color: #f85149; }
      #auth-gate .status.ok { color: #3fb950; }
      #auth-gate .status.info { color: #8b949e; }
      #auth-gate .divider { margin: 16px 0; border-top: 1px solid #30363d; }
      #auth-gate .hint { color: #8b949e; font-size: 12px; margin-top: 6px; line-height: 1.5; }
      #auth-gate .hint code { background: #0d1117; padding: 1px 4px; border-radius: 3px; }
      #auth-gate .hint a { color: #58a6ff; }
      body.__auth-locked { overflow: hidden; }
      /* Belt-and-braces hide rule. 'display: none !important' is the main
         lever — it wins over '.tab-panel.active { display: block }' and
         '.nav-btn { display: flex }' because '!important' in an author
         stylesheet beats normal author rules regardless of specificity.
         'visibility: hidden' and 'pointer-events: none' are belt-and-
         braces: even if a rogue inline 'style="display:block"' ever beats
         the !important (inline + !important would), the element still can't
         take clicks or show content. 'position: absolute; left: -99999px'
         yanks it off-screen as a last resort.
         (Single quotes intentional — backticks here would terminate the
         enclosing JS template literal and break the whole script.) */
      .__gate-hidden {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
        position: absolute !important;
        left: -99999px !important;
      }
      /* Defence-in-depth: even if '__gate-hidden' is somehow stripped,
         the gated panels stay invisible to guests/unprivileged users
         until 'applyTabVisibility' reinstates the class on auth change. */
      body.__auth-guest #tab-ci-testbuild,
      body.__auth-guest #tab-ci-ready,
      body.__auth-guest #tab-ci-admin,
      body.__auth-guest [data-tab="ci-testbuild"],
      body.__auth-guest [data-tab="ci-ready"],
      body.__auth-guest [data-tab="ci-admin"],
      body.__auth-nonadmin #tab-ci-admin,
      body.__auth-nonadmin [data-tab="ci-admin"] {
        display: none !important;
      }
    `;
    document.head.appendChild(s);
  }

  // ── Tab visibility ─────────────────────────────────────────────────
  // Decide whether the current session may access a given tab id. Callers
  // use this both to (a) hide nav UI and (b) refuse to activate a tab
  // panel when someone navigates via hash or a click slips through.
  function canAccessTab(id) {
    if (GATED_TABS.indexOf(id) === -1) return true;   // unrestricted tab
    var session = getSession();
    var isAuthed = !!(session && session.mode === 'user' && session.login);
    if (ADMIN_ONLY_TABS.indexOf(id) !== -1) {
      return !!(isAuthed && session.admin === true);
    }
    return isAuthed;
  }

  function applyTabVisibility() {
    var session = getSession();
    var isAuthed = !!(session && session.mode === 'user' && session.login);
    var isAdmin = !!(isAuthed && session.admin === true);

    // Body-level markers drive the defense-in-depth CSS rule so gated
    // panels/buttons stay hidden even if ``__gate-hidden`` is stripped.
    var body = document.body;
    if (body) {
      body.classList.toggle('__auth-guest', !isAuthed);
      body.classList.toggle('__auth-nonadmin', !isAdmin);
      body.classList.toggle('__auth-admin', isAdmin);
    }

    GATED_TABS.forEach(function(id) {
      var hide = !canAccessTab(id);
      // Apply to EVERY element with the data-tab attribute — not just the
      // first — so dynamic CI sidebar buttons and any future duplicates
      // are all stamped. ``querySelector`` (singular) would miss dupes.
      var btns = document.querySelectorAll('[data-tab="' + id + '"]');
      for (var i = 0; i < btns.length; i++) {
        btns[i].classList.toggle('__gate-hidden', hide);
        if (hide) btns[i].setAttribute('aria-hidden', 'true');
        else btns[i].removeAttribute('aria-hidden');
      }
      var panel = document.getElementById('tab-' + id);
      if (panel) {
        panel.classList.toggle('__gate-hidden', hide);
        if (hide) {
          // If a previous navigation (URL hash, manual switchTab) left the
          // panel active for an unprivileged viewer, strip it — otherwise
          // the ``.tab-panel.active`` rule would try to show it.
          panel.classList.remove('active');
          panel.setAttribute('aria-hidden', 'true');
        } else {
          panel.removeAttribute('aria-hidden');
        }
      }
    });

    // If the currently-active nav button is gated for this viewer, bounce
    // them to the Home tab so they don't stare at a blank main area.
    if (body) {
      var activeBtn = document.querySelector('.nav-btn.active');
      if (activeBtn) {
        var targetId = activeBtn.getAttribute('data-tab');
        if (targetId && !canAccessTab(targetId)) {
          activeBtn.classList.remove('active');
          var home = document.querySelector('.nav-btn[data-tab="projects"]');
          var homePanel = document.getElementById('tab-projects');
          if (home) home.classList.add('active');
          if (homePanel) homePanel.classList.add('active');
          try { history.replaceState(null, '', '#projects'); } catch (e) {}
        }
      }
    }
  }

  // ── DOM helpers ────────────────────────────────────────────────────
  function _el(tag, attrs) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k === 'on') for (var ev in attrs.on) n.addEventListener(ev, attrs.on[ev]);
      else n.setAttribute(k, attrs[k]);
    }
    return n;
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

    function renderSignin() {
      card.innerHTML = '';
      card.appendChild(_el('h2', { text: 'vLLM CI Dashboard' }));
      card.appendChild(_el('p', {
        class: 'sub',
        text: 'Sign in with a GitHub personal access token, or continue as guest.'
      }));

      card.appendChild(_el('label', { text: 'GitHub PAT' }));
      var patI = _el('input', {
        type: 'password',
        autocomplete: 'off',
        placeholder: 'github_pat_… or ghp_…',
      });
      card.appendChild(patI);
      var hint = _el('div', { class: 'hint' });
      hint.innerHTML =
        'A fine-grained token with no extra scopes is enough — we only call ' +
        '<code>GET /user</code>. ' +
        '<a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">Generate one</a>.';
      card.appendChild(hint);

      var status = _el('div', { class: 'status' });

      var row = _el('div', { class: 'btn-row' });
      var signIn = _el('button', { class: 'primary', text: 'Sign in' });
      var guest = _el('button', { class: 'guest', text: 'Continue as guest' });
      row.appendChild(signIn);
      row.appendChild(guest);
      card.appendChild(row);
      card.appendChild(status);

      card.appendChild(_el('div', { class: 'divider' }));
      var signupRow = _el('div');
      signupRow.appendChild(_el('span', { class: 'sub', text: "Don't have an account? " }));
      var signupBtn = _el('button', { class: 'link', text: 'Request access' });
      signupRow.appendChild(signupBtn);
      card.appendChild(signupRow);

      signIn.addEventListener('click', async function() {
        var pat = (patI.value || '').trim();
        if (!pat) { status.className = 'status err'; status.textContent = 'Paste a PAT to sign in.'; return; }
        signIn.disabled = true;
        status.className = 'status info'; status.textContent = 'Verifying with GitHub…';
        try {
          var me = await verifyPat(pat);
          var db = await loadUsers();
          var user = (db.users || []).find(function(u) { return u.github_id === me.id; });
          if (!user) {
            throw new Error('@' + me.login + ' is not on the allowlist. Request access first.');
          }
          _currentPat = pat;
          setSession({
            mode: 'user',
            login: me.login,
            id: me.id,
            email: user.email,
            admin: (db.admin_id && db.admin_id === me.id) ? true : false,
            signed_in_at: new Date().toISOString(),
          });
          if (window.__tokenVault) {
            try { await window.__tokenVault.unlock(pat, me.id); }
            catch (ve) { console.warn('vault unlock failed:', ve && ve.message); }
          }
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

      signupBtn.addEventListener('click', renderSignup);
      patI.focus();
    }

    function renderSignup() {
      card.innerHTML = '';
      card.appendChild(_el('h2', { text: 'Request access' }));
      card.appendChild(_el('p', {
        class: 'sub',
        text:
          'We open a prefilled GitHub issue in a new tab. Submit it from your ' +
          'GitHub account — the workflow verifies the author, adds you to the ' +
          'allowlist, and comments back within ~30s.'
      }));

      card.appendChild(_el('label', { text: 'Work email (AMD address expected)' }));
      var emailI = _el('input', { type: 'email', autocomplete: 'email' });
      card.appendChild(emailI);

      var status = _el('div', { class: 'status' });
      var row = _el('div', { class: 'btn-row' });
      var submit = _el('button', { class: 'primary', text: 'Open GitHub issue' });
      var back = _el('button', { class: 'guest', text: 'Back to sign in' });
      row.appendChild(submit);
      row.appendChild(back);
      card.appendChild(row);
      card.appendChild(status);

      back.addEventListener('click', renderSignin);

      submit.addEventListener('click', function() {
        var email = (emailI.value || '').trim();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
          status.className = 'status err'; status.textContent = 'Invalid email.'; return;
        }
        var requestedAt = new Date().toISOString();
        var body = [
          '<!-- signup-request: audit record, no credentials -->',
          '```json',
          JSON.stringify({ email: email, requested_at: requestedAt }, null, 2),
          '```',
          '',
          'Requesting access to the vLLM CI dashboard. The workflow will verify ' +
          'my GitHub account and add me to `data/users.json` automatically.',
        ].join('\n');

        var url = 'https://github.com/' + DASHBOARD_REPO + '/issues/new'
          + '?labels=' + encodeURIComponent('signup-request')
          + '&title=' + encodeURIComponent('signup request')
          + '&body=' + encodeURIComponent(body);
        window.open(url, '_blank', 'noopener');

        status.className = 'status ok';
        status.innerHTML =
          'Opened GitHub in a new tab. Submit the issue, wait ~30s for the ' +
          'workflow to run, then click <b>Back to sign in</b> and paste your PAT.';
      });

      emailI.focus();
    }

    renderSignin();
  }

  // Shown on reload when the session record is present but the in-memory
  // PAT is gone. Re-prompts for the PAT to re-derive the vault key.
  function buildUnlockOverlay(login) {
    injectStyles();
    document.body.classList.add('__auth-locked');

    var gate = document.createElement('div');
    gate.id = 'auth-gate';
    var card = document.createElement('div');
    card.id = 'auth-gate-card';
    gate.appendChild(card);
    document.body.appendChild(gate);

    card.appendChild(_el('h2', { text: 'Welcome back, @' + login }));
    card.appendChild(_el('p', {
      class: 'sub',
      text:
        'Re-enter your GitHub PAT to unlock saved Buildkite / HF tokens for ' +
        'this tab. The PAT is never stored on disk.'
    }));

    card.appendChild(_el('label', { text: 'GitHub PAT' }));
    var patI = _el('input', {
      type: 'password',
      autocomplete: 'off',
      placeholder: 'github_pat_… or ghp_…',
    });
    card.appendChild(patI);

    var status = _el('div', { class: 'status' });
    var row = _el('div', { class: 'btn-row' });
    var unlockBtn = _el('button', { class: 'primary', text: 'Unlock' });
    var skipBtn = _el('button', { class: 'guest', text: 'Skip — use dashboard without tokens' });
    row.appendChild(unlockBtn);
    row.appendChild(skipBtn);
    card.appendChild(row);
    card.appendChild(status);

    card.appendChild(_el('div', { class: 'divider' }));
    var signOutRow = _el('div');
    var signOutBtn = _el('button', { class: 'link', text: 'Sign out' });
    signOutRow.appendChild(signOutBtn);
    card.appendChild(signOutRow);

    signOutBtn.addEventListener('click', function() { window.__authGate.signOut(); });
    skipBtn.addEventListener('click', function() {
      try { if (window.__tokenVault) window.__tokenVault.lock(); } catch (e) {}
      teardown();
    });

    unlockBtn.addEventListener('click', async function() {
      var pat = (patI.value || '').trim();
      if (!pat) { status.className = 'status err'; status.textContent = 'Paste a PAT.'; return; }
      unlockBtn.disabled = true;
      status.className = 'status info'; status.textContent = 'Verifying with GitHub…';
      try {
        var me = await verifyPat(pat);
        var session = getSession() || {};
        if (session.id && me.id !== session.id) {
          throw new Error('PAT belongs to @' + me.login + ', not the signed-in account.');
        }
        _currentPat = pat;
        if (window.__tokenVault) {
          await window.__tokenVault.unlock(pat, me.id);
        }
        teardown();
      } catch (e) {
        status.className = 'status err'; status.textContent = e.message || 'Unlock failed.';
      } finally {
        unlockBtn.disabled = false;
      }
    });

    patI.focus();
  }

  function teardown() {
    document.body.classList.remove('__auth-locked');
    var g = document.getElementById('auth-gate');
    if (g) g.remove();
    applyTabVisibility();
    document.dispatchEvent(new CustomEvent('auth:changed'));
  }

  function boot() {
    injectStyles();
    var s = getSession();
    // Always stamp the body classes + __gate-hidden before anything else,
    // so the gated panels/buttons are hidden even while the sign-in
    // overlay is loading or if a user inspects the DOM via devtools
    // before making a choice. teardown()/applyTabVisibility() will run
    // again once the user picks guest vs. signed-in.
    applyTabVisibility();
    if (s && s.mode === 'guest') {
      applyTabVisibility();
      return;
    }
    if (s && s.mode === 'user' && s.login) {
      // Session survived reload; PAT + wrap key did not. Prompt for PAT
      // if any ciphertext is in storage, otherwise let them into the
      // dashboard and ask when they actually need a token.
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

  // Observe BOTH the sidebar (nav buttons appear dynamically) AND the
  // main content area (tab panels get ``.active`` class toggled on nav).
  // Without observing class changes on tab-panels, a rogue script — or
  // ``switchTab`` being called with the nav observer asleep — could
  // leave a gated panel with ``.active`` and without ``__gate-hidden``.
  var navObserverStarted = false;
  function startNavObserver() {
    if (navObserverStarted) return;
    var nav = document.querySelector('#sidebar-nav') || document.querySelector('nav');
    var main = document.getElementById('main-content');
    if (!nav && !main) return;
    navObserverStarted = true;
    var reapply = function() { applyTabVisibility(); };
    var mo = new MutationObserver(reapply);
    if (nav) mo.observe(nav, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
    if (main) mo.observe(main, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
    // Also react to hash changes — hash nav can bypass click handlers.
    window.addEventListener('hashchange', reapply);
    // And to session changes in another tab of the same browser profile.
    window.addEventListener('storage', function(e) {
      if (e && e.key === SESSION_KEY) reapply();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startNavObserver);
  else startNavObserver();

  // Capture-phase click guard. Any click that would land on a gated nav
  // button (directly or via a bubbled click on a child <svg>/<span>) is
  // cancelled here, before the button's own click handler fires. This is
  // the final belt in case ``__gate-hidden`` is stripped by a stylesheet
  // edit or the class observer falls behind by a frame.
  function _clickGuard(e) {
    var t = e.target;
    while (t && t.nodeType === 1) {
      if (t.classList && t.classList.contains('nav-btn')) {
        var id = t.getAttribute('data-tab');
        if (id && !canAccessTab(id)) {
          e.stopPropagation();
          e.preventDefault();
          // Nudge visibility so the offending button also disappears.
          applyTabVisibility();
          return;
        }
        return;
      }
      t = t.parentNode;
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      document.addEventListener('click', _clickGuard, true);
    });
  } else {
    document.addEventListener('click', _clickGuard, true);
  }
})();
