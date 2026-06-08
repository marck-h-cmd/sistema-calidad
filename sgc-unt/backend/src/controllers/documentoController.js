import { query } from '../config/database.js';
import { generarPDF, plantillaReporte } from '../services/pdfService.js';

export const listar = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT d.*, t.nombre AS tipo_nombre,
             u.nombres||' '||u.apellidos AS creado_por_nombre
      FROM documentos d
      LEFT JOIN tipos_documento t ON d.tipo_documento_id = t.id
      LEFT JOIN usuarios u ON d.creado_por = u.id
      ORDER BY d.creado_en DESC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const crear = async (req, res) => {
  try {
    const { codigo, titulo, tipo_documento_id, proceso_id, contenido, fecha_vigencia, fecha_revision } = req.body;
    const { rows } = await query(
      `INSERT INTO documentos (codigo,titulo,tipo_documento_id,proceso_id,contenido,fecha_vigencia,fecha_revision,creado_por,modificado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8) RETURNING *`,
      [codigo, titulo, tipo_documento_id, proceso_id || null, contenido, fecha_vigencia || null, fecha_revision || null, req.usuario.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, estado, contenido, fecha_vigencia, fecha_revision } = req.body;
    const { rows } = await query(
      `UPDATE documentos SET titulo=$1,estado=$2,contenido=$3,fecha_vigencia=$4,fecha_revision=$5,modificado_por=$6
       WHERE id=$7 RETURNING *`,
      [titulo, estado, contenido, fecha_vigencia || null, fecha_revision || null, req.usuario.id, id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const eliminar = async (req, res) => {
  try {
    await query('DELETE FROM documentos WHERE id=$1', [req.params.id]);
    res.json({ mensaje: 'Documento eliminado' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const listarTipos = async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM tipos_documento ORDER BY nombre');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const reporte = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT d.codigo, d.titulo, t.nombre AS tipo, d.estado, d.version_actual,
             TO_CHAR(d.creado_en,'DD/MM/YYYY') AS fecha
      FROM documentos d LEFT JOIN tipos_documento t ON d.tipo_documento_id=t.id
      ORDER BY d.creado_en DESC
    `);
    const estadoBadge = (e) => {
      const m = { aprobado:'badge-green', en_revision:'badge-yellow', borrador:'badge-blue', obsoleto:'badge-red' };
      return `<span class="badge ${m[e]||'badge-blue'}">${e}</span>`;
    };
    const filas = rows.map(r => `
      <tr>
        <td>${r.codigo}</td><td>${r.titulo}</td><td>${r.tipo||'-'}</td>
        <td>${estadoBadge(r.estado)}</td><td>v${r.version_actual}</td><td>${r.fecha}</td>
      </tr>`).join('');
    const stats = `
      <div class="stats">
        <div class="stat-card"><div class="val">${rows.length}</div><div class="lbl">Total Documentos</div></div>
        <div class="stat-card"><div class="val">${rows.filter(r=>r.estado==='aprobado').length}</div><div class="lbl">Aprobados</div></div>
        <div class="stat-card"><div class="val">${rows.filter(r=>r.estado==='en_revision').length}</div><div class="lbl">En Revisión</div></div>
        <div class="stat-card"><div class="val">${rows.filter(r=>r.estado==='borrador').length}</div><div class="lbl">Borradores</div></div>
      </div>`;
    const tabla = `${stats}<table>
      <thead><tr><th>Código</th><th>Título</th><th>Tipo</th><th>Estado</th><th>Versión</th><th>Fecha</th></tr></thead>
      <tbody>${filas}</tbody></table>`;
    const pdf = await generarPDF(plantillaReporte('Reporte de Gestión Documental', tabla));
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename=documentos.pdf' });
    res.send(pdf);
  } catch (err) { res.status(500).json({ error: err.message }); }
};
