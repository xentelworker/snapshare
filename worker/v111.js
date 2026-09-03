import base from './v110.js';

const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
const cookie=(req,name)=>req.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.split('=').slice(1).join('=');
const bool=v=>v?1:0;
const FEATURE_KEYS=['moderation_enabled','allow_downloads','allow_comments','allow_rsvp','strip_image_metadata','max_upload_mb','allow_photo_uploads','allow_video_uploads','allow_written_guestbook','allow_video_guestbook','allow_audio_guestbook','allow_gallery','allow_slideshow','allow_albums'];

async function currentPortalUser(req,env){
  const sid=cookie(req,'ss_session');
  if(!sid)return null;
  return env.DB.prepare("SELECT users.id,users.email,users.role,users.is_active FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.id=? AND sessions.expires_at > datetime('now') AND users.is_active=1").bind(sid).first();
}
async function archiveSchemaReady(env){
  try{await env.DB.prepare('SELECT auto_archive,archived_at FROM events LIMIT 1').first();return true}catch{return false}
}
async function autoArchiveDue(env){
  if(!await archiveSchemaReady(env))return;
  await env.DB.prepare("UPDATE events SET archived_at=datetime('now') WHERE auto_archive=1 AND archived_at IS NULL AND event_date IS NOT NULL AND datetime(event_date,'+30 day') <= datetime('now')").run();
}
async function archivedByAccessKey(env,key){
  if(!await archiveSchemaReady(env))return false;
  const e=await env.DB.prepare('SELECT archived_at FROM events WHERE access_key=?').bind(key).first();
  return !!e?.archived_at;
}
function rebuildJsonRequest(req,body){
  const headers=new Headers(req.headers);headers.set('content-type','application/json');
  return new Request(req.url,{method:req.method,headers,body:JSON.stringify(body),redirect:req.redirect});
}

export default {async fetch(req,env){
  const url=new URL(req.url);
  const ready=await archiveSchemaReady(env);
  if(ready)await autoArchiveDue(env);

  if(url.pathname==='/api/portal/admin/events/archive-status'&&req.method==='GET'){
    const u=await currentPortalUser(req,env);if(!u||u.role!=='admin')return json({error:'Admin access required.'},403);
    if(!ready)return json({error:'Apply migration 0005_event_archiving.sql first.'},503);
    const r=await env.DB.prepare('SELECT id,name,event_date,auto_archive,archived_at FROM events ORDER BY created_at DESC').all();
    return json({events:r.results});
  }

  let m=url.pathname.match(/^\/api\/portal\/admin\/events\/([^/]+)\/archive-settings$/);
  if(m&&req.method==='PATCH'){
    const u=await currentPortalUser(req,env);if(!u||u.role!=='admin')return json({error:'Admin access required.'},403);
    if(!ready)return json({error:'Apply migration 0005_event_archiving.sql first.'},503);
    const b=await req.json(),enabled=bool(b.auto_archive);
    await env.DB.prepare('UPDATE events SET auto_archive=?, archived_at=CASE WHEN ?=0 THEN NULL ELSE archived_at END WHERE id=?').bind(enabled,enabled,m[1]).run();
    if(enabled)await autoArchiveDue(env);
    const e=await env.DB.prepare('SELECT id,name,event_date,auto_archive,archived_at FROM events WHERE id=?').bind(m[1]).first();
    return json({event:e});
  }

  if(url.pathname==='/api/portal/events'&&req.method==='GET'&&ready){
    const u=await currentPortalUser(req,env);
    const r=await base.fetch(req,env);
    if(!u||u.role!=='client'||!r.ok)return r;
    const d=await r.json();
    d.events=(d.events||[]).filter(e=>!e.archived_at);
    return json(d,r.status,Object.fromEntries(r.headers));
  }

  m=url.pathname.match(/^\/api\/portal\/events\/([^/]+)\/manage$/);
  if(m&&req.method==='GET'&&ready){
    const u=await currentPortalUser(req,env);
    if(u?.role==='client'){
      const e=await env.DB.prepare('SELECT archived_at FROM events WHERE id=?').bind(m[1]).first();
      if(e?.archived_at)return json({error:'This event has been archived.'},410);
    }
  }

  if((url.pathname.startsWith('/api/portal/events/')||url.pathname.startsWith('/api/events/'))&&req.method==='PATCH'){
    const u=await currentPortalUser(req,env);
    if(u?.role==='client'){
      let body={};try{body=await req.json()}catch{}
      if(FEATURE_KEYS.some(k=>Object.prototype.hasOwnProperty.call(body,k)))return json({error:'Event features are controlled by the administrator.'},403);
      req=rebuildJsonRequest(req,body);
    }
  }

  m=url.pathname.match(/^\/api\/public\/([^/]+)/);
  if(m&&ready){
    if(await archivedByAccessKey(env,m[1]))return json({error:'This event has been archived.'},410);
  }

  return base.fetch(req,env);
}};
