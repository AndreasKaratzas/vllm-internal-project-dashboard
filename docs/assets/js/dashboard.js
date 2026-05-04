/**
 * Main dashboard application.
 * Loads project config + JSON data, renders weekly stats, contributors, and cards.
 */
var _ds=getComputedStyle(document.documentElement);
var _TC={text:_ds.getPropertyValue('--text').trim()||'#e6edf3',muted:_ds.getPropertyValue('--text-muted').trim()||'#8b949e',border:_ds.getPropertyValue('--border').trim()||'#30363d'};
var HomeTableState = {
  prs: { page: 1, pageSize: 25, sortKey: 'updated', sortDir: 'desc' },
  issues: { page: 1, pageSize: 25, sortKey: 'updated', sortDir: 'desc' },
};
function _homeState(kind) {
  return HomeTableState[kind] || HomeTableState.prs;
}
function _rerenderHome() {
  if (typeof window.__dashboardRenderAll === 'function') window.__dashboardRenderAll();
}
window.setHomeSort = function(kind, key) {
  var s = _homeState(kind);
  if (s.sortKey === key) {
    s.sortDir = s.sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    s.sortKey = key;
    s.sortDir = key === 'title' || key === 'author' || key === 'owner' || key === 'status' ? 'asc' : 'desc';
  }
  s.page = 1;
  _rerenderHome();
};
window.setHomePage = function(kind, page) {
  var s = _homeState(kind);
  s.page = Math.max(1, parseInt(page, 10) || 1);
  _rerenderHome();
};
// Safe number formatting — prevents "Cannot read properties of undefined (reading 'toFixed')"
function _pct(v,d){return(typeof v==='number'?(v*100).toFixed(d||1):'N/A')+'%'}
function _fix(v,d){return typeof v==='number'?v.toFixed(d||1):'N/A'}
function _isFilePreview(){return location.protocol==='file:'}
function _computeLatestTs(d){
  var latestTs = null;
  for (const src of [d.prs, d.issues, d.releases, d.testResults]) {
    if (src && src.collected_at && (!latestTs || src.collected_at > latestTs)) latestTs = src.collected_at;
  }
  if (d.ciHealth && d.ciHealth.generated_at && (!latestTs || d.ciHealth.generated_at > latestTs)) latestTs = d.ciHealth.generated_at;
  return latestTs;
}
function renderStartupError(message,detail){
  var lastUpdated=document.getElementById('last-updated');
  if(lastUpdated) lastUpdated.textContent='Dashboard failed to load';
  var weekly=document.getElementById('weekly-summary');
  if(weekly) weekly.innerHTML='';
  var parity=document.getElementById('parity-view');
  if(parity) parity.innerHTML='';

  var title='Dashboard failed to load';
  var summary=message||'The dashboard could not load its startup data.';
  var body='<div style="margin:24px 0;padding:20px;border:1px solid #da3633;border-radius:12px;background:rgba(218,54,51,0.08)">';
  body+='<h2 style="margin:0 0 8px;color:#ffb3b3">'+escapeHtml(title)+'</h2>';
  body+='<p style="margin:0;color:var(--text,#e6edf3)">'+escapeHtml(summary)+'</p>';
  if(detail){
    body+='<p style="margin:12px 0 0;color:var(--text-muted,#8b949e);white-space:pre-line">'+escapeHtml(detail)+'</p>';
  }
  body+='</div>';

  var dashboard=document.getElementById('dashboard');
  if(dashboard) dashboard.innerHTML=body;
}

(async function init() {
  try {
    const projects = await fetchJSON("data/site/projects.json", { timeoutMs: 6000 });
    if (!projects || !projects.projects) {
      var loadMsg = _isFilePreview()
        ? 'This page was opened directly from disk, so the browser blocked the JSON fetches the dashboard needs.'
        : 'Failed to load project data.';
      var loadDetail = _isFilePreview()
        ? 'Start a local server instead, for example:\n\nnix develop -c python3 -m http.server 8000 -d docs\n\nThen open http://127.0.0.1:8000/'
        : 'Check the browser console and network tab for the first failed request.';
      renderStartupError(loadMsg, loadDetail);
      return;
    }

    // Load vLLM data only. ``readyTickets`` is the Projects V2 #39 view of
    // ``ci-failure`` issues — the Projects card uses it to enrich each tracked
    // issue with streak / break-frequency / hardware metadata so the reader
    // doesn't need to click through to see how long a group has been broken.
    const dataMap = {};
    const [prs, issues, releases, testResults] = await Promise.all([
      fetchJSON("data/vllm/prs.json", { timeoutMs: 6000 }),
      fetchJSON("data/vllm/issues.json", { timeoutMs: 6000 }),
      fetchJSON("data/vllm/releases.json", { timeoutMs: 6000 }),
      fetchJSON("data/vllm/test_results.json", { timeoutMs: 6000 }),
    ]);
    dataMap["vllm"] = {
      prs: prs,
      issues: issues,
      releases: releases,
      testResults: testResults,
      parityReport: null,
      ciHealth: null,
      ciParity: null,
      readyTickets: null,
      projectItems: null,
      amdTestMatrix: null,
    };

    let latestTs = _computeLatestTs(dataMap["vllm"]);
    function updateSidebarTs(ts) {
      document.getElementById("last-updated").textContent = ts
        ? "Last updated: " + relativeTime(ts) + " (" + formatDate(ts) + ")"
        : "Last updated: unknown";
    }
    updateSidebarTs(latestTs);
    // Keep sidebar timestamp fresh (update relative time every 60s)
    setInterval(function() { updateSidebarTs(latestTs); }, 60000);
    // Expose for CI Health auto-refresh to update when new data arrives
    window._updateSidebarTs = function(ts) { if (ts > latestTs) { latestTs = ts; } updateSidebarTs(latestTs); };

    // Render views — vLLM only
    var vllmCfg = {"vllm": projects.projects["vllm"]};
    function renderAll() {
      window.__dashboardRenderAll = renderAll;
      var renderSteps = [
        ['weekly-summary', 'CurrentSummary', function() { renderWeeklySummary(dataMap); }],
        ['dashboard', 'Cards', function() { renderCards(vllmCfg, dataMap); }],
        ['parity-view', 'TestParity', function() { renderParityView(vllmCfg, dataMap, null); }],
      ];
      for (var rs of renderSteps) {
        try {
          rs[2]();
        } catch (e) {
          console.error(rs[1] + ' render error:', e);
          var errEl = document.getElementById(rs[0]);
          if (errEl) errEl.innerHTML += '<div style="color:#da3633;padding:16px;border:1px solid #da3633;border-radius:8px;margin:12px">[' + rs[1] + ' error: ' + e.message + ']</div>';
        }
      }
    }
    renderAll();

    Promise.all([
      fetchJSON("data/vllm/parity_report.json", { timeoutMs: 7000 }),
      fetchJSON("data/vllm/ci/ci_health.json", { timeoutMs: 7000 }),
      fetchJSON("data/vllm/ci/parity_report.json", { timeoutMs: 7000 }),
      fetchJSON("data/vllm/ci/ready_tickets.json", { timeoutMs: 7000 }),
      fetchJSON("data/vllm/ci/project_items.json", { timeoutMs: 5000 }),
      fetchJSON("data/vllm/ci/amd_test_matrix.json", { timeoutMs: 7000 }),
    ]).then(function(extra) {
      dataMap["vllm"].parityReport = extra[0];
      dataMap["vllm"].ciHealth = extra[1];
      dataMap["vllm"].ciParity = extra[2];
      dataMap["vllm"].readyTickets = extra[3];
      dataMap["vllm"].projectItems = extra[4];
      dataMap["vllm"].amdTestMatrix = extra[5];
      var nextTs = _computeLatestTs(dataMap["vllm"]);
      if (nextTs) latestTs = nextTs;
      updateSidebarTs(latestTs);
      renderAll();
    });
  } catch (err) {
    console.error('Dashboard init failed:', err);
    var fallbackMsg = _isFilePreview()
      ? 'This page was opened directly from disk, so the browser blocked the dashboard data fetches.'
      : 'The dashboard hit an unexpected startup error.';
    var fallbackDetail = _isFilePreview()
      ? 'Start a local server instead, for example:\n\nnix develop -c python3 -m http.server 8000 -d docs\n\nThen open http://127.0.0.1:8000/'
      : (err && err.message ? err.message : 'Check the browser console for the first stack trace.');
    renderStartupError(fallbackMsg, fallbackDetail);
  }
})();

