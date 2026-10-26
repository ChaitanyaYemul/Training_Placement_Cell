import originalLogo from '../assets/vit-original.jpg';
// The viewBox crops surrounding whitespace without changing the supplied artwork.
export function VitLogo({ className = '' }) {
  return (
    <svg
      viewBox="194 141 350 452"
      className={className}
      role="img"
      aria-label="Vishwakarma Institutes logo"
    >
      <image href={originalLogo} width="736" height="736" />
    </svg>
  );
}
export default function Brand() {
  return (
    <span className="brand-lockup">
      <VitLogo className="brand-logo" />
      <span className="brand-copy">
        <strong>
          VIT <span>Placement Cell</span>
        </strong>
        <small>Vishwakarma Institute of Technology, Pune</small>
      </span>
    </span>
  );
}
