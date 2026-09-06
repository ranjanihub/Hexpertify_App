# Hexpertify - Live Panel (Local Isolated Setup)

**Version:** 0.1.0  
**Environment:** Local Development (`hexpertify_local` Database)

## Local Environment Setup

This workspace is fully disconnected from live production hosts (`hexpertify.com`) and live databases (`cluster0.kp0ce.mongodb.net`). It operates as an independent local repository with its own cloned local database (`hexpertify_local`).

### 1. Environment Configuration
- `.env.local`: Configured for local development (`DATABASE_URL="mongodb://127.0.0.1:27017/hexpertify_local"`).
- `.env.production`: Preserved for production reference (ignored by git).

### 2. Local Database & Prisma Setup
To initialize and push schema to your local database:

```bash
# Generate Prisma Client
npm run prisma-push

# Seed initial data into hexpertify_local
npm run prisma-seed
```

### 3. Running Development Server
Start the local server on `http://localhost:3000`:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
