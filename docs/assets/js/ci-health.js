/**
 * CI Health dashboard — vLLM Buildkite test analysis visualization.
 *
 * Reads JSON data from data/vllm/ci/ and renders:
 * - Overview cards (pass rate, test counts, health labels)
 * - Pass rate trend chart (Chart.js)
 * - Job group parity table (AMD vs upstream)
 * - Config parity table (YAML command similarity)
 * - Flaky tests list
 * - Top offenders list
 */

(function () {
  const DATA_BASE = 'data/vllm/ci';

  // Color palette matching the dark theme
  const COLORS = {
    green: '#238636',
    yellow: '#d29922',
    orange: '#db6d28',
    red: '#da3633',
    blue: '#1f6feb',
    purple: '#8957e5',
    muted: '#8b949e',
    text: '#e6edf3',
    bg: '#161b22',
    border: '#30363d',
  };

  const LABEL_COLORS = {
    passing: COLORS.green,
    failing: COLORS.red,
    new_failure: '#f85149',
    fixed: '#3fb950',
    flaky: COLORS.yellow,
    skipped: COLORS.muted,
    new_test: COLORS.blue,
    quarantined: COLORS.purple,
    allowlisted: COLORS.purple,
  };

  async function fetchJSON(path) {
    try {
      const resp = await fetch(`${DATA_BASE}/${path}`);
      if (!resp.ok) return null;
      return resp.json();
    } catch { return null; }
  }

  function pct(val, digits = 1) {
    return (val * 100).toFixed(digits) + '%';
  }

  function el(tag, attrs = {}, children = []) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'style' && typeof v === 'object') {
        Object.assign(e.style, v);
      } else if (k === 'className') {
        e.className = v;
      } else if (k === 'innerHTML') {
        e.innerHTML = v;
      } else if (k === 'textContent') {
        e.textContent = v;
      } else {
        e.setAttribute(k, v);
      }
    }
    for (const c of children) {
      if (typeof c === 'string') e.appendChild(document.createTextNode(c));
      else if (c) e.appendChild(c);
    }
    return e;
  }

  // --- Overview cards ---

  function renderOverview(container, health, parity, configParity) {
    const h = el('h2', { textContent: 'vLLM CI Health Overview' });
    container.appendChild(h);

    const grid = el('div', { style: {
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '12px', marginBottom: '24px'
    }});

    function card(title, value, subtitle, color) {
      return el('div', {
        style: {
          background: COLORS.bg, border: `1px solid ${COLORS.border}`,
          borderRadius: '8px', padding: '16px', borderLeft: `3px solid ${color || COLORS.blue}`
        }
      }, [
        el('div', { textContent: title, style: { color: COLORS.muted, fontSize: '12px', marginBottom: '4px', textTransform: 'uppercase' } }),
        el('div', { textContent: value, style: { fontSize: '24px', fontWeight: '600', color: color || COLORS.text } }),
        subtitle ? el('div', { textContent: subtitle, style: { color: COLORS.muted, fontSize: '12px', marginTop: '4px' } }) : null,
      ]);
    }

    if (health) {
      const amd = health.amd?.latest_build;
      const up = health.upstream?.latest_build;
      if (amd) {
        grid.appendChild(card('AMD Pass Rate', pct(amd.pass_rate), `Build #${amd.build_number} — ${amd.total_tests} tests`, amd.pass_rate >= 0.9 ? COLORS.green : amd.pass_rate >= 0.8 ? COLORS.yellow : COLORS.red));
        grid.appendChild(card('AMD Failures', `${amd.failed}`, `${amd.errors || 0} errors, ${amd.skipped} skipped`, amd.failed > 0 ? COLORS.red : COLORS.green));
      }
      if (up) {
        grid.appendChild(card('Upstream Pass Rate', pct(up.pass_rate), `Build #${up.build_number} — ${up.total_tests} tests`, up.pass_rate >= 0.9 ? COLORS.green : up.pass_rate >= 0.8 ? COLORS.yellow : COLORS.red));
      }
      if (health.test_counts) {
        const tc = health.test_counts;
        grid.appendChild(card('Flaky Tests', `${tc.flaky || 0}`, `${tc.failing || 0} failing, ${tc.new_failure || 0} new`, (tc.flaky || 0) > 0 ? COLORS.yellow : COLORS.green));
      }
    }

    if (parity?.job_groups) {
      const groups = parity.job_groups;
      const both = groups.filter(g => g.amd && g.upstream);
      const passing = both.filter(g => (g.amd.failed || 0) === 0);
      const rate = both.length > 0 ? passing.length / both.length : 0;
      grid.appendChild(card('Job Group Parity', pct(rate), `${passing.length}/${both.length} groups pass on AMD`, rate >= 0.9 ? COLORS.green : rate >= 0.8 ? COLORS.yellow : COLORS.red));
    }

    if (configParity?.summary) {
      const s = configParity.summary;
      grid.appendChild(card('Config Match Rate', `${s.match_rate_pct}%`, `${s.matched} matched, ${s.avg_command_similarity_pct}% avg similarity`, s.match_rate_pct >= 80 ? COLORS.green : s.match_rate_pct >= 60 ? COLORS.yellow : COLORS.red));
    }

    container.appendChild(grid);
  }

  // --- Health label distribution ---

  function renderHealthLabels(container, health) {
    if (!health?.test_counts) return;
    const tc = health.test_counts;

    const h = el('h3', { textContent: 'Test Health Distribution', style: { marginBottom: '12px' } });
    container.appendChild(h);

    const bar = el('div', { style: {
      display: 'flex', height: '24px', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px'
    }});

    const total = Object.values(tc).reduce((a, b) => a + b, 0);
    const order = ['passing', 'new_test', 'skipped', 'flaky', 'failing', 'new_failure', 'fixed', 'quarantined', 'allowlisted'];
    for (const label of order) {
      const count = tc[label] || 0;
      if (count === 0) continue;
      const w = (count / total * 100).toFixed(1);
      bar.appendChild(el('div', {
        title: `${label}: ${count}`,
        style: { width: `${w}%`, background: LABEL_COLORS[label] || COLORS.muted, minWidth: '2px' }
      }));
    }
    container.appendChild(bar);

    const legend = el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '24px', fontSize: '12px' } });
    for (const label of order) {
      const count = tc[label] || 0;
      if (count === 0) continue;
      legend.appendChild(el('span', {}, [
        el('span', { style: { display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: LABEL_COLORS[label] || COLORS.muted, marginRight: '4px' } }),
        `${label} (${count})`
      ]));
    }
    container.appendChild(legend);
  }

  // --- Pass rate trend chart ---

  function renderTrendChart(container, health) {
    if (!health?.amd?.builds || health.amd.builds.length < 2) return;

    const h = el('h3', { textContent: 'Pass Rate Trend (7 days)', style: { marginBottom: '12px' } });
    container.appendChild(h);

    const canvas = el('canvas', { style: { maxHeight: '250px', marginBottom: '24px' } });
    container.appendChild(canvas);

    const amdBuilds = [...health.amd.builds].reverse();
    const upBuilds = health.upstream?.builds ? [...health.upstream.builds].reverse() : [];

    new Chart(canvas, {
      type: 'line',
      data: {
        labels: amdBuilds.map(b => b.created_at?.slice(5, 10) || ''),
        datasets: [
          {
            label: 'AMD',
            data: amdBuilds.map(b => (b.pass_rate * 100).toFixed(1)),
            borderColor: '#da3633',
            backgroundColor: 'rgba(218, 54, 51, 0.1)',
            tension: 0.3, fill: true, pointRadius: 4,
          },
          ...(upBuilds.length > 0 ? [{
            label: 'Upstream',
            data: upBuilds.map(b => (b.pass_rate * 100).toFixed(1)),
            borderColor: '#1f6feb',
            backgroundColor: 'rgba(31, 111, 235, 0.1)',
            tension: 0.3, fill: true, pointRadius: 4,
          }] : []),
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: COLORS.text } } },
        scales: {
          y: { min: 60, max: 100, ticks: { color: COLORS.muted, callback: v => v + '%' }, grid: { color: COLORS.border } },
          x: { ticks: { color: COLORS.muted }, grid: { color: COLORS.border } },
        },
      },
    });
  }

  // --- Job group parity table ---

  function renderJobGroupParity(container, parity) {
    if (!parity?.job_groups) return;
    const groups = parity.job_groups.filter(g => g.amd && g.upstream);
    if (groups.length === 0) return;

    const h = el('h3', { textContent: `Runtime Parity: AMD vs Upstream (${groups.length} matched groups)`, style: { marginBottom: '12px' } });
    container.appendChild(h);

    // Sort: failures first, then by name
    groups.sort((a, b) => {
      const af = (a.amd?.failed || 0) + (a.upstream?.failed || 0);
      const bf = (b.amd?.failed || 0) + (b.upstream?.failed || 0);
      if (bf !== af) return bf - af;
      return a.name.localeCompare(b.name);
    });

    const table = el('table', { style: {
      width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '24px'
    }});

    const thead = el('thead');
    thead.appendChild(el('tr', {}, [
      el('th', { textContent: 'Test Group', style: thStyle() }),
      el('th', { innerHTML: 'AMD<br>Pass/Fail/Skip', style: thStyle('center') }),
      el('th', { innerHTML: 'Upstream<br>Pass/Fail/Skip', style: thStyle('center') }),
      el('th', { textContent: 'Status', style: thStyle('center') }),
    ]));
    table.appendChild(thead);

    const tbody = el('tbody');
    for (const g of groups) {
      const a = g.amd, u = g.upstream;
      const amdFail = (a.failed || 0) + (a.error || 0);
      const upFail = (u.failed || 0) + (u.error || 0);
      let status, statusColor;
      if (amdFail === 0 && upFail === 0) { status = 'Both pass'; statusColor = COLORS.green; }
      else if (amdFail > 0 && upFail === 0) { status = 'AMD regression'; statusColor = COLORS.red; }
      else if (amdFail === 0 && upFail > 0) { status = 'AMD advantage'; statusColor = COLORS.blue; }
      else { status = 'Both fail'; statusColor = COLORS.orange; }

      tbody.appendChild(el('tr', {}, [
        el('td', { textContent: g.name, style: tdStyle() }),
        el('td', {
          innerHTML: `<span style="color:${COLORS.green}">${a.passed||0}</span> / <span style="color:${COLORS.red}">${amdFail}</span> / <span style="color:${COLORS.muted}">${a.skipped||0}</span>`,
          style: tdStyle('center')
        }),
        el('td', {
          innerHTML: `<span style="color:${COLORS.green}">${u.passed||0}</span> / <span style="color:${COLORS.red}">${upFail}</span> / <span style="color:${COLORS.muted}">${u.skipped||0}</span>`,
          style: tdStyle('center')
        }),
        el('td', {
          innerHTML: `<span style="color:${statusColor};font-weight:600">${status}</span>`,
          style: tdStyle('center')
        }),
      ]));
    }
    table.appendChild(tbody);
    container.appendChild(table);
  }

  // --- Config parity table ---

  function renderConfigParity(container, configParity) {
    if (!configParity?.matches) return;

    const s = configParity.summary;
    const h = el('h3', {
      textContent: `Config Parity: YAML Command Similarity (${s.matched} matched, ${s.avg_command_similarity_pct}% avg)`,
      style: { marginBottom: '12px' }
    });
    container.appendChild(h);

    const table = el('table', { style: {
      width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '24px'
    }});

    const thead = el('thead');
    thead.appendChild(el('tr', {}, [
      el('th', { textContent: 'Test Step', style: thStyle() }),
      el('th', { textContent: 'Similarity', style: thStyle('center') }),
    ]));
    table.appendChild(thead);

    const tbody = el('tbody');
    for (const m of configParity.matches) {
      const simPct = (m.command_similarity * 100).toFixed(0);
      const c = simColor(m.color);
      tbody.appendChild(el('tr', {}, [
        el('td', { textContent: m.normalized, style: tdStyle() }),
        el('td', {
          innerHTML: `<span style="color:${c};font-weight:600">${simPct}%</span>`,
          style: tdStyle('center')
        }),
      ]));
    }
    table.appendChild(tbody);
    container.appendChild(table);

    // AMD-only and NVIDIA-only lists
    if (configParity.amd_only.length > 0) {
      container.appendChild(el('h4', { textContent: `AMD-Only Steps (${configParity.amd_only.length})`, style: { marginBottom: '8px', color: COLORS.red } }));
      const ul = el('ul', { style: { marginBottom: '16px', paddingLeft: '20px', fontSize: '13px' } });
      for (const s of configParity.amd_only) ul.appendChild(el('li', { textContent: s.label, style: { color: COLORS.muted } }));
      container.appendChild(ul);
    }
    if (configParity.nvidia_only.length > 0) {
      container.appendChild(el('h4', { textContent: `NVIDIA-Only Steps (${configParity.nvidia_only.length})`, style: { marginBottom: '8px', color: COLORS.blue } }));
      const ul = el('ul', { style: { marginBottom: '16px', paddingLeft: '20px', fontSize: '13px' } });
      for (const s of configParity.nvidia_only) ul.appendChild(el('li', { textContent: s.label, style: { color: COLORS.muted } }));
      container.appendChild(ul);
    }
  }

  // --- Flaky tests ---

  function renderFlakyTests(container, flaky) {
    if (!flaky?.tests?.length) return;

    const h = el('h3', { textContent: `Flaky Tests (${flaky.total_flaky})`, style: { marginBottom: '12px' } });
    container.appendChild(h);

    const table = el('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '24px' } });
    const thead = el('thead');
    thead.appendChild(el('tr', {}, [
      el('th', { textContent: 'Test', style: thStyle() }),
      el('th', { textContent: 'Pass Rate', style: thStyle('center') }),
      el('th', { textContent: 'History', style: thStyle('center') }),
    ]));
    table.appendChild(thead);

    const tbody = el('tbody');
    for (const t of flaky.tests) {
      const history = el('span', { style: { fontFamily: 'monospace', letterSpacing: '2px' } });
      for (const h of t.history) {
        const c = h === 'P' ? COLORS.green : h === 'F' ? COLORS.red : COLORS.muted;
        history.appendChild(el('span', { textContent: h, style: { color: c, fontWeight: '600' } }));
      }
      tbody.appendChild(el('tr', {}, [
        el('td', { textContent: t.test_id.replace('::__job_level__', ''), style: tdStyle() }),
        el('td', { textContent: pct(t.pass_rate), style: { ...tdStyleObj('center'), color: COLORS.yellow, fontWeight: '600' } }),
        el('td', { style: tdStyle('center') }, [history]),
      ]));
    }
    table.appendChild(tbody);
    container.appendChild(table);
  }

  // --- Top offenders ---

  function renderTopOffenders(container, trends) {
    if (!trends?.top_offenders?.length) return;

    const h = el('h3', { textContent: `Top Offenders (${trends.top_offenders.length} consistently failing)`, style: { marginBottom: '12px' } });
    container.appendChild(h);

    const table = el('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '24px' } });
    const thead = el('thead');
    thead.appendChild(el('tr', {}, [
      el('th', { textContent: 'Test', style: thStyle() }),
      el('th', { textContent: 'Streak', style: thStyle('center') }),
      el('th', { textContent: 'History', style: thStyle('center') }),
    ]));
    table.appendChild(thead);

    const tbody = el('tbody');
    for (const t of trends.top_offenders.slice(0, 15)) {
      const history = el('span', { style: { fontFamily: 'monospace', letterSpacing: '2px' } });
      for (const h of t.history) {
        const c = h === 'P' ? COLORS.green : h === 'F' ? COLORS.red : COLORS.muted;
        history.appendChild(el('span', { textContent: h, style: { color: c, fontWeight: '600' } }));
      }
      tbody.appendChild(el('tr', {}, [
        el('td', { textContent: t.test_id.replace('::__unidentified_failures__', ' (failures)').replace('::__job_level__', ''), style: tdStyle() }),
        el('td', { textContent: `${t.failure_streak} builds`, style: { ...tdStyleObj('center'), color: COLORS.red } }),
        el('td', { style: tdStyle('center') }, [history]),
      ]));
    }
    table.appendChild(tbody);
    container.appendChild(table);
  }

  // --- Style helpers ---

  function thStyle(align) {
    return {
      textAlign: align || 'left', padding: '8px 12px', borderBottom: `2px solid ${COLORS.border}`,
      color: COLORS.muted, fontSize: '11px', textTransform: 'uppercase', fontWeight: '600',
    };
  }

  function tdStyle(align) {
    return {
      textAlign: align || 'left', padding: '6px 12px',
      borderBottom: `1px solid ${COLORS.border}`, color: COLORS.text,
    };
  }

  function tdStyleObj(align) {
    return { textAlign: align || 'left', padding: '6px 12px', borderBottom: `1px solid ${COLORS.border}` };
  }

  function simColor(name) {
    return { green: COLORS.green, yellow: COLORS.yellow, orange: COLORS.orange, red: COLORS.red }[name] || COLORS.muted;
  }

  // --- Main render ---

  async function renderCIHealth() {
    const container = document.getElementById('ci-health-view');
    if (!container) return;

    container.innerHTML = '<p style="color:#8b949e">Loading CI health data...</p>';

    const [health, parity, configParity, flaky, trends] = await Promise.all([
      fetchJSON('ci_health.json'),
      fetchJSON('parity_report.json'),
      fetchJSON('config_parity.json'),
      fetchJSON('flaky_tests.json'),
      fetchJSON('failure_trends.json'),
    ]);

    if (!health && !parity) {
      container.innerHTML = '<p style="color:#8b949e">No CI health data available. Run <code>collect_ci.py</code> to generate data.</p>';
      return;
    }

    container.innerHTML = '';

    if (health?.generated_at) {
      container.appendChild(el('p', {
        textContent: `Last updated: ${new Date(health.generated_at).toLocaleString()}`,
        style: { color: COLORS.muted, fontSize: '12px', marginBottom: '16px' },
      }));
    }

    renderOverview(container, health, parity, configParity);
    renderHealthLabels(container, health);
    renderTrendChart(container, health);
    renderJobGroupParity(container, parity);
    renderFlakyTests(container, flaky);
    renderTopOffenders(container, trends);
    renderConfigParity(container, configParity);
  }

  // Auto-render when CI Health tab is shown
  const observer = new MutationObserver(() => {
    const panel = document.getElementById('tab-ci-health');
    if (panel?.classList.contains('active') && !panel.dataset.loaded) {
      panel.dataset.loaded = '1';
      renderCIHealth();
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    const panel = document.getElementById('tab-ci-health');
    if (panel) observer.observe(panel, { attributes: true, attributeFilter: ['class'] });
  });
})();
