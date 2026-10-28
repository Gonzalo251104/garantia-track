// This PDF contains the same customer-facing intake projection as the printed ticket.
export function makeReceiptPdf(data, url, jsPDF, createQr) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  let y = 20;
  const line = (text, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 11 : 10);
    // Built-in PDF fonts support Latin text; unsupported characters are made explicit.
    const safe = String(text).replace(/[^\x20-\x7e\xa0-\xff\n]/g, '?');
    for (const part of doc.splitTextToSize(safe, 170)) {
      if (y > 275) { doc.addPage(); y = 20; }
      doc.text(part, 20, y); y += 6;
    }
  };
  line(data.workshop, true); line('RECEPCIÓN DE EQUIPO', true); line(`Ticket GT-${data.number}`, true);
  line(`${data.created} · Lima`); y += 4;
  for (const [label, value] of [['Cliente',data.customer],['Equipo',`${data.device} · ${data.model}`],['Serie',data.serial],['Accesorios',data.accessories],['Falla reportada',data.issue],['Estado de ingreso',data.condition]]) {
    line(`${label}:`, true); line(value); y += 2;
  }
  if (y > 210) { doc.addPage(); y = 20; }
  line('Seguimiento de la reparación', true);
  const modules = createQr(url, { errorCorrectionLevel: 'Q' }).modules;
  const unit = 48 / (modules.size + 8), x = 20;
  doc.setFillColor(255, 255, 255); doc.rect(x, y, 48, 48, 'F'); doc.setFillColor(0, 0, 0);
  for (let row = 0; row < modules.size; row++) for (let col = 0; col < modules.size; col++) if (modules.get(row, col)) doc.rect(x + (col + 4) * unit, y + (row + 4) * unit, unit + 0.01, unit + 0.01, 'F');
  y += 53; line('Escanea el QR para consultar el estado.');
  doc.textWithLink('Abrir seguimiento', 20, y, { url }); y += 7;
  line('Enlace privado: vence a los 30 días y puede revocarse. No compartas este ticket.');
  line('Constancia de recepción. No es comprobante de pago.');
  return doc.output('blob');
}
