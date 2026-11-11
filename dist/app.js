import {statuses,statusLabel,deviceTypes,deviceLabel,money,escapeHtml as e,parseAmount,nextOrderNumber,publicOrder,validateIntake,seedOrders} from './domain.js';

import {connect,PendingIntakePhotosError} from './backend.js';
import {mountPhotoRecovery} from './photo-recovery-view.js';
import {orderPhotoThumbnail,createOrderPhotoViewer} from './photo-viewer.js';
import {workspaceIdentity,unavailableOrder} from './workspace-view.js';
import {loadWorkspace} from './workspace-navigation.js';
import {createWorkspaceTransition} from './workspace-transition.js';
import {workshopSettingsMarkup,mountWorkshopSettings} from './workshop-settings.js';
import {registerAccount,registrationConfirmation} from './registration.js';
import {statusChanges,statusChangeMarkup,mountStatusChange} from './status-view.js';
import {createReceiptLinks} from './receipt.js';
import {showReceipt,confirmTrackingRenewal} from './receipt-view.js';
const receiptLinks = createReceiptLinks();
const config = window.GARANTIATRACK_CONFIG || {};
const configured = Boolean(config.supabaseUrl && config.supabaseKey);
const demoEnabled = config.demoEnabled === true && ['localhost','127.0.0.1','[::1]'].includes(location.hostname);
let demoMode = demoEnabled && sessionStorage.getItem('garantiatrack.mode') === 'demo';
let backend, workshop, session, recovery = new URLSearchParams(location.search).get('auth')==='recovery', renderVersion = 0;
let connectionPromise;
const storageKey = 'garantiatrack.demo.v1';
let orders = [];
let completeOrderList = false;
function loadDemo() {
try { orders = JSON.parse(localStorage.getItem(storageKey)); if (!Array.isArray(orders) || !orders.length || !orders.every(order => Number.isInteger(order.number) && Array.isArray(order.events) && Array.isArray(order.photos) && statuses.some(([key])=>key===order.status))) orders = seedOrders(); } catch { orders = seedOrders(); }
}
if(demoMode) loadDemo();
let activeFilter = 'all', search = '', toastTimer;
const root = document.querySelector('#app');
const workspaceTransition=createWorkspaceTransition(root);
let photoViewerVersion=-1;
const photoViewer=createOrderPhotoViewer({root,isCurrent:()=>photoViewerVersion===renderVersion});
const icon = name => {
  const paths = {grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',plus:'<path d="M12 5v14M5 12h14"/>',other:'<path d="m12 3 9 5v8l-9 5-9-5V8Z"/><path d="m3 8 9 5 9-5M12 13v8"/>',controller:'<path d="M7 7h10c3 0 5 10 3 11-2 1-4-3-5-3H9c-1 0-3 4-5 3C2 17 4 7 7 7Z"/><path d="M8 9v5m-2-2.5h4M16 10h.1M18 13h.1"/>',console:'<path d="m8 3 8 2v15l-8 1Z"/><path d="M8 3 5 5v14l3 2m8-16 3 2v11l-3 2M11 7v8m2 3h.1"/>',link:'<path d="m10 13 4-4m-6 6-2 2a3 3 0 0 1-4-4l5-5a3 3 0 0 1 4 0m2 1 2-2a3 3 0 0 1 4 4l-5 5a3 3 0 0 1-4 0"/>',clock:'<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',check:'<path d="m5 12 4 4L19 6"/>',arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>'};
  return `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.grid}</svg>`;
};
const brand = `<div class="brand"><span class="brand-mark">G</span><div>Garantia<span>Track</span></div></div>`;
const date = value => new Intl.DateTimeFormat('es-PE',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'America/Lima'}).format(new Date(value));
const badge = status => `<span class="badge ${status}">${statusLabel(status)}</span>`;
function notify(message) { const toast=document.querySelector('#toast'); toast.textContent=message; toast.classList.add('visible'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>toast.classList.remove('visible'),3500); }
function persist(next) { try { localStorage.setItem(storageKey,JSON.stringify(next)); orders=next; return true; } catch { notify('No se pudo guardar. El almacenamiento está lleno o bloqueado.'); return false; } }
async function updateOrder(order,changes,isCurrent) {
  if(!isCurrent())return false;
  if(demoMode) return persist(orders.map(item=>item.number===order.number ? {...item,...changes} : item));
  const workshopId=workshop.id;
  await backend.update(order,changes);
  if(!isCurrent())return false;
  const loaded=await backend.load(workshopId);
  if(!isCurrent())return false;
  orders=loaded;
  completeOrderList=true;
  return true;
}
function shell(content,section='orders') {
  workspaceTransition.clear();
  photoViewer.close();
  const workshopName=demoMode?'Pixel Lab':workshop.name;
  const nav = `<a class="nav-link ${section==='orders'?'active':''}" href="#/orders">${icon('grid')} Reparaciones ${demoMode||completeOrderList?`<span class="nav-count">${orders.filter(o=>o.status!=='delivered').length}</span>`:''}</a><a class="nav-link ${section==='intake'?'active':''}" href="#/intake">${icon('plus')} Recibir equipo</a><a class="nav-link ${section==='workshop'?'active':''}" href="${demoMode?'#/track/1042':'#/workshop'}">${icon('link')} ${demoMode?'Vista del cliente':'Taller'}</a>`;
  root.innerHTML=`<div class="shell"><aside class="sidebar">${brand}<div class="caption">TU TALLER, EN ORDEN</div><div class="nav-label">ESPACIO DE TRABAJO</div>${nav}<div class="sidebar-bottom"><div class="sidebar-note"><b>Menos llamadas.<br>Más tiempo para reparar.</b><br>Comparte el seguimiento de cada equipo con tu cliente.</div><div class="profile"><span class="avatar">${demoMode?'PL':'GT'}</span><div><span class="profile-workshop-name">${e(workshopName)}</span><small>${demoMode?'Taller de demostración':'Taller conectado'}</small></div></div></div></aside><div class="workspace"><header class="topbar">${workspaceIdentity(workshopName)}<div class="topbar-right"><span class="connection"><i class="online-dot"></i>${demoMode?'Datos en este navegador':'Taller conectado'}</span><span class="demo-pill">${demoMode?'DEMO INTERACTIVA':'MI TALLER'}</span><button id="sign-out" class="small">${demoMode?'Salir de demo':'Cerrar sesión'}</button><span class="avatar">${demoMode?'PL':'GT'}</span></div></header><main class="page" id="main" tabindex="-1">${content}<footer class="footer"><span>GarantiaTrack · Hecho para quienes reparan.</span><span>${demoMode?'Demo · Solo datos ficticios':'GarantiaTrack · Acceso autenticado'}</span></footer></main></div><nav class="mobile-nav" aria-label="Navegación principal"><a href="#/orders" class="${section==='orders'?'active':''}">${icon('grid')}Órdenes</a><a href="#/intake" class="${section==='intake'?'active':''}">${icon('plus')}Recepción</a><a href="${demoMode?'#/track/1042':'#/workshop'}" class="${section==='workshop'?'active':''}">${icon('link')}${demoMode?'Seguimiento':'Taller'}</a></nav></div>`;
  document.querySelector('#sign-out').onclick=signOut;
}
function workshopSettings() {
  const current=demoMode?{id:'demo',name:'Pixel Lab'}:workshop;
  const canRename=!demoMode&&current.owner_id===session?.user?.id;
  shell(workshopSettingsMarkup(current,{canRename,demo:demoMode}),'workshop');
  const form=document.querySelector('#workshop-settings-form');
  const settingsUser=session?.user?.id,settingsWorkshop=workshop?.id,settingsDemo=demoMode,settingsVersion=renderVersion;
  const isCurrent=()=>renderVersion===settingsVersion&&form.isConnected&&demoMode===settingsDemo&&(settingsDemo||(session?.user?.id===settingsUser&&workshop?.id===settingsWorkshop));
  mountWorkshopSettings({form,workshop:current,canRename,isCurrent,friendly,save:(target,name)=>backend.renameWorkshop(target,name),onSaved:saved=>{
    workshop={...workshop,name:saved.name};
    document.querySelector('.breadcrumb').outerHTML=workspaceIdentity(workshop.name);
    document.querySelector('.profile-workshop-name').textContent=workshop.name;
  }});
}
function dashboard() {
  const open=orders.filter(o=>o.status!=='delivered');
  shell(`<div class="eyebrow">EL MOSTRADOR, BAJO CONTROL</div><div class="heading-row"><div><h1>Tu taller, en orden.</h1><p class="subtitle">Consulta y actualiza tus reparaciones.</p></div><a class="primary" style="padding:13px 18px;border-radius:9px;display:flex;align-items:center;justify-content:center;gap:9px" href="#/intake">${icon('plus')} Recibir equipo</a></div><div class="stats"><article class="stat"><div class="stat-label">Órdenes activas ${icon('grid')}</div><div class="stat-value">${String(open.length).padStart(2,'0')}</div></article><article class="stat"><div class="stat-label">En reparación ${icon('controller')}</div><div class="stat-value">${String(open.filter(o=>o.status==='repairing').length).padStart(2,'0')}</div></article><article class="stat"><div class="stat-label">Por aprobar ${icon('clock')}</div><div class="stat-value">${String(open.filter(o=>o.status==='awaiting_approval').length).padStart(2,'0')}</div></article><article class="stat highlight"><div class="stat-label">Listos para entregar ${icon('check')}</div><div class="stat-value">${String(open.filter(o=>o.status==='ready').length).padStart(2,'0')}</div></article></div><div class="toolbar"><div class="tabs" role="group" aria-label="Filtrar órdenes">${[['all','Todas'],['active','En taller'],['awaiting_approval','Por aprobar'],['ready','Listas'],['delivered','Entregadas']].map(([key,label])=>`<button class="tab ${activeFilter===key?'active':''}" aria-pressed="${activeFilter===key}" data-filter="${key}">${label}</button>`).join('')}</div><label class="search"><span>⌕</span><input id="search" type="search" aria-label="Buscar órdenes" placeholder="Buscar equipo, cliente u orden…" value="${e(search)}"></label></div><section class="panel"><div class="panel-head"><div><h2>Reparaciones</h2></div><button class="quiet small" id="export">Exportar CSV ↓</button></div><div id="order-results"></div></section><div class="bottom-grid"><article class="callout"><div class="device-art">${icon('link')}</div><div><h3>Tu cliente también está al tanto.</h3><p>Así se ve el seguimiento de una reparación.</p></div><a class="row-link" href="#/track/1042">Ver ejemplo ${icon('arrow')}</a></article><article class="demo-note"><h3>Un espacio para probar</h3><p>Crea una recepción, cambia un estado y visita el seguimiento. No ingreses datos reales.</p><button class="quiet small" id="reset">Restablecer datos de ejemplo ↺</button></article></div>`);
  renderRows();
  document.querySelector('#search').addEventListener('input',event=>{search=event.target.value;renderRows();});
  document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{activeFilter=button.dataset.filter;dashboard();}));
  if(!demoMode) document.querySelector('.bottom-grid').innerHTML='<details class="workspace-help"><summary>Sobre el seguimiento del cliente</summary><p>Crea o copia el enlace desde la orden. Tiene vencimiento y puedes revocarlo; no muestra notas internas ni fotos.</p></details>';
  else document.querySelector('#reset').onclick=()=>showReset();
  document.querySelector('#export').onclick=()=>exportOrders();
}
function renderRows() {
  const query=search.toLocaleLowerCase('es');
  const found=orders.filter(o=>(activeFilter==='all'||(activeFilter==='active'?o.status!=='delivered':o.status===activeFilter))&&`${o.number} ${o.model} ${o.customer} ${o.phone} ${o.serial}`.toLocaleLowerCase('es').includes(query)).sort((a,b)=>b.number-a.number);
  document.querySelector('#order-results').innerHTML=found.length ? `<div class="table-wrap"><table><thead><tr><th>Equipo / Orden</th><th>Cliente</th><th>Estado</th><th>Presupuesto</th><th></th></tr></thead><tbody>${found.map(o=>`<tr><td><div class="device-cell"><div class="device-art">${icon(o.device)}</div><div><strong>${e(o.model)}</strong><span class="order-number">GT-${o.number}</span> <small>· ${deviceLabel(o.device)}</small></div></div></td><td><strong>${e(o.customer)}</strong><small>${e(o.phone)}</small></td><td>${badge(o.status)}</td><td>${o.quote?money(o.quote):'<small>Por definir</small>'}</td><td><a class="row-link" href="#/orders/${o.number}" aria-label="Ver orden GT-${o.number}">Ver orden →</a></td></tr>`).join('')}</tbody></table></div><div class="panel-foot">${found.length} ${found.length===1?'orden':'órdenes'} · ${demoMode?'Los cambios se guardan solo en este navegador':'Hasta 500 órdenes recientes · Datos del taller'}</div>` : orders.length
    ? '<div class="empty"><h3>No encontramos órdenes</h3><p>Prueba otro término o cambia el filtro.</p></div>'
    : '<div class="empty"><h3>Aún no tienes reparaciones</h3><p>Usa Recibir equipo para registrar tu primera orden.</p></div>';
}
function intake() {
  let photos=[];
  const requestId=crypto.randomUUID(), photoIds=new Map();
  shell(`<a class="back" href="#/orders">← Volver a reparaciones</a><div class="heading-row intake-heading"><div><h1>Nueva recepción</h1><p class="subtitle">* Campos obligatorios.${demoMode?' Usa solo datos ficticios.':''}</p></div><span id="intake-save-state" class="badge" role="status">Borrador sin guardar</span></div><div class="form-layout"><form id="intake-form" class="panel"><section class="section"><div class="section-title"><span class="step-number">01</span><h2>¿Quién lo trae?</h2></div><div class="field-grid"><label class="field">Nombre del cliente *<input name="customer" autocomplete="off" maxlength="80" required ${demoMode?'placeholder="Ej. Alex de Prueba"':''}></label><label class="field">Celular de contacto *<input name="phone" type="tel" inputmode="numeric" maxlength="9" pattern="9[0-9]{8}" required ${demoMode?'placeholder="900000006"':''}>${demoMode?'<span class="hint">Usa un número ficticio de 9 dígitos.</span>':''}</label></div></section><section class="section"><div class="section-title"><span class="step-number">02</span><h2>Conozcamos el equipo</h2></div><div class="field-grid"><fieldset class="field full device-types"><legend>Tipo de equipo</legend><div class="choices">${deviceTypes.map(([value,label])=>`<label class="choice"><input type="radio" name="device" value="${value}" ${value==='console'?'checked':''}>${icon(value)} ${label}</label>`).join('')}</div></fieldset><label class="field">Modelo *<input name="model" maxlength="100" required placeholder="Ej. PlayStation 5 · Digital" list="models"><datalist id="models"><option value="PlayStation 5 · Digital"><option value="PlayStation 4 · Slim"><option value="Nintendo Switch · OLED"><option value="Xbox Series S"><option value="DualSense · Blanco"><option value="Xbox Wireless · Carbon Black"></datalist></label><label class="field">Número de serie (opcional)<input name="serial" maxlength="80" ${demoMode?'placeholder="Ej. DEMO-PS5-046"':''}></label><label class="field full">Falla reportada por el cliente *<textarea name="issue" maxlength="1500" required placeholder="¿Qué está pasando y desde cuándo?"></textarea></label></div></section><section class="section"><div class="section-title"><span class="step-number">03</span><h2>Así lo recibimos</h2></div><div class="field-grid"><div class="field full">Accesorios recibidos<div class="choices">${['Cable de poder','Cable HDMI','Cable USB','Base','Estuche'].map(label=>`<label class="choice"><input type="checkbox" name="accessories" value="${label}">${label}</label>`).join('')}</div></div><label class="field full">Estado físico<textarea name="condition" maxlength="1500" placeholder="Rayones, golpes, sellos o piezas faltantes…"></textarea></label><div class="field full"><label class="upload">${icon('plus')}<br>Fotos del estado de ingreso<input id="photo-input" type="file" accept="image/jpeg,image/png,image/webp" multiple aria-label="Añadir fotos del equipo"></label><span id="intake-photo-help" class="hint">Hasta 5 fotos JPG, PNG o WebP, de 10 MB cada una. ${demoMode?'Solo se guardan en este navegador.':'Solo visibles para el taller.'}</span><div id="photo-preview" class="photo-grid"></div></div></div></section><p class="error" id="form-error" role="alert"></p><div class="form-actions"><a class="quiet" href="#/orders">Cancelar</a><button class="primary" type="submit">Crear orden de recepción →</button></div></form><aside><div class="aside-card"><div class="eyebrow">UNA BUENA RECEPCIÓN</div><h2 style="margin-top:12px">Los detalles importan.</h2><p>Un registro claro evita dudas al entregar el equipo.</p><ul class="check-list"><li>Confirma el modelo y la serie</li><li>Revisa los accesorios juntos</li><li>Documenta marcas y golpes</li><li>Comparte el seguimiento</li></ul><p>Al guardar se asignará el número de orden y podrás abrir la vista del cliente.</p></div></aside></div>`,'intake');
  const form=document.querySelector('#intake-form');
  const intakeUser=session?.user?.id, intakeWorkshop=workshop?.id, intakeDemo=demoMode,intakeVersion=renderVersion;
  const isCurrent=()=>renderVersion===intakeVersion && form.isConnected && demoMode===intakeDemo && (intakeDemo || (session?.user?.id===intakeUser && workshop?.id===intakeWorkshop));
  document.querySelector('#photo-input').onchange=async event=>{
    const input=event.target, button=form.querySelector('[type=submit]'); button.disabled=true;input.disabled=true;
    try { const files=[...input.files]; if(files.length+photos.length>5) throw new Error('Puedes adjuntar un máximo de 5 fotos.'); const converted=[]; for(const file of files) converted.push(await compressPhoto(file)); if(!isCurrent())return;photos.push(...converted); form.querySelector('#photo-preview').innerHTML=photos.map((src,index)=>`<figure style="margin:0"><img src="${src}" alt="Foto de ingreso ${index+1}"><button type="button" class="quiet small" data-remove-photo="${index}" aria-label="Quitar foto ${index+1}">Quitar</button></figure>`).join(''); form.querySelector('#form-error').textContent=''; }
    catch(error){if(isCurrent())form.querySelector('#form-error').textContent=error.message;}
    finally{input.value='';button.disabled=false;input.disabled=false;}
  };
  form.addEventListener('click',event=>{const button=event.target.closest('[data-remove-photo]');if(button){photos.splice(Number(button.dataset.removePhoto),1);button.parentElement.remove();form.querySelectorAll('[data-remove-photo]').forEach((b,i)=>b.dataset.removePhoto=i);}});
  form.onsubmit=async event=>{
    event.preventDefault();if(!isCurrent())return; const button=form.querySelector('[type=submit]');button.disabled=true; const data=new FormData(form), values=Object.fromEntries(data.entries());
    try {validateIntake(values); const now=new Date().toISOString(); const order={number:nextOrderNumber(orders),customer:values.customer.trim(),phone:values.phone,device:values.device,model:values.model.trim(),serial:values.serial.trim(),issue:values.issue.trim(),condition:values.condition.trim(),accessories:data.getAll('accessories'),status:'received',quote:0,notes:'',message:'Recibimos tu equipo. Pronto iniciaremos la revisión.',created:now,photos:[...photos],events:[{status:'received',at:now}]}; if(!demoMode){
      const items=photos.map(src=>{if(!photoIds.has(src))photoIds.set(src,crypto.randomUUID());return {src,id:photoIds.get(src)};});
      const saved=await backend.receive(intakeWorkshop,requestId,order,items);
      if(!isCurrent())return;
      document.querySelector('#intake-save-state').textContent=`Orden GT-${saved.number} guardada`;
      const loaded=await backend.load(intakeWorkshop);
      if(!isCurrent())return;
      orders=loaded;completeOrderList=true;location.hash='/orders/'+saved.number;notify('Orden guardada en el taller.');
    }else if(persist([...orders,order])){location.hash=`/orders/${order.number}`;notify(`Orden GT-${order.number} creada. Ya puedes compartir su seguimiento.`);} }
    catch(error){if(isCurrent()){
      if(error instanceof PendingIntakePhotosError){
        document.querySelector('#intake-save-state').textContent=`Orden GT-${error.orderNumber} guardada · Fotos pendientes`;
        let link=form.querySelector('#open-saved-order');
        if(!link){link=document.createElement('a');link.id='open-saved-order';link.className='row-link';form.querySelector('#form-error').after(link);}
        link.href=`#/orders/${error.orderNumber}`;link.textContent=`Abrir orden GT-${error.orderNumber} y completar fotos →`;
      }
      form.querySelector('#form-error').textContent=friendly(error);
    }}
    finally{button.disabled=false;}
  };
}
async function compressPhoto(file) {
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024) throw new Error('Usa fotos JPG, PNG o WebP de hasta 10 MB.');
  const bitmap=await createImageBitmap(file); const ratio=Math.min(1,1000/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*ratio);canvas.height=Math.round(bitmap.height*ratio);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();return canvas.toDataURL('image/jpeg',.7);
}
function detail(number) {
  const order=orders.find(o=>o.number===number); if(!order) return notFound();
  photoViewerVersion=renderVersion;
  shell(`<a class="back" href="#/orders">← Todas las reparaciones</a><div class="eyebrow">EXPEDIENTE DE REPARACIÓN</div><div class="heading-row"><div><h1>GT-${order.number} <span style="color:#a4af9b;font-weight:400">/</span> ${e(order.model)}</h1><p class="subtitle">Recibido el ${date(order.created)}</p></div><span id="order-status-badge">${badge(order.status)}</span></div><div id="status-editor">${statusChangeMarkup(order.status)}</div><div class="detail-layout"><div><section class="panel"><div class="panel-head"><div><h2>Recepción del equipo</h2></div><div class="device-art">${icon(order.device)}</div></div><div class="section"><dl class="detail-grid"><div><dt>Cliente</dt><dd>${e(order.customer)}</dd></div><div><dt>Celular</dt><dd>${e(order.phone)}</dd></div><div><dt>Serie</dt><dd>${e(order.serial||'Sin registrar')}</dd></div><div><dt>Accesorios</dt><dd>${order.accessories.map(e).join(', ')||'Sin accesorios'}</dd></div><div class="full"><dt>Falla reportada</dt><dd>${e(order.issue)}</dd></div><div class="full"><dt>Estado físico</dt><dd>${e(order.condition||'Sin observaciones')}</dd></div></dl>${order.photos.length?`<div class="photo-grid">${order.photos.map((src,i)=>orderPhotoThumbnail(safePhoto(src),i)).join('')}</div>`:`<p class="hint">${demoMode?'Esta orden de ejemplo no tiene fotos. Puedes añadirlas al crear una recepción.':'Sin fotos de ingreso.'}</p>`}</div></section><form class="panel" id="update-form" style="margin-top:20px"><div class="panel-head"><div><h2>Presupuesto y mensajes</h2></div></div><div class="section"><div class="field-grid"><label class="field">Presupuesto (S/)<input name="quote" type="number" min="0" max="999999.99" step="0.01" required value="${(order.quote/100).toFixed(2)}"></label><label class="field full">Notas internas<textarea name="notes" maxlength="2000">${e(order.notes)}</textarea><span class="hint">Solo aparecen en el panel del taller.</span></label><label class="field full">Mensaje para el cliente<textarea name="message" maxlength="600" required>${e(order.message)}</textarea><span class="hint">Visible en el seguimiento. No incluyas información sensible.</span></label></div><p class="error" id="update-error" role="alert"></p></div><div class="form-actions"><button class="primary" type="submit">Guardar presupuesto y mensajes</button></div></form></div><aside><section class="panel"><div class="section"><div class="eyebrow">ENLACE DE SEGUIMIENTO</div><h2 style="margin-top:12px">Sin llamadas de más.</h2><p class="subtitle">Tu cliente consulta el estado desde su navegador.</p><div class="actions-stack" style="margin-top:20px"><a class="primary" style="padding:13px;text-align:center;border-radius:8px" href="${demoMode?`#/track/${order.number}`:'#/orders'}" ${demoMode?'':'hidden'}>Abrir vista del cliente ↗</a><button id="copy-link">${demoMode?'Copiar enlace de demo':'Recuperar enlace del taller'}</button><button id="print-order" class="secondary">Imprimir recepción</button></div><p class="hint">${demoMode?'El enlace solo funciona con los datos de este navegador. No es un seguimiento compartido real.':'Reimprimir o copiar conserva el enlace y su vencimiento. Renovar o revocar invalida los tickets anteriores.'}</p></div></section><section class="panel" style="margin-top:20px"><div class="section"><h2>Historial del equipo</h2><ol class="timeline" id="order-history">${order.events.map(event=>`<li>${statusLabel(event.status)}<small>${date(event.at)}</small></li>`).join('')}</ol></div></section></aside></div>`);
  document.querySelector('#print-order').textContent='Ticket de recepción · QR';
  document.querySelector('#print-order').onclick=()=>{location.hash=`/ticket/${number}`;};
  if(!demoMode) enhanceDetail(order);
  else document.querySelector('#copy-link').onclick=async()=>{try{await navigator.clipboard.writeText(`${location.href.split('#')[0]}#/track/${number}`);notify('Enlace copiado. Solo contiene datos en este navegador.');}catch{notify('No se pudo copiar. Abre la vista del cliente y copia la dirección.');}};
  const detailForm=document.querySelector('#update-form'), statusContainer=document.querySelector('#status-editor'), detailUser=session?.user?.id, detailWorkshop=workshop?.id, detailDemo=demoMode,detailVersion=renderVersion;
  let saving=false;
  const setSaving=value=>{saving=value;detailForm.querySelector('[type=submit]').disabled=value;statusContainer.querySelector('fieldset').disabled=value;statusContainer.querySelector('[type=submit]').disabled=value;};
  const isCurrent=()=>renderVersion===detailVersion && detailForm.isConnected && demoMode===detailDemo && (detailDemo || (session?.user?.id===detailUser && workshop?.id===detailWorkshop));
  mountStatusChange({container:statusContainer,order,isCurrent,isBusy:()=>saving,setBusy:setSaving,friendly,save:async status=>{
    if(!await updateOrder(order,statusChanges(order,status),isCurrent))return null;
    const saved=orders.find(item=>item.number===order.number);
    if(!saved||saved.status!==status)throw new Error('No pudimos confirmar el estado. Recarga antes de volver a guardar.');
    return saved;
  },onSaved:saved=>{
    Object.assign(order,saved);
    document.querySelector('#order-status-badge').innerHTML=badge(order.status);
    document.querySelector('#order-history').innerHTML=order.events.map(event=>`<li>${statusLabel(event.status)}<small>${date(event.at)}</small></li>`).join('');
  }});
  detailForm.onsubmit=async event=>{event.preventDefault();if(saving||!isCurrent())return;setSaving(true);const data=new FormData(event.target);try{const status=order.status;const changes={status,quote:parseAmount(data.get('quote')),notes:data.get('notes').trim(),message:data.get('message').trim(),events:order.events};if(!changes.message)throw new Error('Escribe un mensaje para el cliente.');if(await updateOrder(order,changes,isCurrent)){detail(number);notify('Cambios guardados. El seguimiento ya está actualizado.');}}catch(error){if(isCurrent())detailForm.querySelector('#update-error').textContent=friendly(error);}finally{if(isCurrent())setSaving(false);}};
}
function safePhoto(value){return /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value)?value:'';}
function tracking(number,remote=null) {
  const raw=remote||orders.find(o=>o.number===number); if(!raw)return notFound(true,true);
  const order=remote||publicOrder(raw),current=statuses.findIndex(([key])=>key===order.status);
  root.innerHTML=`<div class="tracker-body"><header class="tracker-top">${brand}<a class="small" style="border:1px solid #577666;border-radius:7px" href="${remote?'#/orders':`#/orders/${order.number}`}">${remote?'Acceso al taller':'← Volver al taller de demo'}</a></header><main class="tracker-main" id="main" tabindex="-1"><div class="tracker-intro"><span class="demo-pill">${remote?'SEGUIMIENTO PRIVADO':'VISTA DEL CLIENTE · DEMO'}</span><h1>Tu equipo, más cerca de volver.</h1><p>Seguimiento de reparación · ${e(remote?remote.workshop:'Pixel Lab')}</p></div><section class="panel"><div class="tracker-hero"><div class="device-art">${icon(order.device)}</div><span class="eyebrow">ORDEN GT-${order.number}</span><h2>${e(order.model)}</h2>${badge(order.status)}<p>Última actualización: ${date(order.events.at(-1).at)}</p></div><section class="section"><h3>Un mensaje de tu taller</h3><p class="tracker-message">${e(order.message)}</p></section><section class="section"><h3>Así va tu reparación</h3><ol class="timeline">${statuses.map(([key,label],index)=>{const event=order.events.findLast(event=>event.status===key);return `<li style="${index>current?'opacity:.45':''}">${label}${index===current?' <b>· Ahora</b>':''}<small>${event?date(event.at):index>current?'Pendiente':'Etapa no registrada'}</small></li>`;}).join('')}</ol></section><section class="section"><h3>¿Tienes alguna consulta?</h3><p class="subtitle">Menciona tu orden GT-${order.number} al hablar con el taller.</p><p class="hint">${remote?'Consulta directamente con tu taller y menciona el número de orden. Este enlace no muestra fotografías ni datos de contacto del cliente.':'Pixel Lab · Taller ficticio<br>Lunes a sábado, 10:00–19:00<br>No se envían mensajes ni notificaciones desde esta demo.'}</p></section></section><p class="tracker-foot">${remote?'GarantiaTrack · Enlace privado. No lo compartas con terceros.':'Los datos de ejemplo se guardan en este navegador.'}</p></main></div>`;
}
function notFound(client=false,demoTracking=false){
  if(!client){shell(unavailableOrder());return;}
  const help=demoTracking?'El ejemplo no está disponible en este navegador.':'El enlace puede haber vencido o estar revocado. Solicita un enlace vigente a tu taller.';
  const back=demoTracking?'<a class="row-link" href="#/orders">Volver al taller de demo →</a>':'';
  root.innerHTML=`<main class="tracker-main" id="main"><h1>Orden no disponible</h1><p>${help}</p>${back}</main>`;
}
function showReset(){const dialog=document.createElement('dialog');dialog.innerHTML='<h2>¿Restablecer la demo?</h2><p>Se eliminarán las órdenes y fotos creadas en este navegador y volverán los cinco ejemplos iniciales.</p><div class="dialog-actions"><button id="cancel-reset">Cancelar</button><button class="primary" id="confirm-reset">Restablecer</button></div>';document.body.append(dialog);dialog.showModal();dialog.querySelector('#cancel-reset').onclick=()=>dialog.close();dialog.querySelector('#confirm-reset').onclick=()=>{if(persist(seedOrders())){dialog.close();dashboard();notify('Datos ficticios restablecidos.');}};dialog.addEventListener('close',()=>dialog.remove());}
function exportOrders(){const cell=value=>`"${String(value??'').replace(/^[=+@\-\t\r]/,'\'$&').replaceAll('"','""')}"`;const rows=[['order_number','customer','phone','model','status','quote_pen','created_at'],...orders.map(o=>[`GT-${o.number}`,o.customer,o.phone,o.model,o.status,(o.quote/100).toFixed(2),o.created])];const url=URL.createObjectURL(new Blob(['\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=demoMode?'garantiatrack-demo-orders.csv':'garantiatrack-orders.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify(demoMode?'Exportación de demostración descargada.':'Exportación CSV descargada.');}
function ticket(number){
  const order=orders.find(item=>item.number===number);if(!order)return notFound();
  const userId=session?.user?.id,workshopId=workshop?.id,ticketDemo=demoMode,version=renderVersion;
  showReceipt({root,order,workshopName:demoMode?'Pixel Lab':workshop.name,demo:demoMode,links:receiptLinks,backend,applicationUrl:config.publicAppUrl?`${config.publicAppUrl}/`:`${location.origin}${location.pathname}`,isCurrent:()=>renderVersion===version && demoMode===ticketDemo && (ticketDemo || (session?.user?.id===userId && workshop?.id===workshopId))});
}
function renderScreen(){const route=location.hash.slice(1)||'/orders';if(route==='/orders')dashboard();else if(route==='/intake')intake();else if(route==='/workshop')workshopSettings();else if(/^\/orders\/\d+$/.test(route))detail(Number(route.split('/').at(-1)));else if(/^\/ticket\/\d+$/.test(route))ticket(Number(route.split('/').at(-1)));else if(/^\/track\/\d+$/.test(route))tracking(Number(route.split('/').at(-1)));else notFound();window.scrollTo(0,0);}
window.addEventListener('hashchange',()=>render());
document.querySelector('.skip-link').addEventListener('click',event=>{event.preventDefault();document.querySelector('#main')?.focus();});
if(demoEnabled) window.addEventListener('storage',event=>{if(event.key===storageKey){notify('Los datos cambiaron en otra pestaña. Recarga antes de editar.');}});
function friendly(error) {
  if(error?.code==='40001')return 'Otra sesión modificó esta orden. Recarga la página antes de guardar.';
  if(error?.code==='42501')return 'No tienes acceso a este taller. Inicia sesión de nuevo.';
  if(error?.code==='23514'||error?.code==='23502')return 'Revisa los campos obligatorios y sus límites.';
  if(error?.code==='invalid_credentials')return 'El correo o la contraseña no son correctos.';
  if(error?.code==='email_not_confirmed')return 'Confirma tu correo antes de iniciar sesión.';
  if(error?.code==='over_email_send_rate_limit'||error?.status===429)return 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.';
  if(error?.message?.startsWith('La orden GT-'))return error.message;
  if(error instanceof Error && !error.code && !error.status && !/fetch|network|supabase/i.test(error.message))return error.message;
  return 'No se pudo completar la operación. Revisa tu conexión y la configuración de Supabase.';
}
async function initializeConnection(){
  if(!connectionPromise)connectionPromise=(async()=>{
    backend=await connect(config);
    const {data,error}=await backend.client.auth.getSession();if(error)throw error;
    session=data.session;
    backend.client.auth.onAuthStateChange((event,next)=>{
      const changed=session?.user?.id!==next?.user?.id;
      session=next;
      if(event==='PASSWORD_RECOVERY')recovery=true;
      if(changed||event==='PASSWORD_RECOVERY'){
        photoViewer.close();
        workspaceTransition.clear();root.replaceChildren();
        receiptLinks.clear();
        orders=[];completeOrderList=false;workshop=null;renderVersion++;
        setTimeout(()=>{if(!demoMode)render();},0);
      }
    });
  })().catch(error=>{connectionPromise=null;throw error;});
  return connectionPromise;
}
async function signOut(){
  photoViewer.close();
  if(!demoMode){const {error}=await backend.client.auth.signOut({scope:'local'});if(error){notify(friendly(error));return;}}
  receiptLinks.clear();
  sessionStorage.removeItem('garantiatrack.mode');demoMode=false;session=null;workshop=null;orders=[];completeOrderList=false;recovery=false;
  clearTimeout(toastTimer);document.querySelector('#toast').textContent='';document.querySelector('#toast').classList.remove('visible');
  location.hash='/orders';render();
}
function accessScreen(mode='login'){
  if(mode==='confirmation'){
    root.innerHTML=`<div class="tracker-body"><header class="tracker-top">${brand}<span class="demo-pill">ACCESO AL TALLER</span></header><main class="tracker-main" id="main" tabindex="-1">${registrationConfirmation()}</main></div>`;
    root.querySelectorAll('[data-auth]').forEach(button=>button.onclick=()=>accessScreen(button.dataset.auth));
    root.querySelector('#registration-title').focus();window.scrollTo(0,0);return;
  }
  const titles={login:'Bienvenido a tu taller.',register:'Crea tu acceso.',reset:'Recupera tu acceso.',recovery:'Elige una nueva contraseña.'};
  root.innerHTML=`<div class="tracker-body"><header class="tracker-top">${brand}<span class="demo-pill">ACCESO AL TALLER</span></header><main class="tracker-main" id="main" tabindex="-1"><div class="tracker-intro"><div class="eyebrow">TU TALLER, EN ORDEN</div><h1>${titles[mode]}</h1><p>El mismo mostrador. Ahora con tus datos protegidos.</p></div><section class="panel"><div class="section">${configured?`<form id="auth-form" class="actions-stack">${mode!=='recovery'?'<label class="field">Correo electrónico<input name="email" type="email" autocomplete="email" required maxlength="254"></label>':''}${mode!=='reset'?`<label class="field">Contraseña<input name="password" type="password" autocomplete="${mode==='login'?'current-password':'new-password'}" required minlength="${mode==='login'?1:12}" maxlength="128"></label>`:''}<p id="auth-error" class="error" role="alert"></p><p id="auth-info" class="hint" role="status"></p><button type="submit" class="primary">${{login:'Entrar al taller',register:'Crear cuenta',reset:'Enviar enlace de recuperación',recovery:'Guardar contraseña'}[mode]}</button></form><div class="auth-links"><button class="quiet small" data-auth="login">Iniciar sesión</button><button class="quiet small" data-auth="register">Crear cuenta</button><button class="quiet small" data-auth="reset">Olvidé mi contraseña</button></div>`:'<h2>Conectemos tu Supabase</h2><p class="subtitle">Falta configurar la URL del proyecto y su clave pública. Consulta docs/supabase-setup.md y reinicia el servidor después de completar .env.</p><p class="hint">El acceso a datos reales permanece cerrado hasta configurar el servicio.</p>'}${demoEnabled?`<hr style="border:0;border-top:1px solid var(--line);margin:24px 0"><button id="enter-demo" class="secondary" style="width:100%">Explorar con datos ficticios</button><p class="hint">La demo es independiente. No importa datos ni simula una sesión autenticada.</p>`:''}</div></section></main></div>`;
  if(demoEnabled){
    document.querySelector('#enter-demo').onclick=()=>{receiptLinks.clear();sessionStorage.setItem('garantiatrack.mode','demo');demoMode=true;loadDemo();location.hash='/orders';render();};
  }
  document.querySelectorAll('[data-auth]').forEach(button=>button.onclick=()=>accessScreen(button.dataset.auth));
  const form=document.querySelector('#auth-form');if(!form)return;
  form.onsubmit=async event=>{
    event.preventDefault();const button=form.querySelector('[type=submit]');button.disabled=true;
    const data=new FormData(form),email=data.get('email'),password=data.get('password');
    const errorNode=document.querySelector('#auth-error'),infoNode=document.querySelector('#auth-info');errorNode.textContent='';infoNode.textContent='';
    try{
      const redirect=`${location.origin}${location.pathname}?auth=recovery`;
      if(mode==='login'){
        const {data,error}=await backend.client.auth.signInWithPassword({email,password});if(error)throw error;session=data.session;form.reset();render();
      }else if(mode==='register'){
        const result=await registerAccount(backend.client.auth,{email,password,options:{emailRedirectTo:location.origin+location.pathname}},()=>form.isConnected);
        if(result.state==='stale')return;
        form.reset();if(result.state==='signed-in'){session=result.session;render();}else accessScreen('confirmation');
      }else if(mode==='reset'){
        const {error}=await backend.client.auth.resetPasswordForEmail(email,{redirectTo:redirect});if(error)throw error;
        infoNode.textContent='Si existe una cuenta con ese correo, recibirás las instrucciones de recuperación.';
      }else{
        const {error}=await backend.client.auth.updateUser({password});if(error)throw error;recovery=false;history.replaceState(null,'',location.pathname+'#/orders');render();notify('Contraseña actualizada.');
      }
    }catch(error){if(form.isConnected)errorNode.textContent=friendly(error);}finally{button.disabled=false;}
  };
}
function onboarding(){
  root.innerHTML=`<div class="tracker-body"><header class="tracker-top">${brand}<button id="sign-out">Cerrar sesión</button></header><main class="tracker-main" id="main"><div class="tracker-intro"><h1>Dale un nombre a tu taller.</h1><p>Crearás un espacio privado para tus reparaciones.</p></div><form id="workshop-form" class="panel section actions-stack"><label class="field">Nombre del taller<input name="name" required minlength="2" maxlength="80"></label><p class="error" id="workshop-error" role="alert"></p><button class="primary">Crear mi taller</button><p class="hint">Si perteneces a un taller existente, solicita al propietario que te incorpore antes de crear otro.</p></form></main></div>`;
  document.querySelector('#sign-out').onclick=signOut;
  document.querySelector('#workshop-form').onsubmit=async event=>{event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;try{await backend.createWorkshop(new FormData(event.target).get('name').trim());render();}catch(error){document.querySelector('#workshop-error').textContent=friendly(error);}finally{button.disabled=false;}};
}
function enhanceDetail(order){
  const actions=document.querySelector('.detail-layout aside .actions-stack'),viewer=actions.querySelector('a');
  const userId=session?.user?.id,workshopId=workshop?.id,generation=receiptLinks.generation(),detailVersion=renderVersion;
  const current=()=>renderVersion===detailVersion && actions.isConnected && !demoMode && session?.user?.id===userId && workshop?.id===workshopId && receiptLinks.generation()===generation;
  actions.insertAdjacentHTML('beforeend','<input id="tracking-url" readonly aria-label="Enlace privado de seguimiento" hidden><button id="renew-link" class="quiet" hidden>Renovar enlace / QR</button><button id="revoke-link" class="quiet">Revocar enlace anterior</button>');
  const showLink=url=>{viewer.href=url;viewer.hidden=false;const input=actions.querySelector('#tracking-url');input.value=url;input.hidden=false;actions.querySelector('#copy-link').textContent='Copiar enlace activo';actions.querySelector('#renew-link').hidden=false;};
  const busy=value=>actions.querySelectorAll('button').forEach(button=>{button.disabled=value;});
  const display=document.querySelector('.detail-grid');
  display.insertAdjacentHTML('afterend','<div id="cloud-photos" class="photo-grid" aria-live="polite"></div><div id="photo-recovery" class="photo-recovery"></div>');
  const photoContainer=document.querySelector('#cloud-photos'),recoveryContainer=document.querySelector('#photo-recovery');
  const emptyNote=display.parentElement.querySelector('.hint');let photoVersion=0;
  const photoCurrent=()=>renderVersion===detailVersion && photoContainer.isConnected && !demoMode && session?.user?.id===userId && workshop?.id===workshopId;
  const loadPhotos=()=>{
    const version=++photoVersion;
    backend.photos(order).then(urls=>{if(photoCurrent() && photoVersion===version){photoViewer.close();photoContainer.innerHTML=urls.map((src,index)=>orderPhotoThumbnail(src,index,{privatePhoto:true})).join('');}}).catch(()=>{if(photoCurrent() && photoVersion===version){photoViewer.close();photoContainer.textContent='No se pudieron cargar las fotos. Recarga para reintentar.';}});
    if(emptyNote)emptyNote.textContent=order.photoRecords.some(photo=>photo.state==='pending')?'Hay fotos pendientes. Puedes completarlas aquí.':order.photoRecords.length?'Fotos privadas · Acceso temporal de 5 minutos':'Sin fotos de ingreso.';
  };
  loadPhotos();
  mountPhotoRecovery({container:recoveryContainer,order,backend,compressPhoto,isCurrent:photoCurrent,onRecords:loadPhotos,onSaved:()=>notify('Foto disponible en la orden. El seguimiento se conserva.')});
  async function shareLink(renew=false){
    busy(true);
    try{
      if(renew){if(!await confirmTrackingRenewal(actions)||!current())return;await backend.trackingLink(order);if(!current())return;}
      const stored=await backend.receiptLink(order,!renew);
      if(!current())return;
      if(stored.state!=='active'){location.hash=`/ticket/${order.number}`;notify('Abre el ticket para recuperar o renovar el QR de forma explícita.');return;}
      const url=stored.url;receiptLinks.set(order.id,url);showLink(url);
      try{await navigator.clipboard.writeText(url);if(current())notify('Enlace privado copiado.');}catch{if(current()){actions.querySelector('#tracking-url').select();notify('Puedes copiar el enlace del campo.');}}
    }catch(error){if(current())notify(friendly(error));}finally{if(current())busy(false);}
  }
  document.querySelector('#copy-link').onclick=()=>shareLink();
  document.querySelector('#renew-link').onclick=()=>shareLink(true);
  document.querySelector('#revoke-link').onclick=async()=>{busy(true);try{await backend.revoke(order);if(!current())return;receiptLinks.remove(order.id);viewer.hidden=true;actions.querySelector('#tracking-url').hidden=true;actions.querySelector('#tracking-url').value='';actions.querySelector('#copy-link').textContent='Crear enlace privado';actions.querySelector('#renew-link').hidden=true;notify('Enlace revocado.');}catch(error){if(current())notify(friendly(error));}finally{if(current())busy(false);}};
  busy(true);
  backend.receiptLink(order).then(stored=>{if(!current())return;if(stored.state==='active'){receiptLinks.set(order.id,stored.url);showLink(stored.url);}else{receiptLinks.remove(order.id);actions.querySelector('#copy-link').textContent=stored.state==='missing'?'Crear enlace privado':'Recuperar QR desde el ticket';}}).catch(()=>{if(current())notify('No pudimos recuperar el QR. Abre el ticket para volver a intentarlo.');}).finally(()=>{if(current())busy(false);});
}
async function render(){
  photoViewer.close();
  const version=++renderVersion,route=location.hash.slice(1)||'/orders';
  if(demoMode && !route.startsWith('/tracking/')){renderScreen();return;}
  if(!configured){accessScreen();return;}
  const internal=!route.startsWith('/tracking/');
  const transitioning=Boolean(session&&workshop&&!recovery&&internal&&workspaceTransition.begin(route));
  if(!transitioning){workspaceTransition.clear();root.innerHTML='<main class="tracker-main" id="main"><h1>Conectando con tu taller…</h1><p role="status">Comprobando acceso.</p></main>';}
  try{
    await initializeConnection();if(version!==renderVersion)return;
    if(/^\/tracking\/[a-f0-9]{64}$/.test(route)){
      const result=await backend.tracking(route.split('/').at(-1));if(version!==renderVersion)return;
      if(!result){notFound(true);return;}
      tracking(result.number,result);
      return;
    }
    if(!session){accessScreen();return;}
    if(recovery){accessScreen('recovery');return;}
    const loaded=await loadWorkspace(backend,route,workshop?.id,()=>version===renderVersion,checked=>{
      if(transitioning&&checked?.id!==workshop?.id){
        workspaceTransition.clear();orders=[];completeOrderList=false;receiptLinks.clear();
        root.innerHTML='<main class="tracker-main" id="main"><h1>Conectando con tu taller…</h1><p role="status">Comprobando acceso.</p></main>';
      }
    });
    if(!loaded)return;
    workspaceTransition.clear();
    if(workshop?.id!==loaded.workshop?.id){orders=[];completeOrderList=false;receiptLinks.clear();}
    workshop=loaded.workshop;
    if(!workshop){orders=[];completeOrderList=false;onboarding();return;}
    if(loaded.request.kind==='list'){orders=loaded.orders;completeOrderList=true;}
    else if(loaded.request.kind==='order')orders=[...orders.filter(order=>order.number!==loaded.request.number),...loaded.orders];
    if(/^\/track\//.test(route)){notFound(true);return;}
    renderScreen();
    if(transitioning)document.querySelector('#main')?.focus({preventScroll:true});
  }catch(error){
    if(version!==renderVersion)return;
    workspaceTransition.clear();
    orders=[];completeOrderList=false;workshop=null;receiptLinks.clear();root.innerHTML=`<main class="tracker-main" id="main"><h1>No pudimos conectar.</h1><p class="error">${e(friendly(error))}</p><button id="retry">Reintentar</button> <button id="exit">${session?'Cerrar sesión':'Volver al acceso'}</button></main>`;
    document.querySelector('#retry').onclick=()=>render();document.querySelector('#exit').onclick=()=>session?signOut():accessScreen();
  }
}
render();
