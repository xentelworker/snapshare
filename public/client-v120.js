(()=>{
  const css=document.createElement('style');
  css.textContent=`.ss-admin-preview{background:#111827;color:#fff;padding:10px 14px;border-radius:12px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.ss-status{padding:12px 14px;border-radius:12px;margin:12px 0;background:#eef2ff}.ss-status.warn{background:#fff7ed}.ss-status.off{background:#f1f5f9}.ss-actions{display:flex;gap:8px;flex-wrap:wrap}.ss-progress{height:8px;background:#e5e7eb;border-radius:99px;overflow:hidden;margin-top:10px}.ss-progress>span{display:block;height:100%;background:#111827;width:0;transition:width .2s}.ss-toast{position:fixed;right:20px;bottom:20px;z-index:99999;background:#111827;color:#fff;padding:12px 16px;border-radius:12px;box-shadow:0 10px 30px #0003;max-width:340px}.ss-account input{width:min(100%,460px);box-sizing:border-box;display:block;margin:8px 0}@media(max-width:700px){main{padding:14px}.row.spread{align-items:flex-start}.row.spread>div:last-child{width:100%}.row.spread>div:last-child button,.row.spread>div:last-child select{width:100%;margin:4px 0}.tabs{display:flex;overflow-x:auto;padding-bottom:6px}.tabs button{white-space:nowrap}.grid{grid-template-columns:1fr}.media{grid-template-columns:1fr}table{font-size:13px}.qr-wrap{align-items:flex-start}.invite-text{width:100%}}`;
  document.head.appendChild(css);

  const notify=(msg)=>{document.querySelector('.ss-toast')?.remove();const n=document.createElement('div');n.className='ss-toast';n.textContent=msg;document.body.appendChild(n);setTimeout(()=>n.remove(),2600)};
  const fmtBytes=n=>{n=Number(n)||0;if(n<1024)return n+' B';if(n<1048576)return (n/1024).toFixed(1)+' KB';if(n<1073741824)return (n/1048576).toFixed(1)+' MB';return (n/1073741824).toFixed(2)+' GB'};
  const defaultInvite=()=>{const e=data.event,url=location.origin+'/e/'+e.access_key;return `You're invited to ${e.name}!\n\nScan the QR code or open the private link to upload photos and videos, view event memories, leave a guestbook message, and RSVP. No guest account is required.\n\n${url}`};
  invitationText=function(){return (data?.event?.invitation_text||'').trim()||defaultInvite()};
  copyInvitation=function(){navigator.clipboard.writeText(invitationText()).then(()=>notify('Invitation text copied.'))};

  const oldRender=renderEvent;
  renderEvent=function(){
    oldRender();
    if(user?.role==='admin'){
      const main=document.querySelector('main');if(main&&!main.querySelector('.ss-admin-preview')){const b=document.createElement('div');b.className='ss-admin-preview';b.innerHTML='<span><b>Administrator Preview</b> — you are viewing the client experience.</span><button class="ghost" type="button">Return to Host Portal</button>';b.querySelector('button').onclick=()=>location.href='/';main.prepend(b)}
    }
    if(user?.role==='client'){
      const tabs=document.querySelector('.tabs');if(tabs&&!document.getElementById('ssAccountTab')){const b=document.createElement('button');b.id='ssAccountTab';b.className='ghost';b.textContent='Account';b.onclick=accountPanel;tabs.appendChild(b)}
    }
  };

  const oldOverview=overview;
  overview=function(){
    oldOverview();
    const e=data.event,p=data.permissions||{},url=location.origin+'/e/'+e.access_key;
    const top=document.createElement('div');top.className='card';top.innerHTML='<h3>Quick Actions</h3><div class="ss-actions"><button type="button" id="ssOpenGuest">Open Guest Gallery</button><button type="button" class="ghost" id="ssCopyGuest">Copy Guest Link</button></div>';
    top.querySelector('#ssOpenGuest').onclick=()=>window.open(url,'_blank','noopener');top.querySelector('#ssCopyGuest').onclick=()=>navigator.clipboard.writeText(url).then(()=>notify('Guest link copied.'));
    panel.insertBefore(top,panel.firstChild);

    if(e.event_date){const d=new Date(e.event_date+'T00:00:00');d.setDate(d.getDate()+30);const days=Math.ceil((d-Date.now())/86400000);const s=document.createElement('div');s.className='ss-status '+(e.auto_archive?'warn':'off');s.innerHTML=e.auto_archive?`<b>Event lifecycle:</b> This event is scheduled to archive on ${d.toLocaleDateString()}${days>=0?` (${days} day${days===1?'':'s'} remaining)`:''}.`:'<b>Event lifecycle:</b> Automatic archiving is turned off for this event.';panel.insertBefore(s,top.nextSibling)}

    const ta=document.querySelector('.invite-text');if(ta){ta.value=invitationText();if(p.can_edit_branding){ta.removeAttribute('readonly');const wrap=ta.parentElement;const btn=document.createElement('button');btn.type='button';btn.textContent='Save Invitation Text';btn.onclick=async()=>{try{await api('/events/'+e.id+'/invitation',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({invitation_text:ta.value})});data.event.invitation_text=ta.value;notify('Invitation text saved.')}catch(x){notify(x.message)}};wrap.appendChild(btn)}}
  };

  const oldMedia=media;
  media=function(){
    oldMedia();
    const items=(data.media||[]).filter(m=>!m.is_guestbook);document.querySelectorAll('.media a[download]').forEach((a,i)=>{if(items[i])a.href='/api/portal/media/'+items[i].id+'/download'});
  };

  const loadZip=()=>new Promise((resolve,reject)=>{if(window.JSZip)return resolve(window.JSZip);const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';s.onload=()=>resolve(window.JSZip);s.onerror=()=>reject(new Error('Unable to load ZIP support.'));document.head.appendChild(s)});
  downloadAll=async function(){
    const p=data?.permissions||{};if(!p.can_download)return notify('Download permission is disabled.');const files=(data.media||[]).filter(m=>m.url);if(!files.length)return notify('There are no media files to download.');
    const button=[...document.querySelectorAll('button')].find(b=>/download all/i.test(b.textContent||''));const old=button?.textContent;if(button){button.disabled=true;button.textContent='Preparing ZIP…'}
    const prog=document.createElement('div');prog.className='ss-progress';prog.innerHTML='<span></span>';button?.parentElement?.appendChild(prog);
    try{const JSZip=await loadZip(),zip=new JSZip();for(let i=0;i<files.length;i++){const m=files[i];const r=await fetch('/api/portal/media/'+m.id+'/download');if(!r.ok)throw new Error((await r.json().catch(()=>({}))).error||'Unable to download '+m.filename);const blob=await r.blob();let folder='Other';if(m.is_guestbook&&m.type.startsWith('audio'))folder='Audio Guestbook';else if(m.is_guestbook&&m.type.startsWith('video'))folder='Video Guestbook';else if(m.type.startsWith('image'))folder='Photos';else if(m.type.startsWith('video'))folder='Videos';zip.folder(folder).file(m.filename||('file-'+(i+1)),blob);prog.querySelector('span').style.width=Math.round(((i+1)/files.length)*80)+'%'}
      const meta=await api('/events/'+data.event.id+'/export');zip.file('snapshare-export.json',JSON.stringify(meta,null,2));if(data.rsvps?.length){const csv=['Name,Status,Party,Email,Note',...data.rsvps.map(r=>[r.name,r.status,r.party_size,r.email,r.note].map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(','))].join('\n');zip.file('RSVP.csv',csv)}prog.querySelector('span').style.width='90%';const blob=await zip.generateAsync({type:'blob'});prog.querySelector('span').style.width='100%';const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(data.event.slug||'snapshare-event')+'-all-media.zip';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),10000);notify(`ZIP ready: ${files.length} files (${fmtBytes(files.reduce((n,m)=>n+(Number(m.size)||0),0))})`)}catch(e){notify(e.message||'Download failed.')}finally{if(button){button.disabled=false;button.textContent=old||'Download All'}setTimeout(()=>prog.remove(),1000)}};

  function accountPanel(){
    panel.innerHTML='<div class="card ss-account"><h2>Account</h2><p class="muted">Change your client portal password.</p><input id="ssCurrentPw" type="password" placeholder="Current password"><input id="ssNewPw" type="password" minlength="10" placeholder="New password (10+ characters)"><input id="ssConfirmPw" type="password" minlength="10" placeholder="Confirm new password"><button id="ssChangePw" type="button">Change Password</button></div>';
    document.getElementById('ssChangePw').onclick=async()=>{const current=document.getElementById('ssCurrentPw').value,next=document.getElementById('ssNewPw').value,confirm=document.getElementById('ssConfirmPw').value;if(next!==confirm)return notify('New passwords do not match.');try{await api('/password',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({current_password:current,new_password:next})});notify('Password changed successfully.');document.getElementById('ssCurrentPw').value=document.getElementById('ssNewPw').value=document.getElementById('ssConfirmPw').value=''}catch(e){notify(e.message)}};
  }

  setTimeout(()=>{try{if(typeof data!=='undefined'&&data)renderEvent()}catch{}},700);
})();
