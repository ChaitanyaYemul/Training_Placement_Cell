const paths = {
  dashboard: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  profile: 'M20 21v-2a7 7 0 0 0-14 0v2 M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  companies: 'M4 21V5h10v16 M14 10h6v11 M8 9h2 M8 13h2 M8 17h2 M2 21h20',
  drives: 'M9 6V3h6v3 M3 7h18v13H3z M3 12a23 23 0 0 0 18 0 M10 12v3h4v-3',
  applications: 'M8 3h8v4H8z M8 5H5v16h14V5h-3 M9 12h6 M9 16h4',
  announcements: 'M4 11v5h4l10 4V5L8 9H4z M8 16l2 5 M21 9v7',
  reports: 'M4 3v18h18 M8 16v-5 M13 16V7 M18 16v-9',
  arrow: 'M5 12h14 M13 6l6 6-6 6',
  chevron: 'M9 5l7 7-7 7',
  calendar: 'M8 2v4 M16 2v4 M3 10h18 M4 4h16v18H4z M8 14h2 M14 14h2 M8 18h2',
  check: 'M5 12l4 4L19 6',
  shield: 'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M8 12l3 3 5-6',
  spark: 'M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z',
  clock: 'M12 8v5l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  graduation: 'M2 9l10-5 10 5-10 5z M6 11v6c4 3 8 3 12 0v-6 M22 9v8',
};
export default function Icon({ name = 'arrow', size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={paths[name] || paths.arrow} />
    </svg>
  );
}
