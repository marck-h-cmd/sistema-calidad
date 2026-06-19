'use client';
import { useState, useEffect } from 'react';
import ProtectedLayout from '@/components/Layout/ProtectedLayout';
import { useTheme } from 'next-themes';
import api from '@/lib/api';
import { X, Download, Plus, TrendingUp, CheckCircle, BarChart2, Activity } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Legend
} from 'recharts';

const cumplColor = (c) => { 
  if (c == null) return 'badge-gray'; 
  if (c >= 95) return 'badge-green'; 
  if (c >= 75) return 'badge-yellow'; 
  return 'badge-red'; 
};

const cumplTextClass = (c) => {
  if (c == null) return 'text-slate-400 dark:text-slate-500';
  if (c >= 95) return 'text-emerald-600 dark:text-emerald-400 font-bold';
  if (c >= 75) return 'text-amber-600 dark:text-amber-400 font-bold';
  return 'text-rose-600 dark:text-rose-400 font-bold';
};

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-lg w-full animate-in">
        <div className="modal-header flex items-center justify-between">
          <h2 className="section-title">{title}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function IndicadoresPage() {
  const { theme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [indicadores, setIndicadores] = useState([]);
  const [mediciones, setMediciones]   = useState([]);
  const [procesos, setProcesos]       = useState([]);
  const [sel, setSel]                 = useState(null);
  const [modal, setModal]             = useState(null);
  const [form, setForm]               = useState({});
  const [medForm, setMedForm]         = useState({ periodo:'', valor_real:'', valor_esperado:'', analisis_tendencia:'' });
  const [error, setError]             = useState('');
  const [saving, setSaving]           = useState(false);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try {
      const [i, p] = await Promise.all([api.get('/indicadores'), api.get('/procesos')]);
      setIndicadores(i.data); 
      setProcesos(p.data);
      // Select the first indicator by default if none selected yet
      if (i.data.length > 0 && !sel) {
        verMediciones(i.data[0]);
      }
    } catch {}
  };

  const verMediciones = async (ind) => {
    setSel(ind);
    try { 
      const { data } = await api.get(`/indicadores/${ind.id}/mediciones`); 
      setMediciones(data); 
    } catch { 
      setMediciones([]); 
    }
  };

  const guardarIndicador = async (e) => {
    e.preventDefault(); setError(''); setSaving(true);
    try { 
      await api.post('/indicadores', form); 
      setModal(null); 
      cargar(); 
    } catch (err) { 
      setError(err.response?.data?.error || 'Error'); 
    } finally { 
      setSaving(false); 
    }
  };

  const guardarMedicion = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/mediciones', { ...medForm, indicador_id: sel.id });
      setModal(null);
      setMedForm({ periodo:'', valor_real:'', valor_esperado:'', analisis_tendencia:'' });
      verMediciones(sel);
      cargar(); // Reload indicators list to update latest values
    } catch (err) { 
      alert(err.response?.data?.error || 'Error'); 
    } finally { 
      setSaving(false); 
    }
  };

  const descargarPDF = async () => {
    try {
      const res = await api.get('/reportes/indicadores', { responseType:'blob' });
      Object.assign(document.createElement('a'), { href: URL.createObjectURL(res.data), download:'indicadores.pdf' }).click();
    } catch {}
  };

  const descargarExcel = async () => {
    try {
      const res = await api.get('/reportes/indicadores/excel', { responseType:'blob' });
      Object.assign(document.createElement('a'), { href: URL.createObjectURL(res.data), download:'indicadores.xlsx' }).click();
    } catch {}
  };

  // KPI calculations
  const totalIndicadores = indicadores.length;
  const activosIndicadores = indicadores.filter(i => i.estado === 'activo').length;
  const cumplimientosValidos = indicadores
    .map(i => i.ultimo_valor != null && i.meta ? (i.ultimo_valor / i.meta) * 100 : null)
    .filter(c => c != null);
  const promedioCumplimiento = cumplimientosValidos.length > 0 
    ? (cumplimientosValidos.reduce((a, b) => a + parseFloat(b), 0) / cumplimientosValidos.length).toFixed(1)
    : null;

  // General chart data
  const generalChartData = indicadores.map(i => {
    const cumpl = i.ultimo_valor != null && i.meta ? parseFloat(((i.ultimo_valor / i.meta) * 100).toFixed(1)) : 0;
    return {
      codigo: i.codigo,
      nombre: i.nombre,
      cumplimiento: cumpl
    };
  }).filter(d => d.cumplimiento > 0).slice(0, 10);

  return (
    <ProtectedLayout>
      {/* Header */}
      <div className="px-6 md:px-8 py-5 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="page-title flex items-center gap-2">
              <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              Indicadores de Gestión
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{totalIndicadores} indicadores configurados en el sistema</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button className="btn-secondary flex items-center gap-2 border-emerald-200 hover:bg-emerald-50/50 text-emerald-700 dark:text-emerald-400 dark:border-emerald-900/40" onClick={descargarExcel}>
              <Download className="w-4 h-4" />
              Excel
            </button>
            <button className="btn-secondary flex items-center gap-2" onClick={descargarPDF}>
              <Download className="w-4 h-4" />
              PDF
            </button>
            <button className="btn-primary flex items-center gap-2" onClick={() => {
              setForm({ codigo:'', nombre:'', descripcion:'', tipo:'eficacia', meta:'', unidad_medida:'%', frecuencia_medicion:'mensual', proceso_id:'' });
              setError(''); setModal('indicador');
            }}>
              <Plus className="w-4 h-4" />
              Nuevo Indicador
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 animate-in space-y-6">
        
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-5 flex items-center justify-between border-l-4 border-l-blue-600">
            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Indicadores</p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mt-1">{totalIndicadores}</h3>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl">
              <Activity className="w-6 h-6" />
            </div>
          </div>
          <div className="card p-5 flex items-center justify-between border-l-4 border-l-emerald-500">
            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Cumplimiento Promedio</p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mt-1">
                {promedioCumplimiento ? `${promedioCumplimiento}%` : '—'}
              </h3>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <div className="card p-5 flex items-center justify-between border-l-4 border-l-amber-500">
            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Indicadores Activos</p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mt-1">{activosIndicadores}</h3>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Split Screen Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Interactive Table */}
          <div className="lg:col-span-7 card overflow-hidden flex flex-col justify-between">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                  <tr>
                    <th className="table-header">Código</th>
                    <th className="table-header">Nombre</th>
                    <th className="table-header">Meta</th>
                    <th className="table-header">Último Valor</th>
                    <th className="table-header">Cumplimiento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                  {indicadores.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-14 text-center text-slate-400 dark:text-slate-500 text-sm">
                        No hay indicadores registrados
                      </td>
                    </tr>
                  )}
                  {indicadores.map(i => {
                    const cumpl = i.ultimo_valor != null && i.meta ? ((i.ultimo_valor / i.meta) * 100).toFixed(1) : null;
                    const isSelected = sel?.id === i.id;
                    return (
                      <tr key={i.id} 
                        onClick={() => verMediciones(i)}
                        className={`cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors ${isSelected ? 'bg-blue-50/40 dark:bg-blue-950/20 border-l-2 border-l-blue-600' : ''}`}>
                        <td className="table-cell">
                          <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">{i.codigo}</span>
                        </td>
                        <td className="table-cell">
                          <p className="font-medium text-slate-800 dark:text-slate-200">{i.nombre}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">{i.proceso_nombre || 'Sin proceso'}</p>
                        </td>
                        <td className="table-cell text-slate-600 dark:text-slate-300 text-xs">{i.meta != null ? `${i.meta} ${i.unidad_medida || ''}` : '—'}</td>
                        <td className="table-cell text-xs font-semibold">{i.ultimo_valor != null ? `${i.ultimo_valor} ${i.unidad_medida}` : <span className="text-slate-400 dark:text-slate-500 font-normal">Sin datos</span>}</td>
                        <td className="table-cell">{cumpl != null ? <span className={`badge ${cumplColor(parseFloat(cumpl))}`}>{cumpl}%</span> : <span className="text-slate-400 dark:text-slate-500 text-xs">—</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {indicadores.length > 0 && (
              <div className="px-4 py-3 bg-slate-50/30 dark:bg-slate-800/10 border-t border-slate-100 dark:border-slate-700/60 text-right">
                <span className="text-xs text-slate-400 dark:text-slate-500">Haz clic en un indicador para ver su gráfico e histórico.</span>
              </div>
            )}
          </div>

          {/* Right Column: Persistent Chart & details panel */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Panel Header */}
            {sel ? (
              <>
                {/* Specific Indicator details & LineChart */}
                <div className="card p-6 space-y-6">
                  <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <span className="font-mono text-xs text-slate-400 dark:text-slate-500">{sel.codigo}</span>
                      <h2 className="font-bold text-slate-800 dark:text-slate-200 text-base mt-0.5">{sel.nombre}</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Meta: <span className="font-semibold text-slate-700 dark:text-slate-300">{sel.meta} {sel.unidad_medida}</span> · Frecuencia: {sel.frecuencia_medicion}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`badge ${sel.estado === 'activo' ? 'badge-green' : 'badge-gray'}`}>{sel.estado}</span>
                      <button className="btn-secondary flex items-center gap-1 text-[11px] px-2.5 py-1" 
                        onClick={() => { setMedForm({ periodo:'', valor_real:'', valor_esperado:'', analisis_tendencia:'' }); setModal('medicion'); }}>
                        <Plus className="w-3.5 h-3.5" />
                        Medición
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="section-title text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">Gráfico Histórico</h3>
                    {mediciones.length === 0 ? (
                      <div className="h-48 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-2">
                        <TrendingUp className="w-8 h-8 opacity-40" />
                        <p className="text-xs text-slate-500 dark:text-slate-400">Aún no hay mediciones registradas para este indicador.</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={mediciones} margin={{ left:-20, right:5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#e2e8f0"} vertical={false} />
                          <XAxis dataKey="periodo" tick={{fontSize:10,fill:isDark ? '#94a3b8' : '#64748b'}} axisLine={false} tickLine={false} />
                          <YAxis tick={{fontSize:10,fill:isDark ? '#94a3b8' : '#64748b'}} axisLine={false} tickLine={false} />
                          <Tooltip formatter={(value) => [`${value} ${sel.unidad_medida}`, '']} />
                          {sel.meta && (
                            <ReferenceLine y={parseFloat(sel.meta)} stroke="#10b981" strokeDasharray="5 5" />
                          )}
                          <Line type="monotone" dataKey="valor_real" stroke="#2563eb" strokeWidth={2.5} dot={{r:4,fill:'#2563eb'}} name="Valor Real" />
                          <Line type="monotone" dataKey="valor_esperado" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Esperado" />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Table for measurements list */}
                {mediciones.length > 0 && (
                  <div className="card overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider">Historial de Mediciones</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">{mediciones.length} periodos</span>
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50/30 dark:bg-slate-800/20">
                          <th className="table-header py-2">Periodo</th>
                          <th className="table-header py-2 text-right">Real</th>
                          <th className="table-header py-2 text-right">Esperado</th>
                          <th className="table-header py-2 text-center">Cumplimiento</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                        {mediciones.map(m => (
                          <tr key={m.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                            <td className="table-cell py-2 font-medium">{m.periodo}</td>
                            <td className="table-cell py-2 text-right font-semibold text-blue-600 dark:text-blue-400">{m.valor_real} {sel.unidad_medida}</td>
                            <td className="table-cell py-2 text-right text-slate-400 dark:text-slate-500">{m.valor_esperado || '—'}</td>
                            <td className="table-cell py-2 text-center">
                              {m.cumplimiento != null ? (
                                <span className={`badge text-[9px] px-2 py-0.5 ${cumplColor(parseFloat(m.cumplimiento))}`}>
                                  {m.cumplimiento}%
                                </span>
                              ) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              /* General stats / overview panel when no specific indicator selected */
              <div className="card p-6 space-y-6">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                  <h2 className="font-bold text-slate-800 dark:text-slate-200 text-base flex items-center gap-1.5">
                    <BarChart2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    Resumen del Desempeño
                  </h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Comparativa de cumplimiento de los principales indicadores</p>
                </div>
                {generalChartData.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-2">
                    <BarChart2 className="w-12 h-12 opacity-30" />
                    <p className="text-xs text-slate-500 dark:text-slate-400">Sin datos de cumplimiento. Registra mediciones primero.</p>
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={generalChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#e2e8f0"} vertical={false} />
                        <XAxis dataKey="codigo" tick={{fontSize:9,fill:isDark ? '#94a3b8' : '#64748b'}} axisLine={false} tickLine={false} />
                        <YAxis tick={{fontSize:9,fill:isDark ? '#94a3b8' : '#64748b'}} axisLine={false} tickLine={false} unit="%" />
                        <Tooltip formatter={(value) => [`${value}%`, 'Cumplimiento']} />
                        <Bar dataKey="cumplimiento" radius={[4, 4, 0, 0]}>
                          {generalChartData.map((entry, idx) => {
                            let color = '#ef4444';
                            if (entry.cumplimiento >= 95) color = '#10b981';
                            else if (entry.cumplimiento >= 75) color = '#f59e0b';
                            return <Cell key={`cell-${idx}`} fill={color} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                      <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5">Leyenda de Cumplimiento</h4>
                      <div className="flex gap-4 text-xs">
                        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-emerald-500 rounded"></span> Excelencia (&ge;95%)</div>
                        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-amber-500 rounded"></span> Aceptable (&ge;75%)</div>
                        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-rose-500 rounded"></span> Crítico (&lt;75%)</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal nuevo indicador */}
      {modal === 'indicador' && (
        <Modal title="Nuevo Indicador" onClose={() => setModal(null)}>
          <form onSubmit={guardarIndicador}>
            <div className="modal-body">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Código</label><input className="input" placeholder="IND-001" value={form.codigo} onChange={e=>setForm({...form,codigo:e.target.value})} required/></div>
                <div><label className="label">Tipo</label>
                  <select className="select" value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})}>
                    {['eficacia','eficiencia','impacto','satisfaccion'].map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="label">Nombre</label><input className="input" value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} required/></div>
              <div><label className="label">Descripción</label><textarea className="input" rows={2} value={form.descripcion||''} onChange={e=>setForm({...form,descripcion:e.target.value})}/></div>
              <div><label className="label">Proceso (opcional)</label>
                <select className="select" value={form.proceso_id} onChange={e=>setForm({...form,proceso_id:e.target.value})}>
                  <option value="">Sin proceso</option>
                  {procesos.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="label">Meta</label><input type="number" step="0.01" className="input" value={form.meta} onChange={e=>setForm({...form,meta:e.target.value})}/></div>
                <div><label className="label">Unidad</label><input className="input" placeholder="%, pts" value={form.unidad_medida} onChange={e=>setForm({...form,unidad_medida:e.target.value})}/></div>
                <div><label className="label">Frecuencia</label>
                  <select className="select" value={form.frecuencia_medicion} onChange={e=>setForm({...form,frecuencia_medicion:e.target.value})}>
                    {['diaria','semanal','mensual','trimestral','semestral','anual'].map(f=><option key={f} value={f}>{f.charAt(0).toUpperCase()+f.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              {error && <p className="text-red-500 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl px-3 py-2">{error}</p>}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary flex-1" onClick={()=>setModal(null)}>Cancelar</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">{saving?'Guardando...':'Guardar Indicador'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal medicion */}
      {modal === 'medicion' && sel && (
        <Modal title={`Registrar Medición — ${sel.nombre}`} onClose={() => setModal(null)}>
          <form onSubmit={guardarMedicion}>
            <div className="modal-body">
              <div><label className="label">Periodo</label><input className="input" placeholder="2024-01" value={medForm.periodo} onChange={e=>setMedForm({...medForm,periodo:e.target.value})} required/></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Valor Real</label><input type="number" step="0.01" className="input" value={medForm.valor_real} onChange={e=>setMedForm({...medForm,valor_real:e.target.value})} required/></div>
                <div><label className="label">Valor Esperado</label><input type="number" step="0.01" className="input" placeholder={sel.meta||''} value={medForm.valor_esperado} onChange={e=>setMedForm({...medForm,valor_esperado:e.target.value})}/></div>
              </div>
              <div><label className="label">Análisis de Tendencia</label><textarea className="input" rows={2} value={medForm.analisis_tendencia} onChange={e=>setMedForm({...medForm,analisis_tendencia:e.target.value})}/></div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary flex-1" onClick={()=>setModal(null)}>Cancelar</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">{saving?'Guardando...':'Guardar Medición'}</button>
            </div>
          </form>
        </Modal>
      )}
    </ProtectedLayout>
  );
}
