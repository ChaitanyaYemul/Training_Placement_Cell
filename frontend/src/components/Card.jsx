export default function Card({ eyebrow, title, children }) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
      {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
      <h2 className="mb-3 text-xl font-semibold tracking-tight">{title}</h2>
      <div className="leading-7 text-stone-600">{children}</div>
    </section>
  );
}
