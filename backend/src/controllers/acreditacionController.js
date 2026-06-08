import { query } from '../config/database.js';
import { generarPDF, plantillaReporte } from '../services/pdfService.js';

export const listarEstandares = async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM estandares_acreditacion ORDER BY nombre');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const crearEstandar = async (req, res) => {
  try {
    const { codigo, nombre, organizacion, descripcion, vigente_desde, vigente_hasta } = req.body;
    const { rows } = await query(
      `INSERT INTO estandares_acreditacion (codigo,nombre,organizacion,descripcion,vigente_desde,vigente_hasta,creado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [codigo, nombre, organizacion, descripcion, vigente_desde || null, vigente_hasta || null, req.usuario.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const listarFactores = async (req, res) => {
  try {
    const { estandar_id } = req.params;
    const { rows } = await query('SELECT * FROM factores_criterio WHERE estandar_id=$1 ORDER BY codigo', [estandar_id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const crearFactor = async (req, res) => {
  try {
    const { estandar_id, codigo, nombre, descripcion, peso } = req.body;
    const { rows } = await query(
      `INSERT INTO factores_criterio (estandar_id,codigo,nombre,descripcion,peso,creado_por)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [estandar_id, codigo, nombre, descripcion, peso || null, req.usuario.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const listarAutoevaluaciones = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT a.*, e.nombre AS estandar_nombre, e.organizacion
      FROM autoevaluaciones a LEFT JOIN estandares_acreditacion e ON a.estandar_id=e.id
      ORDER BY a.creado_en DESC`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const crearAutoevaluacion = async (req, res) => {
  try {
    const { estandar_id, periodo, fecha_inicio, fecha_fin } = req.body;
    const { rows } = await query(
      `INSERT INTO autoevaluaciones (estandar_id,periodo,fecha_inicio,fecha_fin,creado_por)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [estandar_id, periodo, fecha_inicio, fecha_fin || null, req.usuario.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const evaluarCriterio = async (req, res) => {
  try {
    const { autoevaluacion_id, factor_id, cumplimiento, puntaje, evidencias, observaciones } = req.body;
    const { rows } = await query(
      `INSERT INTO evaluaciones_criterio (autoevaluacion_id,factor_id,cumplimiento,puntaje,evidencias,observaciones,creado_por,modificado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$7) RETURNING *`,
      [autoevaluacion_id, factor_id, cumplimiento, puntaje || null, evidencias, observaciones, req.usuario.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const reporte = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT a.periodo, e.nombre AS estandar, e.organizacion, a.estado, a.puntaje_total,
             TO_CHAR(a.fecha_inicio,'DD/MM/YYYY') AS inicio, TO_CHAR(a.fecha_fin,'DD/MM/YYYY') AS fin
      FROM autoevaluaciones a LEFT JOIN estandares_acreditacion e ON a.estandar_id=e.id
      ORDER BY a.creado_en DESC`);
    const filas = rows.map(r => `
      <tr><td>${r.periodo}</td><td>${r.estandar}</td><td>${r.organizacion||'-'}</td>
      <td>${r.inicio}</td><td>${r.fin||'En proceso'}</td>
      <td><span class="badge ${r.estado==='completada'?'badge-green':'badge-yellow'}">${r.estado}</span></td>
      <td>${r.puntaje_total!=null?r.puntaje_total+'/100':'-'}</td></tr>`).join('');
    const html = `<table><thead><tr><th>Periodo</th><th>Estándar</th><th>Organización</th><th>Inicio</th><th>Fin</th><th>Estado</th><th>Puntaje</th></tr></thead><tbody>${filas}</tbody></table>`;
    const pdf = await generarPDF(plantillaReporte('Reporte de Acreditación y Autoevaluación', html));
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename=acreditacion.pdf' });
    res.send(pdf);
  } catch (err) { res.status(500).json({ error: err.message }); }
};
