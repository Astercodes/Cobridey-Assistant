export const mediaTypes=['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime'];
export const mediaPath=value=>typeof value==='string'&&/^cobridey\/[a-f0-9-]{36}\.(jpg|jpeg|png|webp|mp4|webm|mov)$/.test(value);
export function validateMedia(items){
 if(!Array.isArray(items)||items.length>10)throw Error('Attach up to 10 files per content item.');
 return items.map(item=>{
  if(!item||!mediaTypes.includes(item.type)||!mediaPath(item.pathname)||!Number.isSafeInteger(item.size)||item.size<=0||item.size>100*1024*1024)throw Error('Invalid media attachment. Use an image or video up to 100 MB.');
  return {id:String(item.id).slice(0,80),name:String(item.name).slice(0,200),type:item.type,size:item.size,pathname:item.pathname,alt:String(item.alt||'').slice(0,2000)};
 });
}
export function validateMusic(value){
 if(!value||typeof value!=='object')return {title:'',artist:'',url:'',notes:'',mode:'none'};
 const music={title:String(value.title||'').slice(0,200),artist:String(value.artist||'').slice(0,200),url:String(value.url||'').slice(0,1500),notes:String(value.notes||'').slice(0,2000),mode:value.mode||'none'};
 if(!['none','preference','embedded'].includes(music.mode))throw Error('Invalid music option.');
 if(music.url){const u=new URL(music.url);if(!['http:','https:'].includes(u.protocol))throw Error('Use an http or https song link.');}
 return music;
}
export function updateCreative(post,input){
 const before=JSON.stringify({attachments:post.attachments||[],music:post.music||null,copy:post.copy});
 if(input.attachments!==undefined)post.attachments=validateMedia(input.attachments);
 if(input.music!==undefined)post.music=validateMusic(input.music);
 const changed=before!==JSON.stringify({attachments:post.attachments||[],music:post.music||null,copy:input.copy??post.copy})||['title','channel','format'].some(k=>input[k]!==undefined&&input[k]!==post[k]);
 if(changed&&['Approved','Scheduled'].includes(post.status))post.status='Needs review';
 return changed;
}
