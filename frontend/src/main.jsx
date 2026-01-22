import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { JenkinsStatusProvider } from './context/JenkinsStatusContext.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <JenkinsStatusProvider>
      <App />
    </JenkinsStatusProvider>
  </React.StrictMode>
);
