import { query } from '../config/database.js';
import { generarPDF, plantillaReporte } from '../services/pdfService.js';
import { generarExcelIndicadores } from '../services/excelService.js';

export const listar = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT i.*, pr.nombre AS proceso_nombre,
             (SELECT valor_real FROM mediciones_indicador WHERE indicador_id=i.id ORDER BY creado_en DESC LIMIT 1) AS ultimo_valor
      FROM indicadores i LEFT JOIN procesos pr ON i.proceso_id=pr.id
      ORDER BY i.codigo`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const crear = async (req, res) => {
  try {
    const { codigo, nombre, descripcion, proceso_id, tipo, formula_calculo, unidad_medida, meta, frecuencia_medicion } = req.body;
    const { rows } = await query(
      `INSERT INTO indicadores (codigo,nombre,descripcion,proceso_id,tipo,formula_calculo,unidad_medida,meta,frecuencia_medicion,creado_por,modificado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10) RETURNING *`,
      [codigo, nombre, descripcion, proceso_id || null, tipo, formula_calculo, unidad_medida, meta || null, frecuencia_medicion, req.usuario.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const listarMediciones = async (req, res) => {
  try {
    const { indicador_id } = req.params;
    const { rows } = await query(
      `SELECT * FROM mediciones_indicador WHERE indicador_id=$1 ORDER BY periodo ASC`,
      [indicador_id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const registrarMedicion = async (req, res) => {
  try {
    const { indicador_id, periodo, valor_real, valor_esperado, analisis_tendencia } = req.body;
    const cumplimiento = valor_esperado > 0 ? parseFloat(((valor_real / valor_esperado) * 100).toFixed(2)) : null;
    const { rows } = await query(
      `INSERT INTO mediciones_indicador (indicador_id,periodo,valor_real,valor_esperado,cumplimiento,analisis_tendencia,creado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [indicador_id, periodo, valor_real, valor_esperado || null, cumplimiento, analisis_tendencia, req.usuario.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const reporte = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT i.codigo, i.nombre, i.tipo, i.meta, i.unidad_medida, i.estado, pr.nombre AS proceso,
             (SELECT valor_real FROM mediciones_indicador WHERE indicador_id=i.id ORDER BY creado_en DESC LIMIT 1) AS ultimo_valor,
             (SELECT cumplimiento FROM mediciones_indicador WHERE indicador_id=i.id ORDER BY creado_en DESC LIMIT 1) AS ultimo_cumplimiento
      FROM indicadores i LEFT JOIN procesos pr ON i.proceso_id=pr.id ORDER BY i.codigo`);

    // Calculate KPIs
    const total = rows.length;
    const activos = rows.filter(r => r.estado === 'activo').length;
    const cumplimientosValidos = rows
      .filter(r => r.ultimo_cumplimiento != null)
      .map(r => parseFloat(r.ultimo_cumplimiento));
    const promedioCumplimiento = cumplimientosValidos.length > 0 
      ? (cumplimientosValidos.reduce((a, b) => a + b, 0) / cumplimientosValidos.length).toFixed(1)
      : null;

    // KPI Cards HTML
    const kpiCardsHtml = `
      <div class="stats-grid">
        <div class="kpi-card border-blue">
          <span class="kpi-val">${total}</span>
          <span class="kpi-lbl">INDICADORES TOTALES</span>
        </div>
        <div class="kpi-card border-green">
          <span class="kpi-val">${promedioCumplimiento != null ? promedioCumplimiento + '%' : '—'}</span>
          <span class="kpi-lbl">CUMPLIMIENTO PROMEDIO</span>
        </div>
        <div class="kpi-card border-orange">
          <span class="kpi-val">${activos}</span>
          <span class="kpi-lbl">INDICADORES ACTIVOS</span>
        </div>
      </div>
    `;

    // SVG Bar Chart HTML
    const indicatorsWithData = rows.filter(r => r.ultimo_cumplimiento != null).slice(0, 10);
    let svgBars = '';
    
    indicatorsWithData.forEach((r, idx) => {
      const x = 55 + idx * 43;
      const height = (parseFloat(r.ultimo_cumplimiento) / 100) * 110;
      const y = 140 - height;
      
      // Color coding
      let color = '#ef4444'; // Red
      if (r.ultimo_cumplimiento >= 95) color = '#10b981'; // Green
      else if (r.ultimo_cumplimiento >= 75) color = '#f59e0b'; // Yellow

      svgBars += `
        <rect x="${x}" y="${y}" width="24" height="${height}" fill="${color}" rx="3" />
        <text x="${x + 12}" y="155" font-family="'Outfit', sans-serif" font-size="8" fill="#64748b" text-anchor="middle">${r.codigo}</text>
        <text x="${x + 12}" y="${y - 5}" font-family="'Outfit', sans-serif" font-size="8" font-weight="700" fill="#1e293b" text-anchor="middle">${parseFloat(r.ultimo_cumplimiento).toFixed(0)}%</text>
      `;
    });

    const chartHtml = indicatorsWithData.length > 0 ? `
      <div class="chart-container">
        <div class="chart-title">Desempeño de Cumplimiento por Indicador (Top ${indicatorsWithData.length})</div>
        <svg viewBox="0 0 500 170" width="100%" height="150" style="background:#ffffff; font-family:'Outfit', sans-serif;">
          <!-- Grid Lines -->
          <line x1="45" y1="30" x2="480" y2="30" stroke="#f1f5f9" stroke-width="1" />
          <line x1="45" y1="85" x2="480" y2="85" stroke="#f1f5f9" stroke-width="1" stroke-dasharray="3 3" />
          <line x1="45" y1="140" x2="480" y2="140" stroke="#cbd5e1" stroke-width="1" />
          
          <!-- Axis Labels -->
          <text x="35" y="33" font-size="8" fill="#94a3b8" text-anchor="end">100%</text>
          <text x="35" y="88" font-size="8" fill="#94a3b8" text-anchor="end">50%</text>
          <text x="35" y="143" font-size="8" fill="#94a3b8" text-anchor="end">0%</text>
          
          ${svgBars}
        </svg>
      </div>
    ` : '';

    // Table rows
    const filas = rows.map(r => {
      const cumpl = r.ultimo_cumplimiento;
      const color = cumpl >= 95 ? 'badge-green' : cumpl >= 75 ? 'badge-yellow' : 'badge-red';
      return `<tr>
        <td style="font-weight: 500; font-family: monospace;">${r.codigo}</td>
        <td style="font-weight: 600; color: #0f2044;">${r.nombre}<br><span style="font-size: 8px; font-weight: 400; color: #94a3b8;">${r.proceso || 'Sin Proceso'}</span></td>
        <td>${r.tipo.toUpperCase()}</td>
        <td style="text-align: right; font-weight: 500;">${r.meta != null ? r.meta + ' ' + r.unidad_medida : '-'}</td>
        <td style="text-align: right; font-weight: 600; color: #2563eb;">${r.ultimo_valor != null ? r.ultimo_valor + ' ' + r.unidad_medida : '-'}</td>
        <td style="text-align: center;">${cumpl != null ? `<span class="badge ${color}">${cumpl}%</span>` : '—'}</td>
        <td style="text-align: center;"><span class="badge ${r.estado === 'activo' ? 'badge-green' : 'badge-gray'}">${r.estado}</span></td>
      </tr>`;
    }).join('');

    const htmlTable = `
      <div class="content">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre del Indicador</th>
              <th>Tipo</th>
              <th style="text-align: right;">Meta</th>
              <th style="text-align: right;">Último Valor</th>
              <th style="text-align: center;">Cumplimiento</th>
              <th style="text-align: center;">Estado</th>
            </tr>
          </thead>
          <tbody>
            ${filas}
          </tbody>
        </table>
      </div>
    `;

    const htmlFinal = `${kpiCardsHtml}${chartHtml}${htmlTable}`;
    const pdf = await generarPDF(plantillaReporte('Reporte de Indicadores de Gestión', htmlFinal));
    
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename=indicadores.pdf' });
    res.send(pdf);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const exportarExcel = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT i.codigo, i.nombre, i.tipo, i.meta, i.unidad_medida, i.estado, pr.nombre AS proceso,
             (SELECT valor_real FROM mediciones_indicador WHERE indicador_id=i.id ORDER BY creado_en DESC LIMIT 1) AS ultimo_valor,
             (SELECT cumplimiento FROM mediciones_indicador WHERE indicador_id=i.id ORDER BY creado_en DESC LIMIT 1) AS ultimo_cumplimiento
      FROM indicadores i LEFT JOIN procesos pr ON i.proceso_id=pr.id ORDER BY i.codigo`);

    const buffer = await generarExcelIndicadores(rows);
    
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=indicadores.xlsx',
      'Content-Length': buffer.length
    });
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const obtenerResumen = async (req, res) => {
  try {
    const { rows } = await query(`
      WITH RankedMediciones AS (
        SELECT *,
               ROW_NUMBER() OVER (PARTITION BY indicador_id ORDER BY creado_en DESC, periodo DESC) as rn
        FROM mediciones_indicador
      )
      SELECT i.id, i.codigo, i.nombre, i.meta, i.unidad_medida, i.estado, i.tipo, i.frecuencia_medicion,
             pr.nombre AS proceso_nombre,
             m1.periodo AS ultimo_periodo, m1.valor_real AS ultimo_valor_real, m1.valor_esperado AS ultimo_valor_esperado, m1.cumplimiento AS ultimo_cumplimiento,
             m2.cumplimiento AS penultimo_cumplimiento,
             (
               SELECT COALESCE(json_agg(m_sub), '[]'::json)
               FROM (
                 SELECT periodo, cumplimiento 
                 FROM mediciones_indicador 
                 WHERE indicador_id = i.id 
                 ORDER BY periodo DESC 
                 LIMIT 6
               ) m_sub
             ) AS mediciones_json
      FROM indicadores i
      LEFT JOIN procesos pr ON i.proceso_id = pr.id
      LEFT JOIN RankedMediciones m1 ON m1.indicador_id = i.id AND m1.rn = 1
      LEFT JOIN RankedMediciones m2 ON m2.indicador_id = i.id AND m2.rn = 2
      ORDER BY i.codigo
    `);

    const result = rows.map(row => {
      let tendencia = 'estable';
      if (row.ultimo_cumplimiento != null && row.penultimo_cumplimiento != null) {
        const diff = parseFloat(row.ultimo_cumplimiento) - parseFloat(row.penultimo_cumplimiento);
        if (diff > 0) tendencia = 'subiendo';
        else if (diff < 0) tendencia = 'bajando';
      }
      return {
        id: row.id,
        codigo: row.codigo,
        nombre: row.nombre,
        meta: row.meta != null ? parseFloat(row.meta) : null,
        unidad_medida: row.unidad_medida,
        estado: row.estado,
        tipo: row.tipo,
        frecuencia_medicion: row.frecuencia_medicion,
        proceso_nombre: row.proceso_nombre,
        ultimo_periodo: row.ultimo_periodo,
        ultimo_valor_real: row.ultimo_valor_real != null ? parseFloat(row.ultimo_valor_real) : null,
        ultimo_valor_esperado: row.ultimo_valor_esperado != null ? parseFloat(row.ultimo_valor_esperado) : null,
        ultimo_cumplimiento: row.ultimo_cumplimiento != null ? parseFloat(row.ultimo_cumplimiento) : null,
        tendencia,
        mediciones: (row.mediciones_json || []).reverse().map(m => ({
          periodo: m.periodo,
          cumplimiento: m.cumplimiento != null ? parseFloat(m.cumplimiento) : null
        }))
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const exportarCSV = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT i.codigo AS indicador_codigo, i.nombre AS indicador_nombre, i.unidad_medida,
             m.periodo, m.valor_real, m.valor_esperado, m.cumplimiento, m.analisis_tendencia, m.creado_en
      FROM mediciones_indicador m
      JOIN indicadores i ON m.indicador_id = i.id
      ORDER BY i.codigo, m.periodo ASC
    `);

    const escapeCSV = (val) => {
      if (val == null) return '';
      let str = val.toString();
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        str = str.replace(/"/g, '""');
        return `"${str}"`;
      }
      return str;
    };

    const headers = [
      'Codigo Indicador',
      'Nombre Indicador',
      'Periodo',
      'Valor Real',
      'Valor Esperado',
      'Unidad Medida',
      'Cumplimiento (%)',
      'Analisis Tendencia',
      'Fecha Registro'
    ];

    let csvContent = '\uFEFF'; // UTF-8 BOM
    csvContent += headers.join(',') + '\n';

    for (const row of rows) {
      const line = [
        escapeCSV(row.indicador_codigo),
        escapeCSV(row.indicador_nombre),
        escapeCSV(row.periodo),
        escapeCSV(row.valor_real),
        escapeCSV(row.valor_esperado),
        escapeCSV(row.unidad_medida),
        escapeCSV(row.cumplimiento != null ? `${row.cumplimiento}%` : ''),
        escapeCSV(row.analisis_tendencia),
        escapeCSV(row.creado_en ? new Date(row.creado_en).toISOString() : '')
      ];
      csvContent += line.join(',') + '\n';
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=mediciones_indicadores.csv');
    res.status(200).send(csvContent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
