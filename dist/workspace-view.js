import { escapeHtml } from './domain.js';

export function workspaceIdentity(name) {
  const safeName = escapeHtml(name);
  return `<div class="breadcrumb" aria-label="Taller activo"><span class="workspace-label">Espacio de trabajo</span><span class="workspace-brand" aria-hidden="true">GarantiaTrack</span><strong class="active-workshop" title="${safeName}">${safeName}</strong></div>`;
}

export function unavailableOrder() {
  return '<div class="empty"><h1>Orden no disponible</h1><p>No pudimos abrir esta orden con tu cuenta actual. Revisa el enlace y confirma que ingresaste al taller correcto.</p><a href="#/orders" class="row-link">Volver a reparaciones →</a></div>';
}
