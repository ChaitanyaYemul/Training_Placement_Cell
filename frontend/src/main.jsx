import { StrictMode } from 'react';
import { LazyMotion, domAnimation, MotionConfig } from 'motion/react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './api/queryClient.js';
import App from './App.jsx';
import './index.css';
import ToastProvider from './context/ToastProvider.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MotionConfig
        reducedMotion="user"
        transition={{ duration: 0.24, ease: 'easeOut' }}
      >
        <LazyMotion features={domAnimation} strict>
          <ToastProvider>
            <App />
          </ToastProvider>
        </LazyMotion>
      </MotionConfig>
    </QueryClientProvider>
  </StrictMode>,
);
