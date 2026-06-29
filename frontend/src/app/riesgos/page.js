'use client';
import React, { useState, useEffect } from 'react';
import ProtectedLayout from '@/components/Layout/ProtectedLayout';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { X, Download, Plus } from 'lucide-react';

const nivelConfig = {
  bajo: { color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400' },
  medio: { color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400' },
  alto: { color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400' },
  critico: { color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
};

const calcularNivel = (p, i) => {
  const v = p * i;
  if (v <= 4) return 'bajo';
  if (v <= 9) return 'medio';
  if (v <= 14) return 'alto';
  return 'critico';
};

export default function RiesgosPage() {
  const { usuario } = useAuth();
  const esGestion = ['admin', 'gestor_calidad'].includes(usuario?.rol);

  const [riesgos, setRiesgos] = useState([]);
  const [procesos, setProcesos] = useState([]);
  const [filtroNivel, setFiltroNivel] = useState('');
  const [filtroCelda, setFiltroCelda] = useState(null); // {p, i}
  const [modal, setModal] = useState(false);
  const [mitigModal, setMitigModal] = useState(null);
  const [riesgoExpandido, setRiesgoExpandido] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [form, setForm] = useState({});
  const [mitigForm, setMitigForm] = useState({ descripcion: '', acciones: '', fecha_inicio: '', fecha_fin: '' });
  const [error, setError] = useState('');

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try {
      const [r, p] = await Promise.all([api.get('/riesgos'), api.get('/procesos')]);
      setRiesgos(r.data); setProcesos(p.data);
    } catch {}
  };

  const abrirModal = () => {
    setForm({ codigo: '', nombre: '', descripcion: '', categoria: 'operativo', probabilidad: 3, impacto: 3, proceso_id: '' });
    setError(''); setModal(true);
  };

  const guardar = async (e) => {
    e.preventDefault(); setError('');
    try { await api.post('/riesgos', form); setModal(false); cargar(); }
    catch (err) { setError(err.response?.data?.error || 'Error'); }
  };

  const cambiarEstado = async (id, estado) => {
    const r = riesgos.find(r => r.id === id);
    await api.patch(`/riesgos/${id}`, { estado, probabilidad: r.probabilidad, impacto: r.impacto });
    cargar();
    if (riesgoExpandido === id) verHistorial(id); // refresh history
  };

  const verHistorial = async (id) => {
    if (riesgoExpandido === id) {
      setRiesgoExpandido(null);
      return;
    }
    setRiesgoExpandido(id);
    try {
      const { data } = await api.get(`/riesgos/${id}/historial`);
      setHistorial(data);
    } catch { setHistorial([]); }
  };

  const guardarMitigacion = async (e) => {
    e.preventDefault();
    try {
      await api.post('/mitigaciones', { ...mitigForm, riesgo_id: mitigModal });
      setMitigModal(null);
      setMitigForm({ descripcion: '', acciones: '', fecha_inicio: '', fecha_fin: '' });
    } catch (err) { alert(err.response?.data?.error || 'Error'); }
  };

  const descargarPDF = async () => {
    const res = await api.get('/reportes/riesgos', { responseType: 'blob' });
    Object.assign(document.createElement('a'), { href: URL.createObjectURL(res.data), download: 'riesgos.pdf' }).click();
  };

  const riesgosFiltrados = riesgos.filter(r => {
    if (filtroCelda) return r.probabilidad === filtroCelda.p && r.impacto === filtroCelda.i;
    if (filtroNivel) return r.nivel_riesgo === filtroNivel;
    return true;
  });

  // Matriz stats
  const conteoNivel = ['critico', 'alto', 'medio', 'bajo'].map(n => ({
    nivel: n, count: riesgos.filter(r => r.nivel_riesgo === n).length,
  }));

  return (
    <ProtectedLayout>
      <div className="px-6 md:px-8 py-5 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-title">Gestión de Riesgos</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{riesgos.length} riesgos registrados</p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button className="btn-secondary flex items-center justify-center gap-2 flex-1 sm:flex-none" onClick={descargarPDF}>
              <Download className="w-4 h-4" />
              Reporte PDF
            </button>
            {esGestion && (
              <button className="btn-primary flex items-center justify-center gap-2 flex-1 sm:flex-none" onClick={abrirModal}>
                <Plus className="w-4 h-4" />
                Nuevo Riesgo
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 animate-in space-y-6">
        {/* Resumen */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {conteoNivel.map(({ nivel, count }) => {
            const cfg = nivelConfig[nivel];
            return (
              <div key={nivel} className="card p-5 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setFiltroNivel(filtroNivel === nivel ? '' : nivel)}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${cfg.dot}`} />
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400 capitalize">{nivel}</span>
                </div>
                <p className="text-3xl font-bold text-slate-800 dark:text-slate-200">{count}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">riesgos</p>
              </div>
            );
          })}
        </div>

        {/* Matriz 5x5 */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Matriz de Riesgos</h2>
          <div className="flex gap-4 items-end overflow-x-auto">
            <div className="flex flex-col gap-1 pb-6 items-center">
              <span className="text-xs font-semibold text-slate-500 transform -rotate-90 origin-center whitespace-nowrap w-4 h-24">Probabilidad</span>
            </div>
            <div className="flex flex-col">
              <div className="grid grid-cols-5 gap-1 mb-1 border-l-2 border-b-2 border-slate-300 dark:border-slate-600">
                {[5, 4, 3, 2, 1].map(p => (
                  <div key={`row-${p}`} className="contents">
                    {[1, 2, 3, 4, 5].map(i => {
                      const count = riesgos.filter(r => r.probabilidad === p && r.impacto === i).length;
                      const nivel = calcularNivel(p, i);
                      const bg = nivel === 'critico' ? 'bg-red-500' : nivel === 'alto' ? 'bg-orange-500' : nivel === 'medio' ? 'bg-amber-400' : 'bg-emerald-400';
                      const isSelected = filtroCelda?.p === p && filtroCelda?.i === i;
                      return (
                        <div key={`${p}-${i}`}
                          onClick={() => setFiltroCelda(isSelected ? null : { p, i })}
                          className={`w-12 h-12 md:w-16 md:h-16 flex flex-col items-center justify-center cursor-pointer hover:opacity-80 transition-all ${bg} ${isSelected ? 'ring-4 ring-blue-600 z-10' : ''}`}
                          title={`Probabilidad: ${p}, Impacto: ${i}`}>
                          {count > 0 && <span className="bg-white/90 text-slate-900 font-bold text-sm px-2 rounded-full shadow-sm">{count}</span>}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="flex justify-between w-full px-2 mt-2">
                <span className="text-xs font-semibold text-slate-500 text-center w-full">Impacto</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filtro nivel/celda */}
        {(filtroNivel || filtroCelda) && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">Mostrando filtro:</span>
            {filtroNivel && <span className={`badge ${nivelConfig[filtroNivel]?.color}`}>{filtroNivel}</span>}
            {filtroCelda && <span className={`badge bg-blue-100 text-blue-700`}>Prob {filtroCelda.p} - Imp {filtroCelda.i}</span>}
            <button onClick={() => { setFiltroNivel(''); setFiltroCelda(null); }} className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 underline">Limpiar filtro</button>
          </div>
        )}

        {/* Tabla */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
              <tr>
                <th className="table-header">Código</th>
                <th className="table-header">Nombre</th>
                <th className="table-header">Categoría</th>
                <th className="table-header">Prob.</th>
                <th className="table-header">Imp.</th>
                <th className="table-header">Nivel</th>
                <th className="table-header">Estado</th>
                <th className="table-header">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              {riesgosFiltrados.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">No hay riesgos registrados</td></tr>
              )}
              {riesgosFiltrados.map(r => {
                const nivel = r.nivel_riesgo || calcularNivel(r.probabilidad, r.impacto);
                const cfg = nivelConfig[nivel] || nivelConfig.bajo;
                return (
                  <React.Fragment key={r.id}>
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="table-cell font-mono text-xs">{r.codigo}</td>
                    <td className="table-cell">
                      <p className="font-medium text-slate-800 dark:text-slate-200">{r.nombre}</p>
                      {r.descripcion && <p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-xs">{r.descripcion}</p>}
                    </td>
                    <td className="table-cell capitalize text-slate-500 dark:text-slate-400">{r.categoria}</td>
                    <td className="table-cell">
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(i => <div key={i} className={`w-2.5 h-2.5 rounded-full ${i <= r.probabilidad ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`} />)}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(i => <div key={i} className={`w-2.5 h-2.5 rounded-full ${i <= r.impacto ? 'bg-red-500' : 'bg-slate-200 dark:bg-slate-700'}`} />)}
                      </div>
                    </td>
                    <td className="table-cell"><span className={`badge ${cfg.color}`}>{nivel.toUpperCase()}</span></td>
                    <td className="table-cell">
                      {esGestion ? (
                        <select className="text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl px-2 py-1"
                          value={r.estado} onChange={e => cambiarEstado(r.id, e.target.value)}>
                          {['activo', 'mitigado', 'aceptado', 'eliminado'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      ) : (
                        <span className="text-xs text-slate-600 dark:text-slate-400 capitalize">{r.estado}</span>
                      )}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <button onClick={() => verHistorial(r.id)} className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-medium">
                          {riesgoExpandido === r.id ? 'Ocultar Historial' : 'Historial'}
                        </button>
                        {esGestion && (
                          <button onClick={() => setMitigModal(r.id)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs font-medium">
                            + Mitigación
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {riesgoExpandido === r.id && (
                    <tr className="bg-slate-50/50 dark:bg-slate-800/20">
                      <td colSpan={8} className="p-4">
                        <div className="pl-4">
                          <h4 className="text-xs font-semibold mb-3 text-slate-600 dark:text-slate-300">Historial de Cambios de Estado</h4>
                          {historial.length === 0 ? (
                            <p className="text-xs text-slate-400">No hay cambios registrados.</p>
                          ) : (
                            <div className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-2 space-y-3">
                              {historial.map((h, i) => (
                                <div key={i} className="pl-4 relative">
                                  <div className="absolute w-2.5 h-2.5 bg-slate-400 rounded-full -left-[6px] top-1 border-2 border-white dark:border-slate-900"></div>
                                  <p className="text-xs text-slate-600 dark:text-slate-300">
                                    Cambió de <span className="font-semibold">{h.estado_anterior}</span> a <span className="font-semibold">{h.estado_nuevo}</span>
                                  </p>
                                  <p className="text-[10px] text-slate-400">Por: {h.cambiado_por_nombre} el {new Date(h.fecha_cambio).toLocaleString('es-PE')}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
          </table>
          </div>
        </div>

        {/* Modal nuevo riesgo */}
        {modal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-[95vw] sm:max-w-lg">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="section-title">Nuevo Riesgo</h2>
              </div>
              <form onSubmit={guardar} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Código</label><input className="input" placeholder="R-2024-001" value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} required /></div>
                  <div>
                    <label className="label">Categoría</label>
                    <select className="select" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
                      {['estrategico','operativo','academico','financiero','legal','tecnologico','reputacional'].map(c => (
                        <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div><label className="label">Nombre del Riesgo</label><input className="input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required /></div>
                <div><label className="label">Descripción</label><textarea className="input" rows={2} value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} /></div>
                <div>
                  <label className="label">Proceso asociado (opcional)</label>
                  <select className="select" value={form.proceso_id} onChange={e => setForm({ ...form, proceso_id: e.target.value })}>
                    <option value="">Sin proceso</option>
                    {procesos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Probabilidad (1–5): <span className="text-blue-600 dark:text-blue-400 font-bold">{form.probabilidad}</span></label>
                    <input type="range" min={1} max={5} className="w-full accent-blue-600" value={form.probabilidad} onChange={e => setForm({ ...form, probabilidad: parseInt(e.target.value) })} />
                  </div>
                  <div>
                    <label className="label">Impacto (1–5): <span className="text-red-500 dark:text-red-400 font-bold">{form.impacto}</span></label>
                    <input type="range" min={1} max={5} className="w-full accent-red-500" value={form.impacto} onChange={e => setForm({ ...form, impacto: parseInt(e.target.value) })} />
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Nivel resultante: </span>
                  <span className={`badge ${nivelConfig[calcularNivel(form.probabilidad, form.impacto)]?.color}`}>
                    {calcularNivel(form.probabilidad, form.impacto).toUpperCase()}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 ml-2">(score: {form.probabilidad * form.impacto})</span>
                </div>
                {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}
                <div className="flex gap-3 pt-2">
                  <button type="button" className="btn-secondary flex-1" onClick={() => setModal(false)}>Cancelar</button>
                  <button type="submit" className="btn-primary flex-1">Registrar Riesgo</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal mitigación */}
        {mitigModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-[95vw] sm:max-w-md p-6">
              <h2 className="section-title mb-4">Plan de Mitigación</h2>
              <form onSubmit={guardarMitigacion} className="space-y-4">
                <div><label className="label">Descripción del plan</label><textarea className="input" rows={2} value={mitigForm.descripcion} onChange={e => setMitigForm({ ...mitigForm, descripcion: e.target.value })} required /></div>
                <div><label className="label">Acciones específicas</label><textarea className="input" rows={2} value={mitigForm.acciones} onChange={e => setMitigForm({ ...mitigForm, acciones: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Fecha Inicio</label><input type="date" className="input" value={mitigForm.fecha_inicio} onChange={e => setMitigForm({ ...mitigForm, fecha_inicio: e.target.value })} /></div>
                  <div><label className="label">Fecha Fin</label><input type="date" className="input" value={mitigForm.fecha_fin} onChange={e => setMitigForm({ ...mitigForm, fecha_fin: e.target.value })} /></div>
                </div>
                <div className="flex gap-3">
                  <button type="button" className="btn-secondary flex-1" onClick={() => setMitigModal(null)}>Cancelar</button>
                  <button type="submit" className="btn-primary flex-1">Guardar Plan</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