// Tab switching — runs immediately, independent of async data loading.
// Navigation is intentionally auth-agnostic: protected tabs stay
// discoverable, and their own renderers decide whether to show the tool
// or a sign-in / admin-required state.
(function() {
  function _hasTab(id) {
    return !!(id && document.getElementById('tab-' + id));
  }

  function _reapplyVisibility() {
    if (window.__authGate && typeof window.__authGate.applyTabVisibility === 'function') {
      window.__authGate.applyTabVisibility();
    }
  }

  function switchTab(target) {
    if (!_hasTab(target)) {
      target = 'projects';
    }
    document.querySelectorAll(".nav-btn").forEach(function (b) { b.classList.remove("active"); });
    document.querySelectorAll(".tab-panel").forEach(function (p) { p.classList.remove("active"); });
    var btn = document.querySelector('.nav-btn[data-tab="' + target + '"]');
    if (btn) btn.classList.add("active");
    var panel = document.getElementById("tab-" + target);
    if (panel) panel.classList.add("active");
    _reapplyVisibility();
    return target;
  }

  window.__dashboardNav = {
    switchTab: function(target, opts) {
      opts = opts || {};
      var next = switchTab(target);
      if (opts.updateHash !== false) {
        history.replaceState(null, "", "#" + next);
      }
      if (next === "builds" && window._onBuildTabShown) {
        window._onBuildTabShown();
      }
      if (next === "trends" && window._onTrendsTabShown) {
        window._onTrendsTabShown();
      }
      return next;
    },
  };

  var sidebarNav = document.getElementById('sidebar-nav');
  if (sidebarNav) {
    sidebarNav.addEventListener('click', function(e) {
      var btn = e.target.closest && e.target.closest('.nav-btn');
      if (!btn) return;
      var target = btn.getAttribute('data-tab');
      if (!target) return;
      window.__dashboardNav.switchTab(target);
    });
  }

  // Activate tab from URL hash on load.
  var hash = location.hash.replace("#", "");
  if (hash && _hasTab(hash)) {
    switchTab(hash);
  }

  // React to manual hash edits after boot too.
  window.addEventListener('hashchange', function() {
    var h = location.hash.replace('#', '');
    if (!h || !_hasTab(h)) return;
    switchTab(h);
  });

  document.addEventListener('auth:changed', _reapplyVisibility);
})();

function renderWeeklySummary(dataMap) {
  let totalOpenPrs = 0;
  let totalCiPrs = 0;
  let totalRocmPrs = 0;
  let totalIssues = 0;

  for (const d of Object.values(dataMap)) {
    const prs = (d.prs && d.prs.prs) || [];
    const issues = (d.issues && d.issues.issues) || [];
    const openPrs = prs.filter(function(p) { return p.state === 'open'; });
    totalOpenPrs += openPrs.length;
    totalCiPrs += openPrs.filter(function(p) { return !!p.is_ci_pr; }).length;
    totalRocmPrs += openPrs.filter(function(p) { return !!p.is_rocm_pr || _labelHas(p, 'rocm'); }).length;
    totalIssues += issues.filter(function(i) { return (i.state || '').toLowerCase() === 'open'; }).length;
  }

  const el = document.getElementById("weekly-summary");
  el.innerHTML =
    '<h2>Current Snapshot</h2>' +
    '<div class="weekly-boxes">' +
    '<div class="weekly-box weekly-box-opened"><div class="weekly-num">' + totalOpenPrs + '</div><div class="weekly-label">Open PRs</div></div>' +
    '<div class="weekly-box weekly-box-merged"><div class="weekly-num">' + totalCiPrs + '</div><div class="weekly-label">CI PRs</div></div>' +
    '<div class="weekly-box weekly-box-rocm"><div class="weekly-num">' + totalRocmPrs + '</div><div class="weekly-label">ROCm PRs</div></div>' +
    '<div class="weekly-box weekly-box-issues"><div class="weekly-num">' + totalIssues + '</div><div class="weekly-label">Open Project Issues</div></div>' +
    '</div>';
}

function renderCards(projectsCfg, dataMap) {
  const dashboard = document.getElementById("dashboard");
  dashboard.innerHTML = "";

  for (const [name, cfg] of Object.entries(projectsCfg)) {
    const d = dataMap[name] || {};
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = buildCard(name, cfg, d);
    dashboard.appendChild(card);
  }

  if (!dashboard.children.length) {
    dashboard.innerHTML = '<p class="empty">No projects found.</p>';
  }
}

