import { Router } from 'express';
import { verificarToken, verificarRol } from '../middleware/auth.js';
import * as auth from '../controllers/authController.js';
import * as doc from '../controllers/documentoController.js';
import * as proc from '../controllers/procesoController.js';
import * as acr from '../controllers/acreditacionController.js';
import * as aud from '../controllers/auditoriaController.js';
import * as capa from '../controllers/capaController.js';
import * as riesgo from '../controllers/riesgoController.js';
import * as ind from '../controllers/indicadorController.js';
import * as enc from '../controllers/encuestaController.js';
import * as dash from '../controllers/dashboardController.js';

const r = Router();

// AUTH
r.post('/auth/login', auth.login);
r.post('/auth/registrar', auth.registrar);
r.get('/auth/perfil', verificarToken, auth.perfil);
r.get('/usuarios', verificarToken, auth.listarUsuarios);
r.get('/usuarios/:id', verificarToken, auth.obtenerUsuario);
r.put('/usuarios/:id', verificarToken, auth.editarUsuario);
r.put('/usuarios/:id/password', verificarToken, auth.cambiarPassword);

// DASHBOARD
r.get('/dashboard', verificarToken, dash.resumen);

// DOCUMENTOS
r.get('/documentos-tipos', verificarToken, doc.listarTipos);
r.get('/reportes/documentos', verificarToken, doc.reporte);
r.get('/documentos', verificarToken, doc.listar);
r.post('/documentos', verificarToken, doc.crear);
r.put('/documentos/:id', verificarToken, doc.actualizar);
r.delete('/documentos/:id', verificarToken, verificarRol('admin', 'gestor_calidad'), doc.eliminar);

// PROCESOS
r.get('/reportes/procesos', verificarToken, proc.reporte);
r.get('/macroprocesos', verificarToken, proc.listarMacroprocesos);
r.post('/macroprocesos', verificarToken, proc.crearMacroproceso);
r.get('/procesos', verificarToken, proc.listarProcesos);
r.post('/procesos', verificarToken, proc.crearProceso);
r.put('/procesos/:id', verificarToken, proc.actualizarProceso);
r.get('/procesos/:proceso_id/actividades', verificarToken, proc.listarActividades);
r.get('/procesos/:id/documentos', verificarToken, proc.listarDocumentosProceso);
r.post('/procesos/:id/asociar-documento', verificarToken, proc.asociarDocumento);
r.post('/actividades', verificarToken, proc.crearActividad);

// ACREDITACION
r.get('/reportes/acreditacion', verificarToken, acr.reporte);
r.get('/estandares', verificarToken, acr.listarEstandares);
r.post('/estandares', verificarToken, acr.crearEstandar);
r.get('/estandares/:estandar_id/factores', verificarToken, acr.listarFactores);
r.post('/factores', verificarToken, acr.crearFactor);
r.get('/autoevaluaciones', verificarToken, acr.listarAutoevaluaciones);
r.post('/autoevaluaciones', verificarToken, acr.crearAutoevaluacion);
r.get('/autoevaluaciones/:id/detalle', verificarToken, acr.obtenerAutoevaluacionDetalle);
r.put('/autoevaluaciones/:id/puntaje', verificarToken, acr.calcularPuntajeTotal);
r.post('/evaluaciones-criterio', verificarToken, acr.evaluarCriterio);
r.get('/certificaciones', verificarToken, acr.listarCertificaciones);
r.post('/certificaciones', verificarToken, acr.crearCertificacion);
r.get('/certificaciones/:id/requisitos', verificarToken, acr.listarRequisitos);
r.post('/requisitos', verificarToken, acr.crearRequisito);
r.patch('/requisitos/:id', verificarToken, acr.actualizarRequisito);

// AUDITORIAS
r.get('/reportes/auditorias', verificarToken, aud.reporte);
r.get('/planes-auditoria', verificarToken, aud.listarPlanes);
r.post('/planes-auditoria', verificarToken, aud.crearPlan);
r.patch('/planes-auditoria/:id', verificarToken, aud.actualizarPlan);
r.get('/hallazgos', verificarToken, aud.listarHallazgos);
r.post('/hallazgos', verificarToken, aud.crearHallazgo);
r.patch('/hallazgos/:id', verificarToken, aud.actualizarHallazgo);
r.get('/auditorias', verificarToken, aud.listarAuditorias);
r.post('/auditorias', verificarToken, aud.crearAuditoriaPlan);
r.get('/auditorias/:id/hallazgos', verificarToken, aud.listarHallazgosDePlan);
r.get('/planes-auditoria/:id/estadisticas', verificarToken, aud.estadisticasPlan);
r.get('/programas', verificarToken, aud.listarProgramas);

// CAPAS
r.get('/reportes/capas', verificarToken, capa.reporte);
r.get('/capas', verificarToken, capa.listar);
r.post('/capas', verificarToken, capa.crear);
r.patch('/capas/:id/estado', verificarToken, capa.actualizarEstado);
r.post('/capas/:id/seguimiento', verificarToken, capa.registrarSeguimiento);
r.get('/capas/:id/seguimientos', verificarToken, capa.listarSeguimientos);

// RIESGOS
r.get('/reportes/riesgos', verificarToken, riesgo.reporte);
r.get('/riesgos/matriz', verificarToken, riesgo.matriz);
r.get('/riesgos', verificarToken, riesgo.listar);
r.post('/riesgos', verificarToken, riesgo.crear);
r.patch('/riesgos/:id', verificarToken, riesgo.actualizar);
r.get('/riesgos/:riesgo_id/historial', verificarToken, riesgo.listarHistorial);
r.get('/riesgos/:riesgo_id/mitigaciones', verificarToken, riesgo.listarMitigaciones);
r.post('/mitigaciones', verificarToken, riesgo.crearMitigacion);

// INDICADORES
r.get('/reportes/indicadores', verificarToken, ind.reporte);
r.get('/reportes/indicadores/excel', verificarToken, ind.exportarExcel);
r.get('/indicadores/resumen', verificarToken, ind.obtenerResumen);
r.get('/indicadores/exportar-csv', verificarToken, ind.exportarCSV);
r.get('/indicadores', verificarToken, ind.listar);
r.post('/indicadores', verificarToken, ind.crear);
r.get('/indicadores/:indicador_id/mediciones', verificarToken, ind.listarMediciones);
r.post('/mediciones', verificarToken, ind.registrarMedicion);

// ENCUESTAS — orden importa: rutas específicas ANTES de /:id
r.get('/reportes/encuestas', verificarToken, enc.reporte);
r.get('/encuestas/dashboard', verificarToken, enc.dashboardGlobal);           // ANTES de /:id
r.get('/encuestas', verificarToken, enc.listar);
r.post('/encuestas', verificarToken, enc.crear);
r.post('/encuestas/responder', verificarToken, enc.responder);                // ANTES de /:id
r.get('/encuestas/:id/resultados', verificarToken, enc.resultados);
r.get('/encuestas/:id/resultados-detalle', verificarToken, enc.resultadosDetalle);
r.patch('/encuestas/:id/publicar', verificarToken, enc.publicar);
r.get('/encuestas/:id', verificarToken, enc.obtenerConPreguntas);             // AL FINAL

export default r;
