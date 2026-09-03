import base from './v120.js';

const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
const cookie=(req,name)=>req.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.split('=').slice(1).join('=');
async function me(req,env){const sid=cookie(req,'ss_session');if(!sid)return null;return env.DB.prepare("SELECT users.id,users.email,users.role,users.is_active FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.id=? AND sessions.expires_at > datetime('now') AND users.is_active=1").bind(sid).first()}
async function coverReady(env){try{await env.DB.prepare('SELECT cover_image_key,cover_image_position FROM events LIMIT 1').first();return true}catch{return false}}
async function access(env,u,eventId){if(!u)return null;const e=await env.DB.prepare('SELECT * FROM events WHERE id=?').bind(eventId).first();if(!e)return null;if(u.role==='admin'||e.owner_id===u.id)return {event:e,can_edit:true};const co=await env.DB.prepare('SELECT user_id FROM cohosts WHERE event_id=? AND user_id=?').bind(eventId,u.id).first();if(co)return {event:e,can_edit:true};if(u.role!=='client')return null;const a=await env.DB.prepare('SELECT can_edit_branding FROM client_event_access WHERE event_id=? AND user_id=?').bind(eventId,u.id).first();return a?{event:e,can_edit:!!a.can_edit_branding}:null}
async function injectScript(response,src){if(!response.ok)return response;const ct=response.headers.get('content-type')||'';if(!ct.includes('text/html'))return response;let text=await response.text();text=text.replace('</body>',`<script src="${src}" defer></script></body>`);const h=new Headers(response.headers);h.delete('content-length');h.set('cache-control','no-store');return new Response(text,{status:response.status,headers:h})}
const extFor=t=>t==='image/png'?'.png':t==='image/webp'?'.webp':t==='image/gif'?'.gif':'.jpg';

export default {async fetch(req,env){const url=new URL(req.url),method=req.method;
  if(url.pathname==='/client'||url.pathname==='/client/')return injectScript(await base.fetch(req,env),'/client-v130.js');
  if(url.pathname==='/admin'||url.pathname==='/admin/')return injectScript(await base.fetch(req,env),'/admin-v130.js');

  let m=url.pathname.match(/^\/api\/portal\/events\/([^/]+)\/cover$/);
  if(m&&(method==='POST'||method==='DELETE')){
    const u=await me(req,env);if(!u)return json({error:'Unauthorized'},401);if(!await coverReady(env))return json({error:'Apply migration 0007_event_cover_images.sql first.'},503);const a=await access(env,u,m[1]);if(!a)return json({error:'Not found'},404);if(!a.can_edit)return json({error:'Event branding permission is disabled.'},403);
    if(method==='DELETE'){if(a.event.cover_image_key)await env.MEDIA.delete(a.event.cover_image_key);await env.DB.prepare('UPDATE events SET cover_image_key=NULL WHERE id=?').bind(m[1]).run();return json({ok:true,cover_image_key:null});}
    const form=await req.formData();const file=form.get('file');const position=String(form.get('position')||'center').slice(0,30);if(!(file instanceof File)||!file.size)return json({error:'Choose an image to upload.'},400);if(!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type))return json({error:'Cover image must be JPG, PNG, WEBP, or GIF.'},400);if(file.size>12*1024*1024)return json({error:'Cover image must be 12 MB or smaller.'},400);const key=`event-covers/${m[1]}/${crypto.randomUUID()}${extFor(file.type)}`;await env.MEDIA.put(key,file.stream(),{httpMetadata:{contentType:file.type,cacheControl:'public, max-age=86400'}});if(a.event.cover_image_key)await env.MEDIA.delete(a.event.cover_image_key);await env.DB.prepare('UPDATE events SET cover_image_key=?,cover_image_position=? WHERE id=?').bind(key,position,m[1]).run();return json({ok:true,cover_image_key:key,cover_url:'/media/'+encodeURIComponent(key)});
  }

  return base.fetch(req,env);
}};
