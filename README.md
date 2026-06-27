# What Are Next — Personal Strategy & Execution Command Center

Single-user strategy + GTD command center (PRD v1.3). A two-layer surface:
a **Strategy layer** (Goals + Rumelt kernels) above an **Execution layer**
(Domain → Initiative → Action → Task) run as a full GTD system, AI-infused
via Vertex Gemini.

## Stack
Next.js 14 (App Router) · Neon Postgres · Drizzle · Vercel · Vercel Blob ·
Google Vertex AI (Gemini) · Tailwind + shadcn/ui · dnd-kit

## Local setup
```bash
npm install
cp .env.example .env        # fill in values (see below)
npm run db:generate         # build SQL migration from schema.ts
npm run db:migrate          # apply to your Neon branch
npm run dev
```

## Environment variables
| var | what |
|-----|------|
| `DATABASE_URL` | Neon connection string (pooled, `sslmode=require`) |
| `PASSCODE_HASH` | bcrypt hash of your passcode (`node -e "console.log(require('bcryptjs').hashSync('PASS',10))"`) |
| `SESSION_SECRET` | 32+ char random string (cookie signing) |
| `GCP_PROJECT_ID` | `clinical-infra` (reused Vertex SA) |
| `GCP_LOCATION` | `asia-northeast1` |
| `GCP_SA_KEY_BASE64` | base64 of the clinical-infra service-account JSON |
| `GEMINI_MODEL_REASONING` | `gemini-2.5-pro` |
| `GEMINI_MODEL_UTILITY` | `gemini-2.5-flash` |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token (artefact uploads, P3) |

## Provisioning (fresh, dedicated; reuse Vertex SA)
1. **GitHub** — create repo `what-are-next` (private), push `main`.
2. **Neon** — create project `what-are-next-db`; copy pooled `DATABASE_URL`.
3. **Vercel** — import the repo; set all env vars above; deploy.
4. **Vertex** — reuse the `clinical-infra` service account; base64 its JSON into `GCP_SA_KEY_BASE64`.
5. After first deploy: `npm run db:migrate` against the Neon branch, then hit `/api/ai/selftest` — expect `{"ok":true,"text":"What Are Next AI online."}`.

## Build phases (PRD §9)
- **P0** Foundation — scaffold, schema, passcode auth, base shell, Vertex smoke. ← this commit
- **P1** Execution core + CSV migration (reorderable Strategy Map, domain mgmt)
- **P2** GTD engine (inbox/clarify, assignment, blockers w/ resolution, Today rail)
- **P3** Versatile node payload (artefacts, links, SOPs, People view)
- **P4** Strategy layer (Goals, kernel editor, strategy-without-execution flag)
- **P5** AI layer (6 capabilities + ⌘J assistant w/ tool-calling)

## Key conventions
- Neon **HTTP** driver (not a pool) — `src/db/index.ts`.
- `sort_order` is a float (fractional index) — reorder inserts between neighbours.
- Polymorphic attachments key on `(node_type, node_id)`.
- AI seam: features name a **capability**, not a model — `src/lib/ai/provider.ts`.
- No PHI ever enters this planner (Gemini-only is safe).