function renderParityView(projectsCfg, dataMap, parityHistData) {
  var el = document.getElementById("parity-view");
  var hasAny = false;

  for (var name in dataMap) {
    if (dataMap[name].testResults || dataMap[name].parityReport || dataMap[name].ciParity) { hasAny = true; break; }
  }

  if (!hasAny) {
    el.innerHTML = '<h2>ROCm vs CUDA Test Parity</h2><p class="parity-no-data">No test result data available yet.</p>';
    return;
  }

  var html = '<h2>ROCm vs CUDA Test Parity</h2>';
  html += '<div class="parity-grid">';

  for (var name in projectsCfg) {
    var cfg = projectsCfg[name];
    var d = dataMap[name] || {};
    var tr = d.testResults;
    if (!tr && !d.parityReport && !d.ciParity) continue;

    // vLLM CI parity card (from Buildkite CI data)
    if (name === "vllm" && d.ciParity) {
      var p = d.ciParity;
      var groups = typeof mergeParityGroups === 'function'
        ? mergeParityGroups(p.job_groups || [])
        : mergeShardedGroups(p.job_groups || []);
      var both = groups.filter(function(g) { return g.amd && g.upstream; });
      var amdOnly = groups.filter(function(g) { return g.amd && !g.upstream; });
      var upOnly = groups.filter(function(g) { return !g.amd && g.upstream; });
      var passing = both.filter(function(g) { return (g.amd.failed || 0) === 0 && !((g.amd.canceled || 0) > 0 && (g.amd.passed || 0) === 0); });
      var parityPct = both.length > 0 ? Math.round(passing.length / both.length * 100) : 0;

      var regressions = both.filter(function(g) { return (g.amd.failed || 0) > 0 && (g.upstream.failed || 0) === 0; });
      var bothFail = both.filter(function(g) { return (g.amd.failed || 0) > 0 && (g.upstream.failed || 0) > 0; });
      var total = both.length + amdOnly.length + upOnly.length;
      var overlapPct = total > 0 ? Math.round(both.length / total * 100) : 0;

      // Store groups on window for overlay access
      var overlayId = 'parity_' + Date.now();
      window['_parityData_' + overlayId] = { both: both, amdOnly: amdOnly, upOnly: upOnly, groups: groups };

      html += '<div class="parity-card" style="max-width:none">';
      html += '<div class="parity-card-header"><h3>' + LinkRegistry.aTag(LinkRegistry.github.repo(cfg.repo), 'vLLM') + '</h3></div>';

      // 5-column stats — each clickable to show group list overlay
      html += '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin:16px 0">';

      html += '<div style="text-align:center;padding:14px;background:var(--bg);border-radius:6px;border:1px solid var(--border);border-top:3px solid #da3633;cursor:pointer;transition:transform .15s,box-shadow .15s" onclick="showGroupOverlay(\'' + overlayId + '\',\'amd\')" onmouseenter="this.style.transform=\'translateY(-2px)\';this.style.boxShadow=\'0 4px 12px rgba(0,0,0,.3)\'" onmouseleave="this.style.transform=\'\';this.style.boxShadow=\'\'">';
      html += '<div style="font-size:28px;font-weight:800;color:#da3633">' + (both.length + amdOnly.length) + '</div>';
      html += '<div style="font-size:15px;color:var(--text-muted)">AMD Test Groups</div>';
      html += '<div style="font-size:13px;color:var(--text-muted);margin-top:4px">click to view</div></div>';

      html += '<div style="text-align:center;padding:14px;background:var(--bg);border-radius:6px;border:1px solid var(--border);border-top:3px solid #238636;cursor:pointer;transition:transform .15s,box-shadow .15s" onclick="showGroupOverlay(\'' + overlayId + '\',\'common\')" onmouseenter="this.style.transform=\'translateY(-2px)\';this.style.boxShadow=\'0 4px 12px rgba(0,0,0,.3)\'" onmouseleave="this.style.transform=\'\';this.style.boxShadow=\'\'">';
      html += '<div style="font-size:28px;font-weight:800;color:#238636">' + both.length + '</div>';
      html += '<div style="font-size:15px;color:var(--text-muted)">Common Groups</div>';
      html += '<div style="font-size:14px;color:var(--text-muted);margin-top:4px">' + overlapPct + '% overlap</div></div>';

      html += '<div style="text-align:center;padding:14px;background:var(--bg);border-radius:6px;border:1px solid var(--border);border-top:3px solid #1f6feb;cursor:pointer;transition:transform .15s,box-shadow .15s" onclick="showGroupOverlay(\'' + overlayId + '\',\'upstream\')" onmouseenter="this.style.transform=\'translateY(-2px)\';this.style.boxShadow=\'0 4px 12px rgba(0,0,0,.3)\'" onmouseleave="this.style.transform=\'\';this.style.boxShadow=\'\'">';
      html += '<div style="font-size:28px;font-weight:800;color:#1f6feb">' + (both.length + upOnly.length) + '</div>';
      html += '<div style="font-size:15px;color:var(--text-muted)">Upstream Test Groups</div>';
      html += '<div style="font-size:13px;color:var(--text-muted);margin-top:4px">click to view</div></div>';

      html += '<div style="text-align:center;padding:14px;background:var(--bg);border-radius:6px;border:1px solid rgba(218,54,51,0.2);border-top:3px solid #da3633;cursor:pointer;transition:transform .15s,box-shadow .15s" onclick="showGroupOverlay(\'' + overlayId + '\',\'amd-only\')" onmouseenter="this.style.transform=\'translateY(-2px)\';this.style.boxShadow=\'0 4px 12px rgba(0,0,0,.3)\'" onmouseleave="this.style.transform=\'\';this.style.boxShadow=\'\'">';
      html += '<div style="font-size:28px;font-weight:800;color:#da3633">' + amdOnly.length + '</div>';
      html += '<div style="font-size:15px;color:var(--text-muted)">AMD-Only</div></div>';

      html += '<div style="text-align:center;padding:14px;background:var(--bg);border-radius:6px;border:1px solid rgba(31,111,235,0.2);border-top:3px solid #1f6feb;cursor:pointer;transition:transform .15s,box-shadow .15s" onclick="showGroupOverlay(\'' + overlayId + '\',\'upstream-only\')" onmouseenter="this.style.transform=\'translateY(-2px)\';this.style.boxShadow=\'0 4px 12px rgba(0,0,0,.3)\'" onmouseleave="this.style.transform=\'\';this.style.boxShadow=\'\'">';
      html += '<div style="font-size:28px;font-weight:800;color:#1f6feb">' + upOnly.length + '</div>';
      html += '<div style="font-size:15px;color:var(--text-muted)">Upstream-Only</div></div>';

      html += '</div>';

      // Pass rate bars - stacked by hardware
      if (d.ciHealth) {
        html += '<div style="margin-bottom:12px">';
        // Running build banner
        if (d.ciHealth.amd && d.ciHealth.amd.latest_build && d.ciHealth.amd.latest_build.is_running) {
          var rlb = d.ciHealth.amd.latest_build;
          var rdone = (rlb.jobs_passed||0) + (rlb.jobs_failed||0);
          var rprog = rlb.job_count > 0 ? Math.round(rdone / rlb.job_count * 100) : 0;
          html += '<div style="background:#d2992215;border:1px solid #d29922;border-radius:6px;padding:8px 12px;margin-bottom:8px;font-size:12px;color:var(--text,#e6edf3)">';
          html += '&#9888; <strong>Build #' + rlb.build_number + ' running</strong> — ' + rdone + '/' + rlb.job_count + ' jobs (' + rprog + '%)';
          if (rlb.jobs_soft_failed) html += ' &bull; <span style="color:#da3633">' + rlb.jobs_soft_failed + ' soft-failed</span>';
          html += '</div>';
        }
        // AMD bar: per-hardware test-group percentages.
        // Each row = one AMD hardware, bar width = fraction of AMD groups that
        // run on this hw, fill = group-level pass rate on that hw. This
        // replaces the old test-count segmentation with the aggregate we
        // actually care about (groups per hw, not tests).
        if (d.ciHealth.amd && d.ciHealth.amd.latest_build) {
          var lb = d.ciHealth.amd.latest_build;
          var hwColors = {mi250:'#ff6b6b',mi300:'#c92a2a',mi325:'#da3633',mi355:'#b71c1c'};
          var hwNames = {mi250:'MI250',mi300:'MI300',mi325:'MI325',mi355:'MI355'};

          // Build per-hardware group stats from parity data.
          var hwStats = {};
          var totalAmdGroups = 0;
          for (var gi = 0; gi < groups.length; gi++) {
            var gg = groups[gi];
            if (!gg.amd) continue;
            var hwList = gg.hardware || [];
            var anyAmdHw = false;
            for (var ghi = 0; ghi < hwList.length; ghi++) {
              var hwk = hwList[ghi];
              if (!hwColors[hwk]) continue;
              anyAmdHw = true;
              if (!hwStats[hwk]) hwStats[hwk] = {total:0, failing:0};
              hwStats[hwk].total++;
              var hwFails = gg.hw_failures && gg.hw_failures[hwk];
              if (hwFails && hwFails > 0) hwStats[hwk].failing++;
            }
            if (anyAmdHw) totalAmdGroups++;
          }

          var hwKeys = Object.keys(hwStats).sort();

          // Master AMD bar: aggregate pass rate computed from the summed
          // hardware breakdown (passing-on-hw / total-group-on-hw counts), not
          // a straight average of per-hw rates and not the job-level pass_rate
          // from the latest build.
          var masterTotal = 0, masterPass = 0;
          for (var mk = 0; mk < hwKeys.length; mk++) {
            masterTotal += hwStats[hwKeys[mk]].total;
            masterPass  += (hwStats[hwKeys[mk]].total - hwStats[hwKeys[mk]].failing);
          }
          var masterRate = masterTotal > 0 ? masterPass / masterTotal : 0;

          html += '<div class="pass-rate-row">';
          html += '<span class="pass-rate-label" style="cursor:pointer" onclick="document.querySelector(\'.nav-btn[data-tab=ci-health]\').click()">AMD (' + totalAmdGroups + ' test groups)</span>';
          html += '<div class="pass-rate-bar-bg"><div style="width:' + _fix(masterRate*100,2) + '%;height:100%;background:#da3633;border-radius:4px" title="AMD overall: ' + masterPass + '/' + masterTotal + ' hardware-group slots passing (' + _fix(masterRate*100,1) + '%)"></div></div>';
          html += '<span class="pass-rate-pct">' + _fix(masterRate*100,1) + '%</span>';
          html += '</div>';

          for (var hii = 0; hii < hwKeys.length; hii++) {
            var hk = hwKeys[hii];
            var hs = hwStats[hk];
            var hwPass = hs.total - hs.failing;
            var hwRate = hs.total > 0 ? hwPass / hs.total : 0;
            var hwShare = totalAmdGroups > 0 ? hs.total / totalAmdGroups * 100 : 0;
            var hwColor = hwColors[hk] || '#da3633';
            html += '<div class="pass-rate-row" style="margin-left:12px;font-size:13px">';
            html += '<span class="pass-rate-label" style="font-size:13px;color:var(--text-muted)">' + (hwNames[hk]||hk) + ' <span style="color:var(--text-muted);font-size:12px">(' + hs.total + ' groups, ' + _fix(hwShare,0) + '% of AMD)</span></span>';
            html += '<div class="pass-rate-bar-bg" style="height:8px"><div style="width:' + _fix(hwRate*100,2) + '%;height:100%;background:' + hwColor + ';border-radius:4px" title="' + (hwNames[hk]||hk) + ': ' + hwPass + '/' + hs.total + ' groups passing (' + _fix(hwRate*100,1) + '%)"></div></div>';
            html += '<span class="pass-rate-pct" style="font-size:13px">' + _fix(hwRate*100,1) + '%</span>';
            html += '</div>';
          }
        }
        // Upstream bar (single color - blue)
        if (d.ciHealth.upstream && d.ciHealth.upstream.latest_build) {
          var ulb = d.ciHealth.upstream.latest_build;
          html += '<div class="pass-rate-row">';
          var upGroups = ulb.unique_test_groups || ((ulb.passed||0) + (ulb.failed||0));
          html += '<span class="pass-rate-label" style="cursor:pointer" onclick="document.querySelector(\'.nav-btn[data-tab=ci-health]\').click()">Upstream (' + upGroups + ' test groups)</span>';
          html += '<div class="pass-rate-bar-bg"><div style="width:' + (ulb.pass_rate*100) + '%;height:100%;background:#1f6feb;border-radius:4px"></div></div>';
          html += '<span class="pass-rate-pct">' + _fix(ulb.pass_rate*100,1) + '%</span>';
          html += '</div>';
        }
        html += '</div>';
      }

      html += buildParityHardwareBreakdown(d.ciHealth, p);

      // Regressions — fully expandable
      if (regressions.length > 0) {
        html += '<details style="margin-top:12px;padding:10px;background:rgba(218,54,51,0.1);border:1px solid #da3633;border-radius:6px">';
        html += '<summary style="cursor:pointer;font-weight:600;color:#da3633">' + regressions.length + ' AMD regressions (pass upstream, fail on AMD)</summary>';
        html += '<ul style="margin:8px 0 0 16px;font-size:14px;color:var(--text-muted)">';
        regressions.forEach(function(g) { html += '<li>' + g.name + ' — <span style="color:#da3633;font-weight:600">' + (g.amd.failed||0) + '</span> failures</li>'; });
        html += '</ul></details>';
      }
      html += '</div>';
      continue;
    }

    if (!tr) continue;

    var rocm = tr.rocm;
    var cuda = tr.cuda;
    var repoUrl = LinkRegistry.github.repo(cfg.repo);

    html += '<div class="parity-card">';

    // Header with project name and overall conclusion
    html += '<div class="parity-card-header">';
    html += LinkRegistry.aTag(repoUrl, name);
    var conclParts = [];
    if (rocm) conclParts.push("ROCm: " + (rocm.conclusion || "?"));
    if (cuda) conclParts.push("CUDA: " + (cuda.conclusion || "?"));
    if (conclParts.length) {
      html += '<span class="parity-conclusion">' + escapeHtml(conclParts.join(" | ")) + '</span>';
    }
    html += '</div>';

    // CUDA Parity bar (primary)
    if (tr.cuda_parity) {
      html += buildParityBar(tr.cuda_parity);
    }

    // Per-platform pass rates (secondary)
    html += '<div class="parity-bars">';
    if (rocm && rocm.summary) html += buildPassRateBar("ROCm", rocm.summary, rocm.run_url);
    if (cuda && cuda.summary) html += buildPassRateBar("CUDA", cuda.summary, cuda.run_url);
    html += '</div>';

    // Stats line
    html += '<div class="parity-stats">';
    if (rocm && rocm.summary) {
      var rs = rocm.summary;
      html += '<span>ROCm: <span class="stat-num">' + (rs.passed || 0) + '</span> passed';
      if (rs.failed) html += ', <span class="stat-num">' + rs.failed + '</span> failed';
      if (rs.skipped) html += ', ' + rs.skipped + ' skipped';
      html += '</span>';
    }
    if (cuda && cuda.summary) {
      var cs = cuda.summary;
      html += '<span>CUDA: <span class="stat-num">' + (cs.passed || 0) + '</span> passed';
      if (cs.failed) html += ', <span class="stat-num">' + cs.failed + '</span> failed';
      if (cs.skipped) html += ', ' + cs.skipped + ' skipped';
      html += '</span>';
    }
    html += '</div>';

    // Suite detail table (collapsible)
    var suiteHtml = buildSuiteTable(rocm, cuda);
    if (suiteHtml) {
      var suiteCount = ((rocm && rocm.suites) ? rocm.suites.length : 0) + ((cuda && cuda.suites) ? cuda.suites.length : 0);
      html += '<details><summary>Test Suites (' + suiteCount + ')</summary>' + suiteHtml + '</details>';
    }

    // Freshness line
    var dates = [];
    if (rocm && rocm.run_date) dates.push("ROCm: " + relativeTime(rocm.run_date));
    if (cuda && cuda.run_date) dates.push("CUDA: " + relativeTime(cuda.run_date));
    if (dates.length) {
      html += '<div class="test-meta">Runs: ' + dates.join(", ");
      if (tr.source === "manual") html += " (manual)";
      html += '</div>';
    }

    html += '</div>'; // parity-card
  }

  html += '</div>'; // parity-grid
  el.innerHTML = html;
}

