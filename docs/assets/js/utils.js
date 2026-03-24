/**
 * Utility functions for the project dashboard.
 */

// ═══════════════════════ LINK REGISTRY ═══════════════════════
// Centralized, canonical link lookup for the entire dashboard.
// Every external URL goes through this registry so links are
// consistent, non-redirecting, and testable.

var LinkRegistry = (function() {
  var GITHUB = 'https://github.com';
  var BUILDKITE = 'https://buildkite.com';

  var BK_PIPELINES = {
    amd:      BUILDKITE + '/vllm/amd-ci',
    upstream: BUILDKITE + '/vllm/ci'
  };
  var BK_QUEUES = BUILDKITE + '/organizations/vllm/clusters/9cecc6b1-94cd-43d1-a256-ab438083f4f5/queues';

  var _bkBuildUrls = { amd: null, upstream: null };
  var _bkGroupData = {};
  var _ready = false;
  var _readyCallbacks = [];

  function stripTrailingSlash(url) {
    return url ? url.replace(/\/+$/, '') : url;
  }

  // ── GitHub URLs ──
  function githubRepo(repoSlug) { return GITHUB + '/' + repoSlug; }
  function githubUser(username) { return GITHUB + '/' + encodeURIComponent(username); }
  function githubPR(repoSlug, number) { return GITHUB + '/' + repoSlug + '/pull/' + number; }
  function githubIssue(repoSlug, number) { return GITHUB + '/' + repoSlug + '/issues/' + number; }
  function githubCommit(repoSlug, sha) { return GITHUB + '/' + repoSlug + '/commit/' + sha; }

  // ── Buildkite URLs ──
  function bkPipeline(pipeline) { return BK_PIPELINES[pipeline] || BK_PIPELINES.amd; }
  function bkQueuesUrl() { return BK_QUEUES; }

  function bkGroupUrl(groupName, pipeline) {
    var d = _bkGroupData[groupName];
    if (pipeline === 'upstream') {
      return (d && d.upstream_url) ? d.upstream_url : (_bkBuildUrls.upstream || BK_PIPELINES.upstream);
    }
    return (d && d.amd_url) ? d.amd_url : (_bkBuildUrls.amd || BK_PIPELINES.amd);
  }

  function bkBuildUrl(pipeline) {
    if (pipeline === 'upstream') return _bkBuildUrls.upstream || BK_PIPELINES.upstream;
    return _bkBuildUrls.amd || BK_PIPELINES.amd;
  }

  // ── Data loading ──
  function _loadData() {
    var loaded = 0;
    function check() {
      if (++loaded >= 2) {
        _ready = true;
        for (var i = 0; i < _readyCallbacks.length; i++) _readyCallbacks[i]();
        _readyCallbacks = [];
      }
    }

    fetch('data/vllm/ci/ci_health.json').then(function(r){ return r.json() }).then(function(d) {
      if (d && d.amd && d.amd.latest_build && d.amd.latest_build.build_url)
        _bkBuildUrls.amd = stripTrailingSlash(d.amd.latest_build.build_url);
      if (d && d.upstream && d.upstream.latest_build && d.upstream.latest_build.build_url)
        _bkBuildUrls.upstream = stripTrailingSlash(d.upstream.latest_build.build_url);
      check();
    }).catch(function(){ check(); });

    fetch('data/vllm/ci/parity_report.json').then(function(r){ return r.json() }).then(function(d) {
      if (d && d.job_groups) {
        for (var i = 0; i < d.job_groups.length; i++) {
          var g = d.job_groups[i];
          var entry = { amd_url: null, upstream_url: null };
          if (g.job_links) {
            for (var j = 0; j < g.job_links.length; j++) {
              var link = g.job_links[j];
              if (link.side === 'upstream') {
                entry.upstream_url = stripTrailingSlash(link.url);
              } else {
                if (!entry.amd_url) entry.amd_url = stripTrailingSlash(link.url);
              }
            }
          }
          _bkGroupData[g.name] = entry;
        }
      }
      check();
    }).catch(function(){ check(); });
  }

  function updateBuildUrls(health) {
    if (health && health.amd && health.amd.latest_build && health.amd.latest_build.build_url)
      _bkBuildUrls.amd = stripTrailingSlash(health.amd.latest_build.build_url);
    if (health && health.upstream && health.upstream.latest_build && health.upstream.latest_build.build_url)
      _bkBuildUrls.upstream = stripTrailingSlash(health.upstream.latest_build.build_url);
  }

  function onReady(fn) { if (_ready) fn(); else _readyCallbacks.push(fn); }

  // ── Safe link builders (HTML strings) ──
  function aTag(url, text, opts) {
    opts = opts || {};
    var cls = opts.cls ? ' class="' + opts.cls + '"' : '';
    var style = opts.style ? ' style="' + opts.style + '"' : '';
    var title = opts.title ? ' title="' + escapeHtml(opts.title) + '"' : '';
    var target = opts.noNewTab ? '' : ' target="_blank" rel="noopener"';
    return '<a href="' + escapeHtml(url) + '"' + target + cls + style + title + '>' + (opts.rawHtml || escapeHtml(text)) + '</a>';
  }

  function bkIconLink(groupName, pipeline) {
    var url = bkGroupUrl(groupName, pipeline);
    var color = pipeline === 'upstream' ? '#1f6feb' : '#da3633';
    var label = pipeline === 'upstream' ? 'Upstream' : 'AMD';
    return '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener" title="' + label + ' CI logs" style="text-decoration:none" onclick="event.stopPropagation()">'
      + '<span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:' + color
      + ';cursor:pointer;transition:transform .15s;vertical-align:middle" onmouseenter="this.style.transform=\'scale(1.3)\'" onmouseleave="this.style.transform=\'\'"></span></a>';
  }

  _loadData();

  return {
    github:  { repo: githubRepo, user: githubUser, pr: githubPR, issue: githubIssue, commit: githubCommit },
    bk:      { pipeline: bkPipeline, queues: bkQueuesUrl, groupUrl: bkGroupUrl, buildUrl: bkBuildUrl, iconLink: bkIconLink, updateBuildUrls: updateBuildUrls },
    aTag:    aTag,
    onReady: onReady,
    _state:  { getBkGroupData: function() { return _bkGroupData; }, getBkBuildUrls: function() { return _bkBuildUrls; } }
  };
})();

