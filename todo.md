# Rebuilding Hearthstone: The "Greenfield" Wishlist

If we were to restart the **Hearthstone** project from scratch today, this is the comprehensive roadmap of architectural, functional, and experiential improvements we would implement.

## 🏗️ Architecture & Core Stack (The Foundation)

1.  **Strict TypeScript Everywhere:** Abandon `.js/.jsx`. Enforce strict type safety on both Backend and Frontend to eliminate `undefined` errors and improve refactoring confidence.
2.  **Monorepo Structure:** Use **Turborepo** or **Nx** to manage `server`, `web`, and `shared-types` packages efficiently, rather than nested folders.
3.  **ORM Adoption:** Replace raw SQL strings with **Drizzle ORM** or **Prisma**. This prevents SQL injection by design and makes schema migrations type-safe.
4.  **Type-Safe APIs:** Implement **tRPC** or **Hono RPC**. This allows the Frontend to "import" the Backend API types, ensuring that if the API changes, the Frontend build fails immediately.
5.  **Single-Database Multi-Tenancy:** Move from "File-per-Household" (SQLite files) to a single **PostgreSQL** instance with **Row Level Security (RLS)**. This simplifies backups, migrations, and cross-household analytics while maintaining isolation.
6.  **Validation Library:** Use **Zod** for all input validation (API requests, forms, env vars) to ensure data integrity at the edges.
7.  **Environment Configuration:** Use `t3-env` to strictly validate environment variables at build/runtime.
8.  **Job Queue:** Implement **BullMQ** (Redis) for background tasks (emails, backups, nightly chores) instead of fragile `node-cron` in the main process.
9.  **File Storage:** Abstract file storage (uploads, avatars) to an S3-compatible interface (MinIO for local, AWS for prod) instead of local disk writes.
10. **Logging Standard:** Replace `console.log` with **Pino** or **Winston** for structured JSON logging, ready for ingestion by observability tools.

## 🎨 Frontend & UI/UX (The Experience)

11. **Next.js or TanStack Router:** Move away from client-side `react-router-dom` to a framework that supports Server Side Rendering (SSR) or robust file-based routing for better SEO and initial load performance.
12. **Server State Management:** Go "All In" on **TanStack Query (React Query)**. Remove manual `useEffect` data fetching completely.
13. **Client State Management:** Use **Zustand** for global client state (sidebar toggle, theme preference) instead of heavy Context Providers.
14. **Design Tokens First:** Define all colors, spacing, and typography in a primitive `tokens.ts` file or CSS variables before building components.
15. **Tailwind CSS:** Adopt **Tailwind** for layout and spacing utilities, even if using a component library, to speed up responsive tweaks.
16. **Headless UI Components:** Use **Radix UI** or **Aria-Kit** for accessible primitives (Dialogs, Dropdowns) and style them ourselves, rather than fighting styled-component overrides.
17. **Skeleton Loading:** Replace spinning circles with **Skeleton screens** that mimic the layout of the data loading (e.g., table rows, card grids) for perceived performance.
18. **Optimistic UI:** Implement optimistic updates for all interactions (e.g., checking off a shopping item immediately reflects in UI before server confirms).
19. **Form Handling:** Standardize on **React Hook Form** + **Zod Resolver** for all complex forms (Settings, Wizards).
20. **Toast System:** Use **Sonner** for toast notifications—it’s lighter, prettier, and swipeable.
21. **Command Palette:** Implement `cmdk` (Command K) for global navigation and quick actions (e.g., "Add Expense", "Go to Settings").
22. **Mobile Gestures:** Add swipe-to-delete for list items (Shopping, Chores) on mobile views.
23. **Virtualization:** Use **TanStack Virtual** for long lists (Shopping History, Audit Logs) to keep the DOM light.
24. **Image Optimization:** Use a specialized image component to lazy-load and serve optimized formats (WebP/AVIF) for user avatars and assets.
25. **Error Boundaries:** granular Error Boundaries around *every* widget so one crash doesn't take down the dashboard.

## ♿ Accessibility (a11y) (The Inclusion)

26. **Semantic HTML:** Strict code review enforcement for `<main>`, `<article>`, `<nav>`, `<aside>` usage over generic `<div>`.
27. **Focus Management:** Ensure focus traps are correctly implemented in all Modals and Drawers.
28. **Keyboard Navigation:** Full support for `Tab`, `Arrow` keys, `Esc`, and `Enter` across all interactive elements (Menus, Grids).
29. **Screen Reader Testing:** Mandatory manual testing with NVDA or VoiceOver for core flows.
30. **ARIA Labels:** Audit all "Icon-only" buttons (like "Edit", "Delete") to ensure they have `aria-label` or `sr-only` text.
31. **Color Contrast:** automated CI check using `pa11y` to ensure text meets WCAG AA standards in both Light and Dark modes.
32. **Reduced Motion:** Respect `prefers-reduced-motion` media query for animations (sidebar slide-ins, modal popups).
33. **Font Scaling:** Ensure layout doesn't break when users increase root font size (using `rem` instead of `px` everywhere).
34. **Skip Links:** Add a "Skip to Content" link at the top of the DOM for keyboard users.
35. **Status Announcements:** Use `aria-live` regions for dynamic updates (e.g., "Notification received", "Item added").

## 🌍 Internationalization (i18n) & Localization (The Reach)

