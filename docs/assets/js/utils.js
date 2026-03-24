/**
 * Utility functions for the project dashboard.
 */

// Buildkite search URL for a test group name
var BK_AMD_BUILD = '';  // set by CI health when data loads
var BK_UP_BUILD = '';
function bkSearchUrl(groupName, pipeline) {
  // Link to the build page — user can Ctrl+F to find the job
  if (pipeline === 'upstream') return BK_UP_BUILD || 'https://buildkite.com/vllm/ci';
  return BK_AMD_BUILD || 'https://buildkite.com/vllm/amd-ci';
}

// Create a clickable test group name element
function makeGroupLink(name, pipeline) {
  var a = document.createElement('a');
  a.textContent = name;
  a.href = bkSearchUrl(name, pipeline);
  a.target = '_blank';
  a.style.color = 'var(--text)';
  a.style.textDecoration = 'none';
  a.style.transition = 'color 0.15s';
  a.onmouseenter = function() { a.style.color = '#58a6ff'; a.style.textDecoration = 'underline'; };
  a.onmouseleave = function() { a.style.color = 'var(--text)'; a.style.textDecoration = 'none'; };
  return a;
}

async function fetchJSON(url) {
  const resp = await fetch(url);
  if (!resp.ok) return null;
  return resp.json();
}

function formatDate(iso) {
  if (!iso) return "-";
  return iso.slice(0, 10);
}

function relativeTime(iso) {
  if (!iso) return "";
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffDay > 30) return formatDate(iso);
  if (diffDay > 0) return diffDay + "d ago";
  if (diffHr > 0) return diffHr + "h ago";
  if (diffMin > 0) return diffMin + "m ago";
  return "just now";
}

function statusBadge(pr) {
  if (pr.merged) return '<span class="badge badge-merged">merged</span>';
  if (pr.state === "closed") return '<span class="badge badge-closed">closed</span>';
  if (pr.draft) return '<span class="badge badge-draft">draft</span>';
  return '<span class="badge badge-open">open</span>';
}

