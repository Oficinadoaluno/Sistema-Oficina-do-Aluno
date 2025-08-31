import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Elemento #root não encontrado no DOM. A aplicação não pode ser montada.");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
