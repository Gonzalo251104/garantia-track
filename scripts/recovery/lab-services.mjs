import {randomBytes,createHash,createHmac,pbkdf2Sync} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {requireLab} from './lab-support.mjs';
const check=requireLab;
function verifier(password){
  const salt=randomBytes(16),salted=pbkdf2Sync(password,salt,4096,32,'sha256');
  const client=createHmac('sha256',salted).update('Client Key').digest(),stored=createHash('sha256').update(client).digest('base64');
  const server=createHmac('sha256',salted).update('Server Key').digest('base64');salted.fill(0);client.fill(0);
  return `SCRAM-SHA-256$4096:${salt.toString('base64')}$${stored}:${server}`;
}
function jwt(secret,role){const part=value=>Buffer.from(JSON.stringify(value)).toString('base64url');const value=part({alg:'HS256',typ:'JWT'})+'.'+part({role,iss:'recovery-local',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600});return value+'.'+createHmac('sha256',secret).update(value).digest('base64url');}

export async function verifyServices(bundle,runtime,onStage=async()=>{}){
  const docker=runtime.docker.bind(runtime),psql=runtime.psql.bind(runtime);
  check(bundle.photos.length>0&&bundle.parts.vault.length>0);
  const inventory=JSON.parse(psql("select coalesce(json_agg(json_build_object('bucket',bucket_id,'name',name,'version',version,'size',metadata->>'size','mimetype',metadata->>'mimetype') order by bucket_id,name),'[]') from storage.objects;").trim());
  check(inventory.length===bundle.photos.length&&inventory.every(row=>bundle.photos.some(photo=>photo.bucket===row.bucket&&photo.name===row.name&&photo.version===row.version&&photo.byteLength===Number(row.size)&&photo.metadata.mimetype===row.mimetype)));
  const tracking=bundle.parts.vault[0];
  check(/^[a-f0-9-]{36}$/.test(tracking.order_id));
  let storage;
  function launch(kind,environment){const id=runtime.create(kind,environment);if(kind==='storage')storage=id;}
const requestCode=`let input='';process.stdin.on('data',chunk=>input+=chunk);process.stdin.on('end',async()=>{try{const r=JSON.parse(input);const url=new URL(r.url);if(url.hostname!=='127.0.0.1'||url.protocol!=='http:'||!['3000','5000','9999'].includes(url.port))throw Error();const response=await fetch(r.url,{method:r.method||'GET',headers:r.headers,body:r.body,redirect:'manual',signal:AbortSignal.timeout(10000)});const bytes=Buffer.from(await response.arrayBuffer());console.log(JSON.stringify({status:response.status,headers:Object.fromEntries(response.headers),base64:bytes.toString('base64')}));}catch{process.exitCode=1;}});`;
function request(port,path,{method='GET',token,body}={}){
  check([3000,5000,9999].includes(port)&&path.startsWith('/'));
  const result=JSON.parse(docker(['exec','-i',storage,'node','-e',requestCode],JSON.stringify({url:`http://127.0.0.1:${port}${path}`,method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined})));
  const bytes=Buffer.from(result.base64,'base64');return {...result,bytes,json(){return JSON.parse(bytes.toString());}};
}
async function health(port,path){for(let index=0;index<40;index++){try{if(request(port,path).status===200)return;}catch{}await delay(500);}throw new Error('Local service did not become healthy');}
  await onStage('local-service-credentials');
  const password=randomBytes(32).toString('hex'),secret=randomBytes(48).toString('hex');
  check(psql("select current_setting('log_statement')='none';").trim()==='t');
  psql(`begin;set log_parameter_max_length=0;set log_parameter_max_length_on_error=0;set log_error_verbosity=terse;${['authenticator','supabase_auth_admin','supabase_storage_admin'].map(role=>`alter role ${role} login password '${verifier(password)}';`).join('\n')}commit;`);
  const anon=jwt(secret,'anon'),service=jwt(secret,'service_role');
  const uri=role=>`postgresql://${role}:${password}@127.0.0.1:5432/postgres`;
  await onStage('start-private-services');
  launch('rest',{
    PGRST_DB_URI:uri('authenticator'),PGRST_DB_SCHEMAS:'public',PGRST_DB_ANON_ROLE:'anon',PGRST_JWT_SECRET:secret,PGRST_SERVER_HOST:'127.0.0.1',PGRST_LOG_LEVEL:'crit'});
  launch('auth',{
    GOTRUE_API_HOST:'127.0.0.1',GOTRUE_API_PORT:'9999',API_EXTERNAL_URL:'http://127.0.0.1:9999',GOTRUE_DB_DRIVER:'postgres',GOTRUE_DB_DATABASE_URL:uri('supabase_auth_admin'),GOTRUE_SITE_URL:'http://127.0.0.1:3000',GOTRUE_DISABLE_SIGNUP:'true',GOTRUE_JWT_ADMIN_ROLES:'service_role',GOTRUE_JWT_AUD:'authenticated',GOTRUE_JWT_DEFAULT_GROUP_NAME:'authenticated',GOTRUE_JWT_EXP:'3600',GOTRUE_JWT_SECRET:secret,GOTRUE_EXTERNAL_EMAIL_ENABLED:'true',GOTRUE_MAILER_AUTOCONFIRM:'false',GOTRUE_LOG_LEVEL:'error'});
  launch('storage',{
    DATABASE_URL:uri('supabase_storage_admin'),DATABASE_POOL_URL:uri('supabase_storage_admin'),AUTH_JWT_SECRET:secret,ANON_KEY:anon,SERVICE_KEY:service,
    TENANT_ID:'recovery-local',STORAGE_BACKEND:'file',STORAGE_FILE_BACKEND_PATH:'/data',STORAGE_S3_BUCKET:'recovery-files',
    TUS_USE_FILE_VERSION_SEPARATOR:'false',SERVER_HOST:'127.0.0.1',SERVER_PORT:'5000',IMAGE_TRANSFORMATION_ENABLED:'false',
    DB_INSTALL_ROLES:'false',DB_ALLOW_MIGRATION_REFRESH:'false',PG_QUEUE_ENABLE:'false',LOG_LEVEL:'error',OTEL_METRICS_ENABLED:'false',POSTGREST_URL:'http://127.0.0.1:3000'});
  await onStage('restore-photo-bytes');
  const restoreCode=`let input='';process.stdin.on('data',chunk=>input+=chunk);process.stdin.on('end',async()=>{try{const photos=JSON.parse(input);const config=require('./dist/config');config.mergeConfig({storageFilePath:'/data',storageFileEtagAlgorithm:'md5',tusUseFileVersionSeparator:false});const {FileBackend}=require('./dist/storage/backend/file');const {Readable}=require('stream');const {createHash}=require('crypto');const backend=new FileBackend();for(const p of photos){const bytes=Buffer.from(p.base64,'base64');await backend.uploadObject('recovery-files','recovery-local/'+p.bucket+'/'+p.name,p.version,Readable.from(bytes),p.metadata.mimetype,p.metadata.cacheControl);const restored=await backend.getObject('recovery-files','recovery-local/'+p.bucket+'/'+p.name,p.version);const hash=createHash('sha256');for await(const chunk of restored.body)hash.update(chunk);if(hash.digest('hex')!==p.sha256)throw Error();bytes.fill(0);}console.log(JSON.stringify({photoFilesRestored:photos.length,allBackendHashesMatch:true}));}catch{process.exitCode=1;}});`;
  const restoredPhotos=JSON.parse(docker(['exec','-i',storage,'node','-e',restoreCode],JSON.stringify(bundle.photos)));check(restoredPhotos.photoFilesRestored===bundle.photos.length);
  await onStage('service-health');await health(3000,'/');await health(9999,'/health');await health(5000,'/status');
  await onStage('storage-admin-byte-verification');
  const objectPath=p=>'/object/'+encodeURIComponent(p.bucket)+'/'+p.name.split('/').map(encodeURIComponent).join('/');
  for(const photo of bundle.photos){const result=request(5000,objectPath(photo),{token:service});check(result.status===200&&result.bytes.length===photo.byteLength&&createHash('sha256').update(result.bytes).digest('hex')===photo.sha256);}
  await onStage('restored-auth-account');
  const user=JSON.parse(psql(`select json_build_object('id',u.id,'email',u.email,'confirmed',u.email_confirmed_at is not null) from auth.users u join public.workshop_members m on m.user_id=u.id join public.repair_orders o on o.workshop_id=m.workshop_id where o.id='${tracking.order_id}' and u.email_confirmed_at is not null limit 1;`).trim());check(user.confirmed&&/^[a-f0-9-]{36}$/.test(user.id));
  const found=request(9999,'/admin/users/'+user.id,{token:service});check(found.status===200&&found.json().id===user.id);
  // Generates a local-only verification challenge; this endpoint does not dispatch email.
  const generated=request(9999,'/admin/generate_link',{method:'POST',token:service,body:{type:'magiclink',email:user.email}});check(generated.status===200);
  const hash=generated.json().hashed_token;check(typeof hash==='string'&&hash.length>0);
  const verified=request(9999,'/verify',{method:'POST',body:{type:'magiclink',token_hash:hash}});check(verified.status===200);
  const session=verified.json();check(typeof session.access_token==='string'&&session.user.id===user.id);
  const current=request(9999,'/user',{token:session.access_token});check(current.status===200&&current.json().id===user.id);
  const expectedOrders=Number(psql(`select count(*) from public.repair_orders o where exists(select 1 from public.workshop_members m where m.workshop_id=o.workshop_id and m.user_id='${user.id}');`).trim());
  const orders=request(3000,'/repair_orders?select=id',{token:session.access_token});check(orders.status===200&&orders.json().length===expectedOrders&&orders.json().some(order=>order.id===tracking.order_id));
  await onStage('receipt-and-public-tracking');
  const receipt=request(3000,'/rpc/get_receipt_tracking',{method:'POST',token:session.access_token,body:{p_order:tracking.order_id}});check(receipt.status===200&&receipt.json().state==='active'&&receipt.json().token===tracking.token);
  const publicResult=request(3000,'/rpc/get_order_tracking',{method:'POST',token:anon,body:{p_token:tracking.token}});check(publicResult.status===200&&publicResult.json());
  const payload=publicResult.json();check(Object.keys(payload).sort().join(',')===['number','device','model','status','message','created','workshop','events'].sort().join(',')
    &&Array.isArray(payload.events)&&payload.events.every(event=>Object.keys(event).sort().join(',')==='at,status'));
  await onStage('owner-photo-and-anonymous-denial');
  const association=JSON.parse(psql(`select json_build_object('path',path,'status',state) from public.order_photos where order_id='${tracking.order_id}' and state='ready' limit 1;`).trim());check(association.status==='ready');
  const ownerPhoto=bundle.photos.find(photo=>photo.name===association.path);check(ownerPhoto);
  const owned=request(5000,objectPath(ownerPhoto),{token:session.access_token});check(owned.status===200&&createHash('sha256').update(owned.bytes).digest('hex')===ownerPhoto.sha256);
  const signed=request(5000,objectPath(ownerPhoto).replace('/object/','/object/sign/'),{method:'POST',token:session.access_token,body:{expiresIn:60}});check(signed.status===200&&typeof (signed.json().signedURL||signed.json().signedUrl)==='string');
  const denied=request(5000,objectPath(ownerPhoto),{token:anon});check([400,401,403,404].includes(denied.status));
  const deniedSign=request(5000,objectPath(ownerPhoto).replace('/object/','/object/sign/'),{method:'POST',token:anon,body:{expiresIn:60}});check([400,401,403,404].includes(deniedSign.status));
  return {photoFiles:bundle.photos.length,allHttpPhotoHashesMatch:true,authUserRead:true,authIssuedLocalSession:true,passwordLoginTested:false,restoredUserOrders:orders.json().length,receiptRpc:true,publicTrackingRpc:true,ownerPhotoDownload:true,ownerPhotoSigning:true,anonymousPhotoDownloadDenied:true,anonymousPhotoSigningDenied:true,otherWorkshopSourceGateClosed:false};
}
