import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import WorkbenchApp from './app/WorkbenchApp.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WorkbenchApp />
  </StrictMode>,
);
