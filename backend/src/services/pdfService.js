import puppeteer from 'puppeteer';
import fs from 'fs';

const getWindowsExecutablePath = () => {
  const paths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
};

export const generarPDF = async (htmlContent) => {
  const execPath = process.env.PUPPETEER_EXECUTABLE_PATH || getWindowsExecutablePath();
  
  const launchOptions = {
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
    ],
  };

  if (execPath) {
    launchOptions.executablePath = execPath;
  }

  const browser = await puppeteer.launch(launchOptions);
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
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Outfit', -apple-system, sans-serif; color:#1e293b; font-size:11px; line-height:1.5; background-color:#ffffff; }
  
  /* Header section */
  .header { background: linear-gradient(135deg, #0f2044 0%, #1e3a8a 100%); color:white; padding:24px 28px; border-bottom: 4px solid #2563eb; }
  .header-inner { display:flex; justify-content:space-between; align-items:center; }
  .header h1 { font-size:18px; font-weight:700; letter-spacing:-0.3px; margin-bottom:2px; }
  .header h2 { font-size:11px; opacity:.85; font-weight:400; }
  .header-badge { background:rgba(255,255,255,.1); border:1px solid rgba(255,255,255,.18); padding:6px 14px; border-radius:8px; font-size:9.5px; text-align:right; font-weight: 500; line-height: 1.3; }
  
  /* Title & Content */
  .title-section { background:#f8fafc; border-left:4px solid #2563eb; padding:12px 18px; margin:20px 28px 16px; border-radius:0 8px 8px 0; display: flex; justify-content: space-between; align-items: center; }
  .title-section h3 { font-size:14px; font-weight:700; color:#0f2044; }
  .content { padding:0 28px; }
  
  /* KPI Cards */
  .stats-grid { display: flex; gap: 14px; margin: 0 28px 20px; }
  .kpi-card { flex: 1; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; display: flex; flex-direction: column; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
  .kpi-card .kpi-val { font-size: 22px; font-weight: 700; color: #0f2044; margin-bottom: 2px; }
  .kpi-card .kpi-lbl { font-size: 9.5px; color: #64748b; font-weight: 500; }
  .kpi-card.border-green { border-left: 4px solid #10b981; }
  .kpi-card.border-blue { border-left: 4px solid #2563eb; }
  .kpi-card.border-orange { border-left: 4px solid #f59e0b; }
  
  /* Tables */
  table { width:100%; border-collapse:collapse; margin-bottom:20px; font-size:10px; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
  thead th { background:#0f2044; color:white; padding:10px 12px; text-align:left; font-weight:600; font-size:9.5px; letter-spacing:.3px; border-bottom: 2px solid #e2e8f0; }
  tbody tr:nth-child(even) { background:#f8fafc; }
  tbody tr:hover { background:#f1f5f9; }
  tbody td { padding:9px 12px; border-bottom:1px solid #e2e8f0; vertical-align:middle; color: #334155; }
  
  /* Badges */
  .badge { display:inline-block; padding:3px 8px; border-radius:6px; font-size:9px; font-weight:600; text-transform: uppercase; text-align: center; }
  .badge-green { background:#dcfce7; color:#15803d; border: 1px solid #bbf7d0; }
  .badge-yellow { background:#fef9c3; color:#a16207; border: 1px solid #fef08a; }
  .badge-red { background:#fee2e2; color:#b91c1c; border: 1px solid #fecaca; }
  .badge-blue { background:#dbeafe; color:#1d4ed8; border: 1px solid #bfdbfe; }
  .badge-gray { background:#f1f5f9; color:#475569; border: 1px solid #e2e8f0; }
  
  /* Charts */
  .chart-container { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin: 0 28px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
  .chart-title { font-size: 11px; font-weight: 700; color: #0f2044; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }

  /* Footer */
  .footer { margin-top:30px; padding:14px 28px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; font-size:9px; color:#94a3b8; font-weight: 500; }
</style>
</head>
<body>
  <div class="header">
    <div class="header-inner">
      <div>
        <h1>Universidad Nacional de Trujillo</h1>
        <h2>Sistema de Gestión de la Calidad — SGC-UNT v1.0</h2>
      </div>
      <div class="header-badge">
        Fecha: ${new Date().toLocaleDateString('es-PE')}<br>
        <span style="font-size:8.5px;opacity:.8;font-weight:400;">Reporte del Sistema</span>
      </div>
    </div>
  </div>
  <div class="title-section">
    <h3>${titulo}</h3>
  </div>
  ${contenido}
  <div class="footer">
    <span>Universidad Nacional de Trujillo — Sistema de Gestión de la Calidad</span>
    <span>Generado: ${new Date().toLocaleString('es-PE')}</span>
  </div>
</body>
</html>`;;
