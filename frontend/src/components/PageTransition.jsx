import { m as motion, useReducedMotion } from 'motion/react';
import { useLocation } from 'react-router-dom';
export default function PageTransition({ children, className = '' }) {
  const { pathname } = useLocation();
  const reduced = useReducedMotion();
  return (
    <motion.div
      key={pathname}
      className={className}
      initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
    >
      {children}
    </motion.div>
  );
}
