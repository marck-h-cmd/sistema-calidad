-- ============================================================
-- SISTEMA DE GESTIÓN DE LA CALIDAD (SGC)
-- UNIVERSIDAD NACIONAL DE TRUJILLO
-- PostgreSQL 17+
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SCHEMA IF NOT EXISTS sgc;
SET search_path TO sgc;

-- Drop existing tables to allow re-seeding
DROP TABLE IF EXISTS respuestas_encuesta CASCADE;
DROP TABLE IF EXISTS preguntas_encuesta CASCADE;
DROP TABLE IF EXISTS encuestas CASCADE;
DROP TABLE IF EXISTS mediciones_indicador CASCADE;
DROP TABLE IF EXISTS indicadores CASCADE;
DROP TABLE IF EXISTS planes_mitigacion CASCADE;
DROP TABLE IF EXISTS historial_riesgos CASCADE;
DROP TABLE IF EXISTS riesgos CASCADE;
DROP TABLE IF EXISTS seguimientos_capa CASCADE;
DROP TABLE IF EXISTS capas CASCADE;
DROP TABLE IF EXISTS hallazgos CASCADE;
DROP TABLE IF EXISTS planes_auditoria CASCADE;
DROP TABLE IF EXISTS evaluaciones_criterio CASCADE;
DROP TABLE IF EXISTS autoevaluaciones CASCADE;
DROP TABLE IF EXISTS factores_criterio CASCADE;
DROP TABLE IF EXISTS estandares_acreditacion CASCADE;
DROP TABLE IF EXISTS documentos CASCADE;
DROP TABLE IF EXISTS actividades_proceso CASCADE;
DROP TABLE IF EXISTS procesos CASCADE;
DROP TABLE IF EXISTS macroprocesos CASCADE;
DROP TABLE IF EXISTS tipos_documento CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;


-- ============================================================
-- USUARIOS
-- ============================================================
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(20) UNIQUE NOT NULL,
  nombres VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  correo VARCHAR(150) UNIQUE NOT NULL,
  contrasena_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(50) NOT NULL CHECK (rol IN ('admin','gestor_calidad','auditor','docente','estudiante','egresado')),
  facultad VARCHAR(100),
  escuela VARCHAR(100),
  activo BOOLEAN DEFAULT TRUE,
  ultimo_acceso TIMESTAMP,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modificado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  creado_por UUID,
  modificado_por UUID
);
CREATE INDEX idx_usuarios_rol ON usuarios(rol);
CREATE INDEX idx_usuarios_activo ON usuarios(activo);

-- ============================================================
-- TIPOS DOCUMENTO
-- ============================================================
CREATE TABLE tipos_documento (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(20) UNIQUE NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  requiere_aprobacion BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modificado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  creado_por UUID REFERENCES usuarios(id),
  modificado_por UUID REFERENCES usuarios(id)
);

-- ============================================================
-- MACROPROCESOS
-- ============================================================
CREATE TABLE macroprocesos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(20) UNIQUE NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  responsable_id UUID REFERENCES usuarios(id),
  tipo VARCHAR(30) CHECK (tipo IN ('estrategico','misional','apoyo','evaluacion')),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modificado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  creado_por UUID REFERENCES usuarios(id),
  modificado_por UUID REFERENCES usuarios(id)
);

-- ============================================================
-- PROCESOS
-- ============================================================
CREATE TABLE procesos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  macroproceso_id UUID REFERENCES macroprocesos(id),
  codigo VARCHAR(20) UNIQUE NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  objetivo TEXT,
  alcance TEXT,
  responsable_id UUID REFERENCES usuarios(id),
  estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo','inactivo','en_mejora')),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modificado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  creado_por UUID REFERENCES usuarios(id),
  modificado_por UUID REFERENCES usuarios(id)
);

-- ============================================================
-- ACTIVIDADES PROCESO
-- ============================================================
CREATE TABLE actividades_proceso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id UUID NOT NULL REFERENCES procesos(id) ON DELETE CASCADE,
  codigo VARCHAR(20) NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  secuencia INTEGER NOT NULL,
  responsable_id UUID REFERENCES usuarios(id),
  entradas TEXT,
  salidas TEXT,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modificado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  creado_por UUID REFERENCES usuarios(id),
  modificado_por UUID REFERENCES usuarios(id)
);

-- ============================================================
-- DOCUMENTOS
-- ============================================================
CREATE TABLE documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(50) UNIQUE NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  tipo_documento_id INTEGER NOT NULL REFERENCES tipos_documento(id),
  proceso_id UUID REFERENCES procesos(id),
  version_actual INTEGER DEFAULT 1,
  estado VARCHAR(20) DEFAULT 'borrador' CHECK (estado IN ('borrador','en_revision','aprobado','obsoleto','archivado')),
  contenido TEXT,
  archivo_url VARCHAR(500),
  fecha_vigencia DATE,
  fecha_revision DATE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modificado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  creado_por UUID REFERENCES usuarios(id),
  modificado_por UUID REFERENCES usuarios(id)
);
CREATE INDEX idx_documentos_estado ON documentos(estado);
CREATE INDEX idx_documentos_tipo ON documentos(tipo_documento_id);

-- ============================================================
-- ESTANDARES ACREDITACION
-- ============================================================
CREATE TABLE estandares_acreditacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  organizacion VARCHAR(100),
  descripcion TEXT,
  vigente_desde DATE,
  vigente_hasta DATE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  creado_por UUID REFERENCES usuarios(id)
);

-- ============================================================
-- FACTORES CRITERIO
-- ============================================================
CREATE TABLE factores_criterio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estandar_id UUID NOT NULL REFERENCES estandares_acreditacion(id) ON DELETE CASCADE,
  codigo VARCHAR(20) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  peso DECIMAL(5,2),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  creado_por UUID REFERENCES usuarios(id)
);

-- ============================================================
-- AUTOEVALUACIONES
-- ============================================================
CREATE TABLE autoevaluaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estandar_id UUID NOT NULL REFERENCES estandares_acreditacion(id),
  periodo VARCHAR(20) NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE,
  estado VARCHAR(20) DEFAULT 'en_proceso' CHECK (estado IN ('en_proceso','completada','certificada')),
  puntaje_total DECIMAL(5,2),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  creado_por UUID REFERENCES usuarios(id)
);

-- ============================================================
-- EVALUACIONES CRITERIO
-- ============================================================
CREATE TABLE evaluaciones_criterio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  autoevaluacion_id UUID NOT NULL REFERENCES autoevaluaciones(id) ON DELETE CASCADE,
  factor_id UUID NOT NULL REFERENCES factores_criterio(id),
  cumplimiento VARCHAR(20) CHECK (cumplimiento IN ('cumple','cumple_parcial','no_cumple','no_aplica')),
  puntaje DECIMAL(5,2),
  evidencias TEXT,
  observaciones TEXT,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modificado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  creado_por UUID REFERENCES usuarios(id),
  modificado_por UUID REFERENCES usuarios(id)
);

