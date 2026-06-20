import { query } from '../config/database.js';
import { generarPDF, plantillaReporte } from '../services/pdfService.js';

const mapEstadoFEtoDB = (estado) => {
  if (['identificado', 'analisis'].includes(estado)) return 'abierto';
  if (['planificado', 'implementado', 'verificado'].includes(estado)) return 'en_tratamiento';
  if (estado === 'cerrado') return 'cerrado';
  return 'abierto';
};

const mapEstadoDBtoFE = (estado) => {
  if (estado === 'abierto') return 'identificado';
  if (estado === 'en_tratamiento') return 'planificado';
  if (estado === 'cerrado') return 'cerrado';
  return 'identificado';
};

const parseHallazgo = (h) => {
  if (!h) return h;
  let desc = h.descripcion || '';
  let area = '';
  let recomendacion = '';

  const lines = desc.split('\n');
  const cleanLines = [];
  for (const line of lines) {
    const cleanLine = line.trim();
    if (cleanLine.toLowerCase().startsWith('área:')) {
      area = cleanLine.substring(5).trim();
    } else if (cleanLine.toLowerCase().startsWith('recomendación:')) {
      recomendacion = cleanLine.substring(14).trim();
    } else {
      cleanLines.push(line);
    }
  }

  return {
    ...h,
    descripcion: cleanLines.join('\n').trim(),
    area: area,
    recomendacion: recomendacion,
    tipo: h.tipo === 'no_conformidad' ? 'desviacion_mayor' :
          h.tipo === 'observacion' ? 'desviacion_menor' :
          h.tipo === 'oportunidad_mejora' ? 'mejora' : h.tipo,
    severidad: h.gravedad,
    estado: mapEstadoDBtoFE(h.estado)
  };
};

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
    res.json(rows.map(parseHallazgo));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const crearHallazgo = async (req, res) => {
  try {
    const { plan_id, auditoria_id, tipo, descripcion, area_proceso_id, gravedad, severidad, area, recomendacion } = req.body;
    
    const finalPlanId = plan_id || auditoria_id;
    
    let dbTipo = tipo;
    if (tipo === 'desviacion_mayor') dbTipo = 'no_conformidad';
    else if (tipo === 'desviacion_menor') dbTipo = 'observacion';
    else if (tipo === 'observacion') dbTipo = 'observacion';
    else if (tipo === 'mejora') dbTipo = 'oportunidad_mejora';
    
    const dbGravedad = gravedad || severidad || 'media';
    
    let dbDescripcion = descripcion || '';
    if (area || recomendacion) {
      dbDescripcion = `${dbDescripcion.trim()}\nÁrea: ${area || ''}\nRecomendación: ${recomendacion || ''}`;
    }
    
    const { rows } = await query(
      `INSERT INTO hallazgos (plan_id,tipo,descripcion,area_proceso_id,gravedad,creado_por,modificado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$6) RETURNING *`,
      [finalPlanId, dbTipo, dbDescripcion, area_proceso_id || null, dbGravedad, req.usuario.id]
    );

    const hallazgo = rows[0];

    // Create CAPA if no_conformidad
    if (dbTipo === 'no_conformidad') {
      const capaCode = `CAPA-AUTO-${Date.now().toString().slice(-6)}`;
      await query(
        `INSERT INTO capas (codigo,tipo,hallazgo_id,descripcion,accion_propuesta,responsable_id,creado_por,modificado_por)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$7)`,
        [capaCode, 'correctiva', hallazgo.id, 'Acción correctiva generada automáticamente por hallazgo: ' + hallazgo.descripcion.substring(0, 50), 'Definir acción', req.usuario.id, req.usuario.id]
      );
    }

    res.status(201).json(parseHallazgo(hallazgo));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const actualizarHallazgo = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, fecha_cierre } = req.body;
    
    const dbEstado = mapEstadoFEtoDB(estado);
    const finalFechaCierre = dbEstado === 'cerrado' ? (fecha_cierre || new Date()) : null;
    
    const { rows } = await query(
      `UPDATE hallazgos SET estado=$1,fecha_cierre=$2,modificado_por=$3 WHERE id=$4 RETURNING *`,
      [dbEstado, finalFechaCierre, req.usuario.id, id]
    );
    res.json(parseHallazgo(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const listarAuditorias = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT p.*, p.fecha_programada AS fecha, u.nombres||' '||u.apellidos AS lider_nombre,
             (SELECT COUNT(*) FROM hallazgos WHERE plan_id=p.id) AS num_hallazgos
      FROM planes_auditoria p LEFT JOIN usuarios u ON p.lider_id=u.id
      ORDER BY p.fecha_programada DESC`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const crearAuditoriaPlan = async (req, res) => {
  try {
    const { codigo, tipo, fecha, alcance, criterios, auditor_lider_id } = req.body;
    
    // Mapear tipo a la restricción CHECK de la BD
    let dbTipo = tipo;
    if (['certificacion', 'seguimiento'].includes(tipo)) {
      dbTipo = 'especial';
    }
    
    // Generar un nombre por defecto (NOT NULL en BD)
    const nombre = `Auditoría ${tipo.charAt(0).toUpperCase() + tipo.slice(1)} ${codigo}`;
    
    // Combinar alcance y criterios
    let dbAlcance = alcance || '';
    if (criterios) {
      dbAlcance = `${dbAlcance}\nCriterios: ${criterios}`;
    }
    
    const { rows } = await query(
      `INSERT INTO planes_auditoria (codigo, nombre, tipo, alcance, fecha_programada, lider_id, creado_por, modificado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7) RETURNING *`,
      [codigo, nombre, dbTipo, dbAlcance, fecha, auditor_lider_id || null, req.usuario.id]
    );
    
    // Retornar con fecha mapeada
    const result = {
      ...rows[0],
      fecha: rows[0].fecha_programada
    };
    res.status(201).json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const listarHallazgosDePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      `SELECT h.*, p.codigo AS plan_codigo, p.nombre AS plan_nombre,
              pr.nombre AS proceso_nombre
       FROM hallazgos h
       LEFT JOIN planes_auditoria p ON h.plan_id=p.id
       LEFT JOIN procesos pr ON h.area_proceso_id=pr.id
       WHERE h.plan_id=$1
       ORDER BY h.creado_en DESC`,
      [id]
    );
    res.json(rows.map(parseHallazgo));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const listarProgramas = async (req, res) => {
  res.json([]);
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
    const html = `<div class="content"><table><thead><tr><th>Código</th><th>Nombre</th><th>Tipo</th><th>Fecha</th><th>Líder</th><th>Estado</th><th>Hallazgos</th></tr></thead><tbody>${filas}</tbody></table></div>`;
    const pdf = await generarPDF(plantillaReporte('Reporte de Auditorías e Inspecciones', html));
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename=auditorias.pdf' });
    res.send(pdf);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const estadisticasPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: hallazgos } = await query(
      'SELECT tipo, gravedad FROM hallazgos WHERE plan_id=$1', [id]
    );

    const stats = {
      total: hallazgos.length,
      porTipo: {
        no_conformidad: 0,
        observacion: 0,
        oportunidad_mejora: 0
      },
      porGravedad: {
        critica: 0,
        alta: 0,
        media: 0,
        baja: 0
      }
    };

    hallazgos.forEach(h => {
      if (stats.porTipo[h.tipo] !== undefined) stats.porTipo[h.tipo]++;
      if (stats.porGravedad[h.gravedad] !== undefined) stats.porGravedad[h.gravedad]++;
    });

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
