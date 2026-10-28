import { receiptData, receiptMarkup, qrSvg, trackingReceiptUrl, receiptPageStyle } from './receipt.js';

export function confirmTrackingRenewal(parent) {
  return new Promise(resolve => {
    const dialog = document.createElement('dialog');
    dialog.setAttribute('aria-labelledby', 'ticket-renew-title');
    dialog.innerHTML = '<h2 id="ticket-renew-title">¿Crear un nuevo QR?</h2><p>Se reemplazará cualquier enlace anterior de esta orden. Los tickets ya entregados con ese QR dejarán de funcionar.</p><div class="dialog-actions"><button id="ticket-cancel">Conservar el anterior</button><button id="ticket-confirm" class="primary">Crear nuevo QR</button></div>';
    parent.append(dialog);
    dialog.addEventListener('close', () => { const accepted = dialog.returnValue === 'confirm'; dialog.remove(); resolve(accepted); }, { once: true });
    dialog.querySelector('#ticket-cancel').onclick = () => dialog.close();
    dialog.querySelector('#ticket-confirm').onclick = () => dialog.close('confirm');
    dialog.showModal();
  });
}

export function showReceipt({ root, order, workshopName, demo, links, backend, applicationUrl, isCurrent }) {
  const data = receiptData(order, workshopName);
  root.innerHTML = `<main class="ticket-view" id="main" tabindex="-1" data-ready="false"><div class="ticket-container">
    <a class="ticket-back" href="#/orders/${order.number}">← Volver a GT-${order.number}</a>
    <header class="ticket-intro"><div class="eyebrow">DEL MOSTRADOR A LAS MANOS DEL CLIENTE</div><h1>Su equipo tiene un ticket.</h1><p>Una recepción clara y el seguimiento, a un escaneo de distancia.</p></header>
    <div class="ticket-layout"><section class="ticket-controls" aria-label="Opciones del ticket"><h2>Listo para el mostrador</h2>
    <label class="field" for="ticket-paper-size">Papel térmico<select id="ticket-paper-size"><option value="80">80 mm · Estándar</option><option value="58">58 mm · Compacto</option></select></label>
    <p id="ticket-status" class="ticket-status" role="status"></p><p id="ticket-error" class="error" role="alert"></p>
    <button id="ticket-print" class="primary" disabled>Imprimir ticket</button>
    <button id="ticket-retry" hidden>Volver a validar enlace</button>
    ${demo ? '' : '<button id="ticket-create">Crear / renovar QR</button><a id="ticket-customer" hidden>Abrir seguimiento del cliente ↗</a>'}
    <p>En el diálogo de impresión selecciona tu impresora y el mismo ancho de papel, escala 100 %, sin encabezados ni pies de página. También puedes guardar como PDF.</p>
    <p>${demo ? 'Demo: puedes imprimir el diseño, pero no genera un QR ni seguimiento compartido.' : 'Imprimir otra copia conserva el QR. Renovarlo invalida los enlaces y tickets anteriores. Al recargar se olvida el enlace en esta pestaña; necesitarás renovarlo explícitamente.'}</p>
    </section><section class="ticket-preview" aria-label="Vista previa del ticket"><p class="ticket-preview-caption">VISTA PREVIA · BLANCO Y NEGRO</p><article class="ticket-paper" id="receipt-paper" data-paper="80"></article></section></div>
    <p class="ticket-blocked-print">El ticket no está preparado. Vuelve a la aplicación y valida el QR antes de imprimir.</p><style id="ticket-page-size" media="print"></style>
  </div></main>`;
  const view = root.querySelector('.ticket-view'), paper = view.querySelector('#receipt-paper');
  const printButton = view.querySelector('#ticket-print'), createButton = view.querySelector('#ticket-create');
  const retryButton = view.querySelector('#ticket-retry'), sizeSelect = view.querySelector('#ticket-paper-size');
  const status = view.querySelector('#ticket-status'), error = view.querySelector('#ticket-error');
  const generation = links.generation();
  const current = () => view.isConnected && isCurrent() && links.generation() === generation;
  let busy = false;
  function pageSize() {
    const style = window.getComputedStyle(paper);
    const height = paper.scrollHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    view.querySelector('#ticket-page-size').textContent = receiptPageStyle(sizeSelect.value, height);
  }
  function renderPaper(qr = '', local = false) {
    paper.innerHTML = receiptMarkup(data, { qr, local, demo });
    paper.dataset.paper = sizeSelect.value;
    pageSize();
  }
  function setBusy(value) {
    busy = value;
    printButton.disabled = value || view.dataset.ready !== 'true';
    if (createButton) createButton.disabled = value;
    retryButton.disabled = value;
  }
  async function prepare() {
    if (!current()) return false;
    view.dataset.ready = 'false'; printButton.disabled = true; error.textContent = '';
    if (demo) {
      renderPaper(); view.dataset.ready = 'true'; status.textContent = 'DEMO · Sin QR compartido';
      return true;
    }
    const cached = links.get(order.id);
    const customer = view.querySelector('#ticket-customer'); customer.hidden = true;
    if (!cached) {
      renderPaper(); status.textContent = 'Falta preparar el QR. Crea un enlace para este ticket.'; retryButton.hidden = true;
      return false;
    }
    status.textContent = 'Comprobando que el seguimiento sigue activo…';
    try {
      const checked = trackingReceiptUrl(cached, applicationUrl);
      const result = await backend.tracking(new URL(checked.url).hash.split('/').at(-1));
      if (!current()) return false;
      if (!result || Number(result.number) !== order.number) {
        links.remove(order.id);
        throw new Error('El enlace venció o fue revocado. Renueva el QR; los tickets anteriores dejarán de funcionar.');
      }
      const { create } = await import('./vendor/qrcode.js');
      if (!current()) return false;
      renderPaper(qrSvg(checked.url, create), checked.local);
      view.dataset.ready = 'true'; customer.href = checked.url; customer.hidden = false; retryButton.hidden = true;
      status.textContent = checked.local ? 'Aviso: el QR apunta al entorno local y no funciona desde otro dispositivo.' : 'QR activo · Las copias conservan el mismo enlace.';
      return true;
    } catch (failure) {
      if (!current()) return false;
      renderPaper(); status.textContent = 'No se puede imprimir un QR sin validar.';
      error.textContent = failure instanceof Error && !/fetch|network/i.test(failure.message) ? failure.message : 'No pudimos validar el enlace. Revisa tu conexión y vuelve a intentarlo.';
      retryButton.hidden = !links.get(order.id);
      return false;
    }
  }
  if (createButton) createButton.onclick = async () => {
    if (busy) return; setBusy(true);
    try {
      if (!await confirmTrackingRenewal(view) || !current()) return;
      error.textContent = ''; status.textContent = 'Creando el enlace privado…';
      const url = await backend.trackingLink(order);
      if (!current()) return;
      links.set(order.id, url);
      await prepare();
    } catch {
      if (current()) error.textContent = 'No pudimos crear el enlace. Revisa tu conexión y vuelve a intentarlo.';
    } finally { if (current()) setBusy(false); }
  };
  retryButton.onclick = async () => { if (busy) return; setBusy(true); try { await prepare(); } finally { if (current()) setBusy(false); } };
  printButton.onclick = async () => {
    if (busy) return; setBusy(true);
    try { if (await prepare() && current()) { pageSize(); window.print(); } }
    finally { if (current()) setBusy(false); }
  };
  sizeSelect.onchange = () => { paper.dataset.paper = sizeSelect.value; pageSize(); };
  renderPaper(); setBusy(true);
  void prepare().finally(() => { if (current()) setBusy(false); });
}
