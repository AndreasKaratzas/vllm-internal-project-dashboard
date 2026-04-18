/**
 * CI Hotness — 3-day moving window view of AMD queue workload.
 * Shows test-group frequency + time-to-completion, plus per-branch hotness.
 */
(function() {
  const _s = getComputedStyle(document.documentElement);
  const C = {
    g:_s.getPropertyValue('--accent-green').trim()||'#238636',
    y:_s.getPropertyValue('--accent-orange').trim()||'#d29922',
    r:_s.getPropertyValue('--badge-closed').trim()||'#da3633',
    b:_s.getPropertyValue('--accent-blue').trim()||'#1f6feb',
    p:_s.getPropertyValue('--accent-purple').trim()||'#8957e5',
    m:_s.getPropertyValue('--text-muted').trim()||'#8b949e',
    t:_s.getPropertyValue('--text').trim()||'#e6edf3',
    bg:_s.getPropertyValue('--card-bg').trim()||'#161b22',
    bg2:_s.getPropertyValue('--bg').trim()||'#0d1117',
    bd:_s.getPropertyValue('--border').trim()||'#30363d',
  };

  const h = el;  // shared element factory defined in utils.js

  async function loadHotness() {
    try {
      const r = await fetch('data/vllm/ci/hotness.json?_='+Math.floor(Date.now()/1000));
      if (!r.ok) return null;
      return await r.json();
    } catch(e) { return null; }
  }

  function resolveBranchUrl(row) {
    // Use the repo reported by the fork URL (PR builds), else fall back to the
    // main vllm repo. If we only have a commit hash, deep-link to the commit.
    const base = row.fork_url && row.fork_url.startsWith('http') ? row.fork_url :
                 row.fork_url ? 'https://github.com/' + row.fork_url.replace(/^git@github\.com:/,'').replace(/\.git$/,'') :
                 'https://github.com/vllm-project/vllm';
    if (row.commit) return base + '/commit/' + row.commit;
    if (row.branch) return base + '/tree/' + encodeURIComponent(row.branch);
    return base;
  }

  function formatRelative(iso) {
    if (!iso) return '\u2014';
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    const diffMin = (Date.now() - d.getTime()) / 60000;
    if (diffMin < 60) return `${Math.round(diffMin)}m ago`;
    if (diffMin < 1440) return `${Math.round(diffMin/60)}h ago`;
    return `${Math.round(diffMin/1440)}d ago`;
  }

  function scoreBranch(row) {
    // Moving-window hotness: build count is the main signal, amplified by how
    // recently the branch fired (logistic decay over the 72h window).
    if (!row.last_seen) return row.builds || 0;
    const ageHours = (Date.now() - new Date(row.last_seen).getTime()) / 3600000;
    const recency = Math.max(0.2, Math.exp(-ageHours / 48));
    return (row.builds || 0) * recency + (row.count || 0) * 0.05 * recency;
  }

  async function render() {
    const host = document.getElementById('ci-hotness-view');
    if (!host) return;
    host.innerHTML = '<p style="color:#8b949e">Loading hotness data...</p>';

    const data = await loadHotness();
    if (!data) {
      host.innerHTML = '<p style="color:#8b949e">No hotness data yet. <code>scripts/vllm/collect_hotness.py</code> runs hourly once the workflow is enabled.</p>';
      return;
    }

    host.innerHTML = '';
    host.append(h('h2',{text:'CI Workload Trajectory',style:{marginBottom:'6px'}}));
    host.append(h('p',{text:`Moving ${data.window_hours}h window \u2014 ${data.builds_examined} builds examined. Generated ${formatRelative(data.generated_at)}.`,style:{color:C.m,marginBottom:'16px'}}));

    // Summary cards
    const totalRuns = (data.test_groups||[]).reduce((s,g)=>s+(g.count||0),0);
    const totalFails = (data.test_groups||[]).reduce((s,g)=>s+(g.failures||0),0);
    const failRate = totalRuns ? (totalFails / totalRuns * 100) : 0;
    const hotGroup = (data.test_groups||[])[0];
    const hotBranch = (data.branches||[]).slice().sort((a,b)=>scoreBranch(b)-scoreBranch(a))[0];

    const cards = h('div',{style:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'20px'}});
    const card = (label, value, sub, color) => h('div',{style:{background:C.bg,border:`1px solid ${C.bd}`,borderRadius:'8px',padding:'14px 18px',borderTop:`3px solid ${color}`}},[
      h('div',{text:label,style:{fontSize:'12px',color:C.m,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:'4px'}}),
      h('div',{text:String(value),style:{fontSize:'22px',fontWeight:'800',color,lineHeight:'1.1'}}),
      sub?h('div',{text:sub,style:{fontSize:'12px',color:C.m,marginTop:'4px'}}):null,
    ]);
    cards.append(card('Runs (3d)', totalRuns.toLocaleString(), `${(data.test_groups||[]).length} groups`, C.b));
    cards.append(card('Failure rate', failRate.toFixed(1)+'%', `${totalFails} failing jobs`, failRate > 10 ? C.r : C.g));
    cards.append(card('Hottest group', hotGroup ? hotGroup.group.slice(0,28) : '\u2014', hotGroup ? `${hotGroup.count} runs \u2022 p90 ${hotGroup.p90_min}m` : '', C.r));
    cards.append(card('Hottest branch', hotBranch ? (hotBranch.branch||'main').slice(0,28) : '\u2014', hotBranch ? `${hotBranch.builds} builds \u2022 ${hotBranch.count} jobs` : '', C.p));
    host.append(cards);

    // View toggle
    const view = {current:'groups'};
    const tabBar = h('div',{style:{display:'flex',gap:'2px',marginBottom:'12px'}});
    const TABS = [
      {k:'groups',label:'Test groups'},
      {k:'branches',label:'Branches'},
      {k:'queues',label:'Queues'},
    ];
    const tabBtns = {};
    const body = h('div');
    host.append(tabBar, body);
    for (const t of TABS) {
      const btn = h('button',{text:t.label,style:{
        background:t.k===view.current?C.b:C.bd, border:'none', color:C.t,
        padding:'6px 14px', borderRadius:'3px', cursor:'pointer',
        fontSize:'13px', fontFamily:'inherit', fontWeight:t.k===view.current?'600':'400',
      }});
      btn.onclick = () => {
        view.current = t.k;
        for (const [k,b] of Object.entries(tabBtns)) { b.style.background=C.bd; b.style.fontWeight='400'; }
        btn.style.background = C.b; btn.style.fontWeight='600';
        renderBody();
      };
      tabBtns[t.k] = btn;
      tabBar.append(btn);
    }

    // Workload filter + HW filter (applies to groups view)
    const filters = {workload:'all', hw:'all', q:''};

    function renderBody() {
      body.innerHTML = '';
      if (view.current === 'groups') return renderGroups();
      if (view.current === 'branches') return renderBranches();
      return renderQueues();
    }

    function renderGroups() {
      const filterRow = h('div',{style:{display:'flex',gap:'12px',alignItems:'center',flexWrap:'wrap',marginBottom:'10px'}});
      const mkPill = (label, active, onclick) => {
        const b = h('button',{text:label,style:{
          background:active?C.p:C.bd,border:'none',color:C.t,
          padding:'4px 10px',borderRadius:'3px',cursor:'pointer',
          fontSize:'12px',fontFamily:'inherit',fontWeight:active?'600':'400',
        }});
        b.onclick = onclick;
        return b;
      };
      filterRow.append(h('span',{text:'Workload:',style:{color:C.m,fontSize:'12px'}}));
      for (const w of ['all','vllm','omni']) {
        filterRow.append(mkPill(w, filters.workload===w, ()=>{filters.workload=w; renderGroups();}));
      }
      filterRow.append(h('span',{text:'Hardware:',style:{color:C.m,fontSize:'12px',marginLeft:'10px'}}));
      const allHw = Array.from(new Set((data.test_groups||[]).map(g=>g.hw))).sort();
      for (const hw of ['all', ...allHw]) {
        filterRow.append(mkPill(hw, filters.hw===hw, ()=>{filters.hw=hw; renderGroups();}));
      }
      const search = h('input',{type:'search',placeholder:'Filter groups\u2026',value:filters.q,style:{marginLeft:'auto',background:C.bg2,border:`1px solid ${C.bd}`,color:C.t,padding:'4px 10px',borderRadius:'3px',fontSize:'13px',minWidth:'200px'}});
      search.oninput = () => { filters.q = search.value; renderGroupTable(); };
      filterRow.append(search);
      body.append(filterRow);

      const tblHost = h('div');
      body.append(tblHost);

      function renderGroupTable() {
        tblHost.innerHTML = '';
        let rows = (data.test_groups||[]).slice();
        if (filters.workload !== 'all') rows = rows.filter(r=>r.workload===filters.workload);
        if (filters.hw !== 'all') rows = rows.filter(r=>r.hw===filters.hw);
        if (filters.q) {
          const q = filters.q.toLowerCase();
          rows = rows.filter(r => (r.group||'').toLowerCase().includes(q));
        }
        if (!rows.length) { tblHost.append(h('p',{text:'No matching groups.',style:{color:C.m,fontSize:'13px'}})); return; }
        const tbl = h('table',{style:{width:'100%',borderCollapse:'collapse',fontSize:'13px'}});
        const th = s => ({textAlign:s||'left',padding:'6px 8px',borderBottom:`1px solid ${C.bd}`,color:C.m,fontSize:'12px'});
        tbl.append(h('thead',{},[h('tr',{},[
          h('th',{text:'Test group',style:th()}),
          h('th',{text:'HW',style:th('center')}),
          h('th',{text:'Workload',style:th('center')}),
          h('th',{text:'Runs',style:th('center')}),
          h('th',{text:'Avg min',style:th('center')}),
          h('th',{text:'p90 min',style:th('center')}),
          h('th',{text:'Max min',style:th('center')}),
          h('th',{text:'Fail rate',style:th('center')}),
          h('th',{text:'Last seen',style:th('center')}),
        ])]));
        const tb = h('tbody');
        const td = s => ({padding:'6px 8px',textAlign:s||'left',fontSize:'13px'});
        for (const r of rows.slice(0,200)) {
          const tr = h('tr',{style:{borderBottom:`1px solid ${C.bd}22`}});
          tr.append(h('td',{text:r.group,style:{...td(),fontWeight:'600'}}));
          tr.append(h('td',{text:(r.hw||'?').toUpperCase(),style:{...td('center'),color:C.m}}));
          tr.append(h('td',{text:r.workload||'vllm',style:{...td('center'),color:r.workload==='omni'?C.p:C.m}}));
          tr.append(h('td',{text:String(r.count),style:{...td('center'),fontWeight:'600'}}));
          tr.append(h('td',{text:r.avg_min.toFixed(1),style:{...td('center'),color:C.m}}));
          tr.append(h('td',{text:r.p90_min.toFixed(1),style:{...td('center'),color:r.p90_min>30?C.r:C.t}}));
          tr.append(h('td',{text:r.max_min.toFixed(1),style:{...td('center'),color:C.m}}));
          const fp = (r.fail_rate||0)*100;
          tr.append(h('td',{text:fp.toFixed(1)+'%',style:{...td('center'),color:fp>10?C.r:fp>0?C.y:C.g,fontWeight:fp>0?'600':'400'}}));
          tr.append(h('td',{text:formatRelative(r.last_seen),style:{...td('center'),color:C.m,fontSize:'12px'}}));
          tb.append(tr);
        }
        tbl.append(tb);
        tblHost.append(tbl);
        if (rows.length > 200) {
          tblHost.append(h('p',{text:`Showing 200 of ${rows.length}. Use the search box to narrow.`,style:{color:C.m,fontSize:'12px',margin:'8px 0'}}));
        }
      }
      renderGroupTable();
    }

    function renderBranches() {
      const rows = (data.branches||[]).slice().sort((a,b)=>scoreBranch(b)-scoreBranch(a));
      if (!rows.length) { body.append(h('p',{text:'No branch activity in this window.',style:{color:C.m}})); return; }
      const tbl = h('table',{style:{width:'100%',borderCollapse:'collapse',fontSize:'13px'}});
      const th = s => ({textAlign:s||'left',padding:'6px 8px',borderBottom:`1px solid ${C.bd}`,color:C.m,fontSize:'12px'});
      tbl.append(h('thead',{},[h('tr',{},[
        h('th',{text:'Branch',style:th()}),
        h('th',{text:'Commit',style:th('center')}),
        h('th',{text:'Builds',style:th('center')}),
        h('th',{text:'Jobs',style:th('center')}),
        h('th',{text:'Avg min',style:th('center')}),
        h('th',{text:'p90 min',style:th('center')}),
        h('th',{text:'Workload',style:th('center')}),
        h('th',{text:'Source',style:th('center')}),
        h('th',{text:'Last seen',style:th('center')}),
      ])]));
      const tb = h('tbody');
      const td = s => ({padding:'6px 8px',textAlign:s||'left',fontSize:'13px'});
      for (const r of rows.slice(0,100)) {
        const tr = h('tr',{style:{borderBottom:`1px solid ${C.bd}22`}});
        const url = resolveBranchUrl(r);
        tr.append(h('td',{style:td()},[
          h('a',{text:r.branch||'(none)',href:url,target:'_blank',style:{color:C.b,textDecoration:'none',fontWeight:'600'}})
        ]));
        tr.append(h('td',{style:{...td('center'),fontFamily:'monospace',color:C.m,fontSize:'12px'}},[
          r.commit ? h('a',{text:r.commit.slice(0,7),href:url,target:'_blank',style:{color:C.m,textDecoration:'none'}}) : h('span',{text:'\u2014'})
        ]));
        tr.append(h('td',{text:String(r.builds),style:{...td('center'),fontWeight:'600'}}));
        tr.append(h('td',{text:String(r.count),style:{...td('center'),color:C.m}}));
        tr.append(h('td',{text:r.avg_min.toFixed(1),style:{...td('center'),color:C.m}}));
        tr.append(h('td',{text:r.p90_min.toFixed(1),style:{...td('center'),color:r.p90_min>30?C.r:C.t}}));
        tr.append(h('td',{text:r.workload||'vllm',style:{...td('center'),color:r.workload==='omni'?C.p:C.m}}));
        tr.append(h('td',{text:r.source||'\u2014',style:{...td('center'),color:C.m,fontSize:'12px'}}));
        tr.append(h('td',{text:formatRelative(r.last_seen),style:{...td('center'),color:C.m,fontSize:'12px'}}));
        tb.append(tr);
      }
      tbl.append(tb);
      body.append(tbl);
    }

    function renderQueues() {
      const rows = (data.queues||[]).slice();
      if (!rows.length) { body.append(h('p',{text:'No queue activity in this window.',style:{color:C.m}})); return; }
      const tbl = h('table',{style:{width:'100%',borderCollapse:'collapse',fontSize:'13px'}});
      const th = s => ({textAlign:s||'left',padding:'6px 8px',borderBottom:`1px solid ${C.bd}`,color:C.m,fontSize:'12px'});
      tbl.append(h('thead',{},[h('tr',{},[
        h('th',{text:'Queue',style:th()}),
        h('th',{text:'Jobs',style:th('center')}),
        h('th',{text:'Avg min',style:th('center')}),
        h('th',{text:'p50 min',style:th('center')}),
        h('th',{text:'p90 min',style:th('center')}),
        h('th',{text:'Max min',style:th('center')}),
      ])]));
      const tb = h('tbody');
      const td = s => ({padding:'6px 8px',textAlign:s||'left',fontSize:'13px'});
      for (const r of rows) {
        const tr = h('tr',{style:{borderBottom:`1px solid ${C.bd}22`}});
        tr.append(h('td',{text:r.queue,style:{...td(),fontWeight:'600'}}));
        tr.append(h('td',{text:String(r.count),style:{...td('center'),fontWeight:'600'}}));
        tr.append(h('td',{text:r.avg_min.toFixed(1),style:{...td('center'),color:C.m}}));
        tr.append(h('td',{text:r.p50_min.toFixed(1),style:{...td('center'),color:C.m}}));
        tr.append(h('td',{text:r.p90_min.toFixed(1),style:{...td('center'),color:r.p90_min>30?C.r:C.t}}));
        tr.append(h('td',{text:r.max_min.toFixed(1),style:{...td('center'),color:C.m}}));
        tb.append(tr);
      }
      tbl.append(tb);
      body.append(tbl);
    }

    renderBody();
  }

  const obs = new MutationObserver(() => {
    const p = document.getElementById('tab-ci-hotness');
    if (p?.classList.contains('active') && !p.dataset.loaded) { p.dataset.loaded='1'; render(); }
  });
  document.addEventListener('DOMContentLoaded', () => {
    const p = document.getElementById('tab-ci-hotness');
    if (p) {
      obs.observe(p, {attributes:true, attributeFilter:['class']});
      if (p.classList.contains('active') && !p.dataset.loaded) { p.dataset.loaded='1'; render(); }
    }
  });
})();
