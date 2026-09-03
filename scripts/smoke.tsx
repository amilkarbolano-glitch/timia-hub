// Smoke test: monta PlanDeTrabajo y Estimaciones en jsdom con db.json + datos viejos
// y simula clicks. Uso: npm run smoke
import fs from 'fs';
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
const w: any = dom.window;
for (const k of ['window','document','HTMLElement','Node','Element','getComputedStyle','requestAnimationFrame','cancelAnimationFrame','MutationObserver','localStorage','MouseEvent','Event']) { try { (globalThis as any)[k] = w[k]; } catch {} }
Object.defineProperty(globalThis, 'navigator', { value: w.navigator, configurable: true });
w.confirm = () => true;
const db = JSON.parse(fs.readFileSync('public/db.json','utf8'));
for (const [k,v] of Object.entries(db)) if (k.startsWith('timia_')) w.localStorage.setItem(k, JSON.stringify(v));
// Restos de versiones anteriores que pueden quedar en el navegador
w.localStorage.setItem('timia_notes_FICO', JSON.stringify({ pasos:['x'] }));
w.localStorage.setItem('timia_notes_CRONOS', 'garbage{');
const errors: string[] = [];
let failed = false;
(async () => {
  const React = (await import('react')).default;
  const { createRoot } = await import('react-dom/client');
  const { act } = await import('react');
  const auth: any = await import('../src/contexts/AuthContext.tsx');
  const PlanDeTrabajo = (await import('../src/components/PlanDeTrabajo.tsx')).default;
  const Estimaciones = (await import('../src/components/Estimaciones.tsx')).default;
  const Bitacora = (await import('../src/components/Bitacora.tsx')).default;
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  console.error = (...a:any[]) => { const s = a.join(' '); if (!s.includes('act(')) errors.push('console.error: ' + s.slice(0,300)); };
  for (const acc of auth.MOCK_ACCOUNTS) {
    w.localStorage.setItem('timia_hub_user', JSON.stringify(acc));
    for (const [name, C, props] of [['Plan', PlanDeTrabajo, {}], ['Estim', Estimaciones, { onViewChange:()=>{}, onBack:()=>{} }], ['Tareas', Bitacora, {}]] as any) {
      const el = w.document.createElement('div'); w.document.body.appendChild(el);
      const root = createRoot(el, { onUncaughtError: (e:any) => errors.push('uncaught: ' + (e?.stack ?? e)), onCaughtError: (e:any) => errors.push('caught: ' + (e?.stack ?? e)) } as any);
      const click = async (label: string) => {
        const btn = Array.from(el.querySelectorAll('button')).find((b:any) => b.textContent.trim().startsWith(label));
        if (!btn) return;
        await act(async () => { (btn as any).dispatchEvent(new w.MouseEvent('click', { bubbles: true })); });
      };
      try {
        await act(async () => { root.render(React.createElement(auth.AuthProvider, null, React.createElement(C, props))); });
        for (const p of ['FICO','CRONOS','NGA','FICO','Consolidado','Input','FICO 2.0','Randómico','Principal','+ Bloqueante','+ Seleccionar tareas','Confirmar','+ Alerta','+ Seleccionar tareas','Cancelar','+ Cronograma','Nuevo cambio']) await click(p);
        const row = el.querySelector('tbody tr'); if (row) await act(async () => { row.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); });
        console.log(acc.role.padEnd(13), name, errors.length ? 'ERRORS' : 'OK', el.innerHTML.length);
      } catch (e:any) { errors.push('act: ' + e.stack); console.log(acc.role, name, 'THROW'); }
      if (errors.length) { failed = true; console.log(errors.map(e => e.split('\n').slice(0,6).join('\n')).join('\n---\n')); errors.length = 0; }
      root.unmount(); el.remove();
    }
  }
  process.exit(failed ? 1 : 0);
})();
