# Chat Restaurant Recommender

An MVP for a personal, chat-style restaurant recommender focused on Waterloo. Users register, log in, describe what they want in natural language or quick controls, and receive three explainable recommendations:

- Safe Pick
- Budget Pick
- Try Something Different

The backend uses a rule-based scoring engine first, then optionally asks OpenAI, Anthropic, or Qwen to turn structured scores into friendly natural-language explanations. If no API key is configured, it returns deterministic fallback explanations.

## Stack

- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express + TypeScript
- Database: SQLite
- Auth: JWT + bcrypt
- AI: OpenAI, Anthropic, or Alibaba Qwen for explanation text only

## Run Locally

```bash
npm install
npm run dev:server
npm run dev:client
```

Server defaults to `http://localhost:4000`; client defaults to `http://localhost:5173`.

Create `server/.env` if you want AI explanations:

```bash
JWT_SECRET=replace-me
DATABASE_PATH=./data/app.db
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

## Deploy Backend On Render

This repo is a workspace monorepo, so deploy the backend from the repository root and use workspace commands.

Use these Render settings:

```bash
Build Command: npm install --include=dev && npm run build --workspace server
Start Command: npm run start --workspace server
```

Set these environment variables:

```bash
NODE_VERSION=22
NODE_ENV=production
DATABASE_PATH=/opt/render/project/src/server/data/app.db
CLIENT_ORIGIN=https://your-vercel-app.vercel.app
JWT_SECRET=replace-with-a-long-random-secret
AI_PROVIDER=auto
```

For SQLite persistence, add a Render disk:

```bash
Mount Path: /opt/render/project/src/server/data
Size: 1 GB
```

The important bit is `npm install --include=dev`: the build runs `tsc`, and TypeScript needs the `@types/*` packages during build even though they are dev dependencies.

## MVP Notes

- Waterloo restaurant data is seeded from `server/src/data/restaurants.ts`.
- Feedback changes future scoring through cuisine, price, distance, and restaurant-specific penalties.
- The LLM never decides which restaurant wins; it only explains the rule-based result.
