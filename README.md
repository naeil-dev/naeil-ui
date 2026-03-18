# @naeil/ui

Design system and component library for [naeil.dev](https://naeil.dev) — a portfolio, blog, and project showcase with cross-subdomain SSO authentication.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **UI:** React 19, Tailwind CSS v4, Radix UI
- **Language:** TypeScript (strict)
- **Auth:** Supabase Auth (OAuth via Google/GitHub)
- **i18n:** next-intl (en, ko, ja)
- **3D:** React Three Fiber (hero scene)
- **Hosting:** Vercel (Hobby)

## Prerequisites

- Node.js 22+
- pnpm

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key |

## Getting Started

```bash
pnpm install
pnpm dev
# Open http://localhost:3000
```

## Project Structure

```
src/
├── app/                  # Next.js App Router pages & API routes
│   ├── [locale]/         # Locale-prefixed pages (en/ko/ja)
│   ├── api/health/       # Health check endpoint
│   └── auth/callback/    # OAuth callback handler
├── components/           # Shared UI components
│   └── ui/               # Primitive components (button, card, etc.)
├── i18n/                 # Internationalization config & routing
├── lib/
│   ├── auth/             # Auth utilities (cookie domain, redirect, avatar, routes)
│   └── supabase/         # Supabase client (server, middleware, browser)
├── styles/               # Theme tokens & global CSS
└── proxy.ts              # Middleware (auth guard, i18n, cookie sync)
```

## Auth / SSO Architecture

The auth system enables cross-subdomain SSO between `naeil.dev` and `esg.naeil.dev`:

- OAuth flow: Login page → Supabase OAuth → `/auth/callback` → redirect to original page
- Cookie domain is set to `.naeil.dev` in production, enabling session sharing across subdomains
- Protected routes (e.g., `/sa/reports/:id`) redirect unauthenticated users to login with a `?next` param
- The middleware (`proxy.ts`) handles session refresh, route protection, i18n routing, and cookie sync

## Available Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run unit tests (Vitest) |
| `pnpm build:tokens` | Generate design tokens |
| `pnpm check:contrast` | Check color contrast ratios |

## Deployment

Auto-deploys from `main` via Vercel (Hobby plan). Push to `main` triggers a production deployment.
