const crypto = require('node:crypto');

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

function getSecret() {
  const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET || process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('AUTH_SECRET (or JWT_SECRET/SESSION_SECRET) must be configured with at least 32 characters');
  return secret;
}
function hashPassword(password) { return new Promise((resolve,reject)=>{const salt=crypto.randomBytes(16).toString('hex');crypto.scrypt(password,salt,64,(error,key)=>error?reject(error):resolve(`scrypt$${salt}$${key.toString('hex')}`));}); }
function verifyPassword(password,stored) { return new Promise((resolve,reject)=>{const [scheme,salt,hash]=String(stored||'').split('$');if(scheme!=='scrypt'||!salt||!hash)return resolve(false);crypto.scrypt(password,salt,64,(error,key)=>{if(error)return reject(error);const actual=Buffer.from(hash,'hex'),expected=Buffer.from(key.toString('hex'),'hex');resolve(actual.length===expected.length&&crypto.timingSafeEqual(actual,expected));});}); }
function base64url(value){return Buffer.from(value).toString('base64url');}
function signToken(payload){const now=Math.floor(Date.now()/1000);const header=base64url(JSON.stringify({alg:'HS256',typ:'JWT'}));const body=base64url(JSON.stringify({...payload,iat:now,exp:now+TOKEN_TTL_SECONDS}));const data=`${header}.${body}`;return `${data}.${crypto.createHmac('sha256',getSecret()).update(data).digest('base64url')}`;}
function verifyToken(token){try{const [header,body,signature]=String(token||'').split('.');if(!header||!body||!signature)return null;const data=`${header}.${body}`,expected=crypto.createHmac('sha256',getSecret()).update(data).digest('base64url'),a=Buffer.from(signature),b=Buffer.from(expected);if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return null;const payload=JSON.parse(Buffer.from(body,'base64url').toString('utf8'));return payload.exp&&payload.exp>=Math.floor(Date.now()/1000)?payload:null;}catch{return null;}}
function requireAuth(req,res,next){try{const token=(req.headers.authorization||'').startsWith('Bearer ')?req.headers.authorization.slice(7):'';const payload=verifyToken(token);if(!payload)return res.status(401).json({error:'Authentication required'});req.user=payload;next();}catch{return res.status(401).json({error:'Authentication required'});}}
function requireAdmin(req,res,next){if(req.user?.role!=='admin')return res.status(403).json({error:'Administrator access required'});next();}
module.exports={hashPassword,verifyPassword,signToken,verifyToken,requireAuth,requireAdmin};
