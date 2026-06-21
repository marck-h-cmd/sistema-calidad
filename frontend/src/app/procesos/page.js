'use client';
import { useState, useEffect } from 'react';
import ProtectedLayout from '@/components/Layout/ProtectedLayout';
import api from '@/lib/api';
import { X, Download, Plus, FileText, Link, ChevronRight, ArrowDown, Layers, Map } from 'lucide-react';

// ── Colores por tipo de macroproceso ───────────────────────────────────────────
const TIPO_META = {
  estrategico: {
    label: 'Estratégico',
    badge: 'badge-blue',
    border: 'border-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    chip: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800/60 border border-blue-200 dark:border-blue-700',
    header: 'bg-gradient-to-r from-blue-600 to-blue-700',
    icon: '🎯',
  },
  misional: {
    label: 'Misional',
    badge: 'badge-green',
    border: 'border-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    chip: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200 dark:hover:bg-emerald-800/60 border border-emerald-200 dark:border-emerald-700',
    header: 'bg-gradient-to-r from-emerald-600 to-emerald-700',
    icon: '📚',
  },
  apoyo: {
    label: 'Apoyo',
    badge: 'badge-yellow',
    border: 'border-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    chip: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-800/60 border border-amber-200 dark:border-amber-700',
    header: 'bg-gradient-to-r from-amber-500 to-amber-600',
    icon: '⚙️',
  },
  evaluacion: {
    label: 'Evaluación',
    badge: 'badge-gray',
    border: 'border-violet-500',
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    chip: 'bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-200 hover:bg-violet-200 dark:hover:bg-violet-800/60 border border-violet-200 dark:border-violet-700',
    header: 'bg-gradient-to-r from-violet-600 to-violet-700',
    icon: '🔍',
  },
};

const TIPO_ORDEN = ['estrategico', 'misional', 'apoyo', 'evaluacion'];

const DOC_ESTADO_COLOR = {
  aprobado:    'badge-green',
  borrador:    'badge-gray',
  en_revision: 'badge-blue',
  obsoleto:    'badge-yellow',
  archivado:   'badge-gray',
};

