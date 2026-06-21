'use client';
import { useState, useEffect } from 'react';
import ProtectedLayout from '@/components/Layout/ProtectedLayout';
import api from '@/lib/api';
import { X, Download, Plus, Search } from 'lucide-react';

const ESTADOS = ['borrador','en_revision','aprobado','obsoleto','archivado'];
const estadoBadge = {
  aprobado:'badge-green', en_revision:'badge-yellow',
  borrador:'badge-blue', obsoleto:'badge-red', archivado:'badge-gray',
};

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-[95vw] sm:max-w-lg w-full animate-in">
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

export default function DocumentosPage() {
  const [docs, setDocs] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try {
      const [d, t] = await Promise.all([api.get('/documentos'), api.get('/documentos-tipos')]);
      setDocs(d.data); setTipos(t.data);
    } catch {}
  };

  const abrirCrear = () => {
    setForm({ codigo:'', titulo:'', tipo_documento_id: tipos[0]?.id || '', contenido:'', estado:'borrador', fecha_vigencia:'', fecha_revision:'' });
    setEditando(null); setError(''); setModal(true);
  };

  const abrirEditar = (d) => {
    setForm({ titulo: d.titulo, tipo_documento_id: d.tipo_documento_id, contenido: d.contenido||'', estado: d.estado,
      fecha_vigencia: d.fecha_vigencia||'', fecha_revision: d.fecha_revision||'' });
    setEditando(d); setError(''); setModal(true);
  };

  const guardar = async (e) => {
    e.preventDefault(); setError(''); setSaving(true);
    try {
      if (editando) await api.put(`/documentos/${editando.id}`, form);
      else await api.post('/documentos', form);
      setModal(false); cargar();
    } catch (err) { setError(err.response?.data?.error || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este documento?')) return;
    try { await api.delete(`/documentos/${id}`); cargar(); } catch {}
  };

  const descargarPDF = async () => {
    try {
      const res = await api.get('/reportes/documentos', { responseType:'blob' });
      Object.assign(document.createElement('a'), { href: URL.createObjectURL(res.data), download:'documentos.pdf' }).click();
    } catch {}
  };

  const filtrados = docs.filter(d => {
    const matchText = d.titulo.toLowerCase().includes(filtro.toLowerCase()) || d.codigo.toLowerCase().includes(filtro.toLowerCase());
    const matchEstado = !filtroEstado || d.estado === filtroEstado;
    return matchText && matchEstado;
  });

  return (
    <ProtectedLayout>
      {/* Header */}
      <div className="px-6 md:px-8 py-5 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-title">Gestión Documental</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{docs.length} documentos registrados</p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button className="btn-secondary flex-1 sm:flex-none flex items-center justify-center gap-2" onClick={descargarPDF}>
              <Download className="w-4 h-4" />
              PDF
            </button>
            <button className="btn-primary flex-1 sm:flex-none flex items-center justify-center gap-2" onClick={abrirCrear}>
              <Plus className="w-4 h-4" />
              Nuevo Documento
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-6 animate-in">
        {/* Filters */}
        <div className="card px-4 py-3.5 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input className="input pl-9" placeholder="Buscar por código o título..."
              value={filtro} onChange={e => setFiltro(e.target.value)} />
          </div>
          <select className="select sm:w-44" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                <tr>
                  <th className="table-header">Código</th>
                  <th className="table-header">Título</th>
                  <th className="table-header">Tipo</th>
                  <th className="table-header">Estado</th>
                  <th className="table-header">Ver.</th>
                  <th className="table-header">Fecha</th>
                  <th className="table-header">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                {filtrados.length === 0 && (
                  <tr><td colSpan={7} className="py-16 text-center text-slate-400 dark:text-slate-500 text-sm">
                    No hay documentos {filtro || filtroEstado ? 'que coincidan' : 'registrados'}
                  </td></tr>
                )}
                {filtrados.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="table-cell"><span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">{d.codigo}</span></td>
                    <td className="table-cell font-medium text-slate-800 dark:text-slate-200 max-w-xs truncate">{d.titulo}</td>
                    <td className="table-cell text-slate-400 dark:text-slate-500 text-xs">{d.tipo_nombre || '—'}</td>
                    <td className="table-cell"><span className={`badge ${estadoBadge[d.estado] || 'badge-gray'}`}>{d.estado}</span></td>
                    <td className="table-cell text-slate-400 dark:text-slate-500 text-xs">v{d.version_actual}</td>
                    <td className="table-cell text-slate-400 dark:text-slate-500 text-xs">{d.creado_en ? new Date(d.creado_en).toLocaleDateString('es-PE') : '—'}</td>
                    <td className="table-cell">
                      <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => abrirEditar(d)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs font-semibold">Editar</button>
                        <button onClick={() => eliminar(d.id)} className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-xs font-semibold">Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtrados.length > 0 && (
            <div className="px-4 py-3 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500">
              Mostrando {filtrados.length} de {docs.length} documentos
            </div>
          )}
        </div>
      </div>

      {modal && (
        <Modal title={editando ? 'Editar Documento' : 'Nuevo Documento'} onClose={() => setModal(false)}>
          <form onSubmit={guardar}>
            <div className="modal-body">
              {!editando && (
                <div>
                  <label className="label">Código</label>
                  <input className="input" placeholder="POL-001" value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} required />
                </div>
              )}
              <div>
                <label className="label">Título</label>
                <input className="input" placeholder="Título del documento" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} required />
              </div>
              <div>
                <label className="label">Tipo de documento</label>
                <select className="select" value={form.tipo_documento_id} onChange={e => setForm({ ...form, tipo_documento_id: e.target.value })} required>
                  <option value="">Seleccionar tipo</option>
                  {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </div>
              {editando && (
                <div>
                  <label className="label">Estado</label>
                  <select className="select" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                    {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="label">Descripción / Contenido</label>
                <textarea className="input" rows={3} value={form.contenido} onChange={e => setForm({ ...form, contenido: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Fecha de Vigencia</label>
                  <input type="date" className="input" value={form.fecha_vigencia} onChange={e => setForm({ ...form, fecha_vigencia: e.target.value })} />
                </div>
                <div>
                  <label className="label">Próxima Revisión</label>
                  <input type="date" className="input" value={form.fecha_revision} onChange={e => setForm({ ...form, fecha_revision: e.target.value })} />
                </div>
              </div>
              {error && <p className="text-red-500 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl px-3 py-2">{error}</p>}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary flex-1" onClick={() => setModal(false)}>Cancelar</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Guardando...' : 'Guardar Documento'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </ProtectedLayout>
  );
}
