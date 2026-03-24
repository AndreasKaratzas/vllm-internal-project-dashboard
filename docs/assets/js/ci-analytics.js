/**
 * CI Analytics — Streamlined comparison-first view.
 * Side-by-side is the default and only pipeline view.
 * Queue comparison: AMD queues vs Other agents (NVIDIA on top).
 */
(function() {
  const C = {g:'#238636',y:'#d29922',o:'#db6d28',r:'#da3633',b:'#1f6feb',m:'#8b949e',t:'#e6edf3',bg:'#161b22',bg2:'#0d1117',bd:'#30363d',sf:'#a371f7'};
  const J = async u => { try { const r = await fetch(u); return r.ok ? r.json() : null } catch { return null } };

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
          row.append(h('span',{text:j.name.length > 30 ? j.name.slice(0,27)+'...' : j.name, title:j.name, style:{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:'1',marginRight:'8px'}}));
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
          row.append(h('span',{text:j.name.length > 30 ? j.name.slice(0,27)+'...' : j.name, title:j.name, style:{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:'1',marginRight:'8px'}}));
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
    // Collect all queues from all pipelines
    const amdQueues = [];
    const otherQueues = [];

    for (const p of pipelines) {
      const d = data[p];
      if (!d?.queue_stats) continue;
      for (const q of d.queue_stats) {
        // AMD queues should only come from amd-ci pipeline, not upstream
        if (isAmdQueue(q.queue)) {
          if (p.includes('amd')) amdQueues.push({...q, pipeline: p});
        } else {
          otherQueues.push({...q, pipeline: p});
        }
      }
    }

    // Sort other queues: NVIDIA first, then CPU, then rest
    otherQueues.sort((a,b) => {
      const aNv = isNvidiaQueue(a.queue) ? 0 : 1;
      const bNv = isNvidiaQueue(b.queue) ? 0 : 1;
      if (aNv !== bNv) return aNv - bNv;
      return (b.median_wait||0) - (a.median_wait||0);
    });

    amdQueues.sort((a,b) => (b.median_wait||0) - (a.median_wait||0));

    // Summary metrics
    const totalAmdJobs = amdQueues.reduce((a,q) => a + q.jobs, 0);
    const totalOtherJobs = otherQueues.reduce((a,q) => a + q.jobs, 0);
    const topAmdWait = amdQueues[0];
    const topOtherWait = otherQueues[0];

    const summaryRow = h('div',{style:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'20px'}});
    summaryRow.append(metricCard('AMD Queue Jobs', totalAmdJobs.toLocaleString(), `${amdQueues.length} queues`, C.r));
    summaryRow.append(metricCard('Other Agent Jobs', totalOtherJobs.toLocaleString(), `${otherQueues.length} queues`, C.b));
    summaryRow.append(metricCard('AMD Longest Wait', fmtDur(topAmdWait?.median_wait), topAmdWait?.queue||'', C.o));
    summaryRow.append(metricCard('Other Longest Wait', fmtDur(topOtherWait?.median_wait), topOtherWait?.queue||'', C.o));
    box.append(summaryRow);

    // Two-column layout
    const grid = h('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px'}});

    // AMD column
    const amdCol = h('div');
    amdCol.append(h('h3',{text:'AMD Queues',style:{marginBottom:'12px',color:C.r,borderBottom:`2px solid ${C.r}`,paddingBottom:'6px',fontSize:'14px',fontWeight:'700'}}));
    renderQueueTable(amdCol, amdQueues);
    grid.append(amdCol);

    // Other agents column (NVIDIA on top)
    const otherCol = h('div');
    otherCol.append(h('h3',{text:'Other Agents',style:{marginBottom:'12px',color:C.b,borderBottom:`2px solid ${C.b}`,paddingBottom:'6px',fontSize:'14px',fontWeight:'700'}}));
    renderQueueTable(otherCol, otherQueues);
    grid.append(otherCol);

    box.append(grid);
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
    // Strip ALL hardware parenthesized suffixes: (B200-MI355), (H100-MI250), (A100-MI325), etc.
    n = n.replace(/\s*\([A-Za-z0-9]+-MI\d+\)\s*/g, '');
    // Strip standalone GPU suffixes from upstream: (B200), (H100), (H200), (A100), (2xH100)
    n = n.replace(/\s*\(\d*x?[A-Z]\d{2,4}\)\s*/g, '');
    // Strip (MI250), (MI325) etc
    n = n.replace(/\s*\(MI\d+\)\s*/g, '');
    // Strip parallelism: %1, %2
    n = n.replace(/\s+%\d+$/, '');
    // Strip trailing shard numbers: "lora 1" -> "lora"
    n = n.replace(/\s+\d+$/, '');
    // Strip "1: description" shards
    n = n.replace(/\s+\d+\s*:.*$/, '');
    // Strip digit before closing paren: "gen 1)" -> "gen)"
    n = n.replace(/\s+\d+\)$/, ')');
    return n.trim();
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
    for (const b of amdBuilds) { const d=b.date||b.created_at?.slice(0,10); amdByDate[d]=b; if(!dates.includes(d))dates.push(d); }
    for (const b of upBuilds) { const d=b.date||b.created_at?.slice(0,10); upByDate[d]=b; if(!dates.includes(d))dates.push(d); }
    dates.sort().reverse();

    const allGroups = new Set();
    for (const b of amdBuilds.slice(0,3)) (b.jobs||[]).forEach(j=>allGroups.add(normalizeJobName(j.name)));
    for (const b of upBuilds.slice(0,3)) (b.jobs||[]).forEach(j=>allGroups.add(normalizeJobName(j.name)));

    function buildJobMap(build) {
      const m={};
      (build?.jobs||[]).forEach(j=>{
        const n=normalizeJobName(j.name); const prev=m[n];
        if(!prev||j.state==='failed'||(j.state==='soft_fail'&&prev!=='failed')||(j.state==='passed'&&prev!=='failed'&&prev!=='soft_fail'))
          m[n]=j.state;
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

    const stateColor = s => s==='passed'?C.g:s==='failed'?C.r:s==='soft_fail'?'#a371f7':C.bd;
    const useDates = dates.slice(0, 10).reverse();

    // Legend
    box.append(h('h3',{text:'Test Group History',style:{marginBottom:'8px',fontSize:'18px'}}));
    const legend = h('div',{style:{display:'flex',gap:'16px',marginBottom:'16px',fontSize:'14px',color:C.m,flexWrap:'wrap'}});
    for (const [label,color] of [['Passed',C.g],['Failed',C.r],['Soft Fail','#a371f7'],['Not Run',C.bd]]) {
      legend.append(h('span',{style:{display:'flex',alignItems:'center',gap:'5px'}},[
        h('span',{style:{width:'12px',height:'12px',borderRadius:'2px',background:color,display:'inline-block'}}),label
      ]));
    }
    legend.append(h('span',{html:'<span style="color:#da3633">Left</span> = AMD &nbsp; <span style="color:#1f6feb">Right</span> = Upstream',style:{fontStyle:'italic',fontSize:'clamp(12px,0.85vw,16px)'}}));
    box.append(legend);

    // Date header (shared)
    const dateHeader = h('div',{style:{display:'flex',marginLeft:'clamp(200px, 20vw, 400px)',marginBottom:'4px'}});
    for (const d of useDates) {
      dateHeader.append(h('div',{text:d.slice(5),style:{width:'84px',textAlign:'center',fontSize:'15px',color:C.m,flexShrink:0}}));
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
        const row = h('div',{style:{display:'flex',alignItems:'center',marginBottom:'2px'},title:gn});
        const nameDiv=h('div',{style:{width:'clamp(200px, 20vw, 400px)',fontSize:'clamp(12px, 0.85vw, 16px)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flexShrink:0,display:'flex',alignItems:'center',gap:'4px'}});
        if(typeof makeGroupLinks==='function'){nameDiv.append(makeGroupLinks(gn,true,true))}else{nameDiv.textContent=gn}
        row.append(nameDiv);

        for (const d of useDates) {
          const amdMap = buildJobMap(amdByDate[d]);
          const upMap = buildJobMap(upByDate[d]);
          const cell = h('div',{style:{width:'84px',display:'flex',justifyContent:'center',gap:'2px',flexShrink:0},title:`${d}\nAMD: ${amdMap[gn]||'-'}\nUpstream: ${upMap[gn]||'-'}`});
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

  function renderGroupTrendsChart(box, pipeData) {
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

    const chartSec = h('div',{style:{background:C.bg,border:`1px solid ${C.bd}`,borderRadius:'8px',padding:'20px',marginBottom:'20px'}});
    chartSec.append(h('h3',{text:'Test Group Count Over Time',style:{marginBottom:'12px',fontSize:'15px'}}));
    const canvas = h('canvas',{style:{maxHeight:'250px'}});
    chartSec.append(canvas);
    box.append(chartSec);

    new Chart(canvas, {
      type:'bar', data:{ labels, datasets:[
        {type:'line',label:'Total Groups',data:totalCounts,borderColor:C.b,backgroundColor:C.b+'20',tension:.3,fill:true,pointRadius:4,borderWidth:2,yAxisID:'y'},
        {label:'New',data:newCounts,backgroundColor:C.g,borderRadius:2,yAxisID:'y1'},
        {label:'Removed',data:removedCounts.map(v=>-v),backgroundColor:C.r,borderRadius:2,yAxisID:'y1'},
      ]}, options:{ responsive:true, plugins:{legend:{labels:{color:C.t,font:{size:12}}}},
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
