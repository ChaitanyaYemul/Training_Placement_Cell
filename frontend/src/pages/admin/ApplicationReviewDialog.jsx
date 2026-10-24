import { useState } from 'react';
import { useApplicationMutation } from '../../hooks/useApplicationMutation.js';
import { useToast } from '../../context/toastContext.js';
import { Field } from '../../components/ui.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
export default function ApplicationReviewDialog({ application, onClose }) {
  const [status, setStatus] = useState('shortlisted');
  const [remarks, setRemarks] = useState('');
  const mutation = useApplicationMutation();
  const toast = useToast();
  return (
    <ConfirmDialog
      title={`Update application #${application.id}`}
      pending={mutation.isPending}
      error={mutation.error}
      onClose={onClose}
      onConfirm={async () => {
        try {
          await mutation.mutateAsync({
            path: `/admin/applications/${application.id}/status`,
            method: 'patch',
            body: { status, remarks },
          });
          toast('Application status recorded.');
          onClose();
        } catch {
          /* Server decides valid transitions. */
        }
      }}
    >
      <div className="space-y-4">
        <p>
          Current status: {application.status}. The server validates this
          transition and records its history.
        </p>
        <Field
          label="New application status"
          as="select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {['shortlisted', 'selected', 'rejected'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Field>
        <Field
          label="Remarks (visible to student)"
          as="textarea"
          maxLength={1000}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />
      </div>
    </ConfirmDialog>
  );
}
