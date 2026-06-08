'use client';
import { useState, useEffect } from 'react';
import ProtectedLayout from '@/components/Layout/ProtectedLayout';
import api from '@/lib/api';
import { X, Plus } from 'lucide-react';

export default function AcreditacionPage() {
  const [certificaciones, setCertificaciones] = useState([]);
  const [requisitos, setRequisitos] = useState([]);
  const [certSel, setCertSel] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try { const { data } = await api.get('/certificaciones'); setCertificaciones(data); }
    catch {}
  };

  const verRequisitos = async (c) => {
    setCertSel(c);
    try { const { data } = await api.get(`/certificaciones/${c.id}/requisitos`); setRequisitos(data); }
    catch { setRequisitos([]); }
  };

  const guardarCertificacion = async (e) => {
    e.preventDefault(); setError('');
    try { await api.post('/certificaciones', form); setModal(null); cargar(); }
    catch (err) { setError(err.response?.data?.error || 'Error'); }
  };

  const guardarRequisito = async (e) => {
    e.preventDefault(); setError('');
    try { await api.post('/requisitos', { ...form, certificacion_id: certSel.id }); setModal(null); verRequisitos(certSel); }
    catch (err) { setError(err.response?.data?.error || 'Error'); }
  };

  const cambiarEstadoRequisito = async (id, estado) => {
    try { await api.patch(`/requisitos/${id}`, { estado }); verRequisitos(certSel); }
    catch {}
  };

  return (
    <ProtectedLayout>
      <div className="px-6 md:px-8 py-5 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="page-title">Gestión de Acreditación</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{certificaciones.length} certificaciones registradas</p>
          </div>
          <button className="btn-primary flex items-center gap-2" onClick={() => { setForm({ nombre: '', organismo: '', norma: '', fecha_emision: '', fecha_vencimiento: '', estado: 'activo' }); setError(''); setModal('certificacion'); }}>
            <Plus className="w-4 h-4" />
            Nueva Certificación
          </button>
        </div>
      </div>

      <div className="p-6 md:p-8 animate-in">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 card overflow-hidden">
            <div className="px-4 py-3.5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Certificaciones</span>
            </div>
            <div className="divide-y divide-slate-50 dark:divide-slate-700">
              {certificaciones.length === 0 && <p className="p-6 text-center text-slate-400 dark:text-slate-500 text-sm">No hay certificaciones</p>}
              {certificaciones.map(c => (
                <div key={c.id} onClick={() => verRequisitos(c)}
                  className={`p-4 cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors ${certSel?.id === c.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-600' : ''}`}>
                  <p className="font-medium text-slate-800 dark:text-slate-200 text-sm">{c.nombre}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{c.organismo} • {c.norma}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Vence: {new Date(c.fecha_vencimiento).toLocaleDateString('es-PE')}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-3 card overflow-hidden">
            <div className="px-4 py-3.5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                {certSel ? `Requisitos: ${certSel.nombre}` : 'Selecciona una certificación'}
              </span>
              {certSel && (
                <button className="btn-primary text-xs py-1.5 px-3" onClick={() => { setForm({ descripcion: '', categoria: '', responsable: '', fecha_limite: '', estado: 'pendiente' }); setError(''); setModal('requisito'); }}>
                  <Plus className="w-3.5 h-3.5 inline mr-1" />
                  Requisito
                </button>
              )}
            </div>
            <div className="divide-y divide-slate-50 dark:divide-slate-700">
              {!certSel && <p className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">Haz clic en una certificación para ver sus requisitos</p>}
              {certSel && requisitos.length === 0 && <p className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">No hay requisitos registrados</p>}
              {requisitos.map(r => (
                <div key={r.id} className="p-4">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    {r.categoria && <span className="badge badge-blue">{r.categoria}</span>}
                    <select className="text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl px-2 py-1" value={r.estado} onChange={e => cambiarEstadoRequisito(r.id, e.target.value)}>
                      {['pendiente', 'en_proceso', 'cumplido', 'no_aplicable'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <p className="text-sm text-slate-800 dark:text-slate-200">{r.descripcion}</p>
                  <div className="flex gap-4 mt-1 text-xs text-slate-400 dark:text-slate-500 flex-wrap">
                    {r.responsable && <span>Responsable: {r.responsable}</span>}
                    {r.fecha_limite && <span>Límite: {new Date(r.fecha_limite).toLocaleDateString('es-PE')}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {modal === 'certificacion' && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6">
              <h2 className="section-title mb-4">Nueva Certificación</h2>
              <form onSubmit={guardarCertificacion} className="space-y-4">
                <div><label className="label">Nombre</label><input className="input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required /></div>
                <div><label className="label">Organismo Certificador</label><input className="input" value={form.organismo} onChange={e => setForm({ ...form, organismo: e.target.value })} required /></div>
                <div><label className="label">Norma/Estándar</label><input className="input" value={form.norma} onChange={e => setForm({ ...form, norma: e.target.value })} required /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Fecha Emisión</label><input type="date" className="input" value={form.fecha_emision} onChange={e => setForm({ ...form, fecha_emision: e.target.value })} /></div>
                  <div><label className="label">Fecha Vencimiento</label><input type="date" className="input" value={form.fecha_vencimiento} onChange={e => setForm({ ...form, fecha_vencimiento: e.target.value })} /></div>
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

        {modal === 'requisito' && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6">
              <h2 className="section-title mb-4">Nuevo Requisito</h2>
              <form onSubmit={guardarRequisito} className="space-y-4">
                <div><label className="label">Descripción</label><textarea className="input" rows={2} value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} required /></div>
                <div><label className="label">Categoría</label><input className="input" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Responsable</label><input className="input" value={form.responsable} onChange={e => setForm({ ...form, responsable: e.target.value })} /></div>
                  <div><label className="label">Fecha Límite</label><input type="date" className="input" value={form.fecha_limite} onChange={e => setForm({ ...form, fecha_limite: e.target.value })} /></div>
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
