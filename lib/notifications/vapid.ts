import { createECDH, createPrivateKey, sign } from 'node:crypto';

export interface VapidConfig { publicKey:string; privateKey:string; subject:string }
export function vapidAuthorization(endpoint:string, config:VapidConfig, now=Date.now()) {
  const url=new URL(endpoint);
  const hosts=['fcm.googleapis.com','web.push.apple.com','updates.push.services.mozilla.com'];
  if(url.protocol!=='https:' || url.username || url.password || url.port || !hosts.includes(url.hostname)) throw new Error('Unapproved push service');
  if(!/^mailto:[^\s@]+@[^\s@]+$/.test(config.subject)) throw new Error('A VAPID contact email is required');
  if(!/^[A-Za-z0-9_-]{43}$/.test(config.privateKey)||!/^[A-Za-z0-9_-]{87}$/.test(config.publicKey))throw new Error('Invalid VAPID key encoding');
  const secret=Buffer.from(config.privateKey,'base64url'),pub=Buffer.from(config.publicKey,'base64url');
  const ecdh=createECDH('prime256v1');ecdh.setPrivateKey(secret);
  if(!ecdh.getPublicKey().equals(pub))throw new Error('VAPID keys do not match');
  const key=createPrivateKey({format:'jwk',key:{kty:'EC',crv:'P-256',d:config.privateKey,x:pub.subarray(1,33).toString('base64url'),y:pub.subarray(33).toString('base64url')}});
  const encode=(value:object)=>Buffer.from(JSON.stringify(value)).toString('base64url');
  const input=`${encode({typ:'JWT',alg:'ES256'})}.${encode({aud:url.origin,exp:Math.floor(now/1000)+3600,sub:config.subject})}`;
  const signature=sign('sha256',Buffer.from(input),{key,dsaEncoding:'ieee-p1363'}).toString('base64url');
  return `vapid t=${input}.${signature}, k=${config.publicKey}`;
}
