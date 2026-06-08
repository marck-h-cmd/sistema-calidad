'use client';
import { useState, useEffect } from 'react';
import ProtectedLayout from '@/components/Layout/ProtectedLayout';
import { useTheme } from 'next-themes';
import api from '@/lib/api';
import { X, Download, Plus } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Legend
} from 'recharts';

const cumplColor = (c) => { if (c == null) return 'badge-gray'; if (c >= 95) return 'badge-green'; if (c >= 75) return 'badge-yellow'; return 'badge-red'; };

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
  const [tab, setTab]                 = useState('lista');
  const [modal, setModal]             = useState(null);
  const [form, setForm]               = useState({});
  const [medForm, setMedForm]         = useState({ periodo:'', valor_real:'', valor_esperado:'', analisis_tendencia:'' });
  const [error, setError]             = useState('');
  const [saving, setSaving]           = useState(false);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try {
      const [i, p] = await Promise.all([api.get('/indicadores'), api.get('/procesos')]);
      setIndicadores(i.data); setProcesos(p.data);
    } catch {}
  };

  const verMediciones = async (ind) => {
    setSel(ind); setTab('grafico');
    try { const { data } = await api.get(`/indicadores/${ind.id}/mediciones`); setMediciones(data); }
    catch { setMediciones([]); }
  };

  const guardarIndicador = async (e) => {
    e.preventDefault(); setError(''); setSaving(true);
    try { await api.post('/indicadores', form); setModal(null); cargar(); }
    catch (err) { setError(err.response?.data?.error || 'Error'); }
    finally { setSaving(false); }
  };

  const guardarMedicion = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/mediciones', { ...medForm, indicador_id: sel.id });
      setModal(null);
      setMedForm({ periodo:'', valor_real:'', valor_esperado:'', analisis_tendencia:'' });
      verMediciones(sel);
    } catch (err) { alert(err.response?.data?.error || 'Error'); }
    finally { setSaving(false); }
  };

  const descargarPDF = async () => {
    try {
      const res = await api.get('/reportes/indicadores', { responseType:'blob' });
      Object.assign(document.createElement('a'), { href: URL.createObjectURL(res.data), download:'indicadores.pdf' }).click();
    } catch {}
  };

  return (
    <ProtectedLayout>
      {/* Header */}
      <div className="px-6 md:px-8 py-5 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="page-title">Indicadores de Gestión</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{indicadores.length} indicadores configurados</p>
          </div>
          <div className="flex gap-3">
            <button className="btn-secondary flex items-center gap-2" onClick={descargarPDF}>
              <Download className="w-4 h-4" />
              PDF
            </button>
            {sel && tab === 'grafico' && (
              <button className="btn-secondary flex items-center gap-2" onClick={() => { setMedForm({ periodo:'', valor_real:'', valor_esperado:'', analisis_tendencia:'' }); setModal('medicion'); }}>
                <Plus className="w-4 h-4" />
                Medición
              </button>
            )}
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
        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
          {[['lista','Lista de Indicadores'],['grafico', sel ? `Gráfico: ${sel.nombre.substring(0,20)}` : 'Gráfico']].map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab===k?'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-slate-200':'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* Lista */}
        {tab === 'lista' && (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                <tr>
                  <th className="table-header">Código</th>
                  <th className="table-header">Nombre</th>
                  <th className="table-header">Tipo</th>
                  <th className="table-header">Meta</th>
                  <th className="table-header">Último Valor</th>
                  <th className="table-header">Cumplimiento</th>
                  <th className="table-header">Ver</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                {indicadores.length === 0 && <tr><td colSpan={7} className="py-14 text-center text-slate-400 dark:text-slate-500 text-sm">No hay indicadores registrados</td></tr>}
                {indicadores.map(i => {
                  const cumpl = i.ultimo_valor != null && i.meta ? ((i.ultimo_valor / i.meta) * 100).toFixed(1) : null;
                  return (
                    <tr key={i.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors group">
                      <td className="table-cell"><span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">{i.codigo}</span></td>
                      <td className="table-cell">
                        <p className="font-medium text-slate-800 dark:text-slate-200">{i.nombre}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{i.proceso_nombre || 'Sin proceso'}</p>
                      </td>
                      <td className="table-cell capitalize text-slate-500 dark:text-slate-400 text-xs">{i.tipo}</td>
                      <td className="table-cell text-slate-600 dark:text-slate-300">{i.meta != null ? `${i.meta} ${i.unidad_medida || ''}` : '—'}</td>
                      <td className="table-cell">{i.ultimo_valor != null ? <span className="font-medium">{i.ultimo_valor} {i.unidad_medida}</span> : <span className="text-slate-400 dark:text-slate-500">Sin datos</span>}</td>
                      <td className="table-cell">{cumpl != null ? <span className={`badge ${cumplColor(parseFloat(cumpl))}`}>{cumpl}%</span> : <span className="text-slate-400 dark:text-slate-500 text-xs">—</span>}</td>
                      <td className="table-cell">
                        <button onClick={() => verMediciones(i)} className="btn-ghost text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 px-2 py-1">Ver gráfico →</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Gráfico */}
        {tab === 'grafico' && !sel && (
          <div className="card p-16 text-center text-slate-400 dark:text-slate-500 text-sm">
            Selecciona un indicador desde la lista para ver su histórico
          </div>
        )}

        {tab === 'grafico' && sel && (
          <div className="space-y-6">
            {/* Info card */}
            <div className="card p-6">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs text-slate-400 dark:text-slate-500">{sel.codigo}</span>
                  <h2 className="section-title mt-1 text-lg">{sel.nombre}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Meta: <span className="font-semibold text-slate-700 dark:text-slate-300">{sel.meta} {sel.unidad_medida}</span> · Frecuencia: {sel.frecuencia_medicion}</p>
                </div>
                <span className={`badge ${sel.estado === 'activo' ? 'badge-green' : 'badge-gray'}`}>{sel.estado}</span>
              </div>
            </div>

            {/* Chart */}
            <div className="card p-6">
              <h3 className="section-title mb-6">Histórico de Mediciones</h3>
              {mediciones.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-3">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Sin mediciones. Usa "+ Medición" para agregar datos.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={mediciones} margin={{ left:-10, right:10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#e2e8f0"} vertical={false} />
                    <XAxis dataKey="periodo" tick={{fontSize:11,fill:isDark ? '#94a3b8' : '#64748b'}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fontSize:11,fill:isDark ? '#94a3b8' : '#64748b'}} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Legend />
                    {sel.meta && (
                      <ReferenceLine y={parseFloat(sel.meta)} stroke="#10b981" strokeDasharray="5 5"
                        label={{value:`Meta: ${sel.meta}`, position:'right', fontSize:11, fill:'#10b981'}} />
                    )}
                    <Line type="monotone" dataKey="valor_real" stroke="#2563eb" strokeWidth={2.5} dot={{r:4,fill:'#2563eb'}} name="Valor Real" />
                    <Line type="monotone" dataKey="valor_esperado" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Esperado" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Table */}
            {mediciones.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-4 py-3.5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Detalle de Mediciones</span>
                </div>
                <table className="w-full">
                  <thead><tr>
                    <th className="table-header">Periodo</th>
                    <th className="table-header">Valor Real</th>
                    <th className="table-header">Esperado</th>
                    <th className="table-header">Cumplimiento</th>
                    <th className="table-header">Análisis</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                    {mediciones.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                        <td className="table-cell font-medium">{m.periodo}</td>
                        <td className="table-cell font-semibold text-blue-600 dark:text-blue-400">{m.valor_real} {sel.unidad_medida}</td>
                        <td className="table-cell text-slate-400 dark:text-slate-500">{m.valor_esperado || '—'}</td>
                        <td className="table-cell">{m.cumplimiento != null ? <span className={`badge ${cumplColor(parseFloat(m.cumplimiento))}`}>{m.cumplimiento}%</span> : '—'}</td>
                        <td className="table-cell text-slate-400 dark:text-slate-500 text-xs max-w-xs truncate">{m.analisis_tendencia || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
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
