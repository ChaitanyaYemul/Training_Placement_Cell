import { useCallback, useEffect, useState } from 'react';
import CursorTrail from './CursorTrail.jsx';

// User-selected embed from Cursors-4U; the artwork is not redistributed locally.
export const SCUBA_CURSOR_STYLESHEET =
  'https://cdn.cursors-4u.net/cursors/animated/scuba-cat-cursor-set-normal-select-022ed933-64.css';

export default function CursorEffects() {
  const [catSelected, setCatSelected] = useState(false);
  const [catReady, setCatReady] = useState(false);
  const [error, setError] = useState('');
  const toggle = useCallback(() => {
    setCatSelected((selected) => !selected);
    setCatReady(false);
    setError('');
  }, []);

  useEffect(() => {
    const shortcut = (event) => {
      if (
        event.key.toLowerCase() !== 'r' ||
        !event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.repeat ||
        event.isComposing ||
        event.getModifierState('AltGraph')
      )
        return;
      event.preventDefault();
      toggle();
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, [toggle]);

  useEffect(() => {
    if (!catSelected) return;
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = SCUBA_CURSOR_STYLESHEET;
    stylesheet.referrerPolicy = 'no-referrer';
    stylesheet.dataset.scubaCursor = 'true';
    const loaded = () => setCatReady(true);
    const failed = () => {
      setCatSelected(false);
      setCatReady(false);
      setError('Scuba Cat could not load. Sky trail is still active.');
    };
    stylesheet.addEventListener('load', loaded);
    stylesheet.addEventListener('error', failed);
    document.documentElement.dataset.cursorMode = 'scuba-cat';
    document.head.append(stylesheet);
    return () => {
      stylesheet.removeEventListener('load', loaded);
      stylesheet.removeEventListener('error', failed);
      stylesheet.remove();
      delete document.documentElement.dataset.cursorMode;
    };
  }, [catSelected]);

  const label = catSelected
    ? catReady
      ? 'Scuba Cat'
      : 'Loading Scuba Cat…'
    : 'Sky trail';
  return (
    <>
      {(!catSelected || !catReady) && <CursorTrail />}
      <button
        type="button"
        className="cursor-switch"
        onClick={toggle}
        aria-label={`Cursor: ${label}. Switch cursor with Alt+R`}
        aria-keyshortcuts="Alt+R"
        aria-pressed={catSelected}
        title="Switch between Sky trail and Scuba Cat (Alt+R)"
      >
        <span aria-hidden="true">{catSelected ? '🐱' : '🦋'}</span>
        <span>Cursor: {label}</span>
        <kbd aria-hidden="true">Alt+R</kbd>
      </button>
      <span
        className="sr-only"
        role={error ? 'status' : undefined}
        aria-live="polite"
      >
        {error || `${label} cursor selected.`}
      </span>
    </>
  );
}
