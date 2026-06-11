import React, { useState } from 'react';
import { Plus, ChevronRight, Clock, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { adminStore, CircuitoCard, CircuitoColumna, Priority } from '../lib/adminStore';
import { PROJECTS } from '../contexts/AuthContext';

const COLUMNAS: CircuitoColumna[] = ['Pendiente', 'Enviado', 'En revisión', 'Observaciones', 'Aprobado'];
const NEXT_COLUMNA: Record<CircuitoColumna, CircuitoColumna | null> = {
  Pendiente:      'Enviado',
  Enviado:        'En revisión',
  'En revisión':  'Observaciones',
  Observaciones:  'Enviado',   // re-envío tras correcciones
  Aprobado:       null,
};
const PREV_LABEL: Record<CircuitoColumna, string> = {
  Pendiente:      '',
  Enviado:        'Enviar a BBVA →',
  'En revisión':  'BBVA recibió →',
  Observaciones:  'BBVA devolvió →',
  Aprobado:       'Aprobado ✓',
};

const COL_STYLE: Record<CircuitoColumna, { header: string; badge: { bg: string; text: string } }> = {
  Pendiente:      { header: '#f8fafc', badge: { bg: '#f1f5f9', text: '#64748b' } },
  Enviado:        { header: '#eff6ff', badge: { bg: '#dbeafe', text: '#1d4ed8' } },
  'En revisión':  { header: '#fef9c3', badge: { bg: '#fef9c3', text: '#92400e' } },
  Observaciones:  { header: '#fef2f2', badge: { bg: '#fee2e2', text: '#dc2626' } },
  Aprobado:       { header: '#f0fdf4', badge: { bg: '#dcfce7', text: '#15803d' } },
};

const PRIO_COLOR: Record<Priority, string> = {
  Baja: '#64748b', Media: '#2563eb', Alta: '#d97706', Crítica: '#dc2626',
};

function daysSince(dateStr?: string): number {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function getColumnEntryDate(card: CircuitoCard): string | undefined {
  const last = card.historial[card.historial.length - 1];
  return last?.fecha;
}

// ─── Modales ──────────────────────────────────────────────────────────────────

interface MoveModalProps {
  card: CircuitoCard;
  onConfirm: (nota: string) => void;
  onClose: () => void;
}
function MoveModal({ card, onConfirm, onClose }: MoveModalProps) {
  const [nota, setNota] = useState('');
  const next = NEXT_COLUMNA[card.columna];
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 440, padding: '22px 24px' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>
            Mover a: <span style={{ color: '#dc2626' }}>{next}</span>
          </h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={16}/></button>
        </div>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
          <strong>{card.titulo}</strong> — {card.projectId}
        </p>
        <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Nota del movimiento</label>
        <textarea
          value={nota} onChange={e => setNota(e.target.value)}
          placeholder={`Ej: ${card.columna === 'Pendiente' ? 'Documento enviado al equipo BBVA' : card.columna === 'Enviado' ? 'BBVA confirmó recepción, en revisión' : 'Notas del movimiento'}`}
          rows={3}
          style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: '0.5px solid #e2e8f0', borderRadius: 8, resize: 'vertical', boxSizing: 'border-box', marginBottom: 16 }}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 14px', fontSize: 12, border: '0.5px solid #e2e8f0', borderRadius: 7, background: '#fff', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={() => onConfirm(nota)} style={{ padding: '8px 14px', fontSize: 12, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 500 }}>
            Confirmar → {next}
          </button>
        </div>
      </div>
    </div>
  );
}