function _amdHwLabel(hw) {
  var names = { mi250: 'MI250 (gfx90a)', mi300: 'MI300', mi325: 'MI325 (gfx942)', mi355: 'MI355 (gfx950)' };
  return names[hw] || String(hw || 'unknown').toUpperCase();
}

function _isAmdHwKey(hw) {
  return /^mi\d+/i.test(String(hw || ''));
}

function _parityHwGroupMap(parity) {
  var merged = parity && parity.job_groups
    ? (typeof mergeShardedGroups === 'function' ? mergeShardedGroups(parity.job_groups) : parity.job_groups)
    : [];
  var map = {};
  for (var i = 0; i < merged.length; i++) {
    var g = merged[i];
    if (!g || (!g.amd && !g.upstream && !g.backfilled && !g.hw_backfilled)) continue;
    var hardware = g.hardware || [];
    for (var j = 0; j < hardware.length; j++) {
      var hw = hardware[j];
      if (!_isAmdHwKey(hw)) continue;
      if (!map[hw]) map[hw] = { passing: [], failing: [], pending: [], canceled: [] };
      var pending = g.backfilled || (g.hw_backfilled && g.hw_backfilled[hw]);
      if (pending) {
        map[hw].pending.push(g);
        continue;
      }
      var failed = !!(g.hw_failures && g.hw_failures[hw] > 0);
      var canceled = !!(g.hw_canceled && g.hw_canceled[hw] > 0 && !failed);
      if (failed) map[hw].failing.push(g);
      else if (canceled) map[hw].canceled.push(g);
      else map[hw].passing.push(g);
    }
  }
  return map;
}

