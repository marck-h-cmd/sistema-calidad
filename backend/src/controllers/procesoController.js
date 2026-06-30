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

// GET /procesos/:id/documentos → documentos donde proceso_id = id
export const listarDocumentosProceso = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query(`
      SELECT d.id, d.codigo, d.titulo, d.estado, d.version_actual,
             t.nombre AS tipo_nombre
      FROM documentos d
      LEFT JOIN tipos_documento t ON d.tipo_documento_id = t.id
      WHERE d.proceso_id = $1
      ORDER BY d.codigo
    `, [id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// POST /procesos/:id/asociar-documento → { documento_id } → actualiza documentos.proceso_id
export const asociarDocumento = async (req, res) => {
  try {
    const { id } = req.params;
    const { documento_id } = req.body;
    if (!documento_id) return res.status(400).json({ error: 'documento_id es requerido' });

    // Verificar que el proceso existe
    const proc = await query('SELECT id FROM procesos WHERE id=$1', [id]);
    if (!proc.rows.length) return res.status(404).json({ error: 'Proceso no encontrado' });

    const { rows } = await query(
      `UPDATE documentos SET proceso_id=$1, modificado_por=$2 WHERE id=$3 RETURNING id, codigo, titulo, estado, version_actual`,
      [id, req.usuario.id, documento_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Documento no encontrado' });
    res.json({ mensaje: 'Documento asociado correctamente', documento: rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /procesos/:id/relaciones
export const obtenerRelacionesProceso = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Indicadores
    const indRes = await query(`SELECT id, codigo, nombre, tipo, estado, meta FROM indicadores WHERE proceso_id = $1`, [id]);
    
    // Riesgos
    const riesRes = await query(`SELECT id, codigo, nombre, categoria, probabilidad, impacto, estado FROM riesgos WHERE proceso_id = $1`, [id]);
    
    // Auditorías (Hallazgos vinculados)
    const hallazRes = await query(`
      SELECT h.id, h.tipo, h.descripcion, h.gravedad, h.estado, 
             p.codigo as plan_codigo, p.nombre as plan_nombre
      FROM hallazgos h
      JOIN planes_auditoria p ON h.plan_id = p.id
      WHERE h.area_proceso_id = $1
    `, [id]);
    
    res.json({
      indicadores: indRes.rows,
      riesgos: riesRes.rows,
      auditorias: hallazRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
