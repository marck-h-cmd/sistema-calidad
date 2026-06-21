import { query } from '../config/database.js';
import { generarPDF, plantillaReporte } from '../services/pdfService.js';

export const listar = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT e.*,
        (SELECT COUNT(*) FROM preguntas_encuesta WHERE encuesta_id=e.id) AS num_preguntas,
        (SELECT COUNT(DISTINCT usuario_id) FROM respuestas_encuesta WHERE encuesta_id=e.id) AS num_respuestas
      FROM encuestas e ORDER BY e.creado_en DESC`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const crear = async (req, res) => {
  try {
    const { codigo, titulo, descripcion, dirigido_a, fecha_inicio, fecha_fin, anonima, preguntas } = req.body;
    const { rows } = await query(
      `INSERT INTO encuestas (codigo,titulo,descripcion,dirigido_a,fecha_inicio,fecha_fin,anonima,creado_por,modificado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8) RETURNING *`,
      [codigo, titulo, descripcion, dirigido_a, fecha_inicio||null, fecha_fin||null, anonima!==false, req.usuario.id]
    );
    const encuesta = rows[0];
    if (preguntas?.length) {
      for (let i = 0; i < preguntas.length; i++) {
        const p = preguntas[i];
        await query(
          `INSERT INTO preguntas_encuesta (encuesta_id,texto,tipo,orden,obligatoria) VALUES ($1,$2,$3,$4,$5)`,
          [encuesta.id, p.texto, p.tipo, i+1, p.obligatoria!==false]
        );
      }
    }
    res.status(201).json(encuesta);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const obtenerConPreguntas = async (req, res) => {
  try {
    const { id } = req.params;
    const enc = await query('SELECT * FROM encuestas WHERE id=$1', [id]);
    if (!enc.rows.length) return res.status(404).json({ error: 'Encuesta no encontrada' });
    const preg = await query('SELECT * FROM preguntas_encuesta WHERE encuesta_id=$1 ORDER BY orden', [id]);
    res.json({ ...enc.rows[0], preguntas: preg.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const responder = async (req, res) => {
  try {
    const { encuesta_id, respuestas } = req.body;
    for (const r of respuestas) {
      await query(
        `INSERT INTO respuestas_encuesta (encuesta_id,pregunta_id,usuario_id,valor_texto,valor_numerico)
         VALUES ($1,$2,$3,$4,$5)`,
        [encuesta_id, r.pregunta_id, req.usuario.id, r.valor_texto||null, r.valor_numerico??null]
      );
    }
    res.json({ mensaje: 'Respuestas registradas correctamente' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const resultados = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query(`
      SELECT p.id, p.texto, p.tipo,
        AVG(r.valor_numerico) FILTER (WHERE r.valor_numerico IS NOT NULL) AS promedio,
        COUNT(r.id) AS total_respuestas
      FROM preguntas_encuesta p
      LEFT JOIN respuestas_encuesta r ON p.id=r.pregunta_id
      WHERE p.encuesta_id=$1
      GROUP BY p.id, p.texto, p.tipo, p.orden ORDER BY p.orden`, [id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const publicar = async (req, res) => {
  try {
    const { id } = req.params;
    await query(`UPDATE encuestas SET estado='publicada',modificado_por=$1 WHERE id=$2`, [req.usuario.id, id]);
    res.json({ mensaje: 'Encuesta publicada' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const reporte = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT e.codigo, e.titulo, e.dirigido_a, e.estado,
        (SELECT COUNT(*) FROM preguntas_encuesta WHERE encuesta_id=e.id) AS preguntas,
        (SELECT AVG(valor_numerico) FROM respuestas_encuesta WHERE encuesta_id=e.id) AS promedio_general
      FROM encuestas e ORDER BY e.creado_en DESC`);
    const filas = rows.map(r => `
      <tr><td>${r.codigo}</td><td>${r.titulo}</td><td>${r.dirigido_a}</td>
      <td>${r.preguntas}</td>
      <td><span class="badge ${r.estado==='publicada'?'bg-green':'bg-yellow'}">${r.estado}</span></td>
      <td>${r.promedio_general!=null?parseFloat(r.promedio_general).toFixed(2)+'/5':'—'}</td></tr>`).join('');
    const html = `<table><thead><tr><th>Código</th><th>Título</th><th>Dirigido a</th><th>Preguntas</th><th>Estado</th><th>Promedio</th></tr></thead><tbody>${filas}</tbody></table>`;
    const pdf = await generarPDF(plantillaReporte('Reporte de Gestión de Satisfacción', html));
    res.set({ 'Content-Type':'application/pdf', 'Content-Disposition':'attachment; filename=encuestas.pdf' });
    res.send(pdf);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /encuestas/:id/resultados-detalle
