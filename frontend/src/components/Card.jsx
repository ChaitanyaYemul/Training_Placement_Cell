export default function Card({ eyebrow, title, children }) {
  return (
    <section className="content-card">
      {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
      <div className="content-card-heading">
        <h2>{title}</h2>
        <span aria-hidden="true" className="text-slate-300">
          ↗
        </span>
      </div>
      <div className="leading-7 text-slate-600">{children}</div>
    </section>
  );
}
