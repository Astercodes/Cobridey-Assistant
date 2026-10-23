import {seed} from './seed.mjs';
const key='cobridey:workspace:v1';
export function createHostedStore(env=process.env,request=fetch){
 const configured=Boolean(env.UPSTASH_REDIS_REST_URL&&env.UPSTASH_REDIS_REST_TOKEN);
 async function command(args){
  const url=new URL(env.UPSTASH_REDIS_REST_URL);
  if(url.protocol!=='https:')throw Error('Hosted storage requires HTTPS');
  const response=await request(url,{method:'POST',headers:{Authorization:`Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error('Hosted storage is unavailable');
  const data=await response.json();if(data.error)throw Error('Hosted storage command failed');return data.result;
 }
 return {configured,
 async recordTick(){await command(['SET','cobridey:publisher:last-tick',String(Date.now()),'EX','300'])},
 async lastTick(){return configured?Number(await command(['GET','cobridey:publisher:last-tick']))||null:null},
 async claim(token){return await command(['SET','cobridey:publisher:lock',token,'NX','PX','180000'])==='OK'},
 async release(token){await command(['EVAL',"if redis.call('GET',KEYS[1]) == ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end",'1','cobridey:publisher:lock',token])},
 async read(){
  if(!configured)return {value:structuredClone({...seed,audit:[]}),raw:null};
  let raw=await command(['GET',key]);
  if(raw===null){await command(['SET',key,JSON.stringify({...seed,audit:[]}), 'NX']);raw=await command(['GET',key])}
  if(typeof raw!=='string')throw Error('Hosted storage returned invalid data');
  return {value:JSON.parse(raw),raw};
 },async save(value,previous){
  if(!configured)throw Error('Hosted storage is not configured');
  const script="if redis.call('GET',KEYS[1]) == ARGV[1] then redis.call('SET',KEYS[1],ARGV[2]); return 1 else return 0 end";
  const result=await command(['EVAL',script,'1',key,previous,JSON.stringify(value)]);
  if(result!==1){const error=Error('Workspace changed in another request. Reload and try again.');error.status=409;throw error}
 }};
}