36. **i18n Framework:** Integrate **i18next** or **lingui** from the start. No hardcoded strings in JSX.
37. **Translation Keys:** Use structured keys (e.g., `dashboard.welcome.greeting`) instead of natural language keys.
38. **Date/Time Formatting:** Use `Intl.DateTimeFormat` exclusively. Stop manually slicing date strings.
39. **Currency Handling:** Store amounts in smallest integer units (cents/pence) and format using `Intl.NumberFormat` based on the Household's locale setting.
40. **RTL Support:** Ensure layout logic (margins, padding, flex direction) supports Right-to-Left languages (Arabic, Hebrew) using logical properties (`margin-inline-start`).
41. **Pluralization:** Handle complex plural rules (e.g., "0 items", "1 item", "2 items") via the i18n library.
42. **Locale Routing:** Support `/en-US/dashboard`, `/fr/dashboard` URL structures for SEO and shareability.

## 🛠️ DevOps & Quality Assurance (The Operations)

43. **Containerization Strategy:** Multi-stage Docker builds to keep production images tiny (Alpine/Distroless).
44. **CI/CD Pipeline:** GitHub Actions for "Lint, Test, Build, Publish" on every push. No more local deployment scripts.
45. **Infrastructure as Code (IaC):** Use **Terraform** or **Pulumi** to define cloud resources (if moving to cloud) or local Docker Compose configurations.
46. **E2E Testing:** Keep Playwright, but run it against a dedicated ephemeral environment, not the local dev instance.
47. **Visual Regression:** Implement **Percy** or **Chromatic** to catch UI regressions (e.g., "The button moved 2px").
48. **Database Seeding:** Create a robust, deterministic seeder using **Faker.js** for reliable local dev environments.
49. **Secrets Management:** Use **Doppler** or **Infisical** for managing secrets across dev/prod, rather than `.env` files.
50. **Dependency Management:** Use **Renovate** or **Dependabot** to keep packages updated automatically.

## 🔐 Security & Auth

51. **Auth Provider:** Evaluate **Auth.js (NextAuth)** or **Clerk** to offload complexity of MFA, Passkeys, and Session management.
52. **CSP Headers:** Strict Content Security Policy (CSP) implementation.
53. **Rate Limiting:** Redis-based rate limiting middleware for all API routes.
54. **Audit Logging:** Immutable audit log table for all sensitive actions (Login, Delete, Export).
55. **Encryption at Rest:** Ensure database volume encryption (LUKS) or field-level encryption for PII.

## 📱 Mobile & PWA

56. **Service Worker:** Implement a custom Service Worker for "Offline-First" capabilities (read-only access to cached data).
57. **Push Notifications:** Web Push API integration for server-side alerts (e.g., "Bill Due").
58. **Installability:** Proper `manifest.json` with screenshots and shortcuts for a rich install experience.
59. **Haptic Feedback:** Use `navigator.vibrate` for tactile feedback on mobile interactions (success/error).

## 🧩 Feature specifics

60. **Budgeting:** Implement "Envelope Budgeting" logic (Zero-based budgeting) as a core option.
61. **Scanning:** Add OCR (Tesseract.js) to scan receipts and auto-fill expenses.
62. **Inventory:** Add Barcode scanning via camera for pantry/asset tracking.
63. **Calendar:** Two-way sync with Google/Outlook/Apple Calendars (CalDAV).
64. **Chores:** "Gamification" points system with a leaderboard and rewards shop.
65. **Meal Planning:** Auto-generate shopping lists based on selected recipes and current pantry inventory.
66. **Vehicles:** VIN lookup integration to auto-populate vehicle details.
67. **Pets:** Vet record storage and vaccination reminder timeline.

## 🧹 Code Quality

68. **Linting:** Standardize on **ESLint** (strict config) + **Prettier**.
69. **Commit Hooks:** **Husky** + **Lint-Staged** to prevent bad commits.
70. **Naming Conventions:** Enforce strictly typed naming (e.g., `use[Feature]`, `handle[Event]`).
71. **Dead Code Elimination:** Regular usage of **Knip** to find unused exports and dependencies.

## 📊 Analytics

72. **Self-Hosted Analytics:** Integrate **PostHog** or **Plausible** (self-hosted) for usage tracking without privacy invasion.
73. **Performance Monitoring:** **Sentry** integration for Frontend/Backend crash reporting.

## 🧪 Experimentation

74. **Feature Flags:** Implement a simple Feature Flag system to rollout changes safely.
75. **A/B Testing:** Infrastructure to test different UI layouts.

## 📝 Documentation

76. **Storybook:** Maintain a living UI component library documentation.
77. **OpenAPI / Swagger:** Auto-generated API documentation from Zod schemas / TRPC routers.
78. **Architecture Decision Records (ADRs):** Document *why* changes are made in the repo.

## 🔄 Data Lifecycle

79. **Soft Deletes:** Implement `deleted_at` columns for key entities to allow recovery.
80. **Data Retention Policies:** Automated cleanup of old logs/notifications.
81. **Export/Import:** Full JSON/CSV export capability for user data portability.

## 🤝 Community

82. **Contribution Guide:** Detailed `CONTRIBUTING.md` for open source developers.
83. **License:** Clear Open Source license (MIT/AGPL).

---
*Generated by Gemini CLI - 2026-02-22*