// ── Backward-compatible global aliases ──
var BK_GROUP_DATA = {}, BK_READY = false;
Object.defineProperty(window, 'BK_AMD_BUILD', {
  get: function() { return LinkRegistry.bk.buildUrl('amd'); },
  set: function(v) { LinkRegistry.bk.updateBuildUrls({ amd: { latest_build: { build_url: v } } }); }
});
Object.defineProperty(window, 'BK_UP_BUILD', {
  get: function() { return LinkRegistry.bk.buildUrl('upstream'); },
  set: function(v) { LinkRegistry.bk.updateBuildUrls({ upstream: { latest_build: { build_url: v } } }); }
});
LinkRegistry.onReady(function() { BK_READY = true; });

function bkGroupUrl(groupName, pipeline) { return LinkRegistry.bk.groupUrl(groupName, pipeline); }
function bkSearchUrl(groupName, pipeline) { return LinkRegistry.bk.groupUrl(groupName, pipeline); }

// Create a group name element with two colored link icons (AMD + Upstream)
function makeGroupLinks(name, hasAmd, hasUpstream) {
  var container = document.createElement('span');
  container.style.display = 'inline-flex';
  container.style.alignItems = 'center';
  container.style.gap = '6px';

  var text = document.createElement('span');
  text.textContent = name;
  container.appendChild(text);

  if (hasAmd) {
    var amdLink = document.createElement('a');
    amdLink.href = LinkRegistry.bk.groupUrl(name, 'amd');
    amdLink.target = '_blank';
    amdLink.rel = 'noopener';
    amdLink.title = 'View AMD CI logs';
    amdLink.onclick = function(e) { e.stopPropagation(); };
    amdLink.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:#da3633;cursor:pointer;transition:transform .15s" onmouseenter="this.style.transform=\'scale(1.3)\'" onmouseleave="this.style.transform=\'\'"></span>';
    container.appendChild(amdLink);
  }
  if (hasUpstream) {
    var upLink = document.createElement('a');
    upLink.href = LinkRegistry.bk.groupUrl(name, 'upstream');
    upLink.target = '_blank';
    upLink.rel = 'noopener';
    upLink.title = 'View Upstream CI logs';
    upLink.onclick = function(e) { e.stopPropagation(); };
    upLink.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:#1f6feb;cursor:pointer;transition:transform .15s" onmouseenter="this.style.transform=\'scale(1.3)\'" onmouseleave="this.style.transform=\'\'"></span>';
    container.appendChild(upLink);
  }
  return container;
}

