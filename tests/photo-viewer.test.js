import test from 'node:test';
import assert from 'node:assert/strict';
import {orderPhotoThumbnail,createOrderPhotoViewer} from '../dist/photo-viewer.js';

test('saved-photo thumbnails are labeled non-submit controls and escape image URLs',()=>{
  const markup=orderPhotoThumbnail('https://example.test/photo?token=" onerror="bad',1,{privatePhoto:true});
  assert.ok(markup.includes('type="button"'));assert.ok(markup.includes('aria-label="Ampliar foto de ingreso 2"'));
  assert.ok(markup.includes('Foto privada de ingreso 2'));assert.ok(markup.includes('referrerpolicy="no-referrer"'));
  assert.ok(markup.includes('&quot;'));assert.equal(markup.includes(' onerror="bad'),false);
  assert.equal(orderPhotoThumbnail('',0),'');assert.equal(orderPhotoThumbnail(null,0),'');
  assert.ok(orderPhotoThumbnail('data:image/jpeg;base64,/9j/2Q==',0).includes('Evidencia de ingreso 1'));
});

function viewerFixture() {
  const state={current:true,created:[],focus:null};
  const thumbnail={alt:'Foto privada de ingreso 1',src:'https://example.test/private-photo?token=fictional',getAttribute:()=>thumbnail.src};
  const trigger={isConnected:true,querySelector:()=>thumbnail,focus:()=>{state.focus=trigger;}};
  const listeners=new Map();
  const root={contains:node=>node===trigger&&trigger.isConnected,addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name),append:dialog=>{dialog.isConnected=true;}};
  root.ownerDocument={createElement:tag=>{
    assert.equal(tag,'dialog');
    const events=new Map(),attributes=new Map(),image={hidden:true,removeAttribute:name=>{delete image[name];}},status={textContent:'Cargando foto…'},title={textContent:''};
    const button={focus:()=>{state.focus=button;}};
    const dialog={open:false,isConnected:false,setAttribute:(key,value)=>attributes.set(key,value),attributes,events,image,status,button,title,
      querySelector:selector=>({'img':image,'[role=status]':status,'button':button,'h2':title})[selector],
      addEventListener:(name,fn)=>events.set(name,fn),showModal:()=>{dialog.open=true;},close:()=>{dialog.open=false;events.get('close')?.();},remove:()=>{dialog.isConnected=false;},getBoundingClientRect:()=>({left:10,top:10,right:810,bottom:610})};
    state.created.push(dialog);return dialog;
  }};
  const viewer=createOrderPhotoViewer({root,isCurrent:()=>state.current});
  const click=()=>listeners.get('click')?.({target:{closest:()=>trigger},preventDefault(){}});
  return {state,thumbnail,trigger,root,listeners,viewer,click};
}

test('opening uses the existing thumbnail URL and presents a focused, labeled modal',()=>{
  const f=viewerFixture();f.click();const dialog=f.state.created[0];
  assert.ok(dialog.open);assert.equal(dialog.image.src,f.thumbnail.src);assert.equal(dialog.image.alt,f.thumbnail.alt);
  assert.equal(dialog.title.textContent,f.thumbnail.alt);assert.equal(dialog.attributes.get('aria-labelledby'),'order-photo-title');
  assert.equal(f.state.focus,dialog.button);assert.ok(dialog.innerHTML.includes('referrerpolicy="no-referrer"'));
  assert.equal(f.thumbnail.src,'https://example.test/private-photo?token=fictional');
});

test('image failure stays recoverable without exposing the URL or requesting a new capability',()=>{
  const f=viewerFixture();f.click();const dialog=f.state.created[0];
  dialog.image.onload();assert.equal(dialog.image.hidden,false);assert.equal(dialog.status.textContent,'');
  dialog.image.onerror();assert.equal(dialog.image.hidden,true);assert.match(dialog.status.textContent,/vuelve a abrir la orden/);
  assert.equal(dialog.status.textContent.includes('token='),false);assert.ok(dialog.open);
  assert.equal(dialog.image.src,f.thumbnail.src);
});

test('close button, native close and backdrop release the enlarged source and restore thumbnail focus',()=>{
  for(const method of ['button','native-close','backdrop']){
    const f=viewerFixture();f.click();const dialog=f.state.created[0];
    dialog.events.get('click')({target:dialog,clientX:20,clientY:20});assert.ok(dialog.open);
    if(method==='button')dialog.button.onclick();
    else if(method==='native-close'){dialog.open=false;dialog.events.get('close')();}
    else dialog.events.get('click')({target:dialog,clientX:0,clientY:0});
    assert.equal(dialog.open,false);assert.equal(dialog.isConnected,false);assert.equal(dialog.image.src,undefined);
    assert.equal(dialog.image.onload,null);assert.equal(dialog.image.onerror,null);assert.equal(f.state.focus,f.trigger);
    assert.ok(f.thumbnail.src);
  }
});

test('inactive or detached thumbnails cannot open and late image callbacks cannot alter the next viewer',()=>{
  const f=viewerFixture();f.state.current=false;f.click();assert.equal(f.state.created.length,0);
  f.state.current=true;f.trigger.isConnected=false;f.click();assert.equal(f.state.created.length,0);
  f.trigger.isConnected=true;f.click();const first=f.state.created[0],late=first.image.onload;
  f.viewer.close();f.click();const second=f.state.created[1];late();
  assert.equal(second.image.hidden,true);assert.equal(second.status.textContent,'Cargando foto…');
  assert.equal(first.image.src,undefined);
});

test('explicit context cleanup and disposal remove the modal source and delegated listener',()=>{
  const f=viewerFixture();f.click();const first=f.state.created[0];
  f.viewer.close();assert.equal(first.image.src,undefined);assert.equal(first.isConnected,false);
  f.click();const second=f.state.created[1];f.viewer.destroy();
  assert.equal(second.image.src,undefined);assert.equal(f.listeners.has('click'),false);
  f.click();assert.equal(f.state.created.length,2);
});