function roleBadge(role) {
  if (role === "active_dev") return '<span class="badge badge-dev">dev</span>';
  return '<span class="badge badge-watch">watch</span>';
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

function isThisWeek(iso) {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < 7 * 86400000;
}

function getWeeklyStats(prs, issues, releases) {
  const prsOpened = prs.filter((p) => isThisWeek(p.created_at)).length;
  const prsMerged = prs.filter((p) => p.merged && isThisWeek(p.updated_at)).length;
  const issuesOpened = issues.filter((i) => isThisWeek(i.created_at)).length;
  const newReleases = releases.filter((r) => isThisWeek(r.published_at)).length;
  return { prsOpened, prsMerged, issuesOpened, newReleases };
}

function isBot(author) {
  if (!author) return true;
  var a = author.toLowerCase();
  return a.includes("bot") || a.includes("copybara");
}

function suiteBadge(suite) {
  // If suite has test counts, show "passed/total"
  if (suite.tests != null) {
    var cls = suite.failed > 0 ? "suite-conclusion-failure" : "suite-conclusion-success";
    return '<span class="suite-conclusion ' + cls + '">' + suite.passed + "/" + suite.tests + "</span>";
  }
  // Otherwise show conclusion text
  var conclusion = suite.conclusion || "unknown";
  var cls = "suite-conclusion-" + (conclusion === "success" ? "success" : conclusion === "failure" ? "failure" : "skipped");
  return '<span class="suite-conclusion ' + cls + '">' + escapeHtml(conclusion) + "</span>";
}

function buildPassRateBar(label, summary, runUrl) {
  if (!summary) return "";
  var rate = summary.pass_rate != null ? summary.pass_rate : 0;
  var colorClass = rate >= 95 ? "rate-good" : rate >= 80 ? "rate-warn" : "rate-bad";
  var pctText = rate.toFixed(1) + "%";
  var labelHtml = runUrl
    ? '<a href="' + runUrl + '" target="_blank">' + escapeHtml(label) + "</a>"
    : escapeHtml(label);
  return (
    '<div class="pass-rate-row">' +
    '<span class="pass-rate-label">' + labelHtml + "</span>" +
    '<div class="pass-rate-bar-bg"><div class="pass-rate-bar-fill ' + colorClass + '" style="width:' + rate + '%"></div></div>' +
    '<span class="pass-rate-pct">' + pctText + "</span>" +
    "</div>"
  );
}

function buildParityBar(parity) {
  if (!parity) return "";
  var ratio = parity.ratio;
  var barWidth = Math.min(ratio, 100);
  var colorClass = ratio >= 90 ? "rate-good" : ratio >= 50 ? "rate-warn" : "rate-bad";
  var levelLabel = parity.level === "test" ? "tests" : "jobs";
  var detail = parity.rocm_count + " / " + parity.cuda_count + " " + levelLabel;
  return (
    '<div class="pass-rate-row">' +
    '<span class="pass-rate-label">Parity</span>' +
    '<div class="pass-rate-bar-bg"><div class="pass-rate-bar-fill ' + colorClass + '" style="width:' + barWidth + '%"></div></div>' +
    '<span class="pass-rate-pct">' + ratio.toFixed(1) + '%</span>' +
    '<span class="parity-detail">' + detail + '</span>' +
    '</div>'
  );
}

function deltaArrow(current, previous) {
  if (previous == null || current == null) return "";
  var diff = current - previous;
  if (diff > 0) return ' <span class="delta delta-up">+' + diff + '</span>';
  if (diff < 0) return ' <span class="delta delta-down">' + diff + '</span>';
  return ' <span class="delta delta-flat">0</span>';
}

function formatMinutes(min) {
  if (min == null) return "N/A";
  if (min < 60) return Math.round(min) + "m";
  if (min < 1440) return (min / 60).toFixed(1) + "h";
  return (min / 1440).toFixed(1) + "d";
}

function formatHours(hours) {
  if (hours == null) return "N/A";
  if (hours < 1) return Math.round(hours * 60) + "m";
  if (hours < 24) return hours.toFixed(1) + "h";
  return (hours / 24).toFixed(1) + "d";
}

function formatSeconds(secs) {
  if (secs == null) return "N/A";
  if (secs < 60) return Math.round(secs) + "s";
  if (secs < 3600) return (secs / 60).toFixed(1) + "m";
  return (secs / 3600).toFixed(1) + "h";
}

function ciHealthBadge(rate) {
  if (rate == null) return '<span class="ci-badge ci-badge-unknown">N/A</span>';
  var cls = rate >= 80 ? "ci-badge-good" : rate >= 50 ? "ci-badge-warn" : "ci-badge-bad";
  return '<span class="ci-badge ' + cls + '">' + rate.toFixed(0) + '%</span>';
}

function buildMiniBar(value, max, colorClass) {
  var pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return '<div class="mini-bar-bg"><div class="mini-bar-fill ' + colorClass + '" style="width:' + pct + '%"></div></div>';
}

function effectiveAuthor(pr) {
  return pr.original_author || pr.author;
}

/**
 * Merge sharded test groups into their base group.
 * Patterns merged:
 *   "lora 1", "lora 2" -> "lora"
 *   "multi-modal models (standard) 1: qwen2" -> "multi-modal models (standard)"
 *   "multi-modal models (extended generation 1)" -> "multi-modal models (extended generation)"
 */
function mergeShardedGroups(groups) {
  var baseMap = {};
  for (var i = 0; i < groups.length; i++) {
    var g = groups[i];
    var name = g.name || '';
    // Strip trailing " N" (simple shard)
    var baseName = name.replace(/\s+\d+$/, '');
    // Strip " N: description" (labeled shard like "1: qwen2")
    baseName = baseName.replace(/\s+\d+\s*:.*$/, '');
    // Strip trailing " N)" -> ")" (digit before closing paren like "extended generation 1)")
    baseName = baseName.replace(/\s+\d+\)$/, ')');
    if (!baseMap[baseName]) {
      baseMap[baseName] = { name: baseName, amd: null, upstream: null, hardware: [], hw_failures: {}, job_links: [], failure_tests: [] };
    }
    var base = baseMap[baseName];
    if (g.amd) {
      if (!base.amd) base.amd = { passed: 0, failed: 0, skipped: 0, total: 0 };
      base.amd.passed += (g.amd.passed || 0);
      base.amd.failed += (g.amd.failed || 0);
      base.amd.skipped += (g.amd.skipped || 0);
      base.amd.total += (g.amd.total || 0);
    }
    if (g.upstream) {
      if (!base.upstream) base.upstream = { passed: 0, failed: 0, skipped: 0, total: 0 };
      base.upstream.passed += (g.upstream.passed || 0);
      base.upstream.failed += (g.upstream.failed || 0);
      base.upstream.skipped += (g.upstream.skipped || 0);
      base.upstream.total += (g.upstream.total || 0);
    }
    if (g.hardware) base.hardware = base.hardware.concat(g.hardware);
    if (g.hw_failures) { for (var hw in g.hw_failures) base.hw_failures[hw] = (base.hw_failures[hw] || 0) + g.hw_failures[hw]; }
    if (g.job_links) base.job_links = base.job_links.concat(g.job_links);
    if (g.failure_tests) base.failure_tests = base.failure_tests.concat(g.failure_tests);
  }
  for (var key in baseMap) {
    baseMap[key].hardware = baseMap[key].hardware.filter(function(v, i, a) { return a.indexOf(v) === i; });
  }
  return Object.values(baseMap);
}

