import { useEffect, useRef } from 'react';
import { Button } from './ui.jsx';
export default function ConfirmDialog({
  title,
  children,
  onConfirm,
  onClose,
  pending,
  error,
}) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
          ),
        ).filter((element) => element.getClientRects().length);
        const first = controls[0],
          last = controls.at(-1);
        if (!first) {
          event.preventDefault();
          return;
        }
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
      onCancel={(e) => {
        e.preventDefault();
        if (!pending) onClose();
      }}
      className="w-[min(92vw,32rem)] rounded-2xl p-6 backdrop:bg-slate-950/40"
    >
      <h2 id="confirm-title" className="text-xl font-semibold">
        {title}
      </h2>
      <div className="my-5">{children}</div>
      {error && (
        <p role="alert" className="notice notice-error">
          {error.message}
        </p>
      )}
      <div className="flex gap-3">
        <Button disabled={pending} onClick={onConfirm}>
          {pending ? 'Saving…' : 'Confirm'}
        </Button>
        <Button variant="secondary" disabled={pending} onClick={onClose}>
          Cancel
        </Button>
      </div>
    </dialog>
  );
}
