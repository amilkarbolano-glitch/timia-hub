import React, { useState } from 'react';
import { Plus, Filter, Trash2, FileDown, Search } from 'lucide-react';
import { adminStore, BitacoraEntry } from '../lib/adminStore';
import { PROJECTS } from '../contexts/AuthContext';
import { useAuth } from '../contexts/AuthContext';

const TIPOS = ['Campo', 'Regla', 'Modelo', 'ETL', 'Otro'] as const;

const TIPO_COLORS: Record<string, { bg: string; text: string }> = {
  Campo:  { bg: '#dbeafe', text: '#1d4ed8' },
  Regla:  { bg: '#fef3c7', text: '#92400e' },
  Modelo: { bg: '#ede9fe', text: '#6d28d9' },
  ETL:    { bg: '#d1fae5', text: '#065f46' },
  Otro:   { bg: '#f1f5f9', text: '#475569' },
};

const EMPTY_FORM: Omit<BitacoraEntry, 'id' | 'fecha' | 'quien'> = {
  projectId: '', tipo: 'Campo', descripcion: '',
  motivo: '', tablasAfectadas: '', jira: '',
};

export default function Bitacora() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<BitacoraEntry[]>(() => adminStore.getBitacora());
  const [form, setForm] = useState<typeof EMPTY_FORM>({ ...EMPTY_FORM });
  const [showForm, setShowForm] = useState(false);
  const [filterProj, setFilterProj] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [search, setSearch] = useState('');

  function save(next: BitacoraEntry[]) {
    setEntries(next);
    adminStore.saveBitacora(next);
  }

  function addEntry() {
    if (!form.projectId || !form.descripcion.trim()) return;
    const e: BitacoraEntry = {
      id: 'b' + Date.now(),
      fecha: new Date().toISOString().slice(0, 10),
      quien: user?.name ?? 'Sistema',
      ...form,
    };
    save([e, ...entries]);
    setForm({ ...EMPTY_FORM });
    setShowForm(false);
  }

  function del(id: string) {
    if (confirm('¿Eliminar entrada?')) save(entries.filter(e => e.id !== id));
  }

  const filtered = entries.filter(e => {
    if (filterProj && e.projectId !== filterProj) return false;
    if (filterTipo && e.tipo !== filterTipo) return false;
    if (search) {
      const q = search.toLowerCase();
      return e.descripcion.toLowerCase().includes(q) ||
             e.motivo.toLowerCase().includes(q) ||
             e.tablasAfectadas.toLowerCase().includes(q);
    }
    return true;
  });

  function exportCsv() {
    const header = 'Fecha,Proyecto,Tipo,Descripción,Motivo,Tablas,Jira,Registrado por';
    const rows = filtered.map(e =>
      [e.fecha, e.projectId, e.tipo, `"${e.descripcion}"`, `"${e.motivo}"`,
       `"${e.tablasAfectadas}"`, e.jira, e.quien].join(',')
    );
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `bitacora_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div style={{ padding: '28px 36px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 500, color: '#111' }}>Bitácora de cambios</h2>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: '#94a3b8' }}>
            Historial de redefiniciones funcionales — campos, reglas, modelos, ETL
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportCsv} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 12, border: '0.5px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', color: '#374151' }}>
            <FileDown size={14}/> Exportar CSV
          </button>
          <button onClick={() => setShowForm(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 12, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 500 }}>
            <Plus size={14}/> Nuevo registro
          </button>
        </div>
      </div>

      {/* Formulario nuevo registro */}
      {showForm && (
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 500, color: '#111' }}>Nuevo registro de cambio</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Proyecto *</label>
              <select value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
                style={{ width: '100%', padding: '7px 10px', fontSize: 12, border: '0.5px solid #e2e8f0', borderRadius: 7, background: '#fff' }}>
                <option value="">Seleccionar...</option>
                {PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Tipo de cambio *</label>
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as typeof form.tipo }))}
                style={{ width: '100%', padding: '7px 10px', fontSize: 12, border: '0.5px solid #e2e8f0', borderRadius: 7, background: '#fff' }}>
                {TIPOS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Ticket Jira</label>
              <input value={form.jira} onChange={e => setForm(f => ({ ...f, jira: e.target.value }))}
                placeholder="DECRONOS-xxxx"
                style={{ width: '100%', padding: '7px 10px', fontSize: 12, border: '0.5px solid #e2e8f0', borderRadius: 7, boxSizing: 'border-box' }}/>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Descripción del cambio *</label>
              <textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                placeholder="Ej: Campo PAN_CUST_ID cambió de tipo VARCHAR a NUMERIC..."
                rows={3}
                style={{ width: '100%', padding: '7px 10px', fontSize: 12, border: '0.5px solid #e2e8f0', borderRadius: 7, resize: 'vertical', boxSizing: 'border-box' }}/>
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Motivo / Solicitado por</label>
              <textarea value={form.motivo} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))}
                placeholder="Ej: BBVA solicitó cambio en documento de observaciones del 2026-06-03..."
                rows={3}
                style={{ width: '100%', padding: '7px 10px', fontSize: 12, border: '0.5px solid #e2e8f0', borderRadius: 7, resize: 'vertical', boxSizing: 'border-box' }}/>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Tablas afectadas</label>
            <input value={form.tablasAfectadas} onChange={e => setForm(f => ({ ...f, tablasAfectadas: e.target.value }))}
              placeholder="t_kfca_input, t_kbrb_output, ..."
              style={{ width: '100%', padding: '7px 10px', fontSize: 12, border: '0.5px solid #e2e8f0', borderRadius: 7, boxSizing: 'border-box' }}/>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowForm(false)} style={{ padding: '8px 16px', fontSize: 12, border: '0.5px solid #e2e8f0', borderRadius: 7, background: '#fff', cursor: 'pointer' }}>Cancelar</button>
            <button onClick={addEntry} style={{ padding: '8px 16px', fontSize: 12, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 500 }}>Guardar registro</button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 280 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar descripción, tablas..."
            style={{ width: '100%', paddingLeft: 30, padding: '8px 10px 8px 30px', fontSize: 12, border: '0.5px solid #e2e8f0', borderRadius: 8, boxSizing: 'border-box' }}/>
        </div>
        <select value={filterProj} onChange={e => setFilterProj(e.target.value)}
          style={{ padding: '8px 10px', fontSize: 12, border: '0.5px solid #e2e8f0', borderRadius: 8, background: '#fff', minWidth: 130 }}>
          <option value="">Todos los proyectos</option>
          {PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}
          style={{ padding: '8px 10px', fontSize: 12, border: '0.5px solid #e2e8f0', borderRadius: 8, background: '#fff' }}>
          <option value="">Todos los tipos</option>
          {TIPOS.map(t => <option key={t}>{t}</option>)}
        </select>
        <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 12, padding: '48px 0', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>No hay registros.{entries.length === 0 ? ' Agrega el primero con "Nuevo registro".' : ''}</p>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '90px 90px 80px 1fr 1fr 150px 90px 40px', gap: 8, padding: '10px 16px', background: '#f8fafc', borderBottom: '0.5px solid #e2e8f0', fontSize: 10, color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.04em' }}>
            <span>Fecha</span><span>Proyecto</span><span>Tipo</span><span>Descripción</span><span>Motivo</span><span>Tablas</span><span>Jira</span><span/>
          </div>
          {filtered.map((e, i) => {
            const tc = TIPO_COLORS[e.tipo] ?? TIPO_COLORS.Otro;
            const proj = PROJECTS.find(p => p.id === e.projectId);
            return (
              <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '90px 90px 80px 1fr 1fr 150px 90px 40px', gap: 8, alignItems: 'start', padding: '12px 16px', borderBottom: i < filtered.length - 1 ? '0.5px solid #f1f5f9' : 'none', background: i % 2 === 0 ? '#fff' : '#fafafe' }}>
                <span style={{ fontSize: 11, color: '#64748b' }}>{e.fecha}</span>
                <span style={{ fontSize: 11, fontWeight: 500, color: proj?.color ?? '#64748b' }}>{e.projectId}</span>
                <span>
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: tc.bg, color: tc.text, fontWeight: 500 }}>{e.tipo}</span>
                </span>
                <span style={{ fontSize: 11, color: '#374151', lineHeight: 1.5 }}>{e.descripcion}</span>
                <span style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>{e.motivo || '—'}</span>
                <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>{e.tablasAfectadas || '—'}</span>
                <span style={{ fontSize: 10, color: '#2563eb' }}>{e.jira || '—'}</span>
                <button onClick={() => del(e.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px', display: 'flex', alignItems: 'center' }}>
                  <Trash2 size={13}/>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