function Modal({ title, onClose, children, maxW = 'max-w-md' }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full ${maxW} max-h-[90vh] overflow-y-auto`}>
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10 rounded-t-3xl flex items-center justify-between">
          <h2 className="section-title">{title}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function ProcesosPage() {
  const [macroprocesos, setMacroprocesos] = useState([]);
  const [procesos, setProcesos]           = useState([]);
  const [actividades, setActividades]     = useState([]);
  const [documentos, setDocumentos]       = useState([]);   // docs del proceso seleccionado
  const [todosDocumentos, setTodosDocumentos] = useState([]); // para asociar
  const [procesoSel, setProcesoSel]       = useState(null);
  const [vistaTab, setVistaTab]           = useState('tabla');  // 'tabla' | 'mapa'
  const [panelTab, setPanelTab]           = useState('actividades'); // 'actividades' | 'documentos'
  const [modal, setModal]                 = useState(null);
  const [form, setForm]                   = useState({});
  const [docAsociarId, setDocAsociarId]   = useState('');
  const [error, setError]                 = useState('');

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try {
      const [mp, pr, docs] = await Promise.all([
        api.get('/macroprocesos'),
        api.get('/procesos'),
        api.get('/documentos'),
      ]);
      setMacroprocesos(mp.data);
      setProcesos(pr.data);
      setTodosDocumentos(docs.data);
    } catch {}
  };

  const verDetalle = async (p) => {
    setProcesoSel(p);
    setPanelTab('actividades');
    try {
      const [acts, docs] = await Promise.all([
        api.get(`/procesos/${p.id}/actividades`),
        api.get(`/procesos/${p.id}/documentos`),
      ]);
      setActividades(acts.data);
      setDocumentos(docs.data);
    } catch {
      setActividades([]); setDocumentos([]);
    }
  };

  const refrescarDocumentos = async () => {
    if (!procesoSel) return;
    try { const { data } = await api.get(`/procesos/${procesoSel.id}/documentos`); setDocumentos(data); } catch {}
  };

  const guardarMacroproceso = async (e) => {
    e.preventDefault(); setError('');
    try { await api.post('/macroprocesos', form); setModal(null); cargar(); }
    catch (err) { setError(err.response?.data?.error || 'Error'); }
  };

  const guardarProceso = async (e) => {
    e.preventDefault(); setError('');
    try { await api.post('/procesos', form); setModal(null); cargar(); }
    catch (err) { setError(err.response?.data?.error || 'Error'); }
  };

  const guardarActividad = async (e) => {
    e.preventDefault(); setError('');
    try {
      await api.post('/actividades', { ...form, proceso_id: procesoSel.id });
      setModal(null);
      verDetalle(procesoSel);
    } catch (err) { setError(err.response?.data?.error || 'Error'); }
  };

  const asociarDocumento = async (e) => {
    e.preventDefault(); setError('');
    if (!docAsociarId) { setError('Selecciona un documento'); return; }
    try {
      await api.post(`/procesos/${procesoSel.id}/asociar-documento`, { documento_id: docAsociarId });
      setModal(null); setDocAsociarId('');
      refrescarDocumentos();
    } catch (err) { setError(err.response?.data?.error || 'Error'); }
  };

  const descargarPDF = async () => {
    const res = await api.get('/reportes/procesos', { responseType: 'blob' });
    Object.assign(document.createElement('a'), { href: URL.createObjectURL(res.data), download: 'procesos.pdf' }).click();
  };

  // Agrupar macroprocesos por tipo para la Vista Mapa
  const macrosPorTipo = TIPO_ORDEN.reduce((acc, tipo) => {
    const macros = macroprocesos.filter(m => m.tipo === tipo);
    if (macros.length > 0) acc[tipo] = macros;
    return acc;
  }, {});

  // Procesos de un macroproceso
  const procesosDeMacro = (macroId) => procesos.filter(p => p.macroproceso_id === macroId);

  // Documentos no asociados al proceso actual (para el selector)
  const documentosDisponibles = todosDocumentos.filter(d =>
    !documentos.find(dp => dp.id === d.id)
  );

  return (
    <ProtectedLayout>
      {/* ── Cabecera ────────────────────────────────────────── */}
      <div className="px-6 md:px-8 py-5 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="page-title">Mapa de Procesos</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              {procesos.length} procesos · {macroprocesos.length} macroprocesos
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button className="btn-secondary flex items-center gap-2" onClick={descargarPDF}>
              <Download className="w-4 h-4" /> Reporte PDF
            </button>
            <button className="btn-secondary flex items-center gap-2"
              onClick={() => { setForm({ codigo: '', nombre: '', descripcion: '', tipo: 'misional' }); setError(''); setModal('macro'); }}>
              <Plus className="w-4 h-4" /> Macroproceso
            </button>
            <button className="btn-primary flex items-center gap-2"
              onClick={() => { setForm({ codigo: '', nombre: '', objetivo: '', macroproceso_id: macroprocesos[0]?.id || '' }); setError(''); setModal('proceso'); }}>
              <Plus className="w-4 h-4" /> Proceso
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 animate-in">

        {/* ── Tabs de vista principal ────────────────────────── */}
        <div className="flex gap-1 mb-6 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-2xl w-fit">
          {[
            { key: 'tabla', label: 'Vista Tabla', icon: <Layers className="w-3.5 h-3.5" /> },
            { key: 'mapa',  label: 'Vista Mapa',  icon: <Map className="w-3.5 h-3.5" /> },
          ].map(({ key, label, icon }) => (
            <button key={key} onClick={() => setVistaTab(key)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-medium transition-all ${vistaTab === key ? 'bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
              {icon}{label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════
            VISTA MAPA: macroprocesos agrupados por tipo
        ══════════════════════════════════════════════════════ */}
        {vistaTab === 'mapa' && (
          <div className="space-y-6">
            {TIPO_ORDEN.filter(t => macrosPorTipo[t]).map(tipo => {
              const meta = TIPO_META[tipo] || TIPO_META.evaluacion;
              return (
                <div key={tipo}>
                  {/* Etiqueta de sección de tipo */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">{meta.icon}</span>
                    <h2 className="font-bold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wider">{meta.label}</h2>
                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                    <span className="text-xs text-slate-400 dark:text-slate-500">{macrosPorTipo[tipo].length} macroproceso{macrosPorTipo[tipo].length > 1 ? 's' : ''}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {macrosPorTipo[tipo].map(m => {
                      const procs = procesosDeMacro(m.id);
                      return (
                        <div key={m.id} className={`card overflow-hidden border-l-4 ${meta.border}`}>
                          {/* Header del macroproceso */}
                          <div className={`${meta.header} px-4 py-3`}>
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs text-white/70">{m.codigo}</span>
                              <span className="text-xs text-white/80 bg-white/20 rounded-full px-2 py-0.5">
                                {procs.length} proc.
                              </span>
                            </div>
                            <p className="font-semibold text-white mt-0.5 text-sm leading-tight">{m.nombre}</p>
                            {m.descripcion && <p className="text-white/70 text-xs mt-1 line-clamp-1">{m.descripcion}</p>}
                          </div>

                          {/* Chips de procesos */}
                          <div className={`${meta.bg} p-3`}>
                            {procs.length === 0 ? (
                              <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-1">Sin procesos asociados</p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {procs.map(p => (
                                  <button
                                    key={p.id}
                                    onClick={() => { setVistaTab('tabla'); verDetalle(p); }}
                                    className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${meta.chip}`}
                                    title={p.objetivo || p.nombre}
                                  >
                                    {p.codigo}
                                    <ChevronRight className="w-3 h-3 inline ml-0.5 opacity-60" />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {Object.keys(macrosPorTipo).length === 0 && (
              <div className="card p-12 text-center text-slate-400 dark:text-slate-500 text-sm">
                No hay macroprocesos registrados. Crea el primero.
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            VISTA TABLA: lista + panel lateral
        ══════════════════════════════════════════════════════ */}
        {vistaTab === 'tabla' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Lista de procesos */}
            <div className="lg:col-span-4 card overflow-hidden flex flex-col">
              <div className="px-4 py-3.5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Procesos ({procesos.length})</span>
              </div>
              <div className="divide-y divide-slate-50 dark:divide-slate-700 overflow-y-auto flex-1">
                {procesos.length === 0 && <p className="p-6 text-center text-slate-400 dark:text-slate-500 text-sm">Sin procesos</p>}
                {procesos.map(p => {
                  const tipo = macroprocesos.find(m => m.id === p.macroproceso_id)?.tipo;
                  const meta = TIPO_META[tipo];
                  return (
                    <div key={p.id} onClick={() => verDetalle(p)}
                      className={`p-4 cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors flex items-start justify-between gap-3 ${procesoSel?.id === p.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-600' : ''}`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {meta && <span className="text-[10px]">{meta.icon}</span>}
                          <p className="font-medium text-slate-800 dark:text-slate-200 text-sm truncate">{p.codigo} — {p.nombre}</p>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{p.objetivo || 'Sin objetivo'}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{p.macroproceso_nombre || 'Sin macroproceso'}</p>
                      </div>
                      <span className={`badge shrink-0 ${p.estado === 'activo' ? 'badge-green' : 'badge-yellow'}`}>{p.estado}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Panel lateral: actividades + documentos */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              {!procesoSel ? (
                <div className="card p-12 text-center text-slate-400 dark:text-slate-500 text-sm flex flex-col items-center gap-3">
                  <Layers className="w-10 h-10 opacity-30" />
                  Haz clic en un proceso para ver sus actividades y documentos
                </div>
              ) : (
                <>
                  {/* Header del proceso seleccionado */}
                  <div className="card overflow-hidden">
                    <div className="bg-gradient-to-r from-slate-700 to-slate-800 dark:from-slate-700 dark:to-slate-900 px-5 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <span className="font-mono text-xs text-slate-400">{procesoSel.codigo}</span>
                          <h2 className="font-bold text-white text-base mt-0.5">{procesoSel.nombre}</h2>
                          {procesoSel.objetivo && <p className="text-slate-300 text-xs mt-1">{procesoSel.objetivo}</p>}
                        </div>
                        <span className={`badge shrink-0 ${procesoSel.estado === 'activo' ? 'badge-green' : 'badge-yellow'}`}>{procesoSel.estado}</span>
                      </div>
                    </div>

                    {/* Sub-tabs: Actividades | Documentos */}
                    <div className="flex border-b border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50">
                      {[
                        { key: 'actividades', label: `Actividades (${actividades.length})` },
                        { key: 'documentos',  label: `Documentos (${documentos.length})` },
                      ].map(({ key, label }) => (
                        <button key={key} onClick={() => setPanelTab(key)}
                          className={`px-5 py-2.5 text-xs font-semibold transition-colors ${panelTab === key ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ── Panel Actividades ── */}
                  {panelTab === 'actividades' && (
                    <div className="card overflow-hidden">
                      <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Flujo de Actividades</span>
                        <button className="btn-primary text-xs py-1.5 px-3"
                          onClick={() => { setForm({ codigo: '', nombre: '', descripcion: '', secuencia: actividades.length + 1, entradas: '', salidas: '' }); setError(''); setModal('actividad'); }}>
                          <Plus className="w-3.5 h-3.5 inline mr-1" />Actividad
                        </button>
                      </div>

                      {actividades.length === 0 ? (
                        <p className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">No hay actividades registradas</p>
                      ) : (
                        <div className="p-4 space-y-0">
                          {actividades.map((a, i) => (
                            <div key={a.id}>
                              {/* Tarjeta de actividad */}
                              <div className="flex gap-3 p-3 rounded-2xl hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                                {/* Número de secuencia */}
                                <div className="flex flex-col items-center shrink-0">
                                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md">
                                    {a.secuencia}
                                  </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{a.codigo}</span>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{a.nombre}</p>
                                  </div>
                                  {a.descripcion && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{a.descripcion}</p>}

                                  {/* Entradas y salidas inline */}
                                  {(a.entradas || a.salidas) && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {a.entradas && (
                                        <div className="flex items-center gap-1 text-[10px] bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-300 rounded-lg px-2 py-1">
                                          <span className="font-bold uppercase tracking-wider">Entrada:</span>
                                          <span>{a.entradas}</span>
                                        </div>
                                      )}
                                      {a.salidas && (
                                        <div className="flex items-center gap-1 text-[10px] bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 rounded-lg px-2 py-1">
                                          <span className="font-bold uppercase tracking-wider">Salida:</span>
                                          <span>{a.salidas}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Flecha entre actividades */}
                              {i < actividades.length - 1 && (
                                <div className="flex justify-start pl-7 py-0.5">
                                  <div className="flex flex-col items-center">
                                    <div className="w-0.5 h-3 bg-slate-300 dark:bg-slate-600" />
                                    <ArrowDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Panel Documentos ── */}
                  {panelTab === 'documentos' && (
                    <div className="card overflow-hidden">
                      <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Documentos Asociados</span>
                        <button className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                          onClick={() => { setDocAsociarId(''); setError(''); setModal('asociar'); }}>
                          <Link className="w-3.5 h-3.5" />Asociar Documento
                        </button>
                      </div>

                      {documentos.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 dark:text-slate-500 flex flex-col items-center gap-2">
                          <FileText className="w-8 h-8 opacity-30" />
                          <p className="text-sm">No hay documentos asociados a este proceso</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-50 dark:divide-slate-700">
                          {documentos.map(d => (
                            <div key={d.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                              <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg shrink-0">
                                <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{d.codigo}</span>
                                  {d.tipo_nombre && <span className="text-[10px] text-slate-400 dark:text-slate-500">{d.tipo_nombre}</span>}
                                </div>
                                <p className="font-medium text-slate-800 dark:text-slate-200 text-sm mt-0.5 truncate">{d.titulo}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] text-slate-400 dark:text-slate-500">v{d.version_actual}</span>
                                <span className={`badge text-[10px] px-2 py-0.5 ${DOC_ESTADO_COLOR[d.estado] || 'badge-gray'}`}>{d.estado}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══ MODALES ══════════════════════════════════════════════ */}

      {/* Modal: Nuevo Macroproceso */}
      {modal === 'macro' && (
        <Modal title="Nuevo Macroproceso" onClose={() => setModal(null)}>
          <form onSubmit={guardarMacroproceso} className="p-5 space-y-4">
            <div><label className="label">Código</label><input className="input" value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} required /></div>
            <div><label className="label">Nombre</label><input className="input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required /></div>
            <div><label className="label">Tipo</label>
              <select className="select" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                {TIPO_ORDEN.map(t => <option key={t} value={t}>{TIPO_META[t]?.label || t}</option>)}
              </select>
            </div>
            <div><label className="label">Descripción</label><textarea className="input" rows={2} value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} /></div>
            {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button type="button" className="btn-secondary flex-1" onClick={() => setModal(null)}>Cancelar</button>
              <button type="submit" className="btn-primary flex-1">Guardar</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Nuevo Proceso */}
      {modal === 'proceso' && (
        <Modal title="Nuevo Proceso" onClose={() => setModal(null)}>
          <form onSubmit={guardarProceso} className="p-5 space-y-4">
            <div><label className="label">Código</label><input className="input" value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} required /></div>
            <div><label className="label">Nombre</label><input className="input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required /></div>
            <div><label className="label">Macroproceso</label>
              <select className="select" value={form.macroproceso_id} onChange={e => setForm({ ...form, macroproceso_id: e.target.value })}>
                <option value="">Sin macroproceso</option>
                {macroprocesos.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </div>
            <div><label className="label">Objetivo</label><textarea className="input" rows={2} value={form.objetivo} onChange={e => setForm({ ...form, objetivo: e.target.value })} /></div>
            {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button type="button" className="btn-secondary flex-1" onClick={() => setModal(null)}>Cancelar</button>
              <button type="submit" className="btn-primary flex-1">Guardar</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Nueva Actividad */}
      {modal === 'actividad' && (
        <Modal title="Nueva Actividad" onClose={() => setModal(null)}>
          <form onSubmit={guardarActividad} className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Código</label><input className="input" value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} required /></div>
              <div><label className="label">Secuencia</label><input type="number" className="input" value={form.secuencia} onChange={e => setForm({ ...form, secuencia: e.target.value })} required /></div>
            </div>
            <div><label className="label">Nombre</label><input className="input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required /></div>
            <div><label className="label">Descripción</label><textarea className="input" rows={2} value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Entradas</label><input className="input" placeholder="Ej: Solicitud aprobada" value={form.entradas} onChange={e => setForm({ ...form, entradas: e.target.value })} /></div>
              <div><label className="label">Salidas</label><input className="input" placeholder="Ej: Documento generado" value={form.salidas} onChange={e => setForm({ ...form, salidas: e.target.value })} /></div>
            </div>
            {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button type="button" className="btn-secondary flex-1" onClick={() => setModal(null)}>Cancelar</button>
              <button type="submit" className="btn-primary flex-1">Guardar</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Asociar Documento */}
      {modal === 'asociar' && (
        <Modal title="Asociar Documento al Proceso" onClose={() => setModal(null)}>
          <form onSubmit={asociarDocumento} className="p-5 space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Selecciona un documento existente para asociarlo al proceso <span className="font-semibold text-slate-700 dark:text-slate-300">{procesoSel?.nombre}</span>.
            </p>
            <div>
              <label className="label">Documento</label>
              <select className="select" value={docAsociarId} onChange={e => setDocAsociarId(e.target.value)}>
                <option value="">— Selecciona un documento —</option>
                {documentosDisponibles.map(d => (
                  <option key={d.id} value={d.id}>{d.codigo} — {d.titulo}</option>
                ))}
              </select>
              {documentosDisponibles.length === 0 && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 italic">Todos los documentos ya están asociados a este proceso</p>
              )}
            </div>
            {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button type="button" className="btn-secondary flex-1" onClick={() => setModal(null)}>Cancelar</button>
              <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                <Link className="w-4 h-4" />Asociar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </ProtectedLayout>
  );
}
