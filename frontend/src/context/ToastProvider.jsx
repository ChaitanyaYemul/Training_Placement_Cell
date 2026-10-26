import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, m as motion, useReducedMotion } from 'motion/react';
import { ToastContext } from './toastContext.js';
export default function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const reducedMotion = useReducedMotion();
  const notify = useCallback(
    (message) => setToast(message ? { message } : null),
    [],
  );
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timeout);
  }, [toast]);
  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div role="status" aria-live="polite">
        <AnimatePresence>
          {toast && (
            <motion.div
              key="notification"
              initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
              transition={{ duration: reducedMotion ? 0 : 0.2 }}
              className="toast-message"
            >
              {toast.message}
              <button
                className="ml-5 underline"
                aria-label="Dismiss notification"
                onClick={() => setToast(null)}
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
