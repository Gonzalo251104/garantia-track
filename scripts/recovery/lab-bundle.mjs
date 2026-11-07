import {randomBytes,scryptSync,createCipheriv,createDecipheriv,createHash} from 'node:crypto';
import {labProject} from './archive.mjs';
const header=Buffer.from('GTLAB1');
const options={N:32768,r:8,p:1,maxmem:64*1024*1024};
const limit=64*1024*1024;
function validate(bundle){
  const complete=bundle?.format==='GT-LAB-COMPLETE-1';
  if((!complete&&bundle?.format!=='GT-LAB-DB-1')||bundle.source!==labProject||bundle.photoBytesIncluded!==complete
    ||!['roles','schema','data'].every(name=>typeof bundle.parts?.[name]==='string'&&bundle.parts[name].length>0)
    ||!Array.isArray(bundle.parts.vault)||!bundle.parts.vault.every(row=>typeof row.token==='string'&&/^[a-f0-9]{64}$/.test(row.token)
      &&createHash('sha256').update(row.token).digest('hex')===row.token_hash))throw new Error('Invalid laboratory bundle');
  if(complete){
    const safePath=value=>typeof value==='string'&&value.length>0&&!/[\\\x00-\x1f\x7f]/.test(value)
      &&value.split('/').every(part=>part!==''&&part!=='.'&&part!=='..');
    const seen=new Set();
    if(!Array.isArray(bundle.photos)||bundle.photos.length!==bundle.photoObjectCount)throw new Error('Incomplete laboratory photos');
    for(const photo of bundle.photos){
      if(!safePath(photo.bucket)||photo.bucket.includes('/')||!safePath(photo.name)
        ||!(photo.version===null||safePath(photo.version)&&!photo.version.includes('/'))
        ||!Number.isSafeInteger(photo.byteLength)||photo.byteLength<1
        ||typeof photo.base64!=='string'||typeof photo.sha256!=='string')throw new Error('Invalid laboratory photo');
      const identity=JSON.stringify([photo.bucket,photo.name]);
      const bytes=Buffer.from(photo.base64,'base64');
      try{
        if(seen.has(identity)||bytes.length!==photo.byteLength||bytes.toString('base64')!==photo.base64
          ||createHash('sha256').update(bytes).digest('hex')!==photo.sha256)throw new Error('Laboratory photo integrity mismatch');
      }finally{bytes.fill(0);}
      seen.add(identity);
    }
  }
  return bundle;
}
export function sealLabBundle(bundle,password){
  validate(bundle);
  if(typeof password!=='string'||password.length<16)throw new Error('Invalid backup passphrase');
  const plain=Buffer.from(JSON.stringify(bundle));
  if(plain.length>limit)throw new Error('Laboratory bundle exceeds limit');
  const salt=randomBytes(16),iv=randomBytes(12),key=scryptSync(password,salt,32,options);
  try{const cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(header);
    const encrypted=Buffer.concat([cipher.update(plain),cipher.final()]);
    return Buffer.concat([header,salt,iv,cipher.getAuthTag(),encrypted]);
  }finally{plain.fill(0);key.fill(0);}
}
export function openLabBundle(bytes,password){
  if(!Buffer.isBuffer(bytes)||bytes.length<51||bytes.length>limit+50||!bytes.subarray(0,6).equals(header))throw new Error('Invalid laboratory archive');
  const key=scryptSync(password,bytes.subarray(6,22),32,options);let plain;
  try{const cipher=createDecipheriv('aes-256-gcm',key,bytes.subarray(22,34));cipher.setAAD(header);cipher.setAuthTag(bytes.subarray(34,50));
    plain=Buffer.concat([cipher.update(bytes.subarray(50)),cipher.final()]);return validate(JSON.parse(plain.toString('utf8')));
  }finally{key.fill(0);plain?.fill(0);}
}
