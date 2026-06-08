import { query } from '../config/database.js';

export const resumen = async (req, res) => {
  try {
    const [docs, capas, riesgos, encuestas, hallazgos, autoevals] = await Promise.all([
      query('SELECT COUNT(*) FROM documentos'),
      query("SELECT COUNT(*) FROM capas WHERE estado NOT IN ('cerrada','rechazada')"),
      query("SELECT COUNT(*) FROM riesgos WHERE estado='activo'"),
      query("SELECT COUNT(*) FROM encuestas WHERE estado='publicada'"),
      query("SELECT COUNT(*) FROM hallazgos WHERE estado='abierto'"),
      query('SELECT COUNT(*) FROM autoevaluaciones'),
    ]);

    const indicadoresRecientes = await query(`
      SELECT i.nombre, m.valor_real, i.meta, m.cumplimiento, i.unidad_medida
      FROM mediciones_indicador m
      JOIN indicadores i ON m.indicador_id = i.id
      ORDER BY m.creado_en DESC LIMIT 8`);

    const capasPorEstado = await query(
      `SELECT estado, COUNT(*) AS total FROM capas GROUP BY estado ORDER BY total DESC`);

    const riesgosPorNivel = await query(`
      SELECT
        CASE
          WHEN probabilidad*impacto<=4  THEN 'bajo'
          WHEN probabilidad*impacto<=9  THEN 'medio'
          WHEN probabilidad*impacto<=14 THEN 'alto'
          ELSE 'critico'
        END AS nivel,
        COUNT(*) AS total
      FROM riesgos
      WHERE estado='activo'
      GROUP BY nivel
      ORDER BY MIN(probabilidad*impacto) DESC`);

    res.json({
      totales: {
        documentos:           parseInt(docs.rows[0].count),
        capas_activas:        parseInt(capas.rows[0].count),
        riesgos_activos:      parseInt(riesgos.rows[0].count),
        encuestas_publicadas: parseInt(encuestas.rows[0].count),
        hallazgos_abiertos:   parseInt(hallazgos.rows[0].count),
        autoevaluaciones:     parseInt(autoevals.rows[0].count),
      },
      indicadores_recientes: indicadoresRecientes.rows,
      capas_por_estado:      capasPorEstado.rows,
      riesgos_por_nivel:     riesgosPorNivel.rows,
    });
  } catch (err) {
    console.error('Dashboard error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
