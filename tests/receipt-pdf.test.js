import test from 'node:test';
import assert from 'node:assert/strict';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { makeReceiptPdf } from '../dist/receipt-pdf.js';

test('receipt PDF is generated locally with a QR and a tracking link', async () => {
  const data = { workshop: 'Taller', number: 1043, created: '28/10/2026', customer: 'Cliente', device: 'Mando', model: 'DualSense', serial: '123', accessories: 'Cable', issue: 'Falla', condition: 'Bien' };
  const url = `https://example.test/#/tracking/${'a'.repeat(64)}`;
  const blob = makeReceiptPdf(data, url, jsPDF, QRCode.create);
  assert.equal(blob.type, 'application/pdf');
  const bytes = Buffer.from(await blob.arrayBuffer());
  assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
  assert.ok(bytes.includes(Buffer.from(url)));
  assert.ok(bytes.length > 4000);
});
