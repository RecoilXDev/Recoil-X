import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
// Requires independent verified delivery of the code. Do not expose raw tokens to other accounts.
export function createRecoveryTokens({now=Date.now,ttlMs=15*60*1000}={}){
 const tokens=new Map();const hash=t=>createHash('sha256').update(t).digest();
 function issue(userId){const id=String(userId),token=randomBytes(32).toString('hex');tokens.set(id,{hash:hash(token),expires:now()+ttlMs});return token;}
 function consume(userId,token){const id=String(userId),entry=tokens.get(id);tokens.delete(id);
 if(!entry||entry.expires<now()||typeof token!=='string')return false;
 const candidate=hash(token);return timingSafeEqual(entry.hash,candidate);}
 function revoke(userId){tokens.delete(String(userId));}
 return {issue,consume,revoke};
}
