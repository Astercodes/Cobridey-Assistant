import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createHandler} from '../api/workspace.mjs';
import {createHostedStore} from '../lib/hosted-store.mjs';
async function invoke(handler,path,body,cookie,origin){
 const req=Readable.from(body===undefined?[]:[JSON.stringify(body)]);req.url=path;req.method=body===undefined?'GET':'POST';req.headers={host:'cobridey-assistant.vercel.app',cookie,origin};
 const headers={};const res={statusCode:200,setHeader(k,v){headers[k]=v},end(value){this.body=JSON.parse(value)}};
 await handler(req,res);return {status:res.statusCode,body:res.body,headers};
}
test('unconfigured Vercel cold start serves read-only preview without file writes',async()=>{
 const handler=createHandler({});const result=await invoke(handler,'/api/state');assert.equal(result.status,200);assert.equal(result.body.readOnly,true);assert.equal(result.body.storage,'preview');assert.equal(result.body.posts.length,3);
 const write=await invoke(handler,'/api/action',{action:'pause'});assert.equal(write.status,503);assert.match(write.body.error,/Nothing was saved/);assert.equal((await invoke(createHandler({}),'/api/state')).body.paused,false);
});
test('hosted sessions survive new handler instances and enforce HTTPS origin',async()=>{
 const env={WORKSPACE_PASSWORD:'a-long-test-password'};
 assert.equal((await invoke(createHandler(env),'/api/state')).status,401);
 assert.equal((await invoke(createHandler(env),'/api/login',{password:'wrong'})).status,401);
 const login=await invoke(createHandler(env),'/api/login',{password:env.WORKSPACE_PASSWORD},undefined,'https://cobridey-assistant.vercel.app');assert.equal(login.status,200);assert.match(login.headers['Set-Cookie'],/Secure/);
 const cookie=login.headers['Set-Cookie'].split(';')[0];assert.equal((await invoke(createHandler(env),'/api/state',undefined,cookie)).status,200);
 assert.equal((await invoke(createHandler(env),'/api/action',{action:'pause'},cookie,'https://evil.example')).status,403);
 assert.equal((await invoke(createHandler(env),'/api/state',undefined,cookie+'tampered')).status,401);
});
test('configured hosted storage requires workspace protection',async()=>{
 const result=await invoke(createHandler({UPSTASH_REDIS_REST_URL:'https://redis.example',UPSTASH_REDIS_REST_TOKEN:'secret'}),'/api/state');assert.equal(result.status,503);assert.match(result.body.error,/WORKSPACE_PASSWORD/);
});
test('remote store persists changes and rejects concurrent stale writes',async()=>{
 let stored=null;const commands=[];const request=async(url,options)=>{const args=JSON.parse(options.body);commands.push(args);let result;if(args[0]==='GET')result=stored;if(args[0]==='SET'){if(stored===null)stored=args[2];result='OK'}if(args[0]==='EVAL'){result=stored===args[4]?1:0;if(result)stored=args[5]}return {ok:true,json:async()=>({result})}};
 const env={UPSTASH_REDIS_REST_URL:'https://redis.example',UPSTASH_REDIS_REST_TOKEN:'secret'};
 const first=createHostedStore(env,request);const a=await first.read();const b=await first.read();a.value.paused=true;await first.save(a.value,a.raw);assert.equal((await createHostedStore(env,request).read()).value.paused,true);await assert.rejects(first.save(b.value,b.raw),error=>error.status===409);assert.equal(commands.filter(c=>c[0]==='EVAL').length,2);
});
