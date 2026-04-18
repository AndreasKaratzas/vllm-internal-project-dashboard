/**
 * CI Test Build — launch custom Buildkite builds against vllm/amd-ci and
 * compare results head-to-head with the matching nightly.
 *
 * Flow (all browser-side so the PAT never lands in workflow logs):
 *   1. User fills form, optionally clicks "Test new base image" to supply a
 *      base image tag.
 *   2. If a base image is given, the browser uses the user's GitHub PAT to
 *      (a) ensure the target fork exists, (b) rebase the fork's main from
 *      vllm-project/vllm, (c) read docker/Dockerfile.rocm, (d) replace
 *      ARG BASE_IMAGE=... with the new value, (e) commit to a new branch.
 *   3. The browser POSTs workflow_dispatch on test-build.yml with the final
 *      commit+branch+env. The workflow uses the repo's BUILDKITE_TOKEN secret
 *      to create the Buildkite build and register it.
 *   4. The collector (hourly-master.yml) picks up the registered build,
 *      fetches results when terminal, and computes a comparison against the
 *      matching AMD nightly.
 *
 * PAT is kept in sessionStorage only (cleared when the tab closes). Password
 * input hides the characters during entry. No at-rest encryption — tab-scope
 * is simpler and arguably safer than encryption keyed on a low-entropy
 * passphrase.
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

  // Repo coordinates. Dashboard is served from this repo so we know the
  // workflow target. Upstream vLLM is where the Dockerfile lives.
  const DASHBOARD_REPO = 'AndreasKaratzas/vllm-ci-dashboard';
  const UPSTREAM_REPO = 'vllm-project/vllm';
  const DOCKERFILE_PATH = 'docker/Dockerfile.rocm';
  const BASE_IMAGE_RE = /^(\s*ARG\s+BASE_IMAGE\s*=\s*).+$/m;

  const DEFAULT_ENV = [
    'NIGHTLY=1',
    'DOCS_ONLY_DISABLE=1',
    'AMD_MIRROR_HW=amdexperimental',
  ].join('\n');

  // ── PAT + Buildkite token handling ───────────────────────────────────
  // Both tokens live encrypted in sessionStorage via window.__tokenVault.
  // The AES-GCM key is derived from the signed-in user's password on unlock
  // and never leaves WebCrypto; the admin's repo secrets (GITHUB_TOKEN /
  // BUILDKITE_TOKEN) are never exposed here — every write path below uses
  // the caller's own tokens, so each user's builds land under their own
  // Buildkite audit trail and their own GitHub attribution.
  const PAT_NAME = 'gh_pat';
  const BK_NAME = 'bk_token';
  const BK_ORG = 'vllm';
  const BK_PIPELINE = 'amd-ci';
  function _vault() { return window.__tokenVault; }
  function vaultReady() {
    const v = _vault();
    return !!(v && v.isUnlocked());
  }
  async function getPAT() {
    const v = _vault();
    if (!v || !v.isUnlocked()) return '';
    try { return await v.get(PAT_NAME); } catch (e) { return ''; }
  }
  async function setPAT(value) {
    const v = _vault();
    if (!v || !v.isUnlocked()) throw new Error('Sign in to save tokens (the vault is locked).');
    await v.put(PAT_NAME, value);
  }
  function clearPAT() { const v = _vault(); if (v) v.clear(PAT_NAME); }
  async function getBKToken() {
    const v = _vault();
    if (!v || !v.isUnlocked()) return '';
    try { return await v.get(BK_NAME); } catch (e) { return ''; }
  }
  async function setBKToken(value) {
    const v = _vault();
    if (!v || !v.isUnlocked()) throw new Error('Sign in to save tokens (the vault is locked).');
    await v.put(BK_NAME, value);
  }
  function clearBKToken() { const v = _vault(); if (v) v.clear(BK_NAME); }

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
    const resp = await ghFetch(pat, path, opts);
    const text = await resp.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) {}
    return { ok: resp.ok, status: resp.status, data, text };
  }

  // ── GitHub fork/patch helpers ────────────────────────────────────────

  async function ensureForkExists(pat, forkRepo) {
    const r = await ghJson(pat, `/repos/${forkRepo}`);
    if (r.ok) return r.data;
    if (r.status === 404) {
      const owner = forkRepo.split('/')[0];
      const create = await ghJson(pat, `/repos/${UPSTREAM_REPO}/forks`, {
        method: 'POST',
        body: JSON.stringify({ organization: owner }),
      });
      if (!create.ok) throw new Error(`Fork creation failed: ${create.status} ${create.text.slice(0,200)}`);
      return create.data;
    }
    throw new Error(`Fork lookup failed: ${r.status}`);
  }

  async function syncForkFromUpstream(pat, forkRepo, baseBranch) {
    // merge-upstream keeps the fork's baseBranch tracking upstream main.
    const r = await ghJson(pat, `/repos/${forkRepo}/merge-upstream`, {
      method: 'POST',
      body: JSON.stringify({ branch: baseBranch || 'main' }),
    });
    if (!r.ok && r.status !== 409) {
      throw new Error(`merge-upstream failed: ${r.status} ${r.text.slice(0,200)}`);
    }
    return r.data;
  }

  async function getBranchSha(pat, repo, branch) {
    const r = await ghJson(pat, `/repos/${repo}/git/ref/heads/${encodeURIComponent(branch)}`);
    if (!r.ok) throw new Error(`Branch lookup ${repo}:${branch} failed: ${r.status}`);
    return r.data.object.sha;
  }

  async function createBranch(pat, repo, newBranch, fromSha) {
    const r = await ghJson(pat, `/repos/${repo}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({ ref: `refs/heads/${newBranch}`, sha: fromSha }),
    });
    if (!r.ok) throw new Error(`Create branch ${newBranch} failed: ${r.status} ${r.text.slice(0,200)}`);
    return r.data;
  }

  async function getFileContents(pat, repo, path, ref) {
    const r = await ghJson(pat, `/repos/${repo}/contents/${path}?ref=${encodeURIComponent(ref)}`);
    if (!r.ok) throw new Error(`Read ${path}@${ref} failed: ${r.status}`);
    // GitHub returns base64-encoded content. Decode to UTF-8.
    const b64 = (r.data.content || '').replace(/\n/g, '');
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const text = new TextDecoder('utf-8').decode(bytes);
    return { text, sha: r.data.sha };
  }

  async function putFileContents(pat, repo, path, branch, text, fileSha, message) {
    const utf8 = new TextEncoder().encode(text);
    let bin = '';
    for (let i = 0; i < utf8.length; i++) bin += String.fromCharCode(utf8[i]);
    const b64 = btoa(bin);
    const r = await ghJson(pat, `/repos/${repo}/contents/${path}`, {
      method: 'PUT',
      body: JSON.stringify({
        message: message || 'Patch BASE_IMAGE via project-dashboard',
        content: b64,
        branch: branch,
        sha: fileSha,
      }),
    });
    if (!r.ok) throw new Error(`Commit ${path} failed: ${r.status} ${r.text.slice(0,200)}`);
    return r.data;
  }

  async function deleteBranch(pat, repo, branch) {
    const r = await ghFetch(pat, `/repos/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, { method: 'DELETE' });
    if (!r.ok && r.status !== 422) {
      throw new Error(`Delete branch ${repo}:${branch} failed: ${r.status}`);
    }
  }

  async function patchBaseImage(pat, forkRepo, newBaseImage, sourceBranch, sourceCommit) {
    // Ensure fork exists, rebase its main from upstream, branch off main (or
    // the user-specified commit), patch Dockerfile.rocm, push.
    await ensureForkExists(pat, forkRepo);
    try { await syncForkFromUpstream(pat, forkRepo, 'main'); }
    catch (e) { console.warn('merge-upstream skipped:', e.message); }

    const baseSha = sourceCommit && sourceCommit !== 'HEAD'
      ? sourceCommit
      : await getBranchSha(pat, forkRepo, sourceBranch || 'main');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace(/-\d+Z$/, '');
    const newBranch = `test-image/${stamp}`;
    await createBranch(pat, forkRepo, newBranch, baseSha);

    const file = await getFileContents(pat, forkRepo, DOCKERFILE_PATH, newBranch);
    if (!BASE_IMAGE_RE.test(file.text)) {
      throw new Error(`BASE_IMAGE ARG not found in ${DOCKERFILE_PATH}`);
    }
    const patched = file.text.replace(BASE_IMAGE_RE, (_, prefix) => `${prefix}${newBaseImage}`);
    await putFileContents(pat, forkRepo, DOCKERFILE_PATH, newBranch, patched, file.sha,
      `test: override BASE_IMAGE to ${newBaseImage}`);

    const newSha = await getBranchSha(pat, forkRepo, newBranch);
    return { branch: newBranch, commit: newSha };
  }

  // ── Buildkite build creation (user's BK token, not the admin's) ─────
  async function createBuildkiteBuild(bkToken, body) {
    const resp = await fetch(
      `https://api.buildkite.com/v2/organizations/${BK_ORG}/pipelines/${BK_PIPELINE}/builds`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + bkToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    const text = await resp.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) {}
    if (!resp.ok) {
      throw new Error(`Buildkite create failed: ${resp.status} ${text.slice(0,240)}`);
    }
    return data;
  }

  // ── workflow_dispatch (registry writer — no BK calls on the runner) ─
  async function dispatchWorkflow(pat, inputs) {
    const r = await ghFetch(pat,
      `/repos/${DASHBOARD_REPO}/actions/workflows/test-build.yml/dispatches`,
      {
        method: 'POST',
        body: JSON.stringify({ ref: 'main', inputs }),
      });
    if (!r.ok) {
      const text = await r.text();
      throw new Error(`workflow_dispatch failed: ${r.status} ${text.slice(0,200)}`);
    }
    return true;
  }

  // ── Registry + comparison loaders ──────────────────────────────────

  async function loadRegistry() {
    try {
      const r = await fetch('data/vllm/ci/test_builds/index.json?_=' + Math.floor(Date.now()/1000));
      if (!r.ok) return [];
      return await r.json();
    } catch (e) { return []; }
  }

  async function loadComparison(entryId) {
    try {
      const r = await fetch(`data/vllm/ci/test_builds/${entryId}/comparison.json?_=` + Math.floor(Date.now()/1000));
      if (!r.ok) return null;
      return await r.json();
    } catch (e) { return null; }
  }

  // ── UI ──────────────────────────────────────────────────────────────

  function makeInput(opts) {
    return h('input', Object.assign({
      style: {
        width: '100%', boxSizing: 'border-box', padding: '6px 10px',
        background: C.bg2 || C.bg, border: `1px solid ${C.bd}`, borderRadius: '4px',
        color: C.t, fontSize: '13px', fontFamily: 'inherit',
      },
    }, opts || {}));
  }

  function makeTextarea(opts) {
    return h('textarea', Object.assign({
      style: {
        width: '100%', boxSizing: 'border-box', padding: '8px 10px', minHeight: '80px',
        background: C.bg, border: `1px solid ${C.bd}`, borderRadius: '4px',
        color: C.t, fontSize: '13px', fontFamily: 'monospace', resize: 'vertical',
      },
    }, opts || {}));
  }

  function makeBtn(label, onClick, variant) {
    const bg = variant === 'primary' ? C.g : (variant === 'danger' ? C.r : C.bd);
    const btn = h('button', { text: label, style: {
      background: bg, border: 'none', color: C.t, padding: '7px 14px',
      borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit',
      fontWeight: '600',
    }});
    btn.onclick = onClick;
    return btn;
  }

  function _tokenBanner(container, state, opts) {
    // opts: { label, placeholder, help, name, hasFn, clearFn, saveFn }
    // ``hasFn`` is synchronous (just checks vault record presence); ``saveFn``
    // and ``clearFn`` are async because they touch WebCrypto.
    const vaultUnlocked = vaultReady();
    const present = vaultUnlocked && opts.hasFn();
    const banner = h('div', { style: {
      padding: '10px 14px', marginBottom: '10px',
      background: present ? C.g + '15' : C.y + '15',
      border: `1px solid ${present ? C.g : C.y}55`,
      borderRadius: '6px', fontSize: '13px',
    }});
    if (!vaultUnlocked) {
      banner.append(h('span', {
        text: `Vault locked — sign in with your password to save / use your ${opts.label}.`,
        style: { color: C.t },
      }));
      container.append(banner);
      return;
    }
    if (present) {
      banner.append(
        h('span', { text: `${opts.label} encrypted in this tab. `, style: { color: C.t } }),
        (() => { const b = makeBtn('Clear', async () => { try { await opts.clearFn(); } catch (e) {} state.render(); }); b.style.padding = '3px 10px'; b.style.fontSize = '12px'; return b; })(),
      );
    } else {
      banner.append(h('span', { text: opts.help, style: { color: C.t } }));
      const row = h('div', { style: { marginTop: '8px', display: 'flex', gap: '6px' } });
      const inp = makeInput({ type: 'password', placeholder: opts.placeholder, autocomplete: 'off' });
      inp.style.flex = '1';
      const save = makeBtn('Save token', async () => {
        const v = inp.value.trim();
        if (!v) return;
        save.disabled = true;
        try { await opts.saveFn(v); state.render(); }
        catch (e) { alert(e.message || 'Could not save token.'); }
        finally { save.disabled = false; }
      }, 'primary');
      row.append(inp, save);
      banner.append(row);
    }
    container.append(banner);
  }

  function renderPATBanner(container, state) {
    _tokenBanner(container, state, {
      label: 'GitHub token',
      placeholder: 'ghp_…',
      name: PAT_NAME,
      hasFn: () => { const v = _vault(); return !!(v && v.has(PAT_NAME)); },
      saveFn: setPAT,
      clearFn: clearPAT,
      help: 'Provide your GitHub PAT (repo scope). Used for forks, Dockerfile patches, and workflow dispatch under your identity. AES-GCM encrypted in this tab — cleared on sign-out or tab close.',
    });
  }

  function renderBKBanner(container, state) {
    _tokenBanner(container, state, {
      label: 'Buildkite token',
      placeholder: 'bkua_…',
      name: BK_NAME,
      hasFn: () => { const v = _vault(); return !!(v && v.has(BK_NAME)); },
      saveFn: setBKToken,
      clearFn: clearBKToken,
      help: "Provide your Buildkite API token (scope: write_builds on vllm/amd-ci). Your build is created under your Buildkite identity — the admin's token is never used. AES-GCM encrypted in this tab.",
    });
  }

  function renderForm(container, state) {
    const card = h('div', { style: { background: C.bg, border: `1px solid ${C.bd}`, borderRadius: '8px', padding: '16px 20px', marginBottom: '16px' } });
    card.append(h('h3', { text: 'Launch a test build', style: { marginTop: 0, fontSize: '15px' } }));

    const grid = h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } });

    const fieldMessage = h('div', { style: { gridColumn: '1 / -1' } });
    fieldMessage.append(h('label', { text: 'Message', style: { display: 'block', fontSize: '12px', color: C.m, marginBottom: '4px' } }));
    const msgInput = makeInput({ placeholder: 'Describe what this run is testing' });
    fieldMessage.append(msgInput);

    const fieldCommit = h('div');
    fieldCommit.append(h('label', { text: 'Commit', style: { display: 'block', fontSize: '12px', color: C.m, marginBottom: '4px' } }));
    const commitInput = makeInput({ value: 'HEAD', placeholder: 'HEAD or a commit SHA' });
    fieldCommit.append(commitInput);

    const fieldBranch = h('div');
    fieldBranch.append(h('label', { text: 'Branch', style: { display: 'block', fontSize: '12px', color: C.m, marginBottom: '4px' } }));
    const branchInput = makeInput({ value: 'main', placeholder: 'Branch name on the target repo' });
    fieldBranch.append(branchInput);

    const fieldForkRepo = h('div', { style: { gridColumn: '1 / -1' } });
    fieldForkRepo.append(h('label', { text: 'Target repo (owner/name) — leave blank for vllm-project/vllm', style: { display: 'block', fontSize: '12px', color: C.m, marginBottom: '4px' } }));
    const forkRepoInput = makeInput({ placeholder: UPSTREAM_REPO });
    fieldForkRepo.append(forkRepoInput);

    const fieldEnv = h('div', { style: { gridColumn: '1 / -1' } });
    fieldEnv.append(h('label', { text: 'Environment variables (KEY=value, one per line)', style: { display: 'block', fontSize: '12px', color: C.m, marginBottom: '4px' } }));
    const envInput = makeTextarea({ value: DEFAULT_ENV });
    fieldEnv.append(envInput);

    const fieldToggles = h('div', { style: { gridColumn: '1 / -1', display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px' } });
    const cleanLabel = h('label', { style: { display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' } });
    const cleanCb = h('input', { type: 'checkbox' });
    cleanLabel.append(cleanCb, h('span', { text: 'Clean checkout (force fresh working directory)' }));

    const cleanupLabel = h('label', { style: { display: 'flex', alignItems: 'center', gap: '6px' } });
    cleanupLabel.append(h('span', { text: 'Cleanup branch:', style: { color: C.m } }));
    const cleanupSelect = h('select', { style: { background: C.bg, color: C.t, border: `1px solid ${C.bd}`, borderRadius: '3px', padding: '3px 6px', fontSize: '13px' } });
    for (const [k, v] of [['never','Never'], ['on_success','If build passes'], ['always','Always when build ends']]) {
      const opt = h('option', { value: k, text: v });
      cleanupSelect.append(opt);
    }
    cleanupSelect.value = 'never';
    cleanupLabel.append(cleanupSelect);
    fieldToggles.append(cleanLabel, cleanupLabel);

    grid.append(fieldMessage, fieldCommit, fieldBranch, fieldForkRepo, fieldEnv, fieldToggles);
    card.append(grid);

    // Base image override section
    const bimgSection = h('div', { style: { marginTop: '14px', padding: '12px', background: C.bd + '22', borderRadius: '6px' } });
    const bimgHeader = h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' } });
    bimgHeader.append(h('strong', { text: 'Test new base image (optional)', style: { fontSize: '13px' } }));
    const bimgToggle = makeBtn('Enable', null);
    bimgToggle.style.padding = '3px 10px';
    bimgToggle.style.fontSize = '12px';
    bimgHeader.append(bimgToggle);
    bimgSection.append(bimgHeader);
    const bimgBody = h('div', { style: { display: 'none' } });
    bimgBody.append(h('div', { text: 'We\'ll fork (or reuse your fork of) vllm-project/vllm, sync main, and create a branch with docker/Dockerfile.rocm\'s ARG BASE_IMAGE rewritten to the value below. The final branch is what the Buildkite build checks out.', style: { fontSize: '12px', color: C.m, marginBottom: '8px' } }));
    const bimgInput = makeInput({ placeholder: 'e.g. rocm/vllm-dev:nightly_20260420' });
    bimgBody.append(bimgInput);
    bimgSection.append(bimgBody);
    let bimgEnabled = false;
    bimgToggle.onclick = () => {
      bimgEnabled = !bimgEnabled;
      bimgBody.style.display = bimgEnabled ? 'block' : 'none';
      bimgToggle.textContent = bimgEnabled ? 'Disable' : 'Enable';
    };
    card.append(bimgSection);

    const statusLine = h('div', { style: { marginTop: '12px', fontSize: '13px', minHeight: '18px' } });
    card.append(statusLine);

    const actionRow = h('div', { style: { marginTop: '10px', display: 'flex', gap: '8px' } });
    const submit = makeBtn('Launch build', async () => {
      if (!vaultReady()) {
        statusLine.textContent = 'Vault is locked. Sign in again to use your tokens.';
        statusLine.style.color = C.r; return;
      }
      const pat = await getPAT();
      const bkToken = await getBKToken();
      if (!pat) { statusLine.textContent = 'Provide a GitHub token first.'; statusLine.style.color = C.r; return; }
      if (!bkToken) { statusLine.textContent = 'Provide a Buildkite token first — your build runs under your Buildkite identity.'; statusLine.style.color = C.r; return; }
      submit.disabled = true;
      submit.textContent = 'Launching…';
      statusLine.style.color = C.m;
      try {
        let finalBranch = (branchInput.value || 'main').trim();
        let finalCommit = (commitInput.value || 'HEAD').trim();
        let finalForkRepo = (forkRepoInput.value || '').trim();
        const baseImage = bimgEnabled ? bimgInput.value.trim() : '';

        if (baseImage) {
          if (!finalForkRepo) {
            statusLine.textContent = 'Resolving authenticated user…';
            const me = await ghJson(pat, '/user');
            if (!me.ok) throw new Error('Could not resolve authenticated user: ' + me.status);
            finalForkRepo = `${me.data.login}/vllm`;
          }
          statusLine.textContent = `Forking + patching ${finalForkRepo}…`;
          const patchResult = await patchBaseImage(pat, finalForkRepo, baseImage, finalBranch, finalCommit);
          finalBranch = patchResult.branch;
          finalCommit = patchResult.commit;
        }

        const branchRef = finalForkRepo
          ? `${finalForkRepo}:${finalBranch}`
          : `${UPSTREAM_REPO}:${finalBranch}`;

        // Merge defaults into env so the Buildkite job always sees them.
        const envMap = {
          NIGHTLY: '1',
          DOCS_ONLY_DISABLE: '1',
          AMD_MIRROR_HW: 'amdexperimental',
        };
        for (const line of (envInput.value || '').split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eq = trimmed.indexOf('=');
          if (eq < 0) continue;
          envMap[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
        }
        if (baseImage) envMap.BASE_IMAGE_OVERRIDE = baseImage;

        statusLine.textContent = 'Creating Buildkite build under your token…';
        const build = await createBuildkiteBuild(bkToken, {
          commit: finalCommit || 'HEAD',
          branch: finalBranch || 'main',
          message: msgInput.value || 'Test build (project-dashboard)',
          env: envMap,
          clean_checkout: !!cleanCb.checked,
        });

        statusLine.textContent = `Buildkite #${build.number} created. Registering…`;
        await dispatchWorkflow(pat, {
          build_number: String(build.number),
          web_url: build.web_url || '',
          commit: build.commit || finalCommit,
          message: msgInput.value || 'Test build',
          branch: finalBranch,
          env_vars: envInput.value || '',
          clean_checkout: cleanCb.checked,
          fork_repo: finalForkRepo,
          branch_ref: branchRef,
          base_image: baseImage,
          cleanup_mode: cleanupSelect.value,
        });
        statusLine.style.color = C.g;
        statusLine.textContent = `Launched Buildkite #${build.number}. Results will appear below on the next 30-min poll.`;
      } catch (e) {
        console.error(e);
        statusLine.style.color = C.r;
        statusLine.textContent = 'Error: ' + e.message;
      } finally {
        submit.disabled = false;
        submit.textContent = 'Launch build';
      }
    }, 'primary');
    actionRow.append(submit);
    card.append(actionRow);

    container.append(card);
  }

  function stateBadge(stateStr) {
    const s = (stateStr || '').toLowerCase();
    const ok = ['passed'];
    const bad = ['failed','broken','timed_out'];
    const pending = ['running','scheduled','creating','assigned','waiting','limiting','canceling'];
    const color = ok.includes(s) ? C.g : bad.includes(s) ? C.r : (pending.includes(s) ? C.y : C.m);
    return h('span', { text: s || 'unknown', style: {
      background: color + '33', color, padding: '1px 8px', borderRadius: '3px',
      fontSize: '12px', fontWeight: '600', textTransform: 'uppercase',
    }});
  }

  function renderComparisonSummary(container, entry, comparison) {
    if (!comparison) return;
    const sum = comparison.summary || {};
    const row = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', marginTop: '8px' } });
    const cells = [
      ['Common pass', sum.common_pass, C.g],
      ['Common fail', sum.common_fail, C.m],
      ['New fail', sum.new_fail, C.r],
      ['New pass', sum.new_pass, C.g],
      ['Only in test', sum.only_in_test, C.y],
      ['Only in nightly', sum.only_in_nightly, C.y],
    ];
    for (const [lbl, val, color] of cells) {
      const cell = h('div', { style: { background: color + '15', border: `1px solid ${color}44`, borderRadius: '6px', padding: '8px 10px' } });
      cell.append(h('div', { text: lbl, style: { fontSize: '11px', color: C.m, textTransform: 'uppercase' } }));
      cell.append(h('div', { text: (val != null ? val : '—'), style: { fontSize: '18px', fontWeight: '700', color } }));
      row.append(cell);
    }
    container.append(row);
    container.append(h('div', { text: `Baseline: ${comparison.baseline_date || 'n/a'} (${sum.nightly_total||0} tests) · Test build: ${sum.test_total||0} tests`, style: { fontSize: '12px', color: C.m, marginTop: '6px' } }));
  }

  function renderGroupTable(container, comparison) {
    const groups = (comparison && comparison.groups) || [];
    if (!groups.length) return;
    const box = h('div', { style: { marginTop: '12px', background: C.bg, border: `1px solid ${C.bd}`, borderRadius: '6px', overflow: 'hidden' } });
    const tbl = h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' } });
    tbl.append(h('thead', {}, [h('tr', {}, [
      h('th', { text: 'Group', style: { textAlign: 'left', padding: '6px 8px', background: C.bd + '33', color: C.m, fontSize: '11px' } }),
      h('th', { text: 'Test pass/fail', style: { textAlign: 'center', padding: '6px 8px', background: C.bd + '33', color: C.m, fontSize: '11px' } }),
      h('th', { text: 'Nightly pass/fail', style: { textAlign: 'center', padding: '6px 8px', background: C.bd + '33', color: C.m, fontSize: '11px' } }),
      h('th', { text: 'New fail', style: { textAlign: 'center', padding: '6px 8px', background: C.bd + '33', color: C.m, fontSize: '11px' } }),
      h('th', { text: 'New pass', style: { textAlign: 'center', padding: '6px 8px', background: C.bd + '33', color: C.m, fontSize: '11px' } }),
      h('th', { text: 'Test time', style: { textAlign: 'center', padding: '6px 8px', background: C.bd + '33', color: C.m, fontSize: '11px' } }),
      h('th', { text: 'Δ vs nightly', style: { textAlign: 'center', padding: '6px 8px', background: C.bd + '33', color: C.m, fontSize: '11px' } }),
    ])]));
    const tb = h('tbody');
    const sorted = groups.slice().sort((a,b) => (b.new_fail - a.new_fail) || (b.test_total - a.test_total));
    for (const g of sorted) {
      const tr = h('tr', { style: { borderTop: `1px solid ${C.bd}33` } });
      tr.append(h('td', { text: g.group, style: { padding: '5px 8px', fontWeight: '500' } }));
      tr.append(h('td', { text: `${g.test_pass||0}/${g.test_fail||0}`, style: { padding: '5px 8px', textAlign: 'center' } }));
      tr.append(h('td', { text: `${g.nightly_pass||0}/${g.nightly_fail||0}`, style: { padding: '5px 8px', textAlign: 'center', color: C.m } }));
      tr.append(h('td', { text: String(g.new_fail||0), style: { padding: '5px 8px', textAlign: 'center', color: g.new_fail>0?C.r:C.m, fontWeight: g.new_fail>0?'700':'400' } }));
      tr.append(h('td', { text: String(g.new_pass||0), style: { padding: '5px 8px', textAlign: 'center', color: g.new_pass>0?C.g:C.m, fontWeight: g.new_pass>0?'700':'400' } }));
      tr.append(h('td', { text: g.test_duration ? (g.test_duration/60).toFixed(1)+'m' : '—', style: { padding: '5px 8px', textAlign: 'center' } }));
      const dd = g.duration_delta || 0;
      const ddText = dd === 0 ? '—' : (dd > 0 ? `+${(dd/60).toFixed(1)}m` : `${(dd/60).toFixed(1)}m`);
      const ddColor = dd > 30 ? C.r : (dd < -30 ? C.g : C.m);
      tr.append(h('td', { text: ddText, style: { padding: '5px 8px', textAlign: 'center', color: ddColor, fontWeight: Math.abs(dd)>30?'700':'400' } }));
      tb.append(tr);
    }
    tbl.append(tb);
    box.append(tbl);
    container.append(box);
  }

  async function renderBuildCard(container, entry) {
    const card = h('div', { style: { background: C.bg, border: `1px solid ${C.bd}`, borderRadius: '8px', padding: '14px 18px', marginBottom: '12px' } });
    const hdr = h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' } });
    const left = h('div');
    const title = h('div', { style: { fontSize: '14px', fontWeight: '600' } });
    const link = h('a', { text: `#${entry.build_number}`, href: entry.web_url, target: '_blank', style: { color: C.b, textDecoration: 'none', marginRight: '6px' } });
    title.append(link, h('span', { text: entry.message || '' }));
    left.append(title);
    left.append(h('div', { text: `${entry.branch_ref || entry.branch} · ${entry.commit ? entry.commit.slice(0,10) : ''} · @${entry.requested_by || '?'}${entry.base_image ? ' · base='+entry.base_image : ''}`, style: { fontSize: '12px', color: C.m, marginTop: '2px' } }));
    hdr.append(left);
    hdr.append(stateBadge(entry.state));
    card.append(hdr);

    const body = h('div', { style: { marginTop: '10px' } });
    if (entry.results_fetched && entry.comparison) {
      const comparison = await loadComparison(entry.id);
      if (comparison) {
        renderComparisonSummary(body, entry, comparison);
        renderGroupTable(body, comparison);
      }
    } else {
      body.append(h('div', { text: entry.state && entry.state !== 'passed' && entry.state !== 'failed'
        ? 'Build in progress. Results will appear after it finishes.'
        : 'Results not yet fetched. The collector refreshes every 30 min.', style: { fontSize: '12px', color: C.m } }));
    }
    card.append(body);

    container.append(card);
  }

  async function renderRegistryList(container, state) {
    const card = h('div', { style: { background: C.bg, border: `1px solid ${C.bd}`, borderRadius: '8px', padding: '14px 18px', marginBottom: '12px' } });
    card.append(h('h3', { text: 'Recent test builds', style: { marginTop: 0, fontSize: '15px' } }));
    const listHost = h('div');
    card.append(listHost);
    container.append(card);

    const rows = await loadRegistry();
    if (!rows.length) {
      listHost.append(h('p', { text: 'No test builds yet. Launch one above.', style: { color: C.m, fontSize: '13px' } }));
      return;
    }
    const sorted = rows.slice().sort((a,b) => (b.build_number||0) - (a.build_number||0));
    for (const entry of sorted) {
      await renderBuildCard(listHost, entry);
    }

    // Pending-cleanup handling: any entry with pending_cleanup && a fork branch
    // that looks managed by us ("test-image/*") gets a one-shot DELETE with
    // the user's PAT.
    const pat = await getPAT();
    if (!pat) return;
    const needsCleanup = rows.filter(r => r.pending_cleanup && r.fork_repo && r.branch && r.branch.startsWith('test-image/'));
    for (const r of needsCleanup) {
      try {
        await deleteBranch(pat, r.fork_repo, r.branch);
        console.log('Cleaned up', r.fork_repo, r.branch);
      } catch (e) { console.warn('Cleanup failed', r.id, e.message); }
    }
  }

  async function render() {
    const container = document.getElementById('ci-testbuild-view');
    if (!container) return;
    container.innerHTML = '';
    container.append(h('h2', { text: 'Test Build', style: { marginBottom: '12px' } }));
    container.append(h('p', { text: 'Launch a custom build on vllm/amd-ci (optionally against a forked branch with a patched base image), then compare its results head-to-head with the matching nightly.', style: { color: C.m, marginTop: 0, marginBottom: '14px' } }));

    const state = { render };
    renderPATBanner(container, state);
    renderBKBanner(container, state);
    renderForm(container, state);
    await renderRegistryList(container, state);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }

  // Re-render when the tab becomes active.
  document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('[data-tab="ci-testbuild"]');
    if (btn) setTimeout(render, 50);
  });
})();
