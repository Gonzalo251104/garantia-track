import {trackingReceiptUrl} from './receipt.js';

export class PendingIntakePhotosError extends Error {
  constructor(orderNumber) {
    super('La orden GT-'+orderNumber+' se guardó, pero faltan fotos. Pulsa Crear orden otra vez para reintentar o abre la orden guardada para completar sus fotos.');
    this.name='PendingIntakePhotosError';
    this.orderNumber=orderNumber;
  }
}

export function singleRow(data) {
  const row=Array.isArray(data)?data.length===1?data[0]:null:data;
  if(!row || typeof row!=='object')throw new Error('Respuesta de datos no válida. Recarga y vuelve a intentar.');
  return row;
}
export function toOrder(data) {
  const row=singleRow(data);
  return {...row,number:Number(row.number),created:row.created_at,photos:[],events:(row.order_events||[]).sort((a,b)=>a.at.localeCompare(b.at)).map(({status,at})=>({status,at})),photoRecords:row.order_photos||[]};
}
export async function connect(config,clientFactory) {
  const createClient=clientFactory||(await import('./vendor/supabase.js')).createClient;
  const client=createClient(config.supabaseUrl,config.supabaseKey,{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const rpc=async(name,args)=>{const {data,error}=await client.rpc(name,args);if(error)throw error;return data;};
  const uploadReserved=async(photo,src)=>{
    if(photo.state==='ready')return;
    if(await rpc('complete_order_photo',{p_photo:photo.id}))return;
    const blob=await (await fetch(src)).blob();
    const {error}=await client.storage.from('repair-photos').upload(photo.path,blob,{contentType:'image/jpeg',upsert:false});
    if(error && !await rpc('complete_order_photo',{p_photo:photo.id}))throw error;
    if(!await rpc('complete_order_photo',{p_photo:photo.id}))throw new Error('La foto no se confirmó. Reintenta desde esta orden.');
  };
  const applicationUrl=()=>config.publicAppUrl?config.publicAppUrl+'/':location.origin+location.pathname;
  const receiptResult=data=>{
    const record=singleRow(data);
    if(!['missing','active','legacy','expired','revoked','unavailable'].includes(record.state))throw new Error('No pudimos recuperar el seguimiento de esta orden.');
    if(record.state==='active'&&!/^[a-f0-9]{64}$/.test(record.token))throw new Error('El seguimiento recuperado no es válido.');
    return {state:record.state,expiresAt:record.expires_at||null,...(record.state==='active'?{url:`${applicationUrl()}#/tracking/${record.token}`}:{})};
  };
  const api = {
    client,
    async workshop(){
      const {data,error}=await client.from('workshops').select('id,name').order('created_at').limit(1).maybeSingle();
      if(error)throw error;return data;
    },
    createWorkshop:name=>rpc('create_workshop',{p_name:name}),
    async load(workshop){
      const {data,error}=await client.from('repair_orders').select('*,order_events(status,at),order_photos(id,path,state,slot)').eq('workshop_id',workshop).order('number',{ascending:false}).limit(500);
      if(error)throw error;return data.map(toOrder);
    },
    async loadOne(workshop,number){
      const {data,error}=await client.from('repair_orders').select('*,order_events(status,at),order_photos(id,path,state,slot)').eq('workshop_id',workshop).eq('number',number).maybeSingle();
      if(error)throw error;return data?toOrder(data):null;
    },
    async create(workshop,request,order){
      const {customer,phone,device,model,serial,issue,condition,accessories}=order;
      return toOrder(await rpc('create_repair_order',{p_workshop:workshop,p_request:request,p_order:{customer,phone,device,model,serial,issue,condition,accessories}}));
    },
    async receive(workshop,request,order,photos){
      // Capture each intake before awaiting the network; another view may open meanwhile.
      const draft=structuredClone(order),evidence=photos.map(photo=>({...photo}));
      const saved=await api.create(workshop,request,draft);
      try{await api.upload(saved.id,evidence);}catch{throw new PendingIntakePhotosError(saved.number);}
      return saved;
    },
    async update(order,changes){return toOrder(await rpc('update_repair_order',{p_id:order.id,p_version:order.version,p_status:changes.status,p_quote:changes.quote,p_notes:changes.notes,p_message:changes.message}));},
    async upload(orderId,items){
      for(const item of items){
        const photo=singleRow(await rpc('reserve_order_photo',{p_order:orderId,p_photo:item.id}));
        // Complete first on retries: a previous upload may have succeeded despite a lost response.
        await uploadReserved(photo,item.src);
      }
    },
    async photoRecords(orderId){
      const {data,error}=await client.from('order_photos').select('id,path,state,slot').eq('order_id',orderId).order('slot');
      if(error)throw error;return data;
    },
    async retryPhoto(orderId,photoId,src){
      const {data,error}=await client.from('order_photos').select('id,path,state,slot').eq('order_id',orderId).eq('id',photoId).maybeSingle();
      if(error)throw error;
      if(!data || !['pending','ready'].includes(data.state))throw new Error('La foto no está disponible en esta orden. Revisa tu acceso al taller.');
      // Never reserve a new slot when recovering an existing pending photo.
      await uploadReserved(singleRow(data),src);
    },
    async photos(order){
      const urls=[];
      for(const photo of order.photoRecords.filter(photo=>photo.state==='ready')){
        const {data,error}=await client.storage.from('repair-photos').createSignedUrl(photo.path,300);
        if(error)throw error; urls.push(data.signedUrl);
      }
      return urls;
    },
    receiptLink:async(order,create=false)=>receiptResult(await rpc(create?'ensure_receipt_tracking':'get_receipt_tracking',{p_order:order.id})),
    async importReceiptLink(order,url){const checked=trackingReceiptUrl(url,applicationUrl());return receiptResult(await rpc('import_receipt_tracking',{p_order:order.id,p_token:new URL(checked.url).hash.split('/').at(-1)}));},
    async trackingLink(order){const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),byte=>byte.toString(16).padStart(2,'0')).join('');await rpc('rotate_tracking_link',{p_order:order.id,p_token:token});return `${applicationUrl()}#/tracking/${token}`;},
    revoke:order=>rpc('revoke_tracking_link',{p_order:order.id}),
    tracking:token=>rpc('get_order_tracking',{p_token:token})
  };
  return api;
}
