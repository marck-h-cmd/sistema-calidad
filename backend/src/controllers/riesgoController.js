import { query } from '../config/database.js';
import { generarPDF, plantillaReporte } from '../services/pdfService.js';

const nivelRiesgo = (p, i) => {
  const v = p * i;
  if (v <= 4)  return 'bajo';
  if (v <= 9)  return 'medio';
  if (v <= 14) return 'alto';
  return 'critico';
};

export const listar = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT r.*, pr.nombre AS proceso_nombre
      FROM riesgos r LEFT JOIN procesos pr ON r.proceso_id=pr.id
      ORDER BY r.probabilidad*r.impacto DESC, r.creado_en DESC`);
    res.json(rows.map(r => ({ ...r, nivel_riesgo: nivelRiesgo(r.probabilidad, r.impacto) })));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const crear = async (req, res) => {
  try {
    const { codigo, nombre, descripcion, proceso_id, categoria, probabilidad, impacto } = req.body;
    const { rows } = await query(
      `INSERT INTO riesgos (codigo,nombre,descripcion,proceso_id,categoria,probabilidad,impacto,creado_por,modificado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8) RETURNING *`,
      [codigo, nombre, descripcion, proceso_id||null, categoria, probabilidad, impacto, req.usuario.id]
    );
    const r = rows[0];
    res.status(201).json({ ...r, nivel_riesgo: nivelRiesgo(r.probabilidad, r.impacto) });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, probabilidad, impacto } = req.body;
    
    // Get old state
    const old = await query('SELECT estado FROM riesgos WHERE id=$1', [id]);
    const estado_anterior = old.rows[0]?.estado;

    const { rows } = await query(
      `UPDATE riesgos SET estado=$1,probabilidad=$2,impacto=$3,modificado_por=$4 WHERE id=$5 RETURNING *`,
      [estado, probabilidad, impacto, req.usuario.id, id]
    );
    const r = rows[0];

    // Create table and insert history
    await query(`CREATE TABLE IF NOT EXISTS historial_riesgos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      riesgo_id UUID REFERENCES riesgos(id) ON DELETE CASCADE,
      estado_anterior VARCHAR(20),
      estado_nuevo VARCHAR(20),
      cambiado_por UUID,
      fecha_cambio TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    if (estado_anterior !== estado) {
      await query(
        `INSERT INTO historial_riesgos (riesgo_id, estado_anterior, estado_nuevo, cambiado_por) VALUES ($1,$2,$3,$4)`,
        [id, estado_anterior, estado, req.usuario.id]
      );
    }

    res.json({ ...r, nivel_riesgo: nivelRiesgo(r.probabilidad, r.impacto) });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const matriz = async (req, res) => {
  try {
    const { rows } = await query(`SELECT * FROM riesgos`);
    const agrupados = rows.reduce((acc, r) => {
      const key = `${r.probabilidad}-${r.impacto}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push({ ...r, nivel_riesgo: nivelRiesgo(r.probabilidad, r.impacto) });
      return acc;
    }, {});
    res.json(agrupados);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const listarHistorial = async (req, res) => {
  try {
    const { riesgo_id } = req.params;
    // ensure table exists
    await query(`CREATE TABLE IF NOT EXISTS historial_riesgos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      riesgo_id UUID REFERENCES riesgos(id) ON DELETE CASCADE,
      estado_anterior VARCHAR(20),
      estado_nuevo VARCHAR(20),
      cambiado_por UUID,
      fecha_cambio TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    const { rows } = await query(
      `SELECT h.*, u.nombres||' '||u.apellidos AS cambiado_por_nombre 
       FROM historial_riesgos h 
       LEFT JOIN usuarios u ON h.cambiado_por=u.id 
       WHERE h.riesgo_id=$1 ORDER BY h.fecha_cambio DESC`,
      [riesgo_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const listarMitigaciones = async (req, res) => {
  try {
    const { riesgo_id } = req.params;
    const { rows } = await query(
      `SELECT pm.*, u.nombres||' '||u.apellidos AS responsable_nombre
       FROM planes_mitigacion pm LEFT JOIN usuarios u ON pm.responsable_id=u.id
       WHERE pm.riesgo_id=$1 ORDER BY pm.creado_en DESC`,
      [riesgo_id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const crearMitigacion = async (req, res) => {
  try {
    const { riesgo_id, descripcion, acciones, responsable_id, fecha_inicio, fecha_fin } = req.body;
    const { rows } = await query(
      `INSERT INTO planes_mitigacion (riesgo_id,descripcion,acciones,responsable_id,fecha_inicio,fecha_fin,creado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [riesgo_id, descripcion, acciones, responsable_id||null, fecha_inicio||null, fecha_fin||null, req.usuario.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const reporte = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT r.codigo, r.nombre, r.categoria, r.probabilidad, r.impacto, r.estado,
             pr.nombre AS proceso
      FROM riesgos r LEFT JOIN procesos pr ON r.proceso_id=pr.id
      ORDER BY r.probabilidad*r.impacto DESC`);
    const nivelColor = { bajo:'bg-green', medio:'bg-yellow', alto:'bg-red', critico:'bg-red' };
    const stats = `<div class="stats">
      <div class="stat"><div class="val">${rows.length}</div><div class="lbl">Total Riesgos</div></div>
      <div class="stat"><div class="val">${rows.filter(r=>nivelRiesgo(r.probabilidad,r.impacto)==='critico').length}</div><div class="lbl">Críticos</div></div>
      <div class="stat"><div class="val">${rows.filter(r=>nivelRiesgo(r.probabilidad,r.impacto)==='alto').length}</div><div class="lbl">Altos</div></div>
      <div class="stat"><div class="val">${rows.filter(r=>r.estado==='activo').length}</div><div class="lbl">Activos</div></div>
    </div>`;
    const filas = rows.map(r => {
      const nivel = nivelRiesgo(r.probabilidad, r.impacto);
      return `<tr>
        <td>${r.codigo}</td><td>${r.nombre}</td><td>${r.categoria||'-'}</td>
        <td>${r.proceso||'-'}</td><td>${r.probabilidad}</td><td>${r.impacto}</td>
        <td><span class="badge ${nivelColor[nivel]}">${nivel.toUpperCase()}</span></td>
        <td><span class="badge ${r.estado==='activo'?'bg-red':'bg-green'}">${r.estado}</span></td>
      </tr>`;
    }).join('');
    const html = `${stats}<table><thead><tr>
      <th>Código</th><th>Nombre</th><th>Categoría</th><th>Proceso</th>
      <th>Prob.</th><th>Imp.</th><th>Nivel</th><th>Estado</th>
    </tr></thead><tbody>${filas}</tbody></table>`;
    const pdf = await generarPDF(plantillaReporte('Reporte de Gestión de Riesgos', html));
    res.set({ 'Content-Type':'application/pdf', 'Content-Disposition':'attachment; filename=riesgos.pdf' });
    res.send(pdf);
  } catch (err) { res.status(500).json({ error: err.message }); }
};
