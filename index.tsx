
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { HashRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ViewProvider } from './contexts/ViewContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AIAssistantProvider } from './contexts/AIAssistantContext';
import { AppSettingsProvider } from './contexts/AppSettingsContext';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <ViewProvider>
          <ThemeProvider>
            <AppSettingsProvider>
              <AIAssistantProvider>
                <App />
              </AIAssistantProvider>
            </AppSettingsProvider>
          </ThemeProvider>
        </ViewProvider>
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
);
