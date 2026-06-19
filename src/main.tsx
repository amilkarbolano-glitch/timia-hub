import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { seedFromRemote } from './lib/adminStore.ts';
import './index.css';

const root = createRoot(document.getElementById('root')!);

// Carga public/db.json y puebla localStorage ANTES de renderizar.
// Si el fetch falla (offline, red corporativa, etc.) el app arranca
// con los defaults del código — nunca se queda en blanco.
seedFromRemote().finally(() => {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
