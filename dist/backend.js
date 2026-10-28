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
  return {
    client,
    async workshop(){
      const {data,error}=await client.from('workshops').select('id,name').order('created_at').limit(1).maybeSingle();
      if(error)throw error;return data;
    },
    createWorkshop:name=>rpc('create_workshop',{p_name:name}),
    async load(workshop){
      const {data,error}=await client.from('repair_orders').select('*,order_events(status,at),order_photos(id,path,state)').eq('workshop_id',workshop).order('number',{ascending:false}).limit(500);
      if(error)throw error;return data.map(toOrder);
    },
    async create(workshop,request,order){return toOrder(await rpc('create_repair_order',{p_workshop:workshop,p_request:request,p_order:order}));},
    async update(order,changes){return toOrder(await rpc('update_repair_order',{p_id:order.id,p_version:order.version,p_status:changes.status,p_quote:changes.quote,p_notes:changes.notes,p_message:changes.message}));},
    async upload(orderId,items){
      for(const item of items){
        const photo=singleRow(await rpc('reserve_order_photo',{p_order:orderId,p_photo:item.id}));
        if(photo.state==='ready')continue;
        // Complete first on retries: a previous upload may have succeeded despite a lost response.
        if(await rpc('complete_order_photo',{p_photo:item.id}))continue;
        const blob=await (await fetch(item.src)).blob();
        const {error}=await client.storage.from('repair-photos').upload(photo.path,blob,{contentType:'image/jpeg',upsert:false});
        if(error && !await rpc('complete_order_photo',{p_photo:item.id})) throw error;
        if(!await rpc('complete_order_photo',{p_photo:item.id}))throw new Error('La foto no se confirmó. Reintenta sin salir del formulario.');
      }
    },
    async photos(order){
      const urls=[];
      for(const photo of order.photoRecords.filter(photo=>photo.state==='ready')){
        const {data,error}=await client.storage.from('repair-photos').createSignedUrl(photo.path,300);
        if(error)throw error; urls.push(data.signedUrl);
      }
      return urls;
    },
    async trackingLink(order){const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),byte=>byte.toString(16).padStart(2,'0')).join('');await rpc('rotate_tracking_link',{p_order:order.id,p_token:token});return `${location.origin}${location.pathname}#/tracking/${token}`;},
    revoke:order=>rpc('revoke_tracking_link',{p_order:order.id}),
    tracking:token=>rpc('get_order_tracking',{p_token:token})
  };
}
