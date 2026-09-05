(()=>{
  const route=location.pathname.match(/^\/e\/([^/]+)/);if(!route)return;
  const eventKey=route[1];
  const REFRESH_MS=8000,DISPLAY_MS=6500,FADE_MS=1200;
  let images=[],current=0,timer=null,pollTimer=null,lastInteraction=0,activeContainer=null,front=null,back=null;

  const css=document.createElement('style');
  css.textContent=`
    .slideshow{position:relative!important;overflow:hidden;background:#050505;min-height:min(72vh,800px)}
    .slideshow.ss-live-ready>img:not(.ss-live-slide){opacity:0!important;visibility:hidden!important}
    .ss-live-slide{position:absolute!important;inset:0;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;object-fit:contain!important;opacity:0;transition:opacity ${FADE_MS}ms ease-in-out;background:#050505;z-index:2}
    .ss-live-slide.ss-show{opacity:1;z-index:3}
    .slide-wrap{position:relative}
    .slide-controls{transition:opacity .45s ease;opacity:1}
    .slide-wrap.ss-controls-hidden .slide-controls{opacity:0;pointer-events:none}
    .ss-live-badge{position:absolute;top:14px;right:14px;z-index:8;background:rgba(17,24,39,.72);color:#fff;border:1px solid rgba(255,255,255,.16);backdrop-filter:blur(8px);padding:7px 10px;border-radius:999px;font:700 12px/1 system-ui;transition:opacity .35s ease}
    .slide-wrap.ss-controls-hidden .ss-live-badge{opacity:.25}
    .ss-live-fullscreen{background:#fff!important;color:#111827!important}
    @media(prefers-reduced-motion:reduce){.ss-live-slide{transition:none!important}.slide-controls{transition:none!important}}
  `;
  document.head.appendChild(css);

  const safeUrl=m=>{
    if(!m)return null;
    if(m.url)return m.url;
    if(m.thumbnail_url)return m.thumbnail_url;
    if(m.object_key)return '/media/'+encodeURIComponent(m.object_key);
    if(m.key)return '/media/'+encodeURIComponent(m.key);
    return null;
  };
  const isImage=m=>{
    const t=String(m?.type||m?.mime_type||m?.content_type||'').toLowerCase();
    const n=String(m?.filename||m?.name||m?.url||'').toLowerCase();
    return t.startsWith('image/')||/\.(jpe?g|png|webp|gif|heic|avif)(\?|$)/.test(n);
  };
  function extractMedia(d){
    const candidates=[d?.media,d?.uploads,d?.photos,d?.items,d?.event?.media,d?.event?.uploads,d?.data?.media].filter(Array.isArray);
    return candidates[0]||[];
  }
  function normalize(list){
    const seen=new Set(),out=[];
    for(const m of list){
      if(!isImage(m)||m?.is_guestbook)continue;
      if(m?.status&&m.status!=='approved')continue;
      const url=safeUrl(m);if(!url||seen.has(url))continue;seen.add(url);out.push({id:m.id||url,url,created:m.created_at||m.created||''});
    }
    return out;
  }
  function preload(url){if(!url)return;const i=new Image();i.decoding='async';i.src=url}
  function setBadge(){const b=document.querySelector('.ss-live-badge');if(b)b.textContent=`Live · ${images.length} photo${images.length===1?'':'s'}`}
  function show(index,instant=false){
    if(!activeContainer||!images.length||!front||!back)return;
    current=((index%images.length)+images.length)%images.length;
    const item=images[current],next=images[(current+1)%images.length];preload(next?.url);
    const incoming=front.classList.contains('ss-show')?back:front,outgoing=incoming===front?back:front;
    incoming.src=item.url;incoming.alt='Event slideshow photo';
    if(instant){incoming.style.transition='none';incoming.classList.add('ss-show');outgoing.classList.remove('ss-show');requestAnimationFrame(()=>incoming.style.transition='');}
    else requestAnimationFrame(()=>{incoming.classList.add('ss-show');outgoing.classList.remove('ss-show')});
  }
  function restartCycle(){clearInterval(timer);if(images.length>1)timer=setInterval(()=>show(current+1),DISPLAY_MS)}
  function install(container){
    if(container===activeContainer&&front&&back)return;
    activeContainer=container;container.classList.add('ss-live-ready');
    front=document.createElement('img');back=document.createElement('img');front.className='ss-live-slide';back.className='ss-live-slide';container.append(front,back);
    const wrap=container.closest('.slide-wrap')||container.parentElement;
    if(wrap&&!wrap.querySelector('.ss-live-badge')){const badge=document.createElement('div');badge.className='ss-live-badge';badge.textContent='Live';wrap.appendChild(badge)}
    if(wrap&&!wrap.querySelector('.ss-live-fullscreen')){const controls=wrap.querySelector('.slide-controls');if(controls){const btn=document.createElement('button');btn.type='button';btn.className='ss-live-fullscreen';btn.textContent='Fullscreen';btn.onclick=()=>{const target=wrap;if(!document.fullscreenElement)target.requestFullscreen?.();else document.exitFullscreen?.()};controls.appendChild(btn)}}
    const wake=()=>{lastInteraction=Date.now();wrap?.classList.remove('ss-controls-hidden')};['mousemove','pointerdown','touchstart','keydown'].forEach(e=>wrap?.addEventListener(e,wake,{passive:true}));
    setInterval(()=>{if(wrap&&Date.now()-lastInteraction>3500)wrap.classList.add('ss-controls-hidden')},1000);
    if(images.length){show(Math.min(current,images.length-1),true);restartCycle()}else{
      const existing=container.querySelector('img:not(.ss-live-slide)');if(existing?.src){images=[{id:existing.src,url:existing.src}];show(0,true)}
    }
    setBadge();
  }
  async function refresh(){
    try{
      const r=await fetch('/api/public/'+encodeURIComponent(eventKey),{cache:'no-store',headers:{'accept':'application/json'}});if(!r.ok)throw new Error('refresh failed');
      const d=await r.json(),fresh=normalize(extractMedia(d));
      if(fresh.length){
        const oldIds=new Set(images.map(x=>x.id));const added=fresh.filter(x=>!oldIds.has(x.id));
        const currentId=images[current]?.id;
        images=fresh;
        if(currentId){const i=images.findIndex(x=>x.id===currentId);if(i>=0)current=i}
        if(added.length){added.forEach(x=>preload(x.url));if(images.length>1){const nextIndex=images.findIndex(x=>x.id===added[0].id);if(nextIndex>=0){show(nextIndex);restartCycle()}}}
        else if(activeContainer&&!front?.src)show(current,true);
        setBadge();
      }
    }catch(e){/* Keep the existing slideshow running and retry on the next poll. */}
  }
  function discover(){const c=document.querySelector('.slideshow');if(c)install(c)}
  const obs=new MutationObserver(()=>discover());obs.observe(document.documentElement,{childList:true,subtree:true});
  discover();refresh();pollTimer=setInterval(refresh,REFRESH_MS);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){refresh();discover()}});
})();