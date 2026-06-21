'use client';
import { useEffect, useState } from 'react';
import ProtectedLayout from '@/components/Layout/ProtectedLayout';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from 'next-themes';
import api from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { FileText, AlertTriangle, Search, CheckCircle2, TrendingUp, ClipboardList, ShieldAlert, Award } from 'lucide-react';

const COLORS = ['#ef4444','#f97316','#eab308','#22c55e'];
const LINE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const StatCard = ({ label, value, sublabel, gradient, icon }) => {
  const [display, setDisplay] = useState(0);
  const target = typeof value === 'number' ? value : parseInt(value) || 0;

  useEffect(() => {
    if (target === 0) { setDisplay(0); return; }
    let start = 0;
    const duration = 1000;
    const stepTime = Math.max(Math.floor(duration / target), 16);
    const increment = Math.ceil(target / (duration / stepTime));
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setDisplay(target);
        clearInterval(timer);
      } else {
        setDisplay(start);
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [target]);

  return (
    <div className="card p-6 relative overflow-hidden group hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 cursor-default">
      <div className="flex items-start justify-between mb-5">
        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-tight">{label}</p>
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 group-hover:scale-110 transition-transform duration-300" style={{ background: gradient }}>{icon}</div>
      </div>
      <p className="text-4xl font-extrabold text-slate-900 dark:text-white tabular-nums">{display}</p>
      {sublabel && <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">{sublabel}</p>}
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 shadow-2xl text-xs">
      <p className="font-bold text-slate-700 dark:text-slate-200 mb-2">{label}</p>
      {payload.map((p,i) => <p key={i} style={{color:p.color}} className="font-medium">{p.name}: <span className="font-extrabold">{p.value}</span></p>)}
    </div>
  );
};

export default function DashboardPage() {
  const { usuario } = useAuth();
  const { theme, resolvedTheme } = useTheme();
  const [data, setData] = useState(null);
  const [capas, setCapas] = useState([]);
  const [riesgos, setRiesgos] = useState([]);
  const [encuestasDash, setEncuestasDash] = useState(null);
  const [indicadores, setIndicadores] = useState([]);
  const [mounted, setMounted] = useState(false);
  const isDark = resolvedTheme === 'dark';

  useEffect(() => {
    setMounted(true);
    
    Promise.allSettled([
      api.get('/dashboard'),
      api.get('/capas'),
      api.get('/riesgos'),
      api.get('/encuestas/dashboard'),
      api.get('/indicadores/resumen')
    ]).then(([resDash, resCapas, resRiesgos, resEncuestas, resIndicadores]) => {
      if (resDash.status === 'fulfilled') {
        setData(resDash.value.data);
      } else {
        setData({ totales:{}, indicadores_recientes:[], capas_por_estado:[], riesgos_por_nivel:[] });
      }
      
      if (resCapas.status === 'fulfilled') {
        setCapas(resCapas.value.data);
      } else {
        setCapas([]);
      }
      
      if (resRiesgos.status === 'fulfilled') {
        setRiesgos(resRiesgos.value.data);
      } else {
        setRiesgos([]);
      }
      
      if (resEncuestas.status === 'fulfilled') {
        setEncuestasDash(resEncuestas.value.data);
      } else {
        setEncuestasDash(null);
      }
      
      if (resIndicadores.status === 'fulfilled') {
        setIndicadores(resIndicadores.value.data);
      } else {
        setIndicadores([]);
      }
    });
  }, []);

  const t = data?.totales || {};
  const indicChart = (data?.indicadores_recientes || []).map(i => ({
    name: i.nombre?.length > 14 ? i.nombre.substring(0,14)+'…' : i.nombre,
    valor: parseFloat(i.cumplimiento || 0),
  }));
  const riesgoChart = (data?.riesgos_por_nivel || []).map(r => ({
    name: r.nivel?.charAt(0).toUpperCase()+r.nivel?.slice(1),
    value: parseInt(r.total),
  }));
  const capaChart = (data?.capas_por_estado || []).map(c => ({ name: c.estado?.replace('_',' '), value: parseInt(c.total) }));

  const stats = [
    { label:'Documentos',       value:t.documentos||0,           sublabel:'Total registrados',    gradient:'linear-gradient(135deg,#3b82f6,#6366f1)', icon:<FileText className="w-5 h-5" /> },
    { label:'CAPAs Activas',    value:t.capas_activas||0,        sublabel:'Sin cerrar',           gradient:'linear-gradient(135deg,#f59e0b,#f97316)', icon:<AlertTriangle className="w-5 h-5" /> },
    { label:'Riesgos Activos',  value:t.riesgos_activos||0,     sublabel:'Requieren atención',   gradient:'linear-gradient(135deg,#ef4444,#dc2626)', icon:<AlertTriangle className="w-5 h-5" /> },
    { label:'Hallazgos Abiertos',value:t.hallazgos_abiertos||0, sublabel:'Pendientes',           gradient:'linear-gradient(135deg,#8b5cf6,#7c3aed)', icon:<Search className="w-5 h-5" /> },
    { label:'Encuestas',        value:t.encuestas_publicadas||0, sublabel:'Publicadas',           gradient:'linear-gradient(135deg,#10b981,#059669)', icon:<ClipboardList className="w-5 h-5" /> },
    { label:'Autoevaluaciones', value:t.autoevaluaciones||0,     sublabel:'Realizadas',           gradient:'linear-gradient(135deg,#06b6d4,#0891b2)', icon:<CheckCircle2 className="w-5 h-5" /> },
  ];

  // 1. Últimas CAPAs Críticas (3 más recientes en registrada o en_implementacion)
  const ultimasCapas = capas
    .filter(c => c.estado === 'registrada' || c.estado === 'en_implementacion')
    .slice(0, 3);

  // 2. Riesgos Críticos (3 riesgos con mayor probabilidad * impacto)
  const riesgosCriticos = [...riesgos]
    .sort((a, b) => (b.probabilidad * b.impacto) - (a.probabilidad * a.impacto))
    .slice(0, 3);

  // 3. Satisfacción General (Gauge Visual)
  const scoreEncuestas = encuestasDash?.promedio_general || 0;
  const pctEncuestas = Math.min(Math.max((scoreEncuestas / 5) * 100, 0), 100);
  const strokeWidth = 10;
  const radiusGauge = 50;
  const circGauge = Math.PI * radiusGauge;
  const offsetGauge = circGauge - (pctEncuestas / 100) * circGauge;
  const colorGauge = pctEncuestas >= 80 ? '#10b981' : pctEncuestas >= 60 ? '#f59e0b' : '#ef4444';

  // 4. Gráfico de Evolución Mensual
  const allPeriods = new Set();
  indicadores.forEach(ind => {
    (ind.mediciones || []).forEach(m => {
      if (m.periodo) allPeriods.add(m.periodo);
    });
  });
  const sortedPeriods = Array.from(allPeriods).sort();
  const last6Periods = sortedPeriods.slice(-6);

  const monthlyChartData = last6Periods.map(per => {
    const dataPoint = { name: per };
    indicadores.forEach(ind => {
      const match = (ind.mediciones || []).find(m => m.periodo === per);
      if (match && match.cumplimiento != null) {
        dataPoint[ind.codigo] = match.cumplimiento;
      }
    });
    return dataPoint;
  });

  const activeIndicatorCodes = indicadores
    .filter(ind => (ind.mediciones || []).some(m => last6Periods.includes(m.periodo)))
    .map(ind => ind.codigo);

  return (
    <ProtectedLayout>
      {/* Header */}
      <div className="px-6 md:px-8 py-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-white via-white to-blue-50/50 dark:from-slate-900/80 dark:via-slate-900/80 dark:to-blue-950/30 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="page-title">Panel de Control</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Bienvenido, <span className="text-blue-600 dark:text-blue-400 font-bold">{usuario?.nombres}</span> — SGC-UNT</p>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
            {new Date().toLocaleDateString('es-PE',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
          </p>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-5">
          {stats.map((s,i) => <StatCard key={i} {...s}/>)}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card p-7 lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="section-title">Cumplimiento de Indicadores</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Últimas mediciones</p>
              </div>
              <span className="badge badge-blue">% cumplimiento</span>
            </div>
            {indicChart.length > 0 ? (
              mounted ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={indicChart} margin={{left:-20,right:5}}>
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6"/>
                        <stop offset="100%" stopColor="#6366f1"/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1e293b" : "#f1f5f9"} vertical={false}/>
                    <XAxis dataKey="name" tick={{fontSize:11,fill:isDark ? '#94a3b8' : '#64748b',fontWeight:600}} axisLine={false} tickLine={false}/>
                    <YAxis domain={[0,110]} tick={{fontSize:11,fill:isDark ? '#94a3b8' : '#64748b',fontWeight:600}} axisLine={false} tickLine={false}/>
                    <Tooltip content={<CustomTooltip/>}/>
                    <Bar dataKey="valor" name="Cumplimiento %" radius={[10,10,0,0]} fill="url(#barGrad)"/>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 bg-slate-100/50 dark:bg-slate-800/30 rounded-2xl animate-pulse" />
              )
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 gap-4">
                <TrendingUp className="w-14 h-14" />
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Registra mediciones para ver el gráfico</p>
              </div>
            )}
          </div>

          <div className="card p-7">
            <h2 className="section-title mb-1">Riesgos por Nivel</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Distribución actual</p>
            {riesgoChart.length > 0 ? (
              <>
                {mounted ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={riesgoChart} cx="50%" cy="50%" innerRadius={52} outerRadius={82} paddingAngle={4} dataKey="value">
                        {riesgoChart.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                      </Pie>
                      <Tooltip content={<CustomTooltip/>}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-52 bg-slate-100/50 dark:bg-slate-800/30 rounded-2xl animate-pulse" />
                )}
                <div className="space-y-3 mt-4">
                  {riesgoChart.map((r,i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{background:COLORS[i%COLORS.length]}}/>
                        <span className="text-slate-600 dark:text-slate-300 capitalize font-semibold">{r.name}</span>
                      </div>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">{r.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-56 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm flex-col gap-3">
                <AlertTriangle className="w-12 h-12" />
                <span className="font-medium">Sin datos de riesgos</span>
              </div>
            )}
          </div>
        </div>

        {/* CAPAs */}
        {capaChart.length > 0 && (
          <div className="card p-7">
            <h2 className="section-title mb-5">Estado de CAPAs</h2>
            <div className="flex flex-wrap gap-4">
              {capaChart.map((c,i) => (
                <div key={i} className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 flex-1 min-w-[150px] hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300">
                  <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-200">{c.value}</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 capitalize leading-snug font-semibold">{c.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* NUEVAS SECCIONES TAREA 5 */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Widget 1: Satisfacción General */}
          <div className="card p-7 flex flex-col justify-between">
            <div>
              <h2 className="section-title mb-1">Satisfacción General</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Promedio general de encuestas</p>
            </div>
            {encuestasDash ? (
              <div className="flex flex-col items-center">
                {mounted ? (
                  <div className="relative w-40 h-24 flex items-center justify-center">
                    <svg width="160" height="96" viewBox="0 0 120 70" className="mx-auto absolute top-0 left-0">
                      {/* Track */}
                      <path
                        d="M 10 60 A 50 50 0 0 1 110 60"
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        className="dark:stroke-slate-800"
                      />
                      {/* Progress */}
                      <path
                        d="M 10 60 A 50 50 0 0 1 110 60"
                        fill="none"
                        stroke={colorGauge}
                        strokeWidth={strokeWidth}
                        strokeDasharray={circGauge}
                        strokeDashoffset={offsetGauge}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
                      />
                      <text x="60" y="52" textAnchor="middle" className="text-xl font-extrabold fill-slate-800 dark:fill-slate-100">
                        {scoreEncuestas ? scoreEncuestas.toFixed(2) : '0.00'}
                      </text>
                      <text x="60" y="65" textAnchor="middle" className="text-[8px] fill-slate-400 dark:fill-slate-500 font-extrabold uppercase tracking-wider">
                        de promedio
                      </text>
                    </svg>
                  </div>
                ) : (
                  <div className="w-40 h-24 bg-slate-100/50 dark:bg-slate-800/30 rounded-2xl animate-pulse" />
                )}
                
                <div className="w-full space-y-2.5 mt-4 border-t border-slate-200/50 dark:border-slate-800 pt-4 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold">Total respuestas:</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200">{encuestasDash.total_respuestas}</span>
                  </div>
                  {encuestasDash.mejor_encuesta && (
                    <div className="flex flex-col gap-0.5 border-b border-slate-150 dark:border-slate-800/80 pb-2">
                      <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-extrabold uppercase tracking-wider">Mejor evaluada</span>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 dark:text-slate-350 truncate max-w-[155px] font-semibold">{encuestasDash.mejor_encuesta.titulo}</span>
                        <span className="font-extrabold text-emerald-500">{encuestasDash.mejor_encuesta.promedio}</span>
                      </div>
                    </div>
                  )}
                  {encuestasDash.peor_encuesta && (
                    <div className="flex flex-col gap-0.5 pt-1">
                      <span className="text-[10px] text-rose-500 dark:text-rose-450 font-extrabold uppercase tracking-wider">Menor promedio</span>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 dark:text-slate-350 truncate max-w-[155px] font-semibold">{encuestasDash.peor_encuesta.titulo}</span>
                        <span className="font-extrabold text-rose-500">{encuestasDash.peor_encuesta.promedio}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 gap-4">
                <ClipboardList className="w-12 h-12" />
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Sin datos de encuestas</p>
              </div>
            )}
          </div>

          {/* Widget 2: Últimas CAPAs Críticas */}
          <div className="card p-7">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="section-title">Últimas CAPAs Críticas</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Registradas o en implementación</p>
              </div>
              <span className="badge badge-orange">Acciones</span>
            </div>
            {ultimasCapas.length > 0 ? (
              <div className="space-y-4">
                {ultimasCapas.map((capa) => (
                  <div key={capa.id} className="p-4 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col gap-2 hover:border-orange-300 dark:hover:border-orange-850 hover:shadow-md transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">{capa.codigo}</span>
                      <span className={`badge ${capa.tipo === 'correctiva' ? 'badge-red' : capa.tipo === 'preventiva' ? 'badge-blue' : 'badge-green'} text-[9px] uppercase font-extrabold tracking-wider`}>
                        {capa.tipo}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-2 leading-relaxed">{capa.descripcion}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-450 font-medium border-t border-slate-200/50 dark:border-slate-800/80 pt-2 mt-1">
                      <span>Responsable: <strong className="text-slate-700 dark:text-slate-300">{capa.responsable_nombre || 'No asignado'}</strong></span>
                      <span className="capitalize text-slate-600 dark:text-slate-400 font-bold">{capa.estado?.replace('_', ' ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 gap-4">
                <AlertTriangle className="w-12 h-12" />
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Sin CAPAs críticas activas</p>
              </div>
            )}
          </div>

          {/* Widget 3: Riesgos Críticos */}
          <div className="card p-7">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="section-title">Riesgos Críticos</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Con mayor probabilidad × impacto</p>
              </div>
              <span className="badge badge-red">Riesgos</span>
            </div>
            {riesgosCriticos.length > 0 ? (
              <div className="space-y-4">
                {riesgosCriticos.map((r) => {
                  const score = r.probabilidad * r.impacto;
                  let levelColor = 'badge-green';
                  if (score >= 15) levelColor = 'badge-red';
                  else if (score >= 9) levelColor = 'badge-orange';
                  else if (score >= 5) levelColor = 'badge-yellow';
                  return (
                    <div key={r.id} className="p-4 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col gap-2 hover:border-red-300 dark:hover:border-red-850 hover:shadow-md transition-all duration-300">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-slate-500 dark:text-slate-400">{r.codigo}</span>
                        <span className={`badge ${levelColor} text-[9px] uppercase font-extrabold tracking-wider`}>
                          {r.nivel_riesgo || 'medio'} ({score})
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-2 leading-relaxed">{r.nombre}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-450 font-medium border-t border-slate-200/50 dark:border-slate-800/80 pt-2 mt-1">
                        <span className="capitalize">Categoría: <strong className="text-slate-700 dark:text-slate-300">{r.categoria || 'Operativo'}</strong></span>
                        <span>P:{r.probabilidad} × I:{r.impacto}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 gap-4">
                <ShieldAlert className="w-12 h-12" />
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Sin datos de riesgos</p>
              </div>
            )}
          </div>

        </div>

        {/* Gráfico de evolución mensual */}
        <div className="card p-7">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="section-title">Evolución Mensual de Indicadores</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Últimas 6 mediciones agrupadas por mes</p>
            </div>
            <span className="badge badge-blue">Evolución</span>
          </div>
          {monthlyChartData.length > 0 ? (
            mounted ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyChartData} margin={{ left: -20, right: 10, top: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1e293b" : "#f1f5f9"} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 110]} tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                  {activeIndicatorCodes.map((code, idx) => (
                    <Line
                      key={code}
                      type="monotone"
                      dataKey={code}
                      name={code}
                      stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] bg-slate-100/50 dark:bg-slate-800/30 rounded-2xl animate-pulse" />
            )
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 gap-4">
              <TrendingUp className="w-14 h-14" />
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Registra mediciones para ver la evolución mensual</p>
            </div>
          )}
        </div>

      </div>
    </ProtectedLayout>
  );
}
