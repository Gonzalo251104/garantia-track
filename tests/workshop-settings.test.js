import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {connect} from '../dist/backend.js';
import {normalizeWorkshopName,workshopSettingsMarkup,mountWorkshopSettings} from '../dist/workshop-settings.js';
import {startPhotoRetryFixture} from '../scripts/fixtures/photo-retry-server.mjs';

test('workshop names are trimmed and validated; names are escaped in editable and read-only views',()=>{
  assert.equal(normalizeWorkshopName('  Taller Ñ  '),'Taller Ñ');
  for(const value of ['',null,' ','X','x'.repeat(81),'New\nName'])assert.throws(()=>normalizeWorkshopName(value));
  assert.equal(normalizeWorkshopName('á'.repeat(80)).length,80);
  const workshop={name:'Taller "QA" <img src=x onerror=alert(1)>'};
  for(const canRename of [false,true]){
    const html=workshopSettingsMarkup(workshop,{canRename});
    assert.equal(html.includes('<img'),false);assert.ok(html.includes('&lt;img'));assert.ok(html.includes('&quot;QA&quot;'));
    assert.equal(html.includes('Guardar nombre'),canRename);
  }
  assert.ok(workshopSettingsMarkup(workshop).includes('Solo el propietario puede cambiar el nombre.'));
  assert.ok(workshopSettingsMarkup(workshop,{demo:true}).includes('demostración'));
});

function editor({canRename=true,name='Original Workshop',value='Renamed Workshop',focus,save=async(target,newName)=>({...target,name:newName})}={}){
  const state={current:true,saved:[],calls:[]};
  const input={value,disabled:false,addEventListener(_event,callback){this.oninput=callback;}};
  const nodes={'[name=name]':input,'[type=submit]':{disabled:false},'#workshop-name-error':{textContent:''},'#workshop-name-result':{textContent:''}};
  const document={body:{}};document.activeElement=focus==='input'?input:focus==='button'?nodes['[type=submit]']:document.body;
  for(const node of [input,nodes['[type=submit]']]){
    let disabled=node.disabled;
    Object.defineProperty(node,'disabled',{get:()=>disabled,set:value=>{disabled=value;if(value&&document.activeElement===node)document.activeElement=document.body;}});
  }
  input.focus=()=>{document.activeElement=input;};
  const form={ownerDocument:document,querySelector:selector=>nodes[selector]};
  const workshop={id:'workshop-A',name,owner_id:'owner-A'};
  mountWorkshopSettings({form,workshop,canRename,isCurrent:()=>state.current,save:async(...args)=>{state.calls.push(args);return save(...args);},onSaved:saved=>state.saved.push(saved),friendly:failure=>failure.message});
  return {form,nodes,input,state,workshop,submit:()=>form.onsubmit?.({preventDefault(){}})};
}

test('save normalizes the name, uses the last confirmed name and reports confirmed success',async()=>{
  const view=editor({value:'  Renamed Workshop  '});
  await view.submit();
  assert.deepEqual(view.state.calls,[[{id:'workshop-A',name:'Original Workshop'},'Renamed Workshop']]);
  assert.equal(view.workshop.name,'Original Workshop');assert.equal(view.input.value,'Renamed Workshop');
  assert.equal(view.nodes['#workshop-name-result'].textContent,'Nombre del taller guardado.');
  view.input.value='Next Workshop';view.input.oninput();await view.submit();
  assert.deepEqual(view.state.calls[1],[{id:'workshop-A',name:'Renamed Workshop'},'Next Workshop']);
});

test('read-only, unchanged, invalid and inactive forms never write',async()=>{
  for(const options of [{canRename:false},{value:' Original Workshop '},{value:'  '},{value:'x'.repeat(81)}]){
    const view=editor(options);await view.submit();assert.equal(view.state.calls.length,0);
  }
  const view=editor();view.state.current=false;await view.submit();assert.equal(view.state.calls.length,0);
});

