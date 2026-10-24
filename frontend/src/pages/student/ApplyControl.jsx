import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApplicationMutation } from '../../hooks/useApplicationMutation.js';
import { useToast } from '../../context/toastContext.js';
import { Button } from '../../components/ui.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
export default function ApplyControl({ drive }) {
  const [confirm, setConfirm] = useState(false);
  const mutation = useApplicationMutation();
  const toast = useToast();
  const navigate = useNavigate();
  if (drive.hasApplied)
    return (
      <Link className="text-link mt-3 inline-block" to="/student/applications">
        View my applications →
      </Link>
    );
  return (
    <div className="mt-4 space-y-3">
      <Button
        disabled={
          drive.status !== 'published' || !drive.myEligibility?.eligible
        }
        onClick={() => {
          mutation.reset();
          setConfirm(true);
        }}
      >
        Apply to this drive
      </Button>
      {drive.status !== 'published' ? (
        <p>This drive is closed to new applications.</p>
      ) : !drive.myEligibility?.eligible ? (
        <p>
          <Link className="text-link" to="/student/profile">
            Review your profile and academic details
          </Link>{' '}
          before applying.
        </p>
      ) : (
        <p className="text-sm">
          Applications close at the registration deadline. You can apply once
          per drive.
        </p>
      )}
      {confirm && (
        <ConfirmDialog
          title="Submit your application?"
          pending={mutation.isPending}
          error={mutation.error}
          onClose={() => setConfirm(false)}
          onConfirm={async () => {
            try {
              const result = await mutation.mutateAsync({
                path: `/placement-drives/${drive.id}/applications`,
                method: 'post',
                body: {},
              });
              toast('Application submitted.');
              setConfirm(false);
              navigate(`/student/applications/${result.data.id}`);
            } catch {
              /* Server validation and conflicts remain visible. */
            }
          }}
        >
          <p className="mb-3">{drive.title}</p>
          <p>
            Your latest profile and academic records will be used to check
            eligibility. A withdrawn application cannot be submitted again.
          </p>
          {['PROFILE_INCOMPLETE', 'NOT_ELIGIBLE'].includes(
            mutation.error?.code,
          ) && (
            <Link className="text-link mt-3 inline-block" to="/student/profile">
              Complete my profile
            </Link>
          )}
          {mutation.error?.code === 'DUPLICATE_APPLICATION' && (
            <Link
              className="text-link mt-3 inline-block"
              to="/student/applications"
            >
              View my applications
            </Link>
          )}
        </ConfirmDialog>
      )}
    </div>
  );
}
