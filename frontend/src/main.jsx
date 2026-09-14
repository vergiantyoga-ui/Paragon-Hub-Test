import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { AppStoreProvider } from './store/AppStore.jsx';
import { QuestionnaireStoreProvider } from './questionnaire/store/QuestionnaireStore.jsx';
import { ToastProvider } from './components/ui/Toast.jsx';
import { ThemeProvider } from './store/ThemeContext.jsx';
import { LanguageProvider } from './i18n/LanguageContext.jsx';
import './styles/global.css';
import './styles/patterns.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <ThemeProvider>
          <AppStoreProvider>
            <QuestionnaireStoreProvider>
              <ToastProvider>
                {/* Menangkap galat render agar tidak berujung layar kosong. */}
                <ErrorBoundary>
                  <App />
                </ErrorBoundary>
              </ToastProvider>
            </QuestionnaireStoreProvider>
          </AppStoreProvider>
        </ThemeProvider>
      </LanguageProvider>
    </BrowserRouter>
  </StrictMode>,
);
