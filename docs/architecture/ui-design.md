# VIT Pune frontend design

The presentation layer uses a predominantly white theme with sky-blue accents, navy text, pale blue surfaces, and semantic green/amber/rose status badges. The public landing page draws on the spacious composition of the supplied Superpower, Cloaked, and Pluma references. Their source code, illustrations, and product claims are not included.

The supplied VIT artwork is stored in `frontend/src/assets/vit-original.jpg`. `Brand.jsx` renders it inside an SVG viewBox that crops the surrounding whitespace without regenerating or altering the logo. The displayed institution name identifies VIT Pune; the source image retains the supplied Vishwakarma Institutes mark.

The shared header, workspace navigation, page headers, tables, filters, forms, dialogs, notices, cards, reports, and announcements use the same presentation system. The landing and authentication pages have their own responsive compositions. Narrow screens use a compact navigation grid, stacked cards, and locally scrollable tables. Native form labels, confirmation-dialog focus handling, status text, and keyboard focus indicators remain available.

Motion 14 (MIT) is a frontend-only dependency explicitly requested for the redesign. It supports React 19. `LazyMotion` loads the DOM animation feature set, while lightweight `m` components animate navigation entry, summary cards, landing content, and toast feedback. `MotionConfig reducedMotion="user"` respects operating-system preferences; a CSS media query also reduces transitions and dialog movement. Content is not withheld until a scroll animation completes.

Frontend API functions, query hooks, authentication/session handling, routes, business rules, backend source, database schemas, and stored data are unchanged. UI color mappings describe statuses; they do not grant permissions or decide eligibility. No database migration is required. The public page checks no database readiness; operational connectivity remains available through the existing health endpoints.

The public-navigation E2E assertion follows the new landing heading and checks the existing health endpoint directly rather than requiring an operational API status panel in the product page. Existing authentication, mutation, ownership, and security assertions are retained.

Executed checks and limitations are recorded in [UI verification](ui-verification.md).

## Sky-blue cursor trail

The House of Dreamers cursor reference supplied through Awwwards inspired a soft, translucent sky-blue smoke trail and at most three small butterflies. The portal uses its own Canvas 2D particle rendering and original vector wing shapes, with no borrowed source/assets or new dependency. This is a lightweight visual approximation rather than a full WebGL fluid simulation.

`CursorTrail.jsx` mounts one decorative, aria-hidden canvas in the shared layout. Its renderer and artwork live in `utils/cursorTrail.js` and `utils/cursorArtwork.js`. The native cursor remains visible and the canvas has `pointer-events: none`. Input/select/textarea fields, editable content and dialogs clear the effect. Touch/coarse-pointer devices and reduced-motion users do not initialize the renderer; preference changes disable it immediately.

The renderer caps smoke at 80 puffs, butterflies at three, backing-store pixel ratio at 1.5, and drawing at no more than 45 frames per second. It schedules frames only while decoration remains visible, clears on blur/hidden pages, and removes listeners and pending frames on unmount. Particle data stays outside React state. No API requests or database changes are involved.

## Cursor switching

`CursorEffects.jsx` adds an Alt+R shortcut and an equivalent footer button. Sky trail is the default. Scuba Cat mode loads the exact user-supplied stylesheet from `cdn.cursors-4u.net`; once ready it unmounts the smoke/butterfly scene. Switching back removes the stylesheet and its HTML marker and restores the trail. The choice survives client-side navigation and resets on page refresh. Key repeats, composition, AltGraph and unrelated modifier combinations do not toggle the mode.

The Scuba Cat artwork is provided by maisita through [Cursors-4U](https://www.cursors-4u.com/cursor/scuba-cat-normal-select), whose page labels it Personal Use Only. The original stylesheet remains hosted by its provider rather than being redistributed in this repository. The embed is requested without a referrer and only after selecting it. Its animated cursor frames are embedded WebP images inside the stylesheet. Text-editing controls retain a text cursor; reduced-motion mode pauses the cursor animation. If the stylesheet cannot load, the app keeps Sky trail and announces the failure. The supplied Nginx CSP permits this specific stylesheet CDN; no external script permission was added.

## Notification timing

Notifications remain visible for three seconds, then fade out over 200 milliseconds. Each new notification, including a repeated message, restarts the timer. Manual dismissal remains available. Timers are cleared on replacement and unmount; reduced-motion users receive immediate dismissal without animation.
