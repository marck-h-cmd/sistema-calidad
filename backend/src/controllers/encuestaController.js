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
