'use client';
import { useState, useEffect } from 'react';
import ProtectedLayout from '@/components/Layout/ProtectedLayout';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { X, Plus, Award, CheckCircle2, ChevronRight, BarChart3, AlertCircle, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function AcreditacionPage() {
  const [certificaciones, setCertificaciones] = useState([]);
  const [requisitos, setRequisitos] = useState([]);
  const [certSel, setCertSel] = useState(null);
  const [modal, setModal] = useState(null); // 'certificacion' | 'requisito' | 'autoevaluacion'
  const [form, setForm] = useState({});
  const [error, setError] = useState('');

  // Tarea 1 States
  const [tabSel, setTabSel] = useState('requisitos'); // 'requisitos' | 'criterios'
  const [autoevaluaciones, setAutoevaluaciones] = useState([]);
  const [autoSel, setAutoSel] = useState(null);
  const [autoDetalle, setAutoDetalle] = useState(null);
  const [editingFactorId, setEditingFactorId] = useState(null);
  const [evalForm, setEvalForm] = useState({ cumplimiento: 'no_cumple', puntaje: '', evidencias: '', observaciones: '' });
  const [mounted, setMounted] = useState(false);
  const [calculating, setCalculating] = useState(false);

  const { usuario } = useAuth();
  const esGestion = ['admin', 'gestor_calidad'].includes(usuario?.rol);

  useEffect(() => {
    setMounted(true);
    cargar();
  }, []);

  const cargar = async () => {
    try {
      const { data: certs } = await api.get('/certificaciones');
      setCertificaciones(certs);
      const { data: autos } = await api.get('/autoevaluaciones');
      setAutoevaluaciones(autos);
    } catch {}
  };

  const verRequisitos = async (c) => {
    setCertSel(c);
    try {
      const { data } = await api.get(`/certificaciones/${c.id}/requisitos`);
      setRequisitos(data);
    } catch {
      setRequisitos([]);
    }

    // Cargar autoevaluaciones vinculadas a esta certificación
    try {
      const { data: autos } = await api.get('/autoevaluaciones');
      setAutoevaluaciones(autos);
      const filteredAutos = autos.filter(a => a.estandar_id === c.id);
      if (filteredAutos.length > 0) {
        const latestAuto = filteredAutos[0];
        setAutoSel(latestAuto);
        cargarDetalleAutoevaluacion(latestAuto.id);
      } else {
        setAutoSel(null);
        setAutoDetalle(null);
      }
    } catch {
      setAutoSel(null);
      setAutoDetalle(null);
    }
  };

  const cargarDetalleAutoevaluacion = async (id) => {
    try {
      const { data } = await api.get(`/autoevaluaciones/${id}/detalle`);
      setAutoDetalle(data);
    } catch {
      setAutoDetalle(null);
    }
  };

  const handleAutoChange = (id) => {
    const selected = autoevaluaciones.find(a => a.id === id);
    setAutoSel(selected);
    if (selected) {
      cargarDetalleAutoevaluacion(selected.id);
    } else {
      setAutoDetalle(null);
    }
  };

  const guardarCertificacion = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/certificaciones', form);
      setModal(null);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar certificación');
    }
  };

  const guardarRequisito = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/requisitos', { ...form, certificacion_id: certSel.id });
      setModal(null);
      verRequisitos(certSel);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar requisito');
    }
  };

  const guardarAutoevaluacion = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/autoevaluaciones', {
        estandar_id: certSel.id,
        periodo: form.periodo,
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin || null
      });
      setModal(null);

      // Recargar autoevaluaciones
      const { data: autos } = await api.get('/autoevaluaciones');
      setAutoevaluaciones(autos);

      // Seleccionar la nueva autoevaluación
      setAutoSel(data);
      cargarDetalleAutoevaluacion(data.id);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear autoevaluación');
    }
  };

  const cambiarEstadoRequisito = async (id, estado) => {
    try {
      await api.patch(`/requisitos/${id}`, { estado });
      verRequisitos(certSel);
    } catch {}
  };

  const iniciarEvaluacion = (factor) => {
    setEditingFactorId(factor.factor_id);
    setEvalForm({
      cumplimiento: factor.cumplimiento || 'no_cumple',
      puntaje: factor.puntaje != null ? factor.puntaje.toString() : '',
      evidencias: factor.evidencias || '',
      observaciones: factor.observaciones || ''
    });
  };

  const guardarEvaluacion = async (e, factorId) => {
    e.preventDefault();
    if (!autoSel) return;
    try {
      await api.post('/evaluaciones-criterio', {
        autoevaluacion_id: autoSel.id,
        factor_id: factorId,
        cumplimiento: evalForm.cumplimiento,
        puntaje: evalForm.puntaje !== '' ? parseFloat(evalForm.puntaje) : null,
        evidencias: evalForm.evidencias,
        observaciones: evalForm.observaciones
      });
      setEditingFactorId(null);
      await cargarDetalleAutoevaluacion(autoSel.id);

      // Calcular puntaje total automáticamente
      await ejecutarCalculoPuntaje();
    } catch (err) {
      alert('Error al guardar la evaluación: ' + (err.response?.data?.error || err.message));
    }
  };

  const ejecutarCalculoPuntaje = async () => {
    if (!autoSel) return;
    setCalculating(true);
    try {
      await api.put(`/autoevaluaciones/${autoSel.id}/puntaje`);
      await cargarDetalleAutoevaluacion(autoSel.id);
      const { data: autos } = await api.get('/autoevaluaciones');
      setAutoevaluaciones(autos);
    } catch (err) {
      console.error('Error calculando puntaje:', err);
    } finally {
      setCalculating(false);
    }
  };

  // Render Gauge semicircular
  const renderGauge = (score) => {
    const pct = Math.min(Math.max(score || 0, 0), 100);
    const strokeWidth = 10;
    const r = 50;
    const circ = Math.PI * r;
    const offset = circ - (pct / 100) * circ;
    // Color según puntaje
    const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'; // emerald, amber, red

    return (
      <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-700/50">
        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Puntaje Total</span>
        <div className="relative w-40 h-24 flex items-center justify-center">
          <svg width="160" height="96" viewBox="0 0 120 70" className="mx-auto absolute top-0 left-0">
            {/* Track */}
            <path
              d="M 10 60 A 50 50 0 0 1 110 60"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              className="dark:stroke-slate-700"
            />
            {/* Progress */}
            <path
              d="M 10 60 A 50 50 0 0 1 110 60"
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={circ}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />
            <text x="60" y="52" textAnchor="middle" className="text-xl font-extrabold fill-slate-800 dark:fill-slate-100">
              {score != null ? parseFloat(score).toFixed(1) : '0.0'}
            </text>
            <text x="60" y="65" textAnchor="middle" className="text-[8px] fill-slate-400 dark:fill-slate-500 font-extrabold uppercase tracking-wider">
              puntos
            </text>
          </svg>
        </div>
        <div className="text-center mt-1">
          <span className={`badge ${pct >= 80 ? 'badge-green' : pct >= 50 ? 'badge-yellow' : 'badge-red'} font-bold`}>
            {pct >= 80 ? 'Excelente' : pct >= 50 ? 'Aceptable' : 'Crítico'}
          </span>
        </div>
      </div>
    );
  };

  // Render Horizontal Bar Chart
  const renderChart = () => {
    if (!autoDetalle || !autoDetalle.factores || autoDetalle.factores.length === 0) return null;

    const data = autoDetalle.factores.map(f => ({
      codigo: f.codigo,
      puntaje: f.puntaje != null ? parseFloat(f.puntaje) : 0,
      nombre: f.nombre
    }));

    return (
      <div className="mt-4 p-5 card bg-slate-50/50 dark:bg-slate-900/30">
        <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Puntaje por Criterio</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} className="text-[10px] font-semibold fill-slate-500" />
              <YAxis dataKey="codigo" type="category" className="text-[10px] font-bold fill-slate-500" width={55} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(30, 41, 59, 0.95)',
                  border: 'none',
                  borderRadius: '16px',
                  color: '#fff',
                  fontSize: '11px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
                }}
                formatter={(value) => [`${value} pts`, 'Puntaje']}
                labelFormatter={(value) => {
                  const factor = data.find(d => d.codigo === value);
                  return factor ? `${factor.codigo}: ${factor.nombre}` : value;
                }}
              />
              <Bar dataKey="puntaje" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderFactoresList = () => {
    if (!autoDetalle || !autoDetalle.factores) return null;

    return (
      <div className="space-y-4 mt-6">
        <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Criterios de Evaluación</h4>
        {autoDetalle.factores.length === 0 && (
          <p className="text-center text-sm text-slate-400 dark:text-slate-500">No hay criterios registrados</p>
        )}
        {autoDetalle.factores.map(f => {
          const isEditing = editingFactorId === f.factor_id;
          const score = f.puntaje != null ? parseFloat(f.puntaje) : null;
          
          let stateBadge = <span className="badge badge-gray">Sin evaluar</span>;
          if (f.cumplimiento === 'cumple') {
            stateBadge = <span className="badge badge-green">Cumple ({score ?? 0} pts)</span>;
          } else if (f.cumplimiento === 'cumple_parcial') {
            stateBadge = <span className="badge badge-yellow">Cumple Parcial ({score ?? 0} pts)</span>;
          } else if (f.cumplimiento === 'no_cumple') {
            stateBadge = <span className="badge badge-red">No Cumple ({score ?? 0} pts)</span>;
          } else if (f.cumplimiento === 'no_aplica') {
            stateBadge = <span className="badge badge-gray">No Aplica</span>;
          }

          return (
            <div key={f.factor_id} className="card p-4 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-600">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 tracking-wider uppercase">{f.codigo}</span>
                    {stateBadge}
                    {f.peso && <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">(Peso: {f.peso})</span>}
                  </div>
                  <h5 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{f.nombre}</h5>
                  {f.descripcion && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{f.descripcion}</p>}
                  
                  {/* Evidencias and Observaciones summary if evaluated */}
                  {f.cumplimiento && !isEditing && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50 space-y-1">
                      {f.evidencias && (
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          <strong className="text-slate-700 dark:text-slate-300">Evidencias:</strong> {f.evidencias}
                        </p>
                      )}
                      {f.observaciones && (
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          <strong className="text-slate-700 dark:text-slate-300">Observaciones:</strong> {f.observaciones}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                
                {!isEditing && esGestion && (
                  <button className="btn-secondary text-xs px-3 py-1.5" onClick={() => iniciarEvaluacion(f)}>
                    Evaluar
                  </button>
                )}
              </div>

              {isEditing && (
                <form onSubmit={(e) => guardarEvaluacion(e, f.factor_id)} className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 space-y-4 animate-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Cumplimiento</label>
                      <select className="select" value={evalForm.cumplimiento} onChange={e => setEvalForm({ ...evalForm, cumplimiento: e.target.value })}>
                        <option value="cumple">Cumple</option>
                        <option value="cumple_parcial">Cumple Parcial</option>
                        <option value="no_cumple">No Cumple</option>
                        <option value="no_aplica">No Aplica</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Puntaje (0 - 100)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="input"
                        placeholder="Puntaje individual"
                        value={evalForm.puntaje}
                        onChange={e => setEvalForm({ ...evalForm, puntaje: e.target.value })}
                        required={evalForm.cumplimiento !== 'no_aplica'}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label">Evidencias</label>
                    <textarea
                      className="input"
                      rows={2}
                      placeholder="Ingrese los documentos de evidencia, enlaces o detalles"
                      value={evalForm.evidencias}
                      onChange={e => setEvalForm({ ...evalForm, evidencias: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Observaciones</label>
                    <textarea
                      className="input"
                      rows={2}
                      placeholder="Observaciones o notas adicionales"
                      value={evalForm.observaciones}
                      onChange={e => setEvalForm({ ...evalForm, observaciones: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button type="button" className="btn-secondary text-xs px-3 py-2" onClick={() => setEditingFactorId(null)}>
                      Cancelar
                    </button>
                    <button type="submit" className="btn-primary text-xs px-3 py-2">
                      Guardar
                    </button>
                  </div>
                </form>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const filteredAutos = certSel ? autoevaluaciones.filter(a => a.estandar_id === certSel.id) : [];

  return (
    <ProtectedLayout>
      <div className="px-6 md:px-8 py-5 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-title">Gestión de Acreditación</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{certificaciones.length} estándares registrados</p>
          </div>
          {esGestion && (
            <button className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto" onClick={() => { setForm({ nombre: '', organismo: '', norma: '', fecha_emision: '', fecha_vencimiento: '', estado: 'activo' }); setError(''); setModal('certificacion'); }}>
              <Plus className="w-4 h-4" />
              Nuevo Estándar
            </button>
          )}
        </div>
      </div>

      <div className="p-6 md:p-8 animate-in">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* Listado de certificaciones / estándares */}
          <div className="lg:col-span-2 card overflow-hidden">
            <div className="px-4 py-3.5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Estándares de Calidad</span>
            </div>
            <div className="divide-y divide-slate-50 dark:divide-slate-700">
              {certificaciones.length === 0 && <p className="p-6 text-center text-slate-400 dark:text-slate-500 text-sm">No hay estándares registrados</p>}
              {certificaciones.map(c => (
                <div key={c.id} onClick={() => verRequisitos(c)}
                  className={`p-4 cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors ${certSel?.id === c.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-600' : ''}`}>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{c.nombre}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{c.organismo} • {c.norma}</p>
                  {c.fecha_vencimiento && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Vence: {new Date(c.fecha_vencimiento).toLocaleDateString('es-PE')}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Panel de detalles / requisitos / evaluación */}
          <div className="lg:col-span-3 card overflow-hidden flex flex-col">
            <div className="px-4 py-3.5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between flex-wrap gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm truncate max-w-[240px] md:max-w-xs">
                {certSel ? `${certSel.nombre}` : 'Seleccione un estándar'}
              </span>
              {certSel && tabSel === 'requisitos' && esGestion && (
                <button className="btn-primary text-xs py-1.5 px-3" onClick={() => { setForm({ descripcion: '', categoria: '', responsable: '', fecha_limite: '', estado: 'pendiente' }); setError(''); setModal('requisito'); }}>
                  <Plus className="w-3.5 h-3.5 inline mr-1" />
                  Nuevo Requisito
                </button>
              )}
            </div>

            {certSel && (
              <div className="flex border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/30 dark:bg-slate-800/10 px-4">
                <button
                  className={`py-3 px-4 font-semibold text-sm border-b-2 transition-all ${
                    tabSel === 'requisitos'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                  }`}
                  onClick={() => setTabSel('requisitos')}
                >
                  Requisitos de Acreditación
                </button>
                <button
                  className={`py-3 px-4 font-semibold text-sm border-b-2 transition-all ${
                    tabSel === 'criterios'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                  }`}
                  onClick={() => setTabSel('criterios')}
                >
                  Evaluación por Criterios
                </button>
              </div>
            )}

            <div className="p-4 flex-1">
              {!certSel && (
                <p className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">Haz clic en un estándar para ver su información</p>
              )}

              {/* TAB REQUISITOS */}
              {certSel && tabSel === 'requisitos' && (
                <div className="divide-y divide-slate-50 dark:divide-slate-700">
                  {requisitos.length === 0 && <p className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">No hay requisitos registrados</p>}
                  {requisitos.map(r => (
                    <div key={r.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                        {r.categoria && <span className="badge badge-blue">{r.categoria}</span>}
                        {esGestion ? (
                          <select className="text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl px-2 py-1 cursor-pointer focus:outline-none" value={r.estado} onChange={e => cambiarEstadoRequisito(r.id, e.target.value)}>
                            {['pendiente', 'en_proceso', 'cumplido', 'no_aplicable'].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : (
                          <span className="text-xs text-slate-600 dark:text-slate-400 capitalize">{r.estado?.replace('_', ' ')}</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-800 dark:text-slate-200 font-medium">{r.descripcion}</p>
                      <div className="flex gap-4 mt-2 text-xs text-slate-400 dark:text-slate-500 flex-wrap">
                        {r.responsable && <span>Responsable: {r.responsable}</span>}
                        {r.fecha_limite && <span>Límite: {new Date(r.fecha_limite).toLocaleDateString('es-PE')}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB CRITERIOS */}
              {certSel && tabSel === 'criterios' && (
                <div className="space-y-6">
                  {/* Selector y creador de autoevaluación */}
                  <div className="flex items-end justify-between gap-4 flex-wrap bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-100 dark:border-slate-700/50">
                    <div className="flex-1 min-w-[200px]">
                      <label className="label">Periodo Autoevaluación</label>
                      {filteredAutos.length === 0 ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">No hay autoevaluaciones</p>
                      ) : (
                        <select
                          className="select py-2"
                          value={autoSel?.id || ''}
                          onChange={e => handleAutoChange(e.target.value)}
                        >
                          {filteredAutos.map(a => (
                            <option key={a.id} value={a.id}>
                              {a.periodo} ({a.estado}) {a.puntaje_total != null ? `- ${a.puntaje_total} pts` : ''}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    {esGestion && (
                      <button
                        className="btn-secondary text-xs py-2"
                        onClick={() => { setForm({ periodo: '', fecha_inicio: '', fecha_fin: '' }); setError(''); setModal('autoevaluacion'); }}
                      >
                        <Plus className="w-3.5 h-3.5 inline mr-1" />
                        Nueva Autoevaluación
                      </button>
                    )}
                  </div>

                  {autoSel && autoDetalle ? (
                    <div className="space-y-6">
                      {/* Grid de Resumen: Semicírculo Gauge y calcular */}
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
                        <div className="md:col-span-2">
                          {renderGauge(autoDetalle.puntaje_total)}
                        </div>
                        <div className="md:col-span-3 text-center md:text-left space-y-3">
                          <h4 className="font-bold text-slate-800 dark:text-slate-200">Resumen de Autoevaluación</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Puntaje total calculado en base a las evaluaciones individuales y ponderado según el peso oficial de cada factor del estándar.
                          </p>
                          <button
                            className="btn-primary text-xs py-2.5 px-4 flex items-center justify-center gap-2 mx-auto md:mx-0"
                            onClick={ejecutarCalculoPuntaje}
                            disabled={calculating}
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${calculating ? 'animate-spin' : ''}`} />
                            Calcular Puntaje Total
                          </button>
                        </div>
                      </div>

                      {/* Gráfico de barras */}
                      {mounted && renderChart()}

                      {/* Lista de Factores */}
                      {renderFactoresList()}
                    </div>
                  ) : (
                    <div className="text-center py-12 card border-dashed">
                      <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Debe seleccionar o registrar una autoevaluación para poder calificar los criterios.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MODAL NUEVO ESTÁNDAR / CERTIFICACIÓN */}
        {modal === 'certificacion' && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-700 pb-3">
                <h2 className="section-title">Nuevo Estándar de Calidad</h2>
                <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={guardarCertificacion} className="space-y-4">
                <div><label className="label">Nombre del Estándar</label><input className="input" value={form.nombre || ''} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Factor 1: Misión y Proyecto Institucional" required /></div>
                <div><label className="label">Organismo Acreditador</label><input className="input" value={form.organismo || ''} onChange={e => setForm({ ...form, organismo: e.target.value })} placeholder="Ej: SINEACE" required /></div>
                <div><label className="label">Código/Norma</label><input className="input" value={form.norma || ''} onChange={e => setForm({ ...form, norma: e.target.value })} placeholder="Ej: ACRED-001" required /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Fecha Inicio Vigencia</label><input type="date" className="input" value={form.fecha_emision || ''} onChange={e => setForm({ ...form, fecha_emision: e.target.value })} /></div>
                  <div><label className="label">Fecha Fin Vigencia</label><input type="date" className="input" value={form.fecha_vencimiento || ''} onChange={e => setForm({ ...form, fecha_vencimiento: e.target.value })} /></div>
                </div>
                {error && <p className="text-red-500 dark:text-red-400 text-sm font-semibold">{error}</p>}
                <div className="flex gap-3 pt-2">
                  <button type="button" className="btn-secondary flex-1" onClick={() => setModal(null)}>Cancelar</button>
                  <button type="submit" className="btn-primary flex-1">Guardar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL NUEVO REQUISITO */}
        {modal === 'requisito' && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-700 pb-3">
                <h2 className="section-title">Nuevo Requisito / Criterio</h2>
                <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={guardarRequisito} className="space-y-4">
                <div><label className="label">Descripción</label><textarea className="input" rows={2} value={form.descripcion || ''} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Ej: Definición y difusión del plan estratégico de la escuela" required /></div>
                <div><label className="label">Categoría / Código</label><input className="input" value={form.categoria || ''} onChange={e => setForm({ ...form, categoria: e.target.value })} placeholder="Ej: EST-01" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Responsable</label><input className="input" value={form.responsable || ''} onChange={e => setForm({ ...form, responsable: e.target.value })} placeholder="Ej: Comité de Calidad" /></div>
                  <div><label className="label">Fecha Límite</label><input type="date" className="input" value={form.fecha_limite || ''} onChange={e => setForm({ ...form, fecha_limite: e.target.value })} /></div>
                </div>
                {error && <p className="text-red-500 dark:text-red-400 text-sm font-semibold">{error}</p>}
                <div className="flex gap-3 pt-2">
                  <button type="button" className="btn-secondary flex-1" onClick={() => setModal(null)}>Cancelar</button>
                  <button type="submit" className="btn-primary flex-1">Guardar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL NUEVA AUTOEVALUACIÓN */}
        {modal === 'autoevaluacion' && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-700 pb-3">
                <h2 className="section-title">Nueva Autoevaluación</h2>
                <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={guardarAutoevaluacion} className="space-y-4">
                <div><label className="label">Periodo (Nombre)</label><input className="input" value={form.periodo || ''} onChange={e => setForm({ ...form, periodo: e.target.value })} placeholder="Ej: 2024-01 o 2026-II" required /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Fecha Inicio</label><input type="date" className="input" value={form.fecha_inicio || ''} onChange={e => setForm({ ...form, fecha_inicio: e.target.value })} required /></div>
                  <div><label className="label">Fecha Fin (Opcional)</label><input type="date" className="input" value={form.fecha_fin || ''} onChange={e => setForm({ ...form, fecha_fin: e.target.value })} /></div>
                </div>
                {error && <p className="text-red-500 dark:text-red-400 text-sm font-semibold">{error}</p>}
                <div className="flex gap-3 pt-2">
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
