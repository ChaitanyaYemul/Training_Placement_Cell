import { useEffect, useRef } from 'react';
import { attachCursorTrail } from '../utils/cursorTrail.js';

/** Decorative only: the native cursor, focus and pointer targets stay intact. */
export default function CursorTrail() {
  const canvas = useRef(null);
  useEffect(() => attachCursorTrail(canvas.current), []);
  return <canvas ref={canvas} className="cursor-trail" aria-hidden="true" />;
}