-- ============================================================
-- PLANES AUDITORIA
-- ============================================================
CREATE TABLE planes_auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  tipo VARCHAR(30) CHECK (tipo IN ('interna','externa','especial')),
  alcance TEXT,
  fecha_programada DATE NOT NULL,
  fecha_ejecucion DATE,
  estado VARCHAR(20) DEFAULT 'planificado' CHECK (estado IN ('planificado','en_ejecucion','ejecutado','cerrado')),
  lider_id UUID REFERENCES usuarios(id),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modificado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  creado_por UUID REFERENCES usuarios(id),
  modificado_por UUID REFERENCES usuarios(id)
);

-- ============================================================
-- HALLAZGOS
-- ============================================================
CREATE TABLE hallazgos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES planes_auditoria(id),
  tipo VARCHAR(30) CHECK (tipo IN ('no_conformidad','observacion','oportunidad_mejora')),
  descripcion TEXT NOT NULL,
  area_proceso_id UUID REFERENCES procesos(id),
  gravedad VARCHAR(20) CHECK (gravedad IN ('baja','media','alta','critica')),
  estado VARCHAR(20) DEFAULT 'abierto' CHECK (estado IN ('abierto','en_tratamiento','cerrado')),
  fecha_cierre DATE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modificado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  creado_por UUID REFERENCES usuarios(id),
  modificado_por UUID REFERENCES usuarios(id)
);

-- ============================================================
-- CAPAS
-- ============================================================
CREATE TABLE capas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(50) UNIQUE NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('correctiva','preventiva','mejora')),
  hallazgo_id UUID REFERENCES hallazgos(id),
  descripcion TEXT NOT NULL,
  causa_raiz TEXT,
  accion_propuesta TEXT NOT NULL,
  responsable_id UUID NOT NULL REFERENCES usuarios(id),
  fecha_implementacion DATE,
  fecha_verificacion DATE,
  evidencia_url VARCHAR(500),
  estado VARCHAR(20) DEFAULT 'registrada' CHECK (estado IN ('registrada','en_implementacion','implementada','verificada','cerrada','rechazada')),
  efectividad VARCHAR(20) CHECK (efectividad IN ('efectiva','parcial','no_efectiva','pendiente')),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modificado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  creado_por UUID REFERENCES usuarios(id),
  modificado_por UUID REFERENCES usuarios(id)
);

-- ============================================================
-- SEGUIMIENTOS CAPA
-- ============================================================
CREATE TABLE seguimientos_capa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capa_id UUID NOT NULL REFERENCES capas(id) ON DELETE CASCADE,
  fecha_seguimiento DATE NOT NULL,
  avance INTEGER NOT NULL CHECK (avance BETWEEN 0 AND 100),
  observaciones TEXT,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  creado_por UUID REFERENCES usuarios(id)
);

-- ============================================================
-- RIESGOS
-- ============================================================
CREATE TABLE riesgos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  proceso_id UUID REFERENCES procesos(id),
  categoria VARCHAR(50) CHECK (categoria IN ('estrategico','operativo','academico','financiero','legal','tecnologico','reputacional')),
  probabilidad INTEGER CHECK (probabilidad BETWEEN 1 AND 5),
  impacto INTEGER CHECK (impacto BETWEEN 1 AND 5),
  estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo','mitigado','aceptado','eliminado')),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modificado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  creado_por UUID REFERENCES usuarios(id),
  modificado_por UUID REFERENCES usuarios(id)
);

-- ============================================================
-- HISTORIAL RIESGOS
-- ============================================================
CREATE TABLE historial_riesgos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  riesgo_id UUID NOT NULL REFERENCES riesgos(id) ON DELETE CASCADE,
  estado_anterior VARCHAR(20),
  estado_nuevo VARCHAR(20),
  cambiado_por UUID REFERENCES usuarios(id),
  fecha_cambio TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- PLANES MITIGACION
-- ============================================================
CREATE TABLE planes_mitigacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  riesgo_id UUID NOT NULL REFERENCES riesgos(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  acciones TEXT,
  responsable_id UUID REFERENCES usuarios(id),
  fecha_inicio DATE,
  fecha_fin DATE,
  estado VARCHAR(20) DEFAULT 'planificado' CHECK (estado IN ('planificado','en_ejecucion','completado')),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  creado_por UUID REFERENCES usuarios(id)
);

-- ============================================================
-- INDICADORES
-- ============================================================
CREATE TABLE indicadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  proceso_id UUID REFERENCES procesos(id),
  tipo VARCHAR(30) CHECK (tipo IN ('eficacia','eficiencia','impacto','satisfaccion')),
  formula_calculo TEXT,
  unidad_medida VARCHAR(50),
  meta DECIMAL(10,2),
  frecuencia_medicion VARCHAR(20) CHECK (frecuencia_medicion IN ('diaria','semanal','mensual','trimestral','semestral','anual')),
  estado VARCHAR(20) DEFAULT 'activo',
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modificado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  creado_por UUID REFERENCES usuarios(id),
  modificado_por UUID REFERENCES usuarios(id)
);

-- ============================================================
-- MEDICIONES INDICADOR
-- ============================================================
CREATE TABLE mediciones_indicador (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicador_id UUID NOT NULL REFERENCES indicadores(id) ON DELETE CASCADE,
  periodo VARCHAR(20) NOT NULL,
  valor_real DECIMAL(10,2),
  valor_esperado DECIMAL(10,2),
  cumplimiento DECIMAL(5,2),
  analisis_tendencia TEXT,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  creado_por UUID REFERENCES usuarios(id)
);

-- ============================================================
-- ENCUESTAS
-- ============================================================
CREATE TABLE encuestas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(50) UNIQUE NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT,
  dirigido_a VARCHAR(30) CHECK (dirigido_a IN ('estudiantes','docentes','egresados','administrativos','todos')),
  fecha_inicio DATE,
  fecha_fin DATE,
  anonima BOOLEAN DEFAULT TRUE,
  estado VARCHAR(20) DEFAULT 'borrador' CHECK (estado IN ('borrador','publicada','en_curso','cerrada','archivada')),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modificado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  creado_por UUID REFERENCES usuarios(id),
  modificado_por UUID REFERENCES usuarios(id)
);

