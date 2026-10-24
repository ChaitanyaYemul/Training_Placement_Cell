export const institutionTimezone =
  import.meta.env.VITE_INSTITUTION_TIMEZONE || 'Asia/Kolkata';
export function formatDate(value) {
  if (!value) return 'To be announced';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: institutionTimezone,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
export function toLocalInput(value) {
  if (!value) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: institutionTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value));
  const p = Object.fromEntries(
    parts.map(({ type, value: text }) => [type, text]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
export function fromLocalInput(value) {
  if (!value) return null;
  const wall = Date.parse(`${value}:00Z`);
  let instant = wall;
  for (let i = 0; i < 3; i++)
    instant += wall - Date.parse(`${toLocalInput(new Date(instant))}:00Z`);
  if (toLocalInput(new Date(instant)) !== value)
    throw new Error(
      'This local time does not exist in the institution timezone.',
    );
  return new Date(instant).toISOString().replace('.000Z', 'Z');
}
