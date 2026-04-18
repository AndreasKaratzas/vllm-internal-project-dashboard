/**
 * Ready Tickets — dashboard view for the automated nightly-failure ticket sync.
 *
 * Reads the plan file written by ``scripts/vllm/sync_ready_tickets.py``
 * (``data/vllm/ci/ready_tickets.json``) and renders: metrics table, assignment
 * control, dry-run banner. Assignment requires the user to supply a GitHub PAT
 * and be an admin of the dashboard repo — we gate the control client-side by
 * calling ``GET /repos/{owner}/{repo}/collaborators/{username}/permission``.
 *
 * Assignments land on the GitHub issue itself via ``POST /issues/{n}/assignees``.
 * We reuse the dashboard's session-storage PAT (same key the Test Build tab uses)
 * so the user doesn't retype it.
 */
(function() {
  const _s = getComputedStyle(document.documentElement);
  const C = {
    g:_s.getPropertyValue('--accent-green').trim()||'#238636',
    y:_s.getPropertyValue('--accent-orange').trim()||'#d29922',
    r:_s.getPropertyValue('--badge-closed').trim()||'#da3633',
    b:_s.getPropertyValue('--accent-blue').trim()||'#1f6feb',
    p:_s.getPropertyValue('--accent-purple').trim()||'#8957e5',
    m:_s.getPropertyValue('--text-muted').trim()||'#8b949e',
    t:_s.getPropertyValue('--text').trim()||'#e6edf3',
    bg:_s.getPropertyValue('--card-bg').trim()||'#161b22',
    bd:_s.getPropertyValue('--border').trim()||'#30363d',
  };
  const h = el;

  const DASHBOARD_REPO = 'AndreasKaratzas/vllm-ci-dashboard';
  // Tokens live encrypted in window.__tokenVault; the unwrap key is derived
  // from the signed-in user's password and held only in memory.
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

  async function ghFetch(pat, path, opts) {
    const url = path.startsWith('http') ? path : ('https://api.github.com' + path);
    const headers = Object.assign({
      'Accept': 'application/vnd.github+json',
      'Authorization': 'token ' + pat,
      'X-GitHub-Api-Version': '2022-11-28',
    }, (opts && opts.headers) || {});
    const resp = await fetch(url, Object.assign({}, opts || {}, { headers }));
    return resp;
  }
  async function ghJson(pat, path, opts) {
    const r = await ghFetch(pat, path, opts);
    const text = await r.text();
    let data = null; try { data = text ? JSON.parse(text) : null; } catch (e) {}
    return { ok: r.ok, status: r.status, data, text };
  }

  async function loadPlan() {
    try {
      const r = await fetch('data/vllm/ci/ready_tickets.json?_=' + Math.floor(Date.now()/1000));
      if (!r.ok) return null;
      return await r.json();
    } catch (e) { return null; }
  }

  // The engineer roster used to ride along in ``ready_tickets.json`` as
  // plaintext ``{github_login, display_name}``. That file is served
  // publicly on gh-pages, so we now ship the roster as AES-GCM ciphertext
  // at ``engineers.enc.json`` — generated locally by
  // ``scripts/vllm/encrypt_roster.py`` with the admin's vault key. Only a
  // signed-in user whose vault is unlocked can decrypt it; guests and
  // non-admin viewers see an empty dropdown (and the dropdown itself is
  // disabled for them anyway).
  async function loadEngineers() {
    const v = _vault();
    if (!v || !v.isUnlocked() || !v.decryptExternal) return [];
    let record;
    try {
      const r = await fetch('data/vllm/ci/engineers.enc.json?_=' + Math.floor(Date.now()/1000));
      if (!r.ok) return [];
      record = await r.json();
    } catch (e) { return []; }
    let pt;
    try { pt = await v.decryptExternal(record); } catch (e) { return []; }
    if (!pt) return [];
    try {
      const list = JSON.parse(pt);
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }

  async function verifyAdmin(pat) {
    const me = await ghJson(pat, '/user');
    if (!me.ok) return { ok: false, reason: `PAT invalid (HTTP ${me.status})` };
    const login = me.data && me.data.login;
    if (!login) return { ok: false, reason: 'Could not resolve user from PAT' };
    const perm = await ghJson(pat, `/repos/${DASHBOARD_REPO}/collaborators/${encodeURIComponent(login)}/permission`);
    if (!perm.ok) return { ok: false, reason: `Permission lookup failed (HTTP ${perm.status})` };
    const role = (perm.data && (perm.data.permission || (perm.data.user && perm.data.user.permissions))) || '';
    const isAdmin = role === 'admin' || (perm.data && perm.data.role_name === 'admin');
    return { ok: isAdmin, login, role: role || perm.data.role_name || '—', reason: isAdmin ? '' : `Not an admin (role=${role})` };
  }

  function renderBanner(container, plan) {
    const dryRun = plan && plan.mode !== 'live';
    const msg = dryRun
      ? `Dry-run mode — no issues will be created or modified. Flip READY_TICKETS_LIVE=1 in the hourly-master workflow to enable.`
      : `Live mode — the syncer is managing tickets on ${plan.project}.`;
    const bg = dryRun ? '#1f2933' : '#0f2a1a';
    const bd = dryRun ? C.y : C.g;
    const card = h('div', { style: { background: bg, border: `1px solid ${bd}`, borderRadius: '6px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px' } });
    card.append(h('strong', { text: dryRun ? 'Preview (dry-run)' : 'Active (live sync)', style: { color: dryRun ? C.y : C.g } }));
    card.append(h('span', { text: ' — ' + msg, style: { color: C.m } }));
    if (plan && plan.generated_at) {
      card.append(h('div', { text: `Last sync attempt: ${plan.generated_at}`, style: { fontSize: '11px', color: C.m, marginTop: '4px' } }));
    }
    container.append(card);
  }

  function renderPATBanner(container, state) {
    const card = h('div', { style: { background: C.bg, border: `1px solid ${C.bd}`, borderRadius: '6px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px' } });
    const title = h('strong', { text: 'Admin actions', style: { color: C.t } });
    card.append(title);
    card.append(h('div', { text: 'Assignment requires admin access on this dashboard repo. Provide a GitHub PAT (classic, repo + read:user scope). AES-GCM encrypted in this tab — key derived from your password and held only in memory.', style: { color: C.m, marginTop: '4px', marginBottom: '6px' } }));
    const row = h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } });
    const input = h('input', { attr: { type: 'password', placeholder: 'ghp_…' }, style: { flex: '1', padding: '6px', background: '#0d1117', color: C.t, border: `1px solid ${C.bd}`, borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px' } });
    const saveBtn = h('button', { text: 'Save PAT', style: { padding: '6px 10px', background: C.b, color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' } });
    const clearBtn = h('button', { text: 'Clear', style: { padding: '6px 10px', background: '#21262d', color: C.t, border: `1px solid ${C.bd}`, borderRadius: '4px', cursor: 'pointer', fontSize: '12px' } });
    if (!vaultReady()) { saveBtn.disabled = true; }
    saveBtn.addEventListener('click', async () => {
      const pat = input.value.trim();
      if (!pat) return;
      status.textContent = 'Verifying…';
      status.style.color = C.m;
      const v = await verifyAdmin(pat);
      if (v.ok) {
        try { await setPAT(pat); }
        catch (e) { status.textContent = e.message || 'Could not save PAT.'; status.style.color = C.r; return; }
        state.admin = { login: v.login, role: v.role };
        status.textContent = `Admin verified (@${v.login}, role=${v.role}) — PAT encrypted in vault.`;
        status.style.color = C.g;
        input.value = '';
      } else {
        state.admin = null;
        status.textContent = v.reason || 'Not admin';
        status.style.color = C.r;
      }
      if (state.render) state.render();
    });
    clearBtn.addEventListener('click', async () => {
      try { await setPAT(''); } catch (e) {}
      input.value = '';
      state.admin = null;
      status.textContent = 'PAT cleared from vault.';
      status.style.color = C.m;
      if (state.render) state.render();
    });
    row.append(input, saveBtn, clearBtn);
    card.append(row);
    const status = h('div', { style: { fontSize: '11px', color: C.m, marginTop: '6px' } });
    card.append(status);
    if (state.admin) { status.textContent = `Admin verified (@${state.admin.login}, role=${state.admin.role})`; status.style.color = C.g; }
    container.append(card);
  }

  function fmtDate(d) { return d || '—'; }
  function daysSince(d) {
    if (!d) return '—';
    const t = new Date(d + 'T12:00:00Z').getTime();
    if (!t) return '—';
    const diff = Math.floor((Date.now() - t) / 86400000);
    return diff + 'd';
  }

  async function assignIssue(pat, repo, issueNumber, login) {
    const r = await ghJson(pat, `/repos/${repo}/issues/${issueNumber}/assignees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignees: [login] }),
    });
    return r;
  }

  function renderMetricsTable(container, plan, state) {
    const card = h('div', { style: { background: C.bg, border: `1px solid ${C.bd}`, borderRadius: '8px', padding: '14px 18px', marginBottom: '12px' } });
    card.append(h('h3', { text: `Failing test groups (${(plan.tickets || []).length})`, style: { marginTop: 0, fontSize: '15px' } }));

    if (!plan.tickets || !plan.tickets.length) {
      card.append(h('p', { text: 'No AMD nightly test groups currently failing. Nothing to triage.', style: { color: C.m, fontSize: '13px' } }));
      container.append(card);
      return;
    }

    const table = h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' } });
    const thead = h('thead');
    const hr = h('tr');
    const headers = ['Group', 'Streak start', 'First fail', 'Last success', 'Break freq', 'Issue', 'Assignee'];
    for (const col of headers) {
      hr.append(h('th', { text: col, style: { textAlign: 'left', padding: '6px 8px', borderBottom: `1px solid ${C.bd}`, color: C.m, fontWeight: '600', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.04em' } }));
    }
    thead.append(hr);
    table.append(thead);

    const tbody = h('tbody');
    for (const t of plan.tickets) {
      const tr = h('tr');
      const s = t.summary || {};
      const cell = (text, extra) => h('td', Object.assign({ text: String(text == null ? '—' : text), style: Object.assign({ padding: '6px 8px', borderBottom: `1px solid ${C.bd}`, verticalAlign: 'top' }, (extra && extra.style) || {}) }, extra || {}));

      tr.append(cell(s.group || '—', { style: { fontFamily: 'monospace', fontSize: '11px' } }));
      tr.append(cell(fmtDate(s.current_streak_started)));
      tr.append(cell(fmtDate(s.first_failure_in_window)));
      tr.append(cell(`${fmtDate(s.last_successful)} (${daysSince(s.last_successful)})`));
      tr.append(cell(s.break_frequency == null ? '—' : s.break_frequency, { style: { textAlign: 'right' } }));

      const issueCell = h('td', { style: { padding: '6px 8px', borderBottom: `1px solid ${C.bd}` } });
      if (t.issue_number) {
        issueCell.append(h('a', { attr: { href: t.issue_url, target: '_blank' }, text: `#${t.issue_number}`, style: { color: C.b } }));
      } else {
        issueCell.append(h('span', { text: 'pending', style: { color: C.y } }));
      }
      tr.append(issueCell);

      const assignCell = h('td', { style: { padding: '6px 8px', borderBottom: `1px solid ${C.bd}` } });
      renderAssignControl(assignCell, t, plan, state);
      tr.append(assignCell);

      tbody.append(tr);
    }
    table.append(tbody);
    card.append(table);
    container.append(card);
  }

  function renderAssignControl(cell, ticket, plan, state) {
    const current = ticket.assignee || '';
    const select = h('select', { style: { padding: '4px 6px', background: '#0d1117', color: C.t, border: `1px solid ${C.bd}`, borderRadius: '4px', fontSize: '11px', maxWidth: '180px' } });
    select.append(h('option', { attr: { value: '' }, text: '— unassigned —' }));
    for (const e of (plan.engineers || [])) {
      const opt = h('option', { attr: { value: e.github_login }, text: `${e.display_name} (@${e.github_login})` });
      if (current && current === e.github_login) opt.selected = true;
      select.append(opt);
    }
    select.disabled = !state.admin || !ticket.issue_number;
    if (!state.admin) select.title = 'Admin PAT required to assign';
    else if (!ticket.issue_number) select.title = 'Issue not yet created (dry-run)';

    select.addEventListener('change', async () => {
      const login = select.value;
      if (!login) return;
      const pat = await getPAT();
      if (!pat) return;
      select.disabled = true;
      const r = await assignIssue(pat, plan.issue_repo, ticket.issue_number, login);
      if (r.ok) {
        ticket.assignee = login;
        cell.append(h('span', { text: ' ✓', style: { color: C.g, marginLeft: '6px', fontSize: '11px' } }));
      } else {
        cell.append(h('span', { text: ` ✗ ${r.status}`, style: { color: C.r, marginLeft: '6px', fontSize: '11px' } }));
      }
      select.disabled = false;
    });
    cell.append(select);
  }

  function renderSummaryCards(container, plan) {
    const wrap = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px', marginBottom: '14px' } });
    const items = [
      { label: 'Failing groups', value: plan.failing_groups_total || 0, color: C.r },
      { label: 'Tracked (window)', value: (plan.groups_all || []).length, color: C.m },
      { label: 'Window', value: `${plan.window_days || 60}d`, color: C.m },
      { label: 'Mode', value: plan.mode || '—', color: plan.mode === 'live' ? C.g : C.y },
    ];
    for (const it of items) {
      const card = h('div', { style: { background: C.bg, border: `1px solid ${C.bd}`, borderRadius: '6px', padding: '10px 12px' } });
      card.append(h('div', { text: it.label, style: { fontSize: '10px', color: C.m, textTransform: 'uppercase', letterSpacing: '0.05em' } }));
      card.append(h('div', { text: String(it.value), style: { fontSize: '20px', color: it.color, marginTop: '4px', fontWeight: '600' } }));
      wrap.append(card);
    }
    container.append(wrap);
  }

  async function render() {
    const container = document.getElementById('ci-ready-view');
    if (!container) return;
    container.innerHTML = '';
    container.append(h('h2', { text: 'Ready Tickets', style: { marginBottom: '6px' } }));
    container.append(h('p', { text: 'Automated triage of AMD nightly test-group failures against vllm-project/projects/39. Metrics pulled from the last 60 days of nightlies on disk.', style: { color: C.m, marginTop: 0, marginBottom: '14px' } }));

    const plan = await loadPlan();
    if (!plan) {
      container.append(h('p', { text: 'No ready_tickets.json found yet — the collector will produce one on its next run.', style: { color: C.m, fontStyle: 'italic' } }));
      return;
    }
    // Decrypt the roster blob if the vault is unlocked; empty array for
    // guests and locked sessions. The dropdown is already disabled for
    // non-admins at renderAssignControl, so an empty list is harmless.
    plan.engineers = await loadEngineers();

    const state = { render, admin: null };
    renderBanner(container, plan);
    renderSummaryCards(container, plan);
    renderPATBanner(container, state);
    renderMetricsTable(container, plan, state);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('[data-tab="ci-ready"]');
    if (btn) setTimeout(render, 50);
  });
})();
