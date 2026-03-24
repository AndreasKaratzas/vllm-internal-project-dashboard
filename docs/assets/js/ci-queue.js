/**
 * CI Queue Monitor — Interactive time-series chart with queue selectors.
 * Loads queue_timeseries.jsonl, renders Chart.js line chart with toggleable queues.
 */
(function() {
  const C = {g:'#238636',y:'#d29922',o:'#db6d28',r:'#da3633',b:'#1f6feb',p:'#8957e5',m:'#8b949e',t:'#e6edf3',bg:'#161b22',bg2:'#0d1117',bd:'#30363d'};

  // Queue color function — AMD red gradient, NVIDIA blue gradient, CPU green, other purple
  const AMD_GRADIENT = ['#ff6b6b','#ee5a5a','#da3633','#c92a2a','#b71c1c','#a51515','#8b0000','#ff8a80','#ef5350','#e53935','#d32f2f','#c62828'];
  const NV_GRADIENT = ['#64b5f6','#42a5f5','#2196f3','#1e88e5','#1976d2','#1565c0','#0d47a1','#82b1ff','#448aff','#2979ff','#2962ff','#1a237e'];
  const CPU_GRADIENT = ['#66bb6a','#4caf50','#43a047','#388e3c','#2e7d32','#1b5e20'];
  const OTHER_COLORS = ['#ab47bc','#9c27b0','#8e24aa','#7b1fa2','#6a1b9a','#4a148c','#ce93d8','#ba68c8'];

  let amdIdx=0, nvIdx=0, cpuIdx=0, otherIdx=0;
  function queueColor(queueName) {
    if (queueName.startsWith('amd_') || queueName.startsWith('amd-')) return AMD_GRADIENT[(amdIdx++) % AMD_GRADIENT.length];
    if (['gpu_1_queue','gpu_4_queue','B200','H200','a100_queue','mithril-h100-pool','nebius-h200','perf-B200','perf-h200'].includes(queueName)) return NV_GRADIENT[(nvIdx++) % NV_GRADIENT.length];
    if (queueName.includes('cpu') || queueName.includes('arm')) return CPU_GRADIENT[(cpuIdx++) % CPU_GRADIENT.length];
    return OTHER_COLORS[(otherIdx++) % OTHER_COLORS.length];
  }

  // Queue grouping
  const Q_GROUPS = {
    'AMD MI250': q => q.startsWith('amd_mi250'),
    'AMD MI325': q => q.startsWith('amd_mi325'),
    'AMD MI355': q => q.startsWith('amd_mi355'),
    'NVIDIA GPU': q => ['gpu_1_queue','gpu_4_queue','B200','H200','a100_queue','mithril-h100-pool'].includes(q),
    'CPU': q => q.includes('cpu'),
    'Other': q => true,
  };

  const INTERVALS = [
    {label:'1h',hours:1},{label:'3h',hours:3},{label:'6h',hours:6},
    {label:'12h',hours:12},{label:'24h',hours:24},{label:'2d',hours:48},
    {label:'3d',hours:72},{label:'5d',hours:120},{label:'7d',hours:168},
    {label:'14d',hours:336},{label:'1m',hours:720},{label:'3m',hours:2160},
  ];

  function h(t,p={},k=[]) {
    const e=document.createElement(t);
    if(p.cls){e.className=p.cls;delete p.cls}
    if(p.html){e.innerHTML=p.html;delete p.html}
    if(p.text){e.textContent=p.text;delete p.text}
    if(p.style){Object.assign(e.style,p.style);delete p.style}
    for(const[a,v]of Object.entries(p))e.setAttribute(a,v);
    for(const c of k){if(typeof c==='string')e.append(c);else if(c)e.append(c)}
    return e
  }

  async function loadTimeseries() {
    try {
      const resp = await fetch('data/vllm/ci/queue_timeseries.jsonl');
      if (!resp.ok) return [];
      const text = await resp.text();
      return text.trim().split('\n').filter(l=>l).map(l=>JSON.parse(l)).filter(s=>s.ts && s.queues && typeof s.queues === 'object');
    } catch { return []; }
  }

  async function render() {
    const container = document.getElementById('ci-queue-view');
    if (!container) return;
    container.innerHTML = '<p style="color:#8b949e">Loading queue data...</p>';

    const snapshots = await loadTimeseries();
    if (!snapshots.length) {
      container.innerHTML = '<p style="color:#8b949e">No queue data yet. The hourly monitor will start collecting data automatically.</p>';
      return;
    }
    container.innerHTML = '';

    // Extract all queue names
    const allQueues = new Set();
    for (const snap of snapshots) {
      for (const q of Object.keys(snap.queues || {})) allQueues.add(q);
    }
    const queueList = [...allQueues].sort();

    // State
    let selectedQueues = new Set(queueList.filter(q =>
      q.startsWith('amd_') || ['gpu_1_queue','gpu_4_queue','B200','mithril-h100-pool'].includes(q)
    ));
    let intervalHours = 168; // default 7 days
    let metric = 'waiting'; // or 'running'
    let chart = null;

    // Title (project selector removed — handled by sidebar)
    container.append(h('h2',{text:'Queue Monitor',style:{marginBottom:'16px'}}));

    renderQueueContent(container, snapshots);
  }

  function renderQueueContent(container, snapshots) {
    const allQueues = new Set();
    for (const snap of snapshots) {
      for (const q of Object.keys(snap.queues || {})) allQueues.add(q);
    }
    const queueList = [...allQueues].sort();

    // Pre-compute colors per queue (reset gradient indices)
    amdIdx=0; nvIdx=0; cpuIdx=0; otherIdx=0;
    const qColorMap = {};
    for (const q of queueList) qColorMap[q] = queueColor(q);

    let selectedQueues = new Set(queueList.filter(q =>
      q.startsWith('amd_') || ['gpu_1_queue','gpu_4_queue','B200','mithril-h100-pool'].includes(q)
    ));
    let intervalHours = 168;
    let metric = 'waiting';
    let chart = null;

    // Current snapshot summary
    const latest = snapshots[snapshots.length - 1];
    const summaryRow = h('div',{style:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'20px'}});
    summaryRow.append(makeCard('Total Waiting', latest.total_waiting, '', C.r));
    summaryRow.append(makeCard('Total Running', latest.total_running, '', C.g));
    summaryRow.append(makeCard('Queues Active', Object.keys(latest.queues||{}).length, '', C.b));
    summaryRow.append(makeCard('Snapshots', snapshots.length, `Since ${snapshots[0]?.ts?.slice(0,16)||'?'}`, C.m));
    container.append(summaryRow);

    // Controls: interval selector + metric toggle
    const controlsRow = h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px',flexWrap:'wrap',gap:'8px'}});

    // Helper: count how many snapshots fall within an interval (relative to last snapshot)
    function snapshotsInInterval(hours) {
      const lastTs = new Date(snapshots[snapshots.length - 1].ts).getTime();
      const cutoff = new Date(lastTs - hours * 3600000);
      return snapshots.filter(s => new Date(s.ts) >= cutoff).length;
    }

    // Auto-select best default interval: largest interval with >= 2 snapshots
    intervalHours = INTERVALS.filter(iv => snapshotsInInterval(iv.hours) >= 2).pop()?.hours || INTERVALS[0].hours;

    // Interval selector
    const intervalBar = h('div',{style:{display:'flex',gap:'2px',flexWrap:'wrap'}});
    intervalBar.append(h('span',{text:'Interval:',style:{color:C.m,fontSize:'14px',marginRight:'4px',alignSelf:'center'}}));
    for (const iv of INTERVALS) {
      const hasData = snapshotsInInterval(iv.hours) >= 2;
      const btn = h('button',{text:iv.label,style:{
        background:iv.hours===intervalHours?C.b:C.bd, border:'none', color:hasData?C.t:C.m+'66',
        padding:'4px 10px', borderRadius:'3px', cursor:hasData?'pointer':'not-allowed',
        fontSize:'13px', fontFamily:'inherit', opacity:hasData?'1':'0.4'
      }});
      if (hasData) {
        btn.onclick = () => {
          intervalHours = iv.hours;
          intervalBar.querySelectorAll('button').forEach(b=>{if(b.style.opacity!=='0.4')b.style.background=C.bd});
          btn.style.background = C.b;
          updateChart();
        };
      }
      intervalBar.append(btn);
    }
    controlsRow.append(intervalBar);

    // Metric toggle
    const metricBar = h('div',{style:{display:'flex',gap:'2px'}});
    const waitBtn = h('button',{text:'Waiting',style:{background:C.r,border:'none',color:C.t,padding:'4px 12px',borderRadius:'3px',cursor:'pointer',fontSize:'13px',fontFamily:'inherit',fontWeight:'600'}});
    const runBtn = h('button',{text:'Running',style:{background:C.bd,border:'none',color:C.t,padding:'4px 12px',borderRadius:'3px',cursor:'pointer',fontSize:'13px',fontFamily:'inherit'}});
    waitBtn.onclick = () => { metric='waiting'; waitBtn.style.background=C.r; waitBtn.style.fontWeight='600'; runBtn.style.background=C.bd; runBtn.style.fontWeight='400'; updateChart(); };
    runBtn.onclick = () => { metric='running'; runBtn.style.background=C.g; runBtn.style.fontWeight='600'; waitBtn.style.background=C.bd; waitBtn.style.fontWeight='400'; updateChart(); };
    metricBar.append(waitBtn, runBtn);
    controlsRow.append(metricBar);
    container.append(controlsRow);

    // Data availability info (updated dynamically in updateChart)
    const infoBanner = h('div',{style:{padding:'8px 14px',background:C.b+'15',border:`1px solid ${C.b}33`,borderRadius:'6px',marginBottom:'12px',fontSize:'13px',color:C.t}});
    container.append(infoBanner);

    // Jobs chart
    const chartSection = h('div',{style:{background:C.bg,border:`1px solid ${C.bd}`,borderRadius:'8px',padding:'20px',marginBottom:'12px'}});
    chartSection.append(h('h3',{text:'Jobs Over Time',style:{marginBottom:'8px',fontSize:'15px'}}));
    const canvas = h('canvas',{style:{maxHeight:'300px'}});
    chartSection.append(canvas);
    container.append(chartSection);

    // Wait time chart
    const waitSection = h('div',{style:{background:C.bg,border:`1px solid ${C.bd}`,borderRadius:'8px',padding:'20px',marginBottom:'20px'}});
    waitSection.append(h('h3',{text:'Wait Time (minutes)',style:{marginBottom:'8px',fontSize:'15px'}}));
    const waitCanvas = h('canvas',{style:{maxHeight:'300px'}});
    waitSection.append(waitCanvas);
    container.append(waitSection);
    let waitChart = null;

    // Queue selector — grouped checkboxes
    const queueSection = h('div',{style:{background:C.bg,border:`1px solid ${C.bd}`,borderRadius:'8px',padding:'16px',marginBottom:'20px'}});
    queueSection.append(h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}},[
      h('h3',{text:'Queues',style:{fontSize:'14px'}}),
      h('div',{style:{display:'flex',gap:'6px'}},[
        makeBtn('Select All', () => { queueList.forEach(q=>selectedQueues.add(q)); updateCheckboxes(); updateChart(); }),
        makeBtn('AMD Only', () => { selectedQueues.clear(); queueList.filter(q=>q.startsWith('amd_')).forEach(q=>selectedQueues.add(q)); updateCheckboxes(); updateChart(); }),
        makeBtn('NVIDIA Only', () => { selectedQueues.clear(); ['gpu_1_queue','gpu_4_queue','B200','H200','a100_queue','mithril-h100-pool'].forEach(q=>{if(allQueues.has(q))selectedQueues.add(q)}); updateCheckboxes(); updateChart(); }),
        makeBtn('Clear', () => { selectedQueues.clear(); updateCheckboxes(); updateChart(); }),
      ]),
    ]));

    const checkboxes = {};
    // Group queues
    const grouped = {};
    for (const q of queueList) {
      let grp = 'Other';
      for (const [name, fn] of Object.entries(Q_GROUPS)) {
        if (fn(q)) { grp = name; break; }
      }
      (grouped[grp] = grouped[grp] || []).push(q);
    }

    for (const [group, queues] of Object.entries(grouped)) {
      const row = h('div',{style:{marginBottom:'6px'}});
      row.append(h('div',{text:group,style:{fontSize:'13px',color:C.m,fontWeight:'600',textTransform:'uppercase',marginBottom:'2px'}}));
      const chips = h('div',{style:{display:'flex',flexWrap:'wrap',gap:'4px'}});
      for (const q of queues) {
        const qc = qColorMap[q] || '#8b949e';
        const chip = h('label',{style:{display:'inline-flex',alignItems:'center',gap:'4px',fontSize:'13px',cursor:'pointer',padding:'3px 8px',borderRadius:'3px',border:`1px solid ${C.bd}`,background:selectedQueues.has(q)?qc+'22':'transparent'}});
        const cb = h('input',{type:'checkbox',style:{width:'12px',height:'12px',cursor:'pointer'}});
        cb.checked = selectedQueues.has(q);
        cb.onchange = () => {
          if (cb.checked) selectedQueues.add(q); else selectedQueues.delete(q);
          chip.style.background = cb.checked ? qc+'22' : 'transparent';
          updateChart();
        };
        checkboxes[q] = { cb, chip };
        chip.append(cb, h('span',{style:{width:'8px',height:'8px',borderRadius:'50%',background:qc,display:'inline-block'}}), q);
        chips.append(chip);
      }
      row.append(chips);
      queueSection.append(row);
    }
    container.append(queueSection);

    function updateCheckboxes() {
      for (const [q, { cb, chip }] of Object.entries(checkboxes)) {
        cb.checked = selectedQueues.has(q);
        chip.style.background = selectedQueues.has(q) ? (qColorMap[q]||'#8b949e')+'22' : 'transparent';
      }
    }

    function updateChart() {
      // Use the last snapshot timestamp as the reference point, NOT Date.now().
      // Date.now() drifts away from the data window as time passes, causing
      // intervals shorter than the data span to show zero results.
      const lastSnapshotTs = new Date(snapshots[snapshots.length - 1].ts).getTime();
      const cutoff = new Date(lastSnapshotTs - intervalHours * 3600000);
      let filtered = snapshots.filter(s => new Date(s.ts) >= cutoff);

      // Update info banner to reflect the currently displayed data
      const filteredFirst = filtered.length ? new Date(filtered[0].ts) : lastSnapshotTs;
      const filteredLast = filtered.length ? new Date(filtered[filtered.length - 1].ts) : lastSnapshotTs;
      const filteredSpanMs = filteredLast - filteredFirst;
      const filteredHours = Math.round(filteredSpanMs / 3600000);
      const filteredDurText = filteredSpanMs < 3600000 ? `${Math.max(1, Math.round(filteredSpanMs / 60000))} minutes` :
                              filteredHours < 24 ? `${filteredHours} hours` :
                              `${Math.round(filteredHours / 24)} days`;
      infoBanner.innerHTML = `<strong>${filtered.length}</strong> snapshots over <strong>${filteredDurText}</strong> of data collected. Hourly snapshots are added automatically \u2014 more data = longer intervals available.`;

      const labels = filtered.map(s => {
        const d = new Date(s.ts);
        return intervalHours <= 24
          ? d.toLocaleTimeString('en-US', {hour:'2-digit',minute:'2-digit'})
          : d.toLocaleDateString('en-US', {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
      });

      const datasets = [];
      for (const q of [...selectedQueues].sort()) {
        const qc = qColorMap[q] || '#8b949e';
        datasets.push({
          label: q,
          data: filtered.map(s => (s.queues?.[q]?.[metric]) || 0),
          borderColor: qc,
          backgroundColor: qc + '15',
          tension: 0.3,
          fill: false,
          pointRadius: Math.max(4, Math.min(8, 200 / (filtered.length || 1))),
          pointHoverRadius: 6,
          borderWidth: 2,
        });
      }

      if (chart) chart.destroy();
      chart = new Chart(canvas, {
        type: 'line',
        data: { labels, datasets },
        options: {
          responsive: true,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { labels: { color: C.t, font: {size:12} }, position: 'bottom' },
            tooltip: { mode: 'index' },
          },
          scales: {
            y: { beginAtZero: true, ticks: { color: C.m }, grid: { color: C.bd }, title: { display: true, text: metric === 'waiting' ? 'Jobs Waiting' : 'Jobs Running', color: C.m, font:{size:13} } },
            x: { ticks: { color: C.m, maxRotation: 45 }, grid: { color: C.bd } },
          },
        },
      });

      // Wait time chart: p50 wait time in minutes per queue
      const waitDatasets = [];
      for (const q of [...selectedQueues].sort()) {
        const qc = qColorMap[q] || '#8b949e';
        waitDatasets.push({
          label: q,
          data: filtered.map(s => {
            const qd = s.queues?.[q];
            if (!qd) return null;
            // Use p50_wait if available (new snapshots), fall back to waiting/running ratio estimate
            if (qd.p50_wait != null) return qd.p50_wait;
            // Estimate: no wait time data in old snapshots
            return null;
          }),
          borderColor: qc,
          backgroundColor: qc + '15',
          tension: 0.3,
          fill: false,
          pointRadius: Math.max(4, Math.min(8, 200 / (filtered.length || 1))),
          borderWidth: 2,
          spanGaps: true,
        });
      }

      if (waitChart) waitChart.destroy();
      waitChart = new Chart(waitCanvas, {
        type: 'line',
        data: { labels, datasets: waitDatasets },
        options: {
          responsive: true,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { labels: { color: C.t, font: {size:12} }, position: 'bottom' },
            tooltip: { mode: 'index', callbacks: { label: ctx => ctx.parsed.y != null ? `${ctx.dataset.label}: ${ctx.parsed.y}m` : `${ctx.dataset.label}: no data` } },
          },
          scales: {
            y: { beginAtZero: true, ticks: { color: C.m, callback: v => v + 'm' }, grid: { color: C.bd }, title: { display: true, text: 'p50 Wait Time (minutes)', color: C.m, font:{size:13} } },
            x: { ticks: { color: C.m, maxRotation: 45 }, grid: { color: C.bd } },
          },
        },
      });
    }

    // Defer initial chart render so the browser completes layout after the
    // tab panel switches from display:none → display:block.  Without this,
    // Chart.js reads a zero-width canvas on first load via URL hash.
    requestAnimationFrame(() => updateChart());
  }

  function makeCard(label, value, sub, color) {
    return h('div',{style:{background:C.bg,border:`1px solid ${C.bd}`,borderRadius:'8px',padding:'16px 20px',borderTop:`3px solid ${color}`}},[
      h('div',{text:label,style:{fontSize:'13px',color:C.m,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:'4px'}}),
      h('div',{text:String(value),style:{fontSize:'28px',fontWeight:'800',color,lineHeight:'1.1'}}),
      sub?h('div',{text:sub,style:{fontSize:'14px',color:C.m,marginTop:'4px'}}):null,
    ]);
  }

  function makeBtn(text, onclick) {
    const btn = h('button',{text,style:{background:C.bd,border:'none',color:C.t,padding:'4px 10px',borderRadius:'3px',cursor:'pointer',fontSize:'13px',fontFamily:'inherit'}});
    btn.onclick = onclick;
    return btn;
  }

  // Lazy load
  const obs = new MutationObserver(() => {
    const p = document.getElementById('tab-ci-queue');
    if (p?.classList.contains('active') && !p.dataset.loaded) { p.dataset.loaded = '1'; render(); }
  });
  document.addEventListener('DOMContentLoaded', () => {
    const p = document.getElementById('tab-ci-queue');
    if (p) {
      obs.observe(p, {attributes:true, attributeFilter:['class']});
      // If the tab is already active (e.g. navigated via URL hash), render immediately
      if (p.classList.contains('active') && !p.dataset.loaded) { p.dataset.loaded = '1'; render(); }
    }
  });
})();
