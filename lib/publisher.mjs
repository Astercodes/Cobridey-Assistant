import {randomUUID} from 'node:crypto';
import {createInstagram,instagramReady,publishingIssue} from './instagram.mjs';
export async function runPublisher(store,env,request=fetch){
 if(env.PUBLISHING_ENABLED!=='true'||!instagramReady(env))return {enabled:false,message:'Configure Instagram, private media storage, workspace storage, and the scheduler before enabling publishing.'};
 const lock=randomUUID();if(!await store.claim(lock))return {busy:true};
 const ig=createInstagram(env,request),outcomes=[];
 const patch=async(id,fn)=>{for(let i=0;i<4;i++){const {value,raw}=await store.read();const post=value.posts.find(p=>p.id===id);if(!post)throw Error('Post not found');fn(post,value);try{await store.save(value,raw);return post}catch(e){if(e.status!==409||i===3)throw e}}};
 try{
  if(store.recordTick)await store.recordTick();
  const {value}=await store.read();if(value.paused)return {paused:true};
  const candidates=value.posts.filter(p=>p.channel==='Instagram'&&((p.status==='Scheduled'&&Date.parse(p.date)<=Date.now()+15*60000)||p.status==='Processing')).sort((a,b)=>Date.parse(a.date)-Date.parse(b.date)).slice(0,1);
  for(const candidate of candidates){
   let current=(await store.read()).value;if(current.paused)break;let post=current.posts.find(p=>p.id===candidate.id);
   const issue=publishingIssue(post);if(issue){await patch(post.id,p=>{p.status='Manual handoff';p.publishingError=issue});outcomes.push({id:post.id,status:'Manual handoff'});continue}
   if(post.status==='Scheduled')post=await patch(post.id,p=>{p.status='Processing';p.job={startedAt:new Date().toISOString(),children:[],stage:'create',attempts:0}});
   const job=post.job;
   if(!job)continue;
   // A publish request is recorded before transmission. Ambiguous outcomes are
   // never retried automatically, avoiding duplicate public posts.
   if(job.stage==='sending'){await patch(post.id,p=>{p.status='Needs reconciliation';p.publishingError='A previous publish request had no confirmed receipt. Check Instagram before taking further action.'});continue}
   try{
    if(job.stage==='create'){
     if(post.attachments.length>1){
      for(let n=0;n<2&&job.children.length<post.attachments.length;n++){
       const id=await ig.create(post.attachments[job.children.length],'',true);job.children.push(id);
       await patch(post.id,p=>{p.job={...job}});
      }
      if(job.children.length<post.attachments.length){outcomes.push({id:post.id,status:'Creating carousel'});continue}
      for(const id of job.children){const child=await ig.status(id);if(child.status_code==='ERROR'||child.status_code==='EXPIRED')throw Error('Instagram could not process a carousel item');if(child.status_code!=='FINISHED')return {outcomes,pending:true}}
      job.containerId=await ig.carousel(job.children,post.copy);
     }else job.containerId=await ig.create(post.attachments[0],post.copy);
     job.stage='processing';await patch(post.id,p=>{p.job={...job}});outcomes.push({id:post.id,status:'Processing'});continue;
    }
    const status=await ig.status(job.containerId);
    if(status.status_code==='ERROR'||status.status_code==='EXPIRED')throw Error('Instagram could not process this media');
    if(status.status_code!=='FINISHED'){outcomes.push({id:post.id,status:'Processing'});continue}
    if(Date.parse(post.date)>Date.now()){outcomes.push({id:post.id,status:'Ready for scheduled time'});continue}
    current=(await store.read()).value;if(current.paused)break;
    await patch(post.id,(p,s)=>{if(s.paused)throw Error('Publishing paused');p.job.stage='sending';p.job.sentAt=new Date().toISOString()});
    const platformId=await ig.publish(job.containerId);
    await patch(post.id,(p,s)=>{p.status='Published';p.receipt={platform:'Instagram',id:platformId,publishedAt:new Date().toISOString(),url:null};p.job.stage='complete';s.audit=[{id:randomUUID(),time:new Date().toISOString(),action:`instagram.published:${platformId}`},...(s.audit||[])]});
    try{const link=await ig.permalink(platformId);await patch(post.id,p=>{p.receipt.url=link.permalink||null})}catch{}
    outcomes.push({id:post.id,status:'Published',platformId});
   }catch(error){await patch(post.id,p=>{if(p.status==='Published')return;p.status=p.job.stage==='sending'?'Needs reconciliation':'Failed';p.publishingError=p.status==='Needs reconciliation'?'Publishing outcome is uncertain. Check Instagram; this post will not be sent again automatically.':'Instagram processing failed. Review your account, media, and permissions before rescheduling.'});outcomes.push({id:post.id,status:'Needs attention'})}
  }
  return {enabled:true,outcomes};
 }finally{await store.release(lock)}
}
