
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './ErrorBoundary';
import { ThemeProvider } from './ThemeContext';
import { LayoutProvider } from './LayoutContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <LayoutProvider>
          <App />
        </LayoutProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>
);
