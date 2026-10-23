import {instagramReady} from '../lib/instagram.mjs';
import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {createHostedStore} from '../lib/hosted-store.mjs';
import {mutate} from '../lib/mutate.mjs';
function equal(a,b){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)}
function signature(value,password){return createHmac('sha256',password).update(value).digest('base64url')}
export function createHandler(env=process.env,request=fetch){
 const store=createHostedStore(env,request);
 return async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const json=(value,status=200)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value))};
  try{
   const path=new URL(req.url,'https://localhost').pathname;
   if(!['GET','POST'].includes(req.method))return json({error:'Method not allowed'},405);
   let body={};
   if(req.method==='POST'){
    const origin=req.headers.origin;
    if(origin&&origin!==`https://${req.headers.host}`)return json({error:'Origin rejected'},403);
    // Vercel may preparse JSON. Bound both parsed and streamed request bodies.
    if(req.body!==undefined){const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body);if(Buffer.byteLength(raw)>100000)return json({error:'Request too large'},413);body=typeof req.body==='string'?JSON.parse(raw):req.body}
    else{let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>100000)return json({error:'Request too large'},413)}body=JSON.parse(raw||'{}')}
    if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'Invalid request'},400);
   }
   const password=env.WORKSPACE_PASSWORD;
   // A configured database must never be exposed through an unprotected preview.
   if(store.configured&&!password)return json({error:'Set WORKSPACE_PASSWORD in Vercel before enabling hosted storage.'},503);
   if(path==='/api/login'){
    if(req.method!=='POST')return json({error:'Method not allowed'},405);
    if(!password)return json({ok:true,preview:true});
    if(!equal(String(body.password||''),password))return json({error:'Incorrect password'},401);
    const value=`${Date.now()+12*3600000}.${randomUUID()}`;
    res.setHeader('Set-Cookie',`session=${value}.${signature(value,password)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200`);
    return json({ok:true});
   }
   if(password){const cookie=req.headers.cookie?.match(/(?:^|; )session=([^;]+)/)?.[1]||'';const parts=cookie.split('.');const value=parts.slice(0,2).join('.');if(parts.length!==3||!equal(parts[2],signature(value,password))||!(Number(parts[0])>Date.now()))return json({error:'Sign in required'},401)}
   if(path==='/api/state'&&req.method==='GET'){
    const {value}=await store.read();return json({...value,storage:store.configured?'hosted':'preview',readOnly:!store.configured,mediaReady:Boolean(store.configured&&env.BLOB_READ_WRITE_TOKEN&&env.WORKSPACE_PASSWORD),publishing:{ready:instagramReady(env),enabled:env.PUBLISHING_ENABLED==='true'&&instagramReady(env),lastTick:await store.lastTick()}});
   }
   if(path==='/api/action'&&req.method==='POST'){
    if(!store.configured)return json({error:'Read-only preview: connect hosted storage in Vercel to save changes. Nothing was saved.'},503);
    if(body.status==='Scheduled'&&(env.PUBLISHING_ENABLED!=='true'||!instagramReady(env)))return json({error:'Connect Instagram, private media storage, and a background scheduler before enabling automatic scheduling.'},409);
    const {value,raw}=await store.read();mutate(value,body);
    value.audit=[{id:randomUUID(),time:new Date().toISOString(),action:body.action},...(value.audit||[])];
    await store.save(value,raw);return json({ok:true});
   }
   return json({error:'Not found'},404);
  }catch(error){if(error.status===409)return json({error:error.message},409);if(error instanceof SyntaxError)return json({error:'Invalid JSON'},400);if(/Hosted storage/.test(error.message)||error.name==='TimeoutError')return json({error:'Hosted storage is unavailable. Please retry; changes were not confirmed.'},503);return json({error:error.message?.slice(0,200)||'The request could not be completed.'},400)}
 };
}
export default createHandler();