interface NewCardModalProps {
  onConfirm: (card: Omit<CircuitoCard, 'id' | 'historial'>) => void;
  onClose: () => void;
}
function NewCardModal({ onConfirm, onClose }: NewCardModalProps) {
  const [form, setForm] = useState<Omit<CircuitoCard, 'id' | 'historial'>>({
    projectId: '', titulo: '', columna: 'Pendiente', responsable: '', prioridad: 'Alta',
  });
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 480, padding: '22px 24px' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>Nueva validación BBVA</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={16}/></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Proyecto *</label>
            <select value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
              style={{ width: '100%', padding: '7px 10px', fontSize: 12, border: '0.5px solid #e2e8f0', borderRadius: 7, background: '#fff' }}>
              <option value="">Seleccionar...</option>
              {PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Prioridad</label>
            <select value={form.prioridad} onChange={e => setForm(f => ({ ...f, prioridad: e.target.value as Priority }))}
              style={{ width: '100%', padding: '7px 10px', fontSize: 12, border: '0.5px solid #e2e8f0', borderRadius: 7, background: '#fff' }}>
              {(['Baja','Media','Alta','Crítica'] as Priority[]).map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Título del documento / entregable *</label>
          <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
            placeholder="Ej: Diccionario técnico v3, Aprobación ETL t_nga_output..."
            style={{ width: '100%', padding: '7px 10px', fontSize: 12, border: '0.5px solid #e2e8f0', borderRadius: 7, boxSizing: 'border-box' }}/>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Responsable Timia</label>
          <input value={form.responsable} onChange={e => setForm(f => ({ ...f, responsable: e.target.value }))}
            placeholder="Nombre del líder técnico o referente"
            style={{ width: '100%', padding: '7px 10px', fontSize: 12, border: '0.5px solid #e2e8f0', borderRadius: 7, boxSizing: 'border-box' }}/>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 14px', fontSize: 12, border: '0.5px solid #e2e8f0', borderRadius: 7, background: '#fff', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={() => { if (form.projectId && form.titulo) onConfirm(form); }}
            style={{ padding: '8px 14px', fontSize: 12, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 500 }}>
            Crear
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tarjeta individual ───────────────────────────────────────────────────────

interface CardProps {
  card: CircuitoCard;
  ansConfig: Record<string, number>;
  onMove: (card: CircuitoCard) => void;
}

function KanbanCard({ card, ansConfig, onMove }: CardProps) {
  const proj = PROJECTS.find(p => p.id === card.projectId);
  const entryDate = getColumnEntryDate(card);
  const days = daysSince(entryDate);
  const maxDays = ansConfig[card.columna] ?? 5;
  const isOverdue = card.columna !== 'Aprobado' && card.columna !== 'Pendiente' && days > maxDays;
  const isWarning = !isOverdue && card.columna !== 'Aprobado' && card.columna !== 'Pendiente' && days >= maxDays * 0.7;
  const hasNext = NEXT_COLUMNA[card.columna] !== null;

  return (
    <div style={{ background: '#fff', border: `0.5px solid ${isOverdue ? '#fecaca' : '#e2e8f0'}`, borderLeft: `3px solid ${PRIO_COLOR[card.prioridad]}`, borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, background: proj ? proj.color + '20' : '#f1f5f9', color: proj?.color ?? '#64748b', fontWeight: 600 }}>{card.projectId}</span>
        <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 5, background: PRIO_COLOR[card.prioridad] + '15', color: PRIO_COLOR[card.prioridad], fontWeight: 500 }}>{card.prioridad}</span>
      </div>
      {/* Title */}
      <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 500, color: '#111', lineHeight: 1.4 }}>{card.titulo}</p>
      {/* Responsable */}
      {card.responsable && (
        <p style={{ margin: '0 0 6px', fontSize: 10, color: '#94a3b8' }}>👤 {card.responsable}</p>
      )}
      {/* Observaciones */}
      {card.observaciones && (
        <p style={{ margin: '0 0 8px', fontSize: 10, color: '#dc2626', background: '#fef2f2', padding: '4px 8px', borderRadius: 6, lineHeight: 1.4 }}>{card.observaciones}</p>
      )}
      {/* Timer */}
      {card.columna !== 'Pendiente' && card.columna !== 'Aprobado' && entryDate && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
          {isOverdue
            ? <AlertTriangle size={11} color="#dc2626"/>
            : isWarning
            ? <Clock size={11} color="#d97706"/>
            : <Clock size={11} color="#94a3b8"/>}
          <span style={{ fontSize: 10, color: isOverdue ? '#dc2626' : isWarning ? '#d97706' : '#94a3b8', fontWeight: isOverdue ? 600 : 400 }}>
            {days} día{days !== 1 ? 's' : ''} en este estado
            {isOverdue && ` · ¡Excede ${maxDays}d ANS!`}
          </span>
        </div>
      )}
      {card.columna === 'Aprobado' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <CheckCircle size={11} color="#059669"/>
          <span style={{ fontSize: 10, color: '#059669' }}>Aprobado</span>
        </div>
      )}
      {/* Acción */}
      {hasNext && (
        <button onClick={() => onMove(card)}
          style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, padding: '5px 10px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', width: '100%', justifyContent: 'center', fontWeight: 500 }}>
          {PREV_LABEL[NEXT_COLUMNA[card.columna] as CircuitoColumna] || `Mover a ${NEXT_COLUMNA[card.columna]}`} <ChevronRight size={10}/>
        </button>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function CircuitosBBVA() {
  const [cards, setCards] = useState<CircuitoCard[]>(() => adminStore.getCircuitos());
  const bbvaAns = adminStore.getBbvaAns();
  const [moveCard, setMoveCard] = useState<CircuitoCard | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [filterProj, setFilterProj] = useState('');

  const ansMap: Record<string, number> = {
    Enviado: bbvaAns.Enviado,
    'En revisión': bbvaAns['En revisión'],
    Observaciones: bbvaAns.Observaciones,
  };

  function saveCards(next: CircuitoCard[]) {
    setCards(next);
    adminStore.saveCircuitos(next);
  }

  function handleMove(card: CircuitoCard, nota: string) {
    const next = NEXT_COLUMNA[card.columna];
    if (!next) return;
    const today = new Date().toISOString().slice(0, 10);
    const updated: CircuitoCard = {
      ...card,
      columna: next,
      fechaEnvio: card.columna === 'Pendiente' ? today : card.fechaEnvio,
      historial: [...card.historial, { fecha: today, columna: next, nota: nota || `Movido a ${next}` }],
    };
    saveCards(cards.map(c => c.id === card.id ? updated : c));
    setMoveCard(null);
  }

  function handleNew(data: Omit<CircuitoCard, 'id' | 'historial'>) {
    const c: CircuitoCard = { ...data, id: 'c' + Date.now(), historial: [] };
    saveCards([...cards, c]);
    setShowNew(false);
  }

  const visibleCards = filterProj ? cards.filter(c => c.projectId === filterProj) : cards;
  const overdueCount = cards.filter(c => {
    const days = daysSince(getColumnEntryDate(c));
    const max = ansMap[c.columna];
    return max && days > max;
  }).length;

  return (
    <div style={{ padding: '28px 36px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 500, color: '#111' }}>Circuitos BBVA</h2>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: '#94a3b8' }}>
            Control de validaciones en banco · ANS interno configurable desde Panel Admin
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {overdueCount > 0 && (
            <span style={{ fontSize: 11, padding: '5px 12px', borderRadius: 8, background: '#fef2f2', color: '#dc2626', fontWeight: 600 }}>
              ⚠ {overdueCount} vencido{overdueCount > 1 ? 's' : ''}
            </span>
          )}
          <select value={filterProj} onChange={e => setFilterProj(e.target.value)}
            style={{ padding: '8px 10px', fontSize: 12, border: '0.5px solid #e2e8f0', borderRadius: 8, background: '#fff' }}>
            <option value="">Todos los proyectos</option>
            {PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={() => setShowNew(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 12, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 500 }}>
            <Plus size={14}/> Nueva validación
          </button>
        </div>
      </div>

      {/* ANS legend */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {Object.entries(ansMap).map(([col, days]) => (
          <span key={col} style={{ fontSize: 10, padding: '3px 10px', borderRadius: 6, background: '#f8fafc', border: '0.5px solid #e2e8f0', color: '#64748b' }}>
            ANS {col}: <strong style={{ color: '#374151' }}>{days} días</strong>
          </span>
        ))}
      </div>

      {/* Kanban */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, alignItems: 'start' }}>
        {COLUMNAS.map(col => {
          const colCards = visibleCards.filter(c => c.columna === col);
          const style = COL_STYLE[col];
          return (
            <div key={col}>
              {/* Column header */}
              <div style={{ background: style.header, borderRadius: '10px 10px 0 0', padding: '10px 14px', marginBottom: 1, border: '0.5px solid #e2e8f0', borderBottom: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{col}</span>
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, background: style.badge.bg, color: style.badge.text, fontWeight: 600 }}>
                    {colCards.length}
                  </span>
                </div>
              </div>
              {/* Cards */}
              <div style={{ background: '#f8fafc', borderRadius: '0 0 10px 10px', padding: '10px 8px', border: '0.5px solid #e2e8f0', borderTop: 'none', minHeight: 120 }}>
                {colCards.length === 0 && (
                  <p style={{ margin: 0, fontSize: 11, color: '#cbd5e1', textAlign: 'center', padding: '16px 0' }}>—</p>
                )}
                {colCards.map(c => (
                  <KanbanCard key={c.id} card={c} ansConfig={ansMap} onMove={setMoveCard}/>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modales */}
      {moveCard && (
        <MoveModal
          card={moveCard}
          onConfirm={nota => handleMove(moveCard, nota)}
          onClose={() => setMoveCard(null)}
        />
      )}
      {showNew && (
        <NewCardModal
          onConfirm={handleNew}
          onClose={() => setShowNew(false)}
        />
      )}
    </div>
  );
}