// Simple text link (backward compat)
function makeGroupLink(name, pipeline) {
  var a = document.createElement('a');
  a.textContent = name;
  a.href = LinkRegistry.bk.groupUrl(name, pipeline);
  a.target = '_blank';
  a.rel = 'noopener';
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
    ? LinkRegistry.aTag(runUrl, label)
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
      base.amd.failed += (g.amd.failed || 0) + (g.amd.error || 0);
      base.amd.skipped += (g.amd.skipped || 0);
      base.amd.total += (g.amd.total || 0);
    }
    if (g.upstream) {
      if (!base.upstream) base.upstream = { passed: 0, failed: 0, skipped: 0, total: 0 };
      base.upstream.passed += (g.upstream.passed || 0);
      base.upstream.failed += (g.upstream.failed || 0) + (g.upstream.error || 0);
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
  var tbl = '<table style="width:100%;border-collapse:collapse;font-size:15px">';
  tbl += '<thead><tr>';
  tbl += '<th style="text-align:left;padding:10px 14px;border-bottom:2px solid var(--border);color:var(--text-muted);font-size:14px;font-weight:600">Test Group</th>';
  if (showBoth) {
    tbl += '<th style="text-align:center;padding:10px 14px;border-bottom:2px solid var(--border);color:#da3633;font-size:14px;font-weight:600">AMD Tests P/F/S</th>';
    tbl += '<th style="text-align:center;padding:10px 14px;border-bottom:2px solid var(--border);color:#1f6feb;font-size:14px;font-weight:600">Upstream Tests P/F/S</th>';
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
    var gNameEsc = escapeHtml(g.name);
    var bgNone = rowBg ? rowBg.replace('background:','').replace(';','') : '';
    tbl += '<tr style="border-bottom:1px solid var(--border);' + rowBg + '" onmouseenter="this.style.background=\'var(--hover)\'" onmouseleave="this.style.background=\'' + bgNone + '\'">';
    // Group name + red/blue icon links
    tbl += '<td style="padding:8px 14px;display:flex;align-items:center;gap:8px">';
    tbl += '<span>' + gNameEsc + '</span>';
    if (hasAmd) tbl += ' ' + LinkRegistry.bk.iconLink(g.name, 'amd');
    if (hasUp) tbl += ' ' + LinkRegistry.bk.iconLink(g.name, 'upstream');
    tbl += '</td>';
    if (showBoth) {
      if (hasAmd) {
        var ap = g.amd.passed||0, af = g.amd.failed||0, as_ = g.amd.skipped||0, at = g.amd.total||0;
        if (at <= 1 && af === 0) tbl += '<td style="text-align:center;padding:8px 14px"><span style="color:#238636;font-weight:600" title="Job passed (no per-test data)">&#x2713;</span></td>';
        else if (at <= 1 && af > 0) tbl += '<td style="text-align:center;padding:8px 14px"><span style="color:#da3633;font-weight:600" title="Job failed (no per-test data)">&#x2717;</span></td>';
        else tbl += '<td style="text-align:center;padding:8px 14px"><span style="color:#238636;font-weight:600">' + ap + '</span>/<span style="color:' + (af > 0 ? '#da3633' : 'var(--text-muted)') + ';font-weight:600">' + af + '</span>/<span style="color:var(--text-muted)">' + as_ + '</span></td>';
      } else {
        tbl += '<td style="text-align:center;padding:8px 14px"><span style="color:#da3633;font-weight:600">not in AMD CI</span></td>';
      }
      if (hasUp) {
        var upp = g.upstream.passed||0, uf = g.upstream.failed||0, us = g.upstream.skipped||0, ut = g.upstream.total||0;
        if (ut <= 1 && uf === 0) tbl += '<td style="text-align:center;padding:8px 14px"><span style="color:#238636;font-weight:600" title="Job passed (no per-test data)">&#x2713;</span></td>';
        else if (ut <= 1 && uf > 0) tbl += '<td style="text-align:center;padding:8px 14px"><span style="color:#da3633;font-weight:600" title="Job failed (no per-test data)">&#x2717;</span></td>';
        else tbl += '<td style="text-align:center;padding:8px 14px"><span style="color:#238636;font-weight:600">' + upp + '</span>/<span style="color:' + (uf > 0 ? '#da3633' : 'var(--text-muted)') + ';font-weight:600">' + uf + '</span>/<span style="color:var(--text-muted)">' + us + '</span></td>';
      } else {
        tbl += '<td style="text-align:center;padding:8px 14px"><span style="color:#1f6feb;font-weight:600">not in Upstream</span></td>';
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
