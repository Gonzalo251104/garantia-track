import { escapeHtml, deviceLabel } from './domain.js';

export const paperProfiles = Object.freeze({
  '80': Object.freeze({ width: 80, content: 72, margin: 4, qr: 44 }),
  '58': Object.freeze({ width: 58, content: 48, margin: 5, qr: 40 })
});

export function whatsappReceiptUrl(data, trackingUrl, applicationUrl) {
  const checked = trackingReceiptUrl(trackingUrl, applicationUrl);
  if (checked.local) throw new Error('El enlace local no se puede compartir.');
  const message = `Hola, tu equipo fue recibido en ${data.workshop}. Ticket GT-${data.number}.\nSigue el estado de tu reparación aquí: ${checked.url}\nEste enlace es privado; compártelo solo con personas de confianza.`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function trackingReceiptUrl(value, applicationUrl) {
  const base = new URL(applicationUrl), url = new URL(value);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) throw new Error('El seguimiento debe usar HTTPS.');
  if (url.origin !== base.origin || url.pathname !== base.pathname || url.username || url.password || url.search || !/^#\/tracking\/[a-f0-9]{64}$/.test(url.hash) || url.href.length > 512) {
    throw new Error('El enlace de seguimiento no pertenece a esta aplicación.');
  }
  return { url: url.href, local };
}

export function receiptData(order, workshopName) {
  if (!Number.isSafeInteger(order.number) || order.number < 1 || !Number.isFinite(new Date(order.created).getTime())) throw new Error('La recepción no tiene datos válidos.');
  // Explicit customer receipt projection: never print internal notes, quotes or photos.
  return {
    number: order.number,
    workshop: workshopName,
    created: new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Lima' }).format(new Date(order.created)),
    device: deviceLabel(order.device),
    model: order.model,
    customer: order.customer,
    serial: order.serial || 'Sin registrar',
    accessories: order.accessories.join(', ') || 'Sin accesorios',
    issue: order.issue,
    condition: order.condition || 'Sin observaciones'
  };
}

export function qrSvg(url, create) {
  const { modules } = create(url, { errorCorrectionLevel: 'Q' });
  const quiet = 4, size = modules.size + quiet * 2;
  const paths = [];
  for (let y = 0; y < modules.size; y++) for (let x = 0; x < modules.size; x++) {
    if (modules.get(y, x)) paths.push(`M${x + quiet} ${y + quiet}h1v1h-1z`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="Código QR de seguimiento" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><path d="${paths.join('')}" fill="#000"/></svg>`;
}

// Keep the approved gear outline inline so printing does not wait for an image request.
const receiptMark = `<svg class="receipt-mark" viewBox="0 0 734 734" aria-hidden="true" focusable="false"><path fill="#000" d="
    M 347 54 Q 349 34 370 34 H 441 Q 461 34 463 54
    L 468 96 Q 469 103 476 105 Q 513 115 544 135 Q 550 138 556 134
    L 595 108 Q 610 98 622 110 L 665 155 Q 678 169 666 183
    L 570 285 Q 568 287 566 284
    A 172 172 0 1 0 544 451 H 389 Q 384 451 384 446 V 363
    Q 384 358 389 358 H 663 Q 669 358 669 364
    Q 676 460 631 533 Q 628 539 632 543 L 656 576 Q 666 590 654 602
    L 605 648 Q 591 659 577 648 L 536 615 Q 531 610 524 613
    Q 494 625 466 632 Q 459 634 458 642 L 451 682 Q 449 700 431 700
    H 362 Q 342 700 340 681 L 336 639 Q 335 631 328 628
    Q 290 617 260 597 Q 255 594 250 598 L 210 624
    Q 195 634 181 622 L 137 574 Q 123 560 135 544
    L 167 509 Q 171 504 167 498 Q 151 468 142 435 Q 140 429 132 428
    L 84 423 Q 63 421 63 400 V 332 Q 63 311 84 309 L 132 304
    Q 139 303 142 296 Q 152 261 170 233 Q 175 227 169 221 L 140 186
    Q 129 172 141 156 L 186 108 Q 199 96 214 105 L 257 134
    Q 262 139 269 134 Q 300 117 333 108 Q 341 106 342 98 Z"/></svg>`;

export function receiptMarkup(data, { qr = '', demo = false, local = false } = {}) {
  const field = (label, value) => `<div class="receipt-field"><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`;
  return `<header class="receipt-heading"><p class="receipt-brand">${escapeHtml(data.workshop)}</p><p class="receipt-kicker">${receiptMark}<span>RECEPCIÓN DE EQUIPO</span></p><h2>GT-${data.number}</h2><p>${escapeHtml(data.created)} · Lima</p>${demo ? '<strong class="receipt-demo">DEMO · SIN VALIDEZ</strong>' : ''}</header>
    <dl class="receipt-details">${field('Cliente', data.customer)}${field('Equipo', `${data.device} · ${data.model}`)}${field('Serie', data.serial)}${field('Accesorios', data.accessories)}${field('Falla reportada', data.issue)}${field('Estado de ingreso', data.condition)}</dl>
    <section class="receipt-tracking" aria-label="Seguimiento de la reparación">${qr ? `<h3>Así va tu reparación</h3><div class="receipt-qr">${qr}</div><p>Escanea con la cámara de tu celular.</p><p class="receipt-small">Enlace privado: vence a los 30 días y puede revocarse. No compartas este ticket.</p>` : `<p>${demo ? 'La demo no tiene seguimiento compartido ni QR.' : 'Prepara el QR antes de imprimir este ticket.'}</p>`}${local ? '<strong>ENTORNO LOCAL: este QR no funciona desde otros dispositivos.</strong>' : ''}</section>
    <footer class="receipt-footer"><p>Conserva tu ticket y menciona GT-${data.number} al consultar con el taller.</p><p>Constancia de recepción.<br>No es comprobante de pago.</p><p>GarantiaTrack · Tu taller, en orden.</p></footer>`;
}

export function receiptPageStyle(paper, heightPx) {
  const profile = paperProfiles[paper];
  if (!profile || !Number.isFinite(heightPx) || heightPx < 0) throw new Error('Formato de impresión no válido.');
  // @page requires two lengths; "80mm auto" is invalid CSS.
  const height = Math.max(80, Math.ceil(heightPx * 25.4 / 96 + profile.margin * 2 + 3));
  return `@page { size: ${profile.width}mm ${height}mm; margin: ${profile.margin}mm; }`;
}

export function createReceiptLinks() {
  const links = new Map();
  let generation = 0;
  return {
    get: id => links.get(id),
    set: (id, url) => links.set(id, url),
    remove: id => links.delete(id),
    clear() { generation++; links.clear(); },
    generation: () => generation
  };
}
