import base from './v111.js';

const enc=new TextEncoder();
const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
const cookie=(req,name)=>req.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.split('=').slice(1).join('=');
const token=(n=48)=>[...crypto.getRandomValues(new Uint8Array(n))].map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,n);
const clean=(s,n=4000)=>String(s??'').trim().slice(0,n);
async function hash(value,salt){const key=await crypto.subtle.importKey('raw',enc.encode(value),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:100000,hash:'SHA-256'},key,256);return [...new Uint8Array(bits)].map(b=>b.toString(16).padStart(2,'0')).join('')}
async function me(req,env){const sid=cookie(req,'ss_session');if(!sid)return null;return env.DB.prepare("SELECT users.id,users.email,users.role,users.is_active FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.id=? AND sessions.expires_at > datetime('now') AND users.is_active=1").bind(sid).first()}
async function eventAccess(env,u,eventId){if(!u)return null;const e=await env.DB.prepare('SELECT * FROM events WHERE id=?').bind(eventId).first();if(!e)return null;if(u.role==='admin'||e.owner_id===u.id)return {event:e,can_download:true,can_edit_branding:true};const co=await env.DB.prepare('SELECT user_id FROM cohosts WHERE event_id=? AND user_id=?').bind(eventId,u.id).first();if(co)return {event:e,can_download:true,can_edit_branding:true};if(u.role!=='client')return null;const a=await env.DB.prepare('SELECT can_download,can_edit_branding FROM client_event_access WHERE event_id=? AND user_id=?').bind(eventId,u.id).first();if(!a)return null;return {event:e,can_download:!!a.can_download,can_edit_branding:!!a.can_edit_branding}}
async function invitationReady(env){try{await env.DB.prepare('SELECT invitation_text FROM events LIMIT 1').first();return true}catch{return false}}
async function injectScript(response,src){if(!response.ok)return response;const ct=response.headers.get('content-type')||'';if(!ct.includes('text/html'))return response;let text=await response.text();text=text.replace('</body>',`<script src="${src}" defer></script></body>`);const h=new Headers(response.headers);h.delete('content-length');h.set('cache-control','no-store');return new Response(text,{status:response.status,headers:h})}

