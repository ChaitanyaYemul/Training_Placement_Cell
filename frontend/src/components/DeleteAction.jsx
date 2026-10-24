import { useState } from 'react';
import { useResourceMutation } from '../hooks/useResource.js';
import { useToast } from '../context/toastContext.js';
import { Button } from './ui.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
export default function DeleteAction({ path, invalidate, name, onDeleted }) {
  const [open, setOpen] = useState(false);
  const mutation = useResourceMutation(invalidate);
  const toast = useToast();
  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          mutation.reset();
          setOpen(true);
        }}
      >
        Delete
      </Button>
      {open && (
        <ConfirmDialog
          title={`Delete ${name}?`}
          pending={mutation.isPending}
          error={mutation.error}
          onClose={() => setOpen(false)}
          onConfirm={async () => {
            try {
              const result = await mutation.mutateAsync({
                method: 'delete',
                path,
              });
              toast(
                result.warnings?.length
                  ? 'Deleted. Recruitment cleanup is pending reconciliation.'
                  : 'Deleted successfully.',
              );
              setOpen(false);
              onDeleted?.();
            } catch {
              /* Keep dialog and server error. */
            }
          }}
        >
          <p>
            This action is permanent. Referenced companies/postings and
            non-draft drives cannot be deleted. Deactivate or archive them
            instead.
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}
