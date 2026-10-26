export default function ReportChart({
  title,
  rows,
  labelKey,
  valueKey = 'count',
}) {
  const maximum = Math.max(1, ...rows.map((row) => row[valueKey]));
  return (
    <figure className="panel">
      <figcaption className="mb-5 text-lg font-semibold">{title}</figcaption>
      {rows.length ? (
        <ul className="space-y-4">
          {rows.map((row) => (
            <li key={row[labelKey]}>
              <div className="mb-1 flex justify-between gap-3 text-sm">
                <span className="break-words">
                  {String(row[labelKey]).replaceAll('_', ' ')}
                </span>
                <strong>{row[valueKey]}</strong>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-stone-100"
                aria-hidden="true"
              >
                <div
                  className="h-full rounded-full bg-emerald-700"
                  style={{ width: `${(row[valueKey] / maximum) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-stone-600">
          No recruitment data for these filters.
        </p>
      )}
    </figure>
  );
}