function buildParityHardwareBreakdown(health, parity) {
  var latest = health && health.amd && health.amd.latest_build;
  if (!latest || !latest.by_hardware) return '';
  var hwMap = _parityHwGroupMap(parity);
  var rows = Object.entries(latest.by_hardware)
    .filter(function(entry) { return _isAmdHwKey(entry[0]); })
    .sort(function(a, b) { return a[0].localeCompare(b[0]); });
  if (!rows.length) return '';
  var overlayId = 'parity_hw_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
  window['_parityHwData_' + overlayId] = { map: hwMap, counts: latest.by_hardware, buildUrl: latest.build_url || '' };
  var html = '<details class="parity-hw-breakdown" open>';
  html += '<summary><span style="color:#da3633;font-weight:700">AMD</span> Hardware Breakdown</summary>';
  html += '<table class="parity-hw-table"><tr><th>Hardware</th><th>Group Pass Rate</th><th>Passing</th><th>Failing</th><th>Total Groups</th><th>Tests (P/F/S)</th></tr>';
  for (var i = 0; i < rows.length; i++) {
    var hw = rows[i][0];
    var counts = rows[i][1] || {};
    var groups = hwMap[hw] || { passing: [], failing: [], pending: [], canceled: [] };
    var pass = groups.passing.length;
    var fail = groups.failing.length;
    var pending = groups.pending.length;
    var canceled = groups.canceled.length;
    var current = pass + fail + canceled;
    var total = current + pending;
    var rate = current > 0 ? pass / current : 1;
    var color = rate >= 0.95 ? '#238636' : rate >= 0.85 ? '#d29922' : rate >= 0.7 ? '#db6d28' : '#da3633';
    html += '<tr class="clickable-row" onclick="showParityHwOverlay(\'' + overlayId + '\',\'' + escapeHtml(hw) + '\')">';
    html += '<td><a href="javascript:void(0)" onclick="event.preventDefault()">' + escapeHtml(_amdHwLabel(hw)) + '</a></td>';
    html += '<td><span class="mini-bar"><span style="width:' + _fix(rate * 100, 2) + '%;background:' + color + '"></span></span> <strong style="color:' + color + '">' + _fix(rate * 100, 0) + '%</strong></td>';
    html += '<td class="num-good">' + pass + '</td>';
    html += '<td class="' + (fail > 0 ? 'num-bad' : 'num-good') + '">' + fail + '</td>';
    html += '<td>' + total + (pending ? ' <span class="muted">(' + pending + ' pending)</span>' : '') + (canceled ? ' <span class="muted">(' + canceled + ' canceled)</span>' : '') + '</td>';
    html += '<td><span class="num-good">' + (counts.passed || 0).toLocaleString() + '</span> / <span class="' + ((counts.failed || 0) > 0 ? 'num-bad' : 'muted') + '">' + (counts.failed || 0) + '</span> / <span class="muted">' + (counts.skipped || 0).toLocaleString() + '</span></td>';
    html += '</tr>';
  }
  html += '</table></details>';
  return html;
}

window.showParityHwOverlay = function(dataId, hw) {
  var data = window['_parityHwData_' + dataId];
  if (!data) return;
  var groups = (data.map && data.map[hw]) || { passing: [], failing: [], pending: [], canceled: [] };
  var all = []
    .concat((groups.failing || []).map(function(g) { return { g: g, status: 'FAIL' }; }))
    .concat((groups.canceled || []).map(function(g) { return { g: g, status: 'CANCELED' }; }))
    .concat((groups.passing || []).map(function(g) { return { g: g, status: 'PASS' }; }))
    .concat((groups.pending || []).map(function(g) { return { g: g, status: 'PENDING' }; }));
  all.sort(function(a, b) {
    var order = { FAIL: 0, CANCELED: 1, PASS: 2, PENDING: 3 };
    var ao = order[a.status] == null ? 9 : order[a.status];
    var bo = order[b.status] == null ? 9 : order[b.status];
    if (ao !== bo) return ao - bo;
    return (a.g.name || '').localeCompare(b.g.name || '');
  });
  var backdrop = document.createElement('div');
  backdrop.className = 'overlay-backdrop';
  backdrop.onclick = function(e) { if (e.target === backdrop) backdrop.remove(); };
  var panel = document.createElement('div');
  panel.className = 'overlay-panel';
  var header = document.createElement('div');
  header.className = 'overlay-header';
  header.innerHTML = '<h3>' + escapeHtml(_amdHwLabel(hw)) + ' <span style="color:var(--text-muted);font-weight:400">(' + all.length + ' groups)</span></h3>';
  var closeBtn = document.createElement('button');
  closeBtn.className = 'overlay-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.onclick = function() { backdrop.remove(); };
  header.appendChild(closeBtn);
  var body = document.createElement('div');
  body.className = 'overlay-body';
  var html = '<table style="width:100%;border-collapse:collapse;font-size:14px"><tr><th>#</th><th>Test Group</th><th>Tests P/F/S</th><th>Status</th><th>Links</th></tr>';
  for (var i = 0; i < all.length; i++) {
    var row = all[i], g = row.g || {};
    var a = g.amd || {};
    var link = '';
    if (g.job_links) {
      for (var j = 0; j < g.job_links.length; j++) {
        var jl = g.job_links[j];
        if (jl.side === 'amd' && (!jl.hw || jl.hw === hw)) {
          link = LinkRegistry.aTag(jl.url, 'log');
          break;
        }
      }
    }
    if (!link && data.buildUrl) link = LinkRegistry.aTag(data.buildUrl, 'build');
    var statusCls = row.status === 'FAIL' ? 'num-bad' : row.status === 'PASS' ? 'num-good' : 'muted';
    html += '<tr>';
    html += '<td>' + (i + 1) + '</td>';
    html += '<td>' + escapeHtml(g.name || '') + '</td>';
    html += '<td><span class="num-good">' + (a.passed || 0) + '</span>/<span class="' + ((a.failed || 0) > 0 ? 'num-bad' : 'muted') + '">' + (a.failed || 0) + '</span>/<span class="muted">' + (a.skipped || 0) + '</span></td>';
    html += '<td class="' + statusCls + '">' + row.status + '</td>';
    html += '<td>' + (link || '<span class="muted">-</span>') + '</td>';
    html += '</tr>';
  }
  html += '</table>';
  body.innerHTML = html;
  panel.appendChild(header);
  panel.appendChild(body);
  backdrop.appendChild(panel);
  document.body.appendChild(backdrop);
};

function _labelHas(item, wanted) {
  var labels = (item && item.labels) || [];
  var w = String(wanted || '').toLowerCase();
  return labels.some(function(label) { return String(label).toLowerCase() === w; });
}

function _csvText(values) {
  return (values || []).map(function(v) { return String(v || '').toLowerCase(); }).join(' ');
}

function _sortValue(row, key, kind) {
  if (kind === 'prs') {
    if (key === 'number') return row.number || 0;
    if (key === 'title') return (row.title || '').toLowerCase();
    if (key === 'author') return (effectiveAuthor(row) || '').toLowerCase();
    if (key === 'ci') return row.is_ci_pr ? 1 : 0;
    if (key === 'rocm') return (row.is_rocm_pr || _labelHas(row, 'rocm')) ? 1 : 0;
    if (key === 'tags') return _csvText(row.other_tags || row.labels || []);
    return Date.parse(row.updated_at || row.created_at || '') || 0;
  }
  if (key === 'number') return row.number || 0;
  if (key === 'title') return (row.title || '').toLowerCase();
  if (key === 'owner') return _csvText(row.assignees || []);
  if (key === 'status') return (row.project_status || '').toLowerCase();
  if (key === 'prs') return (row.linked_prs || []).length;
  return Date.parse(row.updated_at || row.created_at || '') || 0;
}

function _sortedRows(rows, kind) {
  var s = _homeState(kind);
  return rows.slice().sort(function(a, b) {
    var av = _sortValue(a, s.sortKey, kind);
    var bv = _sortValue(b, s.sortKey, kind);
    var cmp = 0;
    if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
    else cmp = String(av).localeCompare(String(bv));
    if (cmp === 0) cmp = (b.number || 0) - (a.number || 0);
    return s.sortDir === 'asc' ? cmp : -cmp;
  });
}

function _sortTh(kind, key, label) {
  var s = _homeState(kind);
  var active = s.sortKey === key;
  var arrow = active ? (s.sortDir === 'asc' ? ' &uarr;' : ' &darr;') : '';
  return '<th><button class="table-sort" type="button" onclick="setHomeSort(\'' + kind + '\',\'' + key + '\')">' + escapeHtml(label) + arrow + '</button></th>';
}

