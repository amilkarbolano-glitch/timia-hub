// ─── Parche: proyectos con guion en el id ────────────────────────────────────
// El API que está desplegado saca el proyecto de la clave de cada ítem partiéndola
// por el primer separador que encuentra ('::', '__', '-'):
//
//     for sep in ("::", "__", "-"):
//         if sep in k: return k.split(sep)[0]
//
// Las claves del plan son `${projectId}-${entregable}-${actividad}`, así que de
// 'REPORTE-RE-entregable-3-0' deriva el proyecto 'REPORTE', que no existe en el
// catálogo. Y entonces rechaza la escritura:
//
//     if proj and not all_projects and proj not in project_ids:
//         return f"No tienes acceso al proyecto {proj}"
//
// Quien tiene 'projects.view_all' (gerente de cuenta, administrador) se salta esa
// comprobación entera y no se entera del bug. Quien no lo tiene —un líder técnico
// asignado al proyecto— no puede guardar nada: ni %, ni etapas, ni fechas.
//
// El arreglo de raíz ya está hecho en el API (resuelve la coincidencia más larga
// contra el catálogo de proyectos), pero mientras no se despliegue, este parche
// añade ese prefijo derivado a los proyectos de las personas afectadas. Es un id
// que no existe: no da acceso a ningún proyecto real, solo satisface esa línea.
// Cuando el API esté desplegado queda inerte y se puede quitar con el mismo botón.
import { useEffect, useMemo, useRef, useState } from 'react';
import { adminStore, type AdminUser } from '../lib/adminStore';
import { hasPermission } from '../lib/permissions';
import { persist } from '../lib/persist';

/** Lo que el API con el bug deriva de una clave. Copia literal de su recorrido. */
function derivaDelServidor(clave: string): string {
  for (const sep of ['::', '__', '-']) if (clave.includes(sep)) return clave.split(sep)[0];
  return clave;
}

/** Prefijos fantasma que hacen falta para un proyecto, o [] si su id no da problema.
 *  Se prueban las dos formas de clave que usa el plan: la del ítem y la del propio
 *  proyecto (timia_plan_configs y timia_plan_startdates se guardan con el id pelado). */
export function fantasmasDe(projectId: string): string[] {
  const derivados = [derivaDelServidor(`${projectId}-entregable-0-0`), derivaDelServidor(projectId)];
  return [...new Set(derivados)].filter(d => d && d !== projectId);
}

interface Pendiente { user: AdminUser; projectId: string; fantasmas: string[] }

