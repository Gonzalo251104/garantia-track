import {escapeHtml as e} from './domain.js';

export function orderPhotoThumbnail(src,index,{privatePhoto=false}={}) {
  if(typeof src!=='string'||!src)return '';
  const number=Number.isInteger(index)&&index>=0?index+1:1;
  return `<button type="button" class="order-photo-thumbnail" data-order-photo aria-label="Ampliar foto de ingreso ${number}"><img src="${e(src)}" alt="${privatePhoto?'Foto privada':'Evidencia'} de ingreso ${number}" referrerpolicy="no-referrer"><span aria-hidden="true">Ampliar</span></button>`;
}

export function createOrderPhotoViewer({root,isCurrent=()=>true}) {
  let active=null;
  const close=(restoreFocus=true)=>{
    if(!active)return;
    const {dialog,image,trigger}=active;active=null;
    image.onload=null;image.onerror=null;image.removeAttribute('src');
    if(dialog.open)dialog.close();
    dialog.remove();
    if(restoreFocus&&trigger.isConnected&&root.contains(trigger))trigger.focus({preventScroll:true});
  };
  const click=event=>{
    const trigger=event.target.closest?.('[data-order-photo]');
    if(!isCurrent()||!trigger||!root.contains(trigger))return;
    const thumbnail=trigger.querySelector('img'),src=thumbnail?.getAttribute('src');
    if(!src)return;
    event.preventDefault();close(false);
    const dialog=root.ownerDocument.createElement('dialog');
    dialog.className='photo-viewer';dialog.setAttribute('aria-labelledby','order-photo-title');
    dialog.innerHTML='<div class="photo-viewer-toolbar"><h2 id="order-photo-title"></h2><button type="button" class="photo-viewer-close">Cerrar foto</button></div><div class="photo-viewer-stage"><img class="photo-viewer-image" referrerpolicy="no-referrer" hidden></div><p class="photo-viewer-status" role="status">Cargando foto…</p>';
    const image=dialog.querySelector('img'),status=dialog.querySelector('[role=status]'),button=dialog.querySelector('button');
    const label=thumbnail.alt||'Foto de ingreso';
    dialog.querySelector('h2').textContent=label;image.alt=label;
    active={dialog,image,trigger};
    image.onload=()=>{if(active?.dialog===dialog){image.hidden=false;status.textContent='';}};
    image.onerror=()=>{if(active?.dialog===dialog){image.hidden=true;status.textContent='No pudimos abrir la foto. Cierra y vuelve a abrir la orden para cargarla otra vez.';}};
    button.onclick=()=>close();
    dialog.addEventListener('close',()=>{if(active?.dialog===dialog)close();});
    dialog.addEventListener('click',event=>{
      if(event.target!==dialog)return;
      const bounds=dialog.getBoundingClientRect();
      if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)close();
    });
    root.append(dialog);dialog.showModal();button.focus();image.src=src;
  };
  root.addEventListener('click',click);
  return {close:()=>close(),destroy:()=>{close(false);root.removeEventListener('click',click);}};
}
