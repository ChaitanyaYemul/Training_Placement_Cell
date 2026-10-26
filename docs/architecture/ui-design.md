# VIT Pune frontend design

The presentation layer uses a predominantly white theme with sky-blue accents, navy text, pale blue surfaces, and semantic green/amber/rose status badges. The public landing page draws on the spacious composition of the supplied Superpower, Cloaked, and Pluma references. Their source code, illustrations, and product claims are not included.

The supplied VIT artwork is stored in `frontend/src/assets/vit-original.jpg`. `Brand.jsx` renders it inside an SVG viewBox that crops the surrounding whitespace without regenerating or altering the logo. The displayed institution name identifies VIT Pune; the source image retains the supplied Vishwakarma Institutes mark.

The shared header, workspace navigation, page headers, tables, filters, forms, dialogs, notices, cards, reports, and announcements use the same presentation system. The landing and authentication pages have their own responsive compositions. Narrow screens use a compact navigation grid, stacked cards, and locally scrollable tables. Native form labels, confirmation-dialog focus handling, status text, and keyboard focus indicators remain available.

Motion 14 (MIT) is a frontend-only dependency explicitly requested for the redesign. It supports React 19. `LazyMotion` loads the DOM animation feature set, while lightweight `m` components animate navigation entry, summary cards, landing content, and toast feedback. `MotionConfig reducedMotion="user"` respects operating-system preferences; a CSS media query also reduces transitions and dialog movement. Content is not withheld until a scroll animation completes.

Frontend API functions, query hooks, authentication/session handling, routes, business rules, backend source, database schemas, and stored data are unchanged. UI color mappings describe statuses; they do not grant permissions or decide eligibility. No database migration is required. The public page checks no database readiness; operational connectivity remains available through the existing health endpoints.

The public-navigation E2E assertion follows the new landing heading and checks the existing health endpoint directly rather than requiring an operational API status panel in the product page. Existing authentication, mutation, ownership, and security assertions are retained.

Executed checks and limitations are recorded in [UI verification](ui-verification.md).
