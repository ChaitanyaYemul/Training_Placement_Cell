import { Link } from 'react-router-dom';
import Card from '../components/Card.jsx';
import ApiStatus from '../components/ApiStatus.jsx';
export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden rounded-3xl bg-emerald-950 p-7 text-white sm:p-12">
        <div
          aria-hidden="true"
          className="absolute -right-20 -top-28 size-96 rounded-full border border-emerald-700/50"
        />
        <div className="relative max-w-2xl">
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">
            Your next chapter starts here
          </p>
          <h1 className="text-4xl leading-tight font-semibold tracking-tight sm:text-6xl">
            From campus.
            <br />
            <span className="text-emerald-200">Towards opportunity.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-emerald-100">
            A shared space for students and the Training & Placement Cell to
            organize the journey from preparation to placement.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-emerald-950"
              to="/student/dashboard"
            >
              Explore student workspace <span aria-hidden="true">↗</span>
            </Link>
            <Link
              className="rounded-xl border border-emerald-700 px-5 py-3 text-sm font-semibold"
              to="/admin/dashboard"
            >
              Admin workspace
            </Link>
          </div>
        </div>
      </section>
      <div className="my-8 flex flex-wrap items-center gap-3 text-sm text-stone-600">
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
          Foundation preview
        </span>
        <p>
          Workspace previews only. Authentication and placement features are
          planned.
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Card eyebrow="01 / For students" title="A clearer path to placement">
          <p>
            Profile, opportunities, applications, and announcements will come
            together in your student workspace.
          </p>
          <Link
            className="mt-4 inline-block font-semibold text-emerald-900 underline underline-offset-4"
            to="/student/dashboard"
          >
            View student preview
          </Link>
        </Card>
        <Card
          eyebrow="02 / For the placement cell"
          title="One place to coordinate"
        >
          <p>
            Company records, placement drives, recruitment schedules, and
            reports will support the cell’s daily work.
          </p>
          <Link
            className="mt-4 inline-block font-semibold text-emerald-900 underline underline-offset-4"
            to="/admin/dashboard"
          >
            View admin preview
          </Link>
        </Card>
      </div>
      <div className="mt-5">
        <ApiStatus />
      </div>
    </>
  );
}
