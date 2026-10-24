import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useResourceMutation } from '../../hooks/useResource.js';
import { useToast } from '../../context/toastContext.js';
import { Button, Field } from '../../components/ui.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import DeleteAction from '../../components/DeleteAction.jsx';
export default function DriveActions({ id, row }) {
  const navigate = useNavigate();
  const toast = useToast();
  const path = `/placement-drives/${id}`;
  const [status, setStatus] = useState('published');
  const [confirm, setConfirm] = useState(false);
  const mutation = useResourceMutation([path, '/placement-drives']);
  return (
    <>
      <div className="panel mt-5 space-y-4">
        <div className="flex flex-wrap gap-4">
          <Link className="text-link" to={`/admin/drives/${id}/edit`}>
            Edit drive
          </Link>
          <Link className="text-link" to={`/admin/drives/${id}/rounds`}>
            Edit rounds & schedule
          </Link>
          <DeleteAction
            name={row.title}
            path={path}
            invalidate={['/placement-drives']}
            onDeleted={() => navigate('/admin/drives')}
          />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Field
            label="Change drive status"
            as="select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {['published', 'completed', 'cancelled', 'archived'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Field>
          <Button
            onClick={() => {
              mutation.reset();
              setConfirm(true);
            }}
          >
            Update status
          </Button>
        </div>
        <p className="text-sm text-stone-500">
          The server checks lifecycle transitions, recruitment rounds and
          publish prerequisites.
        </p>
      </div>
      {confirm && (
        <ConfirmDialog
          title={`Change status to ${status}?`}
          pending={mutation.isPending}
          error={mutation.error}
          onClose={() => setConfirm(false)}
          onConfirm={async () => {
            try {
              await mutation.mutateAsync({
                path: `${path}/status`,
                method: 'patch',
                body: { status },
              });
              setConfirm(false);
              toast('Drive status updated.');
            } catch {
              /* Preserve server error. */
            }
          }}
        >
          <p>{row.title}</p>
        </ConfirmDialog>
      )}
    </>
  );
}