function _pager(kind, total) {
  var s = _homeState(kind);
  var pages = Math.max(1, Math.ceil(total / s.pageSize));
  if (s.page > pages) s.page = pages;
  if (pages <= 1) return '';
  var html = '<div class="table-pager">';
  html += '<button type="button" ' + (s.page <= 1 ? 'disabled' : '') + ' onclick="setHomePage(\'' + kind + '\',' + (s.page - 1) + ')">Prev</button>';
  html += '<span>Page ' + s.page + ' of ' + pages + '</span>';
  html += '<button type="button" ' + (s.page >= pages ? 'disabled' : '') + ' onclick="setHomePage(\'' + kind + '\',' + (s.page + 1) + ')">Next</button>';
  html += '</div>';
  return html;
}

function _pageRows(rows, kind) {
  var s = _homeState(kind);
  var pages = Math.max(1, Math.ceil(rows.length / s.pageSize));
  if (s.page > pages) s.page = pages;
  var start = (s.page - 1) * s.pageSize;
  return rows.slice(start, start + s.pageSize);
}

function _tagChip(label, cls) {
  return '<span class="tag-chip ' + (cls || '') + '">' + escapeHtml(label) + '</span>';
}

function _prTagCell(pr) {
  var parts = [];
  if (pr.is_ci_pr) parts.push(_tagChip('CI', 'tag-ci'));
  if (pr.is_rocm_pr || _labelHas(pr, 'rocm')) parts.push(_tagChip('ROCm', 'tag-rocm'));
  return parts.length ? parts.join(' ') : '<span class="muted">-</span>';
}

function _otherTagCell(pr) {
  var tags = pr.other_tags || (pr.labels || []).filter(function(label) {
    return String(label).toLowerCase() !== 'rocm';
  });
  if (!tags.length) return '<span class="muted">-</span>';
  return tags.slice(0, 4).map(function(label) { return _tagChip(label, 'tag-label'); }).join(' ') +
    (tags.length > 4 ? ' <span class="muted">+' + (tags.length - 4) + '</span>' : '');
}

function buildCard(name, cfg, d) {
  const repoUrl = LinkRegistry.github.repo(cfg.repo);
  const prs = (d.prs && d.prs.prs) || [];
  const issues = (d.issues && d.issues.issues) || [];
  const projectItemsByNum = (d.projectItems && d.projectItems.items_by_number) || {};
  const openPrs = prs.filter((p) => p.state === "open");
  const projectIssues = issues.filter(function(i) { return (i.state || '').toLowerCase() === 'open'; });
  const ciIssueNumSet = new Set(projectIssues.map(function(i) { return i.number; }));

  // Index ready_tickets.json so we can surface streak / break-frequency /
  // hardware metadata inline. We index by both ``issue_number`` (populated
  // in live mode and by the dry-run preflight when token+match succeed)
  // AND by ``title`` — the canonical ``[CI Failure]:`` title is stable
  // across the syncer and the upstream issue, so the title lookup
  // recovers metadata even when ``issue_number`` is null in the preview
  // dump.
  const ticketsByNum = {};
  const ticketsByTitle = {};
  const issueLinkedPrsByNum = {};
  const issueNumsByLinkedPr = {};
  if (d.readyTickets && Array.isArray(d.readyTickets.tickets)) {
    for (const t of d.readyTickets.tickets) {
      if (t.issue_number) ticketsByNum[t.issue_number] = t;
      if (t.title) ticketsByTitle[t.title] = t;
      if (t.issue_number && Array.isArray(t.linked_prs)) {
        issueLinkedPrsByNum[t.issue_number] = t.linked_prs;
        for (const ref of t.linked_prs) {
          const prNum = parseInt(ref && ref.number, 10);
          if (!prNum) continue;
          if (!issueNumsByLinkedPr[prNum]) issueNumsByLinkedPr[prNum] = [];
          if (issueNumsByLinkedPr[prNum].indexOf(t.issue_number) === -1) {
            issueNumsByLinkedPr[prNum].push(t.issue_number);
          }
        }
      }
    }
  }
  for (const issue of projectIssues) {
    if (Array.isArray(issue.linked_prs) && issue.linked_prs.length) {
      issueLinkedPrsByNum[issue.number] = issue.linked_prs;
      for (const ref of issue.linked_prs) {
        const prNum = parseInt(ref && ref.number, 10);
        if (!prNum) continue;
        if (!issueNumsByLinkedPr[prNum]) issueNumsByLinkedPr[prNum] = [];
        if (issueNumsByLinkedPr[prNum].indexOf(issue.number) === -1) {
          issueNumsByLinkedPr[prNum].push(issue.number);
        }
      }
    }
  }

  // project_items.json is the live snapshot of every item on project #39
  // keyed by issue_number. Used to render the current column (Backlog /
  // Ready / In Progress / In Review / Done) next to each CI issue row.
  // May be absent in dry-run environments — callers must handle {}.
  const projectBoardUrl =
    (d.projectItems && d.projectItems.project_url) ||
    LinkRegistry.github.orgProject("vllm-project", 39);

  const ciPrs = openPrs.filter(function(p) { return p.is_ci_pr || _linkedCiIssueNums(p, ciIssueNumSet, issueNumsByLinkedPr).length > 0; });
  const rocmPrs = openPrs.filter(function(p) { return p.is_rocm_pr || _labelHas(p, 'rocm'); });

  let html = "";

  // Header
  html += '<div class="card-header">';
  html += LinkRegistry.aTag(repoUrl, name);
  html += '<span class="card-header-stats">';
  html += 'Open PRs: <span class="stat-value">' + openPrs.length + '</span>';
  html += ' &middot; CI: <span class="stat-value">' + ciPrs.length + '</span>';
  html += ' &middot; ROCm: <span class="stat-value">' + rocmPrs.length + '</span>';
  html += ' &middot; Project issues: <span class="stat-value">' + projectIssues.length + '</span>';
  html += '</span>';
  html += "</div>";

  html += '<div class="card-body-grid">';
  html += '<div class="card-col">' + buildPRTableSection(openPrs, ciIssueNumSet, issueNumsByLinkedPr, cfg.repo) + '</div>';
  html += '<div class="card-col">' + buildIssueTableSection(projectIssues, ticketsByNum, ticketsByTitle, projectItemsByNum, projectBoardUrl, issueLinkedPrsByNum) + '</div>';
  html += '</div>';

  return html;
}

function buildPRTableSection(prs, ciIssueNumSet, issueNumsByLinkedPr, repo) {
  var sorted = _sortedRows(prs, 'prs');
  var page = _pageRows(sorted, 'prs');
  var html = '<details class="card-section" open>';
  html += '<summary>Open PRs <span class="section-count">(' + prs.length + ')</span></summary>';
  if (!prs.length) {
    html += '<p class="empty">No open ROCm or CI-linked PRs are currently tracked.</p>';
    return html + '</details>';
  }
  html += _pager('prs', sorted.length);
  html += '<table class="data-table home-pr-table"><tr>';
  html += _sortTh('prs', 'number', '#');
  html += _sortTh('prs', 'title', 'Title');
  html += _sortTh('prs', 'author', 'Author');
  html += _sortTh('prs', 'ci', 'CI');
  html += _sortTh('prs', 'rocm', 'ROCm');
  html += _sortTh('prs', 'tags', 'Other tags');
  html += '<th>Issues</th>';
  html += _sortTh('prs', 'updated', 'Updated');
  html += '</tr>';
  for (const pr of page) {
    const linkedNums = _linkedCiIssueNums(pr, ciIssueNumSet, issueNumsByLinkedPr);
    const issueNums = (pr.ci_issue_numbers && pr.ci_issue_numbers.length) ? pr.ci_issue_numbers : linkedNums;
    const issueLinks = issueNums.map(function(n) {
      return LinkRegistry.aTag(LinkRegistry.github.issue(repo, n), '#' + n);
    }).join(', ') || '<span class="muted">-</span>';
    html += '<tr>';
    html += '<td>' + LinkRegistry.aTag(pr.html_url, '#' + pr.number) + '</td>';
    html += '<td class="td-title td-title-wide" title="' + escapeHtml(pr.title) + '">' + escapeHtml(pr.title) + '</td>';
    html += '<td>' + escapeHtml(effectiveAuthor(pr)) + '</td>';
    html += '<td>' + (pr.is_ci_pr || issueNums.length ? _tagChip('CI', 'tag-ci') : '<span class="muted">-</span>') + '</td>';
    html += '<td>' + (pr.is_rocm_pr || _labelHas(pr, 'rocm') ? _tagChip('ROCm', 'tag-rocm') : '<span class="muted">-</span>') + '</td>';
    html += '<td class="tag-cell">' + _otherTagCell(pr) + '</td>';
    html += '<td class="td-fixes">' + issueLinks + '</td>';
    html += '<td>' + relativeTime(pr.updated_at) + '</td>';
    html += '</tr>';
  }
  html += '</table>';
  html += _pager('prs', sorted.length);
  html += '</details>';
  return html;
}

