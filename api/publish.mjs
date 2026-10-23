import {createHostedStore} from '../lib/hosted-store.mjs';
import {runPublisher} from '../lib/publisher.mjs';
import {equal} from '../lib/auth.mjs';
export const maxDuration=60;
export default async function handler(req,res){
 res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
 if(!process.env.CRON_SECRET||!equal(String(req.headers.authorization||''),`Bearer ${process.env.CRON_SECRET}`)){res.statusCode=401;res.end(JSON.stringify({error:'Unauthorized'}));return}
 if(!['GET','POST'].includes(req.method)){res.statusCode=405;res.end('{}');return}
 try{const store=createHostedStore();const result=await runPublisher(store,process.env);res.end(JSON.stringify(result))}catch{res.statusCode=503;res.end(JSON.stringify({error:'Publisher unavailable. Unconfirmed posts are not marked published.'}))}
}
