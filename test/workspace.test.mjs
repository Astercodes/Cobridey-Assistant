import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,cpSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
test('persistent review workflow and security boundaries',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'cobridey-test-'));cpSync(new URL('../server.mjs',import.meta.url),join(dir,'server.mjs'));
 cpSync(new URL('../lib/',import.meta.url),join(dir,'lib'),{recursive:true});
 let child;let base;const start=()=>new Promise((resolve,reject)=>{child=spawn(process.execPath,[join(dir,'server.mjs')],{env:{...process.env,PORT:'0',WORKSPACE_PASSWORD:'test-password'}});child.once('error',reject);child.stdout.on('data',chunk=>{const url=chunk.toString().match(/http:\/\/[^\s]+/);if(url){base=url[0];resolve()}})});
 const stop=()=>new Promise(resolve=>{child.once('exit',resolve);child.kill()});
 try{await start();assert.equal((await fetch(base+'/api/state')).status,401);const login=await fetch(base+'/api/login',{method:'POST',body:JSON.stringify({password:'test-password'})});const cookie=login.headers.get('set-cookie').split(';')[0];const request=(path,body)=>fetch(base+'/api/'+path,{method:body?'POST':'GET',headers:{cookie,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
 assert.equal((await request('action',{action:'update',id:'1',status:'Scheduled'})).status,400);
 assert.equal((await request('action',{action:'update',id:'1',status:'Approved'})).status,200);
 assert.equal((await request('action',{action:'update',id:'1',status:'Scheduled',date:'2026-11-01T10:00'})).status,200);
 assert.equal((await request('action',{action:'post',post:{title:'Bad',channel:'Unsupported',copy:'x'}})).status,400);
 await request('action',{action:'pause'});await request('action',{action:'brand',voice:'Thoughtful',facts:'Approved only',website:''});
 const s=await(await request('state')).json();assert.equal(s.paused,true);assert.equal(s.knowledge.length,1);assert.equal(s.posts[0].status,'Scheduled');assert.equal(s.audit.length,4);
 assert.equal((await fetch(base+'/api/action',{method:'POST',headers:{cookie,Origin:'https://evil.example'},body:'{}'})).status,403);
 await stop();await start();const auth=await fetch(base+'/api/login',{method:'POST',body:JSON.stringify({password:'test-password'})});const restored=await(await fetch(base+'/api/state',{headers:{cookie:auth.headers.get('set-cookie').split(';')[0]}})).json();assert.equal(restored.brand.voice,'Thoughtful');assert.equal(restored.paused,true);
 }finally{if(child&&child.exitCode===null)await stop();rmSync(dir,{recursive:true,force:true})}
});

