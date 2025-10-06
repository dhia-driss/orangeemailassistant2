## Goal
Help developers implement and modify features in the Orange Email Assistant Next.js app. Focus on the app architecture, API routes, auth flow, and UI component patterns used across the repo.

## Big picture
- This is a Next.js 15 app (app-router) written in TypeScript + React 19. Key folders:
  - `app/` — routes, server components and pages. Examples: `app/layout.tsx`, `app/page.tsx`, `app/dashboard/page.tsx`.
  - `app/api/` — server API routes using Next.js route handlers. Examples: `app/api/auth/[...nextauth]/route.ts` (NextAuth), `app/api/emails/routes.ts` (Gmail integration).
  - `components/` and `components/ui/` — shared UI atoms and composed components. Follow existing prop patterns and CSS class utilities.
  - `hooks/` and `lib/` — small utilities and hooks (e.g. `use-mobile`, `use-toast`, `lib/utils.ts`).

## Authentication & external APIs
- Authentication uses `next-auth` with `GoogleProvider` in `app/api/auth/[...nextauth]/route.ts`. The JWT callback persists `accessToken` and `refreshToken` onto the session (see `jwt` and `session` callbacks).
- Emails API (`app/api/emails/routes.ts`) expects a server session via `getServerSession()` and reads `(session as any).accessToken` to call Google Gmail API via `googleapis`.
- When changing auth scopes or token handling, update both `[...]nextauth/route.ts` and any server routes that read `session.accessToken`.

## Patterns and conventions
- App uses app-router server components by default. Components under `components/` are React components but may be used in server or client contexts; prefer adding `'use client'` at the top for client-only behavior.
- Styling: global CSS in `app/globals.css` and component-level CSS via class names. External Boosted CSS is included in `app/layout.tsx` via CDN; do not remove unless replacing intentionally.
- Images: `next.config.mjs` sets `images.unoptimized = true`. Image optimization is disabled — use plain <img> or Next/Image without optimization assumptions.
- Typescript/ESLint: Builds ignore type and lint errors per `next.config.mjs` — be cautious when adding new types but follow existing typings.

## Developer workflows (how to run and debug)
- Basic scripts (from `package.json`):
  - `pnpm dev` or `npm run dev` — start Next.js dev server (runs `next dev`).
  - `pnpm build` / `npm run build` — production build (`next build`).
  - `pnpm start` — start built app (`next start`).
- Environment variables: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are required for auth (see `app/api/auth/[...nextauth]/route.ts`). Use `.env.local` with these keys.
- Debugging server routes: add console logs in `app/api/*` routes or run the dev server and use browser devtools + Network tab to inspect requests.

## Common edits and examples
- Adding a new API route: create a file in `app/api/<name>/route.ts` and export `GET`, `POST`, etc. Use `NextResponse` for responses (see `app/api/emails/routes.ts`).
- Reading the session in server routes: use `getServerSession()` and then cast to `any` to access `accessToken` (current pattern). Example: `const session = await getServerSession(); const accessToken = (session as any).accessToken;`.
- Gmail usage: the `googleapis` client is instantiated with an OAuth2 client and `oauth2Client.setCredentials({ access_token: accessToken })`. Requests use `gmail.users.messages.list` and `gmail.users.messages.get` (see `app/api/emails/routes.ts`). Keep `format: 'metadata'` if you only need headers/snippet for listing.

## Project-specific caveats
- The project deliberately ignores TypeScript and ESLint build errors (see `next.config.mjs`), so CI or later enforcement may catch issues not visible locally.
- The session `accessToken` is stored on the NextAuth JWT and surfaced to the session object; tokens may expire. Refresh handling is not implemented in `app/api/emails/routes.ts` — if you add refreshing, update both JWT callback and server routes.
- Many UI components rely on Radix primitives and the design system under `components/ui/`. Follow existing prop patterns and avoid introducing new global CSS selectors.

## Files to inspect when changing behavior
- Auth: `app/api/auth/[...nextauth]/route.ts`
- Email fetching: `app/api/emails/routes.ts`
- Layout / providers: `app/layout.tsx`, `app/providers.tsx` (session provider is wrapped there)
- Components: `components/` and `components/ui/` for UI patterns
- Utilities: `hooks/` and `lib/utils.ts`

## Suggested prompts for code edits
- "Add token refresh to NextAuth JWT callback and ensure server routes use refreshed token" — check `app/api/auth/[...nextauth]/route.ts` and `app/api/emails/routes.ts`.
- "Create a new API route that returns email content by message id" — add `app/api/emails/[id]/route.ts`, use `gmail.users.messages.get({ id, format: 'full' })` and respect auth via `getServerSession()`.

## When you're unsure
- Prefer small, local changes and run the dev server (`pnpm dev`). Test the change by hitting the local route in browser or with curl.
- If you need to change core config (Next.js, Tailwind), open `next.config.mjs` and `postcss.config.mjs` first; consult `package.json` scripts.

---
If any section is unclear or you'd like more examples (for example, token refresh code or an example API route), tell me which area to expand.
