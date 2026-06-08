import { query } from '../config/database.js';
import { generarPDF, plantillaReporte } from '../services/pdfService.js';

export const listar = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT c.*, u.nombres||' '||u.apellidos AS responsable_nombre,
             h.descripcion AS hallazgo_descripcion
      FROM capas c
      LEFT JOIN usuarios u ON c.responsable_id=u.id
      LEFT JOIN hallazgos h ON c.hallazgo_id=h.id
      ORDER BY c.creado_en DESC`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const crear = async (req, res) => {
  try {
    const { codigo, tipo, hallazgo_id, descripcion, causa_raiz, accion_propuesta, responsable_id, fecha_implementacion, fecha_verificacion } = req.body;
    const { rows } = await query(
      `INSERT INTO capas (codigo,tipo,hallazgo_id,descripcion,causa_raiz,accion_propuesta,responsable_id,fecha_implementacion,fecha_verificacion,creado_por,modificado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10) RETURNING *`,
      [codigo, tipo, hallazgo_id || null, descripcion, causa_raiz, accion_propuesta, responsable_id, fecha_implementacion || null, fecha_verificacion || null, req.usuario.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const actualizarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, efectividad } = req.body;
    const { rows } = await query(
      `UPDATE capas SET estado=$1,efectividad=$2,modificado_por=$3 WHERE id=$4 RETURNING *`,
      [estado, efectividad || null, req.usuario.id, id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const reporte = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT c.codigo, c.tipo, c.descripcion, c.estado, c.efectividad,
             u.nombres||' '||u.apellidos AS responsable,
             TO_CHAR(c.fecha_implementacion,'DD/MM/YYYY') AS f_impl
      FROM capas c LEFT JOIN usuarios u ON c.responsable_id=u.id ORDER BY c.creado_en DESC`);
    const estadoColor = { registrada:'badge-blue', en_implementacion:'badge-yellow', implementada:'badge-blue', verificada:'badge-blue', cerrada:'badge-green', rechazada:'badge-red' };
    const filas = rows.map(r => `
      <tr><td>${r.codigo}</td><td>${r.tipo}</td><td>${r.descripcion}</td>
      <td>${r.responsable||'-'}</td><td>${r.f_impl||'-'}</td>
      <td><span class="badge ${estadoColor[r.estado]||'badge-blue'}">${r.estado}</span></td>
      <td>${r.efectividad||'-'}</td></tr>`).join('');
    const html = `<table><thead><tr><th>Código</th><th>Tipo</th><th>Descripción</th><th>Responsable</th><th>F.Impl.</th><th>Estado</th><th>Efectividad</th></tr></thead><tbody>${filas}</tbody></table>`;
    const pdf = await generarPDF(plantillaReporte('Reporte de Acciones Correctivas y Preventivas (CAPA)', html));
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename=capas.pdf' });
    res.send(pdf);
  } catch (err) { res.status(500).json({ error: err.message }); }
};
