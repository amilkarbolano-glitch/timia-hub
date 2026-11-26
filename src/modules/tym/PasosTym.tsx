// Los pasos de un proyecto abierto: solo dos, porque no hay estimación.
// Es su propio componente y no el FlowStepper de los cerrados, que tiene tres
// fijos y no conviene tocar para esto.
import React from 'react';
import { CheckCircle2 } from 'lucide-react';

const PASOS = [
  { n: 1, label: 'Configurar proyecto' },
  { n: 2, label: 'Crear tareas' },
];

export function PasosTym({ current }: { current: 1 | 2 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 32 }}>
      {PASOS.map((paso, idx) => {
        const hecho = paso.n < current;
        const activo = paso.n === current;
        return (
          <React.Fragment key={paso.n}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: hecho ? '#15803d' : activo ? '#dc2626' : '#f1f5f9',
                border: `2px solid ${hecho ? '#15803d' : activo ? '#dc2626' : '#e2e8f0'}`,
              }}>
                {hecho
                  ? <CheckCircle2 size={16} color="#fff" fill="#15803d" strokeWidth={0}/>
                  : <span style={{ fontSize: 12, fontWeight: 700, color: activo ? '#fff' : '#94a3b8' }}>{paso.n}</span>}
              </div>
              <span style={{ fontSize: 10, fontWeight: activo ? 600 : 400, color: activo ? '#dc2626' : hecho ? '#15803d' : '#94a3b8', whiteSpace: 'nowrap' }}>
                {paso.label}
              </span>
            </div>
            {idx < PASOS.length - 1 && (
              <div style={{ width: 64, height: 2, background: hecho ? '#86efac' : '#e2e8f0', margin: '0 4px', marginBottom: 20 }}/>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/** La pastilla que marca un proyecto como abierto, donde haga falta distinguirlo. */
export function ChipTym({ pequeno = false }: { pequeno?: boolean }) {
  return (
    <span style={{
      background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
      borderRadius: 999, padding: pequeno ? '2px 8px' : '4px 11px',
      fontSize: pequeno ? 10 : 12, fontWeight: 700, whiteSpace: 'nowrap',
    }}>Abierto · T&M</span>
  );
}
