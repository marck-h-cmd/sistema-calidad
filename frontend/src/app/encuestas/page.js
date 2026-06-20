'use client';
import { useState, useEffect } from 'react';
import ProtectedLayout from '@/components/Layout/ProtectedLayout';
import { useTheme } from 'next-themes';
import api from '@/lib/api';
import { X, Download, Plus, ArrowLeft, Send, CheckCircle2, Star, Users, TrendingUp, Award, AlertTriangle, MessageSquare } from 'lucide-react';
import {
  ComposedChart, BarChart, Bar, Cell, PieChart, Pie, Sector,
  LineChart, Line, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const estadoColor = {
  borrador: 'badge-gray',
  publicada: 'badge-green',
  en_curso: 'badge-blue',
  cerrada: 'badge-yellow',
  archivada: 'badge-gray',
};

// Colores de barras Likert (1=rojo → 5=verde)
const LIKERT_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];

// Colores Donut Si/No
const SINO_COLORS = ['#10b981', '#ef4444'];

// Tooltip personalizado para el gráfico de tendencia
function TendenciaTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 text-white p-3 rounded-2xl shadow-xl border border-slate-700/50 text-xs space-y-1 backdrop-blur-sm">
        <p className="font-bold text-slate-300 border-b border-slate-700/50 pb-1">{label}</p>
        <div className="flex justify-between gap-4">
          <span>Satisfacción:</span>
          <span className="font-bold text-blue-400">{payload[0]?.value}/5</span>
        </div>
        {payload[1] && (
          <div className="flex justify-between gap-4">
            <span>Respuestas:</span>
            <span className="font-semibold text-slate-300">{payload[1]?.value}</span>
          </div>
        )}
      </div>
    );
  }
  return null;
}

