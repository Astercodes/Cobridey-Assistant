import {handleUpload} from '@vercel/blob/client';
import {get} from '@vercel/blob';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {authenticated,signature,equal} from '../lib/auth.mjs';
import {mediaPath,mediaTypes} from '../lib/content-media.mjs';
export default async function handler(req,res){
 const json=(value,status=200)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value))};
 res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');
 try{
  const env=process.env,url=new URL(req.url,'https://localhost');
  if(!env.BLOB_READ_WRITE_TOKEN||!env.WORKSPACE_PASSWORD)return json({error:'Cloud uploads need a private Blob store and workspace password. Use device drafts until setup is complete.'},503);
  if(req.method==='GET'){
   const path=url.searchParams.get('path'),expires=url.searchParams.get('expires'),sig=url.searchParams.get('sig');
   const signed=env.CRON_SECRET&&expires&&Number(expires)>Date.now()&&Number(expires)<Date.now()+25*3600000&&sig&&equal(sig,signature(`${path}:${expires}`,env.CRON_SECRET));
   if(!authenticated(req,env.WORKSPACE_PASSWORD)&&!signed)return json({error:'Sign in required'},401);
   if(!mediaPath(path))return json({error:'Invalid media path'},400);
   const result=await get(path,{access:'private',token:env.BLOB_READ_WRITE_TOKEN});
   if(!result||result.statusCode!==200)return json({error:'File not found'},404);
   res.setHeader('Content-Type',result.blob.contentType||'application/octet-stream');
   // Stream private content, never expose the Blob token or publicize the store.
   await pipeline(Readable.fromWeb(result.stream),res);return;
  }
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  let body=req.body;if(body===undefined){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>20000)return json({error:'Request too large'},413)}body=JSON.parse(raw)}else if(typeof body==='string')body=JSON.parse(body);
  const result=await handleUpload({token:env.BLOB_READ_WRITE_TOKEN,request:req,body,
   onBeforeGenerateToken:async pathname=>{
    if(!authenticated(req,env.WORKSPACE_PASSWORD))throw Error('Sign in required');
    if(req.headers.origin!==`https://${req.headers.host}`)throw Error('Origin rejected');
    if(!env.UPSTASH_REDIS_REST_URL||!env.UPSTASH_REDIS_REST_TOKEN)throw Error('Connect workspace storage before cloud uploads');
    if(!mediaPath(pathname))throw Error('Invalid media path');
    return {allowedContentTypes:mediaTypes,maximumSizeInBytes:100*1024*1024,validUntil:Date.now()+15*60000,addRandomSuffix:false,allowOverwrite:false};
   }
  });return json(result);
 }catch(error){if(res.headersSent){res.destroy();return}return json({error:'Media request failed. Check your session, file type, and private Blob configuration.'},400)}
}
