(()=>{
  if(!location.pathname.startsWith('/e/'))return;
  const css=document.createElement('style');
  css.textContent=`
    .slide-wrap.ss-true-fullscreen{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;max-width:none!important;max-height:none!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:#050505!important;z-index:2147483646!important;display:block!important}
    .slide-wrap.ss-true-fullscreen .slideshow{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;min-height:100%!important;max-height:none!important;margin:0!important;border-radius:0!important;background:#050505!important}
    .slide-wrap.ss-true-fullscreen .ss-live-slide{width:100%!important;height:100%!important;object-fit:contain!important}
    .slide-wrap.ss-true-fullscreen .slide-controls{position:absolute!important;z-index:50!important;left:50%!important;bottom:18px!important;transform:translateX(-50%)!important;display:flex!important;gap:8px!important;width:auto!important;max-width:calc(100% - 24px)!important;background:rgba(5,5,5,.55)!important;padding:8px!important;border-radius:14px!important;backdrop-filter:blur(8px)!important}
    .slide-wrap.ss-true-fullscreen .ss-slide-brand{display:flex!important}
    .slide-wrap.ss-true-fullscreen .ss-live-badge{z-index:55!important}
    .slide-wrap:fullscreen{width:100vw!important;height:100vh!important;max-width:none!important;max-height:none!important;margin:0!important;padding:0!important;background:#050505!important}
    .slide-wrap:fullscreen .slideshow{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;min-height:100%!important;max-height:none!important;border-radius:0!important}
    .slide-wrap:fullscreen .ss-live-slide{width:100%!important;height:100%!important;object-fit:contain!important}
    html.ss-slideshow-lock,html.ss-slideshow-lock body{overflow:hidden!important}
  `;
  document.head.appendChild(css);

  function getWrap(){const slide=document.querySelector('.slideshow');return slide?.closest('.slide-wrap')||slide?.parentElement||null}
  function isFull(wrap){return document.fullscreenElement===wrap||wrap?.classList.contains('ss-true-fullscreen')}
  async function enter(wrap){
    if(!wrap)return;
    try{
      if(wrap.requestFullscreen){await wrap.requestFullscreen({navigationUI:'hide'});return}
    }catch{}
    wrap.classList.add('ss-true-fullscreen');document.documentElement.classList.add('ss-slideshow-lock')
  }
  async function exit(wrap){
    if(document.fullscreenElement){try{await document.exitFullscreen();return}catch{}}
    wrap?.classList.remove('ss-true-fullscreen');document.documentElement.classList.remove('ss-slideshow-lock')
  }
  function normalize(){
    const wrap=getWrap();if(!wrap)return;
    const controls=wrap.querySelector('.slide-controls');if(!controls)return;
    const buttons=[...controls.querySelectorAll('button')].filter(b=>/full\s*screen/i.test((b.textContent||'').trim())||/fullscreen/i.test(b.getAttribute('aria-label')||''));
    let primary=buttons.find(b=>b.classList.contains('ss-live-fullscreen'))||buttons[0];
    buttons.forEach(b=>{if(b!==primary)b.remove()});
    if(!primary){primary=document.createElement('button');primary.type='button';primary.className='ss-live-fullscreen';controls.appendChild(primary)}
    primary.classList.add('ss-live-fullscreen');primary.setAttribute('aria-label','Toggle slideshow fullscreen');
    primary.onclick=async e=>{e.preventDefault();e.stopPropagation();isFull(wrap)?await exit(wrap):await enter(wrap);update()};
    const update=()=>{primary.textContent=isFull(wrap)?'Exit Fullscreen':'Fullscreen'};update();
    if(!wrap.dataset.ssFsBound){wrap.dataset.ssFsBound='1';document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement){wrap.classList.remove('ss-true-fullscreen');document.documentElement.classList.remove('ss-slideshow-lock')}update()})}
  }
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){const wrap=getWrap();if(wrap?.classList.contains('ss-true-fullscreen'))exit(wrap)}});
  const obs=new MutationObserver(normalize);obs.observe(document.documentElement,{childList:true,subtree:true});normalize();
})();