/**
 * Admin tab — visible only when the session identifies as the admin login
 * declared in ``data/users.json``.
 *
 * Lists signed-up users and lets the admin delete one, which — because we
 * have no backend — works by committing a new ``data/users.json`` to main
 * with that user removed. The commit is done via the GitHub contents API
 * using the admin's *own* PAT (reused from the shared session-storage key).
 * We never submit writes using any shared / repo-held token.
 *
 * All other users (non-admins, guests) never see this tab because
 * ``auth.js`` stamps ``__gate-hidden`` on the nav button + panel.
 */
(function() {
  const _s = getComputedStyle(document.documentElement);
  const C = {
    g: _s.getPropertyValue('--accent-green').trim() || '#238636',
    y: _s.getPropertyValue('--accent-orange').trim() || '#d29922',
    r: _s.getPropertyValue('--badge-closed').trim() || '#da3633',
    b: _s.getPropertyValue('--accent-blue').trim() || '#1f6feb',
    m: _s.getPropertyValue('--text-muted').trim() || '#8b949e',
    t: _s.getPropertyValue('--text').trim() || '#e6edf3',
    bg: _s.getPropertyValue('--card-bg').trim() || '#161b22',
    bd: _s.getPropertyValue('--border').trim() || '#30363d',
  };
  const h = el;

  const DASHBOARD_REPO = 'AndreasKaratzas/vllm-ci-dashboard';
  const USERS_PATH = 'data/users.json';
  const PAT_NAME = 'gh_pat';

  function _vault() { return window.__tokenVault; }
  function vaultReady() { const v = _vault(); return !!(v && v.isUnlocked()); }
  async function getPAT() {
    const v = _vault();
    if (!v || !v.isUnlocked()) return '';
    try { return await v.get(PAT_NAME); } catch (e) { return ''; }
  }
  async function setPAT(value) {
    const v = _vault();
    if (!v || !v.isUnlocked()) throw new Error('Vault is locked. Sign in with your password to save tokens.');
    if (!value) { v.clear(PAT_NAME); return; }
    await v.put(PAT_NAME, value);
  }

  async function gh(pat, path, opts) {
    opts = opts || {};
    const url = path.startsWith('http') ? path : ('https://api.github.com' + path);
    const headers = Object.assign({
      'Accept': 'application/vnd.github+json',
      'Authorization': 'token ' + pat,
      'X-GitHub-Api-Version': '2022-11-28',
    }, opts.headers || {});
    const r = await fetch(url, Object.assign({}, opts, { headers }));
    const text = await r.text();
    let data = null; try { data = text ? JSON.parse(text) : null; } catch (e) {}
    return { ok: r.ok, status: r.status, data, text };
  }

  async function loadUsers() {
    try {
      const r = await fetch('data/users.json?_=' + Math.floor(Date.now()/1000));
      if (!r.ok) return { users: [], admin: 'AndreasKaratzas' };
      return await r.json();
    } catch (e) {
      return { users: [], admin: 'AndreasKaratzas' };
    }
  }

  function _b64EncodeUtf8(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  async function writeUsersJson(pat, nextDb, commitMessage) {
    // Contents API requires the current SHA to replace a file.
    const meta = await gh(pat, `/repos/${DASHBOARD_REPO}/contents/${USERS_PATH}?ref=main`);
    if (!meta.ok) return { ok: false, status: meta.status, error: 'Could not fetch existing users.json sha' };
    const sha = meta.data && meta.data.sha;
    const body = {
      message: commitMessage,
      content: _b64EncodeUtf8(JSON.stringify(nextDb, null, 2) + '\n'),
      sha: sha,
      branch: 'main',
    };
    const r = await gh(pat, `/repos/${DASHBOARD_REPO}/contents/${USERS_PATH}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return r;
  }

  async function verifyAdminPat(pat, expectedLogin) {
    const me = await gh(pat, '/user');
    if (!me.ok) return { ok: false, reason: `PAT rejected (HTTP ${me.status}).` };
    const login = me.data && me.data.login;
    if (!login) return { ok: false, reason: 'Could not resolve login from PAT.' };
    if (login.toLowerCase() !== (expectedLogin || '').toLowerCase()) {
      return { ok: false, reason: `PAT belongs to @${login}, not admin @${expectedLogin}.` };
    }
    return { ok: true, login };
  }

  function renderAccessDenied(container, reason) {
    container.innerHTML = '';
    container.append(h('h2', { text: 'Admin', style: { marginBottom: '6px' } }));
    const card = h('div', { style: { background: C.bg, border: `1px solid ${C.bd}`, borderRadius: '6px', padding: '14px', marginTop: '10px' } });
    card.append(h('strong', { text: 'Admin access required', style: { color: C.r } }));
    card.append(h('p', { text: reason || 'Sign in as the dashboard admin to manage users.', style: { color: C.m, marginTop: '6px', fontSize: '13px' } }));
    container.append(card);
  }

  function renderPatBanner(container, state) {
    const card = h('div', { style: { background: C.bg, border: `1px solid ${C.bd}`, borderRadius: '6px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px' } });
    card.append(h('strong', { text: 'Your GitHub PAT', style: { color: C.t } }));
    card.append(h('div', { text: 'User deletion rewrites data/users.json on main using your PAT (classic, repo scope). The admin\'s token is never held server-side — it lives AES-GCM-encrypted in this tab\'s sessionStorage and the decryption key lives only in memory.', style: { color: C.m, marginTop: '4px', marginBottom: '6px', fontSize: '12px' } }));

    const row = h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } });
    const input = h('input', { attr: { type: 'password', placeholder: 'ghp_…' }, style: { flex: '1', padding: '6px', background: '#0d1117', color: C.t, border: `1px solid ${C.bd}`, borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px' } });
    const saveBtn = h('button', { text: 'Verify & save', style: { padding: '6px 10px', background: C.b, color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' } });
    const clearBtn = h('button', { text: 'Clear', style: { padding: '6px 10px', background: '#21262d', color: C.t, border: `1px solid ${C.bd}`, borderRadius: '4px', cursor: 'pointer', fontSize: '12px' } });

    const status = h('div', { style: { fontSize: '11px', color: C.m, marginTop: '6px' } });

    if (!vaultReady()) {
      status.textContent = 'Vault locked — sign in with your password to save a PAT here.';
      status.style.color = C.y;
      saveBtn.disabled = true;
    } else {
      const v = _vault();
      if (v.has(PAT_NAME)) {
        status.textContent = 'A PAT is already saved in the encrypted vault. Paste a new value to replace it.';
        status.style.color = C.m;
      }
    }

    saveBtn.addEventListener('click', async () => {
      const pat = input.value.trim();
      if (!pat) return;
      status.textContent = 'Verifying…';
      status.style.color = C.m;
      const v = await verifyAdminPat(pat, state.db.admin || '');
      if (v.ok) {
        try { await setPAT(pat); }
        catch (e) { status.textContent = e.message || 'Could not save PAT.'; status.style.color = C.r; return; }
        state.patVerified = true;
        status.textContent = `PAT verified as @${v.login} and encrypted in vault.`;
        status.style.color = C.g;
        input.value = '';
      } else {
        state.patVerified = false;
        status.textContent = v.reason;
        status.style.color = C.r;
      }
    });
    clearBtn.addEventListener('click', async () => {
      try { await setPAT(''); } catch (e) {}
      input.value = '';
      state.patVerified = false;
      status.textContent = 'PAT cleared from vault.';
      status.style.color = C.m;
    });

    row.append(input, saveBtn, clearBtn);
    card.append(row);
    card.append(status);
    container.append(card);
  }

  function renderUsersTable(container, state) {
    const users = state.db.users || [];
    const card = h('div', { style: { background: C.bg, border: `1px solid ${C.bd}`, borderRadius: '8px', padding: '14px 18px' } });
    card.append(h('h3', { text: `Users (${users.length})`, style: { marginTop: 0, fontSize: '15px' } }));
    if (!users.length) {
      card.append(h('p', { text: 'No signed-up users yet. Ask your engineers to use the entry-gate signup form.', style: { color: C.m, fontSize: '13px' } }));
      container.append(card);
      return;
    }

    const table = h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' } });
    const thead = h('thead');
    const hr = h('tr');
    ['GitHub login', 'Email', 'Signed up', 'Action'].forEach((c) => {
      hr.append(h('th', { text: c, style: { textAlign: 'left', padding: '6px 8px', borderBottom: `1px solid ${C.bd}`, color: C.m, fontWeight: '600', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.04em' } }));
    });
    thead.append(hr);
    table.append(thead);

    const tbody = h('tbody');
    for (const u of users) {
      const isAdmin = (state.db.admin || '').toLowerCase() === (u.github_login || '').toLowerCase();
      const tr = h('tr');
      tr.append(h('td', { text: u.github_login + (isAdmin ? ' (admin)' : ''), style: { padding: '6px 8px', borderBottom: `1px solid ${C.bd}`, fontFamily: 'monospace', fontSize: '11px' } }));
      tr.append(h('td', { text: u.email || '—', style: { padding: '6px 8px', borderBottom: `1px solid ${C.bd}` } }));
      tr.append(h('td', { text: (u.requested_at || '').slice(0, 10) || '—', style: { padding: '6px 8px', borderBottom: `1px solid ${C.bd}`, color: C.m } }));

      const actionCell = h('td', { style: { padding: '6px 8px', borderBottom: `1px solid ${C.bd}` } });
      if (isAdmin) {
        actionCell.append(h('span', { text: '— protected —', style: { color: C.m, fontSize: '11px' } }));
      } else {
        const btn = h('button', {
          text: 'Delete',
          style: { padding: '4px 10px', background: C.r, color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' },
        });
        btn.addEventListener('click', async () => {
          if (!state.patVerified) { alert('Verify your PAT first.'); return; }
          if (!confirm(`Delete user @${u.github_login}? This commits a new data/users.json to main.`)) return;
          btn.disabled = true;
          btn.textContent = 'Deleting…';
          const next = Object.assign({}, state.db, {
            users: (state.db.users || []).filter((x) => x.github_login !== u.github_login),
          });
          const pat = await getPAT();
          if (!pat) { alert('No PAT available — vault may be locked.'); btn.disabled = false; btn.textContent = 'Delete'; return; }
          const r = await writeUsersJson(pat, next, `admin: remove user ${u.github_login}`);
          if (r.ok) {
            state.db = next;
            render();
          } else {
            alert(`Delete failed: HTTP ${r.status}\n${(r.text || '').slice(0, 200)}`);
            btn.disabled = false;
            btn.textContent = 'Delete';
          }
        });
        actionCell.append(btn);
      }
      tr.append(actionCell);
      tbody.append(tr);
    }
    table.append(tbody);
    card.append(table);
    container.append(card);
  }

  async function render() {
    const container = document.getElementById('ci-admin-view');
    if (!container) return;

    // Auth guards: only the signed-in admin sees this tab. A non-admin who
    // manually sets sessionStorage would still hit the API wall when trying
    // to commit — deletion is protected by GitHub's own repo permissions.
    const gate = window.__authGate;
    if (!gate || !gate.isAuthed()) {
      renderAccessDenied(container, 'Sign in first.');
      return;
    }
    if (!gate.isAdmin()) {
      renderAccessDenied(container, `You're signed in as @${gate.getLogin()}, not the dashboard admin.`);
      return;
    }

    container.innerHTML = '';
    container.append(h('h2', { text: 'Admin', style: { marginBottom: '6px' } }));
    container.append(h('p', { text: 'Manage dashboard users. Deletions commit a new data/users.json to main using your GitHub PAT.', style: { color: C.m, marginTop: 0, marginBottom: '14px', fontSize: '13px' } }));

    const db = await loadUsers();
    const state = { db, patVerified: false, render };
    renderPatBanner(container, state);
    renderUsersTable(container, state);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('[data-tab="ci-admin"]');
    if (btn) setTimeout(render, 50);
  });
  document.addEventListener('auth:changed', render);
})();
