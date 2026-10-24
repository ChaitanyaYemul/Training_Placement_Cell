import { useState } from 'react';
import { useApplicationMutation } from '../../hooks/useApplicationMutation.js';
import { useToast } from '../../context/toastContext.js';
import { Button } from '../../components/ui.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
export default function WithdrawControl({ application }) {
  const [confirm, setConfirm] = useState(false);
  const mutation = useApplicationMutation();
  const toast = useToast();
  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          mutation.reset();
          setConfirm(true);
        }}
      >
        Withdraw application
      </Button>
      {confirm && (
        <ConfirmDialog
          title="Withdraw this application?"
          pending={mutation.isPending}
          error={mutation.error}
          onClose={() => setConfirm(false)}
          onConfirm={async () => {
            try {
              await mutation.mutateAsync({
                path: `/applications/${application.id}/withdraw`,
                method: 'patch',
                body: {},
              });
              setConfirm(false);
              toast('Application withdrawn. You cannot reapply to this drive.');
            } catch {
              /* Keep authoritative server rejection visible. */
            }
          }}
        >
          <p>{application.driveTitle}</p>
          <p className="mt-3">
            Withdrawal is final. You cannot apply to this drive again, and your
            application history will be retained.
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}
