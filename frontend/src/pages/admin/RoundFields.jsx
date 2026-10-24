import { Button, Field } from '../../components/ui.jsx';
export default function RoundFields({
  r,
  index,
  onChange,
  onRemove,
  onMoveUp,
  pending,
}) {
  return (
    <fieldset className="rounded-xl border border-stone-200 p-4">
      <legend>Round {index + 1}</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Round name"
          required
          maxLength={120}
          value={r.roundName}
          onChange={(e) => onChange('roundName', e.target.value)}
        />
        <Field
          label="Round type"
          as="select"
          value={r.roundType}
          onChange={(e) => onChange('roundType', e.target.value)}
        >
          {[
            'screening',
            'assessment',
            'group_discussion',
            'interview',
            'hr',
            'other',
          ].map((type) => (
            <option key={type}>{type}</option>
          ))}
        </Field>
        <Field
          label="Mode"
          as="select"
          value={r.mode}
          onChange={(e) => onChange('mode', e.target.value)}
        >
          {['online', 'offline', 'hybrid'].map((mode) => (
            <option key={mode}>{mode}</option>
          ))}
        </Field>
        <Field
          label="Scheduled at (optional)"
          type="datetime-local"
          value={r.scheduledAt}
          onChange={(e) => onChange('scheduledAt', e.target.value)}
        />
        <Field
          label="Description"
          as="textarea"
          maxLength={2000}
          value={r.description}
          onChange={(e) => onChange('description', e.target.value)}
        />
        <Field
          label="Round details (JSON object)"
          as="textarea"
          value={r.details}
          onChange={(e) => onChange('details', e.target.value)}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          type="button"
          disabled={pending || index === 0}
          onClick={onMoveUp}
        >
          Move round {index + 1} up
        </Button>
        <Button
          variant="secondary"
          type="button"
          disabled={pending}
          onClick={onRemove}
        >
          Remove round {index + 1}
        </Button>
      </div>
    </fieldset>
  );
}
