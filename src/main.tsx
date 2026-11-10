import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './features/install'; // captura beforeinstallprompt lo antes posible
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// PWA: se puede instalar y funciona sin conexión (solo en producción).
if (import.meta.env.PROD && import.meta.env.MODE !== 'single' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
