import test from 'node:test';
import assert from 'node:assert/strict';
import { workspaceIdentity, unavailableOrder } from '../dist/workspace-view.js';

test('Workshop identity escapes untrusted names in content and attributes', () => {
  const output = workspaceIdentity('Workshop "B" <img src=x onerror=alert(1)> & Co');
  assert.ok(output.includes('href="#/workshop"'));
  assert.ok(output.includes('&quot;B&quot; &lt;img'));
  assert.equal(output.includes('<img'), false);
  assert.equal(output.includes('aria-label="Configurar Workshop "B"'), false);
});
test('Unavailable-order guidance is identical for missing and inaccessible orders', () => {
  const output = unavailableOrder();
  assert.ok(output.includes('Orden no disponible'));
  assert.ok(output.includes('taller correcto'));
  assert.equal(output.includes('restablecida'), false);
  assert.equal(output.includes('otro taller'), false);
});
