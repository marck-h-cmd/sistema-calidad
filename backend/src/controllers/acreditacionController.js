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

export const listarCertificaciones = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT id, nombre, organizacion AS organismo, codigo AS norma, 
             vigente_desde AS fecha_emision, vigente_hasta AS fecha_vencimiento,
             'activo' AS estado
      FROM estandares_acreditacion 
      ORDER BY nombre`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const crearCertificacion = async (req, res) => {
  try {
    const { nombre, organismo, norma, fecha_emision, fecha_vencimiento } = req.body;
    const { rows } = await query(
      `INSERT INTO estandares_acreditacion (codigo, nombre, organizacion, vigente_desde, vigente_hasta, creado_por)
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, nombre, organizacion AS organismo, codigo AS norma, 
                 vigente_desde AS fecha_emision, vigente_hasta AS fecha_vencimiento, 'activo' AS estado`,
      [norma, nombre, organismo, fecha_emision || null, fecha_vencimiento || null, req.usuario.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const listarRequisitos = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query(`
      SELECT f.id, f.codigo AS categoria, f.nombre AS descripcion, 
             'Coordinador' AS responsable, null AS fecha_limite,
             COALESCE(
               (SELECT 
                  CASE cumplimiento
                    WHEN 'cumple' THEN 'cumplido'
                    WHEN 'cumple_parcial' THEN 'en_proceso'
                    WHEN 'no_cumple' THEN 'pendiente'
                    WHEN 'no_aplica' THEN 'no_aplicable'
                    ELSE 'pendiente'
                  END
                FROM evaluaciones_criterio 
                WHERE factor_id = f.id 
                LIMIT 1
               ), 'pendiente'
             ) AS estado
      FROM factores_criterio f
      WHERE f.estandar_id = $1
      ORDER BY f.codigo`,
      [id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const crearRequisito = async (req, res) => {
  try {
    const { descripcion, categoria, certificacion_id } = req.body;
    const { rows } = await query(
      `INSERT INTO factores_criterio (estandar_id, codigo, nombre, descripcion, creado_por)
       VALUES ($1, $2, $3, $3, $4)
       RETURNING id, codigo AS categoria, nombre AS descripcion, 'Coordinador' AS responsable, null AS fecha_limite, 'pendiente' AS estado`,
      [certificacion_id, categoria, descripcion, req.usuario.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const actualizarRequisito = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    
    let cumplimiento = 'no_cumple';
    if (estado === 'cumplido') cumplimiento = 'cumple';
    else if (estado === 'en_proceso') cumplimiento = 'cumple_parcial';
    else if (estado === 'no_aplicable') cumplimiento = 'no_aplica';

    const autoEvalResult = await query('SELECT id FROM autoevaluaciones LIMIT 1');
    if (autoEvalResult.rows.length === 0) {
      return res.status(400).json({ error: 'Debe existir al menos una autoevaluación registrada' });
    }
    const autoevaluacion_id = autoEvalResult.rows[0].id;

    const checkEval = await query(
      'SELECT id FROM evaluaciones_criterio WHERE factor_id = $1 AND autoevaluacion_id = $2',
      [id, autoevaluacion_id]
    );

    if (checkEval.rows.length > 0) {
      await query(
        `UPDATE evaluaciones_criterio 
         SET cumplimiento = $1, modificado_en = CURRENT_TIMESTAMP, modificado_por = $2
         WHERE id = $3`,
        [cumplimiento, req.usuario.id, checkEval.rows[0].id]
      );
    } else {
      await query(
        `INSERT INTO evaluaciones_criterio (autoevaluacion_id, factor_id, cumplimiento, creado_por, modificado_por)
         VALUES ($1, $2, $3, $4, $4)`,
        [autoevaluacion_id, id, cumplimiento, req.usuario.id]
      );
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