/**
 * Show an overlay popup listing test groups for a given category.
 */
function showGroupOverlay(dataId, category) {
  var data = window['_parityData_' + dataId];
  if (!data) return;

  var title = '', groupList = [], color = '';
  if (category === 'amd') {
    title = 'AMD Test Groups';
    color = '#da3633';
    groupList = data.groups.filter(function(g) { return g.amd; });
  } else if (category === 'common') {
    title = 'Common Groups (AMD + Upstream)';
    color = '#238636';
    groupList = data.both;
  } else if (category === 'upstream') {
    title = 'Upstream Test Groups';
    color = '#1f6feb';
    groupList = data.groups.filter(function(g) { return g.upstream; });
  } else if (category === 'amd-only') {
    title = 'AMD-Only Test Groups';
    color = '#da3633';
    groupList = data.amdOnly;
  } else if (category === 'upstream-only') {
    title = 'Upstream-Only Test Groups';
    color = '#1f6feb';
    groupList = data.upOnly;
  }

  groupList = groupList.sort(function(a, b) { return (a.name || '').localeCompare(b.name || ''); });

  // Build overlay DOM
  var backdrop = document.createElement('div');
  backdrop.className = 'overlay-backdrop';
  backdrop.onclick = function(e) { if (e.target === backdrop) backdrop.remove(); };

  var panel = document.createElement('div');
  panel.className = 'overlay-panel';

  var header = document.createElement('div');
  header.className = 'overlay-header';
  header.innerHTML = '<h3 style="color:' + color + '">' + escapeHtml(title) + ' <span style="color:var(--text-muted);font-weight:400">(' + groupList.length + ')</span></h3>';

  var closeBtn = document.createElement('button');
  closeBtn.className = 'overlay-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.onclick = function() { backdrop.remove(); };
  header.appendChild(closeBtn);

  var body = document.createElement('div');
  body.className = 'overlay-body';

  // Build table
  var showBoth = (category === 'common' || category === 'amd' || category === 'upstream');
  var tbl = '<table style="width:100%;border-collapse:collapse;font-size:14px">';
  tbl += '<thead><tr>';
  tbl += '<th style="text-align:left;padding:8px 12px;border-bottom:2px solid var(--border);color:var(--text-muted);font-size:12px;font-weight:600">Test Group</th>';
  if (showBoth) {
    tbl += '<th style="text-align:center;padding:8px 12px;border-bottom:2px solid var(--border);color:#da3633;font-size:12px;font-weight:600">AMD P/F</th>';
    tbl += '<th style="text-align:center;padding:8px 12px;border-bottom:2px solid var(--border);color:#1f6feb;font-size:12px;font-weight:600">Upstream P/F</th>';
  }
  tbl += '</tr></thead><tbody>';

  for (var i = 0; i < groupList.length; i++) {
    var g = groupList[i];
    var hasAmd = !!g.amd;
    var hasUp = !!g.upstream;
    // Color-code: red bg if missing on one side, green text if present
    var rowBg = '';
    if (showBoth && !hasAmd) rowBg = 'background:rgba(218,54,51,0.08);';
    if (showBoth && !hasUp) rowBg = 'background:rgba(31,111,235,0.08);';
    var bkUrl = hasAmd ? bkSearchUrl(g.name, 'amd') : bkSearchUrl(g.name, 'upstream');
    tbl += '<tr style="border-bottom:1px solid var(--border);' + rowBg + 'cursor:pointer" onmouseenter="this.style.background=\'var(--hover)\'" onmouseleave="this.style.background=\'' + (rowBg ? rowBg.replace('background:','').replace(';','') : '') + '\'">';
    tbl += '<td style="padding:6px 12px"><a href="' + bkUrl + '" target="_blank" style="color:var(--text);text-decoration:none;transition:color .15s" onmouseenter="this.style.color=\'#58a6ff\'" onmouseleave="this.style.color=\'var(--text)\'">' + escapeHtml(g.name) + '</a></td>';
    if (showBoth) {
      if (hasAmd) {
        var af = g.amd.failed || 0;
        tbl += '<td style="text-align:center;padding:6px 12px"><span style="color:#238636;font-weight:600">' + (g.amd.passed||0) + '</span>/<span style="color:' + (af > 0 ? '#da3633' : 'var(--text-muted)') + ';font-weight:600">' + af + '</span></td>';
      } else {
        tbl += '<td style="text-align:center;padding:6px 12px"><span style="color:#da3633;font-weight:600;font-size:13px">not in AMD CI</span></td>';
      }
      if (hasUp) {
        var uf = g.upstream.failed || 0;
        tbl += '<td style="text-align:center;padding:6px 12px"><span style="color:#238636;font-weight:600">' + (g.upstream.passed||0) + '</span>/<span style="color:' + (uf > 0 ? '#da3633' : 'var(--text-muted)') + ';font-weight:600">' + uf + '</span></td>';
      } else {
        tbl += '<td style="text-align:center;padding:6px 12px"><span style="color:#1f6feb;font-weight:600;font-size:13px">not in Upstream</span></td>';
      }
    }
    tbl += '</tr>';
  }
  tbl += '</tbody></table>';
  body.innerHTML = tbl;

  panel.appendChild(header);
  panel.appendChild(body);
  backdrop.appendChild(panel);
  document.body.appendChild(backdrop);

  // Close on Escape
  var escHandler = function(e) { if (e.key === 'Escape') { backdrop.remove(); document.removeEventListener('keydown', escHandler); } };
  document.addEventListener('keydown', escHandler);
}

function getProjectContributors(prs, limit) {
  const map = new Map();
  for (const pr of prs) {
    var author = effectiveAuthor(pr);
    if (isBot(author)) continue;
    if (!map.has(author)) {
      map.set(author, { author: author, submitted: 0, merged: 0 });
    }
    const entry = map.get(author);
    entry.submitted++;
    if (pr.merged) entry.merged++;
  }
  return Array.from(map.values())
    .sort((a, b) => b.submitted - a.submitted || b.merged - a.merged)
    .slice(0, limit || 10);
}
