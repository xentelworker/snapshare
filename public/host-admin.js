(()=>{
  const API='/api/portal';
  let isAdmin=false, adminButton=null, clientButton=null, overlay=null;
  const getMe=async()=>{try{const r=await fetch(API+'/me',{credentials:'same-origin'});if(!r.ok)return null;return (await r.json()).user||null}catch{return null}};
  const close=()=>{if(overlay){overlay.remove();overlay=null}};
  const openAdmin=()=>{
    if(overlay)return;
    overlay=document.createElement('div');
    overlay.id='snapshare-admin-overlay';
    overlay.innerHTML=`<div class="ss-admin-shell"><div class="ss-admin-bar"><strong>SnapShare Administration</strong><button type="button" id="ssAdminClose">Back to Events</button></div><iframe title="SnapShare Administration" src="/admin?embed=1"></iframe></div>`;
    document.body.appendChild(overlay);
    document.getElementById('ssAdminClose').onclick=close;
  };
  const openClient=()=>{window.location.assign('/client')};
  const fixSignOut=(aside)=>{
    const signOut=[...aside.querySelectorAll('button')].find(b=>/sign out/i.test(b.textContent||''));
    if(!signOut||signOut.dataset.ssLogoutFixed)return signOut;
    signOut.dataset.ssLogoutFixed='1';
    signOut.addEventListener('click',()=>{
      setTimeout(()=>window.location.replace('/'),250);
    },{capture:true});
    return signOut;
  };
  const addButtons=()=>{
    const aside=document.querySelector('.host-shell aside');
    if(!aside)return;
    const signOut=fixSignOut(aside);
    if(isAdmin&&!adminButton?.isConnected){
      adminButton=document.createElement('button');
      adminButton.type='button';
      adminButton.id='snapshareAdminButton';
      adminButton.className='ghost';
      adminButton.textContent='Administration';
      adminButton.onclick=openAdmin;
      if(signOut)aside.insertBefore(adminButton,signOut);else aside.appendChild(adminButton);
    }
    if(!clientButton?.isConnected){
      clientButton=document.createElement('button');
      clientButton.type='button';
      clientButton.id='snapshareClientButton';
      clientButton.className='ghost';
      clientButton.textContent='Client Portal';
      clientButton.onclick=openClient;
      if(signOut)aside.insertBefore(clientButton,signOut);else aside.appendChild(clientButton);
    }
  };
  const css=document.createElement('style');
  css.textContent=`#snapshareAdminButton,#snapshareClientButton{width:100%;margin:8px 0}#snapshare-admin-overlay{position:fixed;inset:0;z-index:99999;background:#f5f7fb}.ss-admin-shell{height:100%;display:flex;flex-direction:column}.ss-admin-bar{height:58px;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;padding:10px 18px;background:#111827;color:#fff}.ss-admin-bar button{background:#fff;color:#111827;border:0;border-radius:10px;padding:10px 14px;cursor:pointer}.ss-admin-shell iframe{border:0;width:100%;flex:1;background:#f5f7fb}`;
  document.head.appendChild(css);
  getMe().then(u=>{isAdmin=u?.role==='admin';if(u){addButtons();new MutationObserver(addButtons).observe(document.body,{childList:true,subtree:true})}});
})();
