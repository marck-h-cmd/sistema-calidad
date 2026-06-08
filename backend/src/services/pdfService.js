import puppeteer from 'puppeteer';

export const generarPDF = async (htmlContent) => {
  const execPath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: execPath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
    ],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '18mm', bottom: '20mm', left: '18mm' },
    });
    return pdf;
  } finally {
    await browser.close();
  }
};

export const plantillaReporte = (titulo, contenido) => `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color:#1e293b; font-size:11px; line-height:1.5; }
  .header { background:#0f2044; color:white; padding:20px 28px; }
  .header-inner { display:flex; justify-content:space-between; align-items:flex-start; }
  .header h1 { font-size:17px; font-weight:700; margin-bottom:3px; }
  .header h2 { font-size:11px; opacity:.7; font-weight:400; }
  .header-badge { background:rgba(255,255,255,.15); border:1px solid rgba(255,255,255,.2); padding:5px 12px; border-radius:6px; font-size:10px; text-align:center; }
  .title-section { background:#f8fafc; border-left:4px solid #2563eb; padding:10px 18px; margin:18px 28px 14px; border-radius:0 6px 6px 0; }
  .title-section h3 { font-size:14px; font-weight:700; color:#0f2044; }
  .content { padding:0 28px; }
  table { width:100%; border-collapse:collapse; margin-bottom:16px; font-size:10px; }
  thead th { background:#0f2044; color:white; padding:9px 10px; text-align:left; font-weight:600; font-size:9.5px; letter-spacing:.3px; }
  tbody tr:nth-child(even) { background:#f8fafc; }
  tbody td { padding:8px 10px; border-bottom:1px solid #e2e8f0; vertical-align:top; }
  .badge { display:inline-block; padding:2px 7px; border-radius:4px; font-size:9px; font-weight:700; }
  .bg-green { background:#dcfce7; color:#166534; }
  .bg-yellow { background:#fef9c3; color:#854d0e; }
  .bg-red { background:#fee2e2; color:#991b1b; }
  .bg-blue { background:#dbeafe; color:#1e40af; }
  .stats { display:flex; gap:14px; margin:0 28px 16px; }
  .stat { flex:1; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; text-align:center; }
  .stat .val { font-size:20px; font-weight:800; color:#0f2044; }
  .stat .lbl { font-size:9px; color:#64748b; margin-top:2px; }
  .footer { margin-top:24px; padding:12px 28px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; font-size:9px; color:#94a3b8; }
</style>
</head>
<body>
  <div class="header">
    <div class="header-inner">
      <div>
        <h1>Universidad Nacional de Trujillo</h1>
        <h2>Sistema de Gestión de la Calidad — SGC-UNT v1.0</h2>
      </div>
      <div class="header-badge">${new Date().toLocaleDateString('es-PE')}<br><span style="font-size:9px;opacity:.7">Documento oficial</span></div>
    </div>
  </div>
  <div class="title-section"><h3>${titulo}</h3></div>
  <div class="content">${contenido}</div>
  <div class="footer">
    <span>Universidad Nacional de Trujillo — Sistema de Gestión de la Calidad</span>
    <span>Generado: ${new Date().toLocaleString('es-PE')}</span>
  </div>
</body>
</html>`;
