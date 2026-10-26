import { useState } from 'react';
import { useResourceMutation } from '../../hooks/useResource.js';
import { useToast } from '../../context/toastContext.js';
import { Button, Field, FormErrors } from '../../components/ui.jsx';
const blank = { semester: 1, sgpa: '', cgpa: '', activeBacklogs: 0 };
export default function AcademicForm({ initial }) {
  const [rows, setRows] = useState(() =>
    initial.map((r) => ({
      semester: r.semester,
      sgpa: r.sgpa,
      cgpa: r.cgpa,
      activeBacklogs: r.activeBacklogs,
    })),
  );
  const [error, setError] = useState(null);
  const mutation = useResourceMutation([
    '/students/me/academic-records',
    '/placement-drives',
  ]);
  const toast = useToast();
  const update = (index, field, value) =>
    setRows(
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  async function save(event) {
    event.preventDefault();
    setError(null);
    if (new Set(rows.map((r) => Number(r.semester))).size !== rows.length) {
      setError(new Error('Each semester must be unique.'));
      return;
    }
    try {
      await mutation.mutateAsync({
        path: '/students/me/academic-records',
        method: 'put',
        body: {
          records: rows.map((r) =>
            Object.fromEntries(
              Object.entries(r).map(([key, value]) => [key, Number(value)]),
            ),
          ),
        },
      });
      toast('Academic records saved.');
    } catch {
      /* API errors remain visible. */
    }
  }
  return (
    <form className="panel space-y-5" onSubmit={save}>
      <p className="text-sm text-stone-500">
        This replaces your semester records. Removing a row here removes it when
        you save. Eligibility uses the latest semester. CGPA and SGPA use a 0–10
        scale.
      </p>
      <FormErrors error={error || mutation.error} />
      {rows.map((row, index) => (
        <fieldset
          key={index}
          disabled={mutation.isPending}
          className="min-w-0 rounded-xl border border-stone-200 p-4"
        >
          <legend>Record {index + 1}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {['semester', 'sgpa', 'cgpa', 'activeBacklogs'].map((key) => (
              <Field
                key={key}
                label={
                  {
                    semester: 'Semester',
                    sgpa: 'SGPA',
                    cgpa: 'CGPA',
                    activeBacklogs: 'Active backlogs',
                  }[key]
                }
                type="number"
                required
                min={key === 'semester' ? 1 : 0}
                max={
                  key === 'semester'
                    ? 12
                    : key === 'activeBacklogs'
                      ? 65535
                      : 10
                }
                step={['sgpa', 'cgpa'].includes(key) ? '0.01' : 1}
                value={row[key]}
                onChange={(e) => update(index, key, e.target.value)}
              />
            ))}
          </div>
          <Button
            type="button"
            variant="secondary"
            className="mt-4"
            disabled={mutation.isPending}
            onClick={() => setRows(rows.filter((_, i) => i !== index))}
          >
            Remove record {index + 1}
          </Button>
        </fieldset>
      ))}
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={rows.length >= 12 || mutation.isPending}
          onClick={() => {
            const next = Array.from({ length: 12 }, (_, i) => i + 1).find(
              (n) => !rows.some((r) => Number(r.semester) === n),
            );
            setRows([...rows, { ...blank, semester: next }]);
          }}
        >
          Add semester
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : 'Save academic records'}
        </Button>
      </div>
    </form>
  );
}
