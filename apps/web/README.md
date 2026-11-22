# Hexpertify - Live Panel (website, panels and API in one app)

**Version:** 0.1.0  
**Database:** the shared `hexpertify` MongoDB database

## Local Environment Setup

The website, the panels and the API are one Next.js app using one MongoDB database, defined in `server/src/config/database.ts` (`MONGODB_URI` overrides it).

### 1. Environment Configuration
- `.env.local`: local secrets (NextAuth, Google, Cloudinary, mail, payments). `MONGODB_URI` is optional.

### 2. Local Database & Prisma Setup
To initialize and push schema to your local database:

```bash
# Generate Prisma Client
npm run prisma-push

# Seed initial data
npm run prisma-seed
```

### 3. Running Development Server
Start the local server on `http://localhost:3000`:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
