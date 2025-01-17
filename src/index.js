import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';  // Make sure this is at the top to apply Tailwind styles
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
