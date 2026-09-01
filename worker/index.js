const enc = new TextEncoder();
const json = (body, status=200, headers={}) => new Response(JSON.stringify(body), {status, headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
const uid = () => crypto.randomUUID();
const token = (n=48) => [...crypto.getRandomValues(new Uint8Array(n))].map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,n);
const nowSec = () => Math.floor(Date.now()/1000);
const safeName = s => String(s||'file').replace(/[^a-zA-Z0-9._-]/g,'_').slice(-120);
const clean = (s,n=2000) => String(s??'').trim().slice(0,n);
const bool = v => v ? 1 : 0;
const mediaUrl = key => key ? `/media/${encodeURIComponent(key)}` : null;
const cookie = (req,name) => req.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.split('=').slice(1).join('=');
const sessionCookie = (sid,maxAge=604800,secure=true) => `ss_session=${sid}; Path=/; HttpOnly; SameSite=Lax; ${secure?'Secure; ':''}Max-Age=${maxAge}`;

async function hash(value,salt){
  const key=await crypto.subtle.importKey('raw',enc.encode(value),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:100000,hash:'SHA-256'},key,256);
  return [...new Uint8Array(bits)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function currentUser(req,env){
  const sid=cookie(req,'ss_session'); if(!sid) return null;
  return env.DB.prepare("SELECT users.id,users.email FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.id=? AND sessions.expires_at > datetime('now')").bind(sid).first();
}
async function canManage(env,u,eventId){
  if(!u) return null;
  return env.DB.prepare("SELECT events.*, CASE WHEN events.owner_id=? THEN 'owner' ELSE COALESCE((SELECT role FROM cohosts WHERE event_id=events.id AND user_id=?),'') END AS member_role FROM events WHERE events.id=? AND (events.owner_id=? OR EXISTS(SELECT 1 FROM cohosts WHERE event_id=events.id AND user_id=?))").bind(u.id,u.id,eventId,u.id,u.id).first();
}
async function login(email,password,env,secure=true){
  const u=await env.DB.prepare('SELECT * FROM users WHERE email=?').bind(email).first();
  if(!u || await hash(password,u.password_salt)!==u.password_hash) return json({error:'Invalid email or password.'},401);
  const sid=token(64); await env.DB.prepare("INSERT INTO sessions(id,user_id,expires_at) VALUES(?,?,datetime('now','+7 day'))").bind(sid,u.id).run();
  return json({user:{id:u.id,email:u.email}},200,{'set-cookie':sessionCookie(sid,604800,secure)});
}
async function rateLimit(req,env,scope,limit=30,seconds=60){
  const ip=req.headers.get('CF-Connecting-IP')||'local';
  const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(`${scope}|${ip}`)))].map(x=>x.toString(16).padStart(2,'0')).join('');
  const bucket=`${scope}:${digest}`; const now=nowSec();
  const row=await env.DB.prepare('SELECT count,expires_at FROM rate_limits WHERE bucket=?').bind(bucket).first();
  if(!row || row.expires_at<=now){ await env.DB.prepare('INSERT INTO rate_limits(bucket,count,expires_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=1,expires_at=excluded.expires_at').bind(bucket,now+seconds).run(); return true; }
  if(row.count>=limit) return false;
  await env.DB.prepare('UPDATE rate_limits SET count=count+1 WHERE bucket=?').bind(bucket).run(); return true;
}
async function verifyTurnstile(req,env,provided){
  if(!env.TURNSTILE_SECRET_KEY) return true;
  if(!provided) return false;
  const fd=new FormData(); fd.append('secret',env.TURNSTILE_SECRET_KEY); fd.append('response',provided);
  const ip=req.headers.get('CF-Connecting-IP'); if(ip) fd.append('remoteip',ip);
  const r=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:fd});
  const out=await r.json(); return !!out.success;
}
async function requireGuestGuard(req,env,scope,turnstile){
  if(!await rateLimit(req,env,scope,20,60)) return json({error:'Too many requests. Please try again shortly.'},429);
  if(!await verifyTurnstile(req,env,turnstile)) return json({error:'Security check failed. Please refresh and try again.'},403);
  return null;
}
async function publicEvent(env,key){ return env.DB.prepare('SELECT * FROM events WHERE access_key=?').bind(key).first(); }
async function mediaPayload(env, eventId, albumId=null){
  const sql=`SELECT media.*,
    (SELECT count(*) FROM likes WHERE likes.media_id=media.id) likes,
    (SELECT count(*) FROM favorites WHERE favorites.media_id=media.id) favorites
    FROM media WHERE event_id=? ${albumId?'AND album_id=?':''} AND status='approved' ORDER BY created_at DESC`;
  const res=albumId?await env.DB.prepare(sql).bind(eventId,albumId).all():await env.DB.prepare(sql).bind(eventId).all();
  const out=[];
  for(const m of res.results){
    const c=await env.DB.prepare('SELECT id,guest_name,body,created_at FROM comments WHERE media_id=? ORDER BY created_at').bind(m.id).all();
    out.push({...m,url:mediaUrl(m.object_key),thumbnail_url:mediaUrl(m.thumbnail_key),comments:c.results});
  }
  return out;
}

