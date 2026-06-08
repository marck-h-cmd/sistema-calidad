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
  const [form, setForm] = useState({});
  const [error, setError] = useState('');

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try {
      const [c, u, h] = await Promise.all([
        api.get('/capas'),
        api.get('/usuarios'),
        api.get('/hallazgos'),
      ]);
      setCapas(c.data); setUsuarios(u.data); setHallazgos(h.data);
    } catch {}
  };

  const abrirModal = () => {
    setForm({
      codigo: '', tipo: 'correctiva', descripcion: '',
      causa_raiz: '', accion_propuesta: '',
      responsable_id: usuarios[0]?.id || '',
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

  const capasFiltradas = filtroEstado ? capas.filter(c => c.estado === filtroEstado) : capas;

  const stats = {
    total: capas.length,
    registradas: capas.filter(c => c.estado === 'registrada').length,
    en_impl: capas.filter(c => c.estado === 'en_implementacion').length,
    cerradas: capas.filter(c => c.estado === 'cerrada').length,
  };

  return (
    <ProtectedLayout>
      <div className="px-6 md:px-8 py-5 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="page-title">Acciones Correctivas y Preventivas</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Módulo CAPA — Seguimiento y control</p>
          </div>
          <div className="flex gap-3">
            <button className="btn-secondary flex items-center gap-2" onClick={descargarPDF}>
              <Download className="w-4 h-4" />
              Reporte PDF
            </button>
            <button className="btn-primary flex items-center gap-2" onClick={abrirModal}>
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
            {['', 'registrada', 'en_implementacion', 'implementada', 'verificada', 'cerrada', 'rechazada'].map(s => (
              <button key={s} onClick={() => setFiltroEstado(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${filtroEstado === s ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
                {s || 'Todos'}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        <div className="space-y-3">
          {capasFiltradas.length === 0 && (
            <div className="card p-12 text-center text-slate-400 dark:text-slate-500 text-sm">No hay CAPAs registradas</div>
          )}
          {capasFiltradas.map(c => (
            <div key={c.id} className="card p-5">
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
                    {c.fecha_implementacion && <span>F. Implementación: {new Date(c.fecha_implementacion).toLocaleDateString('es-PE')}</span>}
                    {c.hallazgo_descripcion && <span>Hallazgo: {c.hallazgo_descripcion.substring(0, 40)}...</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal */}
        {modal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
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
      </div>
    </ProtectedLayout>
  );
}
