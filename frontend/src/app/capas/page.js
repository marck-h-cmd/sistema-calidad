'use client';
import { useState, useEffect } from 'react';
import ProtectedLayout from '@/components/Layout/ProtectedLayout';
import api from '@/lib/api';
import { X, Download, Plus } from 'lucide-react';

const estadoColor = {
  registrada: 'badge-blue', en_implementacion: 'badge-yellow',
  implementada: 'badge-blue', verificada: 'badge-blue',
  cerrada: 'badge-green', rechazada: 'badge-red',
};
const efectividadColor = { efectiva: 'badge-green', parcial: 'badge-yellow', no_efectiva: 'badge-red', pendiente: 'badge-gray' };

export default function CapasPage() {
  const [capas, setCapas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [hallazgos, setHallazgos] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [modal, setModal] = useState(false);
  const [modalSeg, setModalSeg] = useState(null);
  const [capaExpandida, setCapaExpandida] = useState(null);
  const [seguimientos, setSeguimientos] = useState([]);
  const [form, setForm] = useState({});
  const [formSeg, setFormSeg] = useState({ fecha_seguimiento: '', avance: 0, observaciones: '' });
  const [error, setError] = useState('');

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try {
      const resCapas = await api.get('/capas');
      setCapas(resCapas.data || []);
    } catch (e) {
      console.error("Error al cargar capas:", e);
    }
    try {
      const resUsuarios = await api.get('/usuarios');
      setUsuarios(resUsuarios.data || []);
    } catch (e) {
      console.error("Error al cargar usuarios:", e);
    }
    try {
      const resHallazgos = await api.get('/hallazgos');
      setHallazgos(resHallazgos.data || []);
    } catch (e) {
      console.error("Error al cargar hallazgos:", e);
    }
  };

  const abrirModal = () => {
    setForm({
      codigo: '', tipo: 'correctiva', descripcion: '',
      causa_raiz: '', accion_propuesta: '',
      responsable_id: '',
      hallazgo_id: '', fecha_implementacion: '', fecha_verificacion: '',
    });
    setError(''); setModal(true);
  };

  const guardar = async (e) => {
    e.preventDefault(); setError('');
    try {
      await api.post('/capas', form);
      setModal(false); cargar();
    } catch (err) { setError(err.response?.data?.error || 'Error al guardar'); }
  };

  const cambiarEstado = async (id, estado) => {
    await api.patch(`/capas/${id}/estado`, { estado }); cargar();
  };

  const descargarPDF = async () => {
    const res = await api.get('/reportes/capas', { responseType: 'blob' });
    Object.assign(document.createElement('a'), { href: URL.createObjectURL(res.data), download: 'capas.pdf' }).click();
  };

  const verSeguimientos = async (id) => {
    if (capaExpandida === id) {
      setCapaExpandida(null);
      return;
    }
    setCapaExpandida(id);
    try {
      const { data } = await api.get(`/capas/${id}/seguimientos`);
      setSeguimientos(data);
    } catch { setSeguimientos([]); }
  };

  const guardarSeguimiento = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/capas/${modalSeg}/seguimiento`, formSeg);
      setModalSeg(null);
      verSeguimientos(modalSeg); // refresh seguimientos
      cargar(); // refresh avance
    } catch (err) { alert(err.response?.data?.error || 'Error'); }
  };

  const capasFiltradas = capas.filter(c => {
    if (filtroEstado === 'vencidas') {
      return c.fecha_implementacion && new Date(c.fecha_implementacion) < new Date() && !['cerrada', 'verificada', 'implementada'].includes(c.estado);
    }
    return filtroEstado ? c.estado === filtroEstado : true;
  });

  const stats = {
    total: capas.length,
    registradas: capas.filter(c => c.estado === 'registrada').length,
    en_impl: capas.filter(c => c.estado === 'en_implementacion').length,
    cerradas: capas.filter(c => c.estado === 'cerrada').length,
  };

  return (
    <ProtectedLayout>
      <div className="px-6 md:px-8 py-5 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-title">Acciones Correctivas y Preventivas</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Módulo CAPA — Seguimiento y control</p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button className="btn-secondary flex items-center justify-center gap-2 flex-1 sm:flex-none" onClick={descargarPDF}>
              <Download className="w-4 h-4" />
              Reporte PDF
            </button>
            <button className="btn-primary flex items-center justify-center gap-2 flex-1 sm:flex-none" onClick={abrirModal}>
              <Plus className="w-4 h-4" />
              Nueva CAPA
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 animate-in space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total CAPAs', value: stats.total, color: 'bg-slate-600' },
            { label: 'Registradas', value: stats.registradas, color: 'bg-blue-600' },
            { label: 'En Implementación', value: stats.en_impl, color: 'bg-amber-600' },
            { label: 'Cerradas', value: stats.cerradas, color: 'bg-emerald-600' },
          ].map((s, i) => (
            <div key={i} className="card p-5">
              <div className={`w-8 h-8 ${s.color} rounded-xl flex items-center justify-center text-white font-bold text-sm mb-2`}>{s.value}</div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filtro */}
        <div className="card px-4 py-3.5 flex flex-wrap gap-3 items-center">
          <span className="text-sm text-slate-500 dark:text-slate-400">Filtrar por estado:</span>
          <div className="flex gap-2 flex-wrap">
            {['', 'vencidas', 'registrada', 'en_implementacion', 'implementada', 'verificada', 'cerrada', 'rechazada'].map(s => (
              <button key={s} onClick={() => setFiltroEstado(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${filtroEstado === s ? 'bg-blue-600 text-white' : s === 'vencidas' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
                {s === 'vencidas' ? 'Vencidas' : (s ? s.replace('_', ' ') : 'Todas')}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        <div className="space-y-3">
          {capasFiltradas.length === 0 && (
            <div className="card p-12 text-center text-slate-400 dark:text-slate-500 text-sm">No hay CAPAs registradas</div>
          )}
          {capasFiltradas.map(c => {
            const vencida = c.fecha_implementacion && new Date(c.fecha_implementacion) < new Date() && !['cerrada', 'verificada', 'implementada'].includes(c.estado);
            return (
            <div key={c.id} className={`card p-5 ${vencida ? 'border-2 border-red-500 bg-red-50 dark:bg-red-900/10' : ''}`}>
              <div className="flex items-start gap-4">
                <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${c.tipo === 'correctiva' ? 'bg-red-500' : c.tipo === 'preventiva' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-slate-400 dark:text-slate-500">{c.codigo}</span>
                      <span className={`badge ${c.tipo === 'correctiva' ? 'badge-red' : c.tipo === 'preventiva' ? 'badge-blue' : 'badge-green'}`}>{c.tipo}</span>
                      <span className={`badge ${estadoColor[c.estado] || 'badge-gray'}`}>{c.estado?.replace('_', ' ')}</span>
                      {c.efectividad && <span className={`badge ${efectividadColor[c.efectividad] || 'badge-gray'}`}>{c.efectividad}</span>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                        onClick={() => verSeguimientos(c.id)}>
                        {capaExpandida === c.id ? 'Ocultar Seguimientos' : 'Ver Seguimientos'}
                      </button>
                      <button className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1"
                        onClick={() => { setFormSeg({ fecha_seguimiento: new Date().toISOString().split('T')[0], avance: c.avance || 0, observaciones: '' }); setModalSeg(c.id); }}>
                        <Plus className="w-3 h-3" /> Seguimiento
                      </button>
                      <select
                        className="text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={c.estado}
                        onChange={e => cambiarEstado(c.id, e.target.value)}>
                        {['registrada', 'en_implementacion', 'implementada', 'verificada', 'cerrada', 'rechazada'].map(s => (
                          <option key={s} value={s}>{s.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">{c.descripcion}</p>
                  {c.causa_raiz && <p className="text-xs text-slate-500 dark:text-slate-400 mb-1"><span className="font-semibold">Causa raíz:</span> {c.causa_raiz}</p>}
                  {c.accion_propuesta && <p className="text-xs text-slate-500 dark:text-slate-400 mb-1"><span className="font-semibold">Acción:</span> {c.accion_propuesta}</p>}
                  <div className="flex gap-4 mt-2 text-xs text-slate-400 dark:text-slate-500 flex-wrap">
                    <span>Responsable: <span className="text-slate-600 dark:text-slate-300">{c.responsable_nombre || '-'}</span></span>
                    {c.fecha_implementacion && <span className={vencida ? 'text-red-500 font-bold' : ''}>F. Implementación: {new Date(c.fecha_implementacion).toLocaleDateString('es-PE')}</span>}
                    {c.hallazgo_descripcion && <span>Hallazgo: {c.hallazgo_descripcion.substring(0, 40)}...</span>}
                  </div>

                  {/* Barra de progreso */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-slate-600 dark:text-slate-300">Avance ({c.avance}%)</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                      <div className={`h-2.5 rounded-full transition-all ${c.avance === 100 ? 'bg-green-500' : 'bg-blue-600'}`} style={{ width: `${c.avance}%` }}></div>
                    </div>
                  </div>

                  {/* Timeline Seguimientos */}
                  {capaExpandida === c.id && (
                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                      <h4 className="text-sm font-semibold mb-4 text-slate-700 dark:text-slate-300">Historial de Seguimientos</h4>
                      {seguimientos.length === 0 ? (
                        <p className="text-xs text-slate-400">No hay seguimientos registrados.</p>
                      ) : (
                        <div className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-3 space-y-4">
                          {seguimientos.map((seg, i) => (
                            <div key={i} className="pl-6 relative">
                              <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[7px] top-1 border-2 border-white dark:border-slate-900"></div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                                {new Date(seg.fecha_seguimiento).toLocaleDateString('es-PE')} - <span className="font-medium text-slate-700 dark:text-slate-300">Avance: {seg.avance}%</span>
                              </div>
                              <p className="text-sm text-slate-800 dark:text-slate-200">{seg.observaciones}</p>
                              <p className="text-[10px] text-slate-400 mt-1">Registrado por: {seg.creado_por_nombre}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            </div>
          )})}
        </div>

        {/* Modal */}
        {modal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10 rounded-t-3xl">
                <h2 className="section-title">Nueva CAPA</h2>
              </div>
              <form onSubmit={guardar} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Código</label>
                    <input className="input" placeholder="CAPA-2024-001" value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} required />
                  </div>
                  <div>
                    <label className="label">Tipo</label>
                    <select className="select" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                      <option value="correctiva">Correctiva</option>
                      <option value="preventiva">Preventiva</option>
                      <option value="mejora">Mejora</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Hallazgo asociado (opcional)</label>
                  <select className="select" value={form.hallazgo_id} onChange={e => setForm({ ...form, hallazgo_id: e.target.value })}>
                    <option value="">Sin hallazgo</option>
                    {hallazgos.map(h => <option key={h.id} value={h.id}>{h.descripcion?.substring(0, 60)}...</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Descripción del problema</label>
                  <textarea className="input" rows={2} value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Causa Raíz</label>
                  <textarea className="input" rows={2} value={form.causa_raiz} onChange={e => setForm({ ...form, causa_raiz: e.target.value })} />
                </div>
                <div>
                  <label className="label">Acción Propuesta</label>
                  <textarea className="input" rows={2} value={form.accion_propuesta} onChange={e => setForm({ ...form, accion_propuesta: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Responsable</label>
                  <select className="select" value={form.responsable_id} onChange={e => setForm({ ...form, responsable_id: e.target.value })} required>
                    <option value="">Seleccionar responsable</option>
                    {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombres} {u.apellidos}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Fecha Implementación</label>
                    <input type="date" className="input" value={form.fecha_implementacion} onChange={e => setForm({ ...form, fecha_implementacion: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Fecha Verificación</label>
                    <input type="date" className="input" value={form.fecha_verificacion} onChange={e => setForm({ ...form, fecha_verificacion: e.target.value })} />
                  </div>
                </div>
                {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}
                <div className="flex gap-3 pt-2">
                  <button type="button" className="btn-secondary flex-1" onClick={() => setModal(false)}>Cancelar</button>
                  <button type="submit" className="btn-primary flex-1">Registrar CAPA</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Seguimiento */}
        {modalSeg && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-[95vw] sm:max-w-md p-6">
              <h2 className="section-title mb-4">Registrar Seguimiento</h2>
              <form onSubmit={guardarSeguimiento} className="space-y-4">
                <div>
                  <label className="label">Fecha del Seguimiento</label>
                  <input type="date" className="input" value={formSeg.fecha_seguimiento} onChange={e => setFormSeg({ ...formSeg, fecha_seguimiento: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Avance (%): <span className="text-blue-600 font-bold">{formSeg.avance}</span></label>
                  <input type="range" min="0" max="100" className="w-full accent-blue-600" value={formSeg.avance} onChange={e => setFormSeg({ ...formSeg, avance: parseInt(e.target.value) })} />
                </div>
                <div>
                  <label className="label">Observaciones</label>
                  <textarea className="input" rows={3} value={formSeg.observaciones} onChange={e => setFormSeg({ ...formSeg, observaciones: e.target.value })} required />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" className="btn-secondary flex-1" onClick={() => setModalSeg(null)}>Cancelar</button>
                  <button type="submit" className="btn-primary flex-1">Guardar</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
