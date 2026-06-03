# OpenStat Web

This is the Next.js dashboard app for OpenStat.

## Environment

Copy `.env.example` to `.env.local` for local development.

```bash
cp .env.example .env.local
```

Important deployment variables:

- `NEXT_PUBLIC_OPENSTAT_API_URL`: public backend origin used by dashboard reads, auth, and logout calls. Do not leave this as `localhost` in production.

Do not configure a dashboard API key in production web deployments. Dashboard
reads must use the signed-in Better Auth session so users only see their own
workspace.

For split deployments, set the backend env to trust the web origin:

```bash
# apps/backend
API_PUBLIC_URL=https://api.example.com
BETTER_AUTH_URL=https://api.example.com
APP_WEB_URL=https://app.example.com

# apps/web
NEXT_PUBLIC_OPENSTAT_API_URL=https://api.example.com
```

## Getting Started

First, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This app uses the same system sans stack as the HeroUI Pro finance template: `ui-sans-serif, system-ui, sans-serif`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

Deploy this app from the `apps/web` root directory.

`vercel.json` uses an ignored-build command:

```bash
node scripts/ignore-build.mjs
```

The script skips builds when a commit only changes unrelated workspace files. It
allows builds when changes touch `apps/web`, backend/API contract code,
ingestion code, shared UI/config packages, or root workspace files such as the
lockfile and `turbo.json`.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
