// ─── Roles y permisos — matriz real, editable por el PM y aplicada por el servidor ─
import React, { useMemo, useState } from 'react';
import { Shield, RotateCcw, Save, Check, Info, Lock, Plus, Trash2, Pencil } from 'lucide-react';
import { useAuth, canAccess, type UserRole } from '../contexts/AuthContext';
import { PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, ROLE_META, currentMatrix, saveMatrix,
  customRoles, saveCustomRoles, allRoleMeta, idRolValido, type CustomRole } from '../lib/permissions';
import { adminStore } from '../lib/adminStore';
import { persist } from '../lib/persist';

/** Roles de fábrica: no se borran ni se renombran. Los personalizados se agregan al final. */
const BUILTIN: UserRole[] = ['platform_admin', 'account_manager', 'pm', 'tech_lead', 'developer'];
const PALETA = ['#475569', '#0369a1', '#7c3aed', '#be123c', '#b45309', '#15803d'];

export default function RolesPermissions() {
  const { user } = useAuth();
  const canEdit = user ? canAccess(user.role, 'roles.manage') : false;
  const [matrix, setMatrix] = useState<Record<string, string[]>>(() => currentMatrix());
  const [custom, setCustom] = useState<CustomRole[]>(() => customRoles());
  const [nuevo, setNuevo] = useState<{ nombre: string; copiarDe: string } | null>(null);
  const ROLES: string[] = [...BUILTIN, ...custom.map(c => c.id)];
  const META = useMemo(() => allRoleMeta(), [custom]);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [filter, setFilter] = useState('');
  const users = useMemo(() => adminStore.getUsers().filter(u => u.active), []);
  const countByRole = (r: string) => users.filter(u => u.role === r).length;

  const modules = useMemo(() => {
    const m = new Map<string, typeof PERMISSIONS>();
    PERMISSIONS.filter(p => !filter || `${p.module} ${p.label} ${p.id}`.toLowerCase().includes(filter.toLowerCase()))
      .forEach(p => { m.set(p.module, [...(m.get(p.module) ?? []), p]); });
    return Array.from(m.entries());
  }, [filter]);

  /** Crea un rol nuevo copiando los permisos de uno existente. No inventa permisos:
   *  solo combina los del catálogo, por eso no puede habilitar nada sin control. */
  function crearRol() {
    if (!nuevo?.nombre.trim()) return;
    const id = nuevo.nombre.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    if (!idRolValido(id, META)) { alert('Ese nombre ya existe o no es válido. Probá con otro.'); return; }
    const rol: CustomRole = {
      id, name: nuevo.nombre.trim(),
      description: `Copiado de ${META[nuevo.copiarDe]?.name ?? nuevo.copiarDe}`,
      color: PALETA[custom.length % PALETA.length],
      permissions: [...(matrix[nuevo.copiarDe] ?? [])],
    };
    const next = [...custom, rol];
    setCustom(next); saveCustomRoles(next);
    setMatrix(m => ({ ...m, [id]: rol.permissions }));
    setNuevo(null); setDirty(true); setSaved(false);
  }

  function borrarRol(id: string) {
    const enUso = countByRole(id);
    if (enUso > 0) { alert(`No se puede borrar: ${enUso} usuario(s) lo tienen asignado. Cambiáles el rol primero.`); return; }
    if (!confirm(`¿Borrar el rol "${META[id]?.name ?? id}"?`)) return;
    const next = custom.filter(c => c.id !== id);
    setCustom(next); saveCustomRoles(next);
    setMatrix(m => { const { [id]: _, ...rest } = m; return rest; });
  }

  function renombrarRol(id: string) {
    const actual = custom.find(c => c.id === id);
    if (!actual) return;
    const nombre = prompt('Nombre del rol:', actual.name);
    if (!nombre?.trim()) return;
    const next = custom.map(c => c.id === id ? { ...c, name: nombre.trim() } : c);
    setCustom(next); saveCustomRoles(next);
  }

  function toggle(role: string, perm: string) {
    if (!canEdit || role === 'account_manager') return;
    setMatrix(m => ({ ...m, [role]: m[role].includes(perm) ? m[role].filter(p => p !== perm) : [...m[role], perm] }));
    setDirty(true); setSaved(false);
  }
  function save() {
    saveMatrix(matrix);
    // Los permisos de los roles personalizados viven en su propia definición
    saveCustomRoles(custom.map(c => ({ ...c, permissions: matrix[c.id] ?? c.permissions })));
    setDirty(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
  }
  function reset() {
    if (!confirm('¿Volver a la matriz por defecto?')) return;
    setMatrix({ ...DEFAULT_ROLE_PERMISSIONS }); setDirty(true); setSaved(false);
  }
  const isDefault = (role: string, perm: string) => (DEFAULT_ROLE_PERMISSIONS as Record<string, string[]>)[role]?.includes(perm) ?? false;

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
          <Lock size={12} /> Solo quien tenga el permiso roles.manage (gerente de cuenta / PM) puede modificar la matriz. Estás viendo la configuración vigente.
        </div>
      )}

      {/* Tarjetas de rol */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 8, marginBottom: 14 }}>
        {ROLES.map(r => {
          const propio = custom.some(c => c.id === r);
          return (
            <div key={r} style={{ background: '#fff', border: `0.5px solid ${META[r].color}40`, borderLeft: `3px solid ${META[r].color}`, borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'start', gap: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: META[r].color, flex: 1 }}>{META[r].name}</div>
                {propio && canEdit && (
                  <>
                    <button onClick={() => renombrarRol(r)} title="Renombrar"
                      style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 1, color: '#cbd5e1' }}><Pencil size={11}/></button>
                    <button onClick={() => borrarRol(r)} title="Borrar"
                      style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 1, color: '#fca5a5' }}><Trash2 size={11}/></button>
                  </>
                )}
              </div>
              <div style={{ fontSize: 10, color: '#64748b', margin: '3px 0 6px', lineHeight: 1.4 }}>{META[r].description}</div>
              <div style={{ fontSize: 9, color: '#94a3b8' }}>{(matrix[r] ?? []).length}/{PERMISSIONS.length} permisos · {countByRole(r)} persona{countByRole(r) !== 1 ? 's' : ''}</div>
            </div>
          );
        })}
        {canEdit && (
          <button onClick={() => setNuevo({ nombre: '', copiarDe: 'developer' })}
            style={{ border: '1.5px dashed #cbd5e1', borderRadius: 10, background: '#fafafa', cursor: 'pointer',
                     display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#64748b', fontSize: 11, fontWeight: 600, minHeight: 78 }}>
            <Plus size={14}/> Nuevo rol
          </button>
        )}
      </div>

      {/* Alta de rol: copia los permisos de uno existente y después se ajustan en la matriz */}
      {nuevo && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px', marginBottom: 14, display: 'flex', alignItems: 'end', gap: 10, flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: 10, color: '#64748b', marginBottom: 3 }}>Nombre del rol</label>
            <input autoFocus value={nuevo.nombre} onChange={e => setNuevo({ ...nuevo, nombre: e.target.value })}
              onKeyDown={e => { if (e.key === 'Enter') crearRol(); if (e.key === 'Escape') setNuevo(null); }}
              placeholder="Ej. Auditor, Analista, QA"
              style={{ fontSize: 12, padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 7, outline: 'none', minWidth: 210 }}/>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 10, color: '#64748b', marginBottom: 3 }}>Copiar permisos de</label>
            <select value={nuevo.copiarDe} onChange={e => setNuevo({ ...nuevo, copiarDe: e.target.value })}
              style={{ fontSize: 12, padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 7, outline: 'none', cursor: 'pointer' }}>
              {ROLES.map(r => <option key={r} value={r}>{META[r].name}</option>)}
            </select>
          </div>
          <button onClick={crearRol} style={{ fontSize: 12, fontWeight: 700, padding: '7px 16px', border: 'none', borderRadius: 7, background: '#0d9488', color: '#fff', cursor: 'pointer' }}>Crear</button>
          <button onClick={() => setNuevo(null)} style={{ fontSize: 12, padding: '7px 12px', border: 'none', borderRadius: 7, background: 'none', color: '#64748b', cursor: 'pointer' }}>Cancelar</button>
          <p style={{ margin: 0, fontSize: 10, color: '#94a3b8', flexBasis: '100%' }}>
            El rol nuevo combina permisos que ya existen; después los ajustás en la matriz de abajo y le das Guardar.
          </p>
        </div>
      )}

      {/* Matriz */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 12, overflow: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 900 }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              <th style={{ textAlign: 'left', padding: '9px 14px', fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', position: 'sticky', left: 0, background: '#fafafa' }}>Permiso</th>
              {ROLES.map(r => <th key={r} style={{ padding: '9px 8px', fontSize: 10, color: META[r].color, fontWeight: 700, textAlign: 'center', minWidth: 110 }}>{META[r].name}</th>)}
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
                      const on = (matrix[r] ?? []).includes(p.id); const changed = on !== isDefault(r, p.id); const locked = r === 'account_manager' || !canEdit;
                      return (
                        <td key={r} style={{ textAlign: 'center', padding: '4px 8px' }}>
                          <button onClick={() => toggle(r, p.id)} disabled={locked} title={r === 'account_manager' ? 'El gerente de cuenta siempre tiene todos los permisos' : changed ? 'Modificado respecto al valor por defecto' : ''}
                            style={{ width: 26, height: 26, borderRadius: 7, border: `1.5px solid ${on ? META[r].color : '#e2e8f0'}`, background: on ? META[r].color : '#fff',
                              cursor: locked ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', opacity: r === 'account_manager' ? .55 : 1,
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