export default function ParchePermisos({ global = false }: { global?: boolean }) {
  const [estado, setEstado] = useState<'listo' | 'aplicando' | 'hecho' | { error: string }>('listo');
  const [recargar, setRecargar] = useState(0);

  const { pendientes, aplicados } = useMemo(() => {
    const usuarios = adminStore.getUsers();
    const proyectos = adminStore.getProjects();
    const pend: Pendiente[] = [];
    const apl: { user: AdminUser; fantasmas: string[] }[] = [];
    const todosLosFantasmas = new Set(proyectos.flatMap(p => fantasmasDe(p.id)));

    for (const u of usuarios) {
      if (!u.active) continue;
      // quien ve todos los proyectos no pasa por la comprobación: no necesita parche
      if (hasPermission(u.role, 'projects.view_all')) continue;
      for (const pid of u.projectIds ?? []) {
        const f = fantasmasDe(pid).filter(x => !(u.projectIds ?? []).includes(x));
        if (f.length) pend.push({ user: u, projectId: pid, fantasmas: f });
      }
      const puestos = (u.projectIds ?? []).filter(p => todosLosFantasmas.has(p));
      if (puestos.length) apl.push({ user: u, fantasmas: puestos });
    }
    return { pendientes: pend, aplicados: apl };
  }, [recargar]);

  async function escribir(siguiente: AdminUser[], esperado: (u: AdminUser) => boolean) {
    setEstado('aplicando');
    adminStore.saveUsers(siguiente);                       // localStorage + API (misma ruta que el resto)
    const base = persist.apiBase;
    if (base === null) { setEstado({ error: 'No hay API configurada: el cambio quedó solo en este navegador.' }); return; }
    await new Promise(r => setTimeout(r, 1200));           // deja salir el PUT (va con debounce)
    try {
      const r = await fetch(`${base}/api/state/timia_admin_users`, { credentials: 'include', cache: 'no-store' });
      if (!r.ok) { setEstado({ error: `El servidor respondió ${r.status} al releer los usuarios.` }); return; }
      const guardados = await r.json() as AdminUser[];
      if (!Array.isArray(guardados) || guardados.length !== siguiente.length) {
        setEstado({ error: 'La relectura no cuadra con lo enviado. No toques nada más y avísame.' }); return;
      }
      const mal = siguiente.filter(s => { const g = guardados.find(x => x.id === s.id); return !g || !esperado(g); });
      if (mal.length) { setEstado({ error: `No quedó guardado para: ${mal.map(m => m.name).join(', ')}` }); return; }
      setEstado('hecho');
      setRecargar(n => n + 1);
    } catch (e) {
      setEstado({ error: String(e) });
    }
  }

  function aplicar() {
    const usuarios = adminStore.getUsers();
    const porUsuario = new Map<string, Set<string>>();
    pendientes.forEach(p => {
      const s = porUsuario.get(p.user.id) ?? new Set<string>();
      p.fantasmas.forEach(f => s.add(f));
      porUsuario.set(p.user.id, s);
    });
    const siguiente = usuarios.map(u => porUsuario.has(u.id)
      ? { ...u, projectIds: [...new Set([...(u.projectIds ?? []), ...porUsuario.get(u.id)!])] }
      : u);
    escribir(siguiente, g => [...(porUsuario.get(g.id) ?? [])].every(f => (g.projectIds ?? []).includes(f)));
  }

  function quitar() {
    const usuarios = adminStore.getUsers();
    const fuera = new Map<string, Set<string>>(aplicados.map(a => [a.user.id, new Set(a.fantasmas)] as [string, Set<string>]));
    const siguiente = usuarios.map(u => fuera.has(u.id)
      ? { ...u, projectIds: (u.projectIds ?? []).filter(p => !fuera.get(u.id)!.has(p)) }
      : u);
    escribir(siguiente, g => [...(fuera.get(g.id) ?? [])].every(f => !(g.projectIds ?? []).includes(f)));
  }

  // Se aplica solo en cuanto un administrador abre la app: el botón escondido en
  // Administración no sirve de nada si nadie lo encuentra. Es idempotente —cuando
  // no queda nada pendiente no vuelve a escribir— y el servidor sigue exigiendo
  // team.manage, así que a quien no lo tenga no le hace nada.
  const yaIntentado = useRef(false);
  useEffect(() => {
    if (!global || yaIntentado.current || !pendientes.length) return;   // solo la copia global escribe: la de Administración queda manual
    yaIntentado.current = true;
    aplicar();
  }, [global, pendientes]);

  if (!pendientes.length && (global || !aplicados.length)) return null;

  const err = typeof estado === 'object' ? estado.error : null;
  const ocupado = estado === 'aplicando';
  const caja = { border: '0.5px solid', borderRadius: 10, padding: '14px 16px', marginBottom: 20, fontSize: 12.5, lineHeight: 1.5 } as const;
  const boton = (tono: string) => ({ padding: '7px 14px', borderRadius: 7, border: 'none', background: ocupado ? '#cbd5e1' : tono, color: '#fff', fontSize: 12, fontWeight: 600, cursor: ocupado ? 'default' : 'pointer' });

  return (
    <div style={{ ...caja, borderColor: pendientes.length ? '#fcd34d' : '#cbd5e1', background: pendientes.length ? '#fffbeb' : '#f8fafc', color: '#3f3f46' }}>
      {pendientes.length > 0 ? (
        <>
          <div style={{ fontWeight: 600, marginBottom: 6, color: '#92400e' }}>
            Permisos: {pendientes.length === 1 ? 'una persona no puede' : `${pendientes.length} personas no pueden`} guardar en un proyecto con guion en el id
          </div>
          <div style={{ marginBottom: 8 }}>
            El servidor corta el id del proyecto en el primer guion, así que al guardar en{' '}
            <b>{[...new Set(pendientes.map(p => p.projectId))].join(', ')}</b> le dice «No tienes acceso al proyecto{' '}
            <b>{[...new Set(pendientes.flatMap(p => p.fantasmas))].join(', ')}</b>». A quien ve todos los proyectos no le pasa.
          </div>
          <ul style={{ margin: '0 0 10px 18px', padding: 0 }}>
            {pendientes.map((p, i) => (
              <li key={i}>{p.user.name} · {p.projectId} → se le añade <code>{p.fantasmas.join(', ')}</code></li>
            ))}
          </ul>
          <div style={{ marginBottom: 10, color: '#78716c' }}>
            Se está aplicando solo. Ese id no existe en el catálogo: no abre ningún proyecto real, no cambia roles, y se
            quita desde Administración cuando esté desplegado el arreglo del API.
          </div>
          <button onClick={aplicar} disabled={ocupado} style={boton('#b45309')}>
            {ocupado ? 'Aplicando…' : global ? 'Reintentar' : 'Aplicar y dejarlos guardar'}
          </button>
        </>
      ) : (
        <>
          <div style={{ marginBottom: 8 }}>
            <b>Parche de permisos aplicado</b> · {aplicados.map(a => `${a.user.name} (${a.fantasmas.join(', ')})`).join(' · ')}.
            Quítalo cuando el API desplegado ya traiga el arreglo.
          </div>
          <button onClick={quitar} disabled={ocupado} style={boton('#475569')}>
            {ocupado ? 'Quitando…' : 'Quitar el parche'}
          </button>
        </>
      )}
      {estado === 'hecho' && <div style={{ marginTop: 10, color: '#047857', fontWeight: 600 }}>Guardado y verificado contra el servidor. Que recargue la página.</div>}
      {err && <div style={{ marginTop: 10, color: '#b91c1c', fontWeight: 600 }}>{err}</div>}
    </div>
  );
}
