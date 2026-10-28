import { escapeHtml } from './domain.js';

export const paperProfiles = Object.freeze({
  '80': Object.freeze({ width: 80, content: 72, margin: 4, qr: 44 }),
  '58': Object.freeze({ width: 58, content: 48, margin: 5, qr: 40 })
});

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
    device: order.device === 'controller' ? 'Mando' : 'Consola',
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

export function receiptMarkup(data, { qr = '', demo = false, local = false } = {}) {
  const field = (label, value) => `<div class="receipt-field"><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`;
  return `<header class="receipt-heading"><p class="receipt-brand">${escapeHtml(data.workshop)}</p><p>RECEPCIÓN DE EQUIPO</p><h2>GT-${data.number}</h2><p>${escapeHtml(data.created)} · Lima</p>${demo ? '<strong class="receipt-demo">DEMO · SIN VALIDEZ</strong>' : ''}</header>
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
