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
  // Session PAT is held in memory by auth.js after signin; roster ciphertext
  // unlocks via the token vault (wrap key derived from that same PAT).
  function _vault() { return window.__tokenVault; }
  function _authPat() {
    const g = window.__authGate;
    return g && g.getGithubPat ? g.getGithubPat() : '';
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


  function renderBanner(container, plan) {
    const paused = !!(plan && (plan.feature_paused || plan.mode === 'paused'));
    const dryRun = plan && plan.mode !== 'live' && !paused;
    const msg = paused
      ? (plan.pause_reason || 'Ready Tickets automation is paused. This dashboard will not create or update upstream CI issues.')
      : dryRun
        ? 'Dry-run mode — no issues will be created or modified.'
        : `Live mode — the syncer is managing tickets on ${plan.project}.`;
    const bg = paused ? '#2b161b' : dryRun ? '#1f2933' : '#0f2a1a';
    const bd = paused ? C.r : dryRun ? C.y : C.g;
    const card = h('div', { style: { background: bg, border: `1px solid ${bd}`, borderRadius: '6px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px' } });
    card.append(h('strong', { text: paused ? 'Paused' : dryRun ? 'Preview (dry-run)' : 'Active (live sync)', style: { color: paused ? C.r : dryRun ? C.y : C.g } }));
    card.append(h('span', { text: ' — ' + msg, style: { color: C.m } }));
    if (plan && plan.generated_at) {
      card.append(h('div', { text: `Last sync attempt: ${plan.generated_at}`, style: { fontSize: '11px', color: C.m, marginTop: '4px' } }));
    }
    container.append(card);
  }

  function renderAdminStatus(container, state) {
    const card = h('div', { style: { background: C.bg, border: `1px solid ${C.bd}`, borderRadius: '6px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px' } });
    card.append(h('strong', { text: 'Assignment control', style: { color: C.t } }));
    const msg = state.isAdmin
      ? `Signed in as admin @${state.login} — assignment dropdown enabled. Writes use your session PAT.`
      : state.login
        ? `Signed in as @${state.login}. Assignment requires the dashboard admin account; this tab is read-only for you.`
        : 'Sign in to enable assignment.';
    const color = state.isAdmin ? C.g : C.m;
    card.append(h('div', { text: msg, style: { color, marginTop: '4px' } }));
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

      const issueCell = h('td', { style: { padding: '6px 8px', borderBottom: `1px solid ${C.bd}`, whiteSpace: 'nowrap' } });
      renderIssueCell(issueCell, t, plan, state);
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

  // ---------------------------------------------------------------------
  // Issue cell: when the syncer has already filed a ticket (live mode),
  // show the ``#NNN`` link. When the ticket is still pending (dry-run, or
  // live-mode before the first successful POST), show two compact actions:
  //
  //   * ``search``  — opens a GitHub Issues search filtered by the canonical
  //                   title on ``plan.issue_repo``. Lets an admin spot a
  //                   pre-existing issue before filing a duplicate.
  //   * ``create ↗`` — opens GitHub's new-issue form pre-filled with the
  //                   exact title / body / label the syncer *would* POST.
  //                   The admin reviews the compose page and clicks
  //                   "Submit new issue" to file it by hand.
  //
  // Using pre-filled URLs instead of a direct POST is deliberate: the
  // admin sees the whole body before it lands on ``vllm-project/vllm`` and
  // can edit or abandon. No extra auth is needed — GitHub's own compose
  // page gates creation.
  // ---------------------------------------------------------------------
  function _issueSearchUrl(repo, title) {
    const q = `is:issue in:title "${title}"`;
    return `https://github.com/${repo}/issues?q=` + encodeURIComponent(q);
  }
  function _issueCreateUrl(repo, title, body, labels) {
    const params = new URLSearchParams();
    params.set('title', title);
    if (body) params.set('body', body);
    if (labels && labels.length) params.set('labels', labels.join(','));
    // GitHub caps URL length around 8k; a typical body is <1.5k so this is
    // fine, but fall back to title-only if we somehow exceed it.
    const url = `https://github.com/${repo}/issues/new?` + params.toString();
    if (url.length > 7500) {
      return `https://github.com/${repo}/issues/new?title=` + encodeURIComponent(title);
    }
    return url;
  }
  function renderIssueCell(cell, ticket, plan, state) {
    if (ticket.issue_number) {
      cell.append(h('a', { href: ticket.issue_url, target: '_blank', rel: 'noopener', text: `#${ticket.issue_number}`, style: { color: C.b } }));
      return;
    }
    const repo = plan.issue_repo || 'vllm-project/vllm';
    const title = ticket.title || '';
    const body = ticket.body || '';
    const labels = ticket.labels || ['ci-failure'];
    cell.append(h('span', { text: 'pending', style: { color: C.y, fontSize: '11px' } }));
    cell.append(h('span', { text: ' \u00b7 ', style: { color: C.m, fontSize: '11px' } }));
    cell.append(h('a', {
      href: _issueSearchUrl(repo, title), target: '_blank', rel: 'noopener',
      text: 'search', title: `Check ${repo} for an existing issue with this title`,
      style: { color: C.m, fontSize: '11px' },
    }));
    cell.append(h('span', { text: ' \u00b7 ', style: { color: C.m, fontSize: '11px' } }));
    cell.append(h('a', {
      href: _issueCreateUrl(repo, title, body, labels), target: '_blank', rel: 'noopener',
      text: 'create \u2197',
      title: `Open GitHub's new-issue form on ${repo} with this title + body pre-filled`,
      style: { color: C.b, fontSize: '11px', fontWeight: '600' },
    }));
  }

  function renderAssignControl(cell, ticket, plan, state) {
    const current = ticket.assignee || '';
    const select = h('select', { style: { padding: '4px 6px', background: '#0d1117', color: C.t, border: `1px solid ${C.bd}`, borderRadius: '4px', fontSize: '11px', maxWidth: '180px' } });
    // The shared ``el()`` helper sets every non-function prop via
    // ``setAttribute``, so plain top-level keys are correct — an earlier
    // ``attr: { value: ... }`` wrapper here was a no-op (stored an attribute
    // literally named "attr"), which would have made ``select.value`` fall
    // back to the visible text like "Jane Doe (@jane)" instead of the login.
    select.append(h('option', { value: '', text: '\u2014 unassigned \u2014' }));
    for (const e of (plan.engineers || [])) {
      const opt = h('option', { value: e.github_login, text: `${e.display_name} (@${e.github_login})` });
      if (current && current === e.github_login) opt.selected = true;
      select.append(opt);
    }
    select.disabled = !state.isAdmin || !ticket.issue_number;
    if (!state.isAdmin) select.title = 'Sign in as the dashboard admin to assign';
    else if (!ticket.issue_number) select.title = 'Issue not yet created (dry-run)';

    select.addEventListener('change', async () => {
      const login = select.value;
      if (!login) return;
      const pat = _authPat();
      if (!pat) { cell.append(h('span', { text: ' ✗ no PAT', style: { color: C.r, marginLeft: '6px', fontSize: '11px' } })); return; }
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
      { label: 'Mode', value: plan.mode || '—', color: plan.mode === 'live' ? C.g : plan.mode === 'paused' ? C.r : C.y },
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
    // Auth gate — Ready Tickets exposes the engineer roster (via the
    // token-vault decrypt) and lets admins assign issues. The nav button
    // is hidden from guests, but any forced panel activation still lands
    // here, so bail before we run the loadPlan/loadEngineers pipeline.
    const gate = window.__authGate;
    const allowed = !!(gate && typeof gate.canAccessTab === 'function'
      ? gate.canAccessTab('ci-ready')
      : (gate && gate.isAuthed && gate.isAuthed()));
    if (!allowed) {
      container.innerHTML = '';
      container.append(h('h2', { text: 'Ready Tickets', style: { marginBottom: '6px' } }));
      container.append(h('p', {
        text: 'Sign in to view the ready-tickets triage. This tab is not available to guests.',
        style: { color: C.m, marginTop: 0 },
      }));
      const unlock = h('button', {
        text: 'Sign in',
        style: { marginTop: '12px', padding: '7px 12px', borderRadius: '6px', border: `1px solid ${C.bd}`, background: C.bg, color: C.t, cursor: 'pointer', fontWeight: '600' },
      });
      unlock.addEventListener('click', () => {
        const auth = window.__authGate;
        if (auth && auth.promptSignIn) auth.promptSignIn();
      });
      container.append(unlock);
      return;
    }
    container.innerHTML = '';
    container.append(h('h2', { text: 'Ready Tickets', style: { marginBottom: '6px' } }));
    container.append(h('p', { text: 'Historical view for the Ready Tickets / project #39 feature. Upstream issue automation is currently paused.', style: { color: C.m, marginTop: 0, marginBottom: '14px' } }));

    const plan = await loadPlan();
    if (!plan) {
      container.append(h('p', { text: 'No ready_tickets.json found yet — the collector will produce one on its next run.', style: { color: C.m, fontStyle: 'italic' } }));
      return;
    }
    // Decrypt the roster blob if the vault is unlocked; empty array for
    // guests and locked sessions. The dropdown is already disabled for
    // non-admins at renderAssignControl, so an empty list is harmless.
    plan.engineers = await loadEngineers();

    const state = {
      render,
      login: gate && gate.getLogin ? gate.getLogin() : '',
      isAdmin: !!(gate && gate.isAdmin && gate.isAdmin()),
    };
    renderBanner(container, plan);
    renderSummaryCards(container, plan);
    if (plan.feature_paused || plan.mode === 'paused') {
      container.append(h('p', {
        text: 'This feature is frozen. The dashboard is not creating, updating, or proposing upstream project #39 issues from this tab.',
        style: { color: C.m, marginTop: 0 },
      }));
      return;
    }
    renderAdminStatus(container, state);
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
  document.addEventListener('auth:changed', render);
})();
