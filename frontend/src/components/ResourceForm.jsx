import { useState } from 'react';
import { Button, Field, FormErrors } from './ui.jsx';
import { initialValues, formBody } from '../services/forms.js';
import { institutionTimezone } from '../utils/dates.js';
export default function ResourceForm({
  fields,
  initial = {},
  branches = [],
  onSave,
  pending,
  error,
  label = 'Save changes',
}) {
  const [values, setValues] = useState(() => initialValues(fields, initial));
  const [localError, setLocalError] = useState(null);
  async function submit(e) {
    e.preventDefault();
    setLocalError(null);
    try {
      await onSave(formBody(fields, values, initial));
    } catch (failure) {
      if (!failure.status) setLocalError(failure);
    }
  }
  return (
    <form onSubmit={submit} className="panel space-y-5">
      <FormErrors error={localError || error} />
      {fields.map(
        ({
          name,
          label: title,
          type,
          choices,
          hint,
          default: _default,
          ...options
        }) => {
          void _default;
          const select = ['select', 'branch', 'branches'].includes(type);
          const items =
            type === 'select'
              ? choices.map((choice) => ({
                  id: choice,
                  name: choice.replaceAll('_', ' '),
                }))
              : branches;
          const fieldError = error?.details?.find(
            (item) => item.field === `body.${name}`,
          )?.message;
          return (
            <Field
              key={name}
              label={title}
              as={
                select
                  ? 'select'
                  : ['textarea', 'json'].includes(type)
                    ? 'textarea'
                    : 'input'
              }
              type={
                select || ['textarea', 'json'].includes(type) ? undefined : type
              }
              {...options}
              disabled={pending}
              required={
                name === 'publishedAt'
                  ? values.status === 'published'
                  : options.required
              }
              value={type === 'checkbox' ? undefined : values[name]}
              checked={type === 'checkbox' ? values[name] : undefined}
              multiple={type === 'branches'}
              error={fieldError}
              hint={
                type === 'datetime-local'
                  ? `Time in ${institutionTimezone}`
                  : hint
              }
              onChange={(e) =>
                setValues({
                  ...values,
                  [name]:
                    type === 'checkbox'
                      ? e.target.checked
                      : type === 'branches'
                        ? Array.from(e.target.selectedOptions, (o) =>
                            Number(o.value),
                          )
                        : e.target.value,
                })
              }
            >
              {select ? (
                <>
                  {type !== 'branches' && <option value="">Select…</option>}
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code ? `${item.code} — ` : ''}
                      {item.name}
                    </option>
                  ))}
                </>
              ) : undefined}
            </Field>
          );
        },
      )}
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : label}
      </Button>
    </form>
  );
}
