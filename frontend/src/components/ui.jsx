import { useId } from 'react';
export function Button({ variant = 'primary', className = '', ...props }) {
  return (
    <button
      className={`button ${variant === 'primary' ? 'button-primary' : 'button-secondary'} ${className}`}
      {...props}
    />
  );
}
export function Field({
  label,
  error,
  hint,
  children,
  as: Tag = 'input',
  ...input
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <Tag
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? `${id}-help` : undefined}
        {...input}
      >
        {children}
      </Tag>
      {(error || hint) && (
        <span
          id={`${id}-help`}
          className={error ? 'text-red-800' : 'text-slate-500'}
        >
          {error || hint}
        </span>
      )}
    </div>
  );
}
export function PageHeader({ title, description, children }) {
  return (
    <div className="page-header">
      <div>
        <span className="page-header-label">
          VIT PUNE / TRAINING & PLACEMENT
        </span>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children}
    </div>
  );
}
export function StatusBadge({ children }) {
  const value = String(children).toLowerCase();
  const tone = ['selected', 'published', 'active', 'completed'].includes(value)
    ? 'green'
    : ['shortlisted', 'important', 'pinned'].includes(value)
      ? 'amber'
      : ['rejected', 'cancelled', 'urgent'].includes(value)
        ? 'rose'
        : ['draft', 'archived', 'inactive', 'withdrawn'].includes(value)
          ? 'slate'
          : 'blue';
  return (
    <span className={`status-badge status-${tone}`}>
      {String(children).replaceAll('_', ' ')}
    </span>
  );
}
export function ErrorState({ error, retry }) {
  return (
    <div role="alert" className="notice notice-error">
      <p>{error?.message || 'Something went wrong.'}</p>
      {retry && (
        <Button variant="secondary" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  );
}
export function QueryState({ query, children, empty = false }) {
  if (query.isPending)
    return (
      <p role="status" className="notice">
        Loading…
      </p>
    );
  if (query.isError && query.data === undefined)
    return <ErrorState error={query.error} retry={() => query.refetch()} />;
  return (
    <>
      {query.isError && (
        <ErrorState error={query.error} retry={() => query.refetch()} />
      )}
      {empty ? (
        <p role="status" className="notice">
          No records found.
        </p>
      ) : (
        children
      )}
    </>
  );
}
export function FormErrors({ error }) {
  if (!error) return null;
  return (
    <div role="alert" className="notice notice-error">
      <p>{error.message}</p>
      {error.details?.map((item, i) => (
        <p key={i}>
          {item.field}: {item.message}
        </p>
      ))}
    </div>
  );
}
export function Pagination({ meta, onPage }) {
  if (!meta) return null;
  return (
    <div className="pagination-bar">
      <span>
        {meta.total} records · Page {meta.page} of{' '}
        {Math.max(1, meta.totalPages)}
      </span>
      <Button
        variant="secondary"
        disabled={meta.page <= 1}
        onClick={() => onPage(meta.page - 1)}
      >
        Previous
      </Button>
      <Button
        variant="secondary"
        disabled={meta.page >= meta.totalPages}
        onClick={() => onPage(meta.page + 1)}
      >
        Next
      </Button>
    </div>
  );
}
