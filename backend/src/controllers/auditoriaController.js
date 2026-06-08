import { query } from '../config/database.js';
import { generarPDF, plantillaReporte } from '../services/pdfService.js';

export const listarPlanes = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT p.*, u.nombres||' '||u.apellidos AS lider_nombre,
             (SELECT COUNT(*) FROM hallazgos WHERE plan_id=p.id) AS num_hallazgos
      FROM planes_auditoria p LEFT JOIN usuarios u ON p.lider_id=u.id
      ORDER BY p.fecha_programada DESC`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const crearPlan = async (req, res) => {
  try {
    const { codigo, nombre, tipo, alcance, fecha_programada, lider_id } = req.body;
    const { rows } = await query(
      `INSERT INTO planes_auditoria (codigo,nombre,tipo,alcance,fecha_programada,lider_id,creado_por,modificado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$7) RETURNING *`,
      [codigo, nombre, tipo, alcance, fecha_programada, lider_id || null, req.usuario.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const actualizarPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, fecha_ejecucion } = req.body;
    const { rows } = await query(
      `UPDATE planes_auditoria SET estado=$1,fecha_ejecucion=$2,modificado_por=$3 WHERE id=$4 RETURNING *`,
      [estado, fecha_ejecucion || null, req.usuario.id, id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const listarHallazgos = async (req, res) => {
  try {
    const { plan_id } = req.query;
    let sql = `SELECT h.*, p.codigo AS plan_codigo, p.nombre AS plan_nombre,
                      pr.nombre AS proceso_nombre
               FROM hallazgos h
               LEFT JOIN planes_auditoria p ON h.plan_id=p.id
               LEFT JOIN procesos pr ON h.area_proceso_id=pr.id`;
    const params = [];
    if (plan_id) { sql += ' WHERE h.plan_id=$1'; params.push(plan_id); }
    sql += ' ORDER BY h.creado_en DESC';
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const crearHallazgo = async (req, res) => {
  try {
    const { plan_id, tipo, descripcion, area_proceso_id, gravedad } = req.body;
    const { rows } = await query(
      `INSERT INTO hallazgos (plan_id,tipo,descripcion,area_proceso_id,gravedad,creado_por,modificado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$6) RETURNING *`,
      [plan_id, tipo, descripcion, area_proceso_id || null, gravedad, req.usuario.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const actualizarHallazgo = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, fecha_cierre } = req.body;
    const { rows } = await query(
      `UPDATE hallazgos SET estado=$1,fecha_cierre=$2,modificado_por=$3 WHERE id=$4 RETURNING *`,
      [estado, fecha_cierre || null, req.usuario.id, id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const reporte = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT p.codigo, p.nombre, p.tipo, p.estado,
             TO_CHAR(p.fecha_programada,'DD/MM/YYYY') AS fecha,
             u.nombres||' '||u.apellidos AS lider,
             (SELECT COUNT(*) FROM hallazgos WHERE plan_id=p.id) AS hallazgos
      FROM planes_auditoria p LEFT JOIN usuarios u ON p.lider_id=u.id ORDER BY p.fecha_programada DESC`);
    const estadoColor = { planificado:'badge-blue', en_ejecucion:'badge-yellow', ejecutado:'badge-green', cerrado:'badge-green' };
    const filas = rows.map(r => `
      <tr><td>${r.codigo}</td><td>${r.nombre}</td><td>${r.tipo}</td>
      <td>${r.fecha}</td><td>${r.lider||'-'}</td>
      <td><span class="badge ${estadoColor[r.estado]||'badge-blue'}">${r.estado}</span></td>
      <td>${r.hallazgos}</td></tr>`).join('');
    const html = `<table><thead><tr><th>Código</th><th>Nombre</th><th>Tipo</th><th>Fecha</th><th>Líder</th><th>Estado</th><th>Hallazgos</th></tr></thead><tbody>${filas}</tbody></table>`;
    const pdf = await generarPDF(plantillaReporte('Reporte de Auditorías e Inspecciones', html));
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename=auditorias.pdf' });
    res.send(pdf);
  } catch (err) { res.status(500).json({ error: err.message }); }
};
