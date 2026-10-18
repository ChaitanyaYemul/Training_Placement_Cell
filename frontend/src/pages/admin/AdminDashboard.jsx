import Card from '../../components/Card.jsx';
export default function AdminDashboard() {
  return (
    <>
      <p className="eyebrow mb-4">admin / Preview</p>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Admin workspace
      </h1>
      <p className="mt-3 text-stone-600">
        A foundation for a well-organized placement season.
      </p>
      <p className="my-7 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        Public layout preview. This is not an authenticated dashboard. No
        personal or administrative data is available.
      </p>
      <div className="grid gap-5 md:grid-cols-3">
        <Card title="Companies & drives">
          <p>Company records and placement-drive management.</p>
          <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-stone-500">
            Not implemented yet
          </p>
        </Card>
        <Card title="Recruitment planning">
          <p>Rounds, schedules, and document checklists.</p>
          <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-stone-500">
            Not implemented yet
          </p>
        </Card>
        <Card title="Applications & reports">
          <p>Selection statuses and placement summaries.</p>
          <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-stone-500">
            Not implemented yet
          </p>
        </Card>
      </div>
    </>
  );
}
