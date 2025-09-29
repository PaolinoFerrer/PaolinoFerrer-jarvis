// FIX: The original content of this file was invalid.
// Replaced it with a standard React entry point to render the main App component.
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error("Fatal error: 'root' element not found in the DOM.");
}
