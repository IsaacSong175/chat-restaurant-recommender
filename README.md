# Chat Restaurant Recommender

An MVP for a personal, chat-style restaurant recommender focused on Waterloo. Users register, log in, describe what they want in natural language or quick controls, and receive three explainable recommendations:

- Safe Pick
- Budget Pick
- Try Something Different

The backend uses a rule-based scoring engine first, then optionally asks OpenAI, Anthropic, or Qwen to turn structured scores into friendly natural-language explanations. If no API key is configured, it returns deterministic fallback explanations.

## Stack

- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express + TypeScript
- Database: Supabase Postgres via Prisma
- Auth: JWT + bcrypt
- AI: OpenAI, Anthropic, or Alibaba Qwen for explanation text only

## Run Locally

```bash
npm install
npm run dev:server
npm run dev:client
```

Server defaults to `http://localhost:4000`; client defaults to `http://localhost:5173`.

Create `server/.env` with database credentials. AI provider keys are optional:

```bash
JWT_SECRET=replace-me
DATABASE_URL=postgresql://postgres.project-ref:password@region.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:password@db.project-ref.supabase.co:5432/postgres
AI_PROVIDER=auto
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini
# or
ANTHROPIC_API_KEY=...
ANTHROPIC_MODEL=claude-3-5-haiku-latest
# or
QWEN_API_KEY=sk-...
QWEN_MODEL=qwen-plus
QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
```

`AI_PROVIDER=auto` uses the first configured key in this order: OpenAI, Anthropic, Qwen. Set `AI_PROVIDER=qwen` if you want to force Alibaba Qwen while keeping other keys available.

Before running the backend against a new database:

```bash
npm run db:migrate:deploy --workspace server
npm run db:seed --workspace server
```

## Deploy Backend On Render

If Render `Root Directory` is blank, use workspace commands:

```bash
Build Command: npm install --include=dev && npm run db:migrate:deploy --workspace server && npm run db:seed --workspace server && npm run build --workspace server
Start Command: npm run start --workspace server
```

If Render `Root Directory` is `server`, remove the workspace flags:

```bash
Build Command: npm install --include=dev && npm run db:migrate:deploy && npm run db:seed && npm run build
Start Command: npm start
```

Set these environment variables:

```bash
NODE_VERSION=22
NODE_ENV=production
CLIENT_ORIGIN=https://your-vercel-app.vercel.app
JWT_SECRET=replace-with-a-long-random-secret
DATABASE_URL=your-supabase-pooled-connection-string
DIRECT_URL=your-supabase-direct-connection-string
AI_PROVIDER=auto
```

Do not include a trailing slash in `CLIENT_ORIGIN`. Use `https://your-vercel-app.vercel.app`, not `https://your-vercel-app.vercel.app/`.

The important bit is `DATABASE_URL` and `DIRECT_URL`: Prisma uses Postgres for durable user accounts, recommendation history, and feedback learning, so Render no longer needs a persistent disk.

## MVP Notes

- Waterloo restaurant data is seeded from `server/src/data/restaurants.ts`.
- Feedback changes future scoring through cuisine, price, distance, and restaurant-specific penalties.
- The LLM never decides which restaurant wins; it only explains the rule-based result.
