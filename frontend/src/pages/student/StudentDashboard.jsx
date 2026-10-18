import Card from '../../components/Card.jsx';
export default function StudentDashboard() {
  return (
    <>
      <p className="eyebrow mb-4">student / Preview</p>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Student workspace
      </h1>
      <p className="mt-3 text-stone-600">
        Your placement journey, in one place.
      </p>
      <p className="my-7 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        Public layout preview. This is not an authenticated dashboard. No
        personal or administrative data is available.
      </p>
      <div className="grid gap-5 md:grid-cols-3">
        <Card title="Your profile">
          <p>Academic records and profile details.</p>
          <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-stone-500">
            Not implemented yet
          </p>
        </Card>
        <Card title="Placement opportunities">
          <p>Companies, drives, and eligibility.</p>
          <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-stone-500">
            Not implemented yet
          </p>
        </Card>
        <Card title="Your applications">
          <p>Application status and history.</p>
          <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-stone-500">
            Not implemented yet
          </p>
        </Card>
      </div>
    </>
  );
}
