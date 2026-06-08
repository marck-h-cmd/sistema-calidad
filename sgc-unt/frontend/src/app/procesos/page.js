'use client';
import { useState, useEffect } from 'react';
import ProtectedLayout from '@/components/Layout/ProtectedLayout';
import api from '@/lib/api';
import { X, Download, Plus } from 'lucide-react';

const tipoColor = { estrategico: 'badge-blue', misional: 'badge-green', apoyo: 'badge-yellow', evaluacion: 'badge-gray' };

export default function ProcesosPage() {
  const [macroprocesos, setMacroprocesos] = useState([]);
  const [procesos, setProcesos] = useState([]);
  const [actividades, setActividades] = useState([]);
  const [procesoSel, setProcesoSel] = useState(null);
  const [tab, setTab] = useState('procesos');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try {
      const [mp, pr] = await Promise.all([api.get('/macroprocesos'), api.get('/procesos')]);
      setMacroprocesos(mp.data); setProcesos(pr.data);
    } catch {}
  };

  const verActividades = async (p) => {
    setProcesoSel(p);
    try { const { data } = await api.get(`/procesos/${p.id}/actividades`); setActividades(data); }
    catch { setActividades([]); }
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
    try { await api.post('/actividades', { ...form, proceso_id: procesoSel.id }); setModal(null); verActividades(procesoSel); }
    catch (err) { setError(err.response?.data?.error || 'Error'); }
  };

  const descargarPDF = async () => {
    const res = await api.get('/reportes/procesos', { responseType: 'blob' });
    Object.assign(document.createElement('a'), { href: URL.createObjectURL(res.data), download: 'procesos.pdf' }).click();
  };

  return (
    <ProtectedLayout>
      <div className="px-6 md:px-8 py-5 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="page-title">Mapa de Procesos</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{procesos.length} procesos | {macroprocesos.length} macroprocesos</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button className="btn-secondary flex items-center gap-2" onClick={descargarPDF}>
              <Download className="w-4 h-4" />
              Reporte PDF
            </button>
            <button className="btn-secondary flex items-center gap-2" onClick={() => { setForm({ codigo: '', nombre: '', descripcion: '', tipo: 'misional' }); setError(''); setModal('macro'); }}>
              <Plus className="w-4 h-4" />
              Macroproceso
            </button>
            <button className="btn-primary flex items-center gap-2" onClick={() => { setForm({ codigo: '', nombre: '', objetivo: '', macroproceso_id: macroprocesos[0]?.id || '' }); setError(''); setModal('proceso'); }}>
              <Plus className="w-4 h-4" />
              Proceso
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 animate-in">
        <div className="flex gap-4 mb-6 border-b border-slate-200 dark:border-slate-700">
          {['procesos', 'macroprocesos'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${tab === t ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
              {t === 'procesos' ? 'Procesos' : 'Macroprocesos'}
            </button>
          ))}
        </div>

        {tab === 'macroprocesos' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {macroprocesos.map(m => (
              <div key={m.id} className="card p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs text-slate-400 dark:text-slate-500">{m.codigo}</span>
                  <span className={`badge ${tipoColor[m.tipo] || 'badge-gray'}`}>{m.tipo}</span>
                </div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{m.nombre}</p>
                {m.descripcion && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{m.descripcion}</p>}
              </div>
            ))}
            {macroprocesos.length === 0 && <p className="text-slate-400 dark:text-slate-500 text-sm col-span-3">No hay macroprocesos registrados</p>}
          </div>
        )}

        {tab === 'procesos' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 card overflow-hidden">
              <div className="px-4 py-3.5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Procesos</span>
              </div>
              <div className="divide-y divide-slate-50 dark:divide-slate-700">
                {procesos.length === 0 && <p className="p-6 text-center text-slate-400 dark:text-slate-500 text-sm">Sin procesos</p>}
                {procesos.map(p => (
                  <div key={p.id} onClick={() => verActividades(p)}
                    className={`p-4 cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors flex items-start justify-between gap-3 ${procesoSel?.id === p.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-600' : ''}`}>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 dark:text-slate-200 text-sm">{p.codigo} — {p.nombre}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{p.objetivo || 'Sin objetivo'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{p.macroproceso_nombre || 'Sin macroproceso'}</p>
                    </div>
                    <span className={`badge shrink-0 ${p.estado === 'activo' ? 'badge-green' : 'badge-yellow'}`}>{p.estado}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-3 card overflow-hidden">
              <div className="px-4 py-3.5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                  {procesoSel ? `Actividades: ${procesoSel.nombre}` : 'Selecciona un proceso'}
                </span>
                {procesoSel && (
                  <button className="btn-primary text-xs py-1.5 px-3" onClick={() => { setForm({ codigo: '', nombre: '', descripcion: '', secuencia: actividades.length + 1, entradas: '', salidas: '' }); setError(''); setModal('actividad'); }}>
                    <Plus className="w-3.5 h-3.5 inline mr-1" />
                    Actividad
                  </button>
                )}
              </div>
              <div className="divide-y divide-slate-50 dark:divide-slate-700">
                {!procesoSel && <p className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">Haz clic en un proceso para ver sus actividades</p>}
                {procesoSel && actividades.length === 0 && <p className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">No hay actividades registradas</p>}
                {actividades.map((a, i) => (
                  <div key={a.id} className="p-4 flex gap-4">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 dark:text-slate-200 text-sm">{a.codigo} — {a.nombre}</p>
                      {a.descripcion && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{a.descripcion}</p>}
                      <div className="flex gap-4 mt-1.5 text-xs text-slate-400 dark:text-slate-500 flex-wrap">
                        {a.entradas && <span>Entradas: {a.entradas}</span>}
                        {a.salidas && <span>Salidas: {a.salidas}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {modal === 'macro' && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6">
              <h2 className="section-title mb-4">Nuevo Macroproceso</h2>
              <form onSubmit={guardarMacroproceso} className="space-y-4">
                <div><label className="label">Código</label><input className="input" value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} required /></div>
                <div><label className="label">Nombre</label><input className="input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required /></div>
                <div><label className="label">Tipo</label>
                  <select className="select" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                    {['estrategico', 'misional', 'apoyo', 'evaluacion'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className="label">Descripción</label><textarea className="input" rows={2} value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} /></div>
                {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}
                <div className="flex gap-3">
                  <button type="button" className="btn-secondary flex-1" onClick={() => setModal(null)}>Cancelar</button>
                  <button type="submit" className="btn-primary flex-1">Guardar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {modal === 'proceso' && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6">
              <h2 className="section-title mb-4">Nuevo Proceso</h2>
              <form onSubmit={guardarProceso} className="space-y-4">
                <div><label className="label">Código</label><input className="input" value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} required /></div>
                <div><label className="label">Nombre</label><input className="input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required /></div>
                <div><label className="label">Macroproceso</label>
                  <select className="select" value={form.macroproceso_id} onChange={e => setForm({ ...form, macroproceso_id: e.target.value })}>
                    <option value="">Sin macroproceso</option>
                    {macroprocesos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div><label className="label">Objetivo</label><textarea className="input" rows={2} value={form.objetivo} onChange={e => setForm({ ...form, objetivo: e.target.value })} /></div>
                {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}
                <div className="flex gap-3">
                  <button type="button" className="btn-secondary flex-1" onClick={() => setModal(null)}>Cancelar</button>
                  <button type="submit" className="btn-primary flex-1">Guardar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {modal === 'actividad' && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6">
              <h2 className="section-title mb-4">Nueva Actividad</h2>
              <form onSubmit={guardarActividad} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Código</label><input className="input" value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} required /></div>
                  <div><label className="label">Secuencia</label><input type="number" className="input" value={form.secuencia} onChange={e => setForm({ ...form, secuencia: e.target.value })} required /></div>
                </div>
                <div><label className="label">Nombre</label><input className="input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required /></div>
                <div><label className="label">Descripción</label><textarea className="input" rows={2} value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Entradas</label><input className="input" value={form.entradas} onChange={e => setForm({ ...form, entradas: e.target.value })} /></div>
                  <div><label className="label">Salidas</label><input className="input" value={form.salidas} onChange={e => setForm({ ...form, salidas: e.target.value })} /></div>
                </div>
                {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}
                <div className="flex gap-3">
                  <button type="button" className="btn-secondary flex-1" onClick={() => setModal(null)}>Cancelar</button>
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
