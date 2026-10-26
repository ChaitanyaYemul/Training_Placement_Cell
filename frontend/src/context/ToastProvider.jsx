import { useState } from 'react';
import { m as motion } from 'motion/react';
import { ToastContext } from './toastContext.js';
export default function ToastProvider({ children }) {
  const [message, setMessage] = useState('');
  return (
    <ToastContext.Provider value={setMessage}>
      {children}
      <motion.div
        animate={{ opacity: message ? 1 : 0, y: message ? 0 : 8 }}
        role="status"
        aria-live="polite"
        className={message ? 'toast-message' : 'sr-only'}
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
      </motion.div>
    </ToastContext.Provider>
  );
}
