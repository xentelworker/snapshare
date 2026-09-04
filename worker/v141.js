import base from './v130.js';

async function inject(response,src){
  if(!response.ok)return response;
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;
  let body=await response.text();
  if(!body.includes(src))body=body.replace('</body>',`<script src="${src}" defer></script></body>`);
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.set('cache-control','no-store');
  return new Response(body,{status:response.status,headers});
}

export default {
  async fetch(request,env,ctx){
    const response=await base.fetch(request,env,ctx);
    const path=new URL(request.url).pathname;
    if(path==='/client'||path==='/client/'||path==='/admin'||path==='/admin/'){
      return inject(response,'/v141.js');
    }
    return response;
  }
};