test('duplicate saves are suppressed and a late result cannot change another view or account',async()=>{
  let finish;const view=editor({save:()=>new Promise(resolve=>{finish=resolve;})});
  const pending=view.submit();await view.submit();assert.equal(view.state.calls.length,1);assert.equal(view.input.disabled,true);
  view.state.current=false;finish({id:'workshop-A',name:'Renamed Workshop'});await pending;
  assert.equal(view.state.saved.length,0);assert.equal(view.nodes['#workshop-name-result'].textContent,'');
});

test('permission, stale-name and provider failures preserve the draft and never report success',async()=>{
  for(const failure of [{code:'42501'},{code:'40001'},new Error('Local provider failure')]){
    const view=editor({save:async()=>{throw failure;}});await view.submit();
    assert.equal(view.input.value,'Renamed Workshop');assert.equal(view.input.disabled,false);assert.equal(view.state.saved.length,0);
    assert.equal(view.nodes['#workshop-name-result'].textContent,'');assert.ok(view.nodes['#workshop-name-error'].textContent);
    if(failure.code==='40001')assert.match(view.nodes['#workshop-name-error'].textContent,/nombre.*otra sesión/);
    if(failure.code==='42501')assert.match(view.nodes['#workshop-name-error'].textContent,/propietaria/);
  }
});

test('a wrong workshop or unconfirmed server name never replaces the active workshop',async()=>{
  for(const result of [null,{id:'workshop-B',name:'Renamed Workshop'},{id:'workshop-A',name:'Different name'}]){
    const view=editor({save:async()=>result});await view.submit();
    assert.equal(view.state.saved.length,0);assert.equal(view.nodes['#workshop-name-result'].textContent,'');assert.ok(view.nodes['#workshop-name-error'].textContent);
  }
});

test('keyboard and button saves restore the name field only when focus has not moved elsewhere',async()=>{
  for(const focus of ['input','button']){
    const view=editor({focus});await view.submit();assert.equal(view.form.ownerDocument.activeElement,view.input);
  }
  let finish;const view=editor({focus:'input',save:()=>new Promise(resolve=>{finish=resolve;})});
  const pending=view.submit(),other={};view.form.ownerDocument.activeElement=other;
  finish({id:'workshop-A',name:'Renamed Workshop'});await pending;assert.equal(view.form.ownerDocument.activeElement,other);
});

test('actual SDK over isolated HTTP saves and reloads the name, with stale/foreign/technician failures',async t=>{
  const fixture=await startPhotoRetryFixture(0,{failures:0});t.after(()=>fixture.close());
  const clientFactory=(url,key)=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const backend=await connect({supabaseUrl:fixture.origin,supabaseKey:'sb_publishable_local_fixture_only'},clientFactory);
  const before=await backend.workshop();assert.ok(before.owner_id);
  const saved=await backend.renameWorkshop(before,'  Fictional Repair Workshop  ');
  assert.equal(saved.name,'Fictional Repair Workshop');assert.equal((await backend.workshop()).name,saved.name);
  assert.deepEqual(await backend.renameWorkshop(before,saved.name),saved);
  await assert.rejects(backend.renameWorkshop(before,'Stale name'),failure=>failure.code==='40001');
  await assert.rejects(backend.renameWorkshop({...saved,id:'foreign'},'Foreign rename'),failure=>failure.code==='42501');
  await assert.rejects(backend.renameWorkshop(saved,'X'),failure=>failure.code==='23514');
  assert.equal(fixture.summary().orders,0);assert.equal(fixture.summary().photos,0);
  const technician=await startPhotoRetryFixture(0,{workshopRole:'technician'});t.after(()=>technician.close());
  const other=await connect({supabaseUrl:technician.origin,supabaseKey:'sb_publishable_local_fixture_only'},clientFactory);
  const readonly=await other.workshop();assert.notEqual(readonly.owner_id,before.owner_id);
  await assert.rejects(other.renameWorkshop(readonly,'Denied name'),failure=>failure.code==='42501');
});
