/**
 * Main dashboard application.
 * Loads project config + JSON data, renders weekly stats, contributors, and cards.
 */
var _ds=getComputedStyle(document.documentElement);
var _TC={text:_ds.getPropertyValue('--text').trim()||'#e6edf3',muted:_ds.getPropertyValue('--text-muted').trim()||'#8b949e',border:_ds.getPropertyValue('--border').trim()||'#30363d'};
// Safe number formatting — prevents "Cannot read properties of undefined (reading 'toFixed')"
function _pct(v,d){return(typeof v==='number'?(v*100).toFixed(d||1):'N/A')+'%'}
function _fix(v,d){return typeof v==='number'?v.toFixed(d||1):'N/A'}

(async function init() {
  const projects = await fetchJSON("_data/projects.json");
  if (!projects || !projects.projects) {
    document.getElementById("dashboard").innerHTML =
      '<p class="empty">Failed to load project data.</p>';
    return;
  }

  // Load vLLM data only
  const dataMap = {};
  const [prs, issues, releases, testResults, parityReport, ciHealth, ciParity] = await Promise.all([
    fetchJSON("data/vllm/prs.json"),
    fetchJSON("data/vllm/issues.json"),
    fetchJSON("data/vllm/releases.json"),
    fetchJSON("data/vllm/test_results.json"),
    fetchJSON("data/vllm/parity_report.json"),
    fetchJSON("data/vllm/ci/ci_health.json"),
    fetchJSON("data/vllm/ci/parity_report.json"),
  ]);
  dataMap["vllm"] = { prs, issues, releases, testResults, parityReport, ciHealth, ciParity };

  // Find latest collected_at for header
  let latestTs = null;
  var d = dataMap["vllm"];
  for (const src of [d.prs, d.issues, d.releases, d.testResults]) {
    if (src && src.collected_at && (!latestTs || src.collected_at > latestTs)) latestTs = src.collected_at;
  }
  if (d.ciHealth && d.ciHealth.generated_at && (!latestTs || d.ciHealth.generated_at > latestTs)) latestTs = d.ciHealth.generated_at;
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
  var renderSteps = [
    ['weekly-summary', 'WeeklySummary', function() { renderWeeklySummary(dataMap); }],
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
})();

// Tab switching — runs immediately, independent of async data loading
(function() {
  function switchTab(target) {
    document.querySelectorAll(".nav-btn").forEach(function (b) { b.classList.remove("active"); });
    document.querySelectorAll(".tab-panel").forEach(function (p) { p.classList.remove("active"); });
    var btn = document.querySelector('.nav-btn[data-tab="' + target + '"]');
    if (btn) btn.classList.add("active");
    var panel = document.getElementById("tab-" + target);
    if (panel) panel.classList.add("active");
  }

  var navBtns = document.querySelectorAll(".nav-btn");
  for (var i = 0; i < navBtns.length; i++) {
    navBtns[i].addEventListener("click", function () {
      var target = this.getAttribute("data-tab");
      switchTab(target);
      history.replaceState(null, "", "#" + target);
      if (target === "builds" && window._onBuildTabShown) {
        window._onBuildTabShown();
      }
      if (target === "trends" && window._onTrendsTabShown) {
        window._onTrendsTabShown();
      }
    });
  }

  // Activate tab from URL hash on load
  var hash = location.hash.replace("#", "");
  if (hash && document.getElementById("tab-" + hash)) {
    switchTab(hash);
  }
})();

function renderWeeklySummary(dataMap) {
  let totalOpened = 0;
  let totalMerged = 0;
  let totalIssues = 0;
  let totalReleases = 0;

  for (const d of Object.values(dataMap)) {
    const prs = (d.prs && d.prs.prs) || [];
    const issues = (d.issues && d.issues.issues) || [];
    const releases = (d.releases && d.releases.releases) || [];
    const stats = getWeeklyStats(prs, issues, releases);
    totalOpened += stats.prsOpened;
    totalMerged += stats.prsMerged;
    totalIssues += stats.issuesOpened;
    totalReleases += stats.newReleases;
  }

  const el = document.getElementById("weekly-summary");
  el.innerHTML =
    '<h2>This Week</h2>' +
    '<div class="weekly-boxes">' +
    '<div class="weekly-box weekly-box-opened"><div class="weekly-num">' + totalOpened + '</div><div class="weekly-label">PRs Opened</div></div>' +
    '<div class="weekly-box weekly-box-merged"><div class="weekly-num">' + totalMerged + '</div><div class="weekly-label">PRs Merged</div></div>' +
    '<div class="weekly-box weekly-box-issues"><div class="weekly-num">' + totalIssues + '</div><div class="weekly-label">Issues</div></div>' +
    '<div class="weekly-box weekly-box-releases"><div class="weekly-num">' + totalReleases + '</div><div class="weekly-label">Releases</div></div>' +
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
      var groups = mergeShardedGroups(p.job_groups || []);
      var both = groups.filter(function(g) { return g.amd && g.upstream; });
      var amdOnly = groups.filter(function(g) { return g.amd && !g.upstream; });
      var upOnly = groups.filter(function(g) { return !g.amd && g.upstream; });
      var passing = both.filter(function(g) { return (g.amd.failed || 0) === 0 && !((g.amd.canceled || 0) > 0 && (g.amd.passed || 0) === 0); });
      var parityPct = both.length > 0 ? Math.round(passing.length / both.length * 100) : 0;

      var regressions = both.filter(function(g) { return (g.amd.failed || 0) > 0 && (g.upstream.failed || 0) === 0; });
      var bothFail = both.filter(function(g) { return (g.amd.failed || 0) > 0 && (g.upstream.failed || 0) > 0; });
      var total = both.length + amdOnly.length + upOnly.length;

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
      html += '<div style="font-size:14px;color:var(--text-muted);margin-top:4px">' + Math.round(both.length / total * 100) + '% overlap</div></div>';

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
          html += '<div class="pass-rate-row">';
          html += '<span class="pass-rate-label" style="cursor:pointer" onclick="document.querySelector(\'.nav-btn[data-tab=ci-health]\').click()">AMD (' + totalAmdGroups + ' test groups)</span>';
          html += '<span class="pass-rate-pct">' + _fix(lb.pass_rate*100,1) + '%</span>';
          html += '</div>';

          for (var hii = 0; hii < hwKeys.length; hii++) {
            var hk = hwKeys[hii];
            var hs = hwStats[hk];
            var hwPass = hs.total - hs.failing;
            var hwRate = hs.total > 0 ? hwPass / hs.total : 0;
            var hwShare = totalAmdGroups > 0 ? hs.total / totalAmdGroups * 100 : 0;
            var hwColor = hwColors[hk] || '#da3633';
            html += '<div class="pass-rate-row" style="margin-left:12px">';
            html += '<span class="pass-rate-label" style="font-size:13px;color:var(--text-muted)">' + (hwNames[hk]||hk) + ' <span style="color:var(--text-muted);font-size:12px">(' + hs.total + ' groups, ' + _fix(hwShare,0) + '% of AMD)</span></span>';
            html += '<div class="pass-rate-bar-bg"><div style="width:' + _fix(hwRate*100,2) + '%;height:100%;background:' + hwColor + ';border-radius:4px" title="' + (hwNames[hk]||hk) + ': ' + hwPass + '/' + hs.total + ' groups passing (' + _fix(hwRate*100,1) + '%)"></div></div>';
            html += '<span class="pass-rate-pct">' + _fix(hwRate*100,1) + '%</span>';
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

function buildCard(name, cfg, d) {
  const repoUrl = LinkRegistry.github.repo(cfg.repo);
  const prs = (d.prs && d.prs.prs) || [];
  const issues = (d.issues && d.issues.issues) || [];
  const releases = (d.releases && d.releases.releases) || [];

  const openPrs = prs.filter((p) => p.state === "open");
  const latestRelease = releases.length ? releases[0].tag_name : "-";

  let html = "";

  // Header (no role badge)
  html += '<div class="card-header">';
  html += LinkRegistry.aTag(repoUrl, name);
  html += "</div>";

  // Stats
  html += '<div class="stats">';
  html += "<span>PRs: <span class='stat-value'>" + openPrs.length + "</span></span>";
  html += "<span>Issues: <span class='stat-value'>" + issues.length + "</span></span>";
  html += "<span>Release: <span class='stat-value'>" + escapeHtml(latestRelease) + "</span></span>";
  html += "</div>";

  // Test Results section (ROCm vs CUDA)
  if (d.testResults) {
    html += buildTestSection(d.testResults, d.parityReport);
  }

  // vLLM CI Health section (from Buildkite data)
  if (d.ciHealth && d.ciHealth.amd && d.ciHealth.amd.latest_build) {
    var lb = d.ciHealth.amd.latest_build;
    var rate = _fix(lb.pass_rate*100,1);
    var rateClass = lb.pass_rate >= 0.95 ? 'rate-good' : lb.pass_rate >= 0.85 ? 'rate-warn' : 'rate-bad';
    html += '<details class="section"><summary>CI Health</summary>';
    html += '<div class="test-section">';
    html += buildPassRateBar("AMD Nightly", { passed: lb.passed, failed: lb.failed, skipped: lb.skipped, pass_rate: parseFloat(rate) });
    html += '<div style="font-size:12px;color:var(--text-muted);margin-top:4px">';
    var _ran = (lb.passed || 0) + (lb.failed || 0);
    html += 'Build #' + lb.build_number + ' · Ran ' + _ran.toLocaleString() + ' tests · ';
    html += lb.test_groups + ' groups · ' + LinkRegistry.aTag(lb.build_url, 'View build');
    html += '</div></div></details>';
  }

  // This Week section
  html += buildWeekSection(prs, issues, releases, cfg);

  // Top Contributors section
  html += buildContributorSection(prs);

  // PRs section
  html += buildPRSection(openPrs);

  // Issues section
  html += buildIssueSection(issues);

  // Releases section
  html += buildReleaseSection(releases);

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

function buildContributorSection(prs) {
  const contributors = getProjectContributors(prs, 10);
  if (!contributors.length) {
    return "<details><summary>Top Contributors (0)</summary><p class='empty'>None</p></details>";
  }

  let html = "<details><summary>Top Contributors (" + contributors.length + ")</summary>";
  html += '<table><tr><th>#</th><th>Author</th><th>Submitted</th><th>Merged</th></tr>';

  for (let i = 0; i < contributors.length; i++) {
    const c = contributors[i];
    html += "<tr>";
    html += '<td class="contrib-rank">' + (i + 1) + "</td>";
    html += '<td>' + LinkRegistry.aTag(LinkRegistry.github.user(c.author), c.author) + '</td>';
    html += '<td class="contrib-count">' + c.submitted + "</td>";
    html += '<td class="contrib-count">' + c.merged + "</td>";
    html += "</tr>";
  }

  html += "</table></details>";
  return html;
}

function buildPRSection(prs) {
  if (!prs.length) {
    return "<details><summary>Pull Requests (0)</summary><p class='empty'>None</p></details>";
  }

  let html = "<details><summary>Pull Requests (" + prs.length + ")</summary>";
  html += "<table><tr><th>#</th><th>Title</th><th>Author</th><th>Status</th><th>Updated</th></tr>";

  for (const pr of prs.slice(0, 50)) {
    html += "<tr>";
    html += '<td>' + LinkRegistry.aTag(pr.html_url, '#' + pr.number) + '</td>';
    html += '<td class="td-title" title="' + escapeHtml(pr.title) + '">' + escapeHtml(pr.title.slice(0, 60)) + "</td>";
    html += "<td>" + escapeHtml(effectiveAuthor(pr)) + "</td>";
    html += "<td>" + statusBadge(pr) + "</td>";
    html += "<td>" + relativeTime(pr.updated_at) + "</td>";
    html += "</tr>";
  }

  if (prs.length > 50) {
    html += '<tr><td colspan="5" class="empty">...and ' + (prs.length - 50) + " more</td></tr>";
  }

  html += "</table></details>";
  return html;
}

function buildIssueSection(issues) {
  if (!issues.length) {
    return "<details><summary>Issues (0)</summary><p class='empty'>None</p></details>";
  }

  let html = "<details><summary>Issues (" + issues.length + ")</summary>";
  html += "<table><tr><th>#</th><th>Title</th><th>Author</th><th>Updated</th></tr>";

  for (const issue of issues.slice(0, 50)) {
    html += "<tr>";
    html += '<td>' + LinkRegistry.aTag(issue.html_url, '#' + issue.number) + '</td>';
    html += '<td class="td-title" title="' + escapeHtml(issue.title) + '">' + escapeHtml(issue.title.slice(0, 60)) + "</td>";
    html += "<td>" + escapeHtml(issue.author) + "</td>";
    html += "<td>" + relativeTime(issue.updated_at) + "</td>";
    html += "</tr>";
  }

  if (issues.length > 50) {
    html += '<tr><td colspan="4" class="empty">...and ' + (issues.length - 50) + " more</td></tr>";
  }

  html += "</table></details>";
  return html;
}

function buildReleaseSection(releases) {
  if (!releases.length) {
    return "<details><summary>Releases (0)</summary><p class='empty'>None</p></details>";
  }

  let html = "<details><summary>Releases (" + releases.length + ")</summary>";
  html += "<table><tr><th>Tag</th><th>Published</th></tr>";

  for (const r of releases) {
    html += "<tr>";
    html += '<td>' + LinkRegistry.aTag(r.html_url, r.tag_name) + '</td>';
    html += "<td>" + formatDate(r.published_at) + "</td>";
    html += "</tr>";
  }

  html += "</table></details>";
  return html;
}

function buildTestSection(testResults, parityReport) {
  var rocm = testResults.rocm;
  var cuda = testResults.cuda;

  // Build summary text for the <summary> line
  var summaryText = "";
  var parityPct = parityReport && (parityReport.parity_pct ?? parityReport.summary?.parity_pct);
  if (parityPct != null && typeof parityPct === 'number') {
    summaryText = "Parity: " + parityPct.toFixed(1) + "% (matched)";
  } else if (testResults.cuda_parity && testResults.cuda_parity.ratio != null) {
    summaryText = "Parity: " + _fix(testResults.cuda_parity.ratio,1) + "%";
  } else {
    var parts = [];
    if (rocm && rocm.summary) {
      parts.push("ROCm: " + (rocm.summary.pass_rate != null ? _fix(rocm.summary.pass_rate,1) + "%" : "N/A"));
    }
    if (cuda && cuda.summary) {
      parts.push("CUDA: " + (cuda.summary.pass_rate != null ? _fix(cuda.summary.pass_rate,1) + "%" : "N/A"));
    }
    summaryText = parts.length ? parts.join(" | ") : "No data";
  }

  var html = '<details class="test-results">';
  html += '<summary>Test Results <span class="test-summary-inline">' + escapeHtml(summaryText) + "</span></summary>";

  // Pass rate bars
  if (rocm && rocm.summary) {
    html += buildPassRateBar("ROCm", rocm.summary, rocm.run_url);
  }
  if (cuda && cuda.summary) {
    html += buildPassRateBar("CUDA", cuda.summary, cuda.run_url);
  }

  // Suite detail table
  html += buildSuiteTable(rocm, cuda);

  // Freshness line
  var dates = [];
  if (rocm && rocm.run_date) dates.push("ROCm: " + relativeTime(rocm.run_date));
  if (cuda && cuda.run_date) dates.push("CUDA: " + relativeTime(cuda.run_date));
  if (dates.length) {
    html += '<div class="test-meta">Runs: ' + dates.join(", ");
    if (testResults.source === "manual") html += " (manual)";
    html += "</div>";
  }

  html += "</details>";
  return html;
}

// ---------------------------------------------------------------------------
// Activity View (Tab 3)
// ---------------------------------------------------------------------------

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
