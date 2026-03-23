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
      return text.trim().split('\n').filter(l=>l).map(l=>JSON.parse(l));
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

    // Title + project selector
    container.append(h('h2',{text:'Queue Monitor',style:{marginBottom:'4px'}}));

    // Project selector bar
    const allProjects = ['vllm','pytorch','jax','triton','sglang','xla'];
    const projBar = h('div',{style:{display:'flex',gap:'4px',marginBottom:'16px',borderBottom:`1px solid ${C.bd}`,paddingBottom:'8px'}});
    const contentWrap = h('div');
    for (const p of allProjects) {
      const active = p === 'vllm';
      const btn = h('button',{text:p,style:{background:active?C.b:'transparent',border:'none',color:C.t,padding:'6px 16px',borderRadius:'6px 6px 0 0',cursor:'pointer',fontSize:'13px',fontWeight:active?'700':'400',fontFamily:'inherit',borderBottom:active?`2px solid ${C.b}`:'2px solid transparent'}});
      btn.onclick = () => {
        projBar.querySelectorAll('button').forEach(b=>{b.style.background='transparent';b.style.borderBottomColor='transparent';b.style.fontWeight='400'});
        btn.style.background=C.b;btn.style.borderBottomColor=C.b;btn.style.fontWeight='700';
        if(p!=='vllm'){contentWrap.innerHTML='<div style="text-align:center;padding:60px;color:#8b949e"><h3>'+p+'</h3><p>Queue monitoring not yet configured.</p></div>';}
        else{contentWrap.innerHTML='';renderQueueContent(contentWrap,snapshots);}
      };
      projBar.append(btn);
    }
    container.append(projBar);
    container.append(contentWrap);
    renderQueueContent(contentWrap, snapshots);
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

    // Compute available data span
    const firstTs = new Date(snapshots[0]?.ts || Date.now());
    const lastTs = new Date(snapshots[snapshots.length-1]?.ts || Date.now());
    const availableHours = Math.max(1, Math.round((lastTs - firstTs) / 3600000));

    // Auto-select best default interval
    intervalHours = INTERVALS.filter(iv => iv.hours <= availableHours).pop()?.hours || INTERVALS[0].hours;

    // Interval selector
    const intervalBar = h('div',{style:{display:'flex',gap:'2px',flexWrap:'wrap'}});
    intervalBar.append(h('span',{text:'Interval:',style:{color:C.m,fontSize:'12px',marginRight:'4px',alignSelf:'center'}}));
    for (const iv of INTERVALS) {
      const hasData = iv.hours <= availableHours;
      const btn = h('button',{text:iv.label,style:{
        background:iv.hours===intervalHours?C.b:C.bd, border:'none', color:hasData?C.t:C.m+'66',
        padding:'3px 8px', borderRadius:'3px', cursor:hasData?'pointer':'not-allowed',
        fontSize:'11px', fontFamily:'inherit', opacity:hasData?'1':'0.4'
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
    const waitBtn = h('button',{text:'Waiting',style:{background:C.r,border:'none',color:C.t,padding:'3px 10px',borderRadius:'3px',cursor:'pointer',fontSize:'11px',fontFamily:'inherit',fontWeight:'600'}});
    const runBtn = h('button',{text:'Running',style:{background:C.bd,border:'none',color:C.t,padding:'3px 10px',borderRadius:'3px',cursor:'pointer',fontSize:'11px',fontFamily:'inherit'}});
    waitBtn.onclick = () => { metric='waiting'; waitBtn.style.background=C.r; waitBtn.style.fontWeight='600'; runBtn.style.background=C.bd; runBtn.style.fontWeight='400'; updateChart(); };
    runBtn.onclick = () => { metric='running'; runBtn.style.background=C.g; runBtn.style.fontWeight='600'; waitBtn.style.background=C.bd; waitBtn.style.fontWeight='400'; updateChart(); };
    metricBar.append(waitBtn, runBtn);
    controlsRow.append(metricBar);
    container.append(controlsRow);

    // Data availability info
    const durText = availableHours < 1 ? `${Math.round((lastTs-firstTs)/60000)} minutes` :
                    availableHours < 24 ? `${availableHours} hours` :
                    `${Math.round(availableHours/24)} days`;
    const infoBanner = h('div',{style:{padding:'8px 14px',background:C.b+'15',border:`1px solid ${C.b}33`,borderRadius:'6px',marginBottom:'12px',fontSize:'13px',color:C.t}});
    infoBanner.append(h('span',{html:`<strong>${snapshots.length}</strong> snapshots over <strong>${durText}</strong> of data collected. Hourly snapshots are added automatically — more data = longer intervals available.`}));
    container.append(infoBanner);

    // Chart
    const chartSection = h('div',{style:{background:C.bg,border:`1px solid ${C.bd}`,borderRadius:'8px',padding:'20px',marginBottom:'20px'}});
    const canvas = h('canvas',{style:{maxHeight:'350px'}});
    chartSection.append(canvas);
    container.append(chartSection);

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
      row.append(h('div',{text:group,style:{fontSize:'11px',color:C.m,fontWeight:'600',textTransform:'uppercase',marginBottom:'2px'}}));
      const chips = h('div',{style:{display:'flex',flexWrap:'wrap',gap:'4px'}});
      for (const q of queues) {
        const qc = qColorMap[q] || '#8b949e';
        const chip = h('label',{style:{display:'inline-flex',alignItems:'center',gap:'3px',fontSize:'11px',cursor:'pointer',padding:'2px 6px',borderRadius:'3px',border:`1px solid ${C.bd}`,background:selectedQueues.has(q)?qc+'22':'transparent'}});
        const cb = h('input',{type:'checkbox',style:{width:'12px',height:'12px',cursor:'pointer'}});
        cb.checked = selectedQueues.has(q);
        cb.onchange = () => {
          if (cb.checked) selectedQueues.add(q); else selectedQueues.delete(q);
          chip.style.background = cb.checked ? qc+'22' : 'transparent';
          updateChart();
        };
        checkboxes[q] = { cb, chip, colorIdx };
        chip.append(cb, h('span',{style:{width:'8px',height:'8px',borderRadius:'50%',background:qc,display:'inline-block'}}), q);
        chips.append(chip);
      }
      row.append(chips);
      queueSection.append(row);
    }
    container.append(queueSection);

    function updateCheckboxes() {
      for (const [q, { cb, chip, colorIdx }] of Object.entries(checkboxes)) {
        cb.checked = selectedQueues.has(q);
        chip.style.background = selectedQueues.has(q) ? (qColorMap[q]||'#8b949e')+'22' : 'transparent';
      }
    }

    function updateChart() {
      const cutoff = new Date(Date.now() - intervalHours * 3600000);
      let filtered = snapshots.filter(s => new Date(s.ts) >= cutoff);
      // If no data in interval, show ALL available data
      if (!filtered.length) filtered = [...snapshots];

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
          pointRadius: filtered.length < 50 ? 3 : 1,
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
            legend: { labels: { color: C.t, font: {size:11} }, position: 'bottom' },
            tooltip: { mode: 'index' },
          },
          scales: {
            y: { beginAtZero: true, ticks: { color: C.m, stepSize: 1 }, grid: { color: C.bd }, title: { display: true, text: metric === 'waiting' ? 'Jobs Waiting' : 'Jobs Running', color: C.m } },
            x: { ticks: { color: C.m, maxRotation: 45 }, grid: { color: C.bd } },
          },
        },
      });
    }

    updateChart();
  }

  function makeCard(label, value, sub, color) {
    return h('div',{style:{background:C.bg,border:`1px solid ${C.bd}`,borderRadius:'8px',padding:'16px 20px',borderTop:`3px solid ${color}`}},[
      h('div',{text:label,style:{fontSize:'11px',color:C.m,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:'4px'}}),
      h('div',{text:String(value),style:{fontSize:'28px',fontWeight:'800',color,lineHeight:'1.1'}}),
      sub?h('div',{text:sub,style:{fontSize:'12px',color:C.m,marginTop:'4px'}}):null,
    ]);
  }

  function makeBtn(text, onclick) {
    const btn = h('button',{text,style:{background:C.bd,border:'none',color:C.t,padding:'3px 8px',borderRadius:'3px',cursor:'pointer',fontSize:'10px',fontFamily:'inherit'}});
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
    if (p) obs.observe(p, {attributes:true, attributeFilter:['class']});
  });
})();
