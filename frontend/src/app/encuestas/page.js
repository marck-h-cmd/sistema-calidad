'use client';
import { useState, useEffect } from 'react';
import ProtectedLayout from '@/components/Layout/ProtectedLayout';
import api from '@/lib/api';
import { X, Download, Plus, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';

const estadoColor = { borrador:'badge-gray', publicada:'badge-green', en_curso:'badge-blue', cerrada:'badge-yellow', archivada:'badge-gray' };

export default function EncuestasPage() {
  const [encuestas, setEncuestas] = useState([]);
  const [encuestaActiva, setEncuestaActiva] = useState(null);
  const [respuestas, setRespuestas] = useState({});
  const [resultados, setResultados] = useState([]);
  const [tab, setTab] = useState('lista');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ codigo:'', titulo:'', descripcion:'', dirigido_a:'estudiantes' });
  const [preguntas, setPreguntas] = useState([{ texto:'', tipo:'likert_5', obligatoria:true }]);
  const [error, setError] = useState('');
  const [enviado, setEnviado] = useState(false);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try { const { data } = await api.get('/encuestas'); setEncuestas(data); } catch {}
  };

  const agregarPregunta = () => setPreguntas([...preguntas, { texto:'', tipo:'likert_5', obligatoria:true }]);
  const eliminarPregunta = (i) => setPreguntas(preguntas.filter((_, idx) => idx !== i));
  const actualizarPregunta = (i, campo, val) => {
    const arr = [...preguntas]; arr[i] = { ...arr[i], [campo]: val }; setPreguntas(arr);
  };

  const guardarEncuesta = async (e) => {
    e.preventDefault(); setError('');
    try {
      await api.post('/encuestas', { ...form, preguntas });
      setModal(false); setForm({ codigo:'', titulo:'', descripcion:'', dirigido_a:'estudiantes' });
      setPreguntas([{ texto:'', tipo:'likert_5', obligatoria:true }]);
      cargar();
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
      const { data } = await api.get(`/encuestas/${enc.id}/resultados`);
      setResultados(data); setEncuestaActiva(enc); setTab('resultados');
    } catch {}
  };

  const enviarRespuesta = async () => {
    try {
      const payload = Object.entries(respuestas).map(([pregunta_id, val]) => ({
        pregunta_id,
        valor_numerico: typeof val === 'number' ? val : null,
        valor_texto: typeof val === 'string' ? val : null,
      }));
      await api.post('/encuestas/responder', { encuesta_id: encuestaActiva.id, respuestas: payload });
      setEnviado(true);
    } catch (err) { alert(err.response?.data?.error || 'Error'); }
  };

  const publicar = async (id) => {
    await api.patch(`/encuestas/${id}/publicar`); cargar();
  };

  const renderInput = (p) => {
    if (p.tipo === 'likert_5') return (
      <div className="flex gap-2 mt-3">
        {[1,2,3,4,5].map(v => (
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

  return (
    <ProtectedLayout>
      <div className="px-6 md:px-8 py-5 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="page-title">Gestión de la Satisfacción</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{encuestas.length} encuestas registradas</p>
          </div>
          <div className="flex gap-3">
            <button className="btn-secondary flex items-center gap-2" onClick={async () => {
              const res = await api.get('/reportes/encuestas', { responseType:'blob' });
              Object.assign(document.createElement('a'), { href: URL.createObjectURL(res.data), download:'encuestas.pdf' }).click();
            }}>
              <Download className="w-4 h-4" />
              Reporte PDF
            </button>
            {tab !== 'lista' && <button className="btn-secondary flex items-center gap-2" onClick={() => { setTab('lista'); setEncuestaActiva(null); }}><ArrowLeft className="w-4 h-4" /> Volver</button>}
            {tab === 'lista' && <button className="btn-primary flex items-center gap-2" onClick={() => { setModal(true); setError(''); }}>
              <Plus className="w-4 h-4" />
              Nueva Encuesta
            </button>}
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 animate-in">
        {/* Lista */}
        {tab === 'lista' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {encuestas.length === 0 && (
              <div className="col-span-full card p-12 text-center text-slate-400 dark:text-slate-500 text-sm">No hay encuestas. Crea la primera.</div>
            )}
            {encuestas.map(e => (
              <div key={e.id} className="card p-6 flex flex-col gap-4">
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
        )}

        {/* Responder */}
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
                        <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">{i+1}</span>
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

        {/* Resultados */}
        {tab === 'resultados' && encuestaActiva && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="card p-5">
              <h2 className="section-title">{encuestaActiva.titulo}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Resultados de la encuesta</p>
            </div>
            {resultados.length === 0 ? (
              <div className="card p-12 text-center text-slate-400 dark:text-slate-500 text-sm">Sin respuestas registradas aún</div>
            ) : (
              resultados.map((r, i) => (
                <div key={i} className="card p-5">
                  <p className="font-medium text-slate-800 dark:text-slate-200 mb-3">{i+1}. {r.texto}</p>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-3">
                      <div className="bg-blue-500 h-3 rounded-full transition-all"
                        style={{ width: r.promedio != null ? `${(parseFloat(r.promedio)/5)*100}%` : '0%' }} />
                    </div>
                    <div className="text-right shrink-0">
                      {r.promedio != null ? (
                        <span className="text-lg font-bold text-slate-800 dark:text-slate-200">{parseFloat(r.promedio).toFixed(2)}<span className="text-sm text-slate-400 dark:text-slate-500">/5</span></span>
                      ) : (
                        <span className="text-sm text-slate-400 dark:text-slate-500">Sin datos</span>
                      )}
                      <p className="text-xs text-slate-400 dark:text-slate-500">{r.total_respuestas} respuestas</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Modal crear encuesta */}
        {modal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10 rounded-t-3xl">
                <h2 className="section-title">Crear Nueva Encuesta</h2>
              </div>
              <form onSubmit={guardarEncuesta} className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Código</label><input className="input" placeholder="ENC-2024-I" value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} required /></div>
                  <div>
                    <label className="label">Dirigido a</label>
                    <select className="select" value={form.dirigido_a} onChange={e => setForm({ ...form, dirigido_a: e.target.value })}>
                      {['estudiantes','docentes','egresados','administrativos','todos'].map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase()+d.slice(1)}</option>)}
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
                          <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-2">{i+1}</span>
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
            </div>
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