export default {async fetch(req,env){const url=new URL(req.url),method=req.method;
  if(url.pathname==='/client'||url.pathname==='/client/')return injectScript(await base.fetch(req,env),'/client-v120.js');
  if(url.pathname==='/admin'||url.pathname==='/admin/')return injectScript(await base.fetch(req,env),'/admin-v120.js');

  if(url.pathname==='/api/register'&&method==='POST')return json({error:'Host self-registration is disabled. Client accounts are created by an administrator.'},403);

  if(url.pathname==='/api/portal/password'&&method==='POST'){
    const u=await me(req,env);if(!u)return json({error:'Unauthorized'},401);const b=await req.json(),current=String(b.current_password||''),next=String(b.new_password||'');
    if(next.length<10)return json({error:'New password must be at least 10 characters.'},400);const row=await env.DB.prepare('SELECT password_hash,password_salt FROM users WHERE id=?').bind(u.id).first();if(!row||await hash(current,row.password_salt)!==row.password_hash)return json({error:'Current password is incorrect.'},400);
    const salt=token(32);await env.DB.prepare('UPDATE users SET password_hash=?,password_salt=? WHERE id=?').bind(await hash(next,salt),salt,u.id).run();await env.DB.prepare('DELETE FROM sessions WHERE user_id=? AND id<>?').bind(u.id,cookie(req,'ss_session')||'').run();return json({ok:true});
  }

  let m=url.pathname.match(/^\/api\/portal\/admin\/clients\/([^/]+)\/reset-password$/);
  if(m&&method==='POST'){
    const u=await me(req,env);if(!u||u.role!=='admin')return json({error:'Admin access required.'},403);const target=await env.DB.prepare("SELECT id,email FROM users WHERE id=? AND role='client'").bind(m[1]).first();if(!target)return json({error:'Client not found.'},404);let b={};try{b=await req.json()}catch{}let password=String(b.password||'');if(!password)password=`Snap-${token(14)}`;if(password.length<10)return json({error:'Password must be at least 10 characters.'},400);const salt=token(32);await env.DB.prepare('UPDATE users SET password_hash=?,password_salt=? WHERE id=?').bind(await hash(password,salt),salt,target.id).run();await env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(target.id).run();return json({ok:true,email:target.email,temporary_password:password});
  }

  if(url.pathname==='/api/portal/admin/stats'&&method==='GET'){
    const u=await me(req,env);if(!u||u.role!=='admin')return json({error:'Admin access required.'},403);let archive=true;try{await env.DB.prepare('SELECT archived_at FROM events LIMIT 1').first()}catch{archive=false}
    const [events,clients,media,gb,rv]=await Promise.all([env.DB.prepare(archive?"SELECT COUNT(*) total,SUM(CASE WHEN archived_at IS NULL THEN 1 ELSE 0 END) active,SUM(CASE WHEN archived_at IS NOT NULL THEN 1 ELSE 0 END) archived FROM events":"SELECT COUNT(*) total,COUNT(*) active,0 archived FROM events").first(),env.DB.prepare("SELECT COUNT(*) count FROM users WHERE role='client'").first(),env.DB.prepare('SELECT COUNT(*) count,COALESCE(SUM(size),0) bytes FROM media').first(),env.DB.prepare('SELECT COUNT(*) count FROM guestbook').first(),env.DB.prepare('SELECT COUNT(*) count FROM rsvps').first()]);return json({events:{total:+events.total||0,active:+events.active||0,archived:+events.archived||0},clients:+clients.count||0,media:{count:+media.count||0,bytes:+media.bytes||0},guestbook:+gb.count||0,rsvps:+rv.count||0});
  }

  m=url.pathname.match(/^\/api\/portal\/admin\/events\/([^/]+)\/clients$/);
  if(m&&method==='GET'){
    const u=await me(req,env);if(!u||u.role!=='admin')return json({error:'Admin access required.'},403);const r=await env.DB.prepare("SELECT users.id,users.email,users.is_active,client_event_access.can_edit_branding,client_event_access.can_manage_media,client_event_access.can_manage_albums,client_event_access.can_view_rsvp,client_event_access.can_manage_guestbook,client_event_access.can_download FROM client_event_access JOIN users ON users.id=client_event_access.user_id WHERE client_event_access.event_id=? ORDER BY users.email").bind(m[1]).all();return json({clients:r.results});
  }

  m=url.pathname.match(/^\/api\/portal\/events\/([^/]+)\/invitation$/);
  if(m&&method==='PATCH'){
    const u=await me(req,env);if(!u)return json({error:'Unauthorized'},401);if(!await invitationReady(env))return json({error:'Apply migration 0006_client_experience.sql first.'},503);const a=await eventAccess(env,u,m[1]);if(!a)return json({error:'Not found'},404);if(!a.can_edit_branding)return json({error:'Event details permission is disabled.'},403);const b=await req.json();await env.DB.prepare('UPDATE events SET invitation_text=? WHERE id=?').bind(clean(b.invitation_text,4000)||null,m[1]).run();return json({ok:true});
  }

  m=url.pathname.match(/^\/api\/portal\/media\/([^/]+)\/download$/);
  if(m&&method==='GET'){
    const u=await me(req,env);if(!u)return json({error:'Unauthorized'},401);const row=await env.DB.prepare('SELECT id,event_id,filename,object_key,type FROM media WHERE id=?').bind(m[1]).first();if(!row)return json({error:'Not found'},404);const a=await eventAccess(env,u,row.event_id);if(!a)return json({error:'Not found'},404);if(!a.can_download)return json({error:'Download permission is disabled.'},403);const obj=await env.MEDIA.get(row.object_key);if(!obj)return json({error:'Media file not found.'},404);const h=new Headers();obj.writeHttpMetadata(h);h.set('content-type',row.type||h.get('content-type')||'application/octet-stream');h.set('content-disposition',`attachment; filename="${String(row.filename||'download').replace(/["\r\n]/g,'_')}"`);h.set('cache-control','private,no-store');return new Response(obj.body,{headers:h});
  }

  return base.fetch(req,env);
}};
