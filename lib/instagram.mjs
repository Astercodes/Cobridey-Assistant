import {signature} from './auth.mjs';
export function instagramReady(env){return Boolean(env.INSTAGRAM_ACCOUNT_ID&&env.INSTAGRAM_ACCESS_TOKEN&&/^v\d+\.\d+$/.test(env.INSTAGRAM_API_VERSION||'')&&env.APP_URL&&env.CRON_SECRET&&env.BLOB_READ_WRITE_TOKEN&&env.UPSTASH_REDIS_REST_URL&&env.UPSTASH_REDIS_REST_TOKEN&&env.WORKSPACE_PASSWORD)}
export function publishingIssue(post){
 if(post.music?.mode==='preference')return 'Preferred music must be added in Instagram. Manual publishing required.';
 const files=post.attachments||[];
 if(!files.length)return 'Attach a cloud-uploaded image or video before publishing.';
 if(files.some(f=>!f.pathname))return 'Device-only media must be uploaded to cloud storage first.';
 if(files.length>1&&files.some(f=>f.type!=='image/jpeg'))return 'Automatic carousels currently require JPEG images only.';
 if(files.length===1&&!['image/jpeg','video/mp4','video/quicktime'].includes(files[0].type))return 'Instagram auto-publishing supports JPEG photos or MP4/MOV Reels. Export other formats for manual publishing.';
 if((post.copy||'').length>2200)return 'Instagram captions must be 2,200 characters or fewer.';
 return null;
}
export function mediaSource(file,env,now=Date.now()){
 const url=new URL('/api/media',env.APP_URL);if(url.protocol!=='https:')throw Error('APP_URL must use HTTPS');
 const expires=String(now+24*3600000);url.searchParams.set('path',file.pathname);url.searchParams.set('expires',expires);url.searchParams.set('sig',signature(`${file.pathname}:${expires}`,env.CRON_SECRET));return url.href;
}
export function createInstagram(env,request=fetch){
 const base=`https://graph.facebook.com/${env.INSTAGRAM_API_VERSION}`;
 async function call(path,params,method='GET'){
  const url=new URL(base+'/'+path);const options={method,headers:{Authorization:`Bearer ${env.INSTAGRAM_ACCESS_TOKEN}`},signal:AbortSignal.timeout(12000)};
  if(method==='POST')options.body=new URLSearchParams(params);else for(const [k,v]of Object.entries(params||{}))url.searchParams.set(k,v);
  const response=await request(url,options);const data=await response.json();if(!response.ok||data.error){const error=Error('Instagram rejected the request. Check media eligibility, permissions, and credentials.');error.code=data.error?.code;throw error}return data;
 }
 return {async create(file,caption,carousel=false){const params={...file.type.startsWith('video/')?{video_url:mediaSource(file,env),media_type:carousel?'VIDEO':'REELS'}:{image_url:mediaSource(file,env)}};if(carousel)params.is_carousel_item='true';else params.caption=caption;const result=await call(`${env.INSTAGRAM_ACCOUNT_ID}/media`,params,'POST');if(!result.id)throw Error('Instagram returned no container ID');return result.id},
 async carousel(children,caption){const result=await call(`${env.INSTAGRAM_ACCOUNT_ID}/media`,{media_type:'CAROUSEL',children:children.join(','),caption},'POST');if(!result.id)throw Error('Instagram returned no carousel ID');return result.id},
 status:id=>call(id,{fields:'status_code'}),
 async publish(id){const result=await call(`${env.INSTAGRAM_ACCOUNT_ID}/media_publish`,{creation_id:id},'POST');if(!result.id)throw Error('Instagram returned no published post ID');return result.id},
 permalink:id=>call(id,{fields:'permalink'})};
}
