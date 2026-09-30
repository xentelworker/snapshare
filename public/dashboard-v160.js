(()=>{
if(window.__ss160)return;window.__ss160=true;
const path=location.pathname;
const css=document.createElement('style');css.textContent=`
:root{--ss16:#2563eb;--ss16ink:#172033;--ss16muted:#667085;--ss16line:#e6eaf0;--ss16bg:#f6f8fb}
body{background:var(--ss16bg)!important;color:var(--ss16ink)}
.ss160-top{display:flex;align-items:center;gap:14px;margin:0 0 24px}.ss160-top h1{margin:0;font-size:clamp(28px,4vw,40px);letter-spacing:-.045em}.ss160-top p{margin:5px 0 0;color:var(--ss16muted)}.ss160-grow{flex:1}
.ss160-primary{background:var(--ss16)!important;color:#fff!important}.ss160-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:0 0 24px}.ss160-kpi{background:#fff;border:1px solid var(--ss16line);border-radius:18px;padding:18px}.ss160-kpi b{display:block;font-size:28px;letter-spacing:-.04em}.ss160-kpi span{color:var(--ss16muted);font-size:13px}
.ss160-eventnav{display:flex;gap:5px;overflow:auto;background:#fff;border:1px solid var(--ss16line);padding:6px;border-radius:14px;margin:0 0 22px;position:sticky;top:10px;z-index:200}.ss160-eventnav button{white-space:nowrap;background:transparent!important;color:#667085!important;box-shadow:none!important}.ss160-eventnav button.active{background:#eef4ff!important;color:#175cd3!important}
.ss160-quick{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:18px 0}.ss160-quick button{background:#fff!important;color:#344054!important;border:1px solid var(--ss16line)!important;text-align:left;min-height:74px}.ss160-quick button strong{display:block;color:#172033;font-size:15px}.ss160-quick button small{display:block;color:#667085;margin-top:4px}
.ss160-client-welcome{display:grid;grid-template-columns:1fr auto;gap:18px;align-items:center;background:#fff;border:1px solid var(--ss16line);border-radius:20px;padding:20px;margin-bottom:18px}.ss160-client-welcome h2{margin:0 0 5px}.ss160-client-welcome p{margin:0;color:#667085}
@media(max-width:900px){.ss160-kpis{grid-template-columns:1fr 1fr}.ss160-quick{grid-template-columns:1fr}.ss160-eventnav{top:4px}.ss160-client-welcome{grid-template-columns:1fr}}
@media(max-width:520px){.ss160-kpis{grid-template-columns:1fr 1fr}.ss160-kpi{padding:14px}.ss160-kpi b{font-size:22px}}

/* sleek visual refresh */
body{background:linear-gradient(180deg,#f8fafc,#f4f7fb)!important}.card,.ss150-card,.ss160-client-welcome{border-color:#e2e8f0!important;box-shadow:0 10px 30px rgba(15,23,42,.05)!important}.ss150-side{width:264px!important;background:#0b1220!important;border-right:1px solid #1d2939!important;padding:22px 14px!important}.host-main{margin-left:264px!important;padding:34px 42px!important}.ss150-brand{color:#fff!important;font-size:25px!important}.ss150-brand span{color:#7db0ff!important}.ss150-back{color:#98a2b3!important}.ss150-nav button{color:#aab4c3!important;padding:11px 12px!important;border-radius:11px!important}.ss150-nav button:hover,.ss150-nav button.active{background:#182234!important;color:#fff!important}.ss150-nav button.active{box-shadow:inset 3px 0 0 #5b8cff!important}.ss150-view{background:#2563eb!important;color:#fff!important;border:0!important}.ss160-eventnav{border-color:#e2e8f0!important;box-shadow:0 8px 26px rgba(15,23,42,.05)!important;border-radius:16px!important;background:rgba(255,255,255,.94)!important;backdrop-filter:blur(16px)}.ss160-eventnav button{border-radius:11px!important;font-weight:700!important}.ss160-eventnav button.active{background:#172033!important;color:#fff!important}.ss160-quick{gap:14px!important}.ss160-quick button{border-radius:18px!important;padding:18px 20px!important;min-height:96px!important;box-shadow:0 8px 24px rgba(15,23,42,.04)!important}.ss160-quick button:hover{box-shadow:0 14px 32px rgba(15,23,42,.08)!important}.ss13-adminnav{width:264px!important;background:#0b1220!important}.ss13-adminnav+main{margin-left:264px!important;padding:36px 42px 64px!important;max-width:1400px!important}.ss13-event-card{border-radius:20px!important;box-shadow:0 8px 28px rgba(15,23,42,.05)!important}.ss13-event-card:hover{transform:translateY(-3px)!important;box-shadow:0 18px 40px rgba(15,23,42,.09)!important}.ss13-event-cover{height:150px!important}.ss160-primary{border-radius:11px!important;box-shadow:0 7px 18px rgba(37,99,235,.2)!important}.ss13-hero{border-radius:24px!important}.ss13-mainnav{border-radius:16px!important;box-shadow:0 8px 24px rgba(15,23,42,.05)!important}.ss150-panel{border-radius:24px!important}.ss150-card{border-radius:18px!important}input,select,textarea{border-radius:10px!important}@media(max-width:900px){.ss150-side{width:auto!important}.host-main{margin-left:0!important;padding:18px!important}.ss13-adminnav+main{margin-left:0!important;padding:22px 14px 60px!important}.ss13-adminnav{width:auto!important}}
`;document.head.appendChild(css);
const clickText=(re)=>{const el=[...document.querySelectorAll('button,a')].find(x=>re.test((x.textContent||'').trim()));el?.click();return !!el};
function manage(){
 if(!/^\/manage\//.test(path))return;
 const side=document.querySelector('.ss150-side'),main=document.querySelector('.host-main');if(!side||!main)return;
 side.querySelector('.ss150-nav').innerHTML=`<button data-go="overview">⌂ Overview</button><button data-go="gallery">▧ Gallery</button><button data-go="branding">◈ Branding</button><button data-go="sharing">⌗ Sharing</button><button data-go="slideshow">▶ Slideshow</button><button data-go="downloads">⇩ Downloads</button><button data-go="settings">⚙ Settings</button>`;
 const actions={
  overview:()=>clickText(/^overview$/i)||clickText(/event dashboard/i),
  gallery:()=>clickText(/^media$/i)||clickText(/gallery settings/i),
  branding:()=>side.querySelector('[data-go="branding"]')&&document.querySelector('[data-brand]')?.click(),
  sharing:()=>clickText(/event dashboard|overview/i),
  slideshow:()=>{document.querySelector('[data-brand]')?.click();setTimeout(()=>document.querySelector('[data-brand-tab="overlay"]')?.click(),0)},
  downloads:()=>clickText(/^media$/i),
  settings:()=>clickText(/^settings$/i)||clickText(/event details/i)
 };
 side.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{side.querySelectorAll('[data-go]').forEach(x=>x.classList.remove('active'));b.classList.add('active');actions[b.dataset.go]?.()});
 if(!main.querySelector('.ss160-eventnav')){const nav=document.createElement('nav');nav.className='ss160-eventnav';nav.innerHTML=`<button data-q="overview" class="active">Overview</button><button data-q="gallery">Gallery</button><button data-q="branding">Branding</button><button data-q="sharing">Sharing</button><button data-q="slideshow">Slideshow</button><button data-q="downloads">Downloads</button><button data-q="settings">Settings</button>`;main.prepend(nav);nav.querySelectorAll('button').forEach(b=>b.onclick=()=>{nav.querySelectorAll('button').forEach(x=>x.classList.remove('active'));b.classList.add('active');actions[b.dataset.q]?.()})}
 if(!main.querySelector('.ss160-quick')){const q=document.createElement('div');q.className='ss160-quick';q.innerHTML=`<button data-q="gallery"><strong>Manage Gallery</strong><small>Review, organize and download event media</small></button><button data-q="sharing"><strong>Share Event</strong><small>Open the event link and QR sharing tools</small></button><button data-q="slideshow"><strong>Slideshow Display</strong><small>Configure branding and launch display settings</small></button>`;main.querySelector('.ss160-eventnav')?.after(q);q.querySelectorAll('button').forEach(b=>b.onclick=()=>actions[b.dataset.q]?.())}
}
function admin(){
 if(path!='/admin')return;const main=document.querySelector('main');if(!main)return;
 const head=main.querySelector('.ss13-pagehead');if(head&&!head.dataset.ss160){head.dataset.ss160='1';head.innerHTML='<div class="ss160-top"><div><h1>Dashboard</h1><p>Everything you need to run SnapShare events from one workspace.</p></div><span class="ss160-grow"></span><button class="ss160-primary" id="ss160Create">＋ Create Event</button></div>';head.querySelector('#ss160Create').onclick=()=>location.href='/'}
 const nav=document.querySelector('.ss13-adminnav');if(nav){const overview=nav.querySelector('[data-section="overview"]');if(overview)overview.textContent='⌂ Dashboard'}
}
function client(){
 if(path!='/client')return;const main=document.querySelector('main');if(!main||main.querySelector('.ss160-client-welcome'))return;
 const hero=main.querySelector('.ss13-hero');if(!hero)return;const box=document.createElement('section');box.className='ss160-client-welcome';box.innerHTML='<div><h2>Your event workspace</h2><p>View your gallery, download memories, open the slideshow, or update the event details you have permission to manage.</p></div><button class="ss160-primary" data-gallery>Open Gallery</button>';hero.after(box);box.querySelector('[data-gallery]').onclick=()=>document.querySelector('.ss13-mainnav [data-tab="media"]')?.click();
 const nav=document.querySelector('.ss13-mainnav');if(nav){const settings=nav.querySelector('[data-tab="settings"]');if(settings)settings.textContent='⚙ Event Settings'}
}
function run(){manage();admin();client()}
new MutationObserver(()=>requestAnimationFrame(run)).observe(document.body,{childList:true,subtree:true});setTimeout(run,500);setTimeout(run,1200);
})();