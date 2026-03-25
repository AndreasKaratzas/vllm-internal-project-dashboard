/**
 * CI Analytics — Streamlined comparison-first view.
 * Side-by-side is the default and only pipeline view.
 * Queue comparison: AMD queues vs Other agents (NVIDIA on top).
 */
(function() {
  const _s=getComputedStyle(document.documentElement);
  const C = {g:_s.getPropertyValue('--accent-green').trim()||'#238636',y:_s.getPropertyValue('--accent-orange').trim()||'#d29922',o:'#db6d28',r:_s.getPropertyValue('--badge-closed').trim()||'#da3633',b:_s.getPropertyValue('--accent-blue').trim()||'#1f6feb',m:_s.getPropertyValue('--text-muted').trim()||'#656d76',t:_s.getPropertyValue('--text').trim()||'#e6edf3',bg:_s.getPropertyValue('--card-bg').trim()||'#161b22',bg2:_s.getPropertyValue('--bg').trim()||'#0d1117',bd:_s.getPropertyValue('--border').trim()||'#30363d',sf:'#a371f7'};
  const _cb = () => '?_=' + Math.floor(Date.now()/1000);
  const J = async u => { try { const r = await fetch(u + _cb()); return r.ok ? r.json() : null } catch { return null } };

  function h(t,p={},k=[]) {
    const e=document.createElement(t);
    if(p.cls){e.className=p.cls;delete p.cls}
    if(p.html){e.innerHTML=p.html;delete p.html}
    if(p.text){e.textContent=p.text;delete p.text}
    if(p.style){Object.assign(e.style,p.style);delete p.style}
    for(const[a,v]of Object.entries(p)){if(typeof v==='function')e[a]=v;else e.setAttribute(a,v)}
    for(const c of k){if(typeof c==='string')e.append(c);else if(c)e.append(c)}
    return e
  }

  function fmtDur(mins) {
    if (mins == null) return '-';
    if (mins < 60) return `${Math.round(mins)}m`;
    const hr = Math.floor(mins/60), mn = Math.round(mins%60);
    return `${hr}h ${mn}m`;
  }

  function stateDot(state, size='10px') {
    const colors = {passed:C.g,failed:C.r,soft_fail:C.sf,canceled:C.m,running:C.b,scheduled:C.y,timed_out:C.o};
    return h('span',{style:{display:'inline-block',width:size,height:size,borderRadius:'50%',background:colors[state]||C.m,transition:'transform 0.2s'}});
  }

  function metricCard(label, value, sub, color) {
    return h('div',{style:{background:C.bg,border:`1px solid ${C.bd}`,borderRadius:'8px',padding:'16px 20px',borderTop:`3px solid ${color||C.b}`,transition:'transform 0.2s, box-shadow 0.2s'}},[
      h('div',{text:label,style:{fontSize:'11px',color:C.m,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:'4px'}}),
      h('div',{html:String(value),style:{fontSize:'28px',fontWeight:'800',color:color||C.t,lineHeight:'1.1'}}),
      sub?h('div',{html:sub,style:{fontSize:'12px',color:C.m,marginTop:'4px'}}):null,
    ]);
  }

  function progressBar(value, max, color, w='200px') {
    const pct = max>0 ? Math.round(value/max*100) : 0;
    return h('div',{style:{display:'inline-flex',alignItems:'center',gap:'6px'}},[
      h('div',{style:{width:w,height:'8px',background:C.bd,borderRadius:'4px',overflow:'hidden'}},[
        h('div',{style:{width:pct+'%',height:'100%',background:color,borderRadius:'4px',transition:'width .6s cubic-bezier(0.4,0,0.2,1)'}}),
      ]),
      h('span',{text:pct+'%',style:{fontSize:'12px',color,fontWeight:'600',minWidth:'36px'}}),
    ]);
  }

  const thS = a => ({textAlign:a||'left',padding:'8px 12px',borderBottom:`2px solid ${C.bd}`,color:C.m,fontSize:'10px',textTransform:'uppercase',fontWeight:'600',whiteSpace:'nowrap'});
  const tdS = a => ({textAlign:a||'left',padding:'6px 12px',borderBottom:`1px solid ${C.bd}`,color:C.t,fontSize:'13px'});

  // ═══════════ COMPARISON VIEW (default) ═══════════

  function renderComparisonView(box, data, pipelines) {
    // Summary metrics across both pipelines
    const summaryRow = h('div',{style:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'20px'}});

    let totalBuilds = 0, totalFailures = 0, totalJobs = 0;
    for (const p of pipelines) {
      const d = data[p];
      if (!d) continue;
      totalBuilds += d.summary?.total_builds || 0;
      totalFailures += d.summary?.jobs_with_failures || 0;
      totalJobs += d.summary?.total_jobs_tracked || 0;
    }

    summaryRow.append(metricCard('Total Nightly Builds', totalBuilds, `Across ${pipelines.length} pipelines`, C.b));
    summaryRow.append(metricCard('Jobs with Failures', totalFailures, `of ${totalJobs} tracked`, totalFailures > 0 ? C.r : C.g));

    const topFails = [];
    const topDurs = [];
    for (const p of pipelines) {
      const d = data[p];
      if (d?.failure_ranking?.[0]) topFails.push({...d.failure_ranking[0], pipeline: p});
      if (d?.duration_ranking?.[0]) topDurs.push({...d.duration_ranking[0], pipeline: p});
    }
    topFails.sort((a,b) => b.fail_rate - a.fail_rate);
    topDurs.sort((a,b) => (b.median_dur||0) - (a.median_dur||0));

    summaryRow.append(metricCard('Worst Failure Rate', topFails[0] ? `${topFails[0].fail_rate}%` : '0%', topFails[0]?.name?.slice(0,30) || '', C.r));
    summaryRow.append(metricCard('Slowest Job (p50)', topDurs[0] ? fmtDur(topDurs[0].median_dur) : '-', topDurs[0]?.name?.slice(0,30) || '', C.o));
    box.append(summaryRow);

    // Side-by-side pipeline columns
    const grid = h('div',{style:{display:'grid',gridTemplateColumns:`repeat(${pipelines.length},1fr)`,gap:'20px',marginBottom:'20px'}});

    for (const p of pipelines) {
      const d = data[p];
      if (!d) continue;
      const col = h('div');
      col.append(h('h3',{text:d.display_name || p,style:{marginBottom:'12px',color:C.b,borderBottom:`2px solid ${C.b}`,paddingBottom:'6px',fontSize:'14px',fontWeight:'700'}}));

      const s = d.summary;
      const miniRow = h('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'16px'}});
      miniRow.append(metricCard('Builds', s.total_builds, '', C.b));
      miniRow.append(metricCard('Failures', s.jobs_with_failures, `of ${s.total_jobs_tracked}`, s.jobs_with_failures > 0 ? C.r : C.g));
      col.append(miniRow);

      // Failure ranking (top 5)
      if (d.failure_ranking?.length) {
        const sec = h('div',{style:{background:C.bg,border:`1px solid ${C.bd}`,borderRadius:'8px',padding:'12px',marginBottom:'12px'}});
        sec.append(h('div',{text:'Top Failures',style:{fontSize:'12px',fontWeight:'700',color:C.m,textTransform:'uppercase',marginBottom:'8px'}}));
        for (const j of d.failure_ranking.slice(0,5)) {
          const row = h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'4px 0',fontSize:'12px'}});
          row.append(h('span',{text:j.name, style:{flex:'1',marginRight:'8px',wordBreak:'break-word'}}));
          row.append(progressBar(j.fail_rate, 100, j.fail_rate >= 50 ? C.r : j.fail_rate >= 20 ? C.o : C.y, '80px'));
          sec.append(row);
        }
        col.append(sec);
      }

      // Duration ranking (top 5)
      if (d.duration_ranking?.length) {
        const sec = h('div',{style:{background:C.bg,border:`1px solid ${C.bd}`,borderRadius:'8px',padding:'12px'}});
        sec.append(h('div',{text:'Slowest Jobs',style:{fontSize:'12px',fontWeight:'700',color:C.m,textTransform:'uppercase',marginBottom:'8px'}}));
        const maxDur = d.duration_ranking[0]?.median_dur || 1;
        for (const j of d.duration_ranking.slice(0,5)) {
          const row = h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'4px 0',fontSize:'12px'}});
          row.append(h('span',{text:j.name, style:{flex:'1',marginRight:'8px',wordBreak:'break-word'}}));
          row.append(h('span',{text:fmtDur(j.median_dur),style:{color:C.o,fontWeight:'600',minWidth:'50px',textAlign:'right'}}));
          sec.append(row);
        }
        col.append(sec);
      }

      grid.append(col);
    }
    box.append(grid);

    // Daily pass/fail chart (combined)
    for (const p of pipelines) {
      const d = data[p];
      if (d?.daily_stats?.length > 1) {
        const section = h('div',{style:{background:C.bg,border:`1px solid ${C.bd}`,borderRadius:'8px',padding:'20px',marginBottom:'16px'}});
        section.append(h('h3',{text:`${d.display_name || p} — Build Pass/Fail`,style:{marginBottom:'12px',fontSize:'14px'}}));
        const canvas = h('canvas',{style:{maxHeight:'180px'}});
        section.append(canvas);
        box.append(section);

        new Chart(canvas, {
          type: 'bar',
          data: {
            labels: d.daily_stats.map(x => x.date.slice(5)),
            datasets: [
              {label:'passed',data:d.daily_stats.map(x=>x.passed),backgroundColor:C.g,borderRadius:2},
              {label:'failed',data:d.daily_stats.map(x=>x.failed),backgroundColor:C.r,borderRadius:2},
            ]
          },
          options: {
            responsive:true, plugins:{legend:{labels:{color:C.t,font:{size:11}}}},
            scales:{
              x:{stacked:true,ticks:{color:C.m,font:{size:10}},grid:{color:C.bd}},
              y:{stacked:true,ticks:{color:C.m,stepSize:1},grid:{color:C.bd},beginAtZero:true}
            }
          }
        });
      }
    }
  }

  // ═══════════ QUEUE COMPARISON VIEW ═══════════

  function isAmdQueue(name) {
    return name.startsWith('amd_') || name.startsWith('amd-');
  }

  function isNvidiaQueue(name) {
    return ['gpu_1_queue','gpu_4_queue','B200','H200','a100_queue','mithril-h100-pool','nebius-h200','perf-B200','perf-h200'].includes(name);
  }

  function renderQueueComparison(box, data, pipelines) {
    // Build job-name → {queues, median_wait, p90_wait} lookup from duration_ranking
    const jobQueueMap = {};
    for (const p of pipelines) {
      const d = data[p];
      if (!d) continue;
      for (const jr of (d.duration_ranking || [])) {
        if (jr.queues?.length && jr.name) {
          jobQueueMap[jr.name] = {queues: jr.queues, median_wait: jr.median_wait, p90_wait: jr.p90_wait, pipeline: p};
        }
      }
    }

    // Gather all builds with dates
    const allBuilds = [];
    for (const p of pipelines) {
      const d = data[p];
      if (!d) continue;
      for (const b of (d.builds || [])) {
        if (b.date) allBuilds.push({...b, pipeline: p});
      }
    }
    allBuilds.sort((a,b) => a.date.localeCompare(b.date));

    // Time segment options — 'Last build' uses days=0 as sentinel
    const segments = [
      {label:'Last build',days:0},{label:'3d',days:3},{label:'7d',days:7},{label:'14d',days:14},{label:'All',days:9999}
    ];
    let activeDays = 9999;

    const dynContainer = h('div');

    function computeQueueStats(filteredBuilds) {
      // Check if per-build jobs have queue data (new collector format)
      const hasQ = filteredBuilds.some(b => (b.jobs||[]).some(j => j.q));

      const qMap = {};
      for (const b of filteredBuilds) {
        for (const j of (b.jobs||[])) {
          // Determine queue: use per-job 'q' field if available, else look up from duration_ranking
          let queues, wait, pipeline = b.pipeline;
          if (j.q) {
            queues = [j.q];
            wait = j.wait;
          } else {
            const lookup = jobQueueMap[j.name];
            if (!lookup) continue;
            queues = lookup.queues;
            wait = lookup.median_wait; // best estimate from aggregated data
            pipeline = lookup.pipeline;
          }
          for (const q of queues) {
            if (!qMap[q]) qMap[q] = {queue:q, jobs:0, waits:[], pipeline};
            qMap[q].jobs++;
            if (wait != null) qMap[q].waits.push(wait);
          }
        }
      }

      const amdQueues = [], otherQueues = [];
      for (const d of Object.values(qMap)) {
        const w = d.waits.sort((a,b)=>a-b);
        const entry = {queue:d.queue, jobs:d.jobs, pipeline:d.pipeline,
          median_wait: w.length ? w[Math.floor(w.length/2)] : null,
          p90_wait: w.length>1 ? w[Math.floor(w.length*0.9)] : null,
        };
        if (isAmdQueue(d.queue) && d.pipeline.includes('amd')) amdQueues.push(entry);
        else if (!isAmdQueue(d.queue)) otherQueues.push(entry);
      }
      return {amdQueues, otherQueues, hasQ};
    }

    function rebuildView() {
      dynContainer.innerHTML = '';
      let filteredBuilds;
      if (activeDays === 0) {
        // Last build: pick the most recent build per pipeline
        const seen = {};
        const sorted = [...allBuilds].sort((a,b) => b.date.localeCompare(a.date));
        filteredBuilds = sorted.filter(b => { if (seen[b.pipeline]) return false; seen[b.pipeline]=true; return true; });
      } else {
        const cutoff = activeDays < 9999 ? new Date(Date.now() - activeDays * 86400000).toISOString().slice(0,10) : '';
        filteredBuilds = cutoff ? allBuilds.filter(b => b.date >= cutoff) : allBuilds;
      }
      const filteredDates = [...new Set(filteredBuilds.map(b=>b.date))].sort();
      const dateRange = filteredDates.length ? filteredDates[0] + ' \u2013 ' + filteredDates[filteredDates.length-1] : '';

      const {amdQueues, otherQueues, hasQ} = computeQueueStats(filteredBuilds);

      otherQueues.sort((a,b) => {
        const aNv = isNvidiaQueue(a.queue)?0:1, bNv = isNvidiaQueue(b.queue)?0:1;
        return aNv !== bNv ? aNv - bNv : (b.median_wait||0) - (a.median_wait||0);
      });
      amdQueues.sort((a,b) => (b.median_wait||0) - (a.median_wait||0));

      // Data source banner
      const bkQueuesUrl = LinkRegistry.bk.queues();
      const srcNote = h('div',{style:{padding:'10px 14px',background:C.b+'12',border:`1px solid ${C.b}33`,borderRadius:'6px',marginBottom:'16px',fontSize:'13px',color:C.t,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'8px'}});
      const waitNote = hasQ ? '' : ' Wait times are estimated from overall job averages.';
      srcNote.append(h('span',{html:`Aggregated from <strong>${filteredBuilds.length}</strong> nightly builds${dateRange?' ('+dateRange+')':''}.${waitNote}`}));
      srcNote.append(h('a',{text:'View live queues on Buildkite \u2197',href:bkQueuesUrl,target:'_blank',style:{color:C.b,fontSize:'13px',fontWeight:'600',textDecoration:'none',whiteSpace:'nowrap'}}));
      dynContainer.append(srcNote);

      const totalAmdJobs = amdQueues.reduce((a,q) => a + q.jobs, 0);
      const totalOtherJobs = otherQueues.reduce((a,q) => a + q.jobs, 0);
      const topAmdWait = amdQueues[0], topOtherWait = otherQueues[0];

      const summaryRow = h('div',{style:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'20px'}});
      summaryRow.append(metricCard('AMD Queue Jobs', totalAmdJobs.toLocaleString(), `${amdQueues.length} queues`, C.r));
      summaryRow.append(metricCard('Other Agent Jobs', totalOtherJobs.toLocaleString(), `${otherQueues.length} queues`, C.b));
      summaryRow.append(metricCard('AMD Longest Wait', fmtDur(topAmdWait?.median_wait), topAmdWait?.queue||'', C.o));
      summaryRow.append(metricCard('Other Longest Wait', fmtDur(topOtherWait?.median_wait), topOtherWait?.queue||'', C.o));
      dynContainer.append(summaryRow);

      const grid = h('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px'}});
      const amdCol = h('div');
      amdCol.append(h('h3',{text:'AMD Queues',style:{marginBottom:'12px',color:C.r,borderBottom:`2px solid ${C.r}`,paddingBottom:'6px',fontSize:'14px',fontWeight:'700'}}));
      renderQueueTable(amdCol, amdQueues);
      grid.append(amdCol);
      const otherCol = h('div');
      otherCol.append(h('h3',{text:'Other Agents',style:{marginBottom:'12px',color:C.b,borderBottom:`2px solid ${C.b}`,paddingBottom:'6px',fontSize:'14px',fontWeight:'700'}}));
      renderQueueTable(otherCol, otherQueues);
      grid.append(otherCol);
      dynContainer.append(grid);
    }

    // Segment selector bar
    const segBar = h('div',{style:{display:'flex',gap:'2px',marginBottom:'16px',flexWrap:'wrap'}});
    segBar.append(h('span',{text:'Time window:',style:{color:C.m,fontSize:'14px',marginRight:'6px',alignSelf:'center'}}));
    const segBtns = {};
    for (const s of segments) {
      const isActive = s.days === activeDays;
      const btn = h('button',{text:s.label,style:{
        background:isActive?C.b:C.bd, border:'none', color:C.t,
        padding:'4px 12px', borderRadius:'3px', cursor:'pointer',
        fontSize:'13px', fontFamily:'inherit', fontWeight:isActive?'600':'400'
      }});
      btn.onclick = () => {
        activeDays = s.days;
        for (const [,b] of Object.entries(segBtns)) { b.style.background=C.bd; b.style.fontWeight='400'; }
        btn.style.background=C.b; btn.style.fontWeight='600';
        rebuildView();
      };
      segBtns[s.days] = btn;
      segBar.append(btn);
    }
    box.append(segBar);
    box.append(dynContainer);
    rebuildView();
  }

  function renderQueueTable(box, queues) {
    if (!queues.length) { box.append(h('p',{text:'No queue data.',style:{color:C.m,fontSize:'13px'}})); return; }

    const BK_QUEUES_URL = LinkRegistry.bk.queues();

    const section = h('div',{style:{background:C.bg,border:`1px solid ${C.bd}`,borderRadius:'8px',padding:'16px'}});
    const tbl = h('table',{style:{width:'100%',borderCollapse:'collapse',fontSize:'13px'}});
    const thead = h('thead');
    const hr = h('tr');
    hr.append(h('th',{text:'Queue',style:thS()}));
    hr.append(h('th',{text:'p50',style:thS('center')}));
    hr.append(h('th',{text:'p90',style:thS('center')}));
    hr.append(h('th',{text:'Jobs',style:thS('center')}));
    thead.append(hr);
    tbl.append(thead);

    const tbody = h('tbody');
    const maxWait = queues[0]?.median_wait || 1;
    for (const q of queues) {
      const tr = h('tr');
      const isNv = isNvidiaQueue(q.queue);
      const labelColor = isAmdQueue(q.queue) ? C.r : isNv ? C.b : C.m;
      // Queue name as clickable link to Buildkite
      const nameCell = h('td',{style:{...tdS(),fontWeight:'600'}});
      nameCell.append(h('span',{style:{width:'6px',height:'6px',borderRadius:'50%',background:labelColor,display:'inline-block',marginRight:'6px'}}));
      const qLink = h('a',{text:q.queue,href:BK_QUEUES_URL,target:'_blank',style:{color:C.t,textDecoration:'none'}});
      qLink.onmouseenter = () => { qLink.style.color = C.b; qLink.style.textDecoration = 'underline'; };
      qLink.onmouseleave = () => { qLink.style.color = C.t; qLink.style.textDecoration = 'none'; };
      nameCell.append(qLink);
      tr.append(nameCell);

      const wColor = (q.median_wait||0) > 10 ? C.r : (q.median_wait||0) > 5 ? C.o : (q.median_wait||0) > 2 ? C.y : C.g;
      tr.append(h('td',{text:fmtDur(q.median_wait),style:{...tdS('center'),color:wColor,fontWeight:'600'}}));
      tr.append(h('td',{text:fmtDur(q.p90_wait),style:tdS('center')}));
      tr.append(h('td',{text:q.jobs.toLocaleString(),style:tdS('center')}));
      tbody.append(tr);
    }
    tbl.append(tbody);
    section.append(tbl);
    box.append(section);
  }

  // ═══════════ RECENT BUILDS MATRIX ═══════════

  function normalizeJobName(name) {
    var n = name;
    // Strip hardware prefixes: "mi250_1: ", "gpu_1: "
    n = n.replace(/^(mi\d+_\d+|gpu_\d+|amd_\w+):\s*/i, '');
    // Strip ALL hardware parenthesized suffixes: (B200-MI355), (H100-MI250), etc.
    n = n.replace(/\s*\([A-Za-z0-9]+-MI\d+\)\s*/g, '');
    // Strip standalone GPU suffixes: (B200), (H100), (2xH100)
    n = n.replace(/\s*\(\d*x?[A-Z]\d{2,4}\)\s*/g, '');
    // Strip (MI250), (MI325) etc
    n = n.replace(/\s*\(MI\d+\)\s*/g, '');
    // Strip parallelism marker: %1, %2
    n = n.replace(/\s+%\d+$/, '');
    // Only strip trailing shard index for known %N-expanded patterns
    n = n.trim();
    if (typeof _stripShardIndex === 'function') n = _stripShardIndex(n);
    // Lowercase to match backend normalization
    return n.trim().toLowerCase();
  }

  // Area classification for test groups
  const AREA_PATTERNS = [
    ['Kernels', /^kernel/],['Attention', /attention/],['Distributed', /distributed|comm ops|torchrun/],
    ['Models', /models? test|models? \(/],['Multi-Modal', /multi-modal/],['Entrypoints', /entrypoint/],
    ['Compile', /compile|pytorch|fullgraph/],['Engine', /engine|e2e/],['LoRA', /lora/],
    ['Spec Decode', /spec.?dec/],['LM Eval', /lm.?eval|gpqa/],['Quantization', /quantiz/],
    ['V1', /^v1 /],['Benchmarks', /benchmark/],['Fusion', /fusion/],
  ];
  function getArea(name) {
    const l = name.toLowerCase();
    for (const [area, re] of AREA_PATTERNS) if (re.test(l)) return area;
    return 'Other';
  }

  function renderBuildsMatrix(box, data, pipelines) {
    const amdData = data['amd-ci'] || data[pipelines[0]];
    const upData = data['ci'] || data[pipelines[1]];
    if (!amdData?.builds?.length) { box.append(h('p',{text:'No build data.',style:{color:C.m}})); return; }

    const amdBuilds = amdData.builds.filter(b=>(b.jobs||[]).length>10).slice(0,10);
    const upBuilds = (upData?.builds||[]).filter(b=>(b.jobs||[]).length>10).slice(0,10);

    const dates = [];
    const amdByDate = {}, upByDate = {};
    for (const b of amdBuilds) { const d=b.date||b.created_at?.slice(0,10); if(!amdByDate[d]||(b.jobs||[]).length>(amdByDate[d].jobs||[]).length) amdByDate[d]=b; if(!dates.includes(d))dates.push(d); }
    for (const b of upBuilds) { const d=b.date||b.created_at?.slice(0,10); if(!upByDate[d]||(b.jobs||[]).length>(upByDate[d].jobs||[]).length) upByDate[d]=b; if(!dates.includes(d))dates.push(d); }
    dates.sort().reverse();

    const allGroups = new Set();
    for (const b of amdBuilds.slice(0,3)) (b.jobs||[]).forEach(j=>allGroups.add(normalizeJobName(j.name)));
    for (const b of upBuilds.slice(0,3)) (b.jobs||[]).forEach(j=>allGroups.add(normalizeJobName(j.name)));

    function buildJobMap(build) {
      const m={};
      (build?.jobs||[]).forEach(j=>{
        const n=normalizeJobName(j.name); const prev=m[n];
        const st=j.state==='soft_fail'?'failed':j.state;
        if(!prev||st==='failed'||(st==='passed'&&prev!=='failed'))
          m[n]=st;
      });
      return m;
    }

    // Group by area
    const byArea = {};
    for (const gn of allGroups) {
      const area = getArea(gn);
      (byArea[area] = byArea[area] || []).push(gn);
    }
    for (const a in byArea) byArea[a].sort();

    const stateColor = s => s==='passed'?C.g:(s==='failed'||s==='soft_fail')?C.r:C.bd;
    const useDates = dates.slice(0, 21).reverse();

    // Header + next nightly indicator
    box.append(h('h3',{text:'Test Group History',style:{marginBottom:'4px',fontSize:'18px'}}));
    const latestDate=useDates[useDates.length-1]||'';
    if(latestDate){
      const now=new Date();
      const todayUp=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate(),21,0));
      const nextUp=todayUp>now?todayUp:new Date(todayUp.getTime()+86400000);
      const diffMs=nextUp-now;
      const diffH=Math.floor(diffMs/3600000);
      const diffM=Math.floor((diffMs%3600000)/60000);
      const timeStr=diffH>0?`${diffH}h ${diffM}m`:`${diffM}m`;
      box.append(h('p',{html:`Data through: <strong>20${latestDate}</strong> &bull; Next column expected after upstream nightly (~${nextUp.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} local, in ${timeStr})`,style:{fontSize:'12px',color:C.m,marginBottom:'8px'}}));
    }
    // Legend
    const legend = h('div',{style:{display:'flex',gap:'16px',marginBottom:'4px',fontSize:'14px',color:C.m,flexWrap:'wrap'}});
    for (const [label,color] of [['Passed',C.g],['Failed',C.r],['Not Run',C.bd]]) {
      legend.append(h('span',{style:{display:'flex',alignItems:'center',gap:'5px'}},[
        h('span',{style:{width:'12px',height:'12px',borderRadius:'2px',background:color,display:'inline-block'}}),label
      ]));
    }
    // Pipeline legend — compact colored rectangles matching heatmap dots
    for (const [label,color] of [['AMD (left)','#da3633'],['Upstream (right)','#1f6feb']]) {
      legend.append(h('span',{style:{display:'flex',alignItems:'center',gap:'5px'}},[
        h('span',{style:{width:'14px',height:'7px',borderRadius:'2px',background:color,display:'inline-block'}}),label
      ]));
    }
    box.append(legend);

    // Date header (shared) — offset by name column + links column
    const dateHeader = h('div',{style:{display:'flex',marginLeft:'calc(clamp(280px, 28vw, 500px) + 40px)',marginBottom:'4px'}});
    for (const d of useDates) {
      dateHeader.append(h('div',{text:d.slice(5),style:{width:'50px',textAlign:'center',fontSize:'15px',color:C.m,flexShrink:0}}));
    }
    box.append(dateHeader);

    // Render each area as a collapsible section
    const areaNames = Object.keys(byArea).sort();
    for (const area of areaNames) {
      const groups = byArea[area];
      // Count failures in latest build for this area
      const latestAmd = buildJobMap(amdByDate[useDates[useDates.length - 1]]);
      const areaFails = groups.filter(g => latestAmd[g] === 'failed').length;

      const det = h('details',{open: areaFails > 0, style:{marginBottom:'4px',background:C.bg,border:`1px solid ${C.bd}`,borderRadius:'6px'}});
      const summ = h('summary',{style:{padding:'10px 14px',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:'14px',fontWeight:'600'}});
      summ.append(h('span',{},[
        h('span',{style:{width:'8px',height:'8px',borderRadius:'50%',background:areaFails>0?C.r:C.g,display:'inline-block',marginRight:'8px'}}),
        `${area} `,
        h('span',{text:`(${groups.length} groups${areaFails?`, ${areaFails} failing`:''})`,style:{color:C.m,fontWeight:'400',fontSize:'13px'}})
      ]));
      det.append(summ);

      // Group rows inside
      const inner = h('div',{style:{padding:'4px 14px 10px'}});
      for (const gn of groups) {
        const row = h('div',{style:{display:'flex',alignItems:'center',marginBottom:'4px',minHeight:'20px'},title:gn});
        const nameDiv=h('div',{style:{width:'clamp(280px, 28vw, 500px)',fontSize:'clamp(12px, 0.85vw, 16px)',flexShrink:0,wordBreak:'break-word',lineHeight:'1.4'}});
        nameDiv.textContent=gn;
        row.append(nameDiv);
        const linksDiv=h('div',{style:{width:'40px',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}});
        if(typeof makeGroupLinksColumn==='function'){linksDiv.append(makeGroupLinksColumn(gn,true,true))}
        row.append(linksDiv);

        for (const d of useDates) {
          const amdMap = buildJobMap(amdByDate[d]);
          const upMap = buildJobMap(upByDate[d]);
          const cell = h('div',{style:{width:'50px',display:'flex',justifyContent:'center',gap:'2px',flexShrink:0},title:`${d}\nAMD: ${amdMap[gn]||'-'}\nUpstream: ${upMap[gn]||'-'}`});
          cell.append(h('span',{style:{width:'14px',height:'7px',borderRadius:'2px',background:stateColor(amdMap[gn]),display:'block'}}));
          cell.append(h('span',{style:{width:'14px',height:'7px',borderRadius:'2px',background:stateColor(upMap[gn]),display:'block'}}));
          row.append(cell);
        }
        inner.append(row);
      }
      det.append(inner);
      box.append(det);
    }
  }

  // ═══════════ TEST GROUP TRENDS ═══════════

  function renderGroupTrends(box, data, pipelines) {
    const pipeRow = h('div',{style:{display:'flex',gap:'8px',alignItems:'center',marginBottom:'16px'}});
    pipeRow.append(h('span',{text:'Pipeline:',style:{color:C.m,fontSize:'13px'}}));
    let activePipe = pipelines[0] || 'amd-ci';
    const trendsBox = h('div');

    for (const p of pipelines) {
      const btn = h('button',{text:data[p]?.display_name || p,style:{
        background:p===activePipe?C.b:'transparent',border:'none',color:C.t,
        padding:'6px 14px',borderRadius:'4px',cursor:'pointer',fontSize:'13px',fontFamily:'inherit',
        fontWeight:p===activePipe?'700':'400'
      }});
      btn.onclick = () => {
        activePipe = p;
        pipeRow.querySelectorAll('button').forEach(b => { b.style.background='transparent'; b.style.fontWeight='400'; });
        btn.style.background = C.b; btn.style.fontWeight = '700';
        trendsBox.innerHTML = '';
        renderGroupTrendsChart(trendsBox, data[p]);
      };
      pipeRow.append(btn);
    }
    box.append(pipeRow, trendsBox);
    renderGroupTrendsChart(trendsBox, data[activePipe]);
  }

  // Cache for group_changes.json
  let _groupChangesData = null;
  let _groupChangesLoaded = false;
  async function _loadGroupChanges() {
    if (_groupChangesLoaded) return _groupChangesData;
    _groupChangesLoaded = true;
    try {
      _groupChangesData = await J('data/vllm/ci/group_changes.json');
    } catch(e) {}
    return _groupChangesData;
  }

  function _showPROverlay(date, changes, color, pipeKey) {
    // pipeKey: 'amd' or 'upstream' — used to show per-pipeline changes
    if (!pipeKey) pipeKey = 'amd';
    const backdrop=h('div',{style:{position:'fixed',inset:'0',background:'rgba(0,0,0,.6)',zIndex:'1000',display:'flex',justifyContent:'center',alignItems:'flex-start',paddingTop:'60px',overflow:'auto'}});
    backdrop.onclick=e=>{if(e.target===backdrop)backdrop.remove()};
    const panel=h('div',{style:{background:'var(--bg,#0d1117)',border:'1px solid var(--border,#30363d)',borderRadius:'12px',width:'min(700px,90vw)',maxHeight:'80vh',overflow:'auto',padding:'24px'}});
    panel.append(h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}},[
      h('h3',{html:`Test Group Changes on <span style="color:${C.b}">${date}</span>`,style:{margin:'0'}}),
      h('button',{text:'\u2715',onclick:()=>backdrop.remove(),style:{background:'none',border:'none',color:C.m,fontSize:'20px',cursor:'pointer'}})
    ]));
    if(!changes.length){
      panel.append(h('p',{text:'No YAML changes found for this date.',style:{color:C.m}}));
    }
    for(const ch of changes){
      const sec=h('div',{style:{marginBottom:'16px',padding:'12px',background:'var(--card-bg,#161b22)',borderRadius:'8px',border:'1px solid var(--border,#30363d)'}});
      // PR link or commit info
      if(ch.pr){
        sec.append(h('div',{style:{marginBottom:'8px'}},[
          h('a',{href:ch.pr.url,target:'_blank',style:{color:C.b,fontWeight:'700',fontSize:'15px',textDecoration:'none'},text:`PR #${ch.pr.number}: ${ch.pr.title}`}),
          h('span',{text:` by ${ch.pr.author}`,style:{color:C.m,fontSize:'13px',marginLeft:'8px'}})
        ]));
      } else {
        sec.append(h('div',{text:`${ch.sha} — ${ch.message}`,style:{fontSize:'13px',color:C.t,marginBottom:'8px'}}));
        sec.append(h('div',{text:`by ${ch.author}`,style:{fontSize:'12px',color:C.m,marginBottom:'8px'}}));
      }
      // Show per-pipeline changes when available, otherwise combined
      const addedList = ch[pipeKey+'_added'] || ch.added || [];
      const removedList = ch[pipeKey+'_removed'] || ch.removed || [];
      if(addedList.length){
        sec.append(h('div',{style:{marginBottom:'6px'}},[
          h('span',{text:`+${addedList.length} added: `,style:{color:C.g,fontWeight:'600',fontSize:'13px'}}),
          ...addedList.map(g=>h('span',{text:g,style:{padding:'2px 8px',borderRadius:'3px',fontSize:'12px',background:C.g+'15',border:`1px solid ${C.g}33`,color:C.t,marginRight:'4px',display:'inline-block',marginBottom:'2px'}}))
        ]));
      }
      if(removedList.length){
        sec.append(h('div',{},[
          h('span',{text:`-${removedList.length} removed: `,style:{color:C.r,fontWeight:'600',fontSize:'13px'}}),
          ...removedList.map(g=>h('span',{text:g,style:{padding:'2px 8px',borderRadius:'3px',fontSize:'12px',background:C.r+'15',border:`1px solid ${C.r}33`,color:C.t,marginRight:'4px',display:'inline-block',marginBottom:'2px'}}))
        ]));
      }
      panel.append(sec);
    }
    backdrop.append(panel);
    document.body.append(backdrop);
    // Escape key closes
    var escHandler = function(e) { if (e.key === 'Escape') { backdrop.remove(); document.removeEventListener('keydown', escHandler); } };
    document.addEventListener('keydown', escHandler);
  }

  async function renderGroupTrendsChart(box, pipeData) {
    if (!pipeData?.builds?.length) { box.append(h('p',{text:'No builds.',style:{color:C.m}})); return; }

    const builds = pipeData.builds.filter(b => (b.jobs||[]).length > 10).slice(0, 30).reverse();
    if (builds.length < 2) { box.append(h('p',{text:'Need at least 2 nightly builds for trends.',style:{color:C.m}})); return; }

    const buildGroups = builds.map(b => {
      const groups = new Set();
      (b.jobs||[]).forEach(j => groups.add(normalizeJobName(j.name)));
      return { date: b.date || b.created_at?.slice(0,10) || '?', groups, build: b };
    });

    const labels = [], totalCounts = [], newCounts = [], removedCounts = [];
    const allNew = new Set(), allRemoved = new Set();

    for (let i = 0; i < buildGroups.length; i++) {
      const curr = buildGroups[i];
      labels.push(curr.date.slice(5));
      totalCounts.push(curr.groups.size);
      if (i === 0) { newCounts.push(0); removedCounts.push(0); continue; }
      const prev = buildGroups[i-1];
      const added = [...curr.groups].filter(g => !prev.groups.has(g));
      const removed = [...prev.groups].filter(g => !curr.groups.has(g));
      newCounts.push(added.length);
      removedCounts.push(removed.length);
      added.forEach(g => { if (!buildGroups[0].groups.has(g)) allNew.add(g); });
      removed.forEach(g => { if (!buildGroups[buildGroups.length-1].groups.has(g)) allRemoved.add(g); });
    }

    const latest = buildGroups[buildGroups.length - 1];
    const earliest = buildGroups[0];

    function showListOverlay(title, items, color) {
      const backdrop = document.createElement('div');
      backdrop.className = 'overlay-backdrop';
      backdrop.onclick = e => { if(e.target===backdrop) backdrop.remove(); };
      const panel = document.createElement('div');
      panel.className = 'overlay-panel';
      const hdr = document.createElement('div');
      hdr.className = 'overlay-header';
      hdr.innerHTML = `<h3 style="color:${color}">${title} <span style="color:var(--text-muted);font-weight:400">(${items.length})</span></h3>`;
      const cls = document.createElement('button');
      cls.className = 'overlay-close';
      cls.innerHTML = '&times;';
      cls.onclick = () => backdrop.remove();
      hdr.appendChild(cls);
      const body = document.createElement('div');
      body.className = 'overlay-body';
      const list = items.sort();
      let html = '';
      for (const g of list) {
        html += `<div style="padding:5px 0;border-bottom:1px solid var(--border)">${LinkRegistry.aTag(LinkRegistry.bk.groupUrl(g, 'amd'), g, {style:'color:var(--text);text-decoration:none;transition:color .15s'})}</div>`;
      }
      body.innerHTML = html;
      panel.append(hdr, body);
      backdrop.append(panel);
      document.body.append(backdrop);
      document.addEventListener('keydown', function esc(e){if(e.key==='Escape'){backdrop.remove();document.removeEventListener('keydown',esc)}});
    }

    const summRow = h('div',{style:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'20px'}});
    const mc = (label,val,sub,color,items) => {
      const c = metricCard(label,val,sub,color);
      if (items && items.length) {
        c.style.cursor='pointer';
        c.onmouseenter=()=>{c.style.transform='translateY(-2px)';c.style.boxShadow='0 4px 12px rgba(0,0,0,.3)'};
        c.onmouseleave=()=>{c.style.transform='';c.style.boxShadow=''};
        c.onclick=()=>showListOverlay(label, items, color);
      }
      return c;
    };
    summRow.append(mc('Current Groups', latest.groups.size, latest.date, C.b, [...latest.groups]));
    summRow.append(mc('Period Start', earliest.groups.size, earliest.date, C.m, [...earliest.groups]));
    summRow.append(mc('New Groups', allNew.size, `since ${earliest.date.slice(5)}`, C.g, [...allNew]));
    summRow.append(mc('Removed Groups', allRemoved.size, `since ${earliest.date.slice(5)}`, allRemoved.size > 0 ? C.r : C.m, [...allRemoved]));
    box.append(summRow);

    // Load group changes data for click-to-PR feature
    const gcData = await _loadGroupChanges();
    const changesByDate = {};
    if (gcData?.changes) {
      for (const ch of gcData.changes) {
        (changesByDate[ch.date] = changesByDate[ch.date] || []).push(ch);
      }
    }
    // Helper: find PR changes for a build date.
    // PRs committed on day N appear in the nightly build for day N (or N+1).
    // So for build date D, check D, D-1, and D+1.
    function changesForDate(d) {
      const result = [...(changesByDate[d] || [])];
      // Check adjacent days for PRs that were committed before/after the nightly
      const dt = new Date(d + 'T12:00:00Z');
      for (const offset of [-1, 1]) {
        const adj = new Date(dt);
        adj.setUTCDate(adj.getUTCDate() + offset);
        const adjStr = adj.toISOString().slice(0, 10);
        if (changesByDate[adjStr]) {
          for (const ch of changesByDate[adjStr]) {
            // Don't duplicate — check by SHA
            if (!result.some(r => r.sha === ch.sha)) result.push(ch);
          }
        }
      }
      return result;
    }
    // Map short labels back to full dates for lookup
    const fullDates = buildGroups.map(bg => bg.date);

    const chartSec = h('div',{style:{background:C.bg,border:`1px solid ${C.bd}`,borderRadius:'8px',padding:'20px',marginBottom:'20px'}});
    chartSec.append(h('h3',{text:'Test Group Count Over Time',style:{marginBottom:'4px',fontSize:'15px'}}));
    chartSec.append(h('p',{text:'Click bars with changes to see the PRs responsible',style:{fontSize:'12px',color:C.m,marginBottom:'12px'}}));
    const canvas = h('canvas',{style:{maxHeight:'250px',cursor:'pointer'}});
    chartSec.append(canvas);
    box.append(chartSec);

    const chart = new Chart(canvas, {
      type:'bar', data:{ labels, datasets:[
        {type:'line',label:'Total Groups',data:totalCounts,borderColor:C.b,backgroundColor:C.b+'20',tension:.3,fill:true,pointRadius:4,borderWidth:2,yAxisID:'y'},
        {label:'New',data:newCounts,backgroundColor:C.g,borderRadius:2,yAxisID:'y1'},
        {label:'Removed',data:removedCounts.map(v=>-v),backgroundColor:C.r,borderRadius:2,yAxisID:'y1'},
      ]}, options:{ responsive:true,
        onClick:(evt) => {
          const points = chart.getElementsAtEventForMode(evt, 'index', {intersect:false}, true);
          if (!points.length) return;
          const idx = points[0].index;
          const date = fullDates[idx];
          if (idx === 0 && newCounts[idx] === 0 && removedCounts[idx] === 0) return;

          // Build-level group diff (what actually changed between nightly builds)
          const added = idx > 0 ? [...buildGroups[idx].groups].filter(g => !buildGroups[idx-1].groups.has(g)) : [];
          const removed = idx > 0 ? [...buildGroups[idx-1].groups].filter(g => !buildGroups[idx].groups.has(g)) : [];

          // YAML-level PR changes for this date (checks adjacent days too)
          const dateChanges = changesForDate(date);

          // Combine: PR changes first, then build-level diff showing ALL groups
          // Use per-pipeline fields (amd_added/amd_removed) when available,
          // falling back to combined (added/removed) for old cached entries
          const pipeKey = activePipe === 'ci' ? 'upstream' : 'amd';
          const allChanges = [...dateChanges];
          // Lowercase comparison since analytics normalizes names but group_changes has original case
          const prAdded = new Set(dateChanges.flatMap(c => (c[pipeKey+'_added'] || c.added || []).map(g => g.toLowerCase())));
          const prRemoved = new Set(dateChanges.flatMap(c => (c[pipeKey+'_removed'] || c.removed || []).map(g => g.toLowerCase())));
          const unattributed_added = added.filter(g => !prAdded.has(g.toLowerCase()));
          const unattributed_removed = removed.filter(g => !prRemoved.has(g.toLowerCase()));
          if (unattributed_added.length || unattributed_removed.length) {
            allChanges.push({
              sha: '', author: '',
              message: 'Build-level changes (groups present in one nightly but not the other — infra, retries, or hardware availability)',
              added: unattributed_added,
              removed: unattributed_removed,
              pr: null,
            });
          }
          if (allChanges.length) _showPROverlay(date, allChanges, C.b, pipeKey);
        },
        plugins:{legend:{labels:{color:C.t,font:{size:12}}}},
        scales:{
          y:{position:'left',ticks:{color:C.m},grid:{color:C.bd},title:{display:true,text:'Total Groups',color:C.m}},
          y1:{position:'right',ticks:{color:C.m},grid:{display:false},title:{display:true,text:'Added / Removed',color:C.m}},
          x:{ticks:{color:C.m},grid:{color:C.bd}}
        }
      }
    });

    if (allNew.size > 0) {
      const sec = h('div',{style:{background:C.bg,border:`1px solid ${C.bd}`,borderRadius:'8px',padding:'16px',marginBottom:'12px'}});
      sec.append(h('h4',{text:`New Groups (${allNew.size})`,style:{color:C.g,marginBottom:'8px',fontSize:'14px'}}));
      const chips = h('div',{style:{display:'flex',flexWrap:'wrap',gap:'6px'}});
      [...allNew].sort().forEach(g => chips.append(h('span',{text:g,style:{padding:'4px 10px',borderRadius:'4px',fontSize:'13px',background:C.g+'15',border:`1px solid ${C.g}33`,color:C.t}})));
      sec.append(chips);
      box.append(sec);
    }
    if (allRemoved.size > 0) {
      const sec = h('div',{style:{background:C.bg,border:`1px solid ${C.bd}`,borderRadius:'8px',padding:'16px',marginBottom:'12px'}});
      sec.append(h('h4',{text:`Removed Groups (${allRemoved.size})`,style:{color:C.r,marginBottom:'8px',fontSize:'14px'}}));
      const chips = h('div',{style:{display:'flex',flexWrap:'wrap',gap:'6px'}});
      [...allRemoved].sort().forEach(g => chips.append(h('span',{text:g,style:{padding:'4px 10px',borderRadius:'4px',fontSize:'13px',background:C.r+'15',border:`1px solid ${C.r}33`,color:C.t}})));
      sec.append(chips);
      box.append(sec);
    }
  }

  // ═══════════ MAIN RENDER ═══════════

  async function render() {
    const container = document.getElementById('ci-analytics-view');
    if (!container) return;
    container.innerHTML = '<p style="color:#8b949e">Loading analytics...</p>';

    const data = await J('data/vllm/ci/analytics.json') || {};
    container.innerHTML = '';

    const pipelines = Object.keys(data);
    if (!pipelines.length) {
      container.append(h('div',{style:{textAlign:'center',padding:'60px 20px',color:C.m}},[
        h('h3',{text:'CI Analytics',style:{marginBottom:'8px'}}),
        h('p',{text:'No analytics data available yet.'}),
      ]));
      return;
    }

    let activeView = 'comparison';

    // Title
    container.append(h('h2',{text:'CI Analytics',style:{marginBottom:'4px'}}));
    container.append(h('p',{text:'Nightly builds only',style:{color:C.m,fontSize:'12px',marginBottom:'16px',fontStyle:'italic'}}));

    // View tabs: Comparison | Queue Comparison
    const viewTabs = h('div',{style:{display:'flex',gap:'0',marginBottom:'20px',borderBottom:`1px solid ${C.bd}`}});
    const views = [{id:'comparison',label:'Pipeline Comparison'},{id:'builds',label:'Recent Builds'},{id:'groups',label:'Test Group Trends'},{id:'queue',label:'Queue Comparison'}];
    const tabBtns = {};
    for (const v of views) {
      const isActive = v.id === 'comparison';
      const btn = h('button',{text:v.label,style:{background:'transparent',border:'none',borderBottom:isActive?`2px solid ${C.b}`:'2px solid transparent',color:isActive?C.t:C.m,padding:'8px 16px',cursor:'pointer',fontSize:'13px',fontWeight:isActive?'600':'400',fontFamily:'inherit',transition:'all 0.2s'}});
      btn.dataset.view = v.id;
      tabBtns[v.id] = btn;
      viewTabs.append(btn);
    }
    container.append(viewTabs);

    const content = h('div');
    container.append(content);

    function renderContent() {
      content.innerHTML = '';
      if (activeView === 'comparison') {
        renderComparisonView(content, data, pipelines);
      } else if (activeView === 'builds') {
        renderBuildsMatrix(content, data, pipelines);
      } else if (activeView === 'groups') {
        renderGroupTrends(content, data, pipelines);
      } else {
        renderQueueComparison(content, data, pipelines);
      }
    }

    for (const v of views) {
      tabBtns[v.id].onclick = () => {
        activeView = v.id;
        for (const vv of views) {
          tabBtns[vv.id].style.borderBottomColor = vv.id === v.id ? C.b : 'transparent';
          tabBtns[vv.id].style.fontWeight = vv.id === v.id ? '600' : '400';
          tabBtns[vv.id].style.color = vv.id === v.id ? C.t : C.m;
        }
        renderContent();
      };
    }

    renderContent();
  }

  // Lazy load
  const obs = new MutationObserver(() => {
    const p = document.getElementById('tab-ci-analytics');
    if (p?.classList.contains('active') && !p.dataset.loaded) { p.dataset.loaded = '1'; render(); }
  });
  document.addEventListener('DOMContentLoaded', () => {
    const p = document.getElementById('tab-ci-analytics');
    if (p) {
      obs.observe(p, {attributes:true, attributeFilter:['class']});
      if (p.classList.contains('active') && !p.dataset.loaded) { p.dataset.loaded = '1'; render(); }
    }
  });
})();
