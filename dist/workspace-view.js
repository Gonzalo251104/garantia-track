import { escapeHtml } from './domain.js';

export function workspaceIdentity(name, { current = false, demo = false } = {}) {
  const safeName = escapeHtml(name);
  const initials = name.trim().split(/\s+/).slice(0, 2).map(word => [...word][0]).join('').toLocaleUpperCase('es');
  return `<a class="nav-link workshop-link${current ? ' active' : ''}" href="${demo ? '#/track/1042' : '#/workshop'}"${current ? ' aria-current="page"' : ''} aria-label="${demo ? 'Seguimiento de ejemplo' : `Configurar ${safeName}`}"><span class="avatar" aria-hidden="true">${escapeHtml(initials)}</span><span class="profile-workshop-name">${safeName}</span></a>`;
}

export function unavailableOrder() {
  return '<div class="empty"><h1>Orden no disponible</h1><p>No pudimos abrir esta orden con tu cuenta actual. Revisa el enlace y confirma que ingresaste al taller correcto.</p><a href="#/orders" class="row-link">Volver a reparaciones →</a></div>';
}
