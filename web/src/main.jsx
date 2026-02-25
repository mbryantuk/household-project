import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { reportWebVitals } from './reportWebVitals.js';
import './i18n/config';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();

// Item 159: Unregister Service Worker during remediation to avoid cache issues
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (let registration of registrations) {
      registration.unregister();
    }
  });
}
