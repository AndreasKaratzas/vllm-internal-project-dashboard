/**
 * CI Analytics — Rich interactive views: Builds, Jobs, Queue
 * Inspired by professional CI dashboards with pipeline selectors,
 * stacked bar charts, failure rankings, and queue analysis.
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
    return h('span',{style:{display:'inline-block',width:size,height:size,borderRadius:'50%',background:colors[state]||C.m}});
  }

  function metricCard(label, value, sub, color) {
    return h('div',{style:{background:C.bg,border:`1px solid ${C.bd}`,borderRadius:'8px',padding:'16px 20px',borderTop:`3px solid ${color||C.b}`}},[
      h('div',{text:label,style:{fontSize:'11px',color:C.m,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:'4px'}}),
      h('div',{html:String(value),style:{fontSize:'28px',fontWeight:'800',color:color||C.t,lineHeight:'1.1'}}),
      sub?h('div',{html:sub,style:{fontSize:'12px',color:C.m,marginTop:'4px'}}):null,
    ]);
  }

  function progressBar(value, max, color, w='200px') {
    const pct = max>0 ? Math.round(value/max*100) : 0;
    return h('div',{style:{display:'inline-flex',alignItems:'center',gap:'6px'}},[
      h('div',{style:{width:w,height:'8px',background:C.bd,borderRadius:'4px',overflow:'hidden'}},[
        h('div',{style:{width:pct+'%',height:'100%',background:color,borderRadius:'4px',transition:'width .3s'}}),
      ]),
      h('span',{text:pct+'%',style:{fontSize:'12px',color,fontWeight:'600',minWidth:'36px'}}),
    ]);
  }

  const thS = a => ({textAlign:a||'left',padding:'8px 12px',borderBottom:`2px solid ${C.bd}`,color:C.m,fontSize:'10px',textTransform:'uppercase',fontWeight:'600',whiteSpace:'nowrap'});
  const tdS = a => ({textAlign:a||'left',padding:'6px 12px',borderBottom:`1px solid ${C.bd}`,color:C.t,fontSize:'13px'});

  // ═══════════ BUILDS VIEW ═══════════

  function renderBuildsView(box, data, pipeline) {
    const d = data[pipeline]; if (!d) return;
    const s = d.summary;

    // Metrics row
    const row = h('div',{style:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'20px'}});
    row.append(metricCard('Total Builds', s.total_builds, `Last ${d.days} days`, C.b));
    row.append(metricCard('Pass Rate', `${s.pass_rate}%`, `${s.passed} passed`, s.pass_rate>=80?C.g:s.pass_rate>=60?C.y:C.r));
    row.append(metricCard('Passed', s.passed, '', C.g));
    row.append(metricCard('Failed', s.failed, '', s.failed>0?C.r:C.g));
    box.append(row);

    // Stacked bar chart: pass/fail per day
    if (d.daily_stats?.length > 1) {
      const section = h('div',{style:{background:C.bg,border:`1px solid ${C.bd}`,borderRadius:'8px',padding:'20px',marginBottom:'20px'}});
      section.append(h('h3',{text:`Build Pass/Fail — ${d.daily_stats[0]?.date} — ${d.daily_stats[d.daily_stats.length-1]?.date}`,style:{marginBottom:'12px',fontSize:'14px'}}));
      const canvas = h('canvas',{style:{maxHeight:'220px'}});
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
          responsive:true, plugins:{legend:{labels:{color:C.t}}},
          scales:{
            x:{stacked:true,ticks:{color:C.m},grid:{color:C.bd}},
            y:{stacked:true,ticks:{color:C.m,stepSize:1},grid:{color:C.bd},beginAtZero:true}
          }
        }
      });
    }

    // Recent builds table with job matrix
    if (d.builds?.length) {
      const section = h('div',{style:{background:C.bg,border:`1px solid ${C.bd}`,borderRadius:'8px',padding:'20px',marginBottom:'20px'}});
      section.append(h('h3',{text:`Recent Builds`,style:{marginBottom:'12px',fontSize:'14px'}}));

      // Get unique job names across builds for columns
      const jobNames = new Set();
      d.builds.slice(0,20).forEach(b => b.jobs?.forEach(j => jobNames.add(j.name)));
      const sortedJobs = [...jobNames].sort();
      const showJobs = sortedJobs.length <= 40; // Only show matrix if not too many jobs

      const tbl = h('table',{style:{width:'100%',borderCollapse:'collapse',fontSize:'12px',overflowX:'auto',display:'block'}});
      const thead = h('thead');
      const headerRow = h('tr');
      headerRow.append(h('th',{text:'Date',style:thS()}));
      headerRow.append(h('th',{text:'Author',style:thS()}));
      headerRow.append(h('th',{text:'Status',style:thS('center')}));
      headerRow.append(h('th',{text:'Message',style:{...thS(),maxWidth:'200px'}}));
      if (showJobs) {
        for (const jn of sortedJobs.slice(0,30)) {
          const th = h('th',{style:{...thS('center'),writingMode:'vertical-lr',transform:'rotate(180deg)',maxHeight:'120px',padding:'4px 2px',fontSize:'9px'}});
          th.textContent = jn.length > 25 ? jn.slice(0,22)+'...' : jn;
          th.title = jn;
          headerRow.append(th);
        }
      }
      thead.append(headerRow);
      tbl.append(thead);

      const tbody = h('tbody');
      for (const b of d.builds.slice(0,20)) {
        const tr = h('tr');
        const dateStr = b.created_at ? new Date(b.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '';
        tr.append(h('td',{style:tdS()},[
          h('a',{text:dateStr,href:b.web_url,target:'_blank',style:{color:C.b}})
        ]));
        tr.append(h('td',{text:b.author||'',style:{...tdS(),maxWidth:'100px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}));
        tr.append(h('td',{style:tdS('center')},[stateDot(b.state)]));
        tr.append(h('td',{text:b.message||'',style:{...tdS(),maxWidth:'200px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'},title:b.message||''}));

        if (showJobs) {
          const jobMap = {};
          (b.jobs||[]).forEach(j => jobMap[j.name] = j.state);
          for (const jn of sortedJobs.slice(0,30)) {
            const st = jobMap[jn];
            tr.append(h('td',{style:{...tdS('center'),padding:'4px 2px'}},[
              st ? stateDot(st,'8px') : h('span',{text:'·',style:{color:C.bd}})
            ]));
          }
        }
        tbody.append(tr);
      }
      tbl.append(tbody);
      section.append(h('div',{style:{overflowX:'auto'}},[tbl]));
      box.append(section);
    }
  }

  // ═══════════ JOBS VIEW ═══════════

  function renderJobsView(box, data, pipeline) {
    const d = data[pipeline]; if (!d) return;
    const s = d.summary;

    const row = h('div',{style:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'20px'}});
    row.append(metricCard('Jobs with Failures', s.jobs_with_failures, '', s.jobs_with_failures>0?C.r:C.g));

    // Find highest fail rate
    const topFail = d.failure_ranking?.[0];
    row.append(metricCard('Highest Failure Rate', topFail ? topFail.fail_rate+'%' : '0%', topFail?.name||'', C.r));

    // Find slowest job
    const topDur = d.duration_ranking?.[0];
    row.append(metricCard('Slowest Job (p50)', topDur ? fmtDur(topDur.median_dur) : '-', topDur?.name||'', C.o));
    row.append(metricCard('Total Jobs Tracked', s.total_jobs_tracked, '', C.b));
    box.append(row);

    // Sub-tabs: Failure Ranking / Duration Ranking
    const tabBar = h('div',{style:{display:'flex',gap:'0',marginBottom:'16px',borderBottom:`1px solid ${C.bd}`}});
    const failTab = h('button',{text:'Failure Ranking',style:{background:'transparent',border:'none',borderBottom:`2px solid ${C.b}`,color:C.t,padding:'8px 16px',cursor:'pointer',fontSize:'13px',fontWeight:'600',fontFamily:'inherit'}});
    const durTab = h('button',{text:'Duration Ranking',style:{background:'transparent',border:'none',borderBottom:'2px solid transparent',color:C.m,padding:'8px 16px',cursor:'pointer',fontSize:'13px',fontWeight:'400',fontFamily:'inherit'}});
    tabBar.append(failTab, durTab);
    box.append(tabBar);

    const failContent = h('div');
    const durContent = h('div',{style:{display:'none'}});

    failTab.onclick = () => { failContent.style.display=''; durContent.style.display='none'; failTab.style.borderBottomColor=C.b; failTab.style.fontWeight='600'; failTab.style.color=C.t; durTab.style.borderBottomColor='transparent'; durTab.style.fontWeight='400'; durTab.style.color=C.m; };
    durTab.onclick = () => { durContent.style.display=''; failContent.style.display='none'; durTab.style.borderBottomColor=C.b; durTab.style.fontWeight='600'; durTab.style.color=C.t; failTab.style.borderBottomColor='transparent'; failTab.style.fontWeight='400'; failTab.style.color=C.m; };

    // Failure ranking table
    renderRankingTable(failContent, d.failure_ranking||[], 'failure');
    renderRankingTable(durContent, d.duration_ranking||[], 'duration');

    box.append(failContent, durContent);
  }

  function renderRankingTable(box, ranking, mode) {
    if (!ranking.length) { box.append(h('p',{text:'No data.',style:{color:C.m}})); return; }

    const INITIAL = 10;
    const section = h('div',{style:{background:C.bg,border:`1px solid ${C.bd}`,borderRadius:'8px',padding:'20px',marginBottom:'20px'}});
    const tbl = h('table',{style:{width:'100%',borderCollapse:'collapse',fontSize:'13px'}});
    const thead = h('thead');
    const hr = h('tr');
    hr.append(h('th',{text:'#',style:{...thS('center'),width:'30px'}}));
    hr.append(h('th',{text:'Job',style:thS()}));
    if (mode === 'failure') {
      hr.append(h('th',{text:'Failure Rate',style:thS()}));
      hr.append(h('th',{text:'Failures',style:thS('center')}));
      hr.append(h('th',{text:'Passes',style:thS('center')}));
      hr.append(h('th',{text:'Total Runs',style:thS('center')}));
    } else {
      hr.append(h('th',{text:'Median (p50)',style:thS()}));
      hr.append(h('th',{text:'p90',style:thS('center')}));
      hr.append(h('th',{text:'Avg',style:thS('center')}));
      hr.append(h('th',{text:'Max',style:thS('center')}));
      hr.append(h('th',{text:'Runs',style:thS('center')}));
    }
    thead.append(hr);
    tbl.append(thead);

    const tbody = h('tbody');
    ranking.forEach((j, i) => {
      const tr = h('tr',{style: i >= INITIAL ? {display:'none'} : {}});
      tr.dataset.idx = i;
      tr.append(h('td',{text:String(i+1),style:{...tdS('center'),color:C.m}}));

      // Job name with optional badges
      const nameCell = h('td',{style:tdS()});
      nameCell.append(h('span',{text:j.name}));
      if (j.is_soft_fail) nameCell.append(h('span',{text:'soft fail',style:{background:C.sf,color:'#fff',padding:'1px 6px',borderRadius:'3px',fontSize:'10px',marginLeft:'6px'}}));
      tr.append(nameCell);

      if (mode === 'failure') {
        // Failure rate bar
        const barColor = j.fail_rate >= 80 ? C.r : j.fail_rate >= 40 ? C.o : j.fail_rate >= 10 ? C.y : C.m;
        tr.append(h('td',{style:tdS()},[progressBar(j.fail_rate, 100, barColor, '150px')]));
        tr.append(h('td',{text:String(j.failed + (j.soft_failed||0)),style:{...tdS('center'),color:C.r,fontWeight:'600'}}));
        tr.append(h('td',{text:String(j.passed),style:{...tdS('center'),color:C.g}}));
        tr.append(h('td',{text:String(j.runs),style:tdS('center')}));
      } else {
        // Duration bar (relative to max)
        const maxDur = ranking[0]?.median_dur || 1;
        tr.append(h('td',{style:tdS()},[
          progressBar(j.median_dur||0, maxDur, C.b, '150px'),
          h('span',{text:fmtDur(j.median_dur),style:{marginLeft:'8px',fontSize:'12px',color:C.t}})
        ]));
        tr.append(h('td',{text:fmtDur(j.p90_dur),style:tdS('center')}));
        tr.append(h('td',{text:fmtDur(j.avg_dur),style:tdS('center')}));
        tr.append(h('td',{text:fmtDur(j.max_dur),style:tdS('center')}));
        tr.append(h('td',{text:String(j.runs),style:tdS('center')}));
      }
      tbody.append(tr);
    });
    tbl.append(tbody);
    section.append(tbl);
    if (ranking.length > INITIAL) {
      const btn = h('button',{text:`Show all ${ranking.length} jobs`,style:{background:C.bd,border:'none',color:C.t,padding:'6px 16px',borderRadius:'4px',cursor:'pointer',fontSize:'12px',marginTop:'8px',fontFamily:'inherit'}});
      btn.onclick = () => { tbody.querySelectorAll('tr').forEach(r => r.style.display = ''); btn.remove(); };
      section.append(btn);
    }
    box.append(section);
  }

  // ═══════════ QUEUE VIEW ═══════════

  function renderQueueView(box, data, pipeline) {
    const d = data[pipeline]; if (!d) return;
    const qs = d.queue_stats || [];
    if (!qs.length) { box.append(h('p',{text:'No queue data.',style:{color:C.m}})); return; }

    const topWait = qs[0];
    const totalJobs = qs.reduce((a,q) => a + q.jobs, 0);

    const row = h('div',{style:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'20px'}});
    row.append(metricCard('Total Jobs', totalJobs.toLocaleString(), '', C.b));
    row.append(metricCard('Longest p50 Wait', fmtDur(topWait?.median_wait), topWait?.queue||'', C.r));
    row.append(metricCard('Longest p90 Wait', fmtDur(topWait?.p90_wait), topWait?.queue||'', C.o));
    row.append(metricCard('Queues Active', qs.length, '', C.b));
    box.append(row);

    // Queue ranking table
    const section = h('div',{style:{background:C.bg,border:`1px solid ${C.bd}`,borderRadius:'8px',padding:'20px',marginBottom:'20px'}});
    section.append(h('h3',{text:'Queue Wait Time Ranking',style:{marginBottom:'12px',fontSize:'14px'}}));

    const tbl = h('table',{style:{width:'100%',borderCollapse:'collapse',fontSize:'13px'}});
    const thead = h('thead');
    const hr = h('tr');
    hr.append(h('th',{text:'#',style:{...thS('center'),width:'30px'}}));
    hr.append(h('th',{text:'Queue',style:thS()}));
    hr.append(h('th',{text:'p50 Wait',style:thS()}));
    hr.append(h('th',{text:'p90 Wait',style:thS('center')}));
    hr.append(h('th',{text:'Avg Wait',style:thS('center')}));
    hr.append(h('th',{text:'Max Wait',style:thS('center')}));
    hr.append(h('th',{text:'Jobs',style:thS('center')}));
    thead.append(hr);
    tbl.append(thead);

    const tbody = h('tbody');
    const maxWait = qs[0]?.median_wait || 1;
    qs.forEach((q, i) => {
      const tr = h('tr');
      tr.append(h('td',{text:String(i+1),style:{...tdS('center'),color:C.m}}));
      tr.append(h('td',{text:q.queue,style:{...tdS(),fontWeight:'600'}}));

      const wColor = (q.median_wait||0) > 10 ? C.r : (q.median_wait||0) > 5 ? C.o : (q.median_wait||0) > 2 ? C.y : C.g;
      tr.append(h('td',{style:tdS()},[
        progressBar(q.median_wait||0, maxWait, wColor, '120px'),
        h('span',{text:fmtDur(q.median_wait),style:{marginLeft:'8px',fontSize:'12px'}})
      ]));
      tr.append(h('td',{text:fmtDur(q.p90_wait),style:tdS('center')}));
      tr.append(h('td',{text:fmtDur(q.avg_wait),style:tdS('center')}));
      tr.append(h('td',{text:fmtDur(q.max_wait),style:tdS('center')}));
      tr.append(h('td',{text:q.jobs.toLocaleString(),style:tdS('center')}));
      tbody.append(tr);
    });
    tbl.append(tbody);
    section.append(tbl);
    box.append(section);
  }

  // ═══════════ MAIN RENDER ═══════════

  async function render() {
    const container = document.getElementById('ci-analytics-view');
    if (!container) return;
    container.innerHTML = '<p style="color:#8b949e">Loading analytics...</p>';

    const data = await J('data/vllm/ci/analytics.json');
    if (!data) { container.innerHTML = '<p style="color:#8b949e">No analytics data. Run collect_analytics.py.</p>'; return; }
    container.innerHTML = '';

    const pipelines = Object.keys(data);
    let activePipeline = pipelines[0] || 'amd-ci';
    let activeView = 'builds';

    // Title
    container.append(h('h2',{text:'CI Analytics',style:{marginBottom:'4px'}}));

    // Pipeline selector + View tabs
    const controls = h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px',flexWrap:'wrap',gap:'8px'}});

    // Pipeline dropdown with "Compare" option
    const pipelineRow = h('div',{style:{display:'flex',alignItems:'center',gap:'8px'}});
    pipelineRow.append(h('span',{text:'Pipeline',style:{color:C.m,fontSize:'12px'}}));
    const pipelineSelect = h('select',{style:{background:C.bg,color:C.t,border:`1px solid ${C.bd}`,borderRadius:'4px',padding:'6px 12px',fontSize:'13px',fontFamily:'inherit',cursor:'pointer'}});
    for (const p of pipelines) {
      const opt = h('option',{value:p,text:data[p]?.display_name || p});
      if (p === activePipeline) opt.selected = true;
      pipelineSelect.append(opt);
    }
    if (pipelines.length > 1) {
      const cmpOpt = h('option',{value:'__compare__',text:'Compare (Side-by-Side)'});
      pipelineSelect.append(cmpOpt);
    }
    pipelineRow.append(pipelineSelect);
    pipelineRow.append(h('span',{text:'Nightly builds only',style:{color:C.m,fontSize:'11px',fontStyle:'italic'}}));
    controls.append(pipelineRow);

    // View tabs
    const viewTabs = h('div',{style:{display:'flex',gap:'0',borderBottom:`1px solid ${C.bd}`}});
    const views = [{id:'builds',label:'Builds'},{id:'jobs',label:'Jobs'},{id:'queue',label:'Queue'}];
    const tabBtns = {};
    for (const v of views) {
      const btn = h('button',{text:v.label,style:{background:'transparent',border:'none',borderBottom:v.id==='builds'?`2px solid ${C.b}`:'2px solid transparent',color:v.id==='builds'?C.t:C.m,padding:'8px 16px',cursor:'pointer',fontSize:'13px',fontWeight:v.id==='builds'?'600':'400',fontFamily:'inherit'}});
      btn.dataset.view = v.id;
      tabBtns[v.id] = btn;
      viewTabs.append(btn);
    }
    controls.append(viewTabs);
    container.append(controls);

    // Content area
    const content = h('div');
    container.append(content);

    function renderContent() {
      content.innerHTML = '';
      if (activePipeline === '__compare__') {
        // Side-by-side comparison
        const grid = h('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px'}});
        for (const p of pipelines) {
          const col = h('div');
          col.append(h('h3',{text:data[p]?.display_name || p,style:{marginBottom:'12px',color:C.b,borderBottom:`2px solid ${C.b}`,paddingBottom:'6px'}}));
          if (activeView === 'builds') renderBuildsView(col, data, p);
          else if (activeView === 'jobs') renderJobsView(col, data, p);
          else if (activeView === 'queue') renderQueueView(col, data, p);
          grid.append(col);
        }
        content.append(grid);
      } else {
        if (activeView === 'builds') renderBuildsView(content, data, activePipeline);
        else if (activeView === 'jobs') renderJobsView(content, data, activePipeline);
        else if (activeView === 'queue') renderQueueView(content, data, activePipeline);
      }
    }

    // Event handlers
    pipelineSelect.onchange = () => { activePipeline = pipelineSelect.value; renderContent(); };
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
    if (p) obs.observe(p, {attributes:true, attributeFilter:['class']});
  });
})();
