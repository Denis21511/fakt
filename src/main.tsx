import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource-variable/manrope';
import './styles/app.css';
import { App } from './App';
import { PRESET } from './lib/presets';

if (PRESET.documentTitle) document.title = PRESET.documentTitle;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
