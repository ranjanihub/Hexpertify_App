# Hexpertify

One app on one domain: the website (Next.js) serves the three React panels and the API, using one MongoDB database.

```
apps/
  web/         Next.js website: pages, /login, NextAuth, serves the panels and the API (/api/*)
  admin/       Super Admin panel (React + Vite)       → served at /admin
  consultant/  Therapist panel (React + Vite)         → served at /consultant
  client/      Client portal (React + Vite)           → served at /client (and its deep links)
server/        REST API (Express), imported by apps/web as @backend/*
scripts/
  build-panels.mjs   builds the three panels into apps/web/public
```

Login happens on the website (`/login`). The API's login sends each role to its panel: admins to `/admin`, therapists to `/consultant`, clients to `/client`. All of them are on the same domain, so no second sign-in is needed.

## Commands (from the repo root)

| Command | What it does |
|---|---|
| `npm install` | installs every app (web, admin, consultant, client, server) |
| `npm run dev` | website + API on http://localhost:3000 (serves the last panel build) |
| `npm run dev:admin` / `dev:consultant` / `dev:client` | a panel with hot reload; its `/api` calls go to the website on :3000 |
| `npm run build:panels` | rebuilds the three panels into `apps/web/public` |
| `npm run build` | panels + website (this is what Vercel runs) |
| `npm run dev:server` | the API on its own, on port 5000 (optional) |

The panel builds (`apps/web/public/{admin,consultant,client,assets,index.html}`) are generated, not committed.

## Environment

There is one env file for the whole project: `.env` at the repo root, which is git-ignored. Copy `.env.example` to create it. Everything reads it:

- the website and its API, through `apps/web/next.config.ts`
- the standalone API (`npm run dev:server`)
- the three panels, which see only `VITE_*` variables
- the Prisma scripts (`prisma-push`, `prisma-studio`)

On Vercel, the same variable names are set in the project settings instead.

## Database

`server/src/config/database.ts` holds the one database URI; `MONGODB_URI` overrides it.

## Deploy (Vercel)

The project's Root Directory is `apps/web`, with "Include files outside the Root Directory" on. The build command is the default `npm run build`.
