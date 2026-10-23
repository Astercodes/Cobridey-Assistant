import {createHmac,timingSafeEqual} from 'node:crypto';
export function equal(a,b){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)}
export function signature(value,password){return createHmac('sha256',password).update(value).digest('base64url')}
export function authenticated(req,password){
 if(!password)return false;
 const cookie=req.headers.cookie?.match(/(?:^|; )session=([^;]+)/)?.[1]||'';const parts=cookie.split('.');
 return parts.length===3&&equal(parts[2],signature(parts.slice(0,2).join('.'),password))&&Number(parts[0])>Date.now();
}
