import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mutate} from '../lib/mutate.mjs';
import {seed} from '../lib/seed.mjs';
import {runPublisher} from '../lib/publisher.mjs';
import {publishingIssue,mediaSource} from '../lib/instagram.mjs';
const asset={id:'a',name:'photo.jpg',type:'image/jpeg',size:1000,pathname:'cobridey/11111111-1111-4111-8111-111111111111.jpg',alt:'A wedding table'};
const env={PUBLISHING_ENABLED:'true',INSTAGRAM_ACCOUNT_ID:'account',INSTAGRAM_ACCESS_TOKEN:'secret',INSTAGRAM_API_VERSION:'v24.0',APP_URL:'https://example.com',CRON_SECRET:'cron-secret',BLOB_READ_WRITE_TOKEN:'blob-secret',UPSTASH_REDIS_REST_URL:'https://redis.example',UPSTASH_REDIS_REST_TOKEN:'redis-secret',WORKSPACE_PASSWORD:'password'};
function storeFor(post,paused=false){let state={posts:[post],paused,audit:[]},version=0,locked=false;return {get state(){return structuredClone(state)},async claim(){if(locked)return false;locked=true;return true},async release(){locked=false},async read(){return {value:structuredClone(state),raw:version}},async save(value,previous){if(previous!==version){const e=Error('Conflict');e.status=409;throw e}state=structuredClone(value);version++}}}
function scheduled(){return {id:'1',channel:'Instagram',date:new Date(Date.now()-1000).toISOString(),status:'Scheduled',copy:'An approved caption',attachments:[asset],music:{mode:'none'}}}
test('media validation rejects unsafe paths and invalidates creative approval',()=>{
 const s=structuredClone(seed);s.posts[0].status='Approved';mutate(s,{action:'update',id:'1',attachments:[asset],music:{title:'My song',artist:'Artist',mode:'preference'}});assert.equal(s.posts[0].status,'Needs review');assert.equal(s.posts[0].music.title,'My song');assert.throws(()=>mutate(s,{action:'update',id:'1',attachments:[{...asset,pathname:'../../etc/passwd'}]}));assert.throws(()=>mutate(s,{action:'update',id:'1',music:{url:'javascript:alert(1)'}}));
});
test('music preference is a manual handoff; embedded cleared music may publish',()=>{const post=scheduled();post.music.mode='preference';assert.match(publishingIssue(post),/music/);post.music.mode='embedded';assert.equal(publishingIssue(post),null);assert.match(mediaSource(asset,env),/sig=/)});
test('worker prepares media then publishes only after platform confirmation',async()=>{
 const store=storeFor(scheduled());let sends=0;const request=async(url,options)=>{const path=new URL(url).pathname;let value;if(path.endsWith('/media'))value={id:'container'};else if(path.endsWith('/media_publish')){sends++;value={id:'post-id'}}else if(path.endsWith('/post-id'))value={permalink:'https://www.instagram.com/p/test/'};else value={status_code:'FINISHED'};return {ok:true,json:async()=>value}};
 await runPublisher(store,env,request);assert.equal(store.state.posts[0].status,'Processing');assert.equal(sends,0);await runPublisher(store,env,request);assert.equal(store.state.posts[0].status,'Published');assert.equal(store.state.posts[0].receipt.id,'post-id');await runPublisher(store,env,request);assert.equal(sends,1);
});
test('ambiguous publish responses never trigger a second public send',async()=>{
 const post=scheduled();post.status='Processing';post.job={stage:'processing',containerId:'container'};const store=storeFor(post);let sends=0;const request=async(url)=>{if(new URL(url).pathname.endsWith('/media_publish')){sends++;throw Error('Connection lost')}return {ok:true,json:async()=>({status_code:'FINISHED'})}};
 await runPublisher(store,env,request);assert.equal(store.state.posts[0].status,'Needs reconciliation');await runPublisher(store,env,request);assert.equal(sends,1);
});
test('pause and future schedule prevent public sends',async()=>{
 const paused=storeFor(scheduled(),true);const request=async()=>{throw Error('Network must not be called')};assert.equal((await runPublisher(paused,env,request)).paused,true);
 const post=scheduled();post.status='Processing';post.date=new Date(Date.now()+60000).toISOString();post.job={stage:'processing',containerId:'container'};const future=storeFor(post);let sends=0;await runPublisher(future,env,async(url,options)=>{if(options.method==='POST')sends++;return {ok:true,json:async()=>({status_code:'FINISHED'})}});assert.equal(sends,0);assert.equal(future.state.posts[0].status,'Processing');
});
