(()=>{
  if(window.__snapshareV140)return;window.__snapshareV140=true;
  document.documentElement.classList.add('ss14');
  const path=location.pathname;
  const role=path.startsWith('/admin')?'admin':path.startsWith('/client')?'client':path.startsWith('/e/')?'guest':'host';
  document.documentElement.dataset.ssRole=role;
  const css=document.createElement('style');css.textContent=`
:root{--ss14-ink:#172033;--ss14-muted:#64748b;--ss14-line:#e7eaf0;--ss14-card:#fff;--ss14-bg:#f5f7fb;--ss14-blue:#3157d5;--ss14-green:#17875d;--ss14-shadow:0 12px 38px rgba(15,23,42,.08)}
html.ss14{background:var(--ss14-bg)}.ss14 body{background:var(--ss14-bg);color:var(--ss14-ink)}
.ss14 .card,.ss14 .tile,.ss14-event-card{border:1px solid var(--ss14-line)!important;box-shadow:var(--ss14-shadow)!important;border-radius:22px!important}
.ss14 button,.ss14 .button{min-height:42px;transition:transform .16s ease,box-shadow .16s ease,background .16s ease}
.ss14 button:hover,.ss14 .button:hover{transform:translateY(-1px)}.ss14 button:focus-visible,.ss14 a:focus-visible,.ss14 input:focus-visible,.ss14 textarea:focus-visible{outline:3px solid #93c5fd;outline-offset:2px}
.ss14 .notice{border:1px solid #bfdbfe;background:#eff6ff;color:#1e3a8a}.ss14-share-focus{outline:3px solid #93c5fd;outline-offset:4px;transition:outline-color 1.8s ease}.ss14 .muted{color:var(--ss14-muted)}
.ss14-quickbar{position:sticky;top:0;z-index:40;display:flex;align-items:center;gap:10px;padding:10px 18px;background:rgba(245,247,251,.9);backdrop-filter:blur(15px);border-bottom:1px solid var(--ss14-line)}
.ss14-quickbar strong{margin-right:auto}.ss14-quickbar button{margin:0}.ss14-status{display:inline-flex;align-items:center;gap:7px;padding:7px 11px;border-radius:999px;background:#ecfdf5;color:#166534;font-size:12px;font-weight:800}.ss14-status:before{content:'';width:7px;height:7px;border-radius:50%;background:#22c55e}
.ss14-upload-cta{position:fixed;right:22px;bottom:22px;z-index:50;border-radius:999px!important;padding:14px 20px!important;background:var(--ss14-blue)!important;box-shadow:0 15px 35px rgba(49,87,213,.35)!important}
.ss14-upload-cta span{font-size:19px;margin-right:7px}.ss14-empty{text-align:center;padding:42px 20px;color:var(--ss14-muted)}
.ss14 .gallery{gap:14px}.ss14 .tile{cursor:zoom-in;transition:transform .18s ease,box-shadow .18s ease}.ss14 .tile:hover{transform:translateY(-3px);box-shadow:0 18px 46px rgba(15,23,42,.13)!important}.ss14 .tile img{transition:transform .3s ease}.ss14 .tile:hover img{transform:scale(1.015)}
.ss14-lightbox{position:fixed;inset:0;z-index:10000;background:rgba(2,6,23,.96);display:grid;grid-template-rows:auto 1fr auto;color:#fff}.ss14-lightbox[hidden]{display:none}.ss14-lbtop,.ss14-lbbottom{display:flex;align-items:center;gap:10px;padding:12px 18px}.ss14-lbtop strong{margin-right:auto}.ss14-lightbox button{background:#ffffff18;color:#fff;border:1px solid #ffffff25}.ss14-lbbody{display:grid;grid-template-columns:64px 1fr 64px;align-items:center;min-height:0}.ss14-lbbody img{max-width:100%;max-height:76vh;margin:auto;object-fit:contain;border-radius:10px}.ss14-lbbody>button{margin:10px}.ss14-lbbottom{overflow:auto;justify-content:center}.ss14-lbbottom img{width:58px;height:45px;object-fit:cover;border-radius:7px;opacity:.56;cursor:pointer;border:2px solid transparent}.ss14-lbbottom img.active{opacity:1;border-color:#fff}
.ss14-progress{height:8px;background:#e2e8f0;border-radius:99px;overflow:hidden;margin:8px 0}.ss14-progress i{display:block;height:100%;width:0;background:linear-gradient(90deg,#3157d5,#22c55e);transition:width .3s}
.ss14 .upload input[type=file]{padding:18px;border:2px dashed #cbd5e1;background:#f8fafc}.ss14 .upload input[type=file]:hover{border-color:var(--ss14-blue);background:#eef2ff}
.ss14[data-ss-role=admin] .ss13-pagehead,.ss14[data-ss-role=client] .ss13-hero{animation:ss14in .35s ease both}@keyframes ss14in{from{opacity:0;transform:translateY(8px)}}
@media(max-width:720px){.ss14-quickbar{padding:8px 10px}.ss14-quickbar strong,.ss14-status{display:none}.ss14-upload-cta{right:14px;bottom:82px}.ss14-lbbody{grid-template-columns:44px 1fr 44px}.ss14-lbbody>button{margin:4px;padding:8px}.ss14-lbbottom{justify-content:flex-start}.ss14 .gallery{grid-template-columns:repeat(2,minmax(0,1fr))}.ss14 .tilebody{padding:.7rem}}
`;document.head.appendChild(css);

  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const text=(root,selector)=>root.querySelector(selector)?.textContent?.trim()||'';
  function findButton(label){return [...document.querySelectorAll('button,a.button')].find(x=>x.offsetParent!==null&&x.textContent.trim().toLowerCase().includes(label.toLowerCase()))}
  function enhanceUpload(){
    const upload=document.querySelector('.upload');if(!upload||upload.dataset.ss14)return;upload.dataset.ss14='1';
    const input=upload.querySelector('input[type=file]');if(input&&!input.getAttribute('aria-label'))input.setAttribute('aria-label','Choose photos or videos');
    const p=document.createElement('div');p.className='ss14-progress';p.innerHTML='<i></i>';upload.appendChild(p);
    const submit=[...upload.querySelectorAll('button')].find(b=>/upload/i.test(b.textContent));if(submit){const observer=new MutationObserver(()=>{const busy=/uploading/i.test(submit.textContent);p.querySelector('i').style.width=busy?'72%':/success|uploaded/i.test(upload.textContent)?'100%':'0'});observer.observe(upload,{childList:true,subtree:true,characterData:true})}
  }
  function mountGuestCTA(){
    if(role!=='guest'||document.querySelector('.ss14-upload-cta'))return;const upload=findButton('upload');if(!upload)return;
    const b=document.createElement('button');b.className='ss14-upload-cta';b.innerHTML='<span>＋</span> Add memories';b.onclick=()=>upload.click();document.body.appendChild(b)
  }
  function mountQuickbar(){
    if((role!=='client'&&role!=='admin')||document.querySelector('.ss14-quickbar'))return;
    const bar=document.createElement('div');bar.className='ss14-quickbar';bar.innerHTML='<strong>SnapShare workspace</strong><span class="ss14-status">Ready</span><button class="ghost" data-ss14-preview>Preview guest page</button><button class="ghost" data-ss14-share>Sharing kit</button>';
    document.body.prepend(bar);
    bar.querySelector('[data-ss14-preview]').onclick=()=>{
      const event=typeof data!=='undefined'?data?.event:null;
      if(event?.access_key){window.open(location.origin+'/e/'+encodeURIComponent(event.access_key),'_blank','noopener');return}
      const b=findButton('guest gallery')||findButton('view event')||findButton('open gallery');
      b?b.click():alert('Open an event to preview its guest page.')
    };
    bar.querySelector('[data-ss14-share]').onclick=()=>{
      if(typeof tab==='function'&&typeof data!=='undefined'&&data?.event){tab('overview')}
      requestAnimationFrame(()=>setTimeout(()=>{
        const target=document.querySelector('.qr-wrap,.qr-card,.invite-text')||findButton('copy guest link')||findButton('download qr');
        if(target){target.scrollIntoView({behavior:'smooth',block:'center'});target.closest?.('.card')?.classList.add('ss14-share-focus');setTimeout(()=>target.closest?.('.card')?.classList.remove('ss14-share-focus'),1800)}
        else alert('Open an event to access its sharing tools.')
      },80))
    }
  }
  function galleryImages(){return [...document.querySelectorAll('.gallery .tile img')].filter(x=>x.offsetParent!==null&&x.src)}
  function mountLightbox(){
    if(role!=='guest'||document.querySelector('.ss14-lightbox'))return;let i=0,playing=null;
    const box=document.createElement('div');box.className='ss14-lightbox';box.hidden=true;box.innerHTML='<div class="ss14-lbtop"><strong></strong><button data-play>▶ Slideshow</button><button data-full>⛶ Fullscreen</button><button data-close aria-label="Close">✕</button></div><div class="ss14-lbbody"><button data-prev aria-label="Previous">‹</button><img alt=""><button data-next aria-label="Next">›</button></div><div class="ss14-lbbottom"></div>';document.body.appendChild(box);
    const render=()=>{const imgs=galleryImages();if(!imgs.length)return;const src=imgs[i]?.currentSrc||imgs[i]?.src;box.querySelector('.ss14-lbbody img').src=src;box.querySelector('.ss14-lbtop strong').textContent=(i+1)+' of '+imgs.length;box.querySelector('.ss14-lbbottom').innerHTML=imgs.map((x,n)=>'<img class="'+(n===i?'active':'')+'" data-i="'+n+'" src="'+esc(x.currentSrc||x.src)+'" alt="">').join('');box.querySelectorAll('[data-i]').forEach(t=>t.onclick=()=>{i=+t.dataset.i;render()})};
    const move=d=>{const n=galleryImages().length;if(n){i=(i+d+n)%n;render()}};
    document.addEventListener('click',e=>{const img=e.target.closest?.('.gallery .tile img');if(!img)return;const imgs=galleryImages();i=Math.max(0,imgs.indexOf(img));box.hidden=false;document.body.style.overflow='hidden';render()});
    box.querySelector('[data-close]').onclick=()=>{box.hidden=true;document.body.style.overflow='';clearInterval(playing);playing=null};
    box.querySelector('[data-prev]').onclick=()=>move(-1);box.querySelector('[data-next]').onclick=()=>move(1);box.querySelector('[data-full]').onclick=()=>box.requestFullscreen?.();
    box.querySelector('[data-play]').onclick=e=>{if(playing){clearInterval(playing);playing=null;e.currentTarget.textContent='▶ Slideshow'}else{playing=setInterval(()=>move(1),4000);e.currentTarget.textContent='Ⅱ Pause'}};
    document.addEventListener('keydown',e=>{if(box.hidden)return;if(e.key==='Escape')box.querySelector('[data-close]').click();if(e.key==='ArrowLeft')move(-1);if(e.key==='ArrowRight')move(1)})
  }
  function labelIcons(){document.querySelectorAll('button').forEach(b=>{if(!b.getAttribute('aria-label')&&!b.textContent.trim()&&b.querySelector('svg,img'))b.setAttribute('aria-label',b.title||'Action')})}
  function enhance(){mountQuickbar();mountGuestCTA();mountLightbox();enhanceUpload();labelIcons()}
  new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});enhance();
})();