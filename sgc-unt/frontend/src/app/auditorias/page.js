'use client';
import { useState, useEffect } from 'react';
import ProtectedLayout from '@/components/Layout/ProtectedLayout';
import api from '@/lib/api';
import { X, Download, Plus } from 'lucide-react';

const estadoColor = { planificado: 'badge-blue', en_ejecucion: 'badge-yellow', finalizada: 'badge-green', cerrada: 'badge-gray' };

export default function AuditoriasPage() {
  const [auditorias, setAuditorias] = useState([]);
  const [programas, setProgramas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [hallazgos, setHallazgos] = useState([]);
  const [auditoriaSel, setAuditoriaSel] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try {
      const [a, p, u] = await Promise.all([api.get('/auditorias'), api.get('/programas'), api.get('/usuarios')]);
      setAuditorias(a.data); setProgramas(p.data); setUsuarios(u.data);
    } catch {}
  };

  const verHallazgos = async (a) => {
    setAuditoriaSel(a);
    try { const { data } = await api.get(`/auditorias/${a.id}/hallazgos`); setHallazgos(data); }
    catch { setHallazgos([]); }
  };

  const guardarAuditoria = async (e) => {
    e.preventDefault(); setError('');
    try { await api.post('/auditorias', form); setModal(null); cargar(); }
    catch (err) { setError(err.response?.data?.error || 'Error'); }
  };

  const guardarHallazgo = async (e) => {
    e.preventDefault(); setError('');
    try { await api.post('/hallazgos', { ...form, auditoria_id: auditoriaSel.id }); setModal(null); verHallazgos(auditoriaSel); }
    catch (err) { setError(err.response?.data?.error || 'Error'); }
  };

  const cambiarEstadoHallazgo = async (id, estado) => {
    try { await api.patch(`/hallazgos/${id}`, { estado }); verHallazgos(auditoriaSel); }
    catch {}
  };

  const descargarPDF = async () => {
    const res = await api.get('/reportes/auditorias', { responseType: 'blob' });
    Object.assign(document.createElement('a'), { href: URL.createObjectURL(res.data), download: 'auditorias.pdf' }).click();
  };

  return (
    <ProtectedLayout>
      <div className="px-6 md:px-8 py-5 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="page-title">Gestión de Auditorías</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{auditorias.length} auditorías registradas</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button className="btn-secondary flex items-center gap-2" onClick={descargarPDF}>
              <Download className="w-4 h-4" />
              Reporte PDF
            </button>
            <button className="btn-primary flex items-center gap-2" onClick={() => { setForm({ codigo: '', tipo: 'interna', fecha: new Date().toISOString().split('T')[0], alcance: '', criterios: '', programa_id: '', auditor_lider_id: usuarios[0]?.id || '' }); setError(''); setModal('auditoria'); }}>
              <Plus className="w-4 h-4" />
              Nueva Auditoría
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 animate-in">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 card overflow-hidden">
            <div className="px-4 py-3.5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Auditorías</span>
            </div>
            <div className="divide-y divide-slate-50 dark:divide-slate-700">
              {auditorias.length === 0 && <p className="p-6 text-center text-slate-400 dark:text-slate-500 text-sm">No hay auditorías</p>}
              {auditorias.map(a => (
                <div key={a.id} onClick={() => verHallazgos(a)}
                  className={`p-4 cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors ${auditoriaSel?.id === a.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-600' : ''}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-800 dark:text-slate-200 text-sm">{a.codigo}</span>
                    <span className={`badge ${estadoColor[a.estado] || 'badge-gray'}`}>{a.estado}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Tipo: {a.tipo} • Fecha: {new Date(a.fecha).toLocaleDateString('es-PE')}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{a.alcance?.substring(0, 40)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-3 card overflow-hidden">
            <div className="px-4 py-3.5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                {auditoriaSel ? `Hallazgos: ${auditoriaSel.codigo}` : 'Selecciona una auditoría'}
              </span>
              {auditoriaSel && (
                <button className="btn-primary text-xs py-1.5 px-3" onClick={() => { setForm({ descripcion: '', tipo: 'desviacion_menor', severidad: 'media', area: '', recomendacion: '' }); setError(''); setModal('hallazgo'); }}>
                  <Plus className="w-3.5 h-3.5 inline mr-1" />
                  Hallazgo
                </button>
              )}
            </div>
            <div className="divide-y divide-slate-50 dark:divide-slate-700">
              {!auditoriaSel && <p className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">Haz clic en una auditoría para ver sus hallazgos</p>}
              {auditoriaSel && hallazgos.length === 0 && <p className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">No hay hallazgos registrados</p>}
              {hallazgos.map(h => (
                <div key={h.id} className="p-4">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`badge ${h.tipo === 'desviacion_mayor' ? 'badge-red' : h.tipo === 'desviacion_menor' ? 'badge-yellow' : h.tipo === 'observacion' ? 'badge-blue' : 'badge-green'}`}>{h.tipo}</span>
                      <span className={`badge ${h.severidad === 'alta' ? 'badge-red' : h.severidad === 'media' ? 'badge-yellow' : 'badge-blue'}`}>{h.severidad}</span>
                    </div>
                    <select className="text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl px-2 py-1" value={h.estado} onChange={e => cambiarEstadoHallazgo(h.id, e.target.value)}>
                      {['identificado', 'analisis', 'planificado', 'implementado', 'verificado', 'cerrado'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <p className="text-sm text-slate-800 dark:text-slate-200">{h.descripcion}</p>
                  {h.area && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Área: {h.area}</p>}
                  {h.recomendacion && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Recomendación: {h.recomendacion}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {modal === 'auditoria' && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6">
              <h2 className="section-title mb-4">Nueva Auditoría</h2>
              <form onSubmit={guardarAuditoria} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Código</label><input className="input" value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} required /></div>
                  <div><label className="label">Tipo</label>
                    <select className="select" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                      {['interna', 'externa', 'certificacion', 'seguimiento'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div><label className="label">Fecha</label><input type="date" className="input" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} required /></div>
                <div><label className="label">Alcance</label><textarea className="input" rows={2} value={form.alcance} onChange={e => setForm({ ...form, alcance: e.target.value })} /></div>
                <div><label className="label">Criterios</label><textarea className="input" rows={2} value={form.criterios} onChange={e => setForm({ ...form, criterios: e.target.value })} /></div>
                <div><label className="label">Auditor Líder</label>
                  <select className="select" value={form.auditor_lider_id} onChange={e => setForm({ ...form, auditor_lider_id: e.target.value })}>
                    <option value="">Seleccionar</option>
                    {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombres} {u.apellidos}</option>)}
                  </select>
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

        {modal === 'hallazgo' && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6">
              <h2 className="section-title mb-4">Nuevo Hallazgo</h2>
              <form onSubmit={guardarHallazgo} className="space-y-4">
                <div><label className="label">Descripción</label><textarea className="input" rows={2} value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} required /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Tipo</label>
                    <select className="select" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                      {['desviacion_mayor', 'desviacion_menor', 'observacion', 'mejora'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div><label className="label">Severidad</label>
                    <select className="select" value={form.severidad} onChange={e => setForm({ ...form, severidad: e.target.value })}>
                      {['alta', 'media', 'baja'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div><label className="label">Área</label><input className="input" value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} /></div>
                <div><label className="label">Recomendación</label><textarea className="input" rows={2} value={form.recomendacion} onChange={e => setForm({ ...form, recomendacion: e.target.value })} /></div>
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
