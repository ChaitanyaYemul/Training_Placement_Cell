import RoundFields from './RoundFields.jsx';
import { useState } from 'react';
import { useResourceMutation } from '../../hooks/useResource.js';
import { useToast } from '../../context/toastContext.js';
import { Button, Field, FormErrors } from '../../components/ui.jsx';
import {
  fromLocalInput,
  institutionTimezone,
  toLocalInput,
} from '../../utils/dates.js';
const blank = {
  roundName: '',
  roundType: 'screening',
  mode: 'online',
  scheduledAt: '',
  description: '',
  details: '{}',
};
export default function RecruitmentForm({ id, initial, reload }) {
  const [rounds, setRounds] = useState(() =>
    (initial?.rounds || []).map((r) => ({
      ...r,
      originalSchedule: r.scheduledAt,
      scheduledAt: toLocalInput(r.scheduledAt),
      details: JSON.stringify(r.details || {}, null, 2),
    })),
  );
  const [documents, setDocuments] = useState(
    initial?.requiredDocuments.join('\n') || '',
  );
  const [additional, setAdditional] = useState(
    JSON.stringify(initial?.additionalRequirements || {}, null, 2),
  );
  const [version, setVersion] = useState(initial?.version);
  const [error, setError] = useState(null);
  const mutation = useResourceMutation([
    `/placement-drives/${id}`,
    `/placement-drives/${id}/rounds`,
    '/placement-drives',
  ]);
  const toast = useToast();
  const update = (index, field, value) =>
    setRounds(
      rounds.map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    );
  async function save(event) {
    event.preventDefault();
    setError(null);
    try {
      const body = {
        rounds: rounds.map((r, index) => ({
          roundNumber: index + 1,
          roundName: r.roundName,
          roundType: r.roundType,
          mode: r.mode,
          description: r.description,
          scheduledAt:
            r.originalSchedule &&
            toLocalInput(r.originalSchedule) === r.scheduledAt
              ? r.originalSchedule
              : fromLocalInput(r.scheduledAt),
          details: JSON.parse(r.details),
        })),
        requiredDocuments: documents
          .split('\n')
          .map((d) => d.trim())
          .filter(Boolean),
        additionalRequirements: JSON.parse(additional),
        ...(version === undefined ? {} : { version }),
      };
      const result = await mutation.mutateAsync({
        path: `/placement-drives/${id}/rounds`,
        method: 'put',
        body,
      });
      setVersion(result.data.version);
      toast('Recruitment plan saved.');
    } catch (failure) {
      if (!failure.status) setError(failure);
    }
  }
  return (
    <form className="panel space-y-5" onSubmit={save}>
      <FormErrors error={error || mutation.error} />
      {mutation.error?.status === 409 && (
        <Button type="button" variant="secondary" onClick={reload}>
          Fetch latest version
        </Button>
      )}
      <p className="text-sm text-stone-500">
        Times use {institutionTimezone}. Rounds are numbered in their displayed
        order. Details and additional requirements accept bounded JSON objects
        for company-specific instructions.
      </p>
      {rounds.map((r, index) => (
        <RoundFields
          key={index}
          r={r}
          index={index}
          pending={mutation.isPending}
          onChange={(field, value) => update(index, field, value)}
          onRemove={() => setRounds(rounds.filter((_, i) => i !== index))}
          onMoveUp={() =>
            setRounds(
              rounds.map((row, i) =>
                i === index - 1
                  ? rounds[index]
                  : i === index
                    ? rounds[index - 1]
                    : row,
              ),
            )
          }
        />
      ))}
      <Button
        type="button"
        variant="secondary"
        disabled={rounds.length >= 20 || mutation.isPending}
        onClick={() => setRounds([...rounds, { ...blank }])}
      >
        Add round
      </Button>
      <Field
        label="Required documents (one per line)"
        as="textarea"
        disabled={mutation.isPending}
        value={documents}
        onChange={(e) => setDocuments(e.target.value)}
      />
      <Field
        label="Additional requirements (JSON object)"
        as="textarea"
        disabled={mutation.isPending}
        value={additional}
        onChange={(e) => setAdditional(e.target.value)}
      />
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving…' : 'Save recruitment plan'}
      </Button>
    </form>
  );
}
