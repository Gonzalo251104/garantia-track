export function routeData(route) {
  const [pathname]=route.split('?');
  if(pathname==='/orders'||pathname==='/dashboard')return {kind:'list'};
  const match=/^\/(?:orders|ticket)\/(\d+)$/.exec(route);
  return match?{kind:'order',number:Number(match[1])}:{kind:'none'};
}

export async function loadWorkspace(backend,route,previousWorkshop,isCurrent=()=>true,onMembership=()=>{}) {
  const request=routeData(route);
  const read=async id=>request.kind==='list'?backend.load(id):request.kind==='order'?backend.loadOne(id,request.number).then(order=>order?[order]:[]):null;
  // The previous ID is only a query hint. Membership is checked on every route.
  // Capture errors too: obsolete requests must not reject after access changes.
  const pending=previousWorkshop&&request.kind!=='none'
    ?read(previousWorkshop).then(orders=>({orders}),error=>({error})):null;
  const workshop=await backend.workshop();
  if(!isCurrent())return null;
  onMembership(workshop);
  if(!workshop)return {workshop:null,orders:null,request};
  const result=pending&&workshop.id===previousWorkshop?await pending:{orders:await read(workshop.id)};
  if(!isCurrent())return null;
  if(result.error)throw result.error;
  return {workshop,orders:result.orders,request};
}
