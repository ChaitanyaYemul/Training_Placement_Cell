import { expect, it } from 'vitest';
import { fromLocalInput, toLocalInput, formatDate } from './dates.js';
import { formBody } from '../services/forms.js';
it('uses the institution timezone rather than the browser timezone and preserves SQL second precision', () => {
  expect(toLocalInput('2030-01-01T18:30:00Z')).toBe('2030-01-02T00:00');
  expect(fromLocalInput('2030-01-02T00:00')).toBe('2030-01-01T18:30:00Z');
  expect(fromLocalInput('')).toBeNull();
  expect(formatDate(null)).toBe('To be announced');
});
it('preserves unchanged server timestamps when editing a different drive field', () => {
  const original = { registrationDeadline: '2030-01-01T18:29:59Z' };
  expect(
    formBody(
      [{ name: 'registrationDeadline', type: 'datetime-local' }],
      { registrationDeadline: toLocalInput(original.registrationDeadline) },
      original,
    ),
  ).toEqual(original);
});
