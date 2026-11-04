import {escapeHtml as e} from './domain.js';

export async function recoverPhotoSelection({backend,orderId,photoId,src,existing,isCurrent}) {
  if(!isCurrent())return null;
  if(existing)await backend.retryPhoto(orderId,photoId,src);
  else await backend.upload(orderId,[{id:photoId,src}]);
  if(!isCurrent())return null;
  const records=await backend.photoRecords(orderId);
  if(!isCurrent())return null;
  if(!records.some(photo=>photo.id===photoId && photo.state==='ready'))throw new Error('No pudimos confirmar la foto en esta orden.');
  return records;
}

export function photoRecoveryMarkup(records,newId,selections=new Map(),error='') {
  const pending=records.filter(photo=>photo.state==='pending').sort((a,b)=>(a.slot||0)-(b.slot||0));
  const items=pending.length?pending.map((photo,index)=>({...photo,existing:true,label:`Foto de ingreso ${Number.isInteger(photo.slot)?photo.slot:index+1} pendiente`}))
    :records.length<5?[{id:newId,existing:false,label:'Añadir foto de ingreso'}]:[];
  return `<h3>Completar fotos de ingreso</h3><p class="hint">${pending.length?'Vuelve a seleccionar la foto original de cada pendiente.':'Puedes completar las fotos de esta recepción, hasta un máximo de cinco.'} Las fotos confirmadas y el QR se conservan.</p><p class="error" role="alert">${e(error)}</p><p class="hint" role="status" data-photo-progress></p>${items.map(item=>`<form data-photo-id="${e(item.id)}" data-existing="${item.existing}"><fieldset><legend>${e(item.label)}</legend><label class="field">${item.existing?'Seleccionar foto original':'Seleccionar foto'}<input type="file" accept="image/jpeg,image/png,image/webp" aria-label="${e(item.label)}"></label><p class="hint">JPG, PNG o WebP de hasta 10 MB. Solo visible para el taller.</p>${selections.has(item.id)?`<div class="photo-grid"><img src="${e(selections.get(item.id))}" alt="Vista previa de la foto seleccionada"></div><p class="hint">Imagen preparada. Puedes guardarla o elegir otra.</p>`:''}<button class="secondary" type="submit" ${selections.has(item.id)?'':'disabled'}>${item.existing?'Volver a adjuntar foto':'Guardar foto de ingreso'}</button></fieldset></form>`).join('')}`;
}

export function mountPhotoRecovery({container,order,backend,compressPhoto,isCurrent,onRecords,onSaved}) {
  const selections=new Map();
  let newId=crypto.randomUUID(),busy=false,error='';
  const current=()=>container.isConnected && isCurrent();
  const setBusy=(value,message='')=>{
    busy=value;
    container.setAttribute('aria-busy',String(value));
    container.querySelectorAll('fieldset').forEach(field=>field.disabled=value);
    container.querySelector('[data-photo-progress]').textContent=message;
  };
  const apply=records=>{
    order.photoRecords=records;
    if(records.some(photo=>photo.id===newId))newId=crypto.randomUUID();
    const pendingIds=new Set(records.filter(photo=>photo.state==='pending').map(photo=>photo.id));
    for(const id of selections.keys())if(id!==newId && !pendingIds.has(id))selections.delete(id);
    onRecords(records);
  };
  const render=()=>{
    if(!current())return;
    container.hidden=order.photoRecords.length>=5 && !order.photoRecords.some(photo=>photo.state==='pending') && !error;
    container.innerHTML=photoRecoveryMarkup(order.photoRecords,newId,selections,error);
    for(const form of container.querySelectorAll('form')){
      const id=form.dataset.photoId,existing=form.dataset.existing==='true',input=form.querySelector('input');
      input.onchange=async()=>{
        if(busy || !current() || !input.files[0])return;
        const file=input.files[0];selections.delete(id);error='';setBusy(true,'Preparando imagen…');
        try{const src=await compressPhoto(file);if(current())selections.set(id,src);}
        catch{if(current())error='Usa una imagen JPG, PNG o WebP válida de hasta 10 MB.';}
        finally{if(current()){busy=false;render();}}
      };
      form.onsubmit=async event=>{
        event.preventDefault();
        if(busy || !current() || !selections.has(id))return;
        error='';setBusy(true,'Guardando foto…');
        try{
          const records=await recoverPhotoSelection({backend,orderId:order.id,photoId:id,src:selections.get(id),existing,isCurrent:current});
          if(records && current()){apply(records);onSaved();}
        }catch{
          if(current()){
            error='No pudimos confirmar la foto. Revisa tu conexión o acceso al taller y reintenta.';
            try{
              const records=await backend.photoRecords(order.id);
              if(current()){
                apply(records);
                if(records.some(photo=>photo.id===id && photo.state==='ready')){error='';onSaved();}
                else if(records.length>=5 && !records.some(photo=>photo.state==='pending'))error='La orden ya tiene cinco fotos. Revisa las imágenes guardadas.';
              }
            }catch{/* Keep the selection and stable identifier for a later retry. */}
          }
        }finally{if(current()){busy=false;render();}}
      };
    }
    setBusy(false);
  };
  render();
}
