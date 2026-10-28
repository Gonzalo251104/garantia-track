export const statuses = [
  ['received', 'Recibido'], ['diagnosing', 'En diagnóstico'],
  ['awaiting_approval', 'Por aprobar'], ['repairing', 'En reparación'],
  ['ready', 'Listo para recoger'], ['delivered', 'Entregado']
];
export const statusLabel = value => statuses.find(([key]) => key === value)?.[1] ?? value;
export const money = cents => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(cents / 100);
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character]));
export function parseAmount(value) {
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(String(value))) throw new Error('Ingresa un importe válido con hasta dos decimales.');
  return Math.round(Number(value) * 100);
}
export function nextOrderNumber(orders) {
  return Math.max(1040, ...orders.map(order => order.number)) + 1;
}
export function publicOrder(order) {
  return { number: order.number, device: order.device, model: order.model, status: order.status, message: order.message, created: order.created, events: order.events.map(({status, at}) => ({status, at})) };
}
export function validateIntake(values) {
  if (!values.customer?.trim() || !values.model?.trim() || !values.issue?.trim()) throw new Error('Completa cliente, modelo y falla reportada.');
  if (!/^9\d{8}$/.test(values.phone ?? '')) throw new Error('Ingresa un celular peruano de 9 dígitos que empiece por 9.');
  if (!['console','controller'].includes(values.device)) throw new Error('Selecciona un tipo de equipo.');
}
export function seedOrders() {
  const base = new Date();
  const ago = days => new Date(base.getTime() - days * 86400000).toISOString();
  return [
    {number:1041, customer:'Valeria Torres', phone:'900000001', device:'console', model:'PlayStation 5 · Digital', serial:'DEMO-PS5-041', issue:'Se apaga después de 20 minutos de juego.', condition:'Marcas leves en la base. Sello intacto.', accessories:['Cable de poder','Base'], status:'diagnosing', quote:0, notes:'Revisar temperatura bajo carga.', message:'Estamos revisando el sistema de ventilación para encontrar la causa del apagado.', created:ago(1), photos:[], events:[{status:'received',at:ago(1)},{status:'diagnosing',at:ago(0)}]},
    {number:1042, customer:'Mateo Ríos', phone:'900000002', device:'controller', model:'DualSense · Blanco', serial:'DEMO-DS-042', issue:'El stick izquierdo se mueve solo.', condition:'Desgaste en goma del stick izquierdo.', accessories:[], status:'repairing', quote:8500, notes:'Reemplazo de módulo autorizado por teléfono.', message:'Tu mando está en reparación. Después realizaremos las pruebas de precisión.', created:ago(3), photos:[], events:[{status:'received',at:ago(3)},{status:'diagnosing',at:ago(2)},{status:'awaiting_approval',at:ago(2)},{status:'repairing',at:ago(1)}]},
    {number:1043, customer:'Lucía Vega', phone:'900000003', device:'console', model:'Nintendo Switch · OLED', serial:'DEMO-NS-043', issue:'No detecta cartuchos de juego.', condition:'Pantalla sin marcas. Protector instalado.', accessories:['Estuche'], status:'ready', quote:14000, notes:'Lector reemplazado. Probado con tres cartuchos.', message:'¡Tu consola está lista! Puedes recogerla de lunes a sábado, de 10:00 a 19:00.', created:ago(5), photos:[], events:[{status:'received',at:ago(5)},{status:'diagnosing',at:ago(4)},{status:'repairing',at:ago(3)},{status:'ready',at:ago(0)}]},
    {number:1044, customer:'Diego Salas', phone:'900000004', device:'controller', model:'Xbox Wireless · Carbon Black', serial:'DEMO-XB-044', issue:'El botón RB no responde.', condition:'Carcasa con rayón en la parte posterior.', accessories:[], status:'awaiting_approval', quote:6500, notes:'Microswitch defectuoso. Pendiente confirmar presupuesto.', message:'El diagnóstico está listo. Comunícate con el taller para confirmar el presupuesto.', created:ago(2), photos:[], events:[{status:'received',at:ago(2)},{status:'diagnosing',at:ago(1)},{status:'awaiting_approval',at:ago(0)}]},
    {number:1045, customer:'Ana Castro', phone:'900000005', device:'console', model:'PlayStation 4 · Slim', serial:'DEMO-PS-045', issue:'Mantenimiento y limpieza interna.', condition:'Polvo en rejillas. Sin golpes visibles.', accessories:['Cable de poder'], status:'received', quote:0, notes:'', message:'Recibimos tu equipo y registramos sus accesorios. Pronto iniciaremos la revisión.', created:ago(0), photos:[], events:[{status:'received',at:ago(0)}]}
  ];
}
