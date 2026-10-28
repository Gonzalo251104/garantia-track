import { receiptData, receiptMarkup, qrSvg, trackingReceiptUrl, receiptPageStyle, whatsappReceiptUrl } from './receipt.js';

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
    ${demo ? '' : '<a id="ticket-whatsapp" hidden target="_blank" rel="noopener noreferrer">Compartir recepción por WhatsApp ↗</a><p id="ticket-share-help" hidden>Se abrirá WhatsApp con el número de ticket y el enlace privado. Elige al cliente antes de enviarlo.</p>'}
    <button id="ticket-retry" hidden>Volver a validar enlace</button>
    ${demo ? '' : '<button id="ticket-create">Crear QR</button><a id="ticket-customer" hidden>Abrir seguimiento del cliente ↗</a><form id="ticket-import" class="actions-stack" hidden><label class="field" for="ticket-existing-url">Recuperar un QR anterior<input id="ticket-existing-url" type="url" required maxlength="512" autocomplete="off" spellcheck="false" placeholder="Pega el enlace del ticket anterior"></label><button type="submit">Conservar este QR</button><p>Escanea el ticket anterior y pega su enlace. Se guardará cifrado, sin invalidarlo ni cambiar su vencimiento.</p></form>'}
    <p>En el diálogo de impresión selecciona tu impresora y el mismo ancho de papel, escala 100 %, sin encabezados ni pies de página. También puedes guardar como PDF.</p>
    <p>${demo ? 'Demo: puedes imprimir el diseño, pero no genera un QR ni seguimiento compartido.' : 'El QR se recupera de forma segura al recargar o usar otra pestaña. Reimprimir conserva el enlace y su vencimiento. Solo renovar o revocar invalida los tickets anteriores.'}</p>
    </section><section class="ticket-preview" aria-label="Vista previa del ticket"><p class="ticket-preview-caption">VISTA PREVIA · BLANCO Y NEGRO</p><article class="ticket-paper" id="receipt-paper" data-paper="80"></article></section></div>
    <p class="ticket-blocked-print">El ticket no está preparado. Vuelve a la aplicación y valida el QR antes de imprimir.</p><style id="ticket-page-size" media="print"></style>
  </div></main>`;
  const view = root.querySelector('.ticket-view'), paper = view.querySelector('#receipt-paper');
  const printButton = view.querySelector('#ticket-print'), createButton = view.querySelector('#ticket-create');
  const retryButton = view.querySelector('#ticket-retry'), sizeSelect = view.querySelector('#ticket-paper-size');
  const status = view.querySelector('#ticket-status'), error = view.querySelector('#ticket-error');
  const importForm = view.querySelector('#ticket-import'), share = view.querySelector('#ticket-whatsapp'), shareHelp = view.querySelector('#ticket-share-help');
  const generation = links.generation();
  const current = () => view.isConnected && isCurrent() && links.generation() === generation;
  let busy = false;
  let linkState = 'unknown';
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
    if (importForm) importForm.querySelector('button').disabled = value;
  }
  async function prepare() {
    if (!current()) return false;
    view.dataset.ready = 'false'; printButton.disabled = true; error.textContent = '';
    if (demo) {
      renderPaper(); view.dataset.ready = 'true'; status.textContent = 'DEMO · Sin QR compartido';
      return true;
    }
    const customer = view.querySelector('#ticket-customer'); customer.hidden = true; share.hidden = true; share.removeAttribute('href'); shareHelp.hidden = true;
    linkState = 'unknown'; importForm.hidden = true; createButton.hidden = false;
    status.textContent = 'Recuperando el QR del taller de forma segura…';
    try {
      const stored = await backend.receiptLink(order);
      if (!current()) return false;
      linkState = stored.state; view.dataset.linkState = linkState;
      createButton.textContent = linkState === 'missing' ? 'Crear QR de seguimiento' : 'Renovar QR (invalida el anterior)';
      if (linkState !== 'active') {
        links.remove(order.id); renderPaper(); retryButton.hidden = false;
        importForm.hidden = !['legacy','unavailable'].includes(linkState);
        status.textContent = {
          missing: 'Esta orden todavía no tiene QR. Puedes crear uno sin reemplazar otros tickets.',
          legacy: 'El QR anterior sigue válido. Recupera su enlace para conservarlo sin renovarlo.',
          expired: 'El enlace venció. No se renovará automáticamente al reimprimir.',
          revoked: 'El enlace fue revocado. Solo una renovación explícita creará otro QR.',
          unavailable: 'No pudimos recuperar el QR cifrado. Puedes importar su enlace anterior o reintentar.'
        }[linkState];
        return false;
      }
      links.set(order.id, stored.url);
      const checked = trackingReceiptUrl(stored.url, applicationUrl);
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
      if (!checked.local) { share.href = whatsappReceiptUrl(data, checked.url, applicationUrl); share.hidden = false; shareHelp.hidden = false; }
      status.textContent = checked.local ? 'Aviso: el QR apunta al entorno local y no funciona desde otro dispositivo.' : 'QR recuperado de forma segura · Reimprimir conserva el mismo enlace.';
      return true;
    } catch (failure) {
      if (!current()) return false;
      renderPaper(); status.textContent = 'No se puede imprimir un QR sin validar.';
      error.textContent = failure instanceof Error && !/fetch|network/i.test(failure.message) ? failure.message : 'No pudimos validar el enlace. Revisa tu conexión y vuelve a intentarlo.';
      retryButton.hidden = false;
      if (linkState === 'unknown') createButton.hidden = true;
      return false;
    }
  }
  if (createButton) createButton.onclick = async () => {
    if (busy) return; setBusy(true);
    try {
      if (linkState !== 'missing' && !await confirmTrackingRenewal(view)) return;
      if (!current()) return;
      error.textContent = ''; status.textContent = 'Creando el enlace privado…';
      if (linkState === 'missing') await backend.receiptLink(order, true);
      else await backend.trackingLink(order);
      if (!current()) return;
      await prepare();
    } catch {
      if (current()) error.textContent = 'No pudimos crear el enlace. Revisa tu conexión y vuelve a intentarlo.';
    } finally { if (current()) setBusy(false); }
  };
  if (importForm) importForm.onsubmit = async event => {
    event.preventDefault(); if (busy) return; setBusy(true); error.textContent = '';
    try {
      const checked = trackingReceiptUrl(importForm.querySelector('input').value.trim(), applicationUrl);
      await backend.importReceiptLink(order, checked.url);
      if (!current()) return;
      importForm.reset(); await prepare();
    } catch {
      if (current()) error.textContent = 'No pudimos recuperar ese enlace. Debe corresponder a esta orden y seguir activo. No se modificó el QR anterior.';
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
