// ─── Roles y permisos — matriz real, editable por el PM y aplicada por el servidor ─
import React, { useMemo, useState } from 'react';
import { Shield, RotateCcw, Save, Check, Info, Lock } from 'lucide-react';
import { useAuth, type UserRole } from '../contexts/AuthContext';
import { PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, ROLE_META, currentMatrix, saveMatrix } from '../lib/permissions';
import { adminStore } from '../lib/adminStore';
import { persist } from '../lib/persist';

const ROLES: UserRole[] = ['pm', 'tech_lead', 'project_lead', 'tech_ref', 'developer'];

export default function RolesPermissions() {
  const { user } = useAuth();
  const canEdit = user?.role === 'pm';
  const [matrix, setMatrix] = useState<Record<UserRole, string[]>>(() => currentMatrix());
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [filter, setFilter] = useState('');
  const users = useMemo(() => adminStore.getUsers().filter(u => u.active), []);
  const countByRole = (r: UserRole) => users.filter(u => u.role === r).length;

  const modules = useMemo(() => {
    const m = new Map<string, typeof PERMISSIONS>();
    PERMISSIONS.filter(p => !filter || `${p.module} ${p.label} ${p.id}`.toLowerCase().includes(filter.toLowerCase()))
      .forEach(p => { m.set(p.module, [...(m.get(p.module) ?? []), p]); });
    return Array.from(m.entries());
  }, [filter]);

  function toggle(role: UserRole, perm: string) {
    if (!canEdit || role === 'pm') return;
    setMatrix(m => ({ ...m, [role]: m[role].includes(perm) ? m[role].filter(p => p !== perm) : [...m[role], perm] }));
    setDirty(true); setSaved(false);
  }
  function save() {
    saveMatrix(matrix); setDirty(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
  }
  function reset() {
    if (!confirm('¿Volver a la matriz por defecto?')) return;
    setMatrix({ ...DEFAULT_ROLE_PERMISSIONS }); setDirty(true); setSaved(false);
  }
  const isDefault = (role: UserRole, perm: string) => DEFAULT_ROLE_PERMISSIONS[role].includes(perm);

  return (
    <div style={{ padding: '28px 36px', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: '#fef2f2', border: '0.5px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Shield size={16} color="#dc2626" />
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111', letterSpacing: '-.3px' }}>Roles y permisos</h2>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>
            Qué puede hacer cada rol. {persist.mode === 'api' ? 'El servidor aplica esta matriz en cada escritura (no solo el front).' : 'Modo local: la matriz se aplica en este navegador.'}
          </p>
        </div>
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filtrar permisos…"
          style={{ padding: '7px 10px', fontSize: 11, border: '0.5px solid #e2e8f0', borderRadius: 7, width: 220 }} />
        {canEdit && (
          <>
            <button onClick={reset} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', fontSize: 11, background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 7, cursor: 'pointer', color: '#374151' }}><RotateCcw size={12} /> Por defecto</button>
            <button onClick={save} disabled={!dirty} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', fontSize: 11, fontWeight: 600, background: dirty ? '#dc2626' : saved ? '#15803d' : '#cbd5e1', color: '#fff', border: 'none', borderRadius: 7, cursor: dirty ? 'pointer' : 'default' }}>
              {saved ? <><Check size={12} /> Guardado</> : <><Save size={12} /> Guardar cambios</>}
            </button>
          </>
        )}
      </div>

      {!canEdit && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: '#f8fafc', border: '0.5px solid #e2e8f0', borderRadius: 8, fontSize: 11, color: '#64748b', marginBottom: 12 }}>
          <Lock size={12} /> Solo el Project Manager puede modificar la matriz. Estás viendo la configuración vigente.
        </div>
      )}

      {/* Tarjetas de rol */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 14 }}>
        {ROLES.map(r => (
          <div key={r} style={{ background: '#fff', border: `0.5px solid ${ROLE_META[r].color}40`, borderLeft: `3px solid ${ROLE_META[r].color}`, borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: ROLE_META[r].color }}>{ROLE_META[r].name}</div>
            <div style={{ fontSize: 10, color: '#64748b', margin: '3px 0 6px', lineHeight: 1.4 }}>{ROLE_META[r].description}</div>
            <div style={{ fontSize: 9, color: '#94a3b8' }}>{matrix[r].length}/{PERMISSIONS.length} permisos · {countByRole(r)} persona{countByRole(r) !== 1 ? 's' : ''}</div>
          </div>
        ))}
      </div>

      {/* Matriz */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 12, overflow: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 900 }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              <th style={{ textAlign: 'left', padding: '9px 14px', fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', position: 'sticky', left: 0, background: '#fafafa' }}>Permiso</th>
              {ROLES.map(r => <th key={r} style={{ padding: '9px 8px', fontSize: 10, color: ROLE_META[r].color, fontWeight: 700, textAlign: 'center', minWidth: 110 }}>{ROLE_META[r].name}</th>)}
            </tr>
          </thead>
          <tbody>
            {modules.map(([mod, perms]) => (
              <React.Fragment key={mod}>
                <tr><td colSpan={ROLES.length + 1} style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 700, color: '#374151', background: '#f8fafc', borderTop: '0.5px solid #e2e8f0' }}>{mod}</td></tr>
                {perms.map(p => (
                  <tr key={p.id} style={{ borderTop: '0.5px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 14px', position: 'sticky', left: 0, background: '#fff' }}>
                      <div style={{ fontSize: 11, color: '#111' }}>{p.label}</div>
                      <div style={{ fontSize: 9, color: '#94a3b8', fontFamily: 'monospace' }}>{p.id}</div>
                    </td>
                    {ROLES.map(r => {
                      const on = matrix[r].includes(p.id); const changed = on !== isDefault(r, p.id); const locked = r === 'pm' || !canEdit;
                      return (
                        <td key={r} style={{ textAlign: 'center', padding: '4px 8px' }}>
                          <button onClick={() => toggle(r, p.id)} disabled={locked} title={r === 'pm' ? 'El PM siempre tiene todos los permisos' : changed ? 'Modificado respecto al valor por defecto' : ''}
                            style={{ width: 26, height: 26, borderRadius: 7, border: `1.5px solid ${on ? ROLE_META[r].color : '#e2e8f0'}`, background: on ? ROLE_META[r].color : '#fff',
                              cursor: locked ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', opacity: r === 'pm' ? .55 : 1,
                              outline: changed ? '2px solid #fbbf24' : 'none', outlineOffset: 1 }}>
                            {on && <Check size={14} color="#fff" />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 10, color: '#94a3b8' }}>
        <Info size={11} /> Borde amarillo = distinto al valor por defecto. Alcance: quien no tenga "Ver todos los proyectos" solo puede modificar datos de sus proyectos asignados; el TR propio solo el suyo.
      </div>
    </div>
  );
}
