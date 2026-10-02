# Brand/example website development

The Next.js website in this repository is the naeil.dev portfolio, blog, and project showcase. Its auth, internationalization, hero art, and 3D scenes are product composition. UI consumers and Storybook do not require this setup.

Use Node.js 22+ and pnpm from the repository root:

```sh
pnpm install --frozen-lockfile
```

The site middleware initializes Supabase even on ordinary page requests. To run the site, create/use your own Supabase project and put its public client settings in an ignored `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

These are public browser client settings, not a service-role key. Never use a service-role/admin key as a `NEXT_PUBLIC_*` value. Do not commit `.env.local` or paste actual values into issues/chat.

Enable the Google/GitHub OAuth providers you intend to test in your Supabase project and configure the provider credentials there. Set your local site URL and allow the callback `http://localhost:3000/auth/callback` in Supabase Auth URL configuration. Official setup: https://supabase.com/docs/guides/auth/social-login and https://supabase.com/docs/guides/auth/redirect-urls. Provider credentials remain separate from UI package consumption.

```sh
pnpm dev
# http://localhost:3000 (en/ko/ja routes)
```

`src/proxy.ts` handles locale routing, session refresh, and protected-route redirects. `src/app/auth/callback/route.ts` handles the OAuth callback. The code shares cookies under `.naeil.dev` for that production domain and uses host-only cookies on localhost. Forks need to review cookie-domain and redirect policies for their own domain before deployment.

`pnpm build` builds the website, whereas `pnpm build:pkg` builds the shared package. The root layout uses `next/font/google` for JetBrains Mono; a site build may need network access to fetch it. Supabase connectivity/OAuth and production deployment must be checked separately. This guide does not configure a deployment or assert that a fork auto-deploys.

Review [asset provenance](../THIRD_PARTY_NOTICES.md) before redistributing site art. Shared UI development starts with [Storybook](../README.md#develop-the-shared-ui).