// Retorna por cada pregunta: promedio, total_respuestas, distribución de valores y textos abiertos
export const resultadosDetalle = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la encuesta existe
    const enc = await query('SELECT * FROM encuestas WHERE id=$1', [id]);
    if (!enc.rows.length) return res.status(404).json({ error: 'Encuesta no encontrada' });

    // Preguntas con estadísticas numéricas agregadas
    const { rows: preguntas } = await query(`
      SELECT
        p.id,
        p.texto,
        p.tipo,
        p.orden,
        AVG(r.valor_numerico) FILTER (WHERE r.valor_numerico IS NOT NULL) AS promedio,
        COUNT(r.id) AS total_respuestas,
        COUNT(r.id) FILTER (WHERE r.valor_numerico = 1) AS v1,
        COUNT(r.id) FILTER (WHERE r.valor_numerico = 2) AS v2,
        COUNT(r.id) FILTER (WHERE r.valor_numerico = 3) AS v3,
        COUNT(r.id) FILTER (WHERE r.valor_numerico = 4) AS v4,
        COUNT(r.id) FILTER (WHERE r.valor_numerico = 5) AS v5,
        COUNT(r.id) FILTER (WHERE r.valor_numerico = 1 AND p.tipo = 'si_no') AS no_count,
        COUNT(r.id) FILTER (WHERE r.valor_numerico >= 1 AND p.tipo = 'si_no') AS si_no_total
      FROM preguntas_encuesta p
      LEFT JOIN respuestas_encuesta r ON p.id = r.pregunta_id
      WHERE p.encuesta_id = $1
      GROUP BY p.id, p.texto, p.tipo, p.orden
      ORDER BY p.orden
    `, [id]);

    // Para preguntas abiertas, obtener las últimas 5 respuestas de texto
    const resultado = await Promise.all(preguntas.map(async (p) => {
      const item = {
        id: p.id,
        texto: p.texto,
        tipo: p.tipo,
        orden: p.orden,
        promedio: p.promedio != null ? parseFloat(parseFloat(p.promedio).toFixed(2)) : null,
        total_respuestas: parseInt(p.total_respuestas, 10),
      };

      if (p.tipo === 'likert_5' || p.tipo === 'numerica') {
        item.distribucion = [
          { valor: 1, count: parseInt(p.v1, 10) },
          { valor: 2, count: parseInt(p.v2, 10) },
          { valor: 3, count: parseInt(p.v3, 10) },
          { valor: 4, count: parseInt(p.v4, 10) },
          { valor: 5, count: parseInt(p.v5, 10) },
        ];
      }

      if (p.tipo === 'si_no') {
        const noCount = parseInt(p.no_count, 10);
        const total = parseInt(p.total_respuestas, 10);
        const siCount = total - noCount;
        item.si_count = siCount;
        item.no_count = noCount;
      }

      if (p.tipo === 'abierta') {
        const { rows: textos } = await query(`
          SELECT valor_texto, enviado_en
          FROM respuestas_encuesta
          WHERE pregunta_id = $1
            AND valor_texto IS NOT NULL
            AND valor_texto <> ''
          ORDER BY enviado_en DESC
          LIMIT 5
        `, [p.id]);
        item.respuestas_texto = textos.map(t => t.valor_texto);
      }

      return item;
    }));

    res.json(resultado);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /encuestas/dashboard
