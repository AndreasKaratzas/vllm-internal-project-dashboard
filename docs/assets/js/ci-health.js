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
    for(const[a,v]of Object.entries(p))e.setAttribute(a,v);
    for(const c of k){if(typeof c==='string')e.append(c);else if(c)e.append(c)}
    return e
  }

  function area(name) {
    const l=name.toLowerCase();
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

  // ═══════════════════════ PROJECT SELECTOR ═══════════════════════
  function renderSelector(box,projects,contentBox) {
    const nav=h('div',{style:{display:'flex',gap:'4px',marginBottom:'20px',borderBottom:`1px solid ${C.bd}`,paddingBottom:'8px',overflowX:'auto'}});
    for(const p of projects) {
      const active=p==='vllm';
      const btn=h('button',{text:p,style:{background:active?C.b:'transparent',border:'none',color:C.t,padding:'6px 16px',borderRadius:'6px 6px 0 0',cursor:'pointer',fontSize:'13px',fontWeight:active?'700':'400',fontFamily:'inherit',borderBottom:active?`2px solid ${C.b}`:'2px solid transparent'}});
      btn.onmouseenter=()=>{if(!btn.dataset.active)btn.style.borderBottomColor=C.m};
      btn.onmouseleave=()=>{if(!btn.dataset.active)btn.style.borderBottomColor='transparent'};
      if(active) btn.dataset.active='1';
      btn.onclick=()=>{
        nav.querySelectorAll('button').forEach(b=>{b.style.background='transparent';b.style.borderBottomColor='transparent';b.style.fontWeight='400';delete b.dataset.active});
        btn.style.background=C.b;btn.style.borderBottomColor=C.b;btn.style.fontWeight='700';btn.dataset.active='1';
        if(p==='vllm') {
          contentBox.style.display='';
          const placeholder=box.querySelector('.project-placeholder');
          if(placeholder) placeholder.style.display='none';
        } else {
          contentBox.style.display='none';
          let placeholder=box.querySelector('.project-placeholder');
          if(!placeholder) {
            placeholder=h('div',{cls:'project-placeholder',style:{textAlign:'center',padding:'60px 20px',color:C.m}});
            box.append(placeholder);
          }
          placeholder.style.display='';
          placeholder.innerHTML=`<h3 style="margin-bottom:8px">${p}</h3><p>CI health data collection not yet configured for this project.</p><p style="font-size:12px;margin-top:8px">To add: create <code>scripts/${p}/pipelines.py</code> and run <code>collect_ci.py</code></p>`;
        }
      };
      nav.append(btn);
    }
    box.append(nav);
  }

  // ═══════════════════════ METRIC CARDS ROW ═══════════════════════
  function renderMetrics(box,health,parity) {
    if(!health?.amd?.latest_build) return;
    const a=health.amd.latest_build;
    const u=health.upstream?.latest_build;

    const row=h('div',{style:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'20px'}});

    // Card helper
    const card=(label,big,sub,color,extra)=>{
      const c=h('div',{style:{background:C.bg,border:`1px solid ${C.bd}`,borderRadius:'8px',padding:'16px 20px',borderTop:`3px solid ${color}`}});
      c.append(h('div',{text:label,style:{fontSize:'11px',color:C.m,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:'6px'}}));
      c.append(h('div',{text:String(big),style:{fontSize:'32px',fontWeight:'800',color,lineHeight:'1.1'}}));
      if(sub)c.append(h('div',{html:sub,style:{fontSize:'12px',color:C.m,marginTop:'6px'}}));
      if(extra)c.append(extra);
      return c
    };

    row.append(card('AMD Pass Rate',pct(a.pass_rate,1),`Build #${a.build_number} &bull; ${a.total_tests.toLocaleString()} tests`,rc(a.pass_rate)));
    row.append(card('Test Failures',a.failed+a.errors,`${a.test_groups} test groups &bull; ${a.skipped.toLocaleString()} skipped`,C.r));

    // Test groups OR
    if(a.unique_test_groups) {
      const orRate=a.test_groups_passing_or/a.unique_test_groups;
      const sub=`${a.test_groups_passing_all} strict (all HW)${a.test_groups_partial>0?' &bull; <span style="color:'+C.y+'">'+a.test_groups_partial+' partial</span>':''}`;
      row.append(card('Test Groups (OR)',`${a.test_groups_passing_or}/${a.unique_test_groups}`,sub,rc(orRate)));
    } else {
      row.append(card('Test Groups',a.test_groups,`${a.jobs_passed||0} jobs passed`,C.b));
    }

    // Parity
    if(parity?.job_groups) {
      const both=parity.job_groups.filter(g=>g.amd&&g.upstream).length;
      const aOnly=parity.job_groups.filter(g=>g.amd&&!g.upstream).length;
      const uOnly=parity.job_groups.filter(g=>!g.amd&&g.upstream).length;
      // Make AMD-only and upstream-only clickable
      const parityCard=card('Coverage Parity',`${both} common`,'',C.p);
      const links=h('div',{style:{fontSize:'12px',marginTop:'6px'}});
      const aLink=h('a',{text:`${aOnly} AMD-only`,href:'#',style:{color:C.r,cursor:'pointer',marginRight:'8px'}});
      aLink.onclick=e=>{e.preventDefault();document.querySelectorAll('[data-sec="amd-only"]').forEach(s=>s.style.display='');document.querySelector('[data-sec="amd-only"]')?.scrollIntoView({behavior:'smooth'})};
      const uLink=h('a',{text:`${uOnly} upstream-only`,href:'#',style:{color:C.b,cursor:'pointer'}});
      uLink.onclick=e=>{e.preventDefault();document.querySelectorAll('[data-sec="up-only"]').forEach(s=>s.style.display='');document.querySelector('[data-sec="up-only"]')?.scrollIntoView({behavior:'smooth'})};
      links.append(aLink,h('span',{text:' · ',style:{color:C.m}}),uLink);
      parityCard.append(links);
      row.append(parityCard);
    } else if(u) {
      row.append(card('Upstream',pct(u.pass_rate,1),`Build #${u.build_number} &bull; ${u.total_tests.toLocaleString()} tests`,rc(u.pass_rate)));
    }

    box.append(row);
  }

  // ═══════════════════════ HARDWARE BREAKDOWN ═══════════════════════
  function renderHardware(box,health) {
    if(!health?.amd?.latest_build?.by_hardware) return;
    const bh=health.amd.latest_build.by_hardware;
    const hws=Object.entries(bh).filter(([k])=>k!=='unknown').sort();
    if(!hws.length) return;

    const hwNames={mi250:'MI250 (gfx90a)',mi325:'MI325 (gfx942)',mi355:'MI355 (gfx950)'};

    box.append(h('h3',{text:'Hardware Breakdown',style:{marginBottom:'12px'}}));
    const grid=h('div',{style:{display:'grid',gridTemplateColumns:`repeat(${hws.length},1fr)`,gap:'12px',marginBottom:'24px'}});

    for(const[hw,c]of hws) {
      const col=h('div',{style:{background:C.bg,border:`1px solid ${C.bd}`,borderRadius:'8px',padding:'20px',textAlign:'center'}});
      col.append(h('div',{text:hwNames[hw]||hw.toUpperCase(),style:{fontSize:'14px',fontWeight:'700',marginBottom:'12px'}}));
      col.append(h('div',{text:pct(c.pass_rate,1),style:{fontSize:'36px',fontWeight:'800',color:rc(c.pass_rate),lineHeight:'1.1'}}));
      col.append(h('div',{style:{margin:'12px auto',width:'80%'}},[ bar(c.pass_rate,'100%') ]));
      const stats=h('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'4px',fontSize:'12px',marginTop:'8px'}});
      stats.append(h('div',{html:`<span style="color:${C.g};font-weight:700">${c.passed.toLocaleString()}</span><br><span style="color:${C.m}">passed</span>`}));
      stats.append(h('div',{html:`<span style="color:${C.r};font-weight:700">${c.failed}</span><br><span style="color:${C.m}">failed</span>`}));
      stats.append(h('div',{html:`<span style="color:${C.m};font-weight:700">${c.skipped.toLocaleString()}</span><br><span style="color:${C.m}">skipped</span>`}));
      col.append(stats);
      // Test groups row
      if(c.groups) {
        const gFail=c.groups_failed||0;
        col.append(h('div',{html:`<span style="font-weight:600">${c.groups-gFail}/${c.groups}</span> test groups passing`,style:{fontSize:'12px',color:gFail>0?C.y:C.g,marginTop:'10px'}}));
      }
      col.append(h('div',{text:`${c.total.toLocaleString()} total tests`,style:{fontSize:'11px',color:C.m,marginTop:'4px'}}));
      grid.append(col);
    }
    box.append(grid);
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
    const leg=h('div',{style:{display:'flex',flexWrap:'wrap',gap:'10px',fontSize:'11px'}});
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
    const groups=parity.job_groups.filter(g=>g.amd&&g.upstream);
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
        justifyContent:'center',cursor:'pointer',fontSize:'11px',color:'#fff',fontWeight:'600',
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
    const all=parity.job_groups;
    const both=all.filter(g=>g.amd&&g.upstream);
    const aOnly=all.filter(g=>g.amd&&!g.upstream);
    const uOnly=all.filter(g=>!g.amd&&g.upstream);

    const section=h('div',{style:{marginBottom:'20px'}});
    section.append(h('h3',{text:'Runtime Parity',style:{marginBottom:'8px'}}));

    // Filters
    const fb=h('div',{style:{display:'flex',gap:'4px',flexWrap:'wrap',marginBottom:'12px'}});
    const filters=[{l:'All',v:'all'},{l:`Regressions`,v:'regression'},{l:'Both Pass',v:'pass'},{l:`AMD-only (${aOnly.length})`,v:'amd-only'},{l:`Upstream-only (${uOnly.length})`,v:'up-only'}];
    let active='all';
    const container=h('div');

    for(const f of filters) {
      const btn=h('button',{text:f.l,style:{background:f.v==='all'?C.b:C.bd,border:'none',color:C.t,padding:'4px 12px',borderRadius:'4px',cursor:'pointer',fontSize:'12px',fontFamily:'inherit'}});
      btn.onclick=()=>{
        active=f.v;fb.querySelectorAll('button').forEach(b=>b.style.background=C.bd);btn.style.background=C.b;
        container.querySelectorAll('details[data-area]').forEach(d=>{
          if(f.v==='all')d.style.display='';
          else if(f.v==='amd-only'||f.v==='up-only')d.style.display='none';
          else d.style.display=d.dataset.status===f.v||(f.v==='regression'&&d.dataset.status==='regression')?'':'none';
        });
        container.querySelector('[data-sec="amd-only"]').style.display=f.v==='amd-only'?'':'none';
        container.querySelector('[data-sec="up-only"]').style.display=f.v==='up-only'?'':'none';
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

      const tbl=h('table',{style:{width:'100%',borderCollapse:'collapse',fontSize:'12px'}});
      tbl.append(h('thead',{},[h('tr',{},[
        h('th',{text:'Test Group',style:ts()}),h('th',{html:'AMD P/F/S',style:ts('center')}),
        h('th',{html:'Upstream P/F/S',style:ts('center')}),h('th',{text:'Status',style:ts('center')})
      ])]));
      const tb=h('tbody');
      for(const g of gs.sort((a,b)=>(b.amd.failed||0)-(a.amd.failed||0))) {
        const af=(g.amd.failed||0),uf=(g.upstream.failed||0);
        let st,sc;
        if(!af&&!uf){st='Both pass';sc=C.g}
        else if(af&&!uf){st='AMD regression';sc=C.r}
        else if(!af&&uf){st='AMD advantage';sc=C.b}
        else{st='Both fail';sc=C.o}
        tb.append(h('tr',{},[
          h('td',{text:g.name,style:td()}),
          h('td',{html:`<span style="color:${C.g}">${g.amd.passed||0}</span>/<span style="color:${C.r}">${af}</span>/<span style="color:${C.m}">${g.amd.skipped||0}</span>`,style:td('center')}),
          h('td',{html:`<span style="color:${C.g}">${g.upstream.passed||0}</span>/<span style="color:${C.r}">${uf}</span>/<span style="color:${C.m}">${g.upstream.skipped||0}</span>`,style:td('center')}),
          h('td',{html:`<span style="color:${sc};font-weight:600">${st}</span>`,style:td('center')})
        ]));
      }
      tbl.append(tb);
      det.append(h('div',{style:{padding:'0 12px 10px'}},[tbl]));
      container.append(det);
    }

    // AMD-only / Upstream-only
    for(const[key,list,color,label]of[['amd-only',aOnly,C.r,'AMD-Only'],['up-only',uOnly,C.b,'Upstream-Only']]) {
      const sec=h('div',{'data-sec':key,style:{display:'none',marginTop:'12px'}});
      sec.append(h('h4',{text:`${label} Test Groups (${list.length})`,style:{color,marginBottom:'8px'}}));
      const ul=h('div',{style:{columns:'2',fontSize:'12px',gap:'8px'}});
      for(const g of list.sort((a,b)=>(a.name||'').localeCompare(b.name||'')))
        ul.append(h('div',{text:(g.amd_job_name||g.upstream_job_name||g.name),style:{color:C.m,padding:'2px 0'}}));
      sec.append(ul);
      container.append(sec);
    }

    section.append(container);
    box.append(section);
  }

  // ═══════════════════════ COLLAPSIBLE SECTIONS ═══════════════════════

  function renderFlaky(box,flaky) {
    if(!flaky?.tests?.length) return;
    const det=h('details',{style:{marginBottom:'8px',background:C.bg,border:`1px solid ${C.bd}`,borderRadius:'8px'}});
    det.append(h('summary',{html:`Flaky Tests <span style="color:${C.y}">(${flaky.total_flaky})</span>`,style:{padding:'12px 16px',cursor:'pointer',fontSize:'14px',fontWeight:'600'}}));
    const tbl=h('table',{style:{width:'100%',borderCollapse:'collapse',fontSize:'12px',margin:'0 0 12px'}});
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
    const tbl=h('table',{style:{width:'100%',borderCollapse:'collapse',fontSize:'12px'}});
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
    const tbl=h('table',{style:{width:'100%',borderCollapse:'collapse',fontSize:'12px'}});
    tbl.append(h('thead',{},[h('tr',{},[h('th',{text:'Step',style:ts()}),h('th',{text:'Similarity',style:ts('center')})])]));
    const tb=h('tbody');
    const sc={green:C.g,yellow:C.y,orange:C.o,red:C.r};
    for(const m of divergent) tb.append(h('tr',{},[h('td',{text:m.normalized,style:td()}),h('td',{html:`<span style="color:${sc[m.color]||C.m};font-weight:600">${(m.command_similarity*100).toFixed(0)}%</span>`,style:td('center')})]));
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

    const tbl=h('table',{style:{width:'100%',borderCollapse:'collapse',fontSize:'12px'}});
    tbl.append(h('thead',{},[h('tr',{},[
      h('th',{text:'Engineer',style:ts()}),h('th',{text:'Score',style:ts('center')}),
      h('th',{text:'Avg',style:ts('center')}),h('th',{text:'PRs',style:ts('center')}),
      h('th',{text:'Merged',style:ts('center')}),h('th',{text:'Areas',style:ts()})
    ])]));
    const tb=h('tbody');
    for(const p of eng.profiles.slice(0,15)) {
      const normScore=(p.activity_score/maxScore*10).toFixed(1);
      const tags=(p.categories_touched||[]).slice(0,4).map(c=>`<span style="background:${cc[c]||C.bd};color:#fff;padding:1px 5px;border-radius:3px;font-size:10px;margin-right:2px">${c}</span>`).join('');
      tb.append(h('tr',{},[
        h('td',{html:`<a href="https://github.com/${p.author}" target="_blank">${p.author}</a>`,style:td()}),
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
      const ptbl=h('table',{style:{width:'100%',borderCollapse:'collapse',fontSize:'12px'}});
      ptbl.append(h('thead',{},[h('tr',{},[h('th',{text:'PR',style:ts()}),h('th',{text:'Score',style:ts('center')}),h('th',{text:'Author',style:ts()})])]));
      const ptb=h('tbody');
      const dc={major:C.g,significant:C.b,moderate:C.y,minor:C.m,trivial:'#484f58'};
      for(const p of prs.prs.slice(0,10)) {
        const i=p.importance;
        ptb.append(h('tr',{},[
          h('td',{html:`<a href="https://github.com/vllm-project/vllm/pull/${p.number}" target="_blank">#${p.number}</a> ${p.title.slice(0,50)}${p.title.length>50?'...':''}`,style:td()}),
          h('td',{html:`<span style="color:${dc[i.category]||C.m};font-weight:600">${i.score}</span>`,style:td('center')}),
          h('td',{html:`<a href="https://github.com/${p.author}" target="_blank" style="color:${C.m}">${p.author}</a>`,style:td()})
        ]));
      }
      ptbl.append(ptb);
      det.append(h('div',{style:{padding:'0 16px 12px'}},[ptbl]));
    }
    box.append(det);
  }

  // ═══════════════════════ STYLE HELPERS ═══════════════════════
  function ts(a){return{textAlign:a||'left',padding:'6px 10px',borderBottom:`2px solid ${C.bd}`,color:C.m,fontSize:'10px',textTransform:'uppercase',fontWeight:'600'}}
  function td(a){return{textAlign:a||'left',padding:'5px 10px',borderBottom:`1px solid ${C.bd}`,color:C.t}}
  function tdo(a){return{textAlign:a||'left',padding:'5px 10px',borderBottom:`1px solid ${C.bd}`}}

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

    // Content wrapper (hidden/shown by project selector)
    const content=h('div');

    // Project selector
    renderSelector(box,['vllm','pytorch','jax','triton','sglang','xla'],content);

    if(health?.generated_at)
      content.append(h('p',{text:`Last updated: ${new Date(health.generated_at).toLocaleString()}`,style:{color:C.m,fontSize:'11px',marginBottom:'16px'}}));

    renderMetrics(content,health,parity);
    renderHardware(content,health);
    renderTrend(content,health);
    renderHealthBar(content,health);
    renderHeatmap(content,parity);
    renderGroups(content,parity);
    renderFlaky(content,flaky);
    renderOffenders(content,trends);
    renderConfigParity(content,cp);
    renderEngineers(content,eng,prs);
    box.append(content);
  }

  const obs=new MutationObserver(()=>{
    const p=document.getElementById('tab-ci-health');
    if(p?.classList.contains('active')&&!p.dataset.loaded){p.dataset.loaded='1';render()}
  });
  document.addEventListener('DOMContentLoaded',()=>{
    const p=document.getElementById('tab-ci-health');
    if(p)obs.observe(p,{attributes:true,attributeFilter:['class']});
  });
})();