function buildIssueTableSection(projectIssues, ticketsByNum, ticketsByTitle, projectItemsByNum, projectBoardUrl, issueLinkedPrsByNum) {
  var sorted = _sortedRows(projectIssues, 'issues');
  var page = _pageRows(sorted, 'issues');
  let html = '<details class="card-section" open>';
  const boardLink = LinkRegistry.aTag(projectBoardUrl, "project #39");
  html += '<summary>Open issues (' + boardLink + ') <span class="section-count">(' + projectIssues.length + ')</span></summary>';

  if (!projectIssues.length) {
    html += '<p class="empty">No open project #39 issues are currently tracked.</p>';
    return html + '</details>';
  }

  html += _pager('issues', sorted.length);
  html += '<table class="data-table home-issue-table"><tr>';
  html += _sortTh('issues', 'number', '#');
  html += _sortTh('issues', 'title', 'Title');
  html += _sortTh('issues', 'owner', 'Owner');
  html += _sortTh('issues', 'status', 'Column');
  html += _sortTh('issues', 'prs', 'PRs');
  html += '<th>Streak</th><th>Breaks</th>';
  html += _sortTh('issues', 'updated', 'Updated');
  html += '</tr>';
  for (const issue of page) {
    const t = ticketsByNum[issue.number] || (ticketsByTitle && ticketsByTitle[issue.title]);
    const streak = t && t.summary ? _streakDays(t.summary.current_streak_started) : null;
    const streakCell = streak == null
      ? '<span class="muted">-</span>'
      : '<span class="streak-chip streak-' + (streak >= 7 ? 'hot' : streak >= 2 ? 'warm' : 'fresh') + '">' + streak + 'd</span>';
    const breaks = t && t.summary ? t.summary.break_frequency : null;
    const breaksCell = breaks == null
      ? '<span class="muted">-</span>'
      : '<span class="breaks-chip">' + breaks + '</span>';
    const assignees = Array.isArray(issue.assignees) ? issue.assignees : [];
    const ownerCell = assignees.length
      ? escapeHtml(assignees.slice(0, 2).join(', ')) + (assignees.length > 2 ? ' +' + (assignees.length - 2) : '')
      : '<span class="muted">-</span>';
    const pi = (projectItemsByNum && projectItemsByNum[String(issue.number)]) || {};
    const status = issue.project_status || pi.status || '';
    const columnCell = status
      ? '<a href="' + escapeHtml(projectBoardUrl) + '" target="_blank" rel="noopener" class="' + _projectStatusClass(status) + '" title="Open project #39 board">' + escapeHtml(status) + '</a>'
      : '<span class="muted">-</span>';

    html += '<tr>';
    html += '<td>' + LinkRegistry.aTag(issue.html_url, '#' + issue.number) + '</td>';
    html += '<td class="td-title td-title-wide" title="' + escapeHtml(issue.title) + '">' + escapeHtml(issue.title) + '</td>';
    html += '<td>' + ownerCell + '</td>';
    html += '<td>' + columnCell + '</td>';
    html += '<td class="td-fixes">' + _linkedPrCell(issue, t, issueLinkedPrsByNum) + '</td>';
    html += '<td>' + streakCell + '</td>';
    html += '<td>' + breaksCell + '</td>';
    html += '<td>' + relativeTime(issue.updated_at) + '</td>';
    html += '</tr>';
  }
  html += '</table>';
  html += _pager('issues', sorted.length);
  html += '</details>';
  return html;
}

function buildWeekSection(prs, issues, releases, cfg) {
  const stats = getWeeklyStats(prs, issues, releases);
  const recentPrs = prs.filter(
    (p) => isThisWeek(p.created_at) || (p.merged && isThisWeek(p.updated_at))
  );

  // Build stat summary line
  const parts = [];
  if (stats.prsOpened) parts.push(stats.prsOpened + " opened");
  if (stats.prsMerged) parts.push(stats.prsMerged + " merged");
  if (stats.issuesOpened) parts.push(stats.issuesOpened + " new issue" + (stats.issuesOpened > 1 ? "s" : ""));
  if (stats.newReleases) parts.push(stats.newReleases + " release" + (stats.newReleases > 1 ? "s" : ""));

  const summaryText = parts.length ? parts.join(", ") : "No activity";

  let html = '<details class="week-activity" open>';
  html += '<summary>This Week <span class="week-summary-inline">' + escapeHtml(summaryText) + '</span></summary>';

  if (recentPrs.length) {
    html += '<table><tr><th>#</th><th>Title</th><th>Author</th><th>Status</th></tr>';
    for (const pr of recentPrs.slice(0, 10)) {
      html += "<tr>";
      html += '<td>' + LinkRegistry.aTag(pr.html_url, '#' + pr.number) + '</td>';
      html += '<td class="td-title" title="' + escapeHtml(pr.title) + '">' + escapeHtml(pr.title.slice(0, 60)) + "</td>";
      html += "<td>" + escapeHtml(effectiveAuthor(pr)) + "</td>";
      html += "<td>" + statusBadge(pr) + "</td>";
      html += "</tr>";
    }
    if (recentPrs.length > 10) {
      html += '<tr><td colspan="4" class="empty">...and ' + (recentPrs.length - 10) + " more</td></tr>";
    }
    html += "</table>";
  } else {
    html += '<p class="empty">No PRs this week</p>';
  }

  html += "</details>";
  return html;
}