// Promedio general, total respuestas, mejor y peor encuesta, tendencia mensual de satisfacción
export const dashboardGlobal = async (req, res) => {
  try {
    // Estadísticas globales de todas las encuestas activas (publicadas / en_curso)
    const { rows: global } = await query(`
      SELECT
        AVG(r.valor_numerico) FILTER (WHERE r.valor_numerico IS NOT NULL) AS promedio_general,
        COUNT(r.id) AS total_respuestas,
        COUNT(DISTINCT r.encuesta_id) AS encuestas_activas
      FROM respuestas_encuesta r
      JOIN encuestas e ON e.id = r.encuesta_id
      WHERE e.estado IN ('publicada', 'en_curso', 'cerrada')
    `);

    // Mejor y peor encuesta (por promedio de respuestas numéricas)
    const { rows: ranking } = await query(`
      SELECT
        e.id,
        e.titulo,
        e.codigo,
        AVG(r.valor_numerico) FILTER (WHERE r.valor_numerico IS NOT NULL) AS promedio,
        COUNT(r.id) AS total_respuestas
      FROM encuestas e
      LEFT JOIN respuestas_encuesta r ON e.id = r.encuesta_id
      WHERE e.estado IN ('publicada', 'en_curso', 'cerrada')
      GROUP BY e.id, e.titulo, e.codigo
      HAVING COUNT(r.id) > 0
      ORDER BY promedio DESC
    `);

    const mejor = ranking.length > 0 ? ranking[0] : null;
    const peor  = ranking.length > 1 ? ranking[ranking.length - 1] : null;

    // Tendencia mensual de satisfacción — últimos 6 meses
    const { rows: tendencia } = await query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', r.enviado_en), 'YYYY-MM') AS mes,
        ROUND(AVG(r.valor_numerico) FILTER (WHERE r.valor_numerico IS NOT NULL)::numeric, 2) AS promedio_mes,
        COUNT(r.id) AS respuestas_mes
      FROM respuestas_encuesta r
      JOIN encuestas e ON e.id = r.encuesta_id
      WHERE e.estado IN ('publicada', 'en_curso', 'cerrada')
        AND r.enviado_en >= NOW() - INTERVAL '6 months'
        AND r.valor_numerico IS NOT NULL
      GROUP BY DATE_TRUNC('month', r.enviado_en)
      ORDER BY DATE_TRUNC('month', r.enviado_en) ASC
    `);

    res.json({
      promedio_general: global[0]?.promedio_general != null
        ? parseFloat(parseFloat(global[0].promedio_general).toFixed(2))
        : null,
      total_respuestas: parseInt(global[0]?.total_respuestas || 0, 10),
      encuestas_activas: parseInt(global[0]?.encuestas_activas || 0, 10),
      mejor_encuesta: mejor ? {
        id: mejor.id,
        titulo: mejor.titulo,
        codigo: mejor.codigo,
        promedio: parseFloat(parseFloat(mejor.promedio).toFixed(2)),
        total_respuestas: parseInt(mejor.total_respuestas, 10),
      } : null,
      peor_encuesta: peor ? {
        id: peor.id,
        titulo: peor.titulo,
        codigo: peor.codigo,
        promedio: parseFloat(parseFloat(peor.promedio).toFixed(2)),
        total_respuestas: parseInt(peor.total_respuestas, 10),
      } : null,
      tendencia_mensual: tendencia.map(t => ({
        mes: t.mes,
        promedio: parseFloat(t.promedio_mes),
        respuestas: parseInt(t.respuestas_mes, 10),
      })),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
