import { useState } from 'react';
import { ToastContext } from './toastContext.js';
export default function ToastProvider({ children }) {
  const [message, setMessage] = useState('');
  return (
    <ToastContext.Provider value={setMessage}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className={
          message
            ? 'fixed bottom-5 right-5 z-50 max-w-[90vw] rounded-xl bg-emerald-950 p-4 text-white shadow-lg'
            : 'sr-only'
        }
      >
        {message}
        {message && (
          <button
            className="ml-5 underline"
            aria-label="Dismiss notification"
            onClick={() => setMessage('')}
          >
            Dismiss
          </button>
        )}
      </div>
    </ToastContext.Provider>
  );
}
