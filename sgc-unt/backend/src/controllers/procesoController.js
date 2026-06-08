import { query } from '../config/database.js';
import { generarPDF, plantillaReporte } from '../services/pdfService.js';

// MACROPROCESOS
export const listarMacroprocesos = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT m.*, u.nombres||' '||u.apellidos AS responsable_nombre
      FROM macroprocesos m LEFT JOIN usuarios u ON m.responsable_id=u.id
      ORDER BY m.codigo`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const crearMacroproceso = async (req, res) => {
  try {
    const { codigo, nombre, descripcion, tipo, responsable_id } = req.body;
    const { rows } = await query(
      `INSERT INTO macroprocesos (codigo,nombre,descripcion,tipo,responsable_id,creado_por,modificado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$6) RETURNING *`,
      [codigo, nombre, descripcion, tipo, responsable_id || null, req.usuario.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// PROCESOS
export const listarProcesos = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT p.*, m.nombre AS macroproceso_nombre,
             u.nombres||' '||u.apellidos AS responsable_nombre
      FROM procesos p
      LEFT JOIN macroprocesos m ON p.macroproceso_id=m.id
      LEFT JOIN usuarios u ON p.responsable_id=u.id
      ORDER BY p.codigo`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const crearProceso = async (req, res) => {
  try {
    const { codigo, nombre, objetivo, alcance, macroproceso_id, responsable_id } = req.body;
    const { rows } = await query(
      `INSERT INTO procesos (codigo,nombre,objetivo,alcance,macroproceso_id,responsable_id,creado_por,modificado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$7) RETURNING *`,
      [codigo, nombre, objetivo, alcance, macroproceso_id || null, responsable_id || null, req.usuario.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const actualizarProceso = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, objetivo, alcance, estado } = req.body;
    const { rows } = await query(
      `UPDATE procesos SET nombre=$1,objetivo=$2,alcance=$3,estado=$4,modificado_por=$5 WHERE id=$6 RETURNING *`,
      [nombre, objetivo, alcance, estado, req.usuario.id, id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ACTIVIDADES
export const listarActividades = async (req, res) => {
  try {
    const { proceso_id } = req.params;
    const { rows } = await query(
      `SELECT a.*, u.nombres||' '||u.apellidos AS responsable_nombre
       FROM actividades_proceso a LEFT JOIN usuarios u ON a.responsable_id=u.id
       WHERE a.proceso_id=$1 ORDER BY a.secuencia`,
      [proceso_id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const crearActividad = async (req, res) => {
  try {
    const { proceso_id, codigo, nombre, descripcion, secuencia, responsable_id, entradas, salidas } = req.body;
    const { rows } = await query(
      `INSERT INTO actividades_proceso (proceso_id,codigo,nombre,descripcion,secuencia,responsable_id,entradas,salidas,creado_por,modificado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9) RETURNING *`,
      [proceso_id, codigo, nombre, descripcion, secuencia, responsable_id || null, entradas, salidas, req.usuario.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const reporte = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT p.codigo, p.nombre, m.nombre AS macroproceso, p.objetivo, p.estado,
             (SELECT COUNT(*) FROM actividades_proceso WHERE proceso_id=p.id) AS num_actividades
      FROM procesos p LEFT JOIN macroprocesos m ON p.macroproceso_id=m.id ORDER BY p.codigo`);
    const filas = rows.map(r => `
      <tr><td>${r.codigo}</td><td>${r.nombre}</td><td>${r.macroproceso||'-'}</td>
      <td>${r.objetivo||'-'}</td><td>${r.num_actividades}</td>
      <td><span class="badge ${r.estado==='activo'?'badge-green':'badge-yellow'}">${r.estado}</span></td></tr>`).join('');
    const html = `<table><thead><tr><th>Código</th><th>Nombre</th><th>Macroproceso</th><th>Objetivo</th><th>Actividades</th><th>Estado</th></tr></thead><tbody>${filas}</tbody></table>`;
    const pdf = await generarPDF(plantillaReporte('Mapa de Procesos Institucionales', html));
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename=procesos.pdf' });
    res.send(pdf);
  } catch (err) { res.status(500).json({ error: err.message }); }
};
