import { Link } from 'react-router-dom';
export default function NotFoundPage() {
  return (
    <>
      <p className="eyebrow mb-4">404</p>
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <Link to="/" className="mt-5 inline-block font-semibold underline">
        Return to overview
      </Link>
    </>
  );
}
