import {escapeHtml as e} from './domain.js';

export function normalizeWorkshopName(value) {
  const name=typeof value==='string'?value.trim():'';
  if([...name].length<2||[...name].length>80||/[\u0000-\u001f\u007f]/.test(value))throw new Error('Escribe un nombre de 2 a 80 caracteres, sin saltos de línea.');
  return name;
}

export function workshopSettingsMarkup(workshop,{canRename=false,demo=false}={}) {
  return `<div class="eyebrow">ESPACIO DE TRABAJO</div><div class="heading-row"><div><h1>Tu taller</h1><p class="subtitle">El nombre que ven tu equipo y tus clientes.</p></div></div>
    <form id="workshop-settings-form" class="panel workshop-settings" aria-labelledby="workshop-name-heading">
      <div class="section"><h2 id="workshop-name-heading">Nombre del taller</h2>
        ${canRename?`<label class="field">Nombre del taller<input id="workshop-name" name="name" required minlength="2" maxlength="80" autocomplete="organization" value="${e(workshop.name)}" aria-describedby="workshop-name-help"></label>`:`<p class="workshop-name">${e(workshop.name)}</p>`}
        <p id="workshop-name-help" class="workshop-help">${demo?'Este es un taller de demostración. Para configurar el tuyo, sal de la demo e inicia sesión.':canRename?'Se actualiza en el panel, el seguimiento y los tickets que prepares a partir del cambio.':'Solo la persona propietaria puede cambiar el nombre del taller.'}</p>
        ${canRename?'<p id="workshop-name-error" class="error" role="alert"></p><p id="workshop-name-result" class="workshop-result" role="status"></p><button class="primary" type="submit">Guardar nombre</button>':''}
      </div>
    </form>`;
}

function renameError(failure,friendly) {
  if(failure?.code==='40001')return 'El nombre cambió en otra sesión. Recarga la página y vuelve a intentarlo.';
  if(failure?.code==='42501')return 'Solo la persona propietaria con acceso al taller puede cambiar el nombre.';
  if(failure?.code==='23514')return 'Escribe un nombre de 2 a 80 caracteres, sin saltos de línea.';
  return friendly(failure);
}

export function mountWorkshopSettings({form,workshop,canRename,save,isCurrent,onSaved,friendly}) {
  if(!canRename)return;
  const input=form.querySelector('[name=name]'),button=form.querySelector('[type=submit]');
  const error=form.querySelector('#workshop-name-error'),result=form.querySelector('#workshop-name-result');
  let saving=false,savedName=workshop.name;
  const updateButton=()=>{button.disabled=saving||input.value.trim()===savedName;};
  updateButton();
  input.addEventListener('input',()=>{error.textContent='';result.textContent='';updateButton();});
  form.onsubmit=async event=>{
    event.preventDefault();if(saving||!isCurrent())return;
    error.textContent='';result.textContent='';
    let name;
    try{name=normalizeWorkshopName(input.value);}catch(failure){error.textContent=failure.message;return;}
    if(name===savedName){result.textContent='Este nombre ya está guardado.';return;}
    const document=form.ownerDocument,restoreFocus=document?.activeElement===button;
    saving=true;input.disabled=true;updateButton();
    try{
      const saved=await save({id:workshop.id,name:savedName},name);
      if(!isCurrent())return;
      if(!saved||saved.id!==workshop.id||saved.name!==name)throw new Error('No pudimos confirmar el nombre guardado. Recarga y revisa el taller.');
      onSaved(saved);savedName=saved.name;input.value=savedName;
      result.textContent='Nombre del taller guardado.';
    }catch(failure){if(isCurrent())error.textContent=renameError(failure,friendly);}
    finally{
      if(isCurrent()){
        saving=false;input.disabled=false;updateButton();
        if(restoreFocus&&document.activeElement===document.body)input.focus();
      }
    }
  };
}