// Collect the set of CI-issue numbers each PR references, so the row can
// link back to the tickets it fixes. Same ``#N`` scan as the filter above.
function _linkedCiIssueNums(pr, ciIssueNumSet, issueNumsByLinkedPr) {
  const hay = (pr.title || "") + "\n" + (pr.body_head || "");
  const re = /#(\d+)/g;
  const out = [];
  const seen = new Set();
  let m;
  while ((m = re.exec(hay)) !== null) {
    const n = parseInt(m[1], 10);
    if (ciIssueNumSet.has(n) && !seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  const extra = issueNumsByLinkedPr && issueNumsByLinkedPr[pr.number];
  if (Array.isArray(extra)) {
    for (const n of extra) {
      if (!seen.has(n)) {
        seen.add(n);
        out.push(n);
      }
    }
  }
  return out;
}

function buildLinkedPRSection(prs, ciIssueNumSet, issueNumsByLinkedPr) {
  let html = '<details class="card-section" open>';
  html += '<summary>PRs linked to a CI issue <span class="section-count">(' + prs.length + ')</span></summary>';

  if (!prs.length) {
    html += '<p class="empty">No open PRs currently reference a tracked CI issue.</p>';
    return html + '</details>';
  }

  html += '<table><tr><th>#</th><th>Title</th><th>Author</th><th>Fixes</th><th>Updated</th></tr>';
  for (const pr of prs.slice(0, 50)) {
    const linkedNums = _linkedCiIssueNums(pr, ciIssueNumSet, issueNumsByLinkedPr);
    const repoBase = (pr.html_url || "").split("/pull/")[0];
    const fixesCell = linkedNums.map(function(n) {
      return LinkRegistry.aTag(repoBase + "/issues/" + n, "#" + n);
    }).join(", ") || '<span class="muted">—</span>';
    html += '<tr>';
    html += '<td>' + LinkRegistry.aTag(pr.html_url, '#' + pr.number) + '</td>';
    html += '<td class="td-title" title="' + escapeHtml(pr.title) + '">' + escapeHtml(pr.title.slice(0, 80)) + '</td>';
    html += '<td>' + escapeHtml(effectiveAuthor(pr)) + '</td>';
    html += '<td class="td-fixes">' + fixesCell + '</td>';
    html += '<td>' + relativeTime(pr.updated_at) + '</td>';
    html += '</tr>';
  }
  if (prs.length > 50) {
    html += '<tr><td colspan="5" class="empty">...and ' + (prs.length - 50) + ' more</td></tr>';
  }
  html += '</table></details>';
  return html;
}

function _streakDays(startIso) {
  // Rough day-count between ``startIso`` (YYYY-MM-DD) and today, UTC. We
  // deliberately do not call into any date library — the values come from
  // ``ready_tickets.json`` which already stores dates in ISO form.
  if (!startIso) return null;
  const start = new Date(startIso + "T00:00:00Z").getTime();
  const now = Date.now();
  if (!isFinite(start)) return null;
  return Math.max(0, Math.floor((now - start) / 86400000));
}

// Map a project #39 Status option name to the chip CSS modifier. Unknown
// statuses fall back to a muted grey chip so new columns added upstream
// don't render a broken style.
function _projectStatusClass(status) {
  var s = (status || "").toLowerCase().replace(/\s+/g, "-");
  var known = { "backlog": 1, "ready": 1, "in-progress": 1, "in-review": 1, "done": 1 };
  return known[s] ? "col-chip col-" + s : "col-chip col-unknown";
}

function _linkedPrCell(issue, ticket, issueLinkedPrsByNum) {
  const refs = (ticket && Array.isArray(ticket.linked_prs) && ticket.linked_prs.length)
    ? ticket.linked_prs
    : (issueLinkedPrsByNum && issueLinkedPrsByNum[issue.number]) || [];
  if (!refs.length) return '<span class="muted">—</span>';
  const repoBase = (issue.html_url || "").split("/issues/")[0];
  return refs.slice(0, 3).map(function(ref) {
    const prNum = parseInt(ref && ref.number, 10);
    if (!prNum) return '';
    const prUrl = (ref && ref.url) || (repoBase + '/pull/' + prNum);
    return LinkRegistry.aTag(prUrl, '#' + prNum);
  }).filter(Boolean).join(', ') || '<span class="muted">—</span>';
}

function buildCIIssueSection(ciIssues, ticketsByNum, ticketsByTitle, projectItemsByNum, projectBoardUrl, issueLinkedPrsByNum) {
  let html = '<details class="card-section" open>';
  const boardLink = LinkRegistry.aTag(projectBoardUrl, "project #39");
  html += '<summary>Open CI issues (' + boardLink + ') <span class="section-count">(' + ciIssues.length + ')</span></summary>';

  if (!ciIssues.length) {
    html += '<p class="empty">No CI-failure issues currently tracked.</p>';
    return html + '</details>';
  }

  html += '<table><tr><th>#</th><th>Title</th><th>Owner</th><th>Column</th><th>PRs</th><th>Streak</th><th>Breaks (60d)</th><th>Updated</th></tr>';
  for (const issue of ciIssues.slice(0, 60)) {
    // Prefer issue_number (authoritative), fall back to title (works even
    // when dry-run preflight couldn't resolve the number).
    const t = ticketsByNum[issue.number] || (ticketsByTitle && ticketsByTitle[issue.title]);
    const streak = t && t.summary ? _streakDays(t.summary.current_streak_started) : null;
    const streakCell = streak == null
      ? '<span class="muted">—</span>'
      : '<span class="streak-chip streak-' + (streak >= 7 ? 'hot' : streak >= 2 ? 'warm' : 'fresh') + '">' + streak + 'd</span>';
    const breaks = t && t.summary ? t.summary.break_frequency : null;
    const breaksCell = breaks == null
      ? '<span class="muted">—</span>'
      : '<span class="breaks-chip">' + breaks + '</span>';
    const assignees = Array.isArray(issue.assignees) ? issue.assignees : [];
    const ownerCell = assignees.length
      ? escapeHtml(assignees.slice(0, 2).join(', ')) + (assignees.length > 2 ? ' +' + (assignees.length - 2) : '')
      : '<span class="muted">—</span>';

    // Column chip: click-through to project #39 board so the triage lead
    // can jump straight to the card. If the live snapshot is absent
    // (dry-run env) or the issue hasn't been added to the board yet, we
    // show an em-dash instead of faking a status.
    const pi = projectItemsByNum && projectItemsByNum[String(issue.number)];
    let columnCell;
    if (pi && pi.status) {
      const cls = _projectStatusClass(pi.status);
      columnCell = '<a href="' + escapeHtml(projectBoardUrl) + '" target="_blank" rel="noopener" class="' + cls + '" title="Open project #39 board">' + escapeHtml(pi.status) + '</a>';
    } else {
      columnCell = '<span class="muted">—</span>';
    }

    html += '<tr>';
    html += '<td>' + LinkRegistry.aTag(issue.html_url, '#' + issue.number) + '</td>';
    html += '<td class="td-title" title="' + escapeHtml(issue.title) + '">' + escapeHtml(issue.title.slice(0, 80)) + '</td>';
    html += '<td>' + ownerCell + '</td>';
    html += '<td>' + columnCell + '</td>';
    html += '<td class="td-fixes">' + _linkedPrCell(issue, t, issueLinkedPrsByNum) + '</td>';
    html += '<td>' + streakCell + '</td>';
    html += '<td>' + breaksCell + '</td>';
    html += '<td>' + relativeTime(issue.updated_at) + '</td>';
    html += '</tr>';
  }
  if (ciIssues.length > 60) {
    html += '<tr><td colspan="8" class="empty">...and ' + (ciIssues.length - 60) + ' more</td></tr>';
  }
  html += '</table></details>';
  return html;
}

function buildSuiteTable(rocm, cuda) {
  var hasSuites = (rocm && rocm.suites && rocm.suites.length) || (cuda && cuda.suites && cuda.suites.length);
  if (!hasSuites) return "";

  var html = '<table class="suite-table">';
  html += "<tr><th>Suite / Job</th><th>Result</th></tr>";

  // ROCm suites
  if (rocm && rocm.suites && rocm.suites.length) {
    html += '<tr><td colspan="2" class="suite-platform-header">ROCm</td></tr>';
    for (var i = 0; i < rocm.suites.length && i < 20; i++) {
      var s = rocm.suites[i];
      html += "<tr>";
      html += '<td class="td-title" title="' + escapeHtml(s.name) + '">' + escapeHtml(s.name.slice(0, 60)) + "</td>";
      html += "<td>" + suiteBadge(s) + "</td>";
      html += "</tr>";
    }
    if (rocm.suites.length > 20) {
      html += '<tr><td colspan="2" class="empty">...and ' + (rocm.suites.length - 20) + " more</td></tr>";
    }
  }

  // CUDA suites
  if (cuda && cuda.suites && cuda.suites.length) {
    html += '<tr><td colspan="2" class="suite-platform-header">CUDA</td></tr>';
    for (var i = 0; i < cuda.suites.length && i < 20; i++) {
      var s = cuda.suites[i];
      html += "<tr>";
      html += '<td class="td-title" title="' + escapeHtml(s.name) + '">' + escapeHtml(s.name.slice(0, 60)) + "</td>";
      html += "<td>" + suiteBadge(s) + "</td>";
      html += "</tr>";
    }
    if (cuda.suites.length > 20) {
      html += '<tr><td colspan="2" class="empty">...and ' + (cuda.suites.length - 20) + " more</td></tr>";
    }
  }

  html += "</table>";
  return html;
}
