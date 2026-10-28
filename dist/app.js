import {statuses,statusLabel,money,escapeHtml as e,parseAmount,nextOrderNumber,publicOrder,validateIntake,seedOrders} from './domain.js';

import {connect} from './backend.js';
import {createReceiptLinks} from './receipt.js';
import {showReceipt,confirmTrackingRenewal} from './receipt-view.js';
const receiptLinks = createReceiptLinks();
const config = window.GARANTIATRACK_CONFIG || {};
const configured = Boolean(config.supabaseUrl && config.supabaseKey);
let demoMode = sessionStorage.getItem('garantiatrack.mode') === 'demo';
let backend, workshop, session, recovery = new URLSearchParams(location.search).get('auth')==='recovery', renderVersion = 0;
let connectionPromise;
const storageKey = 'garantiatrack.demo.v1';
let orders = [];
function loadDemo() {
try { orders = JSON.parse(localStorage.getItem(storageKey)); if (!Array.isArray(orders) || !orders.length || !orders.every(order => Number.isInteger(order.number) && Array.isArray(order.events) && Array.isArray(order.photos) && statuses.some(([key])=>key===order.status))) orders = seedOrders(); } catch { orders = seedOrders(); }
}
if(demoMode) loadDemo();
let activeFilter = 'all', search = '', toastTimer;
const root = document.querySelector('#app');
const icon = name => {
  const paths = {grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',plus:'<path d="M12 5v14M5 12h14"/>',controller:'<path d="M7 7h10c3 0 5 10 3 11-2 1-4-3-5-3H9c-1 0-3 4-5 3C2 17 4 7 7 7Z"/><path d="M8 9v5m-2-2.5h4M16 10h.1M18 13h.1"/>',console:'<path d="m8 3 8 2v15l-8 1Z"/><path d="M8 3 5 5v14l3 2m8-16 3 2v11l-3 2M11 7v8m2 3h.1"/>',link:'<path d="m10 13 4-4m-6 6-2 2a3 3 0 0 1-4-4l5-5a3 3 0 0 1 4 0m2 1 2-2a3 3 0 0 1 4 4l-5 5a3 3 0 0 1-4 0"/>',clock:'<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',check:'<path d="m5 12 4 4L19 6"/>',arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>'};
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
  return true;
}
function shell(content,section='orders') {
  const workshopName=demoMode?'Pixel Lab':workshop.name;
  const nav = `<a class="nav-link ${section==='orders'?'active':''}" href="#/orders">${icon('grid')} Reparaciones <span class="nav-count">${orders.filter(o=>o.status!=='delivered').length}</span></a><a class="nav-link ${section==='intake'?'active':''}" href="#/intake">${icon('plus')} Recibir equipo</a><a class="nav-link" href="${demoMode?'#/track/1042':'#/orders'}">${icon('link')} ${demoMode?'Vista del cliente':'Mis órdenes'}</a>`;
  root.innerHTML=`<div class="shell"><aside class="sidebar">${brand}<div class="caption">TU TALLER, EN ORDEN</div><div class="nav-label">ESPACIO DE TRABAJO</div>${nav}<div class="sidebar-bottom"><div class="sidebar-note"><b>Menos llamadas.<br>Más tiempo para reparar.</b><br>Comparte el seguimiento de cada equipo con tu cliente.</div><div class="profile"><span class="avatar">PL</span><div>${e(workshopName)}<small>${demoMode?'Taller de demostración':'Taller conectado'}</small></div></div></div></aside><div class="workspace"><header class="topbar"><div class="breadcrumb">Espacio de trabajo <b>/ &nbsp; ${e(workshopName)}</b></div><div class="topbar-right"><span class="connection"><i class="online-dot"></i>${demoMode?'Datos en este navegador':'Supabase conectado'}</span><span class="demo-pill">${demoMode?'DEMO INTERACTIVA':'MI TALLER'}</span><button id="sign-out" class="small">${demoMode?'Salir de demo':'Cerrar sesión'}</button><span class="avatar">PL</span></div></header><main class="page" id="main" tabindex="-1">${content}<footer class="footer"><span>GarantiaTrack · Hecho para quienes reparan.</span><span>${demoMode?'Demo · Solo datos ficticios':'GarantiaTrack · Acceso autenticado'}</span></footer></main></div><nav class="mobile-nav" aria-label="Navegación principal"><a href="#/orders" class="${section==='orders'?'active':''}">${icon('grid')}Órdenes</a><a href="#/intake" class="${section==='intake'?'active':''}">${icon('plus')}Recepción</a><a href="${demoMode?'#/track/1042':'#/orders'}">${icon('link')}${demoMode?'Seguimiento':'Taller'}</a></nav></div>`;
  document.querySelector('#sign-out').onclick=signOut;
}
function dashboard() {
  const open=orders.filter(o=>o.status!=='delivered');
  shell(`<div class="eyebrow">EL MOSTRADOR, BAJO CONTROL</div><div class="heading-row"><div><h1>Tu taller, en orden.</h1><p class="subtitle">Cada equipo tiene una historia. Aquí no se pierde ninguna.</p></div><a class="primary" style="padding:13px 18px;border-radius:9px;font-size:12px;display:flex;align-items:center;justify-content:center;gap:9px" href="#/intake">${icon('plus')} Recibir equipo</a></div><div class="stats"><article class="stat"><div class="stat-label">Órdenes activas ${icon('grid')}</div><div class="stat-value">${String(open.length).padStart(2,'0')}</div><small>Equipos bajo tu cuidado</small></article><article class="stat"><div class="stat-label">En reparación ${icon('controller')}</div><div class="stat-value">${String(open.filter(o=>o.status==='repairing').length).padStart(2,'0')}</div><small>Manos a la obra</small></article><article class="stat"><div class="stat-label">Por aprobar ${icon('clock')}</div><div class="stat-value">${String(open.filter(o=>o.status==='awaiting_approval').length).padStart(2,'0')}</div><small>Presupuesto pendiente</small></article><article class="stat highlight"><div class="stat-label">Listos para recoger ${icon('check')}</div><div class="stat-value">${String(open.filter(o=>o.status==='ready').length).padStart(2,'0')}</div><small>Una buena noticia para tu cliente</small></article></div><div class="toolbar"><div class="tabs" role="group" aria-label="Filtrar órdenes">${[['all','Todas'],['active','En taller'],['awaiting_approval','Por aprobar'],['ready','Listas'],['delivered','Entregadas']].map(([key,label])=>`<button class="tab ${activeFilter===key?'active':''}" aria-pressed="${activeFilter===key}" data-filter="${key}">${label}</button>`).join('')}</div><label class="search"><span>⌕</span><input id="search" type="search" aria-label="Buscar órdenes" placeholder="Buscar equipo, cliente u orden…" value="${e(search)}"></label></div><section class="panel"><div class="panel-head"><div><h2>Reparaciones</h2><p>De la recepción a la entrega, todo en un solo lugar.</p></div><button class="quiet small" id="export">Exportar CSV ↓</button></div><div id="order-results"></div></section><div class="bottom-grid"><article class="callout"><div class="device-art">${icon('link')}</div><div><h3>Tu cliente también está al tanto.</h3><p>Así se ve el seguimiento de una reparación.</p></div><a class="row-link" href="#/track/1042">Ver ejemplo ${icon('arrow')}</a></article><article class="demo-note"><h3>Un espacio para probar</h3><p>Crea una recepción, cambia un estado y visita el seguimiento. No ingreses datos reales.</p><button class="quiet small" id="reset">Restablecer datos de ejemplo ↺</button></article></div>`);
  renderRows();
  document.querySelector('#search').addEventListener('input',event=>{search=event.target.value;renderRows();});
  document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{activeFilter=button.dataset.filter;dashboard();}));
  if(!demoMode) document.querySelector('.bottom-grid').innerHTML='<article class="callout"><div><h3>Tu taller está conectado.</h3><p>Las órdenes se guardan en PostgreSQL y las fotos en almacenamiento privado. Crea el enlace de seguimiento desde cada orden.</p></div></article><article class="demo-note"><h3>Seguimiento seguro</h3><p>Los enlaces tienen caducidad, se pueden revocar y no muestran notas internas ni fotografías.</p></article>';
  else document.querySelector('#reset').onclick=()=>showReset();
  document.querySelector('#export').onclick=()=>exportOrders();
}
function renderRows() {
  const query=search.toLocaleLowerCase('es');
  const found=orders.filter(o=>(activeFilter==='all'||(activeFilter==='active'?o.status!=='delivered':o.status===activeFilter))&&`${o.number} ${o.model} ${o.customer} ${o.phone} ${o.serial}`.toLocaleLowerCase('es').includes(query)).sort((a,b)=>b.number-a.number);
  document.querySelector('#order-results').innerHTML=found.length ? `<div class="table-wrap"><table><thead><tr><th>Equipo / Orden</th><th>Cliente</th><th>Estado</th><th>Presupuesto</th><th></th></tr></thead><tbody>${found.map(o=>`<tr><td><div class="device-cell"><div class="device-art">${icon(o.device)}</div><div><strong>${e(o.model)}</strong><span class="order-number">GT-${o.number}</span> <small>· ${o.device==='console'?'Consola':'Mando'}</small></div></div></td><td><strong>${e(o.customer)}</strong><small>${e(o.phone)}</small></td><td>${badge(o.status)}</td><td>${o.quote?money(o.quote):'<small>Por definir</small>'}</td><td><a class="row-link" href="#/orders/${o.number}" aria-label="Ver orden GT-${o.number}">Ver orden →</a></td></tr>`).join('')}</tbody></table></div><div class="panel-foot">${found.length} ${found.length===1?'orden':'órdenes'} · ${demoMode?'Los cambios se guardan solo en este navegador':'Hasta 500 órdenes recientes · Datos del taller'}</div>` : '<div class="empty"><h3>No encontramos órdenes</h3><p>Prueba otro término o cambia el filtro.</p></div>';
}
function intake() {
  let photos=[];
  const requestId=crypto.randomUUID(), photoIds=new Map();
  shell(`<a class="back" href="#/orders">← Volver a reparaciones</a><div class="eyebrow">NUEVA RECEPCIÓN</div><div class="heading-row"><div><h1>Un equipo en buenas manos.</h1><p class="subtitle">Deja constancia de cómo llega. El resto empieza aquí.</p></div><span class="badge">Borrador sin guardar</span></div><div class="form-layout"><form id="intake-form" class="panel"><section class="section"><div class="section-title"><span class="step-number">01</span><h2>¿Quién lo trae?</h2></div><div class="field-grid"><label class="field">Nombre del cliente *<input name="customer" autocomplete="off" maxlength="80" required placeholder="Ej. Alex de Prueba"></label><label class="field">Celular de contacto *<input name="phone" type="tel" inputmode="numeric" maxlength="9" pattern="9[0-9]{8}" required placeholder="900000006"><span class="hint">Usa un número ficticio de 9 dígitos.</span></label></div></section><section class="section"><div class="section-title"><span class="step-number">02</span><h2>Conozcamos el equipo</h2></div><div class="field-grid"><div class="field full">Tipo de equipo<div class="choices"><label class="choice"><input type="radio" name="device" value="console" checked>${icon('console')} Consola</label><label class="choice"><input type="radio" name="device" value="controller">${icon('controller')} Mando</label></div></div><label class="field">Modelo *<input name="model" maxlength="100" required placeholder="Ej. PlayStation 5 · Digital" list="models"><datalist id="models"><option value="PlayStation 5 · Digital"><option value="PlayStation 4 · Slim"><option value="Nintendo Switch · OLED"><option value="Xbox Series S"><option value="DualSense · Blanco"><option value="Xbox Wireless · Carbon Black"></datalist></label><label class="field">Número de serie <span class="hint">Opcional</span><input name="serial" maxlength="80" placeholder="Ej. DEMO-PS5-046"></label><label class="field full">Falla reportada por el cliente *<textarea name="issue" maxlength="1500" required placeholder="¿Qué está pasando y desde cuándo?"></textarea></label></div></section><section class="section"><div class="section-title"><span class="step-number">03</span><h2>Así lo recibimos</h2></div><div class="field-grid"><div class="field full">Accesorios recibidos<div class="choices">${['Cable de poder','Cable HDMI','Cable USB','Base','Estuche'].map(label=>`<label class="choice"><input type="checkbox" name="accessories" value="${label}">${label}</label>`).join('')}</div></div><label class="field full">Estado físico<textarea name="condition" maxlength="1500" placeholder="Rayones, golpes, sellos o piezas faltantes…"></textarea></label><div class="field full"><label class="upload">${icon('plus')}<br>Fotos del estado de ingreso<input id="photo-input" type="file" accept="image/jpeg,image/png,image/webp" multiple aria-label="Añadir fotos del equipo"></label><span class="hint">Hasta 5 fotos JPG, PNG o WebP de 10 MB. Se reducen antes de guardarse localmente.</span><div id="photo-preview" class="photo-grid"></div></div></div></section><div class="section"><p class="error" id="form-error" role="alert"></p><p class="hint">* Campos obligatorios. Este prototipo es de prueba: no ingreses información personal ni fotos sensibles.</p></div><div class="form-actions"><a class="quiet" href="#/orders">Cancelar</a><button class="primary" type="submit">Crear orden de recepción →</button></div></form><aside><div class="aside-card"><div class="eyebrow">UNA BUENA RECEPCIÓN</div><h2 style="margin-top:12px">Los detalles importan.</h2><p>Un registro claro evita dudas al entregar el equipo.</p><ul class="check-list"><li>Confirma el modelo y la serie</li><li>Revisa los accesorios juntos</li><li>Documenta marcas y golpes</li><li>Comparte el seguimiento</li></ul><p>Al guardar se asignará el número de orden y podrás abrir la vista del cliente.</p></div></aside></div>`,'intake');
  const form=document.querySelector('#intake-form');
  const intakeUser=session?.user?.id, intakeWorkshop=workshop?.id, intakeDemo=demoMode;
  const isCurrent=()=>form.isConnected && demoMode===intakeDemo && (intakeDemo || (session?.user?.id===intakeUser && workshop?.id===intakeWorkshop));
  if(!demoMode){
    form.querySelector('[name=phone]').nextElementSibling.textContent='Número de contacto del cliente.';
    form.querySelector('.upload').parentElement.querySelector('.hint').textContent='Hasta 5 fotos. Se comprimen y se guardan en un bucket privado.';
    const hints=form.querySelectorAll('.section .hint');
    hints[hints.length-1].textContent='* Campos obligatorios. Las fotografías solo están disponibles para miembros del taller.';
  }
  document.querySelector('#photo-input').onchange=async event=>{
    const input=event.target, button=form.querySelector('[type=submit]'); button.disabled=true;input.disabled=true;
    try { const files=[...input.files]; if(files.length+photos.length>5) throw new Error('Puedes adjuntar un máximo de 5 fotos.'); const converted=[]; for(const file of files) converted.push(await compressPhoto(file)); if(!isCurrent())return;photos.push(...converted); form.querySelector('#photo-preview').innerHTML=photos.map((src,index)=>`<figure style="margin:0"><img src="${src}" alt="Foto de ingreso ${index+1}"><button type="button" class="quiet small" data-remove-photo="${index}" aria-label="Quitar foto ${index+1}">Quitar</button></figure>`).join(''); form.querySelector('#form-error').textContent=''; }
    catch(error){if(isCurrent())form.querySelector('#form-error').textContent=error.message;}
    finally{input.value='';button.disabled=false;input.disabled=false;}
  };
  form.addEventListener('click',event=>{const button=event.target.closest('[data-remove-photo]');if(button){photos.splice(Number(button.dataset.removePhoto),1);button.parentElement.remove();form.querySelectorAll('[data-remove-photo]').forEach((b,i)=>b.dataset.removePhoto=i);}});
  form.onsubmit=async event=>{
    event.preventDefault(); const button=form.querySelector('[type=submit]');button.disabled=true; const data=new FormData(form), values=Object.fromEntries(data.entries());
    try {validateIntake(values); const now=new Date().toISOString(); const order={number:nextOrderNumber(orders),customer:values.customer.trim(),phone:values.phone,device:values.device,model:values.model.trim(),serial:values.serial.trim(),issue:values.issue.trim(),condition:values.condition.trim(),accessories:data.getAll('accessories'),status:'received',quote:0,notes:'',message:'Recibimos tu equipo. Pronto iniciaremos la revisión.',created:now,photos:[...photos],events:[{status:'received',at:now}]}; if(!demoMode){
      const items=photos.map(src=>{if(!photoIds.has(src))photoIds.set(src,crypto.randomUUID());return {src,id:photoIds.get(src)};});
      const saved=await backend.receive(intakeWorkshop,requestId,order,items);
      if(!isCurrent())return;
      const loaded=await backend.load(intakeWorkshop);
      if(!isCurrent())return;
      orders=loaded;location.hash='/orders/'+saved.number;notify('Orden guardada en el taller.');
    }else if(persist([...orders,order])){location.hash=`/orders/${order.number}`;notify(`Orden GT-${order.number} creada. Ya puedes compartir su seguimiento.`);} }
    catch(error){if(isCurrent())form.querySelector('#form-error').textContent=friendly(error);}
    finally{button.disabled=false;}
  };
}
async function compressPhoto(file) {
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024) throw new Error('Usa fotos JPG, PNG o WebP de hasta 10 MB.');
  const bitmap=await createImageBitmap(file); const ratio=Math.min(1,1000/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*ratio);canvas.height=Math.round(bitmap.height*ratio);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();return canvas.toDataURL('image/jpeg',.7);
}
function detail(number) {
  const order=orders.find(o=>o.number===number); if(!order) return notFound();
  shell(`<a class="back" href="#/orders">← Todas las reparaciones</a><div class="eyebrow">EXPEDIENTE DE REPARACIÓN</div><div class="heading-row"><div><h1>GT-${order.number} <span style="color:#a4af9b;font-weight:400">/</span> ${e(order.model)}</h1><p class="subtitle">Recibido el ${date(order.created)}</p></div>${badge(order.status)}</div><div class="detail-layout"><div><section class="panel"><div class="panel-head"><div><h2>Recepción del equipo</h2><p>Lo que recibimos, tal como quedó registrado.</p></div><div class="device-art">${icon(order.device)}</div></div><div class="section"><dl class="detail-grid"><div><dt>Cliente</dt><dd>${e(order.customer)}</dd></div><div><dt>Celular</dt><dd>${e(order.phone)}</dd></div><div><dt>Serie</dt><dd>${e(order.serial||'Sin registrar')}</dd></div><div><dt>Accesorios</dt><dd>${order.accessories.map(e).join(', ')||'Sin accesorios'}</dd></div><div class="full"><dt>Falla reportada</dt><dd>${e(order.issue)}</dd></div><div class="full"><dt>Estado físico</dt><dd>${e(order.condition||'Sin observaciones')}</dd></div></dl>${order.photos.length?`<div class="photo-grid">${order.photos.map((src,i)=>`<img src="${safePhoto(src)}" alt="Evidencia de ingreso ${i+1}">`).join('')}</div>`:'<p class="hint">Esta orden de ejemplo no tiene fotos. Puedes añadirlas al crear una recepción.</p>'}</div></section><form class="panel" id="update-form" style="margin-top:20px"><div class="panel-head"><div><h2>Actualiza la reparación</h2><p>El cliente verá el estado y el mensaje público.</p></div></div><div class="section"><div class="field-grid"><label class="field">Estado<select name="status">${statuses.map(([key,label])=>`<option value="${key}" ${order.status===key?'selected':''}>${label}</option>`).join('')}</select></label><label class="field">Presupuesto (S/)<input name="quote" type="number" min="0" max="999999.99" step="0.01" required value="${(order.quote/100).toFixed(2)}"></label><label class="field full">Notas internas<textarea name="notes" maxlength="2000">${e(order.notes)}</textarea><span class="hint">Solo aparecen en el panel del taller.</span></label><label class="field full">Mensaje para el cliente<textarea name="message" maxlength="600" required>${e(order.message)}</textarea><span class="hint">Visible en el seguimiento. No incluyas información sensible.</span></label></div><p class="error" id="update-error" role="alert"></p></div><div class="form-actions"><span class="hint">Cambios de demostración</span><button class="primary" type="submit">Guardar cambios</button></div></form></div><aside><section class="panel"><div class="section"><div class="eyebrow">ENLACE DE SEGUIMIENTO</div><h2 style="margin-top:12px">Sin llamadas de más.</h2><p class="subtitle">Tu cliente consulta el estado desde su navegador.</p><div class="actions-stack" style="margin-top:20px"><a class="primary" style="padding:13px;text-align:center;border-radius:8px;font-size:12px" href="#/track/${order.number}">Abrir vista del cliente ↗</a><button id="copy-link">Copiar enlace de demo</button><button id="print-order" class="secondary">Imprimir recepción</button></div><p class="hint">El enlace solo funciona con los datos de este navegador. No es un seguimiento compartido real.</p></div></section><section class="panel" style="margin-top:20px"><div class="section"><h2>Historial del equipo</h2><ol class="timeline">${order.events.map(event=>`<li>${statusLabel(event.status)}<small>${date(event.at)}</small></li>`).join('')}</ol></div></section></aside></div>`);
  document.querySelector('#print-order').textContent='Ticket de recepción · QR';
  document.querySelector('#print-order').onclick=()=>{location.hash=`/ticket/${number}`;};
  if(!demoMode) enhanceDetail(order);
  else document.querySelector('#copy-link').onclick=async()=>{try{await navigator.clipboard.writeText(`${location.href.split('#')[0]}#/track/${number}`);notify('Enlace copiado. Solo contiene datos en este navegador.');}catch{notify('No se pudo copiar. Abre la vista del cliente y copia la dirección.');}};
  const detailForm=document.querySelector('#update-form'), detailUser=session?.user?.id, detailWorkshop=workshop?.id, detailDemo=demoMode;
  const isCurrent=()=>detailForm.isConnected && demoMode===detailDemo && (detailDemo || (session?.user?.id===detailUser && workshop?.id===detailWorkshop));
  detailForm.onsubmit=async event=>{event.preventDefault();const saveButton=event.target.querySelector('[type=submit]');saveButton.disabled=true;const data=new FormData(event.target);try{const status=data.get('status');if(!statuses.some(([key])=>key===status))throw new Error('Selecciona un estado válido.');const changes={status,quote:parseAmount(data.get('quote')),notes:data.get('notes').trim(),message:data.get('message').trim(),events:status!==order.status?[...order.events,{status,at:new Date().toISOString()}]:order.events};if(!changes.message)throw new Error('Escribe un mensaje para el cliente.');if(await updateOrder(order,changes,isCurrent)){detail(number);notify('Cambios guardados. El seguimiento ya está actualizado.');}}catch(error){if(isCurrent())detailForm.querySelector('#update-error').textContent=friendly(error);}finally{saveButton.disabled=false;}};
}
function safePhoto(value){return /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value)?value:'';}
function tracking(number,remote=null) {
  const raw=remote||orders.find(o=>o.number===number); if(!raw)return notFound(true);
  const order=remote||publicOrder(raw),current=statuses.findIndex(([key])=>key===order.status);
  root.innerHTML=`<div class="tracker-body"><header class="tracker-top">${brand}<a class="small" style="border:1px solid #577666;border-radius:7px" href="#/orders/${order.number}">← Volver al taller de demo</a></header><main class="tracker-main" id="main" tabindex="-1"><div class="tracker-intro"><span class="demo-pill">VISTA DEL CLIENTE · DEMO</span><h1>Tu equipo, más cerca de volver.</h1><p>Seguimiento de reparación · ${e(remote?.workshop||'Pixel Lab')}</p></div><section class="panel"><div class="tracker-hero"><div class="device-art">${icon(order.device)}</div><span class="eyebrow">ORDEN GT-${order.number}</span><h2>${e(order.model)}</h2>${badge(order.status)}<p>Última actualización: ${date(order.events.at(-1).at)}</p></div><section class="section"><h3>Un mensaje de tu taller</h3><p class="tracker-message">${e(order.message)}</p></section><section class="section"><h3>Así va tu reparación</h3><ol class="timeline">${statuses.map(([key,label],index)=>{const event=order.events.findLast(event=>event.status===key);return `<li style="${index>current?'opacity:.45':''}">${label}${index===current?' <b>· Ahora</b>':''}<small>${event?date(event.at):index>current?'Pendiente':'Etapa no registrada'}</small></li>`;}).join('')}</ol></section><section class="section"><h3>¿Tienes alguna consulta?</h3><p class="subtitle">Menciona tu orden GT-${order.number} al hablar con el taller.</p><p class="hint">Pixel Lab · Taller ficticio<br>Lunes a sábado, 10:00–19:00<br>No se envían mensajes ni notificaciones desde esta demo.</p></section></section><p class="tracker-foot">Este prototipo usa datos ficticios guardados en tu navegador.<br>En producción, cada orden tendrá un enlace privado y revocable.<br><b>GarantiaTrack</b> · Tu taller, en orden.</p></main></div>`;
}
function notFound(client=false){if(client){root.innerHTML='<main class="tracker-main" id="main"><h1>Orden no disponible</h1><p>El enlace no existe en este navegador o los datos fueron restablecidos.</p><a class="row-link" href="#/orders">Volver al taller de demo →</a></main>';}else shell('<div class="empty"><h1>No encontramos esta página</h1><p>La orden puede haber sido restablecida.</p><a href="#/orders" class="row-link">Volver a reparaciones →</a></div>');}
function showReset(){const dialog=document.createElement('dialog');dialog.innerHTML='<h2>¿Restablecer la demo?</h2><p>Se eliminarán las órdenes y fotos creadas en este navegador y volverán los cinco ejemplos iniciales.</p><div class="dialog-actions"><button id="cancel-reset">Cancelar</button><button class="primary" id="confirm-reset">Restablecer</button></div>';document.body.append(dialog);dialog.showModal();dialog.querySelector('#cancel-reset').onclick=()=>dialog.close();dialog.querySelector('#confirm-reset').onclick=()=>{if(persist(seedOrders())){dialog.close();dashboard();notify('Datos ficticios restablecidos.');}};dialog.addEventListener('close',()=>dialog.remove());}
function exportOrders(){const cell=value=>`"${String(value??'').replace(/^[=+@\-\t\r]/,'\'$&').replaceAll('"','""')}"`;const rows=[['order_number','customer','phone','model','status','quote_pen','created_at'],...orders.map(o=>[`GT-${o.number}`,o.customer,o.phone,o.model,o.status,(o.quote/100).toFixed(2),o.created])];const url=URL.createObjectURL(new Blob(['\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='garantiatrack-demo-orders.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Exportación de demostración descargada.');}
function ticket(number){
  const order=orders.find(item=>item.number===number);if(!order)return notFound();
  const userId=session?.user?.id,workshopId=workshop?.id,ticketDemo=demoMode,version=renderVersion;
  showReceipt({root,order,workshopName:demoMode?'Pixel Lab':workshop.name,demo:demoMode,links:receiptLinks,backend,applicationUrl:config.publicAppUrl?`${config.publicAppUrl}/`:`${location.origin}${location.pathname}`,isCurrent:()=>renderVersion===version && demoMode===ticketDemo && (ticketDemo || (session?.user?.id===userId && workshop?.id===workshopId))});
}
function renderScreen(){const route=location.hash.slice(1)||'/orders';if(route==='/orders')dashboard();else if(route==='/intake')intake();else if(/^\/orders\/\d+$/.test(route))detail(Number(route.split('/').at(-1)));else if(/^\/ticket\/\d+$/.test(route))ticket(Number(route.split('/').at(-1)));else if(/^\/track\/\d+$/.test(route))tracking(Number(route.split('/').at(-1)));else notFound();window.scrollTo(0,0);}
window.addEventListener('hashchange',()=>render());
document.querySelector('.skip-link').addEventListener('click',event=>{event.preventDefault();document.querySelector('#main')?.focus();});
window.addEventListener('storage',event=>{if(event.key===storageKey){notify('Los datos cambiaron en otra pestaña. Recarga antes de editar.');}});
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
        receiptLinks.clear();
        orders=[];workshop=null;renderVersion++;
        setTimeout(()=>{if(!demoMode)render();},0);
      }
    });
  })().catch(error=>{connectionPromise=null;throw error;});
  return connectionPromise;
}
async function signOut(){
  if(!demoMode){const {error}=await backend.client.auth.signOut({scope:'local'});if(error){notify(friendly(error));return;}}
  receiptLinks.clear();
  sessionStorage.removeItem('garantiatrack.mode');demoMode=false;session=null;workshop=null;orders=[];recovery=false;
  clearTimeout(toastTimer);document.querySelector('#toast').textContent='';document.querySelector('#toast').classList.remove('visible');
  location.hash='/orders';render();
}
function accessScreen(mode='login'){
  const titles={login:'Bienvenido a tu taller.',register:'Crea tu acceso.',reset:'Recupera tu acceso.',recovery:'Elige una nueva contraseña.'};
  root.innerHTML=`<div class="tracker-body"><header class="tracker-top">${brand}<span class="demo-pill">ACCESO AL TALLER</span></header><main class="tracker-main" id="main" tabindex="-1"><div class="tracker-intro"><div class="eyebrow">TU TALLER, EN ORDEN</div><h1>${titles[mode]}</h1><p>El mismo mostrador. Ahora con tus datos protegidos.</p></div><section class="panel"><div class="section">${configured?`<form id="auth-form" class="actions-stack">${mode!=='recovery'?'<label class="field">Correo electrónico<input name="email" type="email" autocomplete="email" required maxlength="254"></label>':''}${mode!=='reset'?`<label class="field">Contraseña<input name="password" type="password" autocomplete="${mode==='login'?'current-password':'new-password'}" required minlength="${mode==='login'?1:12}" maxlength="128"></label>`:''}<p id="auth-error" class="error" role="alert"></p><p id="auth-info" class="hint" role="status"></p><button type="submit" class="primary">${{login:'Entrar al taller',register:'Crear cuenta',reset:'Enviar enlace de recuperación',recovery:'Guardar contraseña'}[mode]}</button></form><div class="auth-links"><button class="quiet small" data-auth="login">Iniciar sesión</button><button class="quiet small" data-auth="register">Crear cuenta</button><button class="quiet small" data-auth="reset">Olvidé mi contraseña</button></div>`:'<h2>Conectemos tu Supabase</h2><p class="subtitle">Falta configurar la URL del proyecto y su clave pública. Consulta docs/supabase-setup.md y reinicia el servidor después de completar .env.</p><p class="hint">El acceso a datos reales permanece cerrado hasta configurar el servicio.</p>'}<hr style="border:0;border-top:1px solid var(--line);margin:24px 0"><button id="enter-demo" class="secondary" style="width:100%">Explorar con datos ficticios</button><p class="hint">La demo es independiente. No importa datos ni simula una sesión autenticada.</p></div></section></main></div>`;
  document.querySelector('#enter-demo').onclick=()=>{receiptLinks.clear();sessionStorage.setItem('garantiatrack.mode','demo');demoMode=true;loadDemo();location.hash='/orders';render();};
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
        const {data,error}=await backend.client.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}});if(error)throw error;
        form.reset();if(data.session){session=data.session;render();}else infoNode.textContent='Si el registro está disponible, recibirás un correo para confirmar tu cuenta. Después podrás iniciar sesión.';
      }else if(mode==='reset'){
        const {error}=await backend.client.auth.resetPasswordForEmail(email,{redirectTo:redirect});if(error)throw error;
        infoNode.textContent='Si existe una cuenta con ese correo, recibirás las instrucciones de recuperación.';
      }else{
        const {error}=await backend.client.auth.updateUser({password});if(error)throw error;recovery=false;history.replaceState(null,'',location.pathname+'#/orders');render();notify('Contraseña actualizada.');
      }
    }catch(error){errorNode.textContent=friendly(error);}finally{button.disabled=false;}
  };
}
function onboarding(){
  root.innerHTML=`<div class="tracker-body"><header class="tracker-top">${brand}<button id="sign-out">Cerrar sesión</button></header><main class="tracker-main" id="main"><div class="tracker-intro"><h1>Dale un nombre a tu taller.</h1><p>Crearás un espacio privado para tus reparaciones.</p></div><form id="workshop-form" class="panel section actions-stack"><label class="field">Nombre del taller<input name="name" required minlength="2" maxlength="80" placeholder="Ej. Pixel Lab"></label><p class="error" id="workshop-error" role="alert"></p><button class="primary">Crear mi taller</button><p class="hint">Si perteneces a un taller existente, solicita al propietario que te incorpore antes de crear otro.</p></form></main></div>`;
  document.querySelector('#sign-out').onclick=signOut;
  document.querySelector('#workshop-form').onsubmit=async event=>{event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;try{await backend.createWorkshop(new FormData(event.target).get('name').trim());render();}catch(error){document.querySelector('#workshop-error').textContent=friendly(error);}finally{button.disabled=false;}};
}
function enhanceDetail(order){
  const actions=document.querySelector('.detail-layout aside .actions-stack'),viewer=actions.querySelector('a');
  const userId=session?.user?.id,workshopId=workshop?.id,generation=receiptLinks.generation();
  const current=()=>actions.isConnected && !demoMode && session?.user?.id===userId && workshop?.id===workshopId && receiptLinks.generation()===generation;
  viewer.hidden=true;
  actions.querySelector('#copy-link').textContent='Recuperar enlace del taller';
  actions.insertAdjacentHTML('beforeend','<input id="tracking-url" readonly aria-label="Enlace privado de seguimiento" hidden><button id="renew-link" class="quiet" hidden>Renovar enlace / QR</button><button id="revoke-link" class="quiet">Revocar enlace anterior</button>');
  actions.parentElement.querySelector('.hint').textContent='El QR se guarda cifrado y se recupera al recargar. Reimprimir o copiar conserva el enlace y su vencimiento. Solo renovar o revocar invalida tickets anteriores.';
  const showLink=url=>{viewer.href=url;viewer.hidden=false;const input=actions.querySelector('#tracking-url');input.value=url;input.hidden=false;actions.querySelector('#copy-link').textContent='Copiar enlace activo';actions.querySelector('#renew-link').hidden=false;};
  const busy=value=>actions.querySelectorAll('button').forEach(button=>{button.disabled=value;});
  const display=document.querySelector('.detail-grid');
  display.insertAdjacentHTML('afterend','<div id="cloud-photos" class="photo-grid" aria-live="polite"></div>');
  const photoContainer=document.querySelector('#cloud-photos');
  backend.photos(order).then(urls=>{if(photoContainer.isConnected)photoContainer.innerHTML=urls.map((src,index)=>`<img src="${e(src)}" alt="Foto privada de ingreso ${index+1}" referrerpolicy="no-referrer">`).join('');}).catch(()=>{if(photoContainer.isConnected)photoContainer.textContent='No se pudieron cargar las fotos. Recarga para reintentar.';});
  const emptyNote=display.parentElement.querySelector('.hint');if(emptyNote)emptyNote.textContent=order.photoRecords.some(photo=>photo.state==='pending')?'Hay fotos pendientes de confirmar. Reintenta desde la recepción original.':order.photoRecords.length?'Fotos privadas · Acceso temporal de 5 minutos':'Sin fotos de ingreso.';
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
  document.querySelector('#update-form .form-actions .hint').textContent='Cambios guardados en tu taller';
}
async function render(){
  const version=++renderVersion,route=location.hash.slice(1)||'/orders';
  if(demoMode && !route.startsWith('/tracking/')){renderScreen();return;}
  if(!configured){accessScreen();return;}
  root.innerHTML='<main class="tracker-main" id="main"><h1>Conectando con tu taller…</h1><p role="status">Comprobando acceso.</p></main>';
  try{
    await initializeConnection();if(version!==renderVersion)return;
    if(/^\/tracking\/[a-f0-9]{64}$/.test(route)){
      const result=await backend.tracking(route.split('/').at(-1));if(version!==renderVersion)return;
      if(!result){notFound(true);return;}
      tracking(result.number,result);
      document.querySelector('.tracker-top a').textContent='Acceso al taller';document.querySelector('.tracker-top a').href='#/orders';
      document.querySelector('.tracker-intro .demo-pill').textContent='SEGUIMIENTO PRIVADO';
      document.querySelector('.tracker-main .hint').textContent='Consulta directamente con tu taller y menciona el número de orden. Este enlace no muestra fotografías ni datos de contacto del cliente.';
      document.querySelector('.tracker-foot').textContent='GarantiaTrack · Enlace privado. No lo compartas con terceros.';
      return;
    }
    if(!session){accessScreen();return;}
    if(recovery){accessScreen('recovery');return;}
    workshop=await backend.workshop();if(version!==renderVersion)return;
    if(!workshop){onboarding();return;}
    const loaded=await backend.load(workshop.id);if(version!==renderVersion)return;orders=loaded;
    if(/^\/track\//.test(route)){notFound(true);return;}
    renderScreen();
  }catch(error){
    if(version!==renderVersion)return;
    orders=[];root.innerHTML=`<main class="tracker-main" id="main"><h1>No pudimos conectar.</h1><p class="error">${e(friendly(error))}</p><button id="retry">Reintentar</button> <button id="exit">${session?'Cerrar sesión':'Volver al acceso'}</button></main>`;
    document.querySelector('#retry').onclick=()=>render();document.querySelector('#exit').onclick=()=>session?signOut():accessScreen();
  }
}
render();
