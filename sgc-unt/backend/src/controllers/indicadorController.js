import { query } from '../config/database.js';
import { generarPDF, plantillaReporte } from '../services/pdfService.js';

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
    const filas = rows.map(r => {
      const cumpl = r.ultimo_cumplimiento;
      const color = cumpl >= 95 ? 'badge-green' : cumpl >= 75 ? 'badge-yellow' : 'badge-red';
      return `<tr><td>${r.codigo}</td><td>${r.nombre}</td><td>${r.proceso||'-'}</td>
              <td>${r.tipo}</td><td>${r.meta||'-'} ${r.unidad_medida||''}</td>
              <td>${r.ultimo_valor!=null?r.ultimo_valor+' '+r.unidad_medida:'-'}</td>
              <td>${cumpl!=null?`<span class="badge ${color}">${cumpl}%</span>`:'-'}</td>
              <td><span class="badge ${r.estado==='activo'?'badge-green':'badge-yellow'}">${r.estado}</span></td></tr>`;
    }).join('');
    const html = `<table><thead><tr><th>Código</th><th>Nombre</th><th>Proceso</th><th>Tipo</th><th>Meta</th><th>Último Valor</th><th>Cumplimiento</th><th>Estado</th></tr></thead><tbody>${filas}</tbody></table>`;
    const pdf = await generarPDF(plantillaReporte('Reporte de Indicadores de Gestión', html));
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename=indicadores.pdf' });
    res.send(pdf);
  } catch (err) { res.status(500).json({ error: err.message }); }
};