// Label para PieChart
function renderDonutLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10 rounded-t-3xl flex items-center justify-between">
          <h2 className="section-title">{title}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function EncuestasPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [encuestas, setEncuestas]         = useState([]);
  const [encuestaActiva, setEncuestaActiva] = useState(null);
  const [respuestas, setRespuestas]       = useState({});
  const [resultados, setResultados]       = useState([]);   // resultados-detalle
  const [tab, setTab]                     = useState('lista');
  const [modal, setModal]                 = useState(false);
  const [form, setForm]                   = useState({ codigo: '', titulo: '', descripcion: '', dirigido_a: 'estudiantes' });
  const [preguntas, setPreguntas]         = useState([{ texto: '', tipo: 'likert_5', obligatoria: true }]);
  const [error, setError]                 = useState('');
  const [enviado, setEnviado]             = useState(false);
  const [mounted, setMounted]             = useState(false);

  // Dashboard global
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    setMounted(true);
    cargar();
    cargarDashboard();
  }, []);

  const cargar = async () => {
    try { const { data } = await api.get('/encuestas'); setEncuestas(data); } catch {}
  };

  const cargarDashboard = async () => {
    try { const { data } = await api.get('/encuestas/dashboard'); setDashboard(data); } catch {}
  };

  const agregarPregunta  = () => setPreguntas([...preguntas, { texto: '', tipo: 'likert_5', obligatoria: true }]);
  const eliminarPregunta = (i) => setPreguntas(preguntas.filter((_, idx) => idx !== i));
  const actualizarPregunta = (i, campo, val) => {
    const arr = [...preguntas]; arr[i] = { ...arr[i], [campo]: val }; setPreguntas(arr);
  };

  const guardarEncuesta = async (e) => {
    e.preventDefault(); setError('');
    try {
      await api.post('/encuestas', { ...form, preguntas });
      setModal(false);
      setForm({ codigo: '', titulo: '', descripcion: '', dirigido_a: 'estudiantes' });
      setPreguntas([{ texto: '', tipo: 'likert_5', obligatoria: true }]);
      cargar(); cargarDashboard();
    } catch (err) { setError(err.response?.data?.error || 'Error'); }
  };

  const responder = async (enc) => {
    try {
      const { data } = await api.get(`/encuestas/${enc.id}`);
      setEncuestaActiva(data); setRespuestas({}); setEnviado(false); setTab('responder');
    } catch {}
  };

  const verResultados = async (enc) => {
    try {
      const { data } = await api.get(`/encuestas/${enc.id}/resultados-detalle`);
      setResultados(data); setEncuestaActiva(enc); setTab('resultados');
    } catch {}
  };

  const enviarRespuesta = async () => {
    try {
      const payload = Object.entries(respuestas).map(([pregunta_id, val]) => ({
        pregunta_id,
        valor_numerico: typeof val === 'number' ? val : null,
        valor_texto:    typeof val === 'string'  ? val : null,
      }));
      await api.post('/encuestas/responder', { encuesta_id: encuestaActiva.id, respuestas: payload });
      setEnviado(true);
      cargarDashboard(); // Refrescar dashboard al responder
    } catch (err) { alert(err.response?.data?.error || 'Error'); }
  };

  const publicar = async (id) => {
    await api.patch(`/encuestas/${id}/publicar`); cargar(); cargarDashboard();
  };

  const descargarPDF = async () => {
    try {
      const res = await api.get('/reportes/encuestas', { responseType: 'blob' });
      Object.assign(document.createElement('a'), { href: URL.createObjectURL(res.data), download: 'encuestas.pdf' }).click();
    } catch {}
  };

  // Promedio general de la encuesta activa (sobre preguntas con promedio)
  const promedioEncuesta = resultados.length > 0
    ? (() => {
        const vals = resultados.filter(r => r.promedio != null).map(r => r.promedio);
        return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : null;
      })()
    : null;

  const renderInput = (p) => {
    if (p.tipo === 'likert_5') return (
      <div className="flex gap-2 mt-3">
        {[1, 2, 3, 4, 5].map(v => (
          <button key={v} type="button" onClick={() => setRespuestas({ ...respuestas, [p.id]: v })}
            className={`w-11 h-11 rounded-xl font-bold text-sm transition-all ${respuestas[p.id] === v ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
            {v}
          </button>
        ))}
        <span className="text-xs text-slate-400 dark:text-slate-500 self-center ml-2">1=Muy malo · 5=Excelente</span>
      </div>
    );
    if (p.tipo === 'si_no') return (
      <div className="flex gap-3 mt-3">
        {['Sí', 'No'].map(v => (
          <button key={v} type="button" onClick={() => setRespuestas({ ...respuestas, [p.id]: v === 'Sí' ? 1 : 0 })}
            className={`px-6 py-2 rounded-xl font-medium text-sm transition-all ${(respuestas[p.id] === 1 && v === 'Sí') || (respuestas[p.id] === 0 && v === 'No') ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
            {v}
          </button>
        ))}
      </div>
    );
    if (p.tipo === 'numerica') return (
      <input type="number" className="input mt-2 w-40" value={respuestas[p.id] || ''} onChange={e => setRespuestas({ ...respuestas, [p.id]: parseFloat(e.target.value) })} />
    );
    return <textarea className="input mt-2" rows={3} value={respuestas[p.id] || ''} onChange={e => setRespuestas({ ...respuestas, [p.id]: e.target.value })} />;
  };

  // Renderiza el gráfico/visualización por pregunta según tipo
  const renderPreguntaResultado = (r, i) => {
    return (
      <div key={r.id || i} className="card p-6 space-y-4">
        {/* Cabecera pregunta */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3 items-start">
            <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200 leading-snug">{r.texto}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 uppercase tracking-wider">{r.tipo?.replace('_', ' ')}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            {r.promedio != null && (
              <p className="text-xl font-bold text-slate-800 dark:text-slate-200">
                {r.promedio}<span className="text-sm text-slate-400 dark:text-slate-500">/5</span>
              </p>
            )}
            <p className="text-xs text-slate-400 dark:text-slate-500">{r.total_respuestas} resp.</p>
          </div>
        </div>

        {/* Gráfico de barras para likert_5 */}
        {r.tipo === 'likert_5' && r.distribucion && mounted && (
          <div>
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Distribución de respuestas</p>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={r.distribucion} margin={{ left: -25, right: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} vertical={false} />
                <XAxis
                  dataKey="valor"
                  tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }}
                  tickFormatter={(v) => `${v} ★`}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: isDark ? '#94a3b8' : '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  formatter={(value, name) => [value, 'Respuestas']}
                  labelFormatter={(label) => `Valor ${label}`}
                  contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', border: '1px solid #334155', borderRadius: '12px', fontSize: '11px' }}
                />
                <Bar dataKey="count" radius={[5, 5, 0, 0]} maxBarSize={48}>
                  {r.distribucion.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={LIKERT_COLORS[idx]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {/* Leyenda de colores */}
            <div className="flex gap-3 justify-center mt-1 flex-wrap">
              {['Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'].map((lbl, idx) => (
                <div key={idx} className="flex items-center gap-1 text-[9px] text-slate-500 dark:text-slate-400">
                  <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: LIKERT_COLORS[idx] }} />
                  {idx + 1} — {lbl}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Donut chart para si_no */}
        {r.tipo === 'si_no' && mounted && (() => {
          const total = (r.si_count || 0) + (r.no_count || 0);
          if (total === 0) {
            return <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">Sin respuestas registradas</p>;
          }
          const pieData = [
            { name: 'Sí', value: r.si_count || 0 },
            { name: 'No', value: r.no_count || 0 },
          ];
          return (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={160} height={140}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={38}
                    outerRadius={62}
                    dataKey="value"
                    labelLine={false}
                    label={renderDonutLabel}
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={SINO_COLORS[idx]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [value, 'Respuestas']}
                    contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', border: '1px solid #334155', borderRadius: '12px', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2.5">
                {pieData.map((entry, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: SINO_COLORS[idx] }} />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{entry.name}</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">{entry.value} resp.</span>
                    <span className="text-xs font-bold" style={{ color: SINO_COLORS[idx] }}>
                      ({total > 0 ? ((entry.value / total) * 100).toFixed(0) : 0}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Lista de respuestas abiertas */}
        {r.tipo === 'abierta' && (
          <div className="space-y-2">
            {(!r.respuestas_texto || r.respuestas_texto.length === 0) ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-4">Sin respuestas de texto registradas</p>
            ) : (
              <>
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Últimas respuestas</p>
                {r.respuestas_texto.map((txt, j) => (
                  <div key={j} className="flex gap-2 items-start">
                    <MessageSquare className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-700 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-2 leading-relaxed flex-1">
                      &ldquo;{txt}&rdquo;
                    </p>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <ProtectedLayout>
      {/* Cabecera */}
      <div className="px-6 md:px-8 py-5 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="page-title">Gestión de la Satisfacción</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{encuestas.length} encuestas registradas</p>
          </div>
          <div className="flex gap-3">
            <button className="btn-secondary flex items-center gap-2" onClick={descargarPDF}>
              <Download className="w-4 h-4" />
              Reporte PDF
            </button>
            {tab !== 'lista' && (
              <button className="btn-secondary flex items-center gap-2" onClick={() => { setTab('lista'); setEncuestaActiva(null); }}>
                <ArrowLeft className="w-4 h-4" /> Volver
              </button>
            )}
            {tab === 'lista' && (
              <button className="btn-primary flex items-center gap-2" onClick={() => { setModal(true); setError(''); }}>
                <Plus className="w-4 h-4" />
                Nueva Encuesta
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 animate-in space-y-6">

        {/* ═══════════════════════════════════════════════════════ */}
        {/* VISTA: LISTA con Dashboard Global                       */}
        {/* ═══════════════════════════════════════════════════════ */}
        {tab === 'lista' && (
          <>
            {/* Dashboard Global de Satisfacción */}
            {dashboard && (
              <div className="space-y-4">
                <h2 className="section-title flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Dashboard de Satisfacción Global
                </h2>

                {/* Stat cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Promedio general */}
                  <div className="card p-5 flex items-center justify-between border-l-4 border-l-blue-600">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Satisfacción Global</p>
                      <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mt-1">
                        {dashboard.promedio_general != null ? dashboard.promedio_general : '—'}
                        {dashboard.promedio_general != null && <span className="text-base text-slate-400 dark:text-slate-500 font-normal">/5</span>}
                      </h3>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl">
                      <Star className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Total respuestas */}
                  <div className="card p-5 flex items-center justify-between border-l-4 border-l-emerald-500">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Respuestas</p>
                      <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mt-1">{dashboard.total_respuestas}</h3>
                    </div>
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                      <Users className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Mejor encuesta */}
                  <div className="card p-5 border-l-4 border-l-amber-500">
                    <div className="flex items-start justify-between">
                      <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Mejor Encuesta</p>
                      <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg">
                        <Award className="w-4 h-4" />
                      </div>
                    </div>
                    {dashboard.mejor_encuesta ? (
                      <>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm mt-2 leading-tight line-clamp-2">{dashboard.mejor_encuesta.titulo}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-mono">{dashboard.mejor_encuesta.codigo}</p>
                        <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1">{dashboard.mejor_encuesta.promedio}<span className="text-xs font-normal text-slate-400">/5</span></p>
                      </>
                    ) : (
                      <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">Sin datos</p>
                    )}
                  </div>

                  {/* Peor encuesta */}
                  <div className="card p-5 border-l-4 border-l-rose-500">
                    <div className="flex items-start justify-between">
                      <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Encuesta a Mejorar</p>
                      <div className="p-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-lg">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                    </div>
                    {dashboard.peor_encuesta ? (
                      <>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm mt-2 leading-tight line-clamp-2">{dashboard.peor_encuesta.titulo}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-mono">{dashboard.peor_encuesta.codigo}</p>
                        <p className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-1">{dashboard.peor_encuesta.promedio}<span className="text-xs font-normal text-slate-400">/5</span></p>
                      </>
                    ) : (
                      <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">Sin datos comparativos</p>
                    )}
                  </div>
                </div>

                {/* Gráfico de tendencia mensual */}
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="section-title text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tendencia de Satisfacción — Últimos 6 meses</h3>
                    {dashboard.tendencia_mensual?.length === 0 && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">Registra respuestas para ver tendencia</span>
                    )}
                  </div>
                  {mounted && (
                    dashboard.tendencia_mensual?.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <ComposedChart data={dashboard.tendencia_mensual} margin={{ left: -20, right: 5 }}>
                          <defs>
                            <linearGradient id="colorSatisfaccion" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} vertical={false} />
                          <XAxis dataKey="mes" tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} domain={[0, 5]} />
                          <Tooltip content={<TendenciaTooltip />} />
                          <Area type="monotone" dataKey="promedio" fill="url(#colorSatisfaccion)" stroke="none" fillOpacity={1} />
                          <Line type="monotone" dataKey="promedio" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4, fill: '#2563eb' }} activeDot={{ r: 6 }} name="Promedio" />
                        </ComposedChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-48 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-2">
                        <TrendingUp className="w-8 h-8 opacity-40" />
                        <p className="text-xs">Aún no hay historial de respuestas para mostrar tendencia</p>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Listado de encuestas */}
            <div>
              <h2 className="section-title flex items-center gap-2 mb-4">
                <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Encuestas Registradas
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {encuestas.length === 0 && (
                  <div className="col-span-full card p-12 text-center text-slate-400 dark:text-slate-500 text-sm">No hay encuestas. Crea la primera.</div>
                )}
                {encuestas.map(e => (
                  <div key={e.id} className="card p-6 flex flex-col gap-4 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <span className="font-mono text-xs text-slate-400 dark:text-slate-500">{e.codigo}</span>
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 leading-tight">{e.titulo}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Dirigido a: {e.dirigido_a}</p>
                      </div>
                      <span className={`badge shrink-0 ml-2 ${estadoColor[e.estado] || 'badge-gray'}`}>{e.estado}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                      <span>{e.num_preguntas || 0} preguntas</span>
                      <span>·</span>
                      <span>{e.num_respuestas || 0} respuestas</span>
                      {e.anonima && <><span>·</span><span className="text-emerald-600 dark:text-emerald-400">Anónima</span></>}
                    </div>
                    <div className="flex gap-2 mt-auto pt-2 border-t border-slate-100 dark:border-slate-700">
                      {e.estado === 'borrador' && (
                        <button onClick={() => publicar(e.id)} className="btn-secondary text-xs py-1.5 flex-1">Publicar</button>
                      )}
                      {e.estado === 'publicada' && (
                        <button onClick={() => responder(e)} className="btn-primary text-xs py-1.5 flex-1">Responder</button>
                      )}
                      <button onClick={() => verResultados(e)} className="btn-secondary text-xs py-1.5 flex-1">Resultados</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* VISTA: RESPONDER                                        */}
        {/* ═══════════════════════════════════════════════════════ */}
        {tab === 'responder' && encuestaActiva && (
          <div className="max-w-2xl mx-auto">
            {enviado ? (
              <div className="card p-12 text-center">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">¡Gracias por tu respuesta!</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Tu respuesta ha sido registrada correctamente.</p>
                <button className="btn-primary" onClick={() => { setTab('lista'); setEnviado(false); }}>Volver a encuestas</button>
              </div>
            ) : (
              <div className="card">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-3xl">
                  <h2 className="text-xl font-bold text-white">{encuestaActiva.titulo}</h2>
                  {encuestaActiva.descripcion && <p className="text-blue-100 text-sm mt-1">{encuestaActiva.descripcion}</p>}
                  {encuestaActiva.anonima && <p className="text-blue-200 text-xs mt-2">🔒 Esta encuesta es anónima</p>}
                </div>
                <div className="p-6 space-y-6">
                  {(encuestaActiva.preguntas || []).map((p, i) => (
                    <div key={p.id} className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                      <div className="flex gap-3">
                        <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                        <div className="flex-1">
                          <p className="font-medium text-slate-800 dark:text-slate-200">{p.texto}</p>
                          {renderInput(p)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                  <button className="btn-secondary" onClick={() => setTab('lista')}>Cancelar</button>
                  <button className="btn-primary flex items-center gap-2" onClick={enviarRespuesta}>
                    <Send className="w-4 h-4" />
                    Enviar Respuestas
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* VISTA: RESULTADOS DETALLADOS                            */}
        {/* ═══════════════════════════════════════════════════════ */}
        {tab === 'resultados' && encuestaActiva && (
          <div className="max-w-3xl mx-auto space-y-4">
            {/* Header con promedio general grande */}
            <div className="card overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs text-blue-200">{encuestaActiva.codigo}</span>
                    <h2 className="text-xl font-bold text-white mt-0.5">{encuestaActiva.titulo}</h2>
                    <p className="text-blue-200 text-sm mt-1">Resultados detallados de la encuesta</p>
                  </div>
                  {/* Promedio general grande */}
                  {promedioEncuesta != null && (
                    <div className="text-center bg-white/15 backdrop-blur-sm rounded-2xl px-6 py-3 border border-white/20">
                      <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">Promedio</p>
                      <p className="text-4xl font-black text-white mt-0.5">{promedioEncuesta}</p>
                      <p className="text-white/60 text-xs">de 5.00</p>
                    </div>
                  )}
                </div>
              </div>
              {/* Botón exportar PDF */}
              <div className="px-6 py-3 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {resultados.length} pregunta{resultados.length !== 1 ? 's' : ''} · {resultados.reduce((a, r) => a + (r.total_respuestas || 0), 0)} respuestas totales
                </span>
                <button className="btn-secondary flex items-center gap-2 text-xs py-1.5" onClick={descargarPDF}>
                  <Download className="w-3.5 h-3.5" />
                  Exportar Resultados PDF
                </button>
              </div>
            </div>

            {/* Sin resultados */}
            {resultados.length === 0 && (
              <div className="card p-12 text-center text-slate-400 dark:text-slate-500 text-sm">Sin respuestas registradas aún</div>
            )}

            {/* Preguntas con visualizaciones */}
            {resultados.map((r, i) => renderPreguntaResultado(r, i))}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* MODAL: Nueva Encuesta                                   */}
      {/* ═══════════════════════════════════════════════════════ */}
      {modal && (
        <Modal title="Crear Nueva Encuesta" onClose={() => setModal(false)}>
          <form onSubmit={guardarEncuesta} className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Código</label><input className="input" placeholder="ENC-2024-I" value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} required /></div>
              <div>
                <label className="label">Dirigido a</label>
                <select className="select" value={form.dirigido_a} onChange={e => setForm({ ...form, dirigido_a: e.target.value })}>
                  {['estudiantes', 'docentes', 'egresados', 'administrativos', 'todos'].map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div><label className="label">Título</label><input className="input" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} required /></div>
            <div><label className="label">Descripción (opcional)</label><textarea className="input" rows={2} value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} /></div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="label mb-0">Preguntas</label>
                <button type="button" onClick={agregarPregunta} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium">+ Agregar pregunta</button>
              </div>
              <div className="space-y-3">
                {preguntas.map((p, i) => (
                  <div key={i} className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 relative">
                    <div className="flex gap-3 items-start">
                      <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-2">{i + 1}</span>
                      <div className="flex-1 space-y-2">
                        <input className="input text-sm" placeholder="Texto de la pregunta" value={p.texto} onChange={e => actualizarPregunta(i, 'texto', e.target.value)} required />
                        <select className="select text-sm" value={p.tipo} onChange={e => actualizarPregunta(i, 'tipo', e.target.value)}>
                          <option value="likert_5">Escala Likert 1–5</option>
                          <option value="si_no">Sí / No</option>
                          <option value="abierta">Abierta</option>
                          <option value="numerica">Numérica</option>
                        </select>
                      </div>
                      {preguntas.length > 1 && (
                        <button type="button" onClick={() => eliminarPregunta(i)} className="text-red-400 dark:text-red-300 hover:text-red-600 dark:hover:text-red-200 mt-2 shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setModal(false)}>Cancelar</button>
              <button type="submit" className="btn-primary flex-1">Crear Encuesta</button>
            </div>
          </form>
        </Modal>
      )}
    </ProtectedLayout>
  );
}
