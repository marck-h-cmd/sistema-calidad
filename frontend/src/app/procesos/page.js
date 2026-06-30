'use client';
import { useState, useEffect } from 'react';
import ProtectedLayout from '@/components/Layout/ProtectedLayout';
import api from '@/lib/api';
import { X, Download, Plus, FileText, Link, ChevronRight, ArrowDown, Layers, Map } from 'lucide-react';

// ── Colores por tipo de macroproceso ───────────────────────────────────────────
const TIPO_META = {
  estrategico: {
    label: 'Estratégico',
    badge: 'badge-violet',
    border: 'border-violet-500',
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    chip: 'bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-200 hover:bg-violet-200 dark:hover:bg-violet-800/60 border border-violet-200 dark:border-violet-700',
    header: 'bg-gradient-to-r from-violet-600 to-violet-700',
    icon: '🎯',
  },
  misional: {
    label: 'Misional',
    badge: 'badge-blue',
    border: 'border-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    chip: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800/60 border border-blue-200 dark:border-blue-700',
    header: 'bg-gradient-to-r from-blue-600 to-indigo-700',
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
      <div className={`bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-[95vw] sm:${maxW} max-h-[90vh] overflow-y-auto`}>
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
  const [indicadores, setIndicadores]     = useState([]);
  const [riesgos, setRiesgos]             = useState([]);
  const [auditorias, setAuditorias]       = useState([]);
  const [todosDocumentos, setTodosDocumentos] = useState([]); // para asociar
  const [procesoSel, setProcesoSel]       = useState(null);
  const [vistaTab, setVistaTab]           = useState('mapa');  // default to mapa
  const [panelTab, setPanelTab]           = useState('actividades'); // 'actividades' | 'documentos' | 'indicadores' | 'riesgos' | 'auditorias'
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
      const [acts, docs, rels] = await Promise.all([
        api.get(`/procesos/${p.id}/actividades`),
        api.get(`/procesos/${p.id}/documentos`),
        api.get(`/procesos/${p.id}/relaciones`),
      ]);
      setActividades(acts.data);
      setDocumentos(docs.data);
      setIndicadores(rels.data.indicadores || []);
      setRiesgos(rels.data.riesgos || []);
      setAuditorias(rels.data.auditorias || []);
    } catch {
      setActividades([]); setDocumentos([]); setIndicadores([]); setRiesgos([]); setAuditorias([]);
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
      <div className="px-6 md:px-8 py-5 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-title">Mapa de Procesos</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              {procesos.length} procesos · {macroprocesos.length} macroprocesos
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button className="btn-secondary flex items-center justify-center gap-2" onClick={descargarPDF}>
              <Download className="w-4 h-4" /> Reporte PDF
            </button>
            <button className="btn-secondary flex items-center justify-center gap-2"
              onClick={() => { setForm({ codigo: '', nombre: '', descripcion: '', tipo: 'misional' }); setError(''); setModal('macro'); }}>
              <Plus className="w-4 h-4" /> Macroproceso
            </button>
            <button className="btn-primary flex items-center justify-center gap-2"
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
            VISTA MAPA: Estructura Arquitectónica
        ══════════════════════════════════════════════════════ */}
        {vistaTab === 'mapa' && (
          <div className="flex flex-col items-center gap-8 bg-slate-50 dark:bg-slate-800/20 p-4 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-x-auto min-w-max md:min-w-0">
            
            {/* Función Helper para pintar las tarjetas */}
            {(() => {
              const renderMacroCard = (m, meta, isMisional = false, index = 0, total = 1) => {
                const procs = procesosDeMacro(m.id);
                return (
                  <div key={m.id} className="flex items-center">
                    <div 
                      className={`bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm w-56 shrink-0 flex flex-col items-center text-center transition-all border border-slate-100 dark:border-slate-700 ${isMisional ? 'min-h-[180px]' : 'min-h-[120px]'}`}
                    >
                      <h3 className={`font-bold text-sm mb-3 ${meta.textColor || 'text-slate-700 dark:text-slate-200'} max-w-full leading-tight`}>{m.nombre}</h3>
                      {procs.length > 0 && (
                        <div className="flex flex-col gap-2 mt-auto items-center w-full">
                          {procs.map(p => (
                            <button 
                              key={p.id} 
                              onClick={() => { setVistaTab('tabla'); verDetalle(p); }}
                              className={`text-[10px] sm:text-xs px-2 py-1.5 rounded-lg font-semibold transition-all shadow-sm w-full break-words ${meta.chip}`}
                            >
                              {p.nombre}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {isMisional && index < total - 1 && (
                      <div className="mx-2 text-blue-500/40 dark:text-blue-400/40">
                        <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                          <path d="M4 11h12V8l6 4-6 4v-3H4v-2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              };

              const renderContainer = (title, tipo, bgClass, textClass, isMisional = false) => {
                const macros = macrosPorTipo[tipo];
                if (!macros) return null;
                return (
                  <div className="relative w-full max-w-5xl z-10">
                    {/* Tab Header */}
                    <div className={`absolute -top-8 left-0 ${bgClass} px-6 py-2 rounded-t-xl inline-block shadow-sm`}>
                      <span className={`text-xs font-black uppercase tracking-wider ${textClass}`}>{title}</span>
                    </div>
                    {/* Container Body */}
                    <div className={`${bgClass} rounded-b-2xl rounded-tr-2xl p-6 shadow-md`}>
                      <div className="flex justify-center flex-wrap md:flex-nowrap gap-4">
                        {macros.map((m, i) => renderMacroCard(m, TIPO_META[tipo], isMisional, i, macros.length))}
                      </div>
                    </div>
                  </div>
                );
              };

              return (
                <div className="w-full flex flex-col items-center gap-16 pt-16 pb-10 bg-slate-50 dark:bg-[#232323] rounded-[2rem] relative px-4 md:px-16 shadow-lg dark:shadow-2xl overflow-hidden min-h-[600px] border border-slate-200 dark:border-slate-800">
                  
                  {/* Título Central Opcional */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2">
                     <h2 className="text-slate-800 dark:text-white font-black text-2xl md:text-4xl tracking-widest uppercase drop-shadow-sm dark:drop-shadow-lg">Mapa de Procesos</h2>
                  </div>

                  {/* ESTRATÉGICOS */}
                  {renderContainer("Procesos Estratégicos", 'estrategico', 'bg-violet-100/50 dark:bg-violet-900/20', 'text-violet-800 dark:text-violet-300')}

                  {/* CONECTORES (Líneas punteadas) */}
                  {(macrosPorTipo['estrategico'] && macrosPorTipo['misional']) && (
                    <div className="absolute top-[32%] flex w-full max-w-3xl justify-around z-0 opacity-60">
                       <div className="w-px h-24 border-l-2 border-dashed border-slate-300 dark:border-white"></div>
                       <div className="w-px h-24 border-l-2 border-dashed border-slate-300 dark:border-white"></div>
                       <div className="w-px h-24 border-l-2 border-dashed border-slate-300 dark:border-white"></div>
                    </div>
                  )}

                  {/* MISIONALES */}
                  {renderContainer("Procesos Misionales", 'misional', 'bg-blue-100/50 dark:bg-blue-900/20', 'text-blue-800 dark:text-blue-300', true)}

                  {/* CONECTORES (Líneas punteadas) */}
                  {(macrosPorTipo['apoyo'] && macrosPorTipo['misional']) && (
                    <div className="absolute top-[68%] flex w-full max-w-3xl justify-around z-0 opacity-60">
                       <div className="w-px h-24 border-l-2 border-dashed border-slate-300 dark:border-white"></div>
                       <div className="w-px h-24 border-l-2 border-dashed border-slate-300 dark:border-white"></div>
                       <div className="w-px h-24 border-l-2 border-dashed border-slate-300 dark:border-white"></div>
                       <div className="w-px h-24 border-l-2 border-dashed border-slate-300 dark:border-white"></div>
                    </div>
                  )}

                  {/* APOYO */}
                  {renderContainer("Procesos de Soporte", 'apoyo', 'bg-amber-100/50 dark:bg-amber-900/20', 'text-amber-800 dark:text-amber-300')}

                </div>
              );
            })()}
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
                      className={`cursor-pointer transition-colors border-l-4 ${meta ? meta.border : 'border-slate-200'} ${procesoSel?.id === p.id ? (meta ? meta.bg : 'bg-slate-50 dark:bg-slate-800/30') : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30'} flex flex-col mb-1 last:mb-0`}>
                      
                      <div className={`${meta ? meta.header : 'bg-slate-200 dark:bg-slate-700'} px-4 py-1.5 flex items-center justify-between`}>
                        <div className="flex items-center gap-1.5 text-white">
                          {meta && <span className="text-[10px] drop-shadow-md">{meta.icon}</span>}
                          <p className="font-semibold text-xs tracking-wider drop-shadow-md">{p.codigo} — {meta ? meta.label : 'Sin Tipo'}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${p.estado === 'activo' ? 'bg-green-500/20 text-green-50' : 'bg-yellow-500/20 text-yellow-50'}`}>{p.estado}</span>
                      </div>

                      <div className="p-4 min-w-0 flex-1">
                        <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{p.nombre}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2">{p.objetivo || 'Sin objetivo'}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-medium uppercase tracking-wide">Macro: {p.macroproceso_nombre || 'Sin macroproceso'}</p>
                      </div>
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

                    {/* Sub-tabs: Actividades | Documentos | Indicadores | Riesgos | Auditorías */}
                    <div className="flex border-b border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 overflow-x-auto hide-scrollbar">
                      {[
                        { key: 'actividades', label: `Actividades (${actividades.length})` },
                        { key: 'documentos',  label: `Documentos (${documentos.length})` },
                        { key: 'indicadores', label: `Indicadores (${indicadores.length})` },
                        { key: 'riesgos',     label: `Riesgos (${riesgos.length})` },
                        { key: 'auditorias',  label: `Auditorías (${auditorias.length})` },
                      ].map(({ key, label }) => (
                        <button key={key} onClick={() => setPanelTab(key)}
                          className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors ${panelTab === key ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>
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
                  {/* ── Panel Indicadores ── */}
                  {panelTab === 'indicadores' && (
                    <div className="card overflow-hidden">
                      <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Indicadores del Proceso</span>
                      </div>
                      {indicadores.length === 0 ? (
                        <p className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">No hay indicadores asociados a este proceso</p>
                      ) : (
                        <div className="divide-y divide-slate-50 dark:divide-slate-700">
                          {indicadores.map(i => (
                            <div key={i.id} className="p-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{i.codigo}</span>
                                <span className="badge badge-blue">{i.tipo}</span>
                              </div>
                              <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{i.nombre}</p>
                              <p className="text-xs text-slate-500 mt-1"><span className="font-semibold text-slate-600 dark:text-slate-400">Meta:</span> {i.meta}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Panel Riesgos ── */}
                  {panelTab === 'riesgos' && (
                    <div className="card overflow-hidden">
                      <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Matriz de Riesgos</span>
                      </div>
                      {riesgos.length === 0 ? (
                        <p className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">No hay riesgos identificados</p>
                      ) : (
                        <div className="divide-y divide-slate-50 dark:divide-slate-700">
                          {riesgos.map(r => {
                            const nivel = r.probabilidad * r.impacto;
                            const color = nivel > 15 ? 'badge-red' : nivel > 8 ? 'badge-yellow' : 'badge-green';
                            return (
                              <div key={r.id} className="p-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{r.codigo}</span>
                                  <span className={`badge ${color}`}>Nivel: {nivel}</span>
                                </div>
                                <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{r.nombre}</p>
                                <p className="text-xs text-slate-500 capitalize mt-1">{r.categoria} · P:{r.probabilidad} x I:{r.impacto}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Panel Auditorías ── */}
                  {panelTab === 'auditorias' && (
                    <div className="card overflow-hidden">
                      <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Hallazgos de Auditoría</span>
                      </div>
                      {auditorias.length === 0 ? (
                        <p className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">No hay hallazgos registrados</p>
                      ) : (
                        <div className="divide-y divide-slate-50 dark:divide-slate-700">
                          {auditorias.map(h => (
                            <div key={h.id} className="p-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                              <div className="flex items-center justify-between mb-2">
                                <span className={`badge ${h.tipo === 'no_conformidad' ? 'badge-red' : h.tipo === 'observacion' ? 'badge-yellow' : 'badge-green'}`}>
                                  {h.tipo.replace('_', ' ')}
                                </span>
                                <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{h.plan_codigo}</span>
                              </div>
                              <p className="text-sm text-slate-700 dark:text-slate-300 mb-2 leading-relaxed">{h.descripcion}</p>
                              <div className="flex gap-2">
                                <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-500 font-semibold tracking-wide">Gravedad: {h.gravedad}</span>
                                <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-500 font-semibold tracking-wide">Estado: {h.estado}</span>
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
