import { statuses, statusLabel, escapeHtml as e } from './domain.js';

export const primaryStatuses = ['received', 'repairing', 'ready', 'delivered'];

export function statusChanges(order, status, at = new Date().toISOString()) {
  if (!statuses.some(([key]) => key === status)) throw new Error('Selecciona un estado válido.');
  return {
    status, quote: order.quote, notes: order.notes, message: order.message,
    events: status === order.status ? order.events : [...order.events, { status, at }]
  };
}

export function statusChangeMarkup(current) {
  const choice = ([key, label]) => `<label class="status-choice"><input type="radio" name="status" value="${key}" required${current === key ? ' checked' : ''}><span>${label}</span></label>`;
  const primary = primaryStatuses.map(key => statuses.find(([value]) => value === key));
  const additional = statuses.filter(([key]) => !primaryStatuses.includes(key));
  return `<form id="status-form" class="panel status-panel" aria-labelledby="status-heading">
    <div class="section"><h2 id="status-heading">Cambiar estado</h2>
      <p class="status-current">Estado actual: <strong id="status-current">${e(statusLabel(current))}</strong></p>
      <fieldset><legend class="status-legend">Selecciona el estado del equipo</legend>
        <div class="status-options">${primary.map(choice).join('')}</div>
        <details${primaryStatuses.includes(current) ? '' : ' open'}><summary>Otros estados</summary><div class="status-options">${additional.map(choice).join('')}</div></details>
      </fieldset>
      <p class="status-guidance">El nuevo estado aparece en el seguimiento del cliente. El presupuesto y los mensajes se guardan abajo.</p>
      <p id="status-error" class="error" role="alert"></p><p id="status-result" class="status-result" role="status"></p>
      <button class="primary" type="submit">Guardar estado</button>
    </div>
  </form>`;
}

export function mountStatusChange({ container, order, save, isCurrent, isBusy, setBusy, onSaved, friendly }) {
  const form = container.querySelector('#status-form');
  const error = form.querySelector('#status-error'), result = form.querySelector('#status-result');
  form.addEventListener('change', () => { error.textContent = ''; result.textContent = ''; });
  form.onsubmit = async event => {
    event.preventDefault();
    if (!isCurrent() || isBusy()) return;
    error.textContent = ''; result.textContent = '';
    const status = form.querySelector('input[name="status"]:checked')?.value;
    if (!statuses.some(([key]) => key === status)) { error.textContent = 'Selecciona un estado válido.'; return; }
    if (status === order.status) { result.textContent = 'Este estado ya está guardado.'; return; }
    const button = form.querySelector('[type="submit"]'), document = form.ownerDocument;
    const restoreFocus = document && document.activeElement === button;
    setBusy(true);
    try {
      const saved = await save(status);
      if (!saved || !isCurrent()) return;
      onSaved(saved);
      form.querySelector('#status-current').textContent = statusLabel(saved.status);
      result.textContent = `Estado guardado: ${statusLabel(saved.status)}.`;
    } catch (failure) {
      if (isCurrent()) error.textContent = friendly(failure);
    } finally {
      if (isCurrent()) {
        setBusy(false);
        if (restoreFocus && document.activeElement === document.body) button.focus();
      }
    }
  };
}
