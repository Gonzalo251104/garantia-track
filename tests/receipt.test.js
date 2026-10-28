import test from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { receiptData, receiptMarkup, trackingReceiptUrl, qrSvg, paperProfiles, receiptPageStyle, createReceiptLinks } from '../dist/receipt.js';

const origin = 'https://garantiatrack-console-workshop.gonzaloacd.chatgpt.site/';
const url = `${origin}#/tracking/${'ab'.repeat(32)}`;
const order = { number: 1043, created: '2026-10-28T18:12:00Z', device: 'controller', model: 'DualSense', customer: 'Fictional QA', serial: 'QA-ONLY', accessories: ['Cable USB'], issue: 'Stick drift', condition: 'QA illustration', phone: 'PRIVATE-CONTACT', notes: 'PRIVATE-NOTE', quote: 9511, photos: ['PRIVATE-PHOTO'], events: ['PRIVATE-HISTORY'] };

test('receipt projection includes intake evidence but excludes internal and financial fields', () => {
  const data = receiptData(order, 'QA Workshop');
  assert.deepEqual(Object.keys(data).sort(), ['number','workshop','created','device','model','customer','serial','accessories','issue','condition'].sort());
  const html = receiptMarkup(data);
  for (const secret of ['PRIVATE-CONTACT','PRIVATE-NOTE','PRIVATE-PHOTO','PRIVATE-HISTORY','9511']) assert.ok(!html.includes(secret));
  assert.ok(html.includes('QA-ONLY')); assert.equal(data.device, 'Mando');
  assert.throws(() => receiptData({ ...order, number: NaN }, 'QA'));
});

test('receipt escapes user fields, preserves long intake text and labels demo without a shared QR', () => {
  const issue = '<script>alert("x")</script>\n' + 'Drift 🎮 '.repeat(300);
  const html = receiptMarkup(receiptData({ ...order, issue, customer: '<img src=x onerror=alert(1)>' }, 'Workshop & Co'), { demo: true });
  assert.ok(!html.includes('<script>')); assert.ok(!html.includes('<img'));
  assert.ok(html.includes('&lt;script&gt;')); assert.ok(html.includes('Workshop &amp; Co'));
  assert.ok(html.includes('Drift 🎮 '.repeat(300))); assert.ok(html.includes('DEMO · SIN VALIDEZ'));
  assert.ok(!html.includes('<svg')); assert.ok(html.includes('no tiene seguimiento compartido'));
});

test('receipt only accepts a token-bearing URL on the configured application base', () => {
  assert.deepEqual(trackingReceiptUrl(url, origin), { url, local: false });
  const local = `http://127.0.0.1:4180/#/tracking/${'a'.repeat(64)}`;
  assert.equal(trackingReceiptUrl(local, 'http://127.0.0.1:4180/').local, true);
  for (const bad of [url.replace('https:', 'http:'), url.replace('gonzaloacd', 'attacker'), url.replace('/#/','/wrong/#/'), url.replace('/#/','/?email=private#/'), url.replace('https://', 'https://user:pass@'), url.replace('ab'.repeat(32), 'a'.repeat(63)), 'javascript:alert(1)', '/tracking/a']) assert.throws(() => trackingReceiptUrl(bad, origin));
});

test('printed SVG QR decodes to the full private fragment URL at 203 DPI for both paper widths', () => {
  const svg = qrSvg(url, QRCode.create);
  assert.ok(svg.includes('shape-rendering="crispEdges"')); assert.ok(!svg.includes(url));
  const size = Number(svg.match(/viewBox="0 0 (\d+)/)[1]);
  const modules = [...svg.matchAll(/M(\d+) (\d+)h1v1h-1z/g)].map(match => [Number(match[1]), Number(match[2])]);
  assert.ok(modules.every(([x,y]) => x >= 4 && y >= 4 && x < size - 4 && y < size - 4));
  for (const profile of Object.values(paperProfiles)) {
    const pixels = Math.round(profile.qr / 25.4 * 203);
    const rgba = new Uint8ClampedArray(pixels * pixels * 4).fill(255);
    for (const [x,y] of modules) for (let py = Math.floor(y * pixels / size); py < Math.floor((y + 1) * pixels / size); py++) for (let px = Math.floor(x * pixels / size); px < Math.floor((x + 1) * pixels / size); px++) {
      const index = (py * pixels + px) * 4; rgba[index] = 0; rgba[index + 1] = 0; rgba[index + 2] = 0;
    }
    assert.equal(jsQR(rgba, pixels, pixels)?.data, url, `Readable on ${profile.width} mm paper`);
  }
});

test('thermal page dimensions are explicit lengths and safely handle long receipts', () => {
  assert.match(receiptPageStyle('58', 700), /size: 58mm \d+mm; margin: 5mm/);
  assert.match(receiptPageStyle('80', 1600), /size: 80mm \d+mm; margin: 4mm/);
  assert.ok(!receiptPageStyle('80', 700).includes('auto'));
  for (const paper of ['100', '<style>']) assert.throws(() => receiptPageStyle(paper, 700));
  assert.throws(() => receiptPageStyle('80', Infinity));
});

test('receipt links are isolated per order and cleared with a context generation on sign-out', () => {
  const links = createReceiptLinks(); const initial = links.generation();
  links.set('one', url); assert.equal(links.get('two'), undefined);
  assert.equal(links.get('one'), url); links.remove('one'); assert.equal(links.get('one'), undefined);
  links.set('one', url); links.clear(); assert.equal(links.get('one'), undefined);
  assert.ok(links.generation() > initial);
});
