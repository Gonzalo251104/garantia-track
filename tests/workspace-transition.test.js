import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkspaceTransition} from '../dist/workspace-transition.js';

function fixture() {
  const element=()=>({attributes:new Map(),setAttribute(name,value){this.attributes.set(name,value);},removeAttribute(name){this.attributes.delete(name);},getAttribute(name){return this.attributes.get(name);}});
  const page={...element(),inert:false,draft:'Unsaved fictional intake',disabledSubmit:true};
  const links=['/orders','/intake','/workshop'].map(route=>{const link=element();link.setAttribute('href',`#${route}`);return link;});
  const indicators=[];
  const shell={append:node=>indicators.push(node)};
  const root={
    ownerDocument:{createElement:()=>({...element(),remove(){this.removed=true;}})},
    querySelector:selector=>selector==='.shell .page'?page:shell,
    querySelectorAll:selector=>selector==='[data-navigation-pending]'?links.filter(link=>link.attributes.has('data-navigation-pending')):links
  };
  return {root,page,links,indicators,transition:createWorkspaceTransition(root)};
}

test('pending navigation retains the existing page and draft while preventing old-page interaction',()=>{
  const f=fixture(),page=f.page;
  assert.equal(f.transition.begin('/intake'),true);
  assert.equal(f.root.querySelector('.shell .page'),page);
  assert.equal(page.draft,'Unsaved fictional intake');assert.equal(page.disabledSubmit,true);
  assert.equal(page.inert,true);assert.equal(page.getAttribute('aria-busy'),'true');
  assert.equal(f.indicators[0].textContent,'Abriendo recepción…');assert.equal(f.indicators[0].getAttribute('role'),'status');
  assert.equal(f.links[1].getAttribute('aria-busy'),'true');assert.equal(f.links[0].attributes.has('data-navigation-pending'),false);
});

test('rapid navigation replaces only its indicator and pending destination',()=>{
  const f=fixture();f.transition.begin('/intake');const first=f.indicators[0];
  f.transition.begin('/workshop');
  assert.equal(first.removed,true);assert.equal(f.indicators[1].textContent,'Abriendo taller…');
  assert.equal(f.links[1].attributes.has('data-navigation-pending'),false);
  assert.equal(f.links[2].getAttribute('aria-busy'),'true');assert.equal(f.page.inert,true);
  assert.equal(f.page.draft,'Unsaved fictional intake');
});

test('completion or access invalidation removes pending state without enabling disabled form controls',()=>{
  const f=fixture();f.transition.begin('/orders');f.transition.clear();f.transition.clear();
  assert.equal(f.page.inert,false);assert.equal(f.page.attributes.has('aria-busy'),false);
  assert.equal(f.indicators[0].removed,true);assert.equal(f.page.disabledSubmit,true);
  assert.ok(f.links.every(link=>!link.attributes.has('aria-busy')&&!link.attributes.has('data-navigation-pending')));
});

test('initial entry and external views cannot retain a previous private workspace',()=>{
  const f=fixture();f.root.querySelector=()=>null;
  assert.equal(f.transition.begin('/orders'),false);assert.equal(f.indicators.length,0);
});
