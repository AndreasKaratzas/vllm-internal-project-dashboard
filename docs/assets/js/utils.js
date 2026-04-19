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

  // Convert old "#jobid" URLs to proper step canvas URLs
  // e.g. builds/123#uuid -> builds/123/steps/canvas?jid=uuid&tab=output
  function normalizeBkUrl(url) {
    if (!url) return url;
    var m = url.match(/^(https:\/\/buildkite\.com\/vllm\/[a-z\-]+\/builds\/\d+)#([0-9a-f\-]+)$/);
    if (m) return m[1] + '/steps/canvas?jid=' + m[2] + '&tab=output';
    return url;
  }

  // ── GitHub URLs ──
  function githubRepo(repoSlug) { return GITHUB + '/' + repoSlug; }
  function githubUser(username) { return GITHUB + '/' + encodeURIComponent(username); }
  function githubPR(repoSlug, number) { return GITHUB + '/' + repoSlug + '/pull/' + number; }
  function githubIssue(repoSlug, number) { return GITHUB + '/' + repoSlug + '/issues/' + number; }
  function githubCommit(repoSlug, sha) { return GITHUB + '/' + repoSlug + '/commit/' + sha; }
  function githubOrgProject(org, number) { return GITHUB + '/orgs/' + org + '/projects/' + number; }

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

    fetch('data/vllm/ci/ci_health.json?_='+Math.floor(Date.now()/1000)).then(function(r){ return r.json() }).then(function(d) {
      if (d && d.amd && d.amd.latest_build && d.amd.latest_build.build_url)
        _bkBuildUrls.amd = stripTrailingSlash(d.amd.latest_build.build_url);
      if (d && d.upstream && d.upstream.latest_build && d.upstream.latest_build.build_url)
        _bkBuildUrls.upstream = stripTrailingSlash(d.upstream.latest_build.build_url);
      check();
    }).catch(function(){ check(); });

    fetch('data/vllm/ci/parity_report.json?_='+Math.floor(Date.now()/1000)).then(function(r){ return r.json() }).then(function(d) {
      if (d && d.job_groups) {
        for (var i = 0; i < d.job_groups.length; i++) {
          var g = d.job_groups[i];
          var entry = { amd_url: null, upstream_url: null };
          if (g.job_links) {
            for (var j = 0; j < g.job_links.length; j++) {
              var link = g.job_links[j];
              if (link.side === 'upstream') {
                entry.upstream_url = normalizeBkUrl(stripTrailingSlash(link.url));
              } else {
                if (!entry.amd_url) entry.amd_url = normalizeBkUrl(stripTrailingSlash(link.url));
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
    github:  { repo: githubRepo, user: githubUser, pr: githubPR, issue: githubIssue, commit: githubCommit, orgProject: githubOrgProject },
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

// Create ONLY the link icon boxes (no text name) for use as a separate column.
// Use this when the group name is rendered in its own column for alignment.
function makeGroupLinksColumn(name, hasAmd, hasUpstream) {
  var container = document.createElement('span');
  container.style.display = 'inline-flex';
  container.style.alignItems = 'center';
  container.style.gap = '3px';

  function mkIcon(color, url, title) {
    var a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.title = title;
    a.onclick = function(e) { e.stopPropagation(); };
    a.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:' + color + ';cursor:pointer;transition:transform .15s" onmouseenter="this.style.transform=\'scale(1.3)\'" onmouseleave="this.style.transform=\'\'"></span>';
    return a;
  }

  if (hasAmd) container.appendChild(mkIcon('#da3633', LinkRegistry.bk.groupUrl(name, 'amd'), 'View AMD CI logs'));
  if (hasUpstream) container.appendChild(mkIcon('#1f6feb', LinkRegistry.bk.groupUrl(name, 'upstream'), 'View Upstream CI logs'));
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
  const sep = url.includes('?') ? '&' : '?';
  const resp = await fetch(url + sep + '_=' + Math.floor(Date.now()/1000));
  if (!resp.ok) return null;
  return resp.json();
}

// ── Shared element factory ──
// Each ci-*.js module used to define its own identical ``h(tag,props,children)``.
// This is the canonical implementation; the module-local ``h`` is aliased to
// this below (``var h = el;``) so existing call sites keep working unchanged.
function el(tag, props, children) {
  props = props || {};
  children = children || [];
  var e = document.createElement(tag);
  if (props.cls) { e.className = props.cls; delete props.cls; }
  if (props.html != null) { e.innerHTML = props.html; delete props.html; }
  if (props.text != null) { e.textContent = props.text; delete props.text; }
  if (props.style) { Object.assign(e.style, props.style); delete props.style; }
  for (var a in props) {
    var v = props[a];
    if (typeof v === 'function') e[a] = v;
    else if (v != null) e.setAttribute(a, v);
  }
  for (var i = 0; i < children.length; i++) {
    var c = children[i];
    if (c == null) continue;
    if (typeof c === 'string') e.append(c);
    else e.append(c);
  }
  return e;
}

// ── Shared overlay factory ──
// ci-queue.js opens three overlays with identical backdrop + panel markup.
// Consumers call ``createOverlay({title, color})`` to get ``{backdrop, body,
// close}``; they populate ``body``, and ``backdrop.remove()`` (or ``close()``)
// tears everything down. Escape-key + click-on-backdrop handlers are wired
// automatically.
function createOverlay(opts) {
  opts = opts || {};
  var bg = opts.background || 'rgba(0,0,0,.6)';
  var panelBg = opts.panelBackground || 'var(--bg)';
  var color = opts.color || 'var(--text)';
  var title = opts.title || '';
  var maxWidth = opts.maxWidth || '900px';

  var backdrop = el('div', { style: {
    position: 'fixed', inset: '0', background: bg, zIndex: '1000',
    display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
    paddingTop: '40px', overflow: 'auto',
  }});
  function close() { backdrop.remove(); document.removeEventListener('keydown', onKey); }
  function onKey(e) { if (e.key === 'Escape') close(); }
  backdrop.onclick = function(e) { if (e.target === backdrop) close(); };
  document.addEventListener('keydown', onKey);

  var closeBtn = el('button', {
    text: '\u2715',
    onclick: close,
    style: { background: 'none', border: 'none', color: color, fontSize: '20px', cursor: 'pointer', padding: '4px 8px' },
  });
  var header = el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' } }, [
    el('h3', { text: title, style: { margin: '0', color: color } }),
    closeBtn,
  ]);
  var body = el('div');
  var panel = el('div', { style: {
    background: panelBg, border: '1px solid var(--border)', borderRadius: '8px',
    padding: '20px', maxWidth: maxWidth, width: '90%', maxHeight: '80vh', overflow: 'auto',
  }}, [header, body]);
  backdrop.append(panel);
  document.body.append(backdrop);
  return { backdrop: backdrop, panel: panel, body: body, close: close };
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
 * Shard bases are auto-loaded from shard_bases.json (generated from YAML %N steps).
 */
// Auto-populated from shard_bases.json — DO NOT hardcode.
var _SHARD_BASES = [];

// Fetch shard bases from the data file (generated by collect_ci.py from YAML)
// Exposed as a promise so consumers can await it before normalizing job names.
var _shardBasesReady = (function() {
  return fetch('data/vllm/ci/shard_bases.json?_=' + Math.floor(Date.now()/1000))
    .then(function(r) { return r.ok ? r.json() : []; })
    .then(function(bases) { if (Array.isArray(bases)) _SHARD_BASES = bases; })
    .catch(function() {});
})();

function _stripShardIndex(name) {
  var lower = name.toLowerCase();
  for (var i = 0; i < _SHARD_BASES.length; i++) {
    var base = _SHARD_BASES[i];
    if (lower.indexOf(base) === 0 && lower.length > base.length) {
      var rest = lower.substring(base.length);
      if (/^\s+\d+\s*$/.test(rest)) return name.substring(0, base.length);
    }
  }
  return name;
}

function mergeShardedGroups(groups) {
  var baseMap = {};
  for (var i = 0; i < groups.length; i++) {
    var g = groups[i];
    var name = g.name || '';
    var baseName = _stripShardIndex(name);
    if (!baseMap[baseName]) {
      baseMap[baseName] = { name: baseName, amd: null, upstream: null, hardware: [], hw_failures: {}, hw_canceled: {}, hw_backfilled: {}, job_links: [], failure_tests: [], backfilled: false };
    }
    var base = baseMap[baseName];
    if (g.backfilled) base.backfilled = true;
    if (g.hw_backfilled) { for (var hw in g.hw_backfilled) base.hw_backfilled[hw] = true; }
    if (g.amd) {
      if (!base.amd) base.amd = { passed: 0, failed: 0, skipped: 0, total: 0, canceled: 0 };
      base.amd.passed += (g.amd.passed || 0);
      base.amd.failed += (g.amd.failed || 0) + (g.amd.error || 0);
      base.amd.skipped += (g.amd.skipped || 0);
      base.amd.canceled += (g.amd.canceled || 0);
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
    if (g.hw_canceled) { for (var hw in g.hw_canceled) base.hw_canceled[hw] = (base.hw_canceled[hw] || 0) + g.hw_canceled[hw]; }
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
  tbl += '<th style="text-align:center;padding:10px 8px;border-bottom:2px solid var(--border);color:var(--text-muted);font-size:13px;font-weight:600;width:36px">#</th>';
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
    tbl += '<td style="text-align:center;padding:8px 8px;color:var(--text-muted);font-size:13px;width:36px">' + (i + 1) + '</td>';
    // Group name + red/blue icon links
    tbl += '<td style="padding:8px 14px;display:flex;align-items:center;gap:8px">';
    tbl += '<span>' + gNameEsc + '</span>';
    if (hasAmd) tbl += ' ' + LinkRegistry.bk.iconLink(g.name, 'amd');
    if (hasUp) tbl += ' ' + LinkRegistry.bk.iconLink(g.name, 'upstream');
    tbl += '</td>';
    if (showBoth) {
      if (hasAmd) {
        var ap = g.amd.passed||0, af = g.amd.failed||0, as_ = g.amd.skipped||0;
        tbl += '<td style="text-align:center;padding:8px 14px"><span style="color:#238636;font-weight:600">' + ap.toLocaleString() + '</span>/<span style="color:' + (af > 0 ? '#da3633' : 'var(--text-muted)') + ';font-weight:600">' + af + '</span>/<span style="color:var(--text-muted)">' + as_.toLocaleString() + '</span></td>';
      } else {
        tbl += '<td style="text-align:center;padding:8px 14px"><span style="color:#da3633;font-weight:600">not in AMD CI</span></td>';
      }
      if (hasUp) {
        var upp = g.upstream.passed||0, uf = g.upstream.failed||0, us = g.upstream.skipped||0;
        tbl += '<td style="text-align:center;padding:8px 14px"><span style="color:#238636;font-weight:600">' + upp.toLocaleString() + '</span>/<span style="color:' + (uf > 0 ? '#da3633' : 'var(--text-muted)') + ';font-weight:600">' + uf + '</span>/<span style="color:var(--text-muted)">' + us.toLocaleString() + '</span></td>';
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

/**
 * Register a CI section for a framework in the sidebar and main content.
 *
 * HOW TO ADD CI TABS FOR A NEW FRAMEWORK:
 * 1. Create data/{framework}/ci/ directory with your data files
 * 2. Create docs/assets/js/ci-{tab}-{framework}.js (self-contained IIFE)
 * 3. In your JS file, call registerCISection() on DOMContentLoaded:
 *      registerCISection('sglang', [
 *        { id: 'ci-health-sglang', label: 'CI Health', icon: '★' },
 *        { id: 'ci-analytics-sglang', label: 'CI Analytics', icon: '◆' }
 *      ]);
 * 4. Your JS file watches for its tab panel via MutationObserver (same pattern as vLLM CI files)
 * 5. Add <script src="assets/js/ci-{tab}-{framework}.js"> to index.html
 *
 * @param {string} frameworkName - Display name for the sidebar section header (e.g., 'SGLang')
 * @param {Array} tabs - Array of {id, label, icon?} objects for each tab to create
 */
/**
 * CI Section accordion — collapsible framework sections in the sidebar.
 * Clicking a framework header expands its tabs and collapses others.
 */
var _ciSections = [];

function registerCISection(frameworkName, tabs) {
  var nav = document.querySelector('#sidebar-nav') || document.querySelector('nav');
  if (!nav) return;

  var toolsLabel = null;
  var labels = nav.querySelectorAll('.nav-section-label');
  for (var i = 0; i < labels.length; i++) {
    if (labels[i].textContent.trim().toLowerCase() === 'tools') {
      toolsLabel = labels[i];
      break;
    }
  }

  // Create clickable framework header
  var header = document.createElement('div');
  header.className = 'ci-framework-header';
  header.setAttribute('data-framework', frameworkName);
  var hasTabs = tabs && tabs.length > 0;
  header.innerHTML = '<span class="ci-fw-name">' + frameworkName + ' CI</span>' +
    (hasTabs ? '<span class="ci-fw-arrow">&#9656;</span>' : '<span class="ci-fw-empty">—</span>');
  if (toolsLabel) nav.insertBefore(header, toolsLabel);
  else nav.appendChild(header);

  // Create tab container (hidden by default)
  var tabContainer = document.createElement('div');
  tabContainer.className = 'ci-tab-group';
  tabContainer.style.maxHeight = '0';
  tabContainer.style.overflow = 'hidden';
  tabContainer.style.transition = 'max-height 0.3s ease, opacity 0.3s ease';
  tabContainer.style.opacity = '0';
  if (toolsLabel) nav.insertBefore(tabContainer, toolsLabel);
  else nav.appendChild(tabContainer);

  var sectionInfo = { name: frameworkName, header: header, container: tabContainer, tabs: tabs || [], expanded: false };
  _ciSections.push(sectionInfo);

  var main = document.getElementById('main-content');

  if (hasTabs) {
    for (var t = 0; t < tabs.length; t++) {
      var tab = tabs[t];
      var btn = document.createElement('button');
      btn.className = 'nav-btn ci-sub-btn';
      btn.setAttribute('data-tab', tab.id);
      btn.textContent = tab.label;
      tabContainer.appendChild(btn);

      // Create tab panel
      var panel = document.createElement('div');
      panel.id = 'tab-' + tab.id;
      panel.className = 'tab-panel';
      var section = document.createElement('section');
      section.id = tab.id + '-view';
      panel.appendChild(section);
      if (main) main.appendChild(panel);

      // Tab click handler — guards against activating a gated tab for
      // viewers who aren't authorized. The nav button is normally hidden
      // via ``__gate-hidden``, but a rogue click (devtools, stylesheet
      // override) must not leak the panel content either, so we also
      // re-stamp visibility after every switch.
      btn.addEventListener('click', (function(tabId) {
        return function() {
          if (window.__authGate && typeof window.__authGate.canAccessTab === 'function'
              && !window.__authGate.canAccessTab(tabId)) {
            if (typeof window.__authGate.applyTabVisibility === 'function') {
              window.__authGate.applyTabVisibility();
            }
            return;
          }
          document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active'); });
          document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
          this.classList.add('active');
          var p = document.getElementById('tab-' + tabId);
          if (p) p.classList.add('active');
          history.replaceState(null, '', '#' + tabId);
          if (window.__authGate && typeof window.__authGate.applyTabVisibility === 'function') {
            window.__authGate.applyTabVisibility();
          }
        };
      })(tab.id));
    }
  }

  // Header click: expand this, collapse others
  header.addEventListener('click', function() {
    if (!hasTabs) return;
    var isExpanded = sectionInfo.expanded;
    // Collapse all
    for (var i = 0; i < _ciSections.length; i++) {
      var s = _ciSections[i];
      s.expanded = false;
      s.container.style.maxHeight = '0';
      s.container.style.opacity = '0';
      s.header.classList.remove('ci-fw-expanded');
    }
    // Toggle this one
    if (!isExpanded) {
      sectionInfo.expanded = true;
      tabContainer.style.maxHeight = (tabs.length * 40 + 10) + 'px';
      tabContainer.style.opacity = '1';
      header.classList.add('ci-fw-expanded');
    }
  });
}

// Register all framework CI sections.
// vLLM has tabs; others are placeholders (expandable when they add CI pages).
registerCISection('vLLM', [
  { id: 'ci-health', label: 'CI Health' },
  { id: 'ci-analytics', label: 'CI Analytics' },
  { id: 'ci-queue', label: 'Queue Monitor' },
  { id: 'ci-hotness', label: 'CI Workload Trajectory' },
  { id: 'ci-omni', label: 'Omni' },
  { id: 'ci-testbuild', label: 'Test Build' },
  { id: 'ci-ready', label: 'Ready Tickets' },
  { id: 'ci-admin', label: 'Admin' },
]);
// Other framework CI sections removed — vLLM only

// Auto-expand vLLM on load (it has tabs)
(function() {
  for (var i = 0; i < _ciSections.length; i++) {
    var s = _ciSections[i];
    if (s.name === 'vLLM' && s.tabs.length) {
      s.expanded = true;
      s.container.style.maxHeight = (s.tabs.length * 40 + 10) + 'px';
      s.container.style.opacity = '1';
      s.header.classList.add('ci-fw-expanded');
      break;
    }
  }
})();
