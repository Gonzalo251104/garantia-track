export function createWorkspaceTransition(root) {
  let page,indicator;
  const clear=()=>{
    if(page){page.inert=false;page.removeAttribute('aria-busy');}
    indicator?.remove();
    root.querySelectorAll('[data-navigation-pending]').forEach(link=>{link.removeAttribute('data-navigation-pending');link.removeAttribute('aria-busy');});
    page=null;indicator=null;
  };
  const begin=route=>{
    clear();
    page=root.querySelector('.shell .page');
    if(!page)return false;
    // Retain the actual DOM, not an HTML snapshot with lost form state/listeners.
    page.inert=true;page.setAttribute('aria-busy','true');
    const destination=route==='/intake'?'recepción':route==='/workshop'?'taller':route==='/orders'?'órdenes':'orden';
    indicator=root.ownerDocument.createElement('div');
    indicator.className='workspace-transition';indicator.setAttribute('role','status');
    indicator.textContent=`Abriendo ${destination}…`;
    root.querySelector('.shell').append(indicator);
    root.querySelectorAll('.nav-link,.mobile-nav a').forEach(link=>{
      if(link.getAttribute('href')===`#${route}`){link.setAttribute('data-navigation-pending','');link.setAttribute('aria-busy','true');}
    });
    return true;
  };
  return {begin,clear};
}