export default { async fetch(req,env){
  const url=new URL(req.url); const method=req.method;
  try {
    if(url.pathname.startsWith('/media/')){
      const key=decodeURIComponent(url.pathname.slice(7)); const obj=await env.MEDIA.get(key);
      if(!obj) return new Response('Not found',{status:404});
      const h=new Headers(); obj.writeHttpMetadata(h); h.set('etag',obj.httpEtag); h.set('cache-control','public,max-age=31536000,immutable'); h.set('x-content-type-options','nosniff');
      return new Response(obj.body,{headers:h});
    }
    if(!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req);
    const p=url.pathname.slice(4);

    if(p==='/config' && method==='GET') return json({turnstile_site_key:env.TURNSTILE_SITE_KEY||'',max_upload_mb:50});
    if(p==='/register' && method==='POST'){
      if(!await rateLimit(req,env,'register',8,600)) return json({error:'Too many registration attempts.'},429);
      const b=await req.json(); const email=clean(b.email,180).toLowerCase(), password=String(b.password||'');
      if(!/^\S+@\S+\.\S+$/.test(email)||password.length<10) return json({error:'Use a valid email and a password of at least 10 characters.'},400);
      const ps=token(32), rs=token(32), recovery=token(24).toUpperCase(), id=uid();
      const existing=await env.DB.prepare('SELECT id FROM users WHERE email=?').bind(email).first();
      if(existing) return json({error:'That email is already registered.'},409);
      try{await env.DB.prepare('INSERT INTO users(id,email,password_hash,password_salt,recovery_hash,recovery_salt) VALUES(?,?,?,?,?,?)').bind(id,email,await hash(password,ps),ps,await hash(recovery,rs),rs).run();}
      catch(err){console.error('Registration insert failed',err);return json({error:'Unable to create account. Check Worker logs for the database error.'},500)}
      const response=await login(email,password,env,url.protocol==='https:'); const data=await response.json();
      return json({...data,recovery_code:recovery},200,{'set-cookie':response.headers.get('set-cookie')});
    }
    if(p==='/login' && method==='POST'){
      if(!await rateLimit(req,env,'login',15,600)) return json({error:'Too many login attempts.'},429);
      const b=await req.json(); return login(clean(b.email,180).toLowerCase(),String(b.password||''),env,url.protocol==='https:');
    }
    if(p==='/recover' && method==='POST'){
      if(!await rateLimit(req,env,'recover',8,600)) return json({error:'Too many recovery attempts.'},429);
      const b=await req.json(); const email=clean(b.email,180).toLowerCase(), code=clean(b.recovery_code,80).toUpperCase(), password=String(b.new_password||'');
      if(password.length<10) return json({error:'New password must be at least 10 characters.'},400);
      const u=await env.DB.prepare('SELECT * FROM users WHERE email=?').bind(email).first();
      if(!u || await hash(code,u.recovery_salt)!==u.recovery_hash) return json({error:'Invalid recovery details.'},400);
      const ps=token(32); await env.DB.batch([env.DB.prepare('UPDATE users SET password_hash=?,password_salt=? WHERE id=?').bind(await hash(password,ps),ps,u.id),env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(u.id)]);
      return json({ok:true});
    }
    if(p==='/logout' && method==='POST'){
      const sid=cookie(req,'ss_session'); if(sid) await env.DB.prepare('DELETE FROM sessions WHERE id=?').bind(sid).run();
      return json({ok:true},200,{'set-cookie':sessionCookie('',0,url.protocol==='https:')});
    }

    const u=await currentUser(req,env);
    if(p==='/me') return json({user:u});
    if(p==='/events' && method==='GET'){
      if(!u) return json({error:'Unauthorized'},401);
      const r=await env.DB.prepare("SELECT events.*, CASE WHEN owner_id=? THEN 'owner' ELSE COALESCE((SELECT role FROM cohosts WHERE event_id=events.id AND user_id=?),'editor') END AS member_role FROM events WHERE owner_id=? OR EXISTS(SELECT 1 FROM cohosts WHERE event_id=events.id AND user_id=?) ORDER BY created_at DESC").bind(u.id,u.id,u.id,u.id).all();
      return json({events:r.results});
    }
    if(p==='/events' && method==='POST'){
      if(!u) return json({error:'Unauthorized'},401); const b=await req.json(); if(!clean(b.name,120)) return json({error:'Event name is required.'},400);
      const id=uid(), access=token(24); await env.DB.prepare('INSERT INTO events(id,owner_id,name,slug,event_date,access_key) VALUES(?,?,?,?,?,?)').bind(id,u.id,clean(b.name,120),clean(b.name,120).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'event',b.event_date||null,access).run();
      return json({id,access_key:access},201);
    }

    let m=p.match(/^\/events\/([^/]+)$/);
    if(m && method==='PATCH'){
      const e=await canManage(env,u,m[1]); if(!e) return json({error:'Not found'},404); const b=await req.json();
      await env.DB.prepare(`UPDATE events SET name=?,event_date=?,welcome_message=?,primary_color=?,theme=?,font_family=?,moderation_enabled=?,allow_downloads=?,allow_comments=?,allow_rsvp=?,strip_image_metadata=?,max_upload_mb=?,allow_photo_uploads=?,allow_video_uploads=?,allow_written_guestbook=?,allow_video_guestbook=?,allow_audio_guestbook=?,allow_gallery=?,allow_slideshow=?,allow_albums=? WHERE id=?`).bind(
        clean(b.name??e.name,120),b.event_date??e.event_date,clean(b.welcome_message??e.welcome_message,500),clean(b.primary_color??e.primary_color,20),clean(b.theme??e.theme,30),clean(b.font_family??e.font_family,30),bool(b.moderation_enabled??e.moderation_enabled),bool(b.allow_downloads??e.allow_downloads),bool(b.allow_comments??e.allow_comments),bool(b.allow_rsvp??e.allow_rsvp),bool(b.strip_image_metadata??e.strip_image_metadata),Math.max(5,Math.min(100,+b.max_upload_mb||e.max_upload_mb||50)),bool(b.allow_photo_uploads??e.allow_photo_uploads),bool(b.allow_video_uploads??e.allow_video_uploads),bool(b.allow_written_guestbook??e.allow_written_guestbook),bool(b.allow_video_guestbook??e.allow_video_guestbook),bool(b.allow_audio_guestbook??e.allow_audio_guestbook),bool(b.allow_gallery??e.allow_gallery),bool(b.allow_slideshow??e.allow_slideshow),bool(b.allow_albums??e.allow_albums),e.id).run();
      return json({ok:true});
    }
    if(m && method==='DELETE'){
      const e=await canManage(env,u,m[1]); if(!e || e.owner_id!==u.id) return json({error:'Only the event owner can delete it.'},403);
      const keys=await env.DB.prepare('SELECT object_key,thumbnail_key FROM media WHERE event_id=?').bind(e.id).all();
      for(const x of keys.results){ if(x.object_key) await env.MEDIA.delete(x.object_key); if(x.thumbnail_key) await env.MEDIA.delete(x.thumbnail_key); }
      await env.DB.prepare('DELETE FROM events WHERE id=?').bind(e.id).run(); return json({ok:true});
    }
    m=p.match(/^\/events\/([^/]+)\/manage$/);
    if(m && method==='GET'){
      const e=await canManage(env,u,m[1]); if(!e) return json({error:'Not found'},404);
      const [media,albums,guestbook,rsvps,reports,cohosts,invites]=await Promise.all([
        env.DB.prepare("SELECT media.*,(SELECT count(*) FROM likes WHERE media_id=media.id) likes,(SELECT count(*) FROM comments WHERE media_id=media.id) comments FROM media WHERE event_id=? ORDER BY created_at DESC").bind(e.id).all(),
        env.DB.prepare('SELECT * FROM albums WHERE event_id=? ORDER BY sort_order,created_at').bind(e.id).all(),
        env.DB.prepare('SELECT * FROM guestbook WHERE event_id=? ORDER BY created_at DESC').bind(e.id).all(),
        env.DB.prepare('SELECT * FROM rsvps WHERE event_id=? ORDER BY created_at DESC').bind(e.id).all(),
        env.DB.prepare('SELECT reports.*,media.filename FROM reports LEFT JOIN media ON media.id=reports.media_id WHERE reports.event_id=? ORDER BY reports.created_at DESC').bind(e.id).all(),
        env.DB.prepare('SELECT users.email,cohosts.role,cohosts.user_id FROM cohosts JOIN users ON users.id=cohosts.user_id WHERE cohosts.event_id=?').bind(e.id).all(),
        env.DB.prepare("SELECT * FROM cohost_invites WHERE event_id=? AND expires_at > datetime('now') ORDER BY created_at DESC").bind(e.id).all()
      ]);
      return json({event:e,media:media.results.map(x=>({...x,url:mediaUrl(x.object_key),thumbnail_url:mediaUrl(x.thumbnail_key)})),albums:albums.results,guestbook:guestbook.results,rsvps:rsvps.results,reports:reports.results,cohosts:cohosts.results,invites:invites.results});
    }
    m=p.match(/^\/events\/([^/]+)\/albums$/);
    if(m && method==='POST'){
      const e=await canManage(env,u,m[1]); if(!e) return json({error:'Not found'},404); if(!e.allow_albums) return json({error:'Albums are disabled for this event.'},403); const b=await req.json(), id=uid(), access=token(20);
      await env.DB.prepare('INSERT INTO albums(id,event_id,name,access_key,is_private,sort_order) VALUES(?,?,?,?,?,?)').bind(id,e.id,clean(b.name,100)||'Album',access,bool(b.is_private),+b.sort_order||0).run(); return json({id,access_key:access},201);
    }
    m=p.match(/^\/events\/([^/]+)\/cohost-invites$/);
    if(m && method==='POST'){
      const e=await canManage(env,u,m[1]); if(!e || e.owner_id!==u.id) return json({error:'Only the owner can invite co-hosts.'},403); const id=uid(), t=token(40);
      await env.DB.prepare("INSERT INTO cohost_invites(id,event_id,token,role,expires_at) VALUES(?,?,?,'editor',datetime('now','+7 day'))").bind(id,e.id,t).run(); return json({token:t},201);
    }
    m=p.match(/^\/cohost-invites\/([^/]+)\/accept$/);
    if(m && method==='POST'){
      if(!u) return json({error:'Login first to accept this invite.'},401); const inv=await env.DB.prepare("SELECT * FROM cohost_invites WHERE token=? AND expires_at > datetime('now')").bind(m[1]).first(); if(!inv) return json({error:'Invite is invalid or expired.'},404);
      await env.DB.batch([env.DB.prepare('INSERT OR REPLACE INTO cohosts(event_id,user_id,role) VALUES(?,?,?)').bind(inv.event_id,u.id,inv.role),env.DB.prepare('DELETE FROM cohost_invites WHERE id=?').bind(inv.id)]); return json({event_id:inv.event_id});
    }
    m=p.match(/^\/events\/([^/]+)\/export$/);
    if(m && method==='GET'){
      const e=await canManage(env,u,m[1]); if(!e) return json({error:'Not found'},404); const data=await env.DB.prepare('SELECT * FROM media WHERE event_id=?').bind(e.id).all(); const gb=await env.DB.prepare('SELECT * FROM guestbook WHERE event_id=?').bind(e.id).all(); const rv=await env.DB.prepare('SELECT * FROM rsvps WHERE event_id=?').bind(e.id).all(); const al=await env.DB.prepare('SELECT * FROM albums WHERE event_id=?').bind(e.id).all();
      return json({exported_at:new Date().toISOString(),event:e,media:data.results,guestbook:gb.results,rsvps:rv.results,albums:al.results});
    }

    m=p.match(/^\/media\/([^/]+)$/);
    if(m && method==='PATCH'){
      const row=await env.DB.prepare('SELECT * FROM media WHERE id=?').bind(m[1]).first(); if(!row || !await canManage(env,u,row.event_id)) return json({error:'Not found'},404); const b=await req.json();
      if(b.album_id!==undefined){ if(b.album_id){const a=await env.DB.prepare('SELECT id FROM albums WHERE id=? AND event_id=?').bind(b.album_id,row.event_id).first(); if(!a)return json({error:'Album not found'},400);} await env.DB.prepare('UPDATE media SET album_id=? WHERE id=?').bind(b.album_id||null,row.id).run(); }
      if(b.status!==undefined && ['approved','pending','hidden'].includes(b.status)) await env.DB.prepare('UPDATE media SET status=? WHERE id=?').bind(b.status,row.id).run();
      return json({ok:true});
    }
    if(m && method==='DELETE'){
      const row=await env.DB.prepare('SELECT * FROM media WHERE id=?').bind(m[1]).first(); if(!row || !await canManage(env,u,row.event_id)) return json({error:'Not found'},404);
      await env.MEDIA.delete(row.object_key); if(row.thumbnail_key) await env.MEDIA.delete(row.thumbnail_key); await env.DB.prepare('DELETE FROM media WHERE id=?').bind(row.id).run(); return json({ok:true});
    }
    m=p.match(/^\/reports\/([^/]+)$/);
    if(m && method==='PATCH'){
      const r=await env.DB.prepare('SELECT * FROM reports WHERE id=?').bind(m[1]).first(); if(!r || !await canManage(env,u,r.event_id)) return json({error:'Not found'},404); const b=await req.json(); await env.DB.prepare('UPDATE reports SET status=? WHERE id=?').bind(b.status==='resolved'?'resolved':'open',r.id).run(); return json({ok:true});
    }

    m=p.match(/^\/public\/([^/]+)(?:\/([^/]+))?$/);
    if(m && method==='GET'){
      const e=await publicEvent(env,m[1]); if(!e) return json({error:'Event not found'},404); let album=null;
      if(m[2]){album=await env.DB.prepare('SELECT * FROM albums WHERE event_id=? AND access_key=?').bind(e.id,m[2]).first(); if(!album)return json({error:'Album not found'},404)}
      const albums=e.allow_albums?await env.DB.prepare('SELECT id,name,access_key,is_private FROM albums WHERE event_id=? AND is_private=0 ORDER BY sort_order,created_at').bind(e.id).all():{results:[]};
      const gb=e.allow_written_guestbook?await env.DB.prepare('SELECT * FROM guestbook WHERE event_id=? ORDER BY created_at DESC').bind(e.id).all():{results:[]};
      const allMedia=(e.allow_gallery||e.allow_slideshow||e.allow_video_guestbook||e.allow_audio_guestbook)?await mediaPayload(env,e.id,album?.id||null):[];
      const publicMedia=allMedia.filter(x=>!x.is_guestbook);
      const guestbookMedia=allMedia.filter(x=>x.is_guestbook&&((e.allow_video_guestbook&&x.type.startsWith('video/'))||(e.allow_audio_guestbook&&x.type.startsWith('audio/'))));
      return json({event:e,album,media:publicMedia,guestbook_media:guestbookMedia,albums:albums.results,guestbook:gb.results});
    }
    m=p.match(/^\/public\/([^/]+)\/upload$/);
    if(m && method==='POST'){
      const e=await publicEvent(env,m[1]); if(!e) return json({error:'Event not found'},404); const fd=await req.formData(); const guestbookKind=clean(fd.get('guestbook_kind'),10); const isGuestbook=fd.get('is_guestbook')==='1' || guestbookKind==='video' || guestbookKind==='audio'; if(guestbookKind==='video'&&!e.allow_video_guestbook)return json({error:'Video guestbook is disabled for this event.'},403); if(guestbookKind==='audio'&&!e.allow_audio_guestbook)return json({error:'Audio guestbook is disabled for this event.'},403); if(isGuestbook&&!['video','audio'].includes(guestbookKind))return json({error:'Guestbook media type is invalid.'},400); const guard=await requireGuestGuard(req,env,`upload:${e.id}`,fd.get('turnstile_token')); if(guard)return guard;
      const files=fd.getAll('file').filter(x=>x instanceof File), thumbs=fd.getAll('thumbnail').filter(x=>x instanceof File), guest=clean(fd.get('guest_name')||'Guest',80); if(!files.length) return json({error:'No file received.'},400); if(files.length>20)return json({error:'Upload up to 20 files at a time.'},400);
      const max=Math.max(5,Math.min(100,+e.max_upload_mb||50))*1024*1024;
      for(const file of files){ if(file.size>max)return json({error:`Maximum upload size is ${e.max_upload_mb||50} MB per file.`},413); if(!isGuestbook&&!file.type.startsWith('image/')&&!file.type.startsWith('video/'))return json({error:'Only photo and video files are allowed for regular uploads.'},400); if(!isGuestbook&&file.type.startsWith('image/')&&!e.allow_photo_uploads)return json({error:'Photo uploads are disabled for this event.'},403); if(!isGuestbook&&file.type.startsWith('video/')&&!e.allow_video_uploads)return json({error:'Video uploads are disabled for this event.'},403); if(guestbookKind==='video'&&!file.type.startsWith('video/'))return json({error:'Video guestbook accepts video only.'},400); if(guestbookKind==='audio'&&!file.type.startsWith('audio/'))return json({error:'Audio guestbook accepts audio files only.'},400); }
      let albumId=null; const albumKey=fd.get('album_key'); if(albumKey){const a=await env.DB.prepare('SELECT id FROM albums WHERE event_id=? AND access_key=?').bind(e.id,albumKey).first(); if(a)albumId=a.id;}
      const ids=[];
      for(let i=0;i<files.length;i++){
        const file=files[i], id=uid(), filename=safeName(file.name), key=`${e.id}/${Date.now()}-${id}-${filename}`; await env.MEDIA.put(key,file.stream(),{httpMetadata:{contentType:file.type,contentDisposition:`inline; filename=\"${filename}\"`}});
        let thumbKey=null; const thumb=thumbs[i]; if(thumb instanceof File && thumb.size<2*1024*1024 && thumb.type.startsWith('image/')){thumbKey=`${e.id}/thumbs/${id}.jpg`; await env.MEDIA.put(thumbKey,thumb.stream(),{httpMetadata:{contentType:'image/jpeg'}});}
        await env.DB.prepare('INSERT INTO media(id,event_id,album_id,guest_name,filename,object_key,thumbnail_key,type,size,status,is_guestbook) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(id,e.id,albumId,guest,filename,key,thumbKey,file.type,file.size,e.moderation_enabled?'pending':'approved',bool(isGuestbook)).run(); ids.push(id);
      }
      return json({ids,status:e.moderation_enabled?'pending':'approved'},201);
    }
    m=p.match(/^\/public\/([^/]+)\/guestbook$/);
    if(m && method==='POST'){
      const e=await publicEvent(env,m[1]); if(!e)return json({error:'Event not found'},404); if(!e.allow_written_guestbook)return json({error:'Written guestbook is disabled for this event.'},403); const b=await req.json(); const guard=await requireGuestGuard(req,env,`guestbook:${e.id}`,b.turnstile_token); if(guard)return guard; const msg=clean(b.message,2000); if(!msg)return json({error:'Message is required.'},400);
      await env.DB.prepare('INSERT INTO guestbook(id,event_id,guest_name,message) VALUES(?,?,?,?)').bind(uid(),e.id,clean(b.guest_name||'Guest',80),msg).run(); return json({ok:true},201);
    }
    m=p.match(/^\/public\/([^/]+)\/rsvp$/);
    if(m && method==='POST'){
      const e=await publicEvent(env,m[1]); if(!e||!e.allow_rsvp)return json({error:'RSVP is not available.'},404); const b=await req.json(); const guard=await requireGuestGuard(req,env,`rsvp:${e.id}`,b.turnstile_token); if(guard)return guard;
      const name=clean(b.name,80); if(!name)return json({error:'Name is required.'},400); const status=['yes','maybe','no'].includes(b.status)?b.status:'maybe';
      await env.DB.prepare('INSERT INTO rsvps(id,event_id,name,status,party_size,email,note) VALUES(?,?,?,?,?,?,?) ON CONFLICT(event_id,name) DO UPDATE SET status=excluded.status,party_size=excluded.party_size,email=excluded.email,note=excluded.note').bind(uid(),e.id,name,status,Math.max(1,Math.min(20,+b.party_size||1)),clean(b.email,180),clean(b.note,1000)).run(); return json({ok:true});
    }
    m=p.match(/^\/public\/([^/]+)\/media\/([^/]+)\/(like|favorite)$/);
    if(m && method==='POST'){
      const e=await publicEvent(env,m[1]); if(!e||!e.allow_comments)return json({error:'Interactions are disabled.'},403); const b=await req.json(); if(!await rateLimit(req,env,`interact:${e.id}`,40,60))return json({error:'Too many interactions.'},429); const guest=clean(b.guest_name||'Guest',80), table=m[3]==='like'?'likes':'favorites';
      const exists=await env.DB.prepare(`SELECT id FROM ${table} WHERE media_id=? AND guest_name=?`).bind(m[2],guest).first(); if(exists) await env.DB.prepare(`DELETE FROM ${table} WHERE id=?`).bind(exists.id).run(); else await env.DB.prepare(`INSERT INTO ${table}(id,media_id,guest_name) SELECT ?,id,? FROM media WHERE id=? AND event_id=?`).bind(uid(),guest,m[2],e.id).run(); return json({active:!exists});
    }
    m=p.match(/^\/public\/([^/]+)\/media\/([^/]+)\/comments$/);
    if(m && method==='POST'){
      const e=await publicEvent(env,m[1]); if(!e||!e.allow_comments)return json({error:'Comments are disabled.'},403); const b=await req.json(); if(!await rateLimit(req,env,`comment:${e.id}`,15,60))return json({error:'Too many comments.'},429); const body=clean(b.body,500); if(!body)return json({error:'Comment is required.'},400);
      await env.DB.prepare('INSERT INTO comments(id,media_id,guest_name,body) SELECT ?,id,?,? FROM media WHERE id=? AND event_id=?').bind(uid(),clean(b.guest_name||'Guest',80),body,m[2],e.id).run(); return json({ok:true},201);
    }
    m=p.match(/^\/public\/([^/]+)\/report$/);
    if(m && method==='POST'){
      const e=await publicEvent(env,m[1]); if(!e)return json({error:'Event not found'},404); const b=await req.json(); if(!await rateLimit(req,env,`report:${e.id}`,5,600))return json({error:'Too many reports.'},429);
      await env.DB.prepare('INSERT INTO reports(id,event_id,media_id,guest_name,reason) VALUES(?,?,?,?,?)').bind(uid(),e.id,b.media_id||null,clean(b.guest_name||'Guest',80),clean(b.reason,500)||'Reported by guest').run(); return json({ok:true},201);
    }

    return json({error:'Not found'},404);
  } catch(err){ console.error(err); return json({error:'Server error. Check Worker logs for details.'},500); }
}};