-- ============================================================
-- PREGUNTAS ENCUESTA
-- ============================================================
CREATE TABLE preguntas_encuesta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encuesta_id UUID NOT NULL REFERENCES encuestas(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  tipo VARCHAR(30) CHECK (tipo IN ('likert_5','si_no','multiple','abierta','numerica')),
  orden INTEGER NOT NULL,
  obligatoria BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- RESPUESTAS ENCUESTA
-- ============================================================
CREATE TABLE respuestas_encuesta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encuesta_id UUID NOT NULL REFERENCES encuestas(id),
  pregunta_id UUID NOT NULL REFERENCES preguntas_encuesta(id),
  usuario_id UUID REFERENCES usuarios(id),
  valor_texto TEXT,
  valor_numerico DECIMAL(10,2),
  enviado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_respuestas_encuesta ON respuestas_encuesta(encuesta_id, pregunta_id);

-- ============================================================
-- FUNCION TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION actualizar_modificado_en()
RETURNS TRIGGER AS $$
BEGIN
  NEW.modificado_en = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_usuarios_mod BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION actualizar_modificado_en();
CREATE TRIGGER trg_documentos_mod BEFORE UPDATE ON documentos FOR EACH ROW EXECUTE FUNCTION actualizar_modificado_en();
CREATE TRIGGER trg_procesos_mod BEFORE UPDATE ON procesos FOR EACH ROW EXECUTE FUNCTION actualizar_modificado_en();
CREATE TRIGGER trg_hallazgos_mod BEFORE UPDATE ON hallazgos FOR EACH ROW EXECUTE FUNCTION actualizar_modificado_en();
CREATE TRIGGER trg_capas_mod BEFORE UPDATE ON capas FOR EACH ROW EXECUTE FUNCTION actualizar_modificado_en();
CREATE TRIGGER trg_riesgos_mod BEFORE UPDATE ON riesgos FOR EACH ROW EXECUTE FUNCTION actualizar_modificado_en();
CREATE TRIGGER trg_indicadores_mod BEFORE UPDATE ON indicadores FOR EACH ROW EXECUTE FUNCTION actualizar_modificado_en();
CREATE TRIGGER trg_encuestas_mod BEFORE UPDATE ON encuestas FOR EACH ROW EXECUTE FUNCTION actualizar_modificado_en();
CREATE TRIGGER trg_planes_auditoria_mod BEFORE UPDATE ON planes_auditoria FOR EACH ROW EXECUTE FUNCTION actualizar_modificado_en();

-- ============================================================
-- DATOS INICIALES (SEED COMPLETO)
-- ============================================================

-- Tipos de Documentos
INSERT INTO tipos_documento (codigo, nombre, descripcion, requiere_aprobacion) VALUES
('POL', 'Política', 'Documentos de política institucional', TRUE),
('MAN', 'Manual', 'Manuales de procedimiento y operación', TRUE),
('PRO', 'Procedimiento', 'Procedimientos específicos', TRUE),
('INS', 'Instructivo', 'Instructivos de trabajo', FALSE),
('FOR', 'Formato', 'Formatos y plantillas', FALSE),
('RES', 'Resolución', 'Resoluciones rectales y administrativas', TRUE),
('DIR', 'Directiva', 'Directivas institucionales', TRUE);

-- Usuarios (Diversos roles)
INSERT INTO usuarios (codigo, nombres, apellidos, correo, contrasena_hash, rol, facultad, escuela, activo) VALUES
('ADM-001', 'Administrador', 'Sistema SGC', 'admin@unitru.edu.pe', '$2b$10$xRhvyOxdGJsLHW/Hj3jyeOSPloSZxmf6K71DNespGMjk.o5agxbvy', 'admin', 'Rectorado', 'Sistemas', TRUE),
('GES-001', 'María', 'García López', 'maria.garcia@unitru.edu.pe', '$2b$10$xRhvyOxdGJsLHW/Hj3jyeOSPloSZxmf6K71DNespGMjk.o5agxbvy', 'gestor_calidad', 'Asuntos Académicos', 'Calidad', TRUE),
('GES-002', 'Pedro', 'Mendoza Rivera', 'pedro.mendoza@unitru.edu.pe', '$2b$10$xRhvyOxdGJsLHW/Hj3jyeOSPloSZxmf6K71DNespGMjk.o5agxbvy', 'gestor_calidad', 'Ingeniería', 'Calidad', TRUE),
('AUD-001', 'Juan', 'Rodríguez Pérez', 'juan.rodriguez@unitru.edu.pe', '$2b$10$xRhvyOxdGJsLHW/Hj3jyeOSPloSZxmf6K71DNespGMjk.o5agxbvy', 'auditor', 'Calidad Institucional', 'Auditoría', TRUE),
('AUD-002', 'Isabel', 'Flores Castro', 'isabel.flores@unitru.edu.pe', '$2b$10$xRhvyOxdGJsLHW/Hj3jyeOSPloSZxmf6K71DNespGMjk.o5agxbvy', 'auditor', 'Calidad Institucional', 'Auditoría', TRUE),
('DOC-001', 'Carlos', 'Morales Silva', 'carlos.morales@unitru.edu.pe', '$2b$10$xRhvyOxdGJsLHW/Hj3jyeOSPloSZxmf6K71DNespGMjk.o5agxbvy', 'docente', 'Ingeniería', 'Sistemas', TRUE),
('DOC-002', 'Ana', 'López Martínez', 'ana.lopez@unitru.edu.pe', '$2b$10$xRhvyOxdGJsLHW/Hj3jyeOSPloSZxmf6K71DNespGMjk.o5agxbvy', 'docente', 'Ingeniería', 'Sistemas', TRUE),
('DOC-003', 'Roberto', 'Gutiérrez Díaz', 'roberto.gutierrez@unitru.edu.pe', '$2b$10$xRhvyOxdGJsLHW/Hj3jyeOSPloSZxmf6K71DNespGMjk.o5agxbvy', 'docente', 'Ciencias', 'Matemática', TRUE),
('DOC-004', 'Laura', 'Sánchez Torres', 'laura.sanchez@unitru.edu.pe', '$2b$10$xRhvyOxdGJsLHW/Hj3jyeOSPloSZxmf6K71DNespGMjk.o5agxbvy', 'docente', 'Humanidades', 'Literatura', TRUE),
('EST-001', 'Jorge', 'Vargas Huaman', 'jorge.vargas@unitru.edu.pe', '$2b$10$xRhvyOxdGJsLHW/Hj3jyeOSPloSZxmf6K71DNespGMjk.o5agxbvy', 'estudiante', 'Ingeniería', 'Sistemas', TRUE),
('EST-002', 'Claudia', 'Rojas Córdova', 'claudia.rojas@unitru.edu.pe', '$2b$10$xRhvyOxdGJsLHW/Hj3jyeOSPloSZxmf6K71DNespGMjk.o5agxbvy', 'estudiante', 'Ingeniería', 'Civil', TRUE),
('EST-003', 'Diego', 'Campos Quispe', 'diego.campos@unitru.edu.pe', '$2b$10$xRhvyOxdGJsLHW/Hj3jyeOSPloSZxmf6K71DNespGMjk.o5agxbvy', 'estudiante', 'Ciencias', 'Física', TRUE),
('EGR-001', 'Fernando', 'Herrera López', 'fernando.herrera@unitru.edu.pe', '$2b$10$xRhvyOxdGJsLHW/Hj3jyeOSPloSZxmf6K71DNespGMjk.o5agxbvy', 'egresado', 'Ingeniería', 'Sistemas', TRUE);

-- Macroprocesos
INSERT INTO macroprocesos (codigo, nombre, descripcion, tipo) VALUES
('MP-001', 'Gestión Estratégica', 'Procesos de planeación y dirección estratégica', 'estrategico'),
('MP-002', 'Gestión Académica', 'Procesos misionales de formación académica', 'misional'),
('MP-003', 'Gestión Administrativo-Financiera', 'Procesos de apoyo administrativo y financiero', 'apoyo'),
('MP-004', 'Autoevaluación Institucional', 'Procesos de evaluación y mejora continua', 'evaluacion'),
('MP-005', 'Investigación y Extensión', 'Procesos de investigación y vinculación social', 'misional');

-- Procesos
INSERT INTO procesos (macroproceso_id, codigo, nombre, objetivo, alcance, estado)
SELECT mp.id, v.codigo, v.nombre, v.objetivo, v.alcance, v.estado FROM
(VALUES
('MP-001', 'PROC-001', 'Planificación Estratégica', 'Definir la dirección estratégica y metas de la universidad', 'Todas las facultades', 'activo'),
('MP-001', 'PROC-002', 'Asignación de Recursos', 'Distribuir presupuesto de forma equitativa', 'Rectorado y facultades', 'activo'),
('MP-002', 'PROC-003', 'Diseño Curricular', 'Diseñar y actualizar planes académicos de calidad', 'Todas las escuelas', 'activo'),
('MP-002', 'PROC-004', 'Admisión de Estudiantes', 'Seleccionar estudiantes según criterios de calidad', 'Admisión', 'activo'),
('MP-002', 'PROC-005', 'Docencia y Evaluación', 'Impartir docencia de calidad y evaluar aprendizajes', 'Todos los docentes', 'activo'),
('MP-003', 'PROC-006', 'Gestión de RRHH', 'Administrar recursos humanos de la institución', 'Toda la universidad', 'activo'),
('MP-003', 'PROC-007', 'Adquisiciones', 'Procurar bienes y servicios de forma transparente', 'Área administrativa', 'activo'),
('MP-003', 'PROC-008', 'Gestión Financiera', 'Administrar ingresos y egresos institucionales', 'Área financiera', 'activo'),
('MP-004', 'PROC-009', 'Evaluación Institucional', 'Evaluar el desempeño de todas las áreas', 'Todas las áreas', 'activo'),
('MP-005', 'PROC-010', 'Investigación Científica', 'Fomentar y coordinar investigación científica', 'Investigadores', 'activo')
) v(mp_codigo, codigo, nombre, objetivo, alcance, estado)
JOIN macroprocesos mp ON mp.codigo = v.mp_codigo;

-- Documentos
INSERT INTO documentos (codigo, titulo, tipo_documento_id, proceso_id, version_actual, estado, contenido)
SELECT v.codigo, v.titulo, td.id, p.id, v.version, v.estado, v.contenido FROM
(VALUES
('DOC-POL-001', 'Política de Calidad Institucional', 'POL', 'PROC-009', 1, 'aprobado', 'Política integral para asegurar la calidad en todos los procesos'),
('DOC-MAN-001', 'Manual de Procedimientos Académicos', 'MAN', 'PROC-005', 2, 'aprobado', 'Manual con procedimientos detallados para la impartición de clases'),
('DOC-PRO-001', 'Procedimiento de Admisión', 'PRO', 'PROC-004', 1, 'aprobado', 'Procedimiento establecido para la admisión de nuevos estudiantes'),
('DOC-FOR-001', 'Formato de Evaluación Docente', 'FOR', 'PROC-005', 3, 'aprobado', 'Formato estándar para evaluar desempeño docente'),
('DOC-MAN-002', 'Manual de Gestión Administrativa', 'MAN', 'PROC-006', 1, 'aprobado', 'Procedimientos para la gestión de recursos humanos'),
('DOC-POL-002', 'Política de Investigación', 'POL', 'PROC-010', 1, 'aprobado', 'Política que fomenta la investigación científica'),
('DOC-DIR-001', 'Directiva de Asuntos Académicos', 'DIR', 'PROC-003', 1, 'aprobado', 'Directiva para la conducción de asuntos académicos'),
('DOC-RES-001', 'Resolución de Creación de Programas', 'RES', 'PROC-003', 1, 'aprobado', 'Resolución que autoriza nuevos programas académicos'),
('DOC-INS-001', 'Instructivo de Uso del Portal Académico', 'INS', 'PROC-004', 2, 'aprobado', 'Guía de uso del sistema de portal académico'),
('DOC-FOR-002', 'Formato de Informe de Investigación', 'FOR', 'PROC-010', 1, 'aprobado', 'Formato estandarizado para reportes de investigación')
) v(codigo, titulo, tipo_codigo, proc_codigo, version, estado, contenido)
JOIN tipos_documento td ON td.codigo = v.tipo_codigo
JOIN procesos p ON p.codigo = v.proc_codigo;

-- Estandares de Acreditación
INSERT INTO estandares_acreditacion (codigo, nombre, organizacion, descripcion) VALUES
('ACRED-001', 'Factor 1: Misión y Proyecto Institucional', 'SINEACE', 'Evalúa la claridad y pertinencia de la misión institucional'),
('ACRED-002', 'Factor 2: Organización, Gestión y Administración', 'SINEACE', 'Evalúa la estructura organizacional y gestión eficiente'),
('ACRED-003', 'Factor 3: Académico y Formación', 'SINEACE', 'Evalúa la calidad académica y pertinencia de la formación'),
('ACRED-004', 'Factor 4: Investigación y Producción', 'SINEACE', 'Evalúa las actividades de investigación y producción científica'),
('ACRED-005', 'Factor 5: Responsabilidad Social', 'SINEACE', 'Evalúa el compromiso con la responsabilidad social');

-- Autoevaluaciones
INSERT INTO autoevaluaciones (estandar_id, periodo, fecha_inicio, fecha_fin, estado, puntaje_total)
SELECT e.id, v.periodo, v.fecha_inicio::DATE, v.fecha_fin::DATE, v.estado, v.puntaje FROM
(VALUES
('ACRED-001', '2024-01', '2024-01-15', '2024-03-30', 'completada', 85.50),
('ACRED-002', '2024-01', '2024-01-15', '2024-03-30', 'completada', 78.75),
('ACRED-003', '2024-01', '2024-01-15', '2024-03-30', 'en_proceso', 82.25),
('ACRED-004', '2024-02', '2024-04-01', NULL, 'en_proceso', NULL),
('ACRED-005', '2024-02', '2024-04-01', NULL, 'en_proceso', NULL)
) v(estandar_codigo, periodo, fecha_inicio, fecha_fin, estado, puntaje)
JOIN estandares_acreditacion e ON e.codigo = v.estandar_codigo;

-- Indicadores (con valores realistas)
INSERT INTO indicadores (codigo, nombre, descripcion, proceso_id, tipo, formula_calculo, unidad_medida, meta, frecuencia_medicion)
SELECT v.codigo, v.nombre, v.descripcion, p.id, v.tipo, v.formula, v.unidad, v.meta, v.frecuencia FROM
(VALUES
('IND-001', 'Tasa de Retención Estudiantil', 'Porcentaje de estudiantes que continúan sus estudios', 'PROC-004', 'eficacia', 'Estudiantes retenidos / Total estudiantes * 100', '%', 85.00, 'anual'),
('IND-002', 'Satisfacción Docente', 'Nivel de satisfacción de docentes con la institución', 'PROC-005', 'satisfaccion', 'Promedio de calificaciones de encuesta', 'puntos', 8.50, 'semestral'),
('IND-003', 'Eficiencia Operativa', 'Indicador de eficiencia en procesos administrativos', 'PROC-006', 'eficiencia', 'Procesos completados a tiempo / Total procesos * 100', '%', 90.00, 'mensual'),
('IND-004', 'Calidad Académica', 'Promedio de calificaciones de estudiantes', 'PROC-005', 'eficacia', 'Suma de promedios / Total estudiantes', 'puntos', 14.50, 'mensual'),
('IND-005', 'Tasa de Aprobación Docentes', 'Porcentaje de docentes evaluados favorablemente', 'PROC-005', 'eficacia', 'Docentes aprobados / Total docentes * 100', '%', 95.00, 'anual'),
('IND-006', 'Publicaciones Científicas', 'Número de artículos científicos publicados', 'PROC-010', 'impacto', 'Total de artículos publicados', 'cantidad', 25.00, 'anual'),
('IND-007', 'Gastos en Investigación', 'Inversión en investigación científica', 'PROC-010', 'eficiencia', 'Presupuesto investigación / Presupuesto total * 100', '%', 8.00, 'anual')
) v(codigo, nombre, descripcion, proc_codigo, tipo, formula, unidad, meta, frecuencia)
JOIN procesos p ON p.codigo = v.proc_codigo;

-- Riesgos (múltiples categorías)
INSERT INTO riesgos (codigo, nombre, descripcion, proceso_id, categoria, probabilidad, impacto, estado)
SELECT v.codigo, v.nombre, v.descripcion, p.id, v.categoria, v.probabilidad, v.impacto, v.estado FROM
(VALUES
('RIESGO-001', 'Deserción Estudiantil Alta', 'Riesgo de aumento significativo en la deserción', 'PROC-004', 'academico', 3, 4, 'activo'),
('RIESGO-002', 'Deficiencia Presupuestaria', 'Riesgo de recursos insuficientes para operaciones', 'PROC-008', 'financiero', 2, 5, 'activo'),
('RIESGO-003', 'Infraestructura Tecnológica Obsoleta', 'Riesgo de tecnología deficiente', 'PROC-006', 'operativo', 3, 3, 'mitigado'),
('RIESGO-004', 'Incumplimiento Regulatorio', 'Riesgo de no conformidad con normativa vigente', 'PROC-009', 'legal', 2, 4, 'aceptado'),
('RIESGO-005', 'Fuga de Talento Docente', 'Riesgo de pérdida de docentes de calidad', 'PROC-006', 'operativo', 2, 4, 'activo'),
('RIESGO-006', 'Baja Producción Científica', 'Riesgo de bajo nivel de investigación', 'PROC-010', 'academico', 3, 3, 'activo'),
('RIESGO-007', 'Crisis de Reputación Institucional', 'Riesgo de daño a la imagen institucional', 'PROC-001', 'reputacional', 1, 5, 'mitigado')
) v(codigo, nombre, descripcion, proc_codigo, categoria, probabilidad, impacto, estado)
JOIN procesos p ON p.codigo = v.proc_codigo;

-- Planes de Mitigación
INSERT INTO planes_mitigacion (riesgo_id, descripcion, acciones, responsable_id, fecha_inicio, fecha_fin, estado)
SELECT r.id, v.descripcion, v.acciones, u.id, v.fecha_inicio::DATE, v.fecha_fin::DATE, v.estado FROM
(VALUES
('RIESGO-001', 'Plan para reducir deserción estudiantil', 'Implementar programas de tutoría y apoyo financiero', 'GES-002', '2024-01-01', '2024-12-31', 'en_ejecucion'),
('RIESGO-002', 'Optimización de recursos financieros', 'Elaborar presupuesto participativo y revisión de gastos', 'GES-001', '2024-02-01', '2024-06-30', 'planificado'),
('RIESGO-005', 'Retención de docentes destacados', 'Implementar bonificación por investigación y docencia', 'GES-002', '2024-01-15', '2024-12-31', 'en_ejecucion')
) v(riesgo_codigo, descripcion, acciones, responsable_codigo, fecha_inicio, fecha_fin, estado)
JOIN riesgos r ON r.codigo = v.riesgo_codigo
JOIN usuarios u ON u.codigo = v.responsable_codigo;

-- Planes de Auditoría (detallados)
INSERT INTO planes_auditoria (codigo, nombre, tipo, alcance, fecha_programada, fecha_ejecucion, estado, lider_id)
SELECT v.codigo, v.nombre, v.tipo, v.alcance, v.fecha_prog::DATE, v.fecha_ejec::DATE, v.estado, u.id FROM
(VALUES
('PLAN-AUD-2024-01', 'Auditoría Interna Q1 2024', 'interna', 'Procesos administrativos y financieros', '2024-03-15', '2024-03-20', 'ejecutado', 'AUD-001'),
('PLAN-AUD-2024-02', 'Auditoría Interna Procesos Académicos', 'interna', 'Calidad de docencia y evaluación', '2024-06-15', NULL, 'en_ejecucion', 'AUD-002'),
('PLAN-AUD-2024-03', 'Auditoría Externa SINEACE', 'externa', 'Acreditación institucional completa', '2024-11-01', NULL, 'planificado', 'AUD-001'),
('PLAN-AUD-2024-04', 'Auditoría Especial Investigación', 'especial', 'Revisión de proyectos de investigación', '2024-05-20', '2024-05-25', 'ejecutado', 'AUD-002')
) v(codigo, nombre, tipo, alcance, fecha_prog, fecha_ejec, estado, lider_codigo)
JOIN usuarios u ON u.codigo = v.lider_codigo;

-- Hallazgos (resultados de auditorías)
INSERT INTO hallazgos (plan_id, tipo, descripcion, area_proceso_id, gravedad, estado)
SELECT pa.id, v.tipo, v.descripcion, p.id, v.gravedad, v.estado FROM
(VALUES
('PLAN-AUD-2024-01', 'no_conformidad', 'Falta de documentación en procesos de adquisición', 'PROC-007', 'alta', 'abierto'),
('PLAN-AUD-2024-01', 'observacion', 'Registros incompletos en gastos administrativos', 'PROC-008', 'media', 'en_tratamiento'),
('PLAN-AUD-2024-02', 'no_conformidad', 'Evaluación docente no realizada en tiempo', 'PROC-005', 'critica', 'abierto'),
('PLAN-AUD-2024-02', 'oportunidad_mejora', 'Implementar sistema de retroalimentación estudiantil', 'PROC-005', 'baja', 'abierto'),
('PLAN-AUD-2024-04', 'observacion', 'Falta de seguimiento a proyectos de investigación', 'PROC-010', 'media', 'cerrado')
) v(plan_codigo, tipo, descripcion, proc_codigo, gravedad, estado)
JOIN planes_auditoria pa ON pa.codigo = v.plan_codigo
JOIN procesos p ON p.codigo = v.proc_codigo;

-- CAPAs (Acciones Preventivas/Correctivas)
INSERT INTO capas (codigo, tipo, descripcion, causa_raiz, accion_propuesta, responsable_id, fecha_implementacion, estado)
SELECT v.codigo, v.tipo, v.descripcion, v.causa, v.accion, u.id, v.fecha_impl::DATE, v.estado FROM
(VALUES
('CAPA-001', 'correctiva', 'Mejorar documentación de adquisiciones', 'Procesos no formalizados', 'Digitalizar y estandarizar procesos', 'GES-001', '2024-04-30', 'en_implementacion'),
('CAPA-002', 'preventiva', 'Implementar control interno de gastos', 'Falta de supervisión periódica', 'Crear comisión de revisión mensual', 'GES-001', '2024-03-31', 'verificada'),
('CAPA-003', 'correctiva', 'Recuperar evaluaciones docentes pendientes', 'Retraso administrativo', 'Ejecutar evaluaciones en fechas acordadas', 'GES-002', '2024-06-30', 'en_implementacion'),
('CAPA-004', 'preventiva', 'Crear política de gestión de proyectos', 'Falta de políticas formales', 'Elaborar manual de proyectos de investigación', 'DOC-002', '2024-07-31', 'registrada')
) v(codigo, tipo, descripcion, causa, accion, responsable_codigo, fecha_impl, estado)
JOIN usuarios u ON u.codigo = v.responsable_codigo;

-- Encuestas (con múltiples tipos)
INSERT INTO encuestas (codigo, titulo, descripcion, dirigido_a, estado) VALUES
('ENC-001', 'Encuesta Satisfacción Docente', 'Evalúa la satisfacción laboral de docentes', 'docentes', 'en_curso'),
('ENC-002', 'Encuesta Satisfacción Estudiante', 'Valora la calidad de servicio educativo', 'estudiantes', 'en_curso'),
('ENC-003', 'Encuesta Clima Laboral', 'Mide el ambiente de trabajo en la institución', 'administrativos', 'publicada'),
('ENC-004', 'Encuesta de Egresados', 'Seguimiento a la inserción laboral de egresados', 'egresados', 'publicada'),
('ENC-005', 'Encuesta Calidad de Infraestructura', 'Evaluación de instalaciones y recursos', 'todos', 'en_curso');

-- Preguntas de Encuestas
INSERT INTO preguntas_encuesta (encuesta_id, texto, tipo, orden, obligatoria)
SELECT e.id, v.pregunta, v.tipo, v.orden, TRUE FROM
(VALUES
('ENC-001', '¿Qué tan satisfecho está con su ambiente laboral?', 'likert_5', 1),
('ENC-001', '¿La institución valora su trabajo?', 'likert_5', 2),
('ENC-001', '¿Tiene acceso a capacitación continua?', 'si_no', 3),
('ENC-002', '¿La calidad de enseñanza es satisfactoria?', 'likert_5', 1),
('ENC-002', '¿Los docentes están preparados para sus clases?', 'likert_5', 2),
('ENC-002', '¿Tiene acceso a recursos necesarios?', 'si_no', 3),
('ENC-003', '¿Comunica la administración claramente sus decisiones?', 'likert_5', 1),
('ENC-004', '¿Se insertó laboralmente en su área de formación?', 'si_no', 1),
('ENC-005', '¿Las instalaciones son adecuadas?', 'likert_5', 1),
('ENC-005', '¿Hay suficiente acceso a tecnología?', 'likert_5', 2)
) v(enc_codigo, pregunta, tipo, orden)
JOIN encuestas e ON e.codigo = v.enc_codigo;

-- Respuestas de Encuestas (simuladas)
-- DOC-001
INSERT INTO respuestas_encuesta (encuesta_id, pregunta_id, usuario_id, valor_numerico, enviado_en)
SELECT e.id, p.id, u.id, 4, '2026-01-10 10:00:00'::timestamp FROM encuestas e, preguntas_encuesta p, usuarios u WHERE e.codigo='ENC-001' AND p.encuesta_id=e.id AND p.orden=1 AND u.codigo='DOC-001';
INSERT INTO respuestas_encuesta (encuesta_id, pregunta_id, usuario_id, valor_numerico, enviado_en)
SELECT e.id, p.id, u.id, 3, '2026-01-10 10:02:00'::timestamp FROM encuestas e, preguntas_encuesta p, usuarios u WHERE e.codigo='ENC-001' AND p.encuesta_id=e.id AND p.orden=2 AND u.codigo='DOC-001';
INSERT INTO respuestas_encuesta (encuesta_id, pregunta_id, usuario_id, valor_numerico, valor_texto, enviado_en)
SELECT e.id, p.id, u.id, 2, 'si', '2026-01-10 10:04:00'::timestamp FROM encuestas e, preguntas_encuesta p, usuarios u WHERE e.codigo='ENC-001' AND p.encuesta_id=e.id AND p.orden=3 AND u.codigo='DOC-001';

-- DOC-002
INSERT INTO respuestas_encuesta (encuesta_id, pregunta_id, usuario_id, valor_numerico, enviado_en)
SELECT e.id, p.id, u.id, 5, '2026-02-15 11:30:00'::timestamp FROM encuestas e, preguntas_encuesta p, usuarios u WHERE e.codigo='ENC-001' AND p.encuesta_id=e.id AND p.orden=1 AND u.codigo='DOC-002';
INSERT INTO respuestas_encuesta (encuesta_id, pregunta_id, usuario_id, valor_numerico, enviado_en)
SELECT e.id, p.id, u.id, 5, '2026-02-15 11:32:00'::timestamp FROM encuestas e, preguntas_encuesta p, usuarios u WHERE e.codigo='ENC-001' AND p.encuesta_id=e.id AND p.orden=2 AND u.codigo='DOC-002';
INSERT INTO respuestas_encuesta (encuesta_id, pregunta_id, usuario_id, valor_numerico, valor_texto, enviado_en)
SELECT e.id, p.id, u.id, 2, 'si', '2026-02-15 11:34:00'::timestamp FROM encuestas e, preguntas_encuesta p, usuarios u WHERE e.codigo='ENC-001' AND p.encuesta_id=e.id AND p.orden=3 AND u.codigo='DOC-002';

-- DOC-003
INSERT INTO respuestas_encuesta (encuesta_id, pregunta_id, usuario_id, valor_numerico, enviado_en)
SELECT e.id, p.id, u.id, 3, '2026-03-20 09:15:00'::timestamp FROM encuestas e, preguntas_encuesta p, usuarios u WHERE e.codigo='ENC-001' AND p.encuesta_id=e.id AND p.orden=1 AND u.codigo='DOC-003';
INSERT INTO respuestas_encuesta (encuesta_id, pregunta_id, usuario_id, valor_numerico, enviado_en)
SELECT e.id, p.id, u.id, 2, '2026-03-20 09:17:00'::timestamp FROM encuestas e, preguntas_encuesta p, usuarios u WHERE e.codigo='ENC-001' AND p.encuesta_id=e.id AND p.orden=2 AND u.codigo='DOC-003';
INSERT INTO respuestas_encuesta (encuesta_id, pregunta_id, usuario_id, valor_numerico, valor_texto, enviado_en)
SELECT e.id, p.id, u.id, 1, 'no', '2026-03-20 09:19:00'::timestamp FROM encuestas e, preguntas_encuesta p, usuarios u WHERE e.codigo='ENC-001' AND p.encuesta_id=e.id AND p.orden=3 AND u.codigo='DOC-003';

-- DOC-004
INSERT INTO respuestas_encuesta (encuesta_id, pregunta_id, usuario_id, valor_numerico, enviado_en)
SELECT e.id, p.id, u.id, 4, '2026-04-05 14:22:00'::timestamp FROM encuestas e, preguntas_encuesta p, usuarios u WHERE e.codigo='ENC-001' AND p.encuesta_id=e.id AND p.orden=1 AND u.codigo='DOC-004';
INSERT INTO respuestas_encuesta (encuesta_id, pregunta_id, usuario_id, valor_numerico, enviado_en)
SELECT e.id, p.id, u.id, 4, '2026-04-05 14:24:00'::timestamp FROM encuestas e, preguntas_encuesta p, usuarios u WHERE e.codigo='ENC-001' AND p.encuesta_id=e.id AND p.orden=2 AND u.codigo='DOC-004';
INSERT INTO respuestas_encuesta (encuesta_id, pregunta_id, usuario_id, valor_numerico, valor_texto, enviado_en)
SELECT e.id, p.id, u.id, 2, 'si', '2026-04-05 14:26:00'::timestamp FROM encuestas e, preguntas_encuesta p, usuarios u WHERE e.codigo='ENC-001' AND p.encuesta_id=e.id AND p.orden=3 AND u.codigo='DOC-004';

-- EST-001
INSERT INTO respuestas_encuesta (encuesta_id, pregunta_id, usuario_id, valor_numerico, enviado_en)
SELECT e.id, p.id, u.id, 5, '2026-03-11 16:00:00'::timestamp FROM encuestas e, preguntas_encuesta p, usuarios u WHERE e.codigo='ENC-002' AND p.encuesta_id=e.id AND p.orden=1 AND u.codigo='EST-001';
INSERT INTO respuestas_encuesta (encuesta_id, pregunta_id, usuario_id, valor_numerico, enviado_en)
SELECT e.id, p.id, u.id, 4, '2026-03-11 16:02:00'::timestamp FROM encuestas e, preguntas_encuesta p, usuarios u WHERE e.codigo='ENC-002' AND p.encuesta_id=e.id AND p.orden=2 AND u.codigo='EST-001';
INSERT INTO respuestas_encuesta (encuesta_id, pregunta_id, usuario_id, valor_numerico, valor_texto, enviado_en)
SELECT e.id, p.id, u.id, 2, 'si', '2026-03-11 16:04:00'::timestamp FROM encuestas e, preguntas_encuesta p, usuarios u WHERE e.codigo='ENC-002' AND p.encuesta_id=e.id AND p.orden=3 AND u.codigo='EST-001';

-- EST-002
INSERT INTO respuestas_encuesta (encuesta_id, pregunta_id, usuario_id, valor_numerico, enviado_en)
SELECT e.id, p.id, u.id, 4, '2026-04-12 17:10:00'::timestamp FROM encuestas e, preguntas_encuesta p, usuarios u WHERE e.codigo='ENC-002' AND p.encuesta_id=e.id AND p.orden=1 AND u.codigo='EST-002';
INSERT INTO respuestas_encuesta (encuesta_id, pregunta_id, usuario_id, valor_numerico, enviado_en)
SELECT e.id, p.id, u.id, 5, '2026-04-12 17:12:00'::timestamp FROM encuestas e, preguntas_encuesta p, usuarios u WHERE e.codigo='ENC-002' AND p.encuesta_id=e.id AND p.orden=2 AND u.codigo='EST-002';
INSERT INTO respuestas_encuesta (encuesta_id, pregunta_id, usuario_id, valor_numerico, valor_texto, enviado_en)
SELECT e.id, p.id, u.id, 2, 'si', '2026-04-12 17:14:00'::timestamp FROM encuestas e, preguntas_encuesta p, usuarios u WHERE e.codigo='ENC-002' AND p.encuesta_id=e.id AND p.orden=3 AND u.codigo='EST-002';

-- EST-003
INSERT INTO respuestas_encuesta (encuesta_id, pregunta_id, usuario_id, valor_numerico, enviado_en)
SELECT e.id, p.id, u.id, 3, '2026-05-18 10:45:00'::timestamp FROM encuestas e, preguntas_encuesta p, usuarios u WHERE e.codigo='ENC-002' AND p.encuesta_id=e.id AND p.orden=1 AND u.codigo='EST-003';
INSERT INTO respuestas_encuesta (encuesta_id, pregunta_id, usuario_id, valor_numerico, enviado_en)
SELECT e.id, p.id, u.id, 3, '2026-05-18 10:47:00'::timestamp FROM encuestas e, preguntas_encuesta p, usuarios u WHERE e.codigo='ENC-002' AND p.encuesta_id=e.id AND p.orden=2 AND u.codigo='EST-003';
INSERT INTO respuestas_encuesta (encuesta_id, pregunta_id, usuario_id, valor_numerico, valor_texto, enviado_en)
SELECT e.id, p.id, u.id, 1, 'no', '2026-05-18 10:49:00'::timestamp FROM encuestas e, preguntas_encuesta p, usuarios u WHERE e.codigo='ENC-002' AND p.encuesta_id=e.id AND p.orden=3 AND u.codigo='EST-003';

-- Mediciones Indicador
INSERT INTO mediciones_indicador (indicador_id, periodo, valor_real, valor_esperado, cumplimiento, analisis_tendencia)
SELECT id, '2024-01', 88.50, 90.00, 98.33, 'Tendencia estable con ligera baja en la segunda semana' FROM indicadores WHERE codigo='IND-003';
INSERT INTO mediciones_indicador (indicador_id, periodo, valor_real, valor_esperado, cumplimiento, analisis_tendencia)
SELECT id, '2024-02', 91.20, 90.00, 101.33, 'Mejora en la velocidad de respuesta tras capacitacion' FROM indicadores WHERE codigo='IND-003';
INSERT INTO mediciones_indicador (indicador_id, periodo, valor_real, valor_esperado, cumplimiento, analisis_tendencia)
SELECT id, '2024-03', 92.50, 90.00, 102.77, 'Se mantiene la tendencia positiva superando la meta' FROM indicadores WHERE codigo='IND-003';
INSERT INTO mediciones_indicador (indicador_id, periodo, valor_real, valor_esperado, cumplimiento, analisis_tendencia)
SELECT id, '2024-04', 89.00, 90.00, 98.89, 'Leve caida por acumulacion de expedientes' FROM indicadores WHERE codigo='IND-003';
INSERT INTO mediciones_indicador (indicador_id, periodo, valor_real, valor_esperado, cumplimiento, analisis_tendencia)
SELECT id, '2024-05', 94.10, 90.00, 104.55, 'Maximo historico del semestre gracias a nueva directiva' FROM indicadores WHERE codigo='IND-003';

INSERT INTO mediciones_indicador (indicador_id, periodo, valor_real, valor_esperado, cumplimiento, analisis_tendencia)
SELECT id, '2024-01', 13.80, 14.50, 95.17, 'Promedio ligeramente por debajo del objetivo' FROM indicadores WHERE codigo='IND-004';
INSERT INTO mediciones_indicador (indicador_id, periodo, valor_real, valor_esperado, cumplimiento, analisis_tendencia)
SELECT id, '2024-02', 14.10, 14.50, 97.24, 'Incremento de promedios debido a reforzamiento academico' FROM indicadores WHERE codigo='IND-004';
INSERT INTO mediciones_indicador (indicador_id, periodo, valor_real, valor_esperado, cumplimiento, analisis_tendencia)
SELECT id, '2024-03', 14.60, 14.50, 100.69, 'Meta superada gracias al programa de tutorias' FROM indicadores WHERE codigo='IND-004';
INSERT INTO mediciones_indicador (indicador_id, periodo, valor_real, valor_esperado, cumplimiento, analisis_tendencia)
SELECT id, '2024-04', 14.20, 14.50, 97.93, 'Fluctuacion normal dentro del rango esperado' FROM indicadores WHERE codigo='IND-004';
INSERT INTO mediciones_indicador (indicador_id, periodo, valor_real, valor_esperado, cumplimiento, analisis_tendencia)
SELECT id, '2024-05', 14.85, 14.50, 102.41, 'Excelente desempeño en examenes parciales' FROM indicadores WHERE codigo='IND-004';

INSERT INTO mediciones_indicador (indicador_id, periodo, valor_real, valor_esperado, cumplimiento, analisis_tendencia)
SELECT id, '2023-I', 8.20, 8.50, 96.47, 'Nivel optimo inicial de satisfaccion docente' FROM indicadores WHERE codigo='IND-002';
INSERT INTO mediciones_indicador (indicador_id, periodo, valor_real, valor_esperado, cumplimiento, analisis_tendencia)
SELECT id, '2023-II', 8.45, 8.50, 99.41, 'Crecimiento tras implementar mejoras en infraestructura' FROM indicadores WHERE codigo='IND-002';
INSERT INTO mediciones_indicador (indicador_id, periodo, valor_real, valor_esperado, cumplimiento, analisis_tendencia)
SELECT id, '2024-I', 8.60, 8.50, 101.18, 'Meta superada tras actualizacion de incentivos academicos' FROM indicadores WHERE codigo='IND-002';

INSERT INTO mediciones_indicador (indicador_id, periodo, valor_real, valor_esperado, cumplimiento, analisis_tendencia)
SELECT id, '2022', 82.00, 85.00, 96.47, 'Año post-pandemia con ligera deserción' FROM indicadores WHERE codigo='IND-001';
INSERT INTO mediciones_indicador (indicador_id, periodo, valor_real, valor_esperado, cumplimiento, analisis_tendencia)
SELECT id, '2023', 84.80, 85.00, 99.76, 'Recuperacion progresiva' FROM indicadores WHERE codigo='IND-001';
INSERT INTO mediciones_indicador (indicador_id, periodo, valor_real, valor_esperado, cumplimiento, analisis_tendencia)
SELECT id, '2024', 86.20, 85.00, 101.41, 'Meta superada gracias al acompañamiento tutorial integral' FROM indicadores WHERE codigo='IND-001';

INSERT INTO mediciones_indicador (indicador_id, periodo, valor_real, valor_esperado, cumplimiento, analisis_tendencia)
SELECT id, '2023', 94.10, 95.00, 99.05, 'Evaluaciones docentes con calificaciones muy altas' FROM indicadores WHERE codigo='IND-005';
INSERT INTO mediciones_indicador (indicador_id, periodo, valor_real, valor_esperado, cumplimiento, analisis_tendencia)
SELECT id, '2024', 96.30, 95.00, 101.37, 'Meta lograda por capacitacion en herramientas virtuales' FROM indicadores WHERE codigo='IND-005';

INSERT INTO mediciones_indicador (indicador_id, periodo, valor_real, valor_esperado, cumplimiento, analisis_tendencia)
SELECT id, '2023', 21.00, 25.00, 84.00, 'Publicaciones estables en revistas indexadas' FROM indicadores WHERE codigo='IND-006';
INSERT INTO mediciones_indicador (indicador_id, periodo, valor_real, valor_esperado, cumplimiento, analisis_tendencia)
SELECT id, '2024', 27.00, 25.00, 108.00, 'Meta superada gracias a bonificaciones especiales' FROM indicadores WHERE codigo='IND-006';

INSERT INTO mediciones_indicador (indicador_id, periodo, valor_real, valor_esperado, cumplimiento, analisis_tendencia)
SELECT id, '2023', 7.50, 8.00, 93.75, 'Presupuesto de investigacion ejecutado al 90%' FROM indicadores WHERE codigo='IND-007';
INSERT INTO mediciones_indicador (indicador_id, periodo, valor_real, valor_esperado, cumplimiento, analisis_tendencia)
SELECT id, '2024', 8.20, 8.00, 102.50, 'Incremento de fondos concursables para investigacion' FROM indicadores WHERE codigo='IND-007';

-- Seguimientos CAPA
INSERT INTO seguimientos_capa (capa_id, fecha_seguimiento, avance, observaciones, creado_por)
SELECT id, '2026-01-20'::date, 20, 'Avance inicial en el relevamiento de procesos actuales.', creado_por FROM capas WHERE codigo='CAPA-001';
INSERT INTO seguimientos_capa (capa_id, fecha_seguimiento, avance, observaciones, creado_por)
SELECT id, '2026-02-10'::date, 50, 'Se han estandarizado los formatos para la solicitud de adquisiciones.', creado_por FROM capas WHERE codigo='CAPA-001';
INSERT INTO seguimientos_capa (capa_id, fecha_seguimiento, avance, observaciones, creado_por)
SELECT id, '2026-03-05'::date, 80, 'Plan piloto implementado en el area administrativa de Ingenieria.', creado_por FROM capas WHERE codigo='CAPA-001';

INSERT INTO seguimientos_capa (capa_id, fecha_seguimiento, avance, observaciones, creado_por)
SELECT id, '2026-02-15'::date, 30, 'Primera revision con el equipo administrativo. Avance de acuerdos.', creado_por FROM capas WHERE codigo='CAPA-003';
INSERT INTO seguimientos_capa (capa_id, fecha_seguimiento, avance, observaciones, creado_por)
SELECT id, '2026-03-12'::date, 70, 'Evaluaciones academicas completadas al 70%. Envio de recordatorios.', creado_por FROM capas WHERE codigo='CAPA-003';

-- Historial Riesgos
INSERT INTO historial_riesgos (riesgo_id, estado_anterior, estado_nuevo, cambiado_por)
SELECT id, 'activo', 'mitigado', creado_por FROM riesgos WHERE codigo='RIESGO-003';
INSERT INTO historial_riesgos (riesgo_id, estado_anterior, estado_nuevo, cambiado_por)
SELECT id, 'activo', 'aceptado', creado_por FROM riesgos WHERE codigo='RIESGO-004';
INSERT INTO historial_riesgos (riesgo_id, estado_anterior, estado_nuevo, cambiado_por)
SELECT id, 'activo', 'mitigado', creado_por FROM riesgos WHERE codigo='RIESGO-007';
