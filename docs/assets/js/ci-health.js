/**
 * CI Health dashboard — vLLM Buildkite test analysis visualization.
 * Refactored: accurate counts, hardware breakdown, collapsible groups,
 * heatmap, filters, B200/MI355 section.
 */
(function () {
  const CI_BASE = 'data/vllm/ci';
  const VLLM_BASE = 'data/vllm';

  const C = {
    green: '#238636', yellow: '#d29922', orange: '#db6d28', red: '#da3633',
    blue: '#1f6feb', purple: '#8957e5', muted: '#8b949e', text: '#e6edf3',
    bg: '#161b22', border: '#30363d', cardBg: '#0d1117',
  };
  const LABEL_COLORS = {
    passing: C.green, failing: C.red, new_failure: '#f85149', fixed: '#3fb950',
    flaky: C.yellow, skipped: C.muted, new_test: C.blue, quarantined: C.purple, allowlisted: C.purple,
  };

  // Known test area keywords for grouping
  const AREA_KEYWORDS = [
    'kernels', 'entrypoints', 'distributed', 'compile', 'engine', 'lora',
    'multi-modal', 'multimodal', 'quantiz', 'language models', 'basic correctness',
    'benchmark', 'regression', 'examples', 'v1', 'lm eval', 'gpqa', 'ray',
    'nixl', 'weight loading', 'fusion', 'batch invariance', 'model executor',
    'attention benchmark', 'spec decode', 'transformers', 'plugin', 'sampler',
    'python-only', 'pytorch', 'model runner',
  ];

  async function fetchJ(path) {
    try { const r = await fetch(path); return r.ok ? r.json() : null; } catch { return null; }
  }

  function h(tag, props = {}, kids = []) {
    const e = document.createElement(tag);
    if (props.cls) { e.className = props.cls; delete props.cls; }
    if (props.html) { e.innerHTML = props.html; delete props.html; }
    if (props.text) { e.textContent = props.text; delete props.text; }
    if (props.style) { Object.assign(e.style, props.style); delete props.style; }
    for (const [k, v] of Object.entries(props)) e.setAttribute(k, v);
    for (const c of kids) { if (typeof c === 'string') e.append(c); else if (c) e.append(c); }
    return e;
  }

  function pct(v, d = 1) { return (v * 100).toFixed(d) + '%'; }
  function rateColor(r) { return r >= 0.95 ? C.green : r >= 0.85 ? C.yellow : r >= 0.7 ? C.orange : C.red; }

  function miniBar(rate, width = '100px') {
    const pctW = Math.round(rate * 100);
    return h('div', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px' } }, [
      h('div', { style: { width, height: '8px', background: C.border, borderRadius: '4px', overflow: 'hidden' } }, [
        h('div', { style: { width: pctW + '%', height: '100%', background: rateColor(rate), borderRadius: '4px' } }),
      ]),
      h('span', { text: pct(rate, 0), style: { fontSize: '11px', color: rateColor(rate), fontWeight: '600' } }),
    ]);
  }

  function statusDot(color, size = '8px') {
    return h('span', { style: { display: 'inline-block', width: size, height: size, borderRadius: '50%', background: color, marginRight: '4px' } });
  }

  function historyDots(hist) {
    const span = h('span', { style: { display: 'inline-flex', gap: '2px' } });
    for (const s of hist) {
      const c = s === 'P' ? C.green : s === 'F' ? C.red : C.muted;
      span.append(h('span', { style: { display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: c } }));
    }
    return span;
  }

  function card(title, value, subtitle, color, extra) {
    const el = h('div', { style: { background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '16px', borderLeft: `3px solid ${color || C.blue}` } }, [
      h('div', { text: title, style: { color: C.muted, fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' } }),
      h('div', { text: String(value), style: { fontSize: '28px', fontWeight: '700', color: color || C.text, lineHeight: '1.2' } }),
      subtitle ? h('div', { html: subtitle, style: { color: C.muted, fontSize: '12px', marginTop: '4px' } }) : null,
    ]);
    if (extra) el.append(extra);
    return el;
  }

  // --- Determine test area from normalized name ---
  function getTestArea(name) {
    const lower = name.toLowerCase();
    for (const kw of AREA_KEYWORDS) {
      if (lower.startsWith(kw) || lower.includes(kw)) return kw.replace(/\s+/g, '-');
    }
    // Fallback: first word(s) before common separators
    const m = lower.match(/^([\w-]+(?:\s+[\w-]+)?)/);
    return m ? m[1].replace(/\s+/g, '-') : 'other';
  }

  // ===================== OVERVIEW =====================

  function renderOverview(box, health, parity, configParity) {
    box.append(h('h2', { text: 'vLLM CI Health', style: { marginBottom: '16px' } }));
    const grid = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' } });

    if (health?.amd?.latest_build) {
      const a = health.amd.latest_build;
      grid.append(card('AMD Pass Rate', pct(a.pass_rate, 1), `Build #${a.build_number} &mdash; ${a.total_tests.toLocaleString()} tests`, rateColor(a.pass_rate)));
      grid.append(card('Test Failures', a.failed + a.errors, `across ${a.test_groups} test groups &bull; ${a.skipped.toLocaleString()} skipped`, C.red));

      // Hardware breakdown card
      const hwEl = h('div', { style: { marginTop: '8px' } });
      const byHw = a.by_hardware || {};
      for (const [hw, c] of Object.entries(byHw).sort()) {
        if (hw === 'unknown') continue;
        hwEl.append(h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0', fontSize: '12px' } }, [
          h('span', { text: hw.toUpperCase(), style: { color: C.text, fontWeight: '600', width: '50px' } }),
          miniBar(c.pass_rate, '80px'),
          h('span', { text: `${c.failed}f`, style: { color: c.failed > 0 ? C.red : C.muted, fontSize: '11px', width: '30px', textAlign: 'right' } }),
        ]));
      }
      grid.append(card('Per-Hardware', '', '', C.purple, hwEl));
    }

    if (health?.upstream?.latest_build) {
      const u = health.upstream.latest_build;
      grid.append(card('Upstream Pass Rate', pct(u.pass_rate, 1), `Build #${u.build_number} &mdash; ${u.total_tests.toLocaleString()} tests`, rateColor(u.pass_rate)));
    }

    if (parity?.job_groups) {
      const both = parity.job_groups.filter(g => g.amd && g.upstream);
      const passing = both.filter(g => (g.amd.failed || 0) === 0);
      const rate = both.length > 0 ? passing.length / both.length : 0;
      grid.append(card('Job Group Parity', pct(rate, 0), `${passing.length}/${both.length} groups pass on AMD`, rateColor(rate)));
    }

    if (health?.test_counts) {
      const tc = health.test_counts;
      grid.append(card('Flaky Tests', tc.flaky || 0, `${tc.failing || 0} failing &bull; ${tc.new_failure || 0} new failures`, (tc.flaky || 0) > 0 ? C.yellow : C.green));
    }

    box.append(grid);
  }

  // ===================== HEALTH LABELS BAR =====================

  function renderHealthBar(box, health) {
    if (!health?.test_counts) return;
    const tc = health.test_counts;
    const total = Object.values(tc).reduce((a, b) => a + b, 0);
    if (!total) return;

    box.append(h('h3', { text: 'Test Health Distribution', style: { marginBottom: '8px' } }));
    const bar = h('div', { style: { display: 'flex', height: '20px', borderRadius: '4px', overflow: 'hidden', marginBottom: '6px' } });
    const legend = h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px', fontSize: '11px' } });
    const order = ['passing', 'new_test', 'skipped', 'flaky', 'failing', 'new_failure', 'fixed'];
    for (const label of order) {
      const count = tc[label] || 0;
      if (!count) continue;
      bar.append(h('div', { title: `${label}: ${count}`, style: { width: (count / total * 100) + '%', background: LABEL_COLORS[label] || C.muted, minWidth: '2px' } }));
      legend.append(h('span', {}, [statusDot(LABEL_COLORS[label] || C.muted), `${label} (${count})`]));
    }
    box.append(bar, legend);
  }

  // ===================== TREND CHART =====================

  function renderTrend(box, health) {
    if (!health?.amd?.builds || health.amd.builds.length < 2) return;
    box.append(h('h3', { text: 'Pass Rate Trend (7 days)', style: { marginBottom: '8px' } }));
    const canvas = h('canvas', { style: { maxHeight: '220px', marginBottom: '20px' } });
    box.append(canvas);

    const amd = [...health.amd.builds].reverse();
    const up = health.upstream?.builds ? [...health.upstream.builds].reverse() : [];
    new Chart(canvas, {
      type: 'line',
      data: {
        labels: amd.map(b => b.created_at?.slice(5, 10) || ''),
        datasets: [
          { label: 'AMD', data: amd.map(b => +(b.pass_rate * 100).toFixed(1)), borderColor: '#da3633', backgroundColor: 'rgba(218,54,51,0.08)', tension: 0.3, fill: true, pointRadius: 4 },
          ...(up.length ? [{ label: 'Upstream', data: up.map(b => +(b.pass_rate * 100).toFixed(1)), borderColor: '#1f6feb', backgroundColor: 'rgba(31,111,235,0.08)', tension: 0.3, fill: true, pointRadius: 4 }] : []),
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: C.text } } },
        scales: {
          y: { min: 90, max: 100, ticks: { color: C.muted, callback: v => v + '%' }, grid: { color: C.border } },
          x: { ticks: { color: C.muted }, grid: { color: C.border } },
        },
      },
    });
  }

  // ===================== HEATMAP =====================

  function renderHeatmap(box, parity) {
    if (!parity?.job_groups) return;
    const groups = parity.job_groups.filter(g => g.amd && g.upstream);
    if (!groups.length) return;

    // Group by area
    const areas = {};
    for (const g of groups) {
      const area = getTestArea(g.name);
      if (!areas[area]) areas[area] = { pass: 0, fail: 0, total: 0 };
      const aFail = (g.amd.failed || 0) + (g.amd.error || 0);
      if (aFail > 0) areas[area].fail++;
      else areas[area].pass++;
      areas[area].total++;
    }

    box.append(h('h3', { text: 'Test Area Health', style: { marginBottom: '8px' } }));
    const grid = h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '20px' } });
    for (const [area, d] of Object.entries(areas).sort((a, b) => b[1].total - a[1].total)) {
      const rate = d.pass / d.total;
      const size = Math.max(50, Math.min(120, d.total * 12));
      const cell = h('div', {
        title: `${area}: ${d.pass}/${d.total} pass (${d.fail} regressions)`,
        style: {
          width: size + 'px', height: '44px', background: rateColor(rate), borderRadius: '4px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          fontSize: '10px', color: '#fff', fontWeight: '600', textAlign: 'center', padding: '2px 4px',
          opacity: rate >= 1.0 ? '0.7' : '1',
        },
        text: area.replace(/-/g, ' '),
      });
      cell.addEventListener('click', () => {
        const details = document.querySelector(`details[data-area="${area}"]`);
        if (details) { details.open = true; details.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
      });
      grid.append(cell);
    }
    box.append(grid);
  }

  // ===================== GROUPED PARITY VIEW =====================

  function renderGroupedParity(box, parity) {
    if (!parity?.job_groups) return;
    const allGroups = parity.job_groups;
    const both = allGroups.filter(g => g.amd && g.upstream);
    const amdOnly = allGroups.filter(g => g.amd && !g.upstream);
    const upOnly = allGroups.filter(g => !g.amd && g.upstream);

    box.append(h('h3', { text: `Runtime Parity: AMD vs Upstream`, style: { marginBottom: '8px' } }));

    // Filter bar
    const filterBar = h('div', { cls: 'filter-bar', style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' } });
    const filterBtnStyle = { background: C.border, border: 'none', color: C.text, padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' };
    const filters = [
      { label: 'All', value: 'all' }, { label: 'Regressions', value: 'regression' },
      { label: 'Both Pass', value: 'pass' }, { label: 'Both Fail', value: 'fail' },
      { label: `AMD-only (${amdOnly.length})`, value: 'amd-only' }, { label: `Upstream-only (${upOnly.length})`, value: 'up-only' },
    ];
    let activeFilter = 'all';
    const container = h('div');

    for (const f of filters) {
      const btn = h('button', { text: f.label, style: { ...filterBtnStyle, ...(f.value === 'all' ? { background: C.blue } : {}) } });
      btn.addEventListener('click', () => {
        activeFilter = f.value;
        filterBar.querySelectorAll('button').forEach(b => b.style.background = C.border);
        btn.style.background = C.blue;
        applyFilter(container, activeFilter, amdOnly, upOnly);
      });
      filterBar.append(btn);
    }
    box.append(filterBar);

    // Group matched tests by area
    const byArea = {};
    for (const g of both) {
      const area = getTestArea(g.name);
      if (!byArea[area]) byArea[area] = [];
      byArea[area].push(g);
    }

    // Render each area as collapsible
    for (const [area, groups] of Object.entries(byArea).sort((a, b) => a[0].localeCompare(b[0]))) {
      const regressions = groups.filter(g => (g.amd.failed || 0) > 0 && (g.upstream.failed || 0) === 0);
      const allPass = groups.every(g => (g.amd.failed || 0) === 0);
      const details = h('details', { 'data-area': area, 'data-status': regressions.length > 0 ? 'regression' : allPass ? 'pass' : 'fail', style: { marginBottom: '4px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '6px' } });
      if (regressions.length > 0) details.open = true;

      const areaRate = groups.filter(g => (g.amd.failed || 0) === 0).length / groups.length;
      const summary = h('summary', { style: { padding: '8px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' } }, [
        h('span', { style: { fontWeight: '600' } }, [
          statusDot(regressions.length > 0 ? C.red : allPass ? C.green : C.orange),
          `${area.replace(/-/g, ' ')} `,
          h('span', { text: `(${groups.length} groups${regressions.length > 0 ? ', ' + regressions.length + ' regressions' : ''})`, style: { color: C.muted, fontWeight: '400' } }),
        ]),
        miniBar(areaRate, '80px'),
      ]);
      details.append(summary);

      // Inner table
      const table = h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' } });
      const thead = h('thead');
      thead.append(h('tr', {}, [
        h('th', { text: 'Test Group', style: thS() }),
        h('th', { html: 'AMD Pass/Fail/Skip', style: thS('center') }),
        h('th', { html: 'Upstream Pass/Fail/Skip', style: thS('center') }),
        h('th', { text: 'Status', style: thS('center') }),
      ]));
      table.append(thead);

      const tbody = h('tbody');
      for (const g of groups.sort((a, b) => (b.amd.failed || 0) - (a.amd.failed || 0))) {
        const af = (g.amd.failed || 0), uf = (g.upstream.failed || 0);
        let status, sColor;
        if (af === 0 && uf === 0) { status = 'Both pass'; sColor = C.green; }
        else if (af > 0 && uf === 0) { status = 'AMD regression'; sColor = C.red; }
        else if (af === 0 && uf > 0) { status = 'AMD advantage'; sColor = C.blue; }
        else { status = 'Both fail'; sColor = C.orange; }

        tbody.append(h('tr', {}, [
          h('td', { text: g.name, style: tdS() }),
          h('td', { html: `<span style="color:${C.green}">${g.amd.passed||0}</span> / <span style="color:${C.red}">${af}</span> / <span style="color:${C.muted}">${g.amd.skipped||0}</span>`, style: tdS('center') }),
          h('td', { html: `<span style="color:${C.green}">${g.upstream.passed||0}</span> / <span style="color:${C.red}">${uf}</span> / <span style="color:${C.muted}">${g.upstream.skipped||0}</span>`, style: tdS('center') }),
          h('td', { html: `<span style="color:${sColor};font-weight:600">${status}</span>`, style: tdS('center') }),
        ]));
      }
      table.append(tbody);
      details.append(h('div', { style: { padding: '0 12px 8px' } }, [table]));
      container.append(details);
    }

    // AMD-only and upstream-only sections (hidden by default, shown via filter)
    const amdOnlySection = h('div', { 'data-filter-section': 'amd-only', style: { display: 'none', marginTop: '12px' } });
    amdOnlySection.append(h('h4', { text: `AMD-Only Test Groups (${amdOnly.length})`, style: { color: C.red, marginBottom: '8px' } }));
    const amdList = h('div', { style: { columns: '2', fontSize: '12px' } });
    for (const g of amdOnly.sort((a, b) => a.name.localeCompare(b.name))) {
      amdList.append(h('div', { text: `${g.amd_job_name || g.name}`, style: { color: C.muted, padding: '1px 0' } }));
    }
    amdOnlySection.append(amdList);
    container.append(amdOnlySection);

    const upOnlySection = h('div', { 'data-filter-section': 'up-only', style: { display: 'none', marginTop: '12px' } });
    upOnlySection.append(h('h4', { text: `Upstream-Only Test Groups (${upOnly.length})`, style: { color: C.blue, marginBottom: '8px' } }));
    const upList = h('div', { style: { columns: '2', fontSize: '12px' } });
    for (const g of upOnly.sort((a, b) => a.name.localeCompare(b.name))) {
      upList.append(h('div', { text: `${g.upstream_job_name || g.name}`, style: { color: C.muted, padding: '1px 0' } }));
    }
    upOnlySection.append(upList);
    container.append(upOnlySection);

    box.append(container);
  }

  function applyFilter(container, filter, amdOnly, upOnly) {
    // Show/hide collapsible areas
    container.querySelectorAll('details[data-area]').forEach(d => {
      if (filter === 'all') d.style.display = '';
      else if (filter === 'amd-only' || filter === 'up-only') d.style.display = 'none';
      else d.style.display = d.dataset.status === filter || (filter === 'fail' && d.dataset.status !== 'pass') ? '' : 'none';
    });
    // Show/hide amd-only/upstream-only sections
    const amdSec = container.querySelector('[data-filter-section="amd-only"]');
    const upSec = container.querySelector('[data-filter-section="up-only"]');
    if (amdSec) amdSec.style.display = filter === 'amd-only' ? '' : 'none';
    if (upSec) upSec.style.display = filter === 'up-only' ? '' : 'none';
  }

  // ===================== FLAKY + OFFENDERS =====================

  function renderFlaky(box, flaky) {
    if (!flaky?.tests?.length) return;
    box.append(h('h3', { text: `Flaky Tests (${flaky.total_flaky})`, style: { marginBottom: '8px' } }));
    const table = h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '20px' } });
    table.append(h('thead', {}, [h('tr', {}, [h('th', { text: 'Test', style: thS() }), h('th', { text: 'Rate', style: thS('center') }), h('th', { text: 'History', style: thS('center') })])]));
    const tbody = h('tbody');
    for (const t of flaky.tests) {
      tbody.append(h('tr', {}, [
        h('td', { text: t.test_id.replace('::__job_level__', ''), style: tdS() }),
        h('td', { text: pct(t.pass_rate), style: { ...tdO('center'), color: C.yellow, fontWeight: '600' } }),
        h('td', { style: tdS('center') }, [historyDots(t.history)]),
      ]));
    }
    table.append(tbody);
    box.append(table);
  }

  function renderOffenders(box, trends) {
    if (!trends?.top_offenders?.length) return;
    const all = trends.top_offenders;
    const initial = 10;
    box.append(h('h3', { text: `Top Offenders (${all.length} consistently failing)`, style: { marginBottom: '8px' } }));
    const table = h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '20px' } });
    table.append(h('thead', {}, [h('tr', {}, [h('th', { text: 'Test', style: thS() }), h('th', { text: 'Streak', style: thS('center') }), h('th', { text: 'History', style: thS('center') })])]));
    const tbody = h('tbody');
    for (let i = 0; i < all.length; i++) {
      const t = all[i];
      const tr = h('tr', { style: i >= initial ? { display: 'none' } : {} }, [
        h('td', { text: t.test_id.replace('::__unidentified_failures__', ' (failures)').replace('::__job_level__', ''), style: tdS() }),
        h('td', { text: `${t.failure_streak}`, style: { ...tdO('center'), color: C.red } }),
        h('td', { style: tdS('center') }, [historyDots(t.history)]),
      ]);
      tr.dataset.idx = i;
      tbody.append(tr);
    }
    table.append(tbody);
    box.append(table);
    if (all.length > initial) {
      const btn = h('button', { text: `Show all ${all.length}`, style: { background: C.border, border: 'none', color: C.text, padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', marginBottom: '20px' } });
      btn.addEventListener('click', () => { tbody.querySelectorAll('tr').forEach(r => r.style.display = ''); btn.remove(); });
      box.append(btn);
    }
  }

  // ===================== CONFIG PARITY =====================

  function renderConfigParity(box, cp) {
    if (!cp?.matches) return;
    const s = cp.summary;
    box.append(h('h3', { text: `Config Parity: YAML Command Similarity`, style: { marginBottom: '8px' } }));
    box.append(h('p', { html: `<strong>${s.matched}</strong> matched &bull; <strong>${s.avg_command_similarity_pct}%</strong> avg similarity &bull; ${s.amd_only} AMD-only &bull; ${s.nvidia_only} NVIDIA-only`, style: { fontSize: '12px', color: C.muted, marginBottom: '8px' } }));

    // Only show divergent matches (< 100%)
    const divergent = cp.matches.filter(m => m.command_similarity < 1.0);
    if (!divergent.length) { box.append(h('p', { text: 'All matched steps have identical commands.', style: { color: C.green, fontSize: '12px', marginBottom: '20px' } })); return; }

    const details = h('details', { style: { marginBottom: '20px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '6px' } });
    details.append(h('summary', { text: `${divergent.length} steps with command differences`, style: { padding: '8px 12px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' } }));
    const table = h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' } });
    table.append(h('thead', {}, [h('tr', {}, [h('th', { text: 'Step', style: thS() }), h('th', { text: 'Similarity', style: thS('center') })])]));
    const tbody = h('tbody');
    for (const m of divergent) {
      const sc = { green: C.green, yellow: C.yellow, orange: C.orange, red: C.red }[m.color] || C.muted;
      tbody.append(h('tr', {}, [
        h('td', { text: m.normalized, style: tdS() }),
        h('td', { html: `<span style="color:${sc};font-weight:600">${(m.command_similarity * 100).toFixed(0)}%</span>`, style: tdS('center') }),
      ]));
    }
    table.append(tbody);
    details.append(h('div', { style: { padding: '0 12px 8px' } }, [table]));
    box.append(details);
  }

  // ===================== ENGINEERS + PR SCORES =====================

  function renderEngineers(box, eng) {
    if (!eng?.profiles?.length) return;
    box.append(h('h3', { text: `Engineer Activity (${eng.total_engineers} contributors)`, style: { marginBottom: '8px' } }));
    const table = h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '20px' } });
    table.append(h('thead', {}, [h('tr', {}, [
      h('th', { text: 'Engineer', style: thS() }), h('th', { text: 'Score', style: thS('center') }),
      h('th', { text: 'Avg', style: thS('center') }), h('th', { text: 'PRs', style: thS('center') }),
      h('th', { text: 'Merged', style: thS('center') }), h('th', { text: 'Areas', style: thS() }),
    ])]));
    const tbody = h('tbody');
    const catColors = { kernel: C.red, model: C.purple, engine: C.blue, test: C.yellow, ci: C.orange, api: C.green, docs: C.muted, config: C.muted };
    for (const p of eng.profiles.slice(0, 15)) {
      const tags = (p.categories_touched || []).slice(0, 4).map(c =>
        `<span style="background:${catColors[c]||C.border};color:#fff;padding:1px 5px;border-radius:3px;font-size:10px;margin-right:2px">${c}</span>`
      ).join('');
      tbody.append(h('tr', {}, [
        h('td', { html: `<a href="https://github.com/${p.author}" target="_blank">${p.author}</a>`, style: tdS() }),
        h('td', { text: p.activity_score.toFixed(1), style: { ...tdO('center'), color: p.activity_score >= 30 ? C.green : C.yellow, fontWeight: '600' } }),
        h('td', { text: p.avg_importance.toFixed(1), style: tdS('center') }),
        h('td', { text: String(p.total_prs), style: tdS('center') }),
        h('td', { text: String(p.merged), style: { ...tdO('center'), color: p.merged > 0 ? C.green : C.muted } }),
        h('td', { html: tags, style: tdS() }),
      ]));
    }
    table.append(tbody);
    box.append(table);
  }

  function renderPRScores(box, prs) {
    if (!prs?.prs?.length) return;
    const dist = prs.score_distribution;
    box.append(h('h3', { text: `PR Importance (${prs.total_prs_scored} scored)`, style: { marginBottom: '8px' } }));
    const distBar = h('div', { style: { display: 'flex', gap: '8px', marginBottom: '10px', fontSize: '11px', flexWrap: 'wrap' } });
    const distC = { major: C.green, significant: C.blue, moderate: C.yellow, minor: C.muted, trivial: '#484f58' };
    for (const [cat, n] of Object.entries(dist)) { if (n) distBar.append(h('span', {}, [statusDot(distC[cat]), `${cat}: ${n}`])); }
    box.append(distBar);

    const details = h('details', { style: { marginBottom: '20px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '6px' } });
    details.append(h('summary', { text: `Top ${Math.min(15, prs.prs.length)} PRs by importance`, style: { padding: '8px 12px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' } }));
    const table = h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' } });
    table.append(h('thead', {}, [h('tr', {}, [h('th', { text: 'PR', style: thS() }), h('th', { text: 'Score', style: thS('center') }), h('th', { text: 'Author', style: thS() })])]));
    const tbody = h('tbody');
    for (const p of prs.prs.slice(0, 15)) {
      const imp = p.importance;
      const cc = distC[imp.category] || C.muted;
      tbody.append(h('tr', {}, [
        h('td', { html: `<a href="https://github.com/vllm-project/vllm/pull/${p.number}" target="_blank">#${p.number}</a> ${p.title.slice(0, 55)}${p.title.length > 55 ? '...' : ''}`, style: tdS() }),
        h('td', { html: `<span style="color:${cc};font-weight:600">${imp.score}</span>`, style: tdS('center') }),
        h('td', { html: `<a href="https://github.com/${p.author}" target="_blank" style="color:${C.muted}">${p.author}</a>${p.merged ? ' <span style="color:#238636">merged</span>' : ''}`, style: tdS() }),
      ]));
    }
    table.append(tbody);
    details.append(h('div', { style: { padding: '0 12px 8px' } }, [table]));
    box.append(details);
  }

  // ===================== STYLE HELPERS =====================

  function thS(a) { return { textAlign: a || 'left', padding: '6px 10px', borderBottom: `2px solid ${C.border}`, color: C.muted, fontSize: '10px', textTransform: 'uppercase', fontWeight: '600' }; }
  function tdS(a) { return { textAlign: a || 'left', padding: '5px 10px', borderBottom: `1px solid ${C.border}`, color: C.text }; }
  function tdO(a) { return { textAlign: a || 'left', padding: '5px 10px', borderBottom: `1px solid ${C.border}` }; }

  // ===================== MAIN =====================

  async function renderCIHealth() {
    const box = document.getElementById('ci-health-view');
    if (!box) return;
    box.innerHTML = '<p style="color:#8b949e">Loading...</p>';

    const [health, parity, cp, flaky, trends, eng, prs] = await Promise.all([
      fetchJ(`${CI_BASE}/ci_health.json`), fetchJ(`${CI_BASE}/parity_report.json`),
      fetchJ(`${CI_BASE}/config_parity.json`), fetchJ(`${CI_BASE}/flaky_tests.json`),
      fetchJ(`${CI_BASE}/failure_trends.json`),
      fetchJ(`${VLLM_BASE}/engineer_activity.json`), fetchJ(`${VLLM_BASE}/pr_scores.json`),
    ]);

    if (!health && !parity && !eng) { box.innerHTML = '<p style="color:#8b949e">No data. Run collect_ci.py first.</p>'; return; }
    box.innerHTML = '';

    if (health?.generated_at) box.append(h('p', { text: `Last updated: ${new Date(health.generated_at).toLocaleString()}`, style: { color: C.muted, fontSize: '11px', marginBottom: '12px' } }));

    renderOverview(box, health, parity, cp);
    renderHealthBar(box, health);
    renderTrend(box, health);
    renderHeatmap(box, parity);
    renderGroupedParity(box, parity);
    renderFlaky(box, flaky);
    renderOffenders(box, trends);
    renderConfigParity(box, cp);
    renderEngineers(box, eng);
    renderPRScores(box, prs);
  }

  // Lazy load on tab activation
  const obs = new MutationObserver(() => {
    const p = document.getElementById('tab-ci-health');
    if (p?.classList.contains('active') && !p.dataset.loaded) { p.dataset.loaded = '1'; renderCIHealth(); }
  });
  document.addEventListener('DOMContentLoaded', () => {
    const p = document.getElementById('tab-ci-health');
    if (p) obs.observe(p, { attributes: true, attributeFilter: ['class'] });
  });
})();
