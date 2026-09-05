(()=>{
  const removeText=()=>{
    document.querySelectorAll('button,a,[role="tab"],label,h1,h2,h3,h4,p,span,small').forEach(el=>{
      const t=(el.textContent||'').trim();
      if(/^guestbook$/i.test(t)||/^audio guestbook$/i.test(t)||/^video guestbook$/i.test(t)) el.style.display='none';
    });
  };
  const css=document.createElement('style');
  css.textContent='[data-tab="guestbook"],[data-moretab="guestbook"]{display:none!important}';
  document.head.appendChild(css);
  new MutationObserver(removeText).observe(document.documentElement,{childList:true,subtree:true});
  removeText();
})();