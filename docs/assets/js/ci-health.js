/**
 * CI Health Dashboard v3 — Full visual redesign.
 * Project selector, 4-card metrics, 3-col hardware, heatmap, collapsible groups.
 */
(function () {
  const CI = 'data/vllm/ci', VD = 'data/vllm';
  const C = { g:'#238636',y:'#d29922',o:'#db6d28',r:'#da3633',b:'#1f6feb',p:'#8957e5',m:'#8b949e',t:'#e6edf3',bg:'#161b22',bg2:'#0d1117',bd:'#30363d' };
  const LC = { passing:C.g,failing:C.r,new_failure:'#f85149',fixed:'#3fb950',flaky:C.y,skipped:C.m,new_test:C.b,quarantined:C.p };
  const AREAS = ['kernels','entrypoints','distributed','compile','engine','lora','multi-modal','multimodal','quantiz','language models','basic correctness','benchmark','regression','examples','v1','lm eval','gpqa','ray','nixl','weight loading','fusion','batch invariance','model executor','attention benchmark','spec decode','transformers','plugin','sampler','python-only','pytorch','model runner'];

  const J = async u => { try { const r = await fetch(u); return r.ok ? r.json() : null } catch { return null } };
  const pct = (v,d=1) => (v*100).toFixed(d)+'%';
  const rc = r => r>=.95?C.g:r>=.85?C.y:r>=.7?C.o:C.r;

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

  function area(name) {
    const l=(name||'').toLowerCase();
    for(const a of AREAS) if(l.startsWith(a)||l.includes(a)) return a.replace(/\s+/g,'-');
    return 'other'
  }

  function bar(rate,w='120px') {
    return h('div',{style:{display:'inline-flex',alignItems:'center',gap:'6px'}},[
      h('div',{style:{width:w,height:'6px',background:C.bd,borderRadius:'3px',overflow:'hidden'}},[
        h('div',{style:{width:Math.round(rate*100)+'%',height:'100%',background:rc(rate),borderRadius:'3px'}})
      ]),
      h('span',{text:pct(rate,0),style:{fontSize:'12px',color:rc(rate),fontWeight:'600',minWidth:'36px'}})
    ])
  }

  function dots(hist) {
    const s=h('span',{style:{display:'inline-flex',gap:'2px',alignItems:'center'}});
    for(const x of hist)s.append(h('span',{style:{width:'7px',height:'7px',borderRadius:'50%',background:x==='P'?C.g:x==='F'?C.r:C.m,display:'inline-block'}}));
    return s
  }

  // Project selector removed — handled by sidebar navigation

  // ═══════════════════════ METRIC CARDS ROW ═══════════════════════
  function renderMetrics(box,health,parity) {
    if(!health?.amd?.latest_build) return;
    const a=health.amd.latest_build;
    const u=health.upstream?.latest_build;

    const row=h('div',{style:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'20px'}});

    // Clickable card — shows overlay with details
    // bigHtml can be a string (text) or raw HTML
    const card=(label,big,sub,color,onclick,{bigHtml}={})=>{
      const c=h('div',{style:{background:C.bg,border:`1px solid ${C.bd}`,borderRadius:'8px',padding:'16px 20px',borderTop:`3px solid ${color}`,cursor:'pointer',transition:'transform .15s,box-shadow .15s'}});
      c.onmouseenter=()=>{c.style.transform='translateY(-2px)';c.style.boxShadow='0 4px 12px rgba(0,0,0,.3)'};
      c.onmouseleave=()=>{c.style.transform='';c.style.boxShadow=''};
      if(onclick) c.onclick=onclick;
      c.append(h('div',{text:label,style:{fontSize:'clamp(12px,0.85vw,16px)',color:C.m,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:'6px'}}));
      if(bigHtml) c.append(h('div',{html:bigHtml,style:{fontSize:'clamp(28px,2.2vw,42px)',fontWeight:'800',lineHeight:'1.1'}}));
      else c.append(h('div',{text:String(big),style:{fontSize:'clamp(28px,2.2vw,42px)',fontWeight:'800',color,lineHeight:'1.1'}}));
      if(sub)c.append(h('div',{html:sub,style:{fontSize:'clamp(12px,0.85vw,16px)',color:C.m,marginTop:'6px'}}));
      return c
    };

    // Use merged group counts
    const mergedGroups=parity?.job_groups?(typeof mergeShardedGroups==='function'?mergeShardedGroups(parity.job_groups):parity.job_groups):[];
    const mergedAmdGroups=mergedGroups.filter(g=>g.amd).length;
    const failingGroups=mergedGroups.filter(g=>g.amd&&(g.amd.failed||0)>0);
    const passingGroups=mergedGroups.filter(g=>g.amd&&(g.amd.failed||0)===0);

    // AMD Pass Rate card -> opens build link
    row.append(card('AMD Pass Rate',pct(a.pass_rate,1),`Build #${a.build_number} &bull; ${a.total_tests.toLocaleString()} tests`,rc(a.pass_rate),
      ()=>{ if(a.build_url) window.open(a.build_url,'_blank'); }));

    // Test Failures card -> overlay with failing groups (split AMD / upstream)
    const amdFail=a.failed+a.errors;
    const upFail=u?(u.failed+(u.errors||0)):0;
    const failBigHtml=`<span style="color:${C.r}">${amdFail}</span>`+(u?`<span style="color:${C.m};font-size:clamp(16px,1.2vw,24px);font-weight:400"> / </span><span style="color:${C.b}">${upFail}</span>`:'');
    const failSub=`<span style="color:${C.r}">AMD</span>${u?` &bull; <span style="color:${C.b}">Upstream</span>`:''} &bull; ${mergedAmdGroups||a.test_groups} groups`;
    row.append(card('Test Failures',null,failSub,C.r,
      ()=>{
        if(!failingGroups.length){const el=document.querySelector('h3[data-parity-title]');if(el)el.scrollIntoView({behavior:'smooth'});return}
        showGroupOverlay_health('Failing Tests',failingGroups,C.r,amdFail,upFail);
      },{bigHtml:failBigHtml}));

    // Test groups card -> overlay with all groups
    if(mergedAmdGroups) {
      const groupRate=passingGroups.length/mergedAmdGroups;
      const failCount=failingGroups.length;
      const sub=`${passingGroups.length} passing${failCount>0?' &bull; <span style="color:'+C.r+'">'+failCount+' failing</span>':''}`;
      row.append(card('Test Groups',`${passingGroups.length}/${mergedAmdGroups}`,sub,rc(groupRate),
        ()=>showGroupOverlay_health('Passing Test Groups (AMD)',passingGroups,C.g)));
    } else if(a.unique_test_groups) {
      const orRate=a.test_groups_passing_or/a.unique_test_groups;
      const sub=`${a.test_groups_passing_all} strict (all HW)${a.test_groups_partial>0?' &bull; <span style="color:'+C.y+'">'+a.test_groups_partial+' partial</span>':''}`;
      row.append(card('Test Groups',`${a.test_groups_passing_or}/${a.unique_test_groups}`,sub,rc(orRate),
        ()=>showGroupOverlay_health('Passing Test Groups (AMD)',passingGroups,C.g)));
    } else {
      row.append(card('Test Groups',mergedAmdGroups||a.test_groups,`${a.jobs_passed||0} jobs passed`,C.b,
        ()=>showGroupOverlay_health('All Test Groups (AMD)',mergedGroups.filter(g=>g.amd),C.b)));
    }

    // Parity card -> overlay with 3-tab parity breakdown
    if(mergedGroups.length) {
      const bothGroups=mergedGroups.filter(g=>g.amd&&g.upstream);
      const aOnlyGroups=mergedGroups.filter(g=>g.amd&&!g.upstream);
      const uOnlyGroups=mergedGroups.filter(g=>!g.amd&&g.upstream);
      row.append(card('Coverage Parity',`${bothGroups.length} common`,`${aOnlyGroups.length} AMD-only &bull; ${uOnlyGroups.length} upstream-only`,C.p,
        ()=>showParityOverlay(bothGroups,aOnlyGroups,uOnlyGroups)));
    } else if(u) {
      row.append(card('Upstream',pct(u.pass_rate,1),`Build #${u.build_number} &bull; ${u.total_tests.toLocaleString()} tests`,rc(u.pass_rate)));
    }

    box.append(row);
  }

  // ═══════════════════════ HARDWARE BREAKDOWN (consolidated) ═══════════════════════
  function renderHardware(box,health) {
    if(!health?.amd?.latest_build?.by_hardware) return;
    const bh=health.amd.latest_build.by_hardware;
    const hws=Object.entries(bh).filter(([k])=>k!=='unknown').sort();
    if(!hws.length) return;

    const hwNames={mi250:'MI250 (gfx90a)',mi325:'MI325 (gfx942)',mi355:'MI355 (gfx950)'};

    const det=h('details',{open:true,style:{marginBottom:'20px',background:C.bg,border:`1px solid ${C.bd}`,borderRadius:'8px'}});
    det.append(h('summary',{text:'Hardware Breakdown',style:{padding:'12px 16px',cursor:'pointer',fontSize:'14px',fontWeight:'600'}}));
    const inner=h('div',{style:{padding:'0 16px 16px'}});

    // Compact table — show test GROUP pass rate (not individual test pass rate)
    const tbl=h('table',{style:{width:'100%',borderCollapse:'collapse'}});
    tbl.append(h('thead',{},[h('tr',{},[
      h('th',{text:'Hardware',style:ts()}),
      h('th',{text:'Group Pass Rate',style:ts()}),
      h('th',{text:'Groups Passing',style:ts('center')}),
      h('th',{text:'Groups Failing',style:ts('center')}),
      h('th',{text:'Total Groups',style:ts('center')}),
      h('th',{text:'Tests (P/F/S)',style:ts('center')}),
    ])]));
    const tb=h('tbody');
    for(const[hw,c]of hws) {
      const gFail=c.groups_failed||0;
      const gTotal=c.groups||0;
      const gPass=gTotal-gFail;
      const gRate=gTotal>0?gPass/gTotal:1;
      const tr=h('tr');
      tr.append(h('td',{text:hwNames[hw]||String(hw||'unknown').toUpperCase(),style:{...td(),fontWeight:'700'}}));
      tr.append(h('td',{style:td()},[ bar(gRate,'120px') ]));
      tr.append(h('td',{text:String(gPass),style:{...tdo('center'),color:C.g,fontWeight:'600'}}));
      tr.append(h('td',{text:String(gFail),style:{...tdo('center'),color:gFail>0?C.r:C.g,fontWeight:'600'}}));
      tr.append(h('td',{text:String(gTotal),style:tdo('center')}));
      tr.append(h('td',{html:`<span style="color:${C.g}">${c.passed.toLocaleString()}</span> / <span style="color:${c.failed>0?C.r:C.m}">${c.failed}</span> / <span style="color:${C.m}">${c.skipped.toLocaleString()}</span>`,style:tdo('center')}));
      tb.append(tr);
    }
    tbl.append(tb);
    inner.append(tbl);
    det.append(inner);
    box.append(det);
  }

  // ═══════════════════════ TREND CHART ═══════════════════════
  function renderTrend(box,health) {
    if(!health?.amd?.builds||health.amd.builds.length<2) return;
    const det=h('details',{open:true,style:{marginBottom:'20px',background:C.bg,border:`1px solid ${C.bd}`,borderRadius:'8px'}});
    det.append(h('summary',{text:'Pass Rate Trend (7 days)',style:{padding:'12px 16px',cursor:'pointer',fontSize:'14px',fontWeight:'600'}}));
    const canvas=h('canvas',{style:{maxHeight:'200px',padding:'0 16px 16px'}});
    det.append(canvas);
    box.append(det);

    const amd=[...health.amd.builds].reverse();
    const up=health.upstream?.builds?[...health.upstream.builds].reverse():[];
    new Chart(canvas,{type:'line',data:{
      labels:amd.map(b=>b.created_at?.slice(5,10)||''),
      datasets:[
        {label:'AMD',data:amd.map(b=>+(b.pass_rate*100).toFixed(1)),borderColor:C.r,backgroundColor:'rgba(218,54,51,.08)',tension:.3,fill:true,pointRadius:3},
        ...(up.length?[{label:'Upstream',data:up.map(b=>+(b.pass_rate*100).toFixed(1)),borderColor:C.b,backgroundColor:'rgba(31,111,235,.08)',tension:.3,fill:true,pointRadius:3}]:[]),
      ]},options:{responsive:true,plugins:{legend:{labels:{color:C.t}}},scales:{
        y:{min:90,max:100,ticks:{color:C.m,callback:v=>v+'%'},grid:{color:C.bd}},
        x:{ticks:{color:C.m},grid:{color:C.bd}},
      }}
    });
  }

  // ═══════════════════════ HEALTH BAR ═══════════════════════
  function renderHealthBar(box,health) {
    if(!health?.test_counts) return;
    const tc=health.test_counts;
    const total=Object.values(tc).reduce((a,b)=>a+b,0);
    if(!total) return;

    const det=h('details',{style:{marginBottom:'20px',background:C.bg,border:`1px solid ${C.bd}`,borderRadius:'8px'}});
    det.append(h('summary',{text:'Test Group Health (across 7-day history)',style:{padding:'12px 16px',cursor:'pointer',fontSize:'14px',fontWeight:'600'}}));
    const inner=h('div',{style:{padding:'0 16px 16px'}});

    const b=h('div',{style:{display:'flex',height:'16px',borderRadius:'4px',overflow:'hidden',marginBottom:'8px'}});
    const leg=h('div',{style:{display:'flex',flexWrap:'wrap',gap:'10px',fontSize:'12px'}});
    for(const l of ['passing','new_test','skipped','flaky','failing','new_failure','fixed']) {
      const n=tc[l]||0; if(!n) continue;
      b.append(h('div',{title:`${l}: ${n}`,style:{width:(n/total*100)+'%',background:LC[l]||C.m,minWidth:'2px'}}));
      leg.append(h('span',{},[h('span',{style:{display:'inline-block',width:'8px',height:'8px',borderRadius:'2px',background:LC[l]||C.m,marginRight:'4px'}}),`${l} (${n})`]));
    }
    inner.append(b,leg);
    det.append(inner);
    box.append(det);
  }

  // ═══════════════════════ HEATMAP ═══════════════════════
  function renderHeatmap(box,parity) {
    if(!parity?.job_groups) return;
    const allMerged=typeof mergeShardedGroups==='function'?mergeShardedGroups(parity.job_groups):parity.job_groups;
    const groups=allMerged.filter(g=>g.amd&&g.upstream);
    if(!groups.length) return;

    const areas={};
    for(const g of groups) {
      const a=area(g.name);
      if(!areas[a])areas[a]={pass:0,fail:0,total:0};
      if((g.amd.failed||0)>0)areas[a].fail++;else areas[a].pass++;
      areas[a].total++;
    }

    const det=h('details',{open:true,style:{marginBottom:'20px',background:C.bg,border:`1px solid ${C.bd}`,borderRadius:'8px'}});
    det.append(h('summary',{text:'Test Area Health',style:{padding:'12px 16px',cursor:'pointer',fontSize:'14px',fontWeight:'600'}}));
    const grid=h('div',{style:{display:'flex',flexWrap:'wrap',gap:'6px',padding:'0 16px 16px'}});

    for(const[a,d]of Object.entries(areas).sort((a,b)=>b[1].total-a[1].total)) {
      const r=d.pass/d.total;
      const w=Math.max(80,Math.min(140,d.total*15));
      const cell=h('div',{title:`${a.replace(/-/g,' ')}: ${d.pass}/${d.total} pass`,style:{
        width:w+'px',height:'40px',background:rc(r),borderRadius:'6px',display:'flex',alignItems:'center',
        justifyContent:'center',cursor:'pointer',fontSize:'12px',color:'#fff',fontWeight:'600',
        padding:'4px 8px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',opacity:r>=1?'.65':'1',
      },text:a.replace(/-/g,' ')});
      cell.onclick=()=>{const el=document.querySelector(`details[data-area="${a}"]`);if(el){el.open=true;el.scrollIntoView({behavior:'smooth',block:'nearest'})}};
      grid.append(cell);
    }
    det.append(grid);
    box.append(det);
  }

  // ═══════════════════════ GROUPED PARITY ═══════════════════════
  function renderGroups(box,parity) {
    if(!parity?.job_groups) return;
    const all=typeof mergeShardedGroups==='function'?mergeShardedGroups(parity.job_groups):parity.job_groups;
    const both=all.filter(g=>g.amd&&g.upstream);
    const aOnly=all.filter(g=>g.amd&&!g.upstream);
    const uOnly=all.filter(g=>!g.amd&&g.upstream);

    const section=h('div',{style:{marginBottom:'20px'}});
    section.append(h('h3',{text:'Runtime Parity','data-parity-title':'1',style:{marginBottom:'8px',fontSize:'16px'}}));

    // Filters
    const fb=h('div',{style:{display:'flex',gap:'4px',flexWrap:'wrap',marginBottom:'12px'}});
    const filters=[{l:'All',v:'all'},{l:`Regressions`,v:'regression'},{l:'Both Pass',v:'pass'},{l:`AMD-only (${aOnly.length})`,v:'amd-only'},{l:`Upstream-only (${uOnly.length})`,v:'up-only'}];
    let active='all';
    const container=h('div');

    for(const f of filters) {
      const btn=h('button',{text:f.l,'data-filter':f.v,style:{background:f.v==='all'?C.b:C.bd,border:'none',color:C.t,padding:'6px 14px',borderRadius:'4px',cursor:'pointer',fontSize:'13px',fontFamily:'inherit'}});
      btn.onclick=()=>{
        active=f.v;fb.querySelectorAll('button').forEach(b=>b.style.background=C.bd);btn.style.background=C.b;
        container.querySelectorAll('details[data-area]').forEach(d=>{
          if(f.v==='all')d.style.display='';
          else if(f.v==='amd-only'||f.v==='up-only')d.style.display='none';
          else d.style.display=d.dataset.status===f.v||(f.v==='regression'&&d.dataset.status==='regression')?'':'none';
        });
        const amdSec=container.querySelector('[data-sec="amd-only"]');if(amdSec)amdSec.style.display=f.v==='amd-only'?'':'none';
        const upSec=container.querySelector('[data-sec="up-only"]');if(upSec)upSec.style.display=f.v==='up-only'?'':'none';
      };
      fb.append(btn);
    }
    section.append(fb);

    // Group by area
    const byArea={};
    for(const g of both){const a=area(g.name);(byArea[a]=byArea[a]||[]).push(g)}

    for(const[a,gs]of Object.entries(byArea).sort((a,b)=>a[0].localeCompare(b[0]))) {
      const regs=gs.filter(g=>(g.amd.failed||0)>0&&(g.upstream.failed||0)===0);
      const allP=gs.every(g=>(g.amd.failed||0)===0);
      const det=h('details',{'data-area':a,'data-status':regs.length>0?'regression':allP?'pass':'fail',style:{marginBottom:'4px',background:C.bg,border:`1px solid ${C.bd}`,borderRadius:'6px'}});
      if(regs.length>0) det.open=true;

      const r=gs.filter(g=>(g.amd.failed||0)===0).length/gs.length;
      det.append(h('summary',{style:{padding:'10px 14px',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:'13px'}},[
        h('span',{style:{fontWeight:'600'}},[
          h('span',{style:{width:'8px',height:'8px',borderRadius:'50%',background:regs.length>0?C.r:allP?C.g:C.o,display:'inline-block',marginRight:'6px'}}),
          a.replace(/-/g,' ')+' ',
          h('span',{text:`(${gs.length} groups${regs.length?`, ${regs.length} regressions`:''})`,style:{color:C.m,fontWeight:'400'}})
        ]),
        bar(r,'80px')
      ]));

      const tbl=h('table',{style:{width:'100%',borderCollapse:'collapse',fontSize:'14px'}});
      tbl.append(h('thead',{},[h('tr',{},[
        h('th',{text:'Test Group',style:ts()}),h('th',{html:'AMD P/F/S',style:ts('center')}),
        h('th',{html:'Upstream P/F/S',style:ts('center')}),h('th',{text:'Hardware',style:ts('center')}),
        h('th',{text:'Status',style:ts('center')})
      ])]));
      const tb=h('tbody');
      for(const g of gs.sort((a,b)=>(b.amd.failed||0)-(a.amd.failed||0))) {
       try {
        const af=(g.amd.failed||0),uf=(g.upstream?.failed||0);
        let st,sc;
        if(!af&&!uf){st='Both pass';sc=C.g}
        else if(af&&!uf){st='AMD regression';sc=C.r}
        else if(!af&&uf){st='AMD advantage';sc=C.b}
        else{st='Both fail';sc=C.o}

        // Hardware column — show all hardware this TG runs on
        const hwList = g.hardware || [];
        const hwf = g.hw_failures || {};
        const hwHtml = hwList.length ? hwList.map(hw => {
          const failCnt = hwf[hw];
          if (failCnt) return `<span style="background:${C.r}22;color:${C.r};padding:3px 8px;border-radius:3px;font-size:13px;margin:1px;font-weight:600">${hw}: ${failCnt}f</span>`;
          return `<span style="color:${C.g};font-size:13px;margin:1px">${hw}</span>`;
        }).join(' ') : '<span style="color:'+C.m+'">—</span>';

        // Main row
        const mainRow = h('tr', {style:{cursor:af>0?'pointer':'default'}});
        const nameCell=h('td',{style:td()});
        if(typeof makeGroupLinks==='function'){nameCell.append(makeGroupLinks(g.name,!!g.amd,!!g.upstream))}else{nameCell.textContent=g.name}
        mainRow.append(nameCell);
        mainRow.append(h('td',{html:`<span style="color:${C.g}">${g.amd.passed||0}</span>/<span style="color:${C.r}">${af}</span>/<span style="color:${C.m}">${g.amd.skipped||0}</span>`,style:td('center')}));
        mainRow.append(h('td',{html:`<span style="color:${C.g}">${g.upstream?.passed||0}</span>/<span style="color:${C.r}">${uf}</span>/<span style="color:${C.m}">${g.upstream?.skipped||0}</span>`,style:td('center')}));
        mainRow.append(h('td',{html:hwHtml,style:td('center')}));
        mainRow.append(h('td',{html:`<span style="color:${sc};font-weight:600${af>0?';cursor:pointer;text-decoration:underline':''}">${st}</span>`,style:td('center')}));
        tb.append(mainRow);

        // Expandable detail row for failures
        if (af > 0) {
          const detailRow = h('tr',{style:{display:'none'}});
          const detailCell = h('td',{colspan:'5',style:{padding:'12px 16px',background:C.bg2,borderBottom:`1px solid ${C.bd}`}});
          const dc = h('div',{style:{fontSize:'13px'}});

          // HW failure breakdown
          if (hwf && typeof hwf==='object' && Object.keys(hwf).length) {
            dc.append(h('div',{style:{marginBottom:'10px'}},[
              h('span',{text:'Failures by hardware: ',style:{color:C.m,fontWeight:'600'}}),
              ...Object.entries(hwf).map(([hw,cnt])=>h('span',{text:`${String(hw||'unknown').toUpperCase()}: ${cnt}`,style:{background:C.r+'22',color:C.r,padding:'4px 10px',borderRadius:'4px',marginLeft:'4px',fontWeight:'700',fontSize:'13px'}}))
            ]));
          }

          // Job links — click to view logs on Buildkite
          if (g.job_links?.length) {
            dc.append(h('div',{text:'View logs on Buildkite:',style:{color:C.m,fontWeight:'600',marginBottom:'6px'}}));
            const linkRow = h('div',{style:{display:'flex',gap:'8px',flexWrap:'wrap'}});
            for (const jl of g.job_links) {
              if(!jl) continue;
              linkRow.append(h('a',{text:`${String(jl.hw||'unknown').toUpperCase()} — ${jl.job_name||'unknown'}`,href:jl.url||'#',target:'_blank',style:{color:C.b,fontSize:'13px',padding:'4px 10px',background:C.b+'15',borderRadius:'4px',textDecoration:'none',border:`1px solid ${C.b}33`}}));
            }
            dc.append(linkRow);
          }

          // Individual failure test names
          if (g.failure_tests?.length) {
            dc.append(h('div',{text:'Failed tests:',style:{color:C.m,fontWeight:'600',marginTop:'10px',marginBottom:'4px'}}));
            const ul = h('ul',{style:{margin:'0 0 0 16px',color:C.t}});
            for (const t of g.failure_tests) ul.append(h('li',{text:t,style:{fontFamily:'monospace',fontSize:'12px',padding:'2px 0'}}));
            dc.append(ul);
          }

          detailCell.append(dc);
          detailRow.append(detailCell);
          tb.append(detailRow);

          mainRow.onclick = () => { detailRow.style.display = detailRow.style.display === 'none' ? '' : 'none'; };
        }
       } catch(ge) { console.error('Group render error:',g.name,ge); }
      }
      tbl.append(tb);
      det.append(h('div',{style:{padding:'0 12px 10px'}},[tbl]));
      container.append(det);
    }

    // AMD-only / Upstream-only — always visible as collapsible sections
    for(const[key,list,color,label]of[['amd-only',aOnly,C.r,'AMD-Only'],['up-only',uOnly,C.b,'Upstream-Only']]) {
      if(!list.length) continue;
      const det=h('details',{'data-sec':key,style:{marginTop:'8px',background:C.bg,border:`1px solid ${C.bd}`,borderRadius:'6px'}});
      det.append(h('summary',{html:`<span style="color:${color};font-weight:600">${label} Test Groups</span> <span style="color:${C.m}">(${list.length})</span>`,style:{padding:'12px 16px',cursor:'pointer',fontSize:'14px'}}));
      const grid=h('div',{style:{display:'flex',flexWrap:'wrap',gap:'6px',padding:'4px 16px 14px'}});
      for(const g of list.sort((a,b)=>(a.name||'').localeCompare(b.name||''))) {
        const pipeline=key==='amd-only'?'amd':'upstream';
        const chip=h('a',{text:(g.amd_job_name||g.upstream_job_name||g.name),href:bkSearchUrl(g.name,pipeline),target:'_blank',style:{
          padding:'4px 10px',borderRadius:'4px',fontSize:'13px',
          background:color+'15',border:`1px solid ${color}33`,color:C.t,
          textDecoration:'none',transition:'all .15s',display:'inline-block',
        }});
        chip.onmouseenter=()=>{chip.style.background=color+'30';chip.style.color='#58a6ff'};
        chip.onmouseleave=()=>{chip.style.background=color+'15';chip.style.color=C.t};
        grid.append(chip);
      }
      det.append(grid);
      container.append(det);
    }

    section.append(container);
    box.append(section);
  }

  // ═══════════════════════ COLLAPSIBLE SECTIONS ═══════════════════════

  function renderFlaky(box,flaky) {
    if(!flaky?.tests?.length) return;
    const det=h('details',{style:{marginBottom:'8px',background:C.bg,border:`1px solid ${C.bd}`,borderRadius:'8px'}});
    det.append(h('summary',{html:`Flaky Tests <span style="color:${C.y}">(${flaky.total_flaky})</span>`,style:{padding:'12px 16px',cursor:'pointer',fontSize:'14px',fontWeight:'600'}}));
    const tbl=h('table',{style:{width:'100%',borderCollapse:'collapse',fontSize:'14px',margin:'0 0 12px'}});
    tbl.append(h('thead',{},[h('tr',{},[h('th',{text:'Test',style:ts()}),h('th',{text:'Rate',style:ts('center')}),h('th',{text:'History',style:ts('center')})])]));
    const tb=h('tbody');
    for(const t of flaky.tests)
      tb.append(h('tr',{},[
        h('td',{text:t.test_id.replace('::__job_level__',''),style:td()}),
        h('td',{text:pct(t.pass_rate),style:{...tdo('center'),color:C.y,fontWeight:'600'}}),
        h('td',{style:td('center')},[dots(t.history)])
      ]));
    tbl.append(tb);
    det.append(h('div',{style:{padding:'0 16px 12px'}},[tbl]));
    box.append(det);
  }

  function renderOffenders(box,trends) {
    if(!trends?.top_offenders?.length) return;
    const det=h('details',{style:{marginBottom:'8px',background:C.bg,border:`1px solid ${C.bd}`,borderRadius:'8px'}});
    det.append(h('summary',{html:`Top Offenders <span style="color:${C.r}">(${trends.top_offenders.length})</span>`,style:{padding:'12px 16px',cursor:'pointer',fontSize:'14px',fontWeight:'600'}}));
    const tbl=h('table',{style:{width:'100%',borderCollapse:'collapse',fontSize:'14px'}});
    tbl.append(h('thead',{},[h('tr',{},[h('th',{text:'Test',style:ts()}),h('th',{text:'Streak',style:ts('center')}),h('th',{text:'History',style:ts('center')})])]));
    const tb=h('tbody');
    for(const t of trends.top_offenders.slice(0,15))
      tb.append(h('tr',{},[
        h('td',{text:t.test_id.replace('::__unidentified_failures__',' (failures)').replace('::__job_level__',''),style:td()}),
        h('td',{text:`${t.failure_streak}`,style:{...tdo('center'),color:C.r}}),
        h('td',{style:td('center')},[dots(t.history)])
      ]));
    tbl.append(tb);
    det.append(h('div',{style:{padding:'0 16px 12px'}},[tbl]));
    box.append(det);
  }

  function renderConfigParity(box,cp) {
    if(!cp?.matches) return;
    const s=cp.summary;
    const divergent=cp.matches.filter(m=>m.command_similarity<1.0);
    const det=h('details',{style:{marginBottom:'8px',background:C.bg,border:`1px solid ${C.bd}`,borderRadius:'8px'}});
    det.append(h('summary',{html:`Config Parity <span style="color:${C.m}">${s.matched} matched, ${s.avg_command_similarity_pct}% avg similarity${divergent.length?`, <span style="color:${C.y}">${divergent.length} divergent</span>`:''}</span>`,style:{padding:'12px 16px',cursor:'pointer',fontSize:'14px',fontWeight:'600'}}));
    if(!divergent.length){det.append(h('p',{text:'All matched steps identical.',style:{padding:'0 16px 12px',color:C.g,fontSize:'12px'}}));box.append(det);return}
    const tbl=h('table',{style:{width:'100%',borderCollapse:'collapse',fontSize:'14px'}});
    tbl.append(h('thead',{},[h('tr',{},[h('th',{text:'Step',style:ts()}),h('th',{text:'Similarity',style:ts('center')})])]));
    const tb=h('tbody');
    const sc={green:C.g,yellow:C.y,orange:C.o,red:C.r};
    for(const m of divergent) {
      const tr=h('tr',{style:{cursor:m.amd_commands?'pointer':'default'}});
      tr.append(h('td',{text:m.normalized,style:td()}));
      tr.append(h('td',{html:`<span style="color:${sc[m.color]||C.m};font-weight:600">${(m.command_similarity*100).toFixed(0)}%</span>`,style:td('center')}));
      tb.append(tr);
      // Expandable diff row with highlighted differences
      if(m.amd_commands && m.nvidia_commands) {
        const diffRow=h('tr',{style:{display:'none'}});
        const diffCell=h('td',{colspan:'2',style:{padding:'12px 16px',background:C.bg2,borderBottom:`1px solid ${C.bd}`}});

        // Compute which commands are unique to each side
        const amdSet=new Set(m.amd_commands);
        const nvSet=new Set(m.nvidia_commands);
        const common=new Set([...amdSet].filter(c=>nvSet.has(c)));

        diffCell.append(h('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',fontSize:'13px',fontFamily:'monospace'}},[
          h('div',{},[
            h('div',{text:'AMD Commands',style:{color:C.r,fontWeight:'700',marginBottom:'6px',fontSize:'13px',fontFamily:'inherit'}}),
            ...m.amd_commands.map(c=>{
              const isUnique=!nvSet.has(c);
              return h('div',{text:c,style:{
                color:isUnique?C.t:C.m,padding:'3px 6px',wordBreak:'break-all',
                background:isUnique?'rgba(218,54,51,0.15)':'transparent',
                borderLeft:isUnique?`3px solid ${C.r}`:'3px solid transparent',
                borderRadius:'2px',marginBottom:'2px',
              }})
            })
          ]),
          h('div',{},[
            h('div',{text:'NVIDIA Commands',style:{color:C.b,fontWeight:'700',marginBottom:'6px',fontSize:'13px',fontFamily:'inherit'}}),
            ...m.nvidia_commands.map(c=>{
              const isUnique=!amdSet.has(c);
              return h('div',{text:c,style:{
                color:isUnique?C.t:C.m,padding:'3px 6px',wordBreak:'break-all',
                background:isUnique?'rgba(31,111,235,0.15)':'transparent',
                borderLeft:isUnique?`3px solid ${C.b}`:'3px solid transparent',
                borderRadius:'2px',marginBottom:'2px',
              }})
            })
          ]),
        ]));
        diffRow.append(diffCell);
        tb.append(diffRow);
        tr.onclick=()=>{diffRow.style.display=diffRow.style.display==='none'?'':'none'};
      }
    }
    tbl.append(tb);
    det.append(h('div',{style:{padding:'0 16px 12px'}},[tbl]));
    box.append(det);
  }

  function renderEngineers(box,eng,prs) {
    if(!eng?.profiles?.length) return;
    const det=h('details',{style:{marginBottom:'8px',background:C.bg,border:`1px solid ${C.bd}`,borderRadius:'8px'}});
    det.append(h('summary',{html:`Engineer Activity <span style="color:${C.m}">(${eng.total_engineers} contributors)</span>`,style:{padding:'12px 16px',cursor:'pointer',fontSize:'14px',fontWeight:'600'}}));

    // Normalize scores to 0-10 scale
    const maxScore=Math.max(...eng.profiles.map(p=>p.activity_score),1);
    const cc={kernel:C.r,model:C.p,engine:C.b,test:C.y,ci:C.o,api:C.g,docs:C.m,config:C.m};

    const tbl=h('table',{style:{width:'100%',borderCollapse:'collapse',fontSize:'14px'}});
    tbl.append(h('thead',{},[h('tr',{},[
      h('th',{text:'Engineer',style:ts()}),h('th',{text:'Score',style:ts('center')}),
      h('th',{text:'Avg',style:ts('center')}),h('th',{text:'PRs',style:ts('center')}),
      h('th',{text:'Merged',style:ts('center')}),h('th',{text:'Areas',style:ts()})
    ])]));
    const tb=h('tbody');
    for(const p of eng.profiles.slice(0,15)) {
      const normScore=(p.activity_score/maxScore*10).toFixed(1);
      const tags=(p.categories_touched||[]).slice(0,4).map(c=>`<span style="background:${cc[c]||C.bd};color:#fff;padding:2px 7px;border-radius:3px;font-size:12px;margin-right:2px">${c}</span>`).join('');
      tb.append(h('tr',{},[
        h('td',{html:LinkRegistry.aTag(LinkRegistry.github.user(p.author), p.author),style:td()}),
        h('td',{style:td('center')},[bar(p.activity_score/maxScore,'60px')]),
        h('td',{text:p.avg_importance.toFixed(1),style:td('center')}),
        h('td',{text:String(p.total_prs),style:td('center')}),
        h('td',{text:String(p.merged),style:{...tdo('center'),color:p.merged>0?C.g:C.m}}),
        h('td',{html:tags,style:td()})
      ]));
    }
    tbl.append(tb);
    det.append(h('div',{style:{padding:'0 16px 12px'}},[tbl]));

    // PR scores subsection
    if(prs?.prs?.length) {
      det.append(h('div',{style:{padding:'0 16px',borderTop:`1px solid ${C.bd}`,marginTop:'8px',paddingTop:'12px'}},[
        h('h4',{text:`Top PRs by Importance (${prs.total_prs_scored} scored)`,style:{marginBottom:'8px',fontSize:'13px'}})
      ]));
      const ptbl=h('table',{style:{width:'100%',borderCollapse:'collapse',fontSize:'14px'}});
      ptbl.append(h('thead',{},[h('tr',{},[h('th',{text:'PR',style:ts()}),h('th',{text:'Score',style:ts('center')}),h('th',{text:'Author',style:ts()})])]));
      const ptb=h('tbody');
      const dc={major:C.g,significant:C.b,moderate:C.y,minor:C.m,trivial:'#484f58'};
      for(const p of prs.prs.slice(0,10)) {
        const i=p.importance;
        ptb.append(h('tr',{},[
          h('td',{html:LinkRegistry.aTag(LinkRegistry.github.pr('vllm-project/vllm', p.number), '#' + p.number) + ' ' + escapeHtml(p.title.slice(0,50)) + (p.title.length>50?'...':''),style:td()}),
          h('td',{html:`<span style="color:${dc[i.category]||C.m};font-weight:600">${i.score}</span>`,style:td('center')}),
          h('td',{html:LinkRegistry.aTag(LinkRegistry.github.user(p.author), p.author, {style:'color:'+C.m}),style:td()})
        ]));
      }
      ptbl.append(ptb);
      det.append(h('div',{style:{padding:'0 16px 12px'}},[ptbl]));
    }
    box.append(det);
  }

  // ═══════════════════════ STYLE HELPERS ═══════════════════════
  function ts(a){return{textAlign:a||'left',padding:'8px 12px',borderBottom:`2px solid ${C.bd}`,color:C.m,fontSize:'12px',textTransform:'uppercase',fontWeight:'600'}}
  function td(a){return{textAlign:a||'left',padding:'8px 12px',borderBottom:`1px solid ${C.bd}`,color:C.t,fontSize:'14px'}}
  function tdo(a){return{textAlign:a||'left',padding:'8px 12px',borderBottom:`1px solid ${C.bd}`,fontSize:'14px'}}

  // ═══════════════════════ MAIN ═══════════════════════
  async function render() {
    const box=document.getElementById('ci-health-view');
    if(!box)return;
    box.innerHTML='<p style="color:#8b949e">Loading...</p>';

    const[health,parity,cp,flaky,trends,eng,prs]=await Promise.all([
      J(`${CI}/ci_health.json`),J(`${CI}/parity_report.json`),J(`${CI}/config_parity.json`),
      J(`${CI}/flaky_tests.json`),J(`${CI}/failure_trends.json`),
      J(`${VD}/engineer_activity.json`),J(`${VD}/pr_scores.json`)
    ]);

    if(!health&&!parity&&!eng){box.innerHTML='<p style="color:#8b949e">No data. Run collect_ci.py.</p>';return}
    box.innerHTML='';

    box.append(h('h2',{text:'CI Health',style:{marginBottom:'4px'}}));

    if(health?.generated_at)
      box.append(h('p',{text:`Last updated: ${new Date(health.generated_at).toLocaleString()}`,style:{color:C.m,fontSize:'12px',marginBottom:'16px'}}));

    // Update build URLs in the link registry
    LinkRegistry.bk.updateBuildUrls(health);

    for(const[n,fn]of[['Metrics',()=>renderMetrics(box,health,parity)],['Hardware',()=>renderHardware(box,health)],['Trend',()=>renderTrend(box,health)],['Heatmap',()=>renderHeatmap(box,parity)],['Groups',()=>renderGroups(box,parity)],['Flaky',()=>renderFlaky(box,flaky)],['Offenders',()=>renderOffenders(box,trends)],['ConfigParity',()=>renderConfigParity(box,cp)],['Engineers',()=>renderEngineers(box,eng,prs)]]){try{fn()}catch(e){console.error(`CI Health ${n}:`,e);box.append(h('div',{text:`[${n} error: ${e.message}]`,style:{color:C.r,padding:'8px',fontSize:'13px'}}))}}
  }

  // Overlay for CI health cards
  // ═══════════════════════ GROUP OVERLAY (with links) ═══════════════════════
  function buildGroupTable(groups, showBoth) {
    const hasAnyAmd=groups.some(g=>!!g.amd), hasAnyUp=groups.some(g=>!!g.upstream);
    let tbl='<table style="width:100%;border-collapse:collapse;font-size:15px">';
    tbl+='<thead><tr>';
    tbl+='<th style="text-align:left;padding:10px 14px;border-bottom:2px solid var(--border,#30363d);color:var(--text-muted,#8b949e);font-size:14px;font-weight:600">Test Group</th>';
    if(showBoth||hasAnyAmd){
      tbl+='<th style="text-align:center;padding:10px 14px;border-bottom:2px solid var(--border,#30363d);color:#da3633;font-size:14px;font-weight:600">AMD Tests P/F/S</th>';
    }
    if(showBoth||hasAnyUp){
      tbl+='<th style="text-align:center;padding:10px 14px;border-bottom:2px solid var(--border,#30363d);color:#1f6feb;font-size:14px;font-weight:600">Upstream Tests P/F/S</th>';
    }
    tbl+='</tr></thead><tbody>';

    const sorted=[...groups].sort((a,b)=>(a.name||'').localeCompare(b.name||''));
    for(const g of sorted){
      const hasAmd=!!g.amd, hasUp=!!g.upstream;
      let rowBg='';
      if(showBoth&&!hasAmd) rowBg='background:rgba(218,54,51,0.08);';
      if(showBoth&&!hasUp) rowBg='background:rgba(31,111,235,0.08);';
      tbl+='<tr style="border-bottom:1px solid var(--border,#30363d);'+rowBg+'">';

      // Name cell with red/blue link icons for ALL groups
      let nameHtml=escapeHtml(g.name);
      nameHtml+=' ';
      if(hasAmd) nameHtml+=LinkRegistry.bk.iconLink(g.name, 'amd') + ' ';
      if(hasUp) nameHtml+=LinkRegistry.bk.iconLink(g.name, 'upstream');
      tbl+='<td style="padding:8px 14px">'+nameHtml+'</td>';

      if(showBoth||hasAnyAmd){
        if(hasAmd){
          const ap=g.amd.passed||0,af=g.amd.failed||0,ak=g.amd.skipped||0;
          tbl+='<td style="text-align:center;padding:8px 14px"><span style="color:#238636;font-weight:600">'+ap.toLocaleString()+'</span>/<span style="color:'+(af>0?'#da3633':'var(--text-muted,#8b949e)')+';font-weight:600">'+af+'</span>/<span style="color:var(--text-muted,#8b949e)">'+ak.toLocaleString()+'</span></td>';
        } else {
          tbl+='<td style="text-align:center;padding:8px 14px"><span style="color:#da3633;font-weight:600">not in AMD CI</span></td>';
        }
      }
      if(showBoth||hasAnyUp){
        if(hasUp){
          const up=g.upstream.passed||0,uf=g.upstream.failed||0,us=g.upstream.skipped||0;
          tbl+='<td style="text-align:center;padding:8px 14px"><span style="color:#238636;font-weight:600">'+up.toLocaleString()+'</span>/<span style="color:'+(uf>0?'#da3633':'var(--text-muted,#8b949e)')+';font-weight:600">'+uf+'</span>/<span style="color:var(--text-muted,#8b949e)">'+us.toLocaleString()+'</span></td>';
        } else {
          tbl+='<td style="text-align:center;padding:8px 14px"><span style="color:#1f6feb;font-weight:600">not in Upstream</span></td>';
        }
      }
      tbl+='</tr>';
    }
    tbl+='</tbody></table>';
    return tbl;
  }

  function showOverlayPanel(titleHtml, bodyHtml) {
    const backdrop=document.createElement('div');
    backdrop.className='overlay-backdrop';
    backdrop.onclick=e=>{if(e.target===backdrop)backdrop.remove()};

    const panel=document.createElement('div');
    panel.className='overlay-panel';

    const header=document.createElement('div');
    header.className='overlay-header';
    header.innerHTML='<h3>'+titleHtml+'</h3>';
    const closeBtn=document.createElement('button');
    closeBtn.className='overlay-close';
    closeBtn.innerHTML='&times;';
    closeBtn.onclick=()=>backdrop.remove();
    header.appendChild(closeBtn);

    const body=document.createElement('div');
    body.className='overlay-body';
    body.innerHTML=bodyHtml;

    panel.append(header,body);
    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);
    document.addEventListener('keydown',function esc(e){if(e.key==='Escape'){backdrop.remove();document.removeEventListener('keydown',esc)}});
  }

  function showGroupOverlay_health(title, groups, color, totalFail, totalUpFail) {
    let countHtml;
    if(totalFail!=null){
      countHtml=`<span style="color:${C.r}">${totalFail.toLocaleString()}</span>`;
      if(totalUpFail) countHtml+=` / <span style="color:${C.b}">${totalUpFail.toLocaleString()}</span>`;
      countHtml+=` tests across ${groups.length} groups`;
    } else {
      countHtml=`${groups.length}`;
    }
    const titleHtml=`<span style="color:${color}">${title}</span> <span style="color:var(--text-muted);font-weight:400">(${countHtml})</span>`;
    showOverlayPanel(titleHtml, buildGroupTable(groups, true));
  }

  function showParityOverlay(both, amdOnly, upOnly) {
    const tabs=[
      {label:`Common (${both.length})`,color:C.p,groups:both,showBoth:true},
      {label:`AMD-only (${amdOnly.length})`,color:C.r,groups:amdOnly,showBoth:false},
      {label:`Upstream-only (${upOnly.length})`,color:C.b,groups:upOnly,showBoth:false},
    ];
    let tabBar='<div style="display:flex;gap:8px;margin-bottom:16px">';
    tabs.forEach((t,i)=>{
      tabBar+=`<button onclick="document.querySelectorAll('._parity-tab-body').forEach((e,j)=>{e.style.display=j===${i}?'':'none'});this.parentNode.querySelectorAll('button').forEach((b,j)=>{b.style.background=j===${i}?'var(--bg2,#0d1117)':'';b.style.borderColor=j===${i}?'${t.color}':'var(--border,#30363d)'})" style="padding:6px 14px;border-radius:6px;border:1px solid ${i===0?t.color:'var(--border,#30363d)'};background:${i===0?'var(--bg2,#0d1117)':''};color:${t.color};cursor:pointer;font-size:13px;font-weight:600">${t.label}</button>`;
    });
    tabBar+='</div>';
    let bodies='';
    tabs.forEach((t,i)=>{
      bodies+=`<div class="_parity-tab-body" style="${i>0?'display:none':''}">`;
      bodies+=buildGroupTable(t.groups,t.showBoth);
      bodies+='</div>';
    });
    showOverlayPanel(
      `<span style="color:${C.p}">Coverage Parity</span> <span style="color:var(--text-muted);font-weight:400">(${both.length+amdOnly.length+upOnly.length} groups)</span>`,
      tabBar+bodies
    );
  }

  const obs=new MutationObserver(()=>{
    const p=document.getElementById('tab-ci-health');
    if(p?.classList.contains('active')&&!p.dataset.loaded){p.dataset.loaded='1';render()}
  });
  document.addEventListener('DOMContentLoaded',()=>{
    const p=document.getElementById('tab-ci-health');
    if(p){obs.observe(p,{attributes:true,attributeFilter:['class']});
      if(p.classList.contains('active')&&!p.dataset.loaded){p.dataset.loaded='1';render()}}
  });
})();
