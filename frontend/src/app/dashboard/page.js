'use client';
import { useEffect, useState } from 'react';
import ProtectedLayout from '@/components/Layout/ProtectedLayout';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from 'next-themes';
import api from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { FileText, AlertTriangle, Search, CheckCircle2, TrendingUp, ClipboardList } from 'lucide-react';

const COLORS = ['#ef4444','#f97316','#eab308','#22c55e'];

const StatCard = ({ label, value, sublabel, gradient, icon }) => (
  <div className="card p-6 relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-default">
    <div className="flex items-start justify-between mb-5">
      <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-tight">{label}</p>
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0" style={{ background: gradient }}>{icon}</div>
    </div>
    <p className="text-4xl font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</p>
    {sublabel && <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">{sublabel}</p>}
  </div>
);

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
  const isDark = resolvedTheme === 'dark';

  useEffect(() => {
    api.get('/dashboard')
      .then(({ data }) => setData(data))
      .catch(() => setData({ totales:{}, indicadores_recientes:[], capas_por_estado:[], riesgos_por_nivel:[] }));
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

  return (
    <ProtectedLayout>
      {/* Header */}
      <div className="px-6 md:px-8 py-6 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl sticky top-0 z-10">
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
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={riesgoChart} cx="50%" cy="50%" innerRadius={52} outerRadius={82} paddingAngle={4} dataKey="value">
                      {riesgoChart.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                    </Pie>
                    <Tooltip content={<CustomTooltip/>}/>
                  </PieChart>
                </ResponsiveContainer>
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
      </div>
    </ProtectedLayout>
  );
}
